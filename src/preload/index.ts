import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: () => {
    return ipcRenderer.invoke('dialog:selectFolder')
  },
  getDownloadsFolder: () => {
    return ipcRenderer.invoke('dialog:getDownloadsFolder')
  },
  runYtdlp: (req: unknown) => {
    ipcRenderer.send('ytdlp:run', req)
  },
  onYtdlpUpdate: (id: string, callback: (data: unknown) => void) => {
    const channel = `ytdlp:update:${id}`
    const listener = (_event: IpcRendererEvent, data: unknown): void => callback(data)
    ipcRenderer.on(channel, listener)
    return (): Electron.IpcRenderer => ipcRenderer.removeListener(channel, listener)
  },
  cancelYtdlp: (id: string) => {
    ipcRenderer.send('ytdlp:cancel', id)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
