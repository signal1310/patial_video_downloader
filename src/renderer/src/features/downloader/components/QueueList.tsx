import React from 'react'
import styles from './QueueList.module.css'
import { QueueItem } from '../../../types'
import { QueueItemCard } from './QueueItemCard'

interface QueueListProps {
  queue: QueueItem[]
  onRemove: (id: string) => void
  onToggleLogs: (id: string) => void
  onToggleCommand: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onEdit: (item: QueueItem) => void
  onClearAll: () => void
  onClearCompleted: () => void
  onRetryFailed: () => void
}

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  onRemove,
  onToggleLogs,
  onToggleCommand,
  onCancel,
  onRetry,
  onEdit,
  onClearAll,
  onClearCompleted,
  onRetryFailed
}) => {
  const hasCompleted = queue.some((item) => item.status === '완료')
  const hasError = queue.some((item) => item.status === '오류' || item.status === '중단됨')

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          작업 목록 <span className={styles.badge}>{queue.length}</span>
        </h2>
        <div className={styles.bulkActions}>
          {hasError && (
            <button
              className={styles.bulkBtn}
              onClick={onRetryFailed}
              title="중단, 또는 오류로 인해 미완료된 항목들을 일괄 재시작합니다."
            >
              미완료 재시작
            </button>
          )}
          {hasCompleted && (
            <button
              className={styles.bulkBtn}
              onClick={onClearCompleted}
              title="완료된 항목들을 일괄 삭제합니다."
            >
              완료 삭제
            </button>
          )}
          {queue.length > 0 && (
            <button
              className={`${styles.bulkBtn} ${styles.danger}`}
              onClick={onClearAll}
              title="작업 목록을 초기화합니다."
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <p className={styles.emptyTitle}>작업 목록이 비어 있습니다.</p>
          <p className={styles.emptySubtitle}>새로운 영상 다운로드 작업을 추가해 보세요.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {queue.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
              onRemove={onRemove}
              onToggleLogs={onToggleLogs}
              onToggleCommand={onToggleCommand}
              onCancel={onCancel}
              onRetry={onRetry}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  )
}
