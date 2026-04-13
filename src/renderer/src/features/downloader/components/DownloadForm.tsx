import React, { useState, useEffect, useRef, useCallback } from 'react'
import styles from './DownloadForm.module.css'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { TimePicker } from '../../../components/ui/TimePicker'
import { requestSelectFolder, requestDefaultDownloadPath } from '../../../api/electron-api'
import { useToast } from '../../../contexts/ToastContext'
import { isValidUrl } from '../../../utils/url'

interface FormValues {
  id?: string
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
    isFullVideo: boolean,
    id?: string
  ) => boolean
  initialValues?: FormValues
}

const FORM_STORAGE_KEY = 'patial_video_downloader_form_state'

export const DownloadForm: React.FC<DownloadFormProps> = ({ onAdd, initialValues }) => {
  const { showToast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  const [values, setValues] = useState<FormValues>(() => {
    const defaults: FormValues = {
      url: '',
      savePath: '',
      startStr: '00:00:00',
      endStr: '00:00:00',
      isFullVideo: false
    }

    let saved = {}
    try {
      const str = localStorage.getItem(FORM_STORAGE_KEY)
      if (str) saved = JSON.parse(str)
    } catch {
      /* ignore */
    }

    return { ...defaults, ...saved, ...initialValues }
  })

  // 렌더링 및 효과에서 사용하기 편하게 비구조화 할당
  const { url, savePath, startStr, endStr, isFullVideo } = values

  // 특정 필드 업데이트
  const updateField = useCallback(
    <K extends keyof FormValues>(field: K, value: FormValues[K]): void => {
      setValues((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values))
  }, [values])

  const handleReset = useCallback(async (): Promise<void> => {
    setValues((prev) => ({
      ...prev,
      id: undefined,
      url: '',
      startStr: '00:00:00',
      endStr: '00:00:00',
      isFullVideo: true
    }))
    localStorage.removeItem(FORM_STORAGE_KEY)
  }, [])

  const handleManualReset = useCallback(async (): Promise<void> => {
    setValues((prev) => ({
      ...prev,
      id: undefined,
      url: '',
      startStr: '00:00:00',
      endStr: '00:00:00',
      isFullVideo: false
    }))
    localStorage.removeItem(FORM_STORAGE_KEY)
  }, [])

  const executeDownload = useCallback(
    async (targetUrl: string, forceFullVideo?: boolean): Promise<void> => {
      if (!isValidUrl(targetUrl)) {
        showToast('유효한 영상 URL을 입력해주세요.')
        return
      }

      const useFullVideo = forceFullVideo || isFullVideo || false
      const success = onAdd(targetUrl, startStr, endStr, savePath, useFullVideo, values.id)

      if (success) {
        showToast('다운로드 작업이 대기열에 추가되었습니다.')
        await handleReset()
      }
    },
    [onAdd, startStr, endStr, savePath, isFullVideo, values.id, handleReset, showToast]
  )

  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent): void => {
      const text = e.clipboardData?.getData('text')
      if (!text) return

      const activeEl = document.activeElement as HTMLElement
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA'

      if (!isInput || text.startsWith('http') || text.startsWith('www')) {
        e.preventDefault()
        updateField('url', text.trim())
      }
    }

    const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
      // Ctrl + Shift + V 체크
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault()

        setTimeout(async () => {
          try {
            const text = await navigator.clipboard.readText()
            const trimmed = text.trim()
            if (!trimmed) {
              showToast('클립보드가 비어 있습니다.')
              return
            }
            if (!isValidUrl(trimmed)) {
              const displayInfo = trimmed.length > 20 ? `${trimmed.slice(0, 20)}...` : trimmed
              showToast(`클립보드 값 "${displayInfo}"은(는) 유효한 URL이 아닙니다.`)
              return
            }

            updateField('url', trimmed)
            await executeDownload(trimmed, true)
          } catch (err) {
            console.error('Failed to read clipboard:', err)
            showToast('클립보드 읽기에 실패했습니다.')
          }
        }, 0)
        return
      }

      if (e.key === 'Enter') {
        const activeEl = document.activeElement
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
  }, [updateField, executeDownload, showToast])

  useEffect(() => {
    const fetchDefaultPath = async (): Promise<void> => {
      // initialValues나 localStorage에 경로가 없을 때만 가져옴
      if (!values.savePath) {
        const defaultPath = await requestDefaultDownloadPath()
        if (defaultPath) {
          updateField('savePath', defaultPath)
        }
      }
    }
    fetchDefaultPath()
  }, [values.savePath, updateField])

  const handleSelectFolder = async (): Promise<void> => {
    const selectedPath = await requestSelectFolder()
    if (selectedPath) {
      updateField('savePath', selectedPath)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await executeDownload(url)
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>영상 다운로드 작업 추가</h2>
        <button type="button" className={styles.resetBtn} onClick={handleManualReset}>
          초기화
        </button>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.topRow}>
          <div className={styles.urlSection}>
            <Input
              label="영상 URL"
              type="text"
              value={url}
              onChange={(e) => updateField('url', e.target.value)}
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
              onChange={(val) => updateField('startStr', val)}
              disabled={isFullVideo}
            />
            <TimePicker
              label="종료 시간"
              value={endStr}
              onChange={(val) => updateField('endStr', val)}
              disabled={isFullVideo}
            />
          </div>

          <div className={styles.fullVideoSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isFullVideo}
                onChange={(e) => updateField('isFullVideo', e.target.checked)}
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
              {values.id ? '편집 후 다운로드 시작' : '다운로드 시작'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
