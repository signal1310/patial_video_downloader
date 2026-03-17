import React from 'react'
import styles from './QueueItemCard.module.css'
import { QueueItem } from '../../../types'

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IconLogs = (): React.JSX.Element => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <path d="M10 9H8" />
  </svg>
)

const IconTerminal = (): React.JSX.Element => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const IconRetry = (): React.JSX.Element => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const IconEdit = (): React.JSX.Element => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IconX = ({ size = 14 }: { size?: number }): React.JSX.Element => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ shapeRendering: 'geometricPrecision', display: 'block' }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────
interface QueueItemCardProps {
  item: QueueItem
  onRemove: (id: string) => void
  onToggleLogs: (id: string) => void
  onToggleCommand: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onEdit: (item: QueueItem) => void
}

export const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  onRemove,
  onToggleLogs,
  onToggleCommand,
  onCancel,
  onRetry,
  onEdit
}) => {
  const isFinished = item.status === '완료' || item.status === '오류' || item.status === '취소됨'
  const isDownloading = item.status === '다운로드 중'

  const statusClass =
    item.status === '완료'
      ? styles.statusDone
      : item.status === '오류'
        ? styles.statusError
        : isDownloading
          ? styles.statusDownloading
          : item.status === '취소됨'
            ? styles.statusCancelled
            : styles.statusDefault

  return (
    <div className={styles.card}>
      {/* Progress fill */}
      {isDownloading && (
        <div className={styles.progressBackground} style={{ width: `${item.progress}%` }} />
      )}

      {/* ── Single row: info on the left, icons on the right ── */}
      <div className={styles.row}>
        {/* Left: info */}
        <div className={styles.info}>
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${statusClass}`}>{item.status}</span>
            {isDownloading && (
              <span className={styles.progressText}>{item.progress.toFixed(1)}%</span>
            )}
          </div>
          <p className={styles.urlText} title={item.url}>
            {item.url}
          </p>
          <span className={styles.timeRange}>
            {item.isFullVideo ? '전체 영상' : `구간 ${item.startStr} ~ ${item.endStr}`}
          </span>
        </div>

        {/* Right: icon buttons */}
        <div className={styles.actions}>
          {/* Secondary actions: terminal / logs (always visible) */}
          <button
            className={`${styles.iconBtn} ${item.showCommand ? styles.iconBtnActive : ''}`}
            onClick={() => onToggleCommand(item.id)}
            title="명령어"
          >
            <IconTerminal />
          </button>
          <button
            className={`${styles.iconBtn} ${item.showLogs ? styles.iconBtnActive : ''}`}
            onClick={() => onToggleLogs(item.id)}
            title="로그"
          >
            <IconLogs />
            {item.logs.length > 0 && <span className={styles.logBadge}>{item.logs.length}</span>}
          </button>

          {/* Finished-only: retry + edit */}
          {isFinished && (
            <>
              <span className={styles.sep} />
              <button className={styles.iconBtn} onClick={() => onRetry(item.id)} title="재시작">
                <IconRetry />
              </button>
              <button className={styles.iconBtn} onClick={() => onEdit(item)} title="편집">
                <IconEdit />
              </button>
              <span className={styles.sep} />
            </>
          )}

          {/* Primary: cancel or delete — always last, visually distinct */}
          {isDownloading && (
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => onCancel(item.id)}
              title="취소"
            >
              <IconX />
            </button>
          )}
          {isFinished && (
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
              onClick={() => onRemove(item.id)}
              title="삭제"
            >
              <IconX />
            </button>
          )}
        </div>
      </div>

      {/* ── Expandable details ── */}
      {(item.showCommand || item.showLogs) && (
        <div className={styles.details}>
          {item.showCommand && <div className={styles.commandBox}>{item.command}</div>}
          {item.showLogs && (
            <div className={styles.logsBox}>
              <div className={styles.logsHeader}>
                <span>로그</span>
                <span>{item.logs.length}줄</span>
              </div>
              <div className={`${styles.logsContent} custom-scrollbar`}>
                {item.logs.length === 0 ? (
                  <div className={styles.logsEmpty}>로그가 없습니다.</div>
                ) : (
                  item.logs.map((log, i) => (
                    <div
                      key={i}
                      className={`${styles.logLine} ${
                        log.includes('warning') || log.includes('WARNING') ? styles.logWarning : ''
                      } ${log.includes('error') || log.includes('ERROR') ? styles.logError : ''}`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
