import { ipcMain, dialog, app } from 'electron'

export function setupDialogHandlers(): void {
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) {
      return null
    } else {
      return result.filePaths[0]
    }
  })

  ipcMain.handle('dialog:getDownloadsFolder', () => {
    return app.getPath('downloads')
  })
}
