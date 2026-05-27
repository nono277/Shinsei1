import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { microsoftLogin, silentLogin } from './auth'
import { launchMinecraft }             from './minecraft'
import { saveSession, loadSession, clearSession } from './session'

let win: BrowserWindow | null = null

// Détecte automatiquement un chemin javaw.exe valide sur le système
function autoDetectJava(): string | null {
  const candidates: string[] = []

  if (process.platform === 'win32') {
    // 1. Registre Windows
    for (const key of [
      'HKLM\\SOFTWARE\\JavaSoft\\JDK',
      'HKLM\\SOFTWARE\\Eclipse Adoptium\\JDK',
      'HKLM\\SOFTWARE\\Microsoft\\JDK',
      'HKLM\\SOFTWARE\\Zulu\\Zulu 21',
    ]) {
      try {
        const out = execSync(`reg query "${key}" /s /v JavaHome`, { encoding: 'utf8', timeout: 3000 })
        for (const m of (out.match(/JavaHome\s+REG_SZ\s+(.+)/g) ?? [])) {
          const home = m.replace(/JavaHome\s+REG_SZ\s+/, '').trim()
          candidates.push(path.join(home, 'bin', 'javaw.exe'))
        }
      } catch { /* clé absente */ }
    }

    // 2. Dossiers d'installation courants (64-bit)
    for (const base of [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Zulu',
      'C:\\Program Files\\Amazon Corretto',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\OpenJDK',
    ]) {
      if (!fs.existsSync(base)) continue
      try {
        const entries = fs.readdirSync(base)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        for (const entry of entries) {
          candidates.push(path.join(base, entry, 'bin', 'javaw.exe'))
        }
      } catch { /* permission */ }
    }

    // 3. PATH système
    try {
      const found = execSync('where javaw', { encoding: 'utf8', timeout: 3000 })
        .split('\n')[0].trim()
      if (found) candidates.push(found)
    } catch { /* non trouvé dans PATH */ }
  }

  const is64 = (p: string) => !p.toLowerCase().includes('program files (x86)')
  const is21 = (p: string) => /jdk-2[1-9]|jre-2[1-9]|zulu2[1-9]|corretto-2[1-9]|\b21\b/i.test(p)

  for (const filter of [
    (p: string) => is64(p) && is21(p),
    (p: string) => is64(p),
    (_: string) => true,
  ]) {
    const match = candidates.find(p => filter(p) && fs.existsSync(p))
    if (match) return match
  }

  return null
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 650,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f0f1c',
    resizable: true,
    icon: path.join(app.getAppPath(), 'src', 'img', 'icon', 'iconbar.png'),
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

// Détection automatique de Java (exposé au renderer pour le bouton dans Paramètres)
ipcMain.handle('java:autoDetect', async () => autoDetectJava())

ipcMain.handle('game:launch', async (_, opts: {
  username: string; uuid: string; accessToken: string
  javaPath: string; ramGb: number; resolution?: string
}) => {
  let { javaPath } = opts
  let autoDetectedPath: string | undefined

  // Si le chemin configuré est vide ou inexistant, tenter la détection auto
  if (!javaPath || !fs.existsSync(javaPath)) {
    const detected = autoDetectJava()
    if (detected) {
      javaPath = detected
      autoDetectedPath = detected
    }
  }

  try {
    await launchMinecraft({
      ...opts,
      javaPath,
      onProgress: (label, percent) => win?.webContents.send('game:progress', { label, percent }),
      onLog:      (line)           => { console.log(line); win?.webContents.send('game:log', line) },
      onCrash:    (error)          => win?.webContents.send('game:crashed', error),
      onExit:     ()               => win?.webContents.send('game:exited'),
    })
    return { success: true, autoDetectedPath }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Erreur inconnue', autoDetectedPath }
  }
})

ipcMain.on('window:minimize', () => win?.minimize())
ipcMain.on('window:maximize', () => {
  if (win?.isMaximized()) win.restore()
  else win?.maximize()
})
ipcMain.on('window:close',  () => win?.close())
ipcMain.on('window:hide',   () => win?.hide())
ipcMain.on('window:show',   () => { win?.show(); win?.focus() })
ipcMain.on('shell:openExternal', (_, url: string) => shell.openExternal(url))
