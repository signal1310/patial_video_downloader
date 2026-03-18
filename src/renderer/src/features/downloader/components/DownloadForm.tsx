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

const FORM_STORAGE_KEY = 'patial_video_downloader_form_state'

export const DownloadForm: React.FC<DownloadFormProps> = ({ onAdd, initialValues }) => {
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

  // Destructure for convenience in the render and effects
  const { url, savePath, startStr, endStr, isFullVideo } = values

  // Update specific field
  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(values))
  }, [values])

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
  }, [])

  useEffect(() => {
    const fetchDefaultPath = async (): Promise<void> => {
      // Only fetch if we don't have a path from initialValues OR localStorage
      if (!values.savePath) {
        const defaultPath = await requestDefaultDownloadPath()
        if (defaultPath) {
          updateField('savePath', defaultPath)
        }
      }
    }
    fetchDefaultPath()
  }, [initialValues, values.savePath])

  const handleSelectFolder = async (): Promise<void> => {
    const selectedPath = await requestSelectFolder()
    if (selectedPath) {
      updateField('savePath', selectedPath)
    }
  }

  const handleReset = async (): Promise<void> => {
    setValues((prev) => ({
      ...prev,
      url: '',
      startStr: prev.isFullVideo ? prev.startStr : '00:00:00',
      endStr: prev.isFullVideo ? prev.endStr : '00:00:00'
    }))
    localStorage.removeItem(FORM_STORAGE_KEY)
  }

  const handleManualReset = async (): Promise<void> => {
    setValues((prev) => ({
      ...prev,
      url: '',
      startStr: '00:00:00',
      endStr: '00:00:00',
      isFullVideo: false
    }))
    localStorage.removeItem(FORM_STORAGE_KEY)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const success = onAdd(url, startStr, endStr, savePath, isFullVideo || false)
    if (success) {
      await handleReset()
    }
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
              다운로드 시작
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
