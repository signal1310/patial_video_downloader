import { useState, useEffect } from 'react'
import { QueueItem } from '../../../types'
import { requestRunYtdlp, onYtdlpUpdate, requestCancelYtdlp } from '../../../api/electron-api'

const STORAGE_KEY = 'patial_video_downloader_queue'

export const useDownloadQueue = (): {
  queue: QueueItem[]
  addToQueue: (
    url: string,
    startStr: string,
    endStr: string,
    savePath: string,
    isFullVideo: boolean
  ) => boolean
  removeFromQueue: (id: string) => void
  toggleLogs: (id: string) => void
  toggleCommand: (id: string) => void
  cancelDownload: (id: string) => void
  retryDownload: (id: string) => void
} => {
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as QueueItem[]
        // 앱 재시작 시 '다운로드 중' 이었던 항목은 '대기 중'으로 변경하여 다시 시작할 수 있게 함
        return parsed.map((item) =>
          item.status === '다운로드 중' ? { ...item, status: '대기 중' } : item
        )
      } catch (e) {
        console.error('Failed to parse saved queue', e)
        return []
      }
    }
    return []
  })

  // 큐 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  }, [queue])

  const addToQueue = (
    url: string,
    startStr: string,
    endStr: string,
    savePath: string,
    isFullVideo: boolean
  ): boolean => {
    if (!url) {
      alert('영상 URL을 입력해주세요.')
      return false
    }

    const command = isFullVideo
      ? `yt-dlp -P "${savePath}" "${url}"`
      : `yt-dlp --download-sections "*${startStr}-${endStr}" -P "${savePath}" "${url}"`

    const newItem: QueueItem = {
      id: Date.now().toString(),
      url,
      startStr,
      endStr,
      savePath,
      isFullVideo,
      command,
      status: '대기 중',
      progress: 0,
      logs: [],
      showLogs: false,
      showCommand: false
    }

    setQueue((prev) => [...prev, newItem])
    return true
  }

  const removeFromQueue = (id: string): void => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleLogs = (id: string): void => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, showLogs: !item.showLogs } : item))
    )
  }

  const toggleCommand = (id: string): void => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, showCommand: !item.showCommand } : item))
    )
  }

  const cancelDownload = (id: string): void => {
    console.log(`[Renderer] Requesting cancel for ID: ${id}`)
    requestCancelYtdlp(id)
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: '취소됨' as const } : item))
    )
  }

  const hasPendingItems = queue.some((i) => i.status === '대기 중')

  // 대기열 및 실제 다운로드 처리
  useEffect(() => {
    const processNext = async (): Promise<void> => {
      const pendingItems = queue.filter((item) => item.status === '대기 중')
      if (pendingItems.length === 0) return

      // 일괄적으로 상태를 '다운로드 중'으로 변경
      setQueue((prev) => {
        const newQueue = [...prev]
        pendingItems.forEach((pending) => {
          const idx = newQueue.findIndex((q) => q.id === pending.id)
          if (idx !== -1) {
            newQueue[idx] = { ...newQueue[idx], status: '다운로드 중' }
          }
        })
        return newQueue
      })

      // 병렬로 API 호출
      pendingItems.forEach((itemToProcess) => {
        let partialLogBuffer = ''

        const removeListener = onYtdlpUpdate(
          itemToProcess.id,
          (data: { type: string; text?: string; percent?: number; code?: number }) => {
            setQueue((prev) => {
              const idx = prev.findIndex((q) => q.id === itemToProcess.id)
              if (idx === -1) return prev
              const newQueue = [...prev]
              const item = { ...newQueue[idx] }

              if (data.type === 'log' || data.type === 'error') {
                partialLogBuffer += data.text || ''
                const parts = partialLogBuffer.split(/[\r\n]+/)
                partialLogBuffer = parts.pop() || ''

                const newLogs = [...item.logs]
                parts.forEach((line) => {
                  const trimmed = line.trim()
                  if (!trimmed) return

                  if (
                    trimmed.startsWith('frame=') &&
                    newLogs.length > 0 &&
                    newLogs[newLogs.length - 1].startsWith('frame=')
                  ) {
                    newLogs[newLogs.length - 1] = trimmed
                  } else {
                    newLogs.push(trimmed)
                  }
                })

                item.logs = newLogs
              } else if (data.type === 'progress') {
                item.progress = data.percent ?? 0
              } else if (data.type === 'done') {
                if (partialLogBuffer.trim()) {
                  item.logs.push(partialLogBuffer.trim())
                }
                item.status = data.code === 0 ? '완료' : '오류'
                if (data.code === 0) item.progress = 100
              }

              newQueue[idx] = item
              return newQueue
            })

            if (data.type === 'done' && removeListener) {
              removeListener()
            }
          }
        )

        requestRunYtdlp({
          id: itemToProcess.id,
          url: itemToProcess.url,
          savePath: itemToProcess.savePath,
          startStr: itemToProcess.startStr,
          endStr: itemToProcess.endStr,
          isFullVideo: itemToProcess.isFullVideo
        })
      })
    }

    processNext()
  }, [hasPendingItems, queue])

  const retryDownload = (id: string): void => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: '대기 중' as const, progress: 0, logs: [] } : item
      )
    )
  }

  return {
    queue,
    addToQueue,
    removeFromQueue,
    toggleLogs,
    toggleCommand,
    cancelDownload,
    retryDownload
  }
}
