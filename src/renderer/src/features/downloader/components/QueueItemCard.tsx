import React, { useRef, useLayoutEffect } from 'react'
import styles from './QueueItemCard.module.css'
import { QueueItem } from '../../../types'
import { requestOpenPath, requestOpenExternal } from '../../../api/electron-api'
import { useToast } from '../../../contexts/ToastContext'

// ── SVG Icons ────────────────────────────────────────────────────────────────
const IconLogs = ({ size = 14 }: { size?: number }): React.JSX.Element => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <path d="M10 9H8" />
  </svg>
)

const IconTerminal = ({ size = 14 }: { size?: number }): React.JSX.Element => (
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
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const IconRetry = ({ size = 13 }: { size?: number }): React.JSX.Element => (
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
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const IconEdit = ({ size = 13 }: { size?: number }): React.JSX.Element => (
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

const IconFolder = ({ size = 12, title }: { size?: number; title?: string }): React.JSX.Element => (
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
    {title && <title>{title}</title>}
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IconLink = ({ size = 12, title }: { size?: number; title?: string }): React.JSX.Element => (
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
    {title && <title>{title}</title>}
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
  const { showToast } = useToast()
  const logContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // - 로그 박스가 마운트되거나 로그가 추가될 때 스크롤 처리
  useLayoutEffect(() => {
    const container = logContainerRef.current
    if (!container || !item.showLogs) return

    // - 사용자가 이미 맨 아래 근처(10px 이내)에 있는 경우에만 자동 스크롤
    if (isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [item.logs.length, item.showLogs])

  // - 스크롤 위치 감지 함수
  const handleScroll = (): void => {
    const container = logContainerRef.current
    if (!container) return

    // - 스크롤이 끝까지 내려왔는지 판단 (오차 범위 10px 허용)
    const threshold = 10
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold

    isAtBottomRef.current = isAtBottom
  }
  const isFinished =
    item.status === '완료' ||
    item.status === '오류' ||
    item.status === '취소됨' ||
    item.status === '중단됨'
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
            : item.status === '중단됨'
              ? styles.statusInterrupted
              : styles.statusDefault

  const handleCopyUrl = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (e.ctrlKey) {
      if (window.confirm('브라우저에서 이 URL을 여시겠습니까?')) {
        requestOpenExternal(item.url)
      }
      return
    }
    navigator.clipboard.writeText(item.url)
    showToast('URL이 복사되었습니다.')
  }

  const handleCardClick = (): void => {
    onToggleLogs(item.id)
  }

  const handleFilenameClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (item.filename) {
      if (e.ctrlKey) {
        // - 저장 경로와 파일명을 조합하여 전체 경로 생성
        const fullPath = `${item.savePath}/${item.filename}`
        requestOpenPath(fullPath).then((err) => {
          if (err) {
            showToast(`파일을 열 수 없습니다: ${err}`)
          }
        })
        return
      }
      navigator.clipboard.writeText(item.filename)
      showToast('파일명이 복사되었습니다.')
    }
  }

  const handleOpenFolder = (e: React.MouseEvent): void => {
    e.stopPropagation()
    requestOpenPath(item.savePath)
  }

  return (
    <div className={`${styles.card} ${styles.clickableCard}`} onClick={handleCardClick}>
      {/* 진행 상태 배경 */}
      {isDownloading && (
        <div className={styles.progressBackground} style={{ width: `${item.progress}%` }} />
      )}

      {/* 한 줄 구성: 왼쪽은 정보, 오른쪽은 아이콘 */}
      <div className={styles.row}>
        {/* 왼쪽: 정보 */}
        <div className={styles.info}>
          <div className={styles.statusRow}>
            <span className={`${styles.statusBadge} ${statusClass}`}>{item.status}</span>
            {isDownloading && (
              <span className={styles.progressText}>{item.progress.toFixed(1)}%</span>
            )}
          </div>
          <p
            className={styles.urlText}
            title={
              item.filename
                ? '클릭하여 파일명 복사 / Ctrl+클릭하여 동영상 플레이어로 열기'
                : '클릭하여 URL 복사 / Ctrl+클릭하여 브라우저에서 열기'
            }
            onClick={item.filename ? handleFilenameClick : handleCopyUrl}
          >
            {item.filename || item.url}
          </p>
        </div>

        {/* 오른쪽: 아이콘 버튼들 */}
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {/* 보조 액션: 터미널 / 로그 (항상 표시) */}
          <button
            className={`${styles.iconBtn} ${item.showCommand ? styles.iconBtnActive : ''}`}
            onClick={() => onToggleCommand(item.id)}
            title="명령어"
          >
            <IconTerminal size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${item.showLogs ? styles.iconBtnActive : ''}`}
            onClick={() => onToggleLogs(item.id)}
            title="로그"
          >
            <IconLogs size={16} />
            {item.logs.length > 0 && <span className={styles.logBadge}>{item.logs.length}</span>}
          </button>

          {/* 완료 시 노출: 재시작 + 편집 */}
          {isFinished && (
            <>
              <span className={styles.sep} />
              <button className={styles.iconBtn} onClick={() => onRetry(item.id)} title="재시작">
                <IconRetry size={15} />
              </button>
              <button className={styles.iconBtn} onClick={() => onEdit(item)} title="편집">
                <IconEdit size={15} />
              </button>
              <span className={styles.sep} />
            </>
          )}

          {/* 주요 액션: 취소 또는 삭제 — 마지막에 위치, 시각적 구분 */}
          {isDownloading && (
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => onCancel(item.id)}
              title="취소"
            >
              <IconX size={16} />
            </button>
          )}
          {isFinished && (
            <button
              className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
              onClick={() => onRemove(item.id)}
              title="삭제"
            >
              <IconX size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.metaContainer}>
        <div className={styles.metaTopRow}>
          <span className={styles.timeRange}>
            {item.isFullVideo ? '전체 영상' : `구간 ${item.startStr} ~ ${item.endStr}`}
          </span>
          {item.filename && (
            <div
              className={styles.filename}
              title="클릭하여 URL 복사 / Ctrl+클릭하여 브라우저에서 열기"
              onClick={handleCopyUrl}
            >
              <IconLink title="URL" />
              {item.url}
            </div>
          )}
        </div>
        <div className={styles.metaBottomRow}>
          <div
            className={styles.savePath}
            title="클릭하여 저장 폴더 열기"
            onClick={handleOpenFolder}
          >
            <IconFolder title="저장 폴더" />
            {item.savePath}
          </div>
        </div>
      </div>

      {/* 상세 보기 확장 영역 */}
      {(item.showCommand || item.showLogs) && (
        <div className={styles.details} onClick={(e) => e.stopPropagation()}>
          {item.showCommand && <div className={styles.commandBox}>{item.command}</div>}
          {item.showLogs && (
            <div className={styles.logsBox}>
              <div className={styles.logsHeader}>
                <span>로그</span>
                <span>{item.logs.length}줄</span>
              </div>
              <div
                ref={logContainerRef}
                onScroll={handleScroll}
                className={`${styles.logsContent} custom-scrollbar`}
              >
                {item.logs.length === 0 ? (
                  <div className={styles.logsEmpty}>로그가 없습니다.</div>
                ) : (
                  item.logs.map((log, i) => {
                    const isWarning = log.toLowerCase().includes('warning')
                    const isError = log.toLowerCase().includes('error')
                    const logLineClass = `${styles.logLine} ${isWarning ? styles.logWarning : ''} ${isError ? styles.logError : ''
                      }`.trim()

                    return (
                      <div key={i} className={logLineClass}>
                        {log}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
