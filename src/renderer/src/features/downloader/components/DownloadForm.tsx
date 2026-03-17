import React, { useState, useEffect } from 'react'
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
  const [url, setUrl] = useState(initialValues?.url ?? '')
  const [savePath, setSavePath] = useState(initialValues?.savePath ?? 'C:/Downloads/Videos')
  const [startStr, setStartStr] = useState(initialValues?.startStr ?? '00:00:00')
  const [endStr, setEndStr] = useState(initialValues?.endStr ?? '00:00:00')
  const [isFullVideo, setIsFullVideo] = useState(initialValues?.isFullVideo ?? false)

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

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const success = onAdd(url, startStr, endStr, savePath, isFullVideo)
    if (success) {
      setUrl('')
    }
  }

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>영상 다운로드 작업 추가</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
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
