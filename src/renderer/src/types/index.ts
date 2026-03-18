export interface QueueItem {
  id: string
  url: string
  startStr: string
  endStr: string
  savePath: string
  isFullVideo?: boolean
  command: string
  status: '대기 중' | '다운로드 중' | '완료' | '오류' | '취소됨'
  progress: number
  logs: string[]
  showLogs: boolean
  showCommand: boolean
}

export interface CustomWindow {
  api?: {
    selectFolder: () => Promise<string | null>
    getDownloadsFolder: () => Promise<string>
    runYtdlp: (req: unknown) => void
    onYtdlpUpdate: (
      id: string,
      callback: (data: { type: string; text?: string; percent?: number; code?: number }) => void
    ) => () => void
    cancelYtdlp: (id: string) => void
    openPath: (path: string) => Promise<string>
  }
  showDirectoryPicker?: () => Promise<{ name: string }>
}
