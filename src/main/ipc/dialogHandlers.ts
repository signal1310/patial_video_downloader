import { ipcMain, dialog, app, shell } from 'electron'

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

  ipcMain.handle('shell:openPath', async (_, path: string) => {
    return await shell.openPath(path)
  })
}
