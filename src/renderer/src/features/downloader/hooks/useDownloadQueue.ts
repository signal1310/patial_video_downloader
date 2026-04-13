import { useState, useEffect, useRef } from 'react'
import { QueueItem } from '../../../types'
import { requestRunYtdlp, onYtdlpUpdate, requestCancelYtdlp } from '../../../api/electron-api'
import { useToast } from '../../../contexts/ToastContext'

const STORAGE_KEY = 'patial_video_downloader_queue'

export const useDownloadQueue = (): {
  queue: QueueItem[]
  addToQueue: (
    url: string,
    startStr: string,
    endStr: string,
    savePath: string,
    isFullVideo: boolean,
    existingId?: string
  ) => boolean
  removeFromQueue: (id: string) => void
  toggleLogs: (id: string) => void
  toggleCommand: (id: string) => void
  cancelDownload: (id: string) => void
  retryDownload: (id: string) => void
  clearQueue: () => void
  clearCompleted: () => void
  retryFailed: () => void
} => {
  const { showToast } = useToast()
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as QueueItem[]
        // 앱 재시작 시 '다운로드 중' 항목은 '중단됨'으로 변경
        return parsed.map((item) =>
          item.status === '다운로드 중' ? { ...item, status: '중단됨' as const } : item
        )
      } catch (e) {
        console.error('Failed to parse saved queue', e)
        return []
      }
    }
    return []
  })

  const listenersRef = useRef(new Map<string, () => void>())

  // 큐 데이터 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  }, [queue])

  const addToQueue = (
    url: string,
    startStr: string,
    endStr: string,
    savePath: string,
    isFullVideo: boolean,
    existingId?: string
  ): boolean => {
    if (!url) {
      showToast('영상 URL을 입력해주세요.')
      return false
    }

    const command = isFullVideo
      ? `yt-dlp -P "${savePath}" "${url}"`
      : `yt-dlp --download-sections "*${startStr}-${endStr}" -P "${savePath}" "${url}"`

    // 중복 확인 (본인 제외)
    const otherDuplicate = queue.find((item) => {
      if (existingId && item.id === existingId) return false

      const sameUrl = item.url === url
      const sameMode = item.isFullVideo === isFullVideo
      if (!sameUrl || !sameMode) return false

      if (isFullVideo) return true
      return item.startStr === startStr && item.endStr === endStr
    })

    if (otherDuplicate) {
      if (otherDuplicate.savePath === savePath) {
        showToast(`이미 동일한 작업이 등록되어 있습니다. (상태: ${otherDuplicate.status})`)
        return false
      } else {
        if (
          !confirm(
            `이미 다른 폴더에 동일한 작업이 등록되어 있습니다. (상태: ${otherDuplicate.status})\n경로: ${otherDuplicate.savePath}\n\n현재 폴더에도 추가로 등록하시겠습니까?`
          )
        ) {
          return false
        }
      }
    }

    // 수정 모드인 경우 처리
    if (existingId) {
      const existingItem = queue.find((item) => item.id === existingId)
      if (existingItem) {
        const isUnchanged =
          existingItem.url === url &&
          existingItem.savePath === savePath &&
          existingItem.isFullVideo === isFullVideo &&
          (isFullVideo || (existingItem.startStr === startStr && existingItem.endStr === endStr))

        if (isUnchanged && existingItem.status === '완료') {
          // 변경 사항 없는데 이미 완료된 상태면 무시
          return false
        }

        // 기존 아이템 업데이트 (상태 '대기 중'으로 변경하여 재다운로드 유도)
        setQueue((prev) =>
          prev.map((item) =>
            item.id === existingId
              ? {
                ...item,
                url,
                startStr,
                endStr,
                savePath,
                isFullVideo,
                command,
                status: isUnchanged && existingItem.status !== '오류' ? item.status : '대기 중',
                progress: 0,
                logs: []
              }
              : item
          )
        )
        return true
      }
    }

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

    setQueue((prev) => [newItem, ...prev])
    return true
  }

  const removeFromQueue = (id: string): void => {
    const item = queue.find((q) => q.id === id)
    setQueue((prev) => prev.filter((item) => item.id !== id))
    const cleanup = listenersRef.current.get(id)
    if (cleanup) {
      cleanup()
      listenersRef.current.delete(id)
    }
    showToast(`${item?.filename || '작업'}이(가) 삭제되었습니다.`)
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
    const cleanup = listenersRef.current.get(id)
    if (cleanup) {
      cleanup()
      listenersRef.current.delete(id)
    }
  }

  const hasPendingItems = queue.some((i) => i.status === '대기 중')

  // 대기열 및 실제 다운로드 처리
  useEffect(() => {
    const processNext = async (): Promise<void> => {
      const pendingItems = queue.filter((item) => item.status === '대기 중')
      if (pendingItems.length === 0) return

      // 일괄 상태 변경 ('다운로드 중')
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

      // 병렬 API 호출
      pendingItems.forEach((itemToProcess) => {
        let partialLogBuffer = ''

        const removeListener = onYtdlpUpdate(
          itemToProcess.id,
          (data: { type: string; text?: string; percent?: number; code?: number }) => {
            if (data.type === 'done') {
              const cleanup = listenersRef.current.get(itemToProcess.id)
              if (cleanup) {
                cleanup()
                listenersRef.current.delete(itemToProcess.id)
              }
            }
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
              } else if (data.type === 'filename' && data.text) {
                item.filename = data.text.split(/[/\\]/).pop()
              } else if (data.type === 'progress') {
                item.progress = data.percent ?? 0
              } else if (data.type === 'done') {
                if (partialLogBuffer.trim()) {
                  item.logs.push(partialLogBuffer.trim())
                }
                item.status = data.code === 0 ? '완료' : '오류'
                if (data.code === 0) {
                  item.progress = 100
                  showToast(`다운로드 완료: ${item.filename || item.url}`)
                } else {
                  showToast(`다운로드 실패: ${item.filename || item.url}`)
                }
              }

              newQueue[idx] = item
              return newQueue
            })
          }
        )
        if (removeListener) {
          listenersRef.current.set(itemToProcess.id, removeListener)
        }

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
  }, [hasPendingItems, queue, showToast])

  const retryDownload = (id: string): void => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: '대기 중' as const, progress: 0, logs: [] } : item
      )
    )
  }

  const clearQueue = (): void => {
    if (queue.length === 0) return
    if (!confirm('모든 작업을 삭제하시겠습니까? (진행 중인 다운로드도 중지됩니다.)')) return

    queue.forEach((item) => {
      if (item.id) {
        requestCancelYtdlp(item.id)
        const cleanup = listenersRef.current.get(item.id)
        if (cleanup) {
          cleanup()
          listenersRef.current.delete(item.id)
        }
      }
    })
    setQueue([])
  }

  const clearCompleted = (): void => {
    setQueue((prev) => prev.filter((item) => item.status !== '완료'))
    showToast('완료된 작업들을 모두 삭제했습니다.')
  }

  const retryFailed = (): void => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === '오류' || item.status === '중단됨'
          ? { ...item, status: '대기 중' as const, progress: 0, logs: [] }
          : item
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
    retryDownload,
    clearQueue,
    clearCompleted,
    retryFailed
  }
}
