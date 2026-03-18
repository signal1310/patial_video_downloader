import React, { useState, useEffect, useRef } from 'react'
import styles from './DownloadForm.module.css'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { TimePicker } from '../../../components/ui/TimePicker'
import { requestSelectFolder, requestDefaultDownloadPath } from '../../../api/electron-api'

interface FormValues {
  url: string
  startStr: string
  endStr: string
  savePath: string
  isFullVideo?: boolean
}

interface DownloadFormProps {
  onAdd: (
    url: string,
    startStr: string,
    endStr: string,
    savePath: string,
    isFullVideo: boolean
  ) => boolean
  initialValues?: FormValues
}

export const DownloadForm: React.FC<DownloadFormProps> = ({ onAdd, initialValues }) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [url, setUrl] = useState(initialValues?.url ?? '')
  const [savePath, setSavePath] = useState(initialValues?.savePath ?? 'C:/Downloads/Videos')
  const [startStr, setStartStr] = useState(initialValues?.startStr ?? '00:00:00')
  const [endStr, setEndStr] = useState(initialValues?.endStr ?? '00:00:00')
  const [isFullVideo, setIsFullVideo] = useState(initialValues?.isFullVideo ?? false)

  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent): void => {
      const text = e.clipboardData?.getData('text')
      if (!text) return

      const activeEl = document.activeElement as HTMLElement
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA'

      // 만약 텍스트가 시간(예: 00:00)같이 짧은 문자열이고, 인풋에 포커스가 있다면
      // 기본 붙여넣기 동작을 허용합니다 (URL을 덮어쓰지 않음).
      // 하지만 URL 형태이거나 포커스가 아예 없다면 무조건 영상 URL 필드에 붙여넣습니다.
      if (!isInput || text.startsWith('http') || text.startsWith('www')) {
        e.preventDefault()
        setUrl(text.trim())
      }
    }

    const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        const activeEl = document.activeElement
        // 사용자가 탭(Tab) 키 등으로 특정 인풋, 체크박스, 버튼에 포커스를 둔 상태라면
        // 해당 요소의 기본 동작(클릭 등)을 허용하도록 가만히 둡니다.
        // 아무것도 포커스되어 있지 않은 허공(body)일 때만 다운로드 시작(submit)을 강제합니다.
        if (!activeEl || activeEl === document.body || activeEl === document.documentElement) {
          e.preventDefault()
          formRef.current?.requestSubmit()
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('paste', handlePaste)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const fetchDefaultPath = async (): Promise<void> => {
      // Only fetch if initialValues didn't provide a path
      if (!initialValues?.savePath) {
        const defaultPath = await requestDefaultDownloadPath()
        if (defaultPath) {
          setSavePath(defaultPath)
        }
      }
    }
    fetchDefaultPath()
  }, [initialValues])

  const handleSelectFolder = async (): Promise<void> => {
    const selectedPath = await requestSelectFolder()
    if (selectedPath) {
      setSavePath(selectedPath)
    }
  }
  const handleTimeChange = (type: 'start' | 'end', value: string): void => {
    if (type === 'start') {
      setStartStr(value)
    } else {
      setEndStr(value)
    }
  }

  const handleReset = async (): Promise<void> => {
    setUrl('')
    if (!isFullVideo) {
      setStartStr('00:00:00')
      setEndStr('00:00:00')
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const success = onAdd(url, startStr, endStr, savePath, isFullVideo)
    if (success) {
      await handleReset()
    }
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>영상 다운로드 작업 추가</h2>
      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.topRow}>
          <div className={styles.urlSection}>
            <Input
              label="영상 URL"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>
        </div>

        <div className={styles.midRow}>
          <div className={`${styles.timeSection} ${isFullVideo ? styles.disabled : ''}`}>
            <TimePicker
              label="시작 시간"
              value={startStr}
              onChange={(val) => handleTimeChange('start', val)}
              disabled={isFullVideo}
            />
            <TimePicker
              label="종료 시간"
              value={endStr}
              onChange={(val) => handleTimeChange('end', val)}
              disabled={isFullVideo}
            />
          </div>

          <div className={styles.fullVideoSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isFullVideo}
                onChange={(e) => setIsFullVideo(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>영상 전 구간 다운로드</span>
            </label>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.folderSection}>
            <label className={styles.folderLabel}>저장 폴더</label>
            <div className={styles.folderInputGroup}>
              <input type="text" readOnly value={savePath} className={styles.folderInput} />
              <Button type="button" variant="secondary" onClick={handleSelectFolder}>
                폴더 선택
              </Button>
            </div>
          </div>
          <div className={styles.submitSection}>
            <Button type="submit" className={styles.submitButton}>
              다운로드 시작
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
