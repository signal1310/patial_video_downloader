import React, { useState } from 'react'
import styles from './App.module.css'
import { DownloadForm } from './features/downloader/components/DownloadForm'
import { QueueList } from './features/downloader/components/QueueList'
import { useDownloadQueue } from './features/downloader/hooks/useDownloadQueue'
import { QueueItem } from './types'

export default function App(): React.JSX.Element {
  const {
    queue,
    addToQueue,
    removeFromQueue,
    toggleLogs,
    toggleCommand,
    cancelDownload,
    retryDownload
  } = useDownloadQueue()

  // When user clicks 'edit', populate the download form with existing values
  const [editValues, setEditValues] = useState<
    { url: string; startStr: string; endStr: string; savePath: string; isFullVideo?: boolean } | undefined
  >(undefined)
  const [formKey, setFormKey] = useState(0)

  const handleEdit = (item: QueueItem): void => {
    setEditValues({
      url: item.url,
      startStr: item.startStr,
      endStr: item.endStr,
      savePath: item.savePath,
      isFullVideo: item.isFullVideo
    })
    setFormKey((k) => k + 1) // force DownloadForm to remount so initialValues are picked up
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <h1 className={styles.title}>yt-dlp 구간 다운로더</h1>
          <p className={styles.subtitle}>
            원하는 영상의 특정 구간만 정확하게 추출하여 다운로드합니다.
            <br />
            여러 영상을 대기열에 추가할 수 있습니다.
          </p>
        </header>

        <div className={styles.mainLayout}>
          <DownloadForm key={formKey} onAdd={addToQueue} initialValues={editValues} />

          <QueueList
            queue={queue}
            onRemove={removeFromQueue}
            onToggleLogs={toggleLogs}
            onToggleCommand={toggleCommand}
            onCancel={cancelDownload}
            onRetry={retryDownload}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </div>
  )
}
