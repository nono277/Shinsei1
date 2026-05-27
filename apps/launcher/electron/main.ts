import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { microsoftLogin, silentLogin } from './auth'
import { launchMinecraft }             from './minecraft'
import { saveSession, loadSession, clearSession } from './session'

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 650,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0a0a0f',
    resizable: true,
    icon: path.join(app.getAppPath(), 'src', 'img', 'icon', 'ChatGPT Image 26 mai 2026, 23_30_02.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Connexion Microsoft complète (ouvre une fenêtre de login)
ipcMain.handle('auth:microsoft', async () => {
  try {
    const result = await microsoftLogin()
    await saveSession({
      refreshToken: result.refreshToken,
      username:     result.username,
      uuid:         result.uuid,
    })
    return { success: true, data: { uuid: result.uuid, username: result.username, accessToken: result.accessToken } }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur inconnue' }
  }
})

// Restauration silencieuse de la session (au démarrage)
ipcMain.handle('auth:loadSession', async () => {
  try {
    const session = await loadSession()
    if (!session) return { success: false }

    const result = await silentLogin(session.refreshToken)

    // Mettre à jour le refresh token si Microsoft en a fourni un nouveau
    await saveSession({
      refreshToken: result.refreshToken,
      username:     result.username,
      uuid:         result.uuid,
    })

    return { success: true, data: { uuid: result.uuid, username: result.username, accessToken: result.accessToken } }
  } catch {
    await clearSession()
    return { success: false }
  }
})

// Déconnexion : supprime la session persistée
ipcMain.handle('auth:logout', async () => {
  await clearSession()
})

ipcMain.handle('game:launch', async (_, opts: {
  username: string; uuid: string; accessToken: string
  javaPath: string; ramGb: number
}) => {
  try {
    await launchMinecraft({
      ...opts,
      onProgress: (label, percent) => win?.webContents.send('game:progress', { label, percent }),
      onLog:      (line)           => win?.webContents.send('game:log', line),
      onCrash:    (error)          => win?.webContents.send('game:crashed', error),
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur inconnue' }
  }
})

ipcMain.on('window:minimize', () => win?.minimize())
ipcMain.on('window:maximize', () => {
  if (win?.isMaximized()) win.restore()
  else win?.maximize()
})
ipcMain.on('window:close', () => win?.close())
ipcMain.on('shell:openExternal', (_, url: string) => shell.openExternal(url))
