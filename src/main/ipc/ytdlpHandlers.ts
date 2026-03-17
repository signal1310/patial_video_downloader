import { ipcMain } from 'electron'
import { spawn, ChildProcess, exec } from 'child_process'

const activeProcesses = new Map<string, { proc: ChildProcess; pid: number; savePath: string }>()
const cancelledIds = new Set<string>()

export function setupYtdlpHandlers(): void {
  ipcMain.on('ytdlp:run', (event, req) => {
    const { id, url, savePath, startStr, endStr, isFullVideo } = req

    // Command is roughly: yt-dlp --download-sections "*start-end" -P savePath url
    const args = isFullVideo
      ? ['-P', savePath, url]
      : ['--download-sections', `*${startStr}-${endStr}`, '-P', savePath, url]

    const ytDlpProcess = spawn('yt-dlp', args)

    console.log(`[Main] Started yt-dlp for ID: ${id}, PID: ${ytDlpProcess.pid}, Path: ${savePath}`)
    if (ytDlpProcess.pid) {
      activeProcesses.set(id, { proc: ytDlpProcess, pid: ytDlpProcess.pid, savePath })
    }

    // Calculate total duration from the requested time strings
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':').map(Number)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      if (parts.length === 1) return parts[0]
      return 0
    }

    const startSec = parseTime(startStr)
    const endSec = parseTime(endStr)
    let targetDurationSeconds = endSec - startSec
    if (targetDurationSeconds <= 0) targetDurationSeconds = 1

    const processOutput = (data: unknown): void => {
      const text = String(data)

      // Emit raw chunks so frontend handles \r logic
      event.sender.send(`ytdlp:update:${id}`, { type: 'log', text })

      // 1. [download] XX.X% style standard yt-dlp progress
      const downloadMatch = text.match(/\[download\]\s+([\d.]+)%/)
      if (downloadMatch) {
        event.sender.send(`ytdlp:update:${id}`, {
          type: 'progress',
          percent: parseFloat(downloadMatch[1])
        })
      }

      // 2. FFmpeg frame=... time=XX:XX:XX style progress
      const frameMatch = text.match(
        /frame=\s*\d+\s+fps=[\d.]+\s+q=[\d.-]+\s+(?:L?size)=\s*\d+KiB\s+time=(\d{2}:\d{2}:\d{2}\.\d{2})/
      )

      if (frameMatch) {
        const timeStr = frameMatch[1] // "00:00:27.46"
        const secParts = timeStr.split(':')
        const h = parseFloat(secParts[0])
        const m = parseFloat(secParts[1])
        const s = parseFloat(secParts[2])
        if (isFullVideo) return // Skip FFmpeg time-based progress for full video

        const elapsedSeconds = h * 3600 + m * 60 + s

        let percent = (elapsedSeconds / targetDurationSeconds) * 100
        if (percent > 100) percent = 100

        event.sender.send(`ytdlp:update:${id}`, { type: 'progress', percent })
      }
    }

    ytDlpProcess.stdout.on('data', processOutput)
    ytDlpProcess.stderr.on('data', processOutput)

    ytDlpProcess.on('close', (code) => {
      activeProcesses.delete(id)
      // Skip if this was cancelled - renderer already set status to '취소됨'
      if (cancelledIds.has(id)) {
        cancelledIds.delete(id)
        return
      }
      event.sender.send(`ytdlp:update:${id}`, { type: 'done', code })
    })

    ytDlpProcess.on('error', (err) => {
      activeProcesses.delete(id)
      // Skip if this was cancelled - renderer already set status to '취소됨'
      if (cancelledIds.has(id)) {
        cancelledIds.delete(id)
        return
      }
      event.sender.send(`ytdlp:update:${id}`, { type: 'error', text: err.message })
    })
  })

  ipcMain.on('ytdlp:cancel', (_event, id) => {
    console.log(`[Main] Received cancel request for ID: ${id}`)
    const item = activeProcesses.get(id)
    if (item) {
      const { proc, pid } = item
      console.log(`[Main] Cancelling ID: ${id}, PID: ${pid}`)

      // Mark as cancelled BEFORE killing so close/error events know to skip
      cancelledIds.add(id)

      // Remove from map immediately
      activeProcesses.delete(id)

      // === PRIMARY: PowerShell recursive tree kill ===
      // Recursively finds ALL processes whose ancestor is our yt-dlp PID.
      // Safe: only follows our specific PID lineage, cannot affect other downloads.
      const psTreeKill = [
        `function Kill-Tree($ppid) {`,
        `  Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ppid } | ForEach-Object { Kill-Tree $_.ProcessId };`,
        `  Stop-Process -Id $ppid -Force -ErrorAction SilentlyContinue`,
        `}`,
        `Kill-Tree ${pid}`
      ].join(' ')

      exec(`powershell -Command "${psTreeKill}"`, (err) => {
        if (err) {
          console.warn(`[Main] PS tree kill error for ${id}: ${err.message}`)
        } else {
          console.log(`[Main] PS tree kill success for ${id}`)
        }
      })

      // === SECONDARY: taskkill as backup (also PID-targeted, safe) ===
      exec(`taskkill /F /T /PID ${pid}`, () => {
        // ignore result, just a backup
      })

      // === TERTIARY: Node kill ===
      try {
        if (!proc.killed) proc.kill('SIGKILL')
      } catch {
        /* ignore */
      }

      console.log(`[Main] Cancellation initiated for ID: ${id}`)
    } else {
      console.warn(`[Main] No active process for ID: ${id} to cancel.`)
    }
  })
}
