import { ipcMain } from 'electron'
import { spawn, ChildProcess, exec, execSync } from 'child_process'
import { getYtdlpArgs } from '../../common/ytdlp'
import * as fs from 'fs'
import * as path from 'path'

const activeProcesses = new Map<string, { proc: ChildProcess; pid: number; savePath: string }>()
const cancelledIds = new Set<string>()
let isQuitting = false

/**
 * - 영상 재생 시간(초)과 원래 제목을 추출하는 헬퍼 함수
 */
async function getVideoInfo(url: string): Promise<{ durationStr: string; title: string }> {
  return new Promise((resolve, reject) => {
    let output = ''
    // - getYtdlpArgs를 통해 일관된 정보 추출 인자 사용
    const args = getYtdlpArgs({ url, savePath: '', startStr: '', endStr: '' }, 'info')
    const p = spawn('yt-dlp', args)
    p.stdout.on('data', (d) => {
      output += d.toString()
    })
    p.on('close', (code) => {
      if (code === 0) {
        const lines = output.trim().split('\n')
        const data = lines[lines.length - 1] || ''
        const parts = data.split('|')
        if (parts.length >= 2) {
          resolve({ durationStr: parts[0], title: parts.slice(1).join('|') })
        } else {
          resolve({ durationStr: parts[0] || '0', title: 'download' })
        }
      } else reject(new Error('Failed to fetch video info'))
    })
    p.on('error', reject)
  })
}

/**
 * - 윈도우 파일 시스템에서 허용되지 않는 문자를 언더바로 치환
 */
function sanitizeFilename(name: string): string {
  if (!name) return 'download'
  let safe = name.replace(/[:]/g, ' - ') // 제목 내 콜론은 보통 대시로 변환
  safe = safe.replace(/[\\/*?"<>|]/g, '_')
  return safe
}

/**
 * - 대상 폴더를 스캔하여 지정된 baseName 중복 시 _1, _2 등을 붙인 이름을 반환
 */
function getNextAvailableFilename(saveDir: string, baseName: string): string {
  try {
    if (!fs.existsSync(saveDir)) return baseName

    const files = fs.readdirSync(saveDir)
    let maxSuffix = 0
    let exactMatch = false

    for (const file of files) {
      const ext = path.extname(file)
      const nameWithoutExt = path.basename(file, ext)

      if (nameWithoutExt === baseName) {
        exactMatch = true
      } else if (nameWithoutExt.startsWith(`${baseName}_`)) {
        const suffixStr = nameWithoutExt.substring(baseName.length + 1)
        if (/^\d+$/.test(suffixStr)) {
          const num = parseInt(suffixStr, 10)
          if (num > maxSuffix) maxSuffix = num
        }
      }
    }

    if (exactMatch || maxSuffix > 0) {
      return `${baseName}_${Math.max(1, maxSuffix + 1)}`
    }
    return baseName
  } catch {
    return baseName
  }
}

export function setupYtdlpHandlers(): void {
  ipcMain.on('ytdlp:run', async (event, req) => {
    const { id, url, savePath, startStr, endStr } = req
    let { isFullVideo } = req

    // - 요청된 시간 문자열을 기반으로 총 소요 시간 계산
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

    const shouldFetchInfo = !isFullVideo && !isQuitting && !event.sender.isDestroyed()
    let baseTitle: string | undefined = undefined

    if (shouldFetchInfo) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(`ytdlp:update:${id}`, {
          type: 'log',
          text: '[System] 영상 길이 및 파일명 확인 중...\n'
        })
      }

      try {
        const { durationStr, title } = await getVideoInfo(url)

        const sanitizedTitle = sanitizeFilename(title)
        baseTitle = getNextAvailableFilename(savePath, sanitizedTitle)

        if (!isFullVideo) {
          const videoTotalSec = parseTime(durationStr)
          if (videoTotalSec > 0) {
            const actualRemainingSec = videoTotalSec - startSec
            if (actualRemainingSec > 0 && targetDurationSeconds > actualRemainingSec) {
              targetDurationSeconds = actualRemainingSec
            }

            // 0초부터 시작하고 영상 전체를 포함할 경우 전 구간 다운로드로 전환
            if (startSec === 0 && targetDurationSeconds >= videoTotalSec) {
              isFullVideo = true
              if (!event.sender.isDestroyed()) {
                event.sender.send(`ytdlp:update:${id}`, {
                  type: 'log',
                  text: `[System] 요청 구간(0초~${targetDurationSeconds}초)이 원본 시간(${videoTotalSec}초) 전체를 포함하므로 전 구간 다운로드를 시작합니다.\n`
                })
              }
            }
          }
        }
      } catch {
        console.warn(`[Main] Failed to fetch info for ${url}`)
      }
    }

    if (isQuitting || event.sender.isDestroyed()) return

    // - 길이 확인 작업 중 취소 시 처리
    if (cancelledIds.has(id)) {
      cancelledIds.delete(id)
      return
    }

    const args = getYtdlpArgs({ url, savePath, startStr, endStr, isFullVideo, baseTitle })

    const ytDlpProcess = spawn('yt-dlp', args)

    console.log(`[Main] Started yt-dlp for ID: ${id}, PID: ${ytDlpProcess.pid}, Path: ${savePath}`)
    if (ytDlpProcess.pid) {
      activeProcesses.set(id, { proc: ytDlpProcess, pid: ytDlpProcess.pid, savePath })
    }

    const processOutput = (data: unknown): void => {
      if (isQuitting || event.sender.isDestroyed()) return
      const text = String(data)

      // - 프론트엔드 줄바꿈 처리를 위해 원본 텍스트 전송
      event.sender.send(`ytdlp:update:${id}`, { type: 'log', text })

      // - 파일명(Destination) 및 병합/기존 파일 정보 추출
      const destMatch = text.match(/\[download\] Destination: (.+)/)
      const mergeMatch = text.match(/\[Merger\] Merging formats into "(.+?)"/)
      const alreadyMatch = text.match(/\[download\] (.+) has already been downloaded/)

      let filenameStr = ''
      if (mergeMatch) filenameStr = mergeMatch[1]
      else if (destMatch) filenameStr = destMatch[1]
      else if (alreadyMatch) filenameStr = alreadyMatch[1]

      if (filenameStr && !isQuitting && !event.sender.isDestroyed()) {
        event.sender.send(`ytdlp:update:${id}`, { type: 'filename', text: filenameStr.trim() })
      }

      // - 1. 표준 yt-dlp 다운로드 퍼센트 추출 ([download] XX.X%)
      const downloadMatch = text.match(/\[download\]\s+([\d.]+)%/)
      if (downloadMatch) {
        event.sender.send(`ytdlp:update:${id}`, {
          type: 'progress',
          percent: parseFloat(downloadMatch[1])
        })
      }

      // - 2. FFmpeg 프레임/시간 정보 기반 진행률 추출 (frame=... time=...)
      const frameMatch = text.match(
        /frame=\s*\d+\s+fps=[\d.]+\s+q=[\d.-]+\s+(?:L?size)=\s*\d+KiB\s+time=(\d{2}:\d{2}:\d{2}\.\d{2})/
      )

      if (frameMatch) {
        const timeStr = frameMatch[1] // "00:00:27.46"
        const secParts = timeStr.split(':')
        const h = parseFloat(secParts[0])
        const m = parseFloat(secParts[1])
        const s = parseFloat(secParts[2])
        if (isFullVideo) return // - 전 구간 다운로드 시 FFmpeg 기반 진행률 무시

        const elapsedSeconds = h * 3600 + m * 60 + s

        // TODO: 2분 영상을 1분~1시간 구간으로 다운로드 시도 시 프로그레스가 제대로 계산 안되는 문제 해결필요
        // TODO: 프로그래스 계산이 모든 경우에 정확히 되는지 검토 필요
        let percent = (elapsedSeconds / targetDurationSeconds) * 100
        if (percent > 100) percent = 100

        event.sender.send(`ytdlp:update:${id}`, { type: 'progress', percent })
      }
    }

    ytDlpProcess.stdout.on('data', processOutput)
    ytDlpProcess.stderr.on('data', processOutput)

    ytDlpProcess.on('close', (code) => {
      activeProcesses.delete(id)
      if (isQuitting) return
      // Skip if this was cancelled - renderer already set status to '취소됨'
      if (cancelledIds.has(id)) {
        cancelledIds.delete(id)
        return
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send(`ytdlp:update:${id}`, { type: 'done', code })
      }
    })

    ytDlpProcess.on('error', (err) => {
      activeProcesses.delete(id)
      if (isQuitting) return
      // Skip if this was cancelled - renderer already set status to '취소됨'
      if (cancelledIds.has(id)) {
        cancelledIds.delete(id)
        return
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send(`ytdlp:update:${id}`, { type: 'error', text: err.message })
      }
    })
  })

  ipcMain.on('ytdlp:cancel', (_event, id) => {
    console.log(`[Main] Received cancel request for ID: ${id}`)
    const item = activeProcesses.get(id)
    if (item) {
      const { proc, pid } = item
      console.log(`[Main] Cancelling ID: ${id}, PID: ${pid}`)

      // - 프로세스 종료 전 취소 목록에 추가하여 이벤트 핸들러 무시 유도
      cancelledIds.add(id)

      // - 맵에서 즉시 제거
      activeProcesses.delete(id)

      // - PowerShell을 이용한 재귀적 프로세스 트리 종료
      // - 특정 PID의 하위 프로세스를 모두 찾아 안전하게 종료
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
        // - 결과 무시 (백업용 실행)
      })

      // - Node.js 기본 kill 시도
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

export function cleanupAllProcesses(): void {
  isQuitting = true
  for (const [id, item] of activeProcesses.entries()) {
    try {
      console.log(`[Main] App quitting, killing leftover process for ID: ${id}, PID: ${item.pid}`)
      // - 앱 종료 전 잔여 프로세스 강제 종료
      execSync(`taskkill /F /T /PID ${item.pid}`)
    } catch (e) {
      console.warn(`[Main] Cleanup failed for ${id}: ${(e as Error).message}`)
    }
  }
}

export function hasActiveProcesses(): boolean {
  return activeProcesses.size > 0
}
