import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>
      runYtdlp: (req: unknown) => void
      onYtdlpUpdate: (
        id: string,
        callback: (data: { type: string; text?: string; percent?: number; code?: number }) => void
      ) => () => void
    }
    showDirectoryPicker?: () => Promise<{ name: string }>
  }
}
