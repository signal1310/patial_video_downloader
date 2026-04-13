import React, { useState } from 'react'
import styles from './App.module.css'
import { ThemeProvider } from './contexts/ThemeProvider'
import { ToastProvider } from './contexts/ToastProvider'
import { DownloadForm } from './features/downloader/components/DownloadForm'
import { QueueList } from './features/downloader/components/QueueList'
import { useDownloadQueue } from './features/downloader/hooks/useDownloadQueue'
import { DarkModeToggle } from './components/ui/DarkModeToggle'
import { QueueItem } from './types'

function MainContent(): React.JSX.Element {
  const {
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
  } = useDownloadQueue()

  // 사용자가 '편집' 클릭 시 기존 값으로 폼 채움
  const [editValues, setEditValues] = useState<
    | {
        id: string
        url: string
        startStr: string
        endStr: string
        savePath: string
        isFullVideo?: boolean
      }
    | undefined
  >(undefined)
  const [formKey, setFormKey] = useState(0)

  const handleEdit = (item: QueueItem): void => {
    setEditValues({
      id: item.id,
      url: item.url,
      startStr: item.startStr,
      endStr: item.endStr,
      savePath: item.savePath,
      isFullVideo: item.isFullVideo
    })
    setFormKey((k) => k + 1) // DownloadForm을 다시 마운트하여 initialValues를 적용하도록 강제함
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>yt-dlp 구간 다운로더</h1>
            <DarkModeToggle />
          </div>
          <p className={styles.subtitle}>
            원하는 영상의 특정 구간만 정확하게 추출하여 다운로드합니다.
            <br />
            여러 영상을 대기열에 추가할 수 있습니다.
          </p>
        </header>

        <div className={styles.mainLayout}>
          <DownloadForm
            key={formKey}
            onAdd={(url, startStr, endStr, savePath, isFullVideo, id) => {
              const success = addToQueue(url, startStr, endStr, savePath, isFullVideo, id)
              if (success) {
                setEditValues(undefined)
              }
              return success
            }}
            initialValues={editValues}
          />

          <QueueList
            queue={queue}
            onRemove={removeFromQueue}
            onToggleLogs={toggleLogs}
            onToggleCommand={toggleCommand}
            onCancel={cancelDownload}
            onRetry={retryDownload}
            onEdit={handleEdit}
            onClearAll={clearQueue}
            onClearCompleted={clearCompleted}
            onRetryFailed={retryFailed}
          />
        </div>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </ThemeProvider>
  )
}
