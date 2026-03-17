import { CustomWindow } from '../types'

export const requestSelectFolder = async (): Promise<string | null> => {
  const customWindow = window as unknown as CustomWindow
  if (customWindow.api?.selectFolder) {
    return await customWindow.api.selectFolder()
  } else if (typeof customWindow.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await customWindow.showDirectoryPicker()
      alert('웹 브라우저에서는 폴더 절대경로를 가져올 수 없습니다. Electron 런타임을 이용하세요.')
      return `[웹 환경 모의] ${dirHandle.name} (절대 경로 불가)`
    } catch (error) {
      console.error('Directory picker cancelled or error:', error)
      return null
    }
  } else {
    alert('현재 브라우저는 API를 지원하지 않습니다.')
    return null
  }
}

export const requestDefaultDownloadPath = async (): Promise<string | null> => {
  const customWindow = window as unknown as CustomWindow
  if (customWindow.api?.getDownloadsFolder) {
    return await customWindow.api.getDownloadsFolder()
  }
  return null
}

export const requestRunYtdlp = (req: {
  id: string
  url: string
  savePath: string
  startStr: string
  endStr: string
  isFullVideo?: boolean
}): void => {
  const customWindow = window as unknown as CustomWindow
  if (customWindow.api?.runYtdlp) {
    customWindow.api.runYtdlp(req)
  }
}

export const onYtdlpUpdate = (
  id: string,
  callback: (data: { type: string; text?: string; percent?: number; code?: number }) => void
): (() => void) | null => {
  const customWindow = window as unknown as CustomWindow
  if (customWindow.api?.onYtdlpUpdate) {
    return customWindow.api.onYtdlpUpdate(id, callback)
  }
  return null
}
export const requestCancelYtdlp = (id: string): void => {
  const customWindow = window as unknown as CustomWindow
  if (customWindow.api?.cancelYtdlp) {
    customWindow.api.cancelYtdlp(id)
  }
}
