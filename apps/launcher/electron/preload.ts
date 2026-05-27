import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:        () => ipcRenderer.send('window:minimize'),
  maximize:        () => ipcRenderer.send('window:maximize'),
  close:           () => ipcRenderer.send('window:close'),
  openExternal:    (url: string) => ipcRenderer.send('shell:openExternal', url),
  loginMicrosoft:  () => ipcRenderer.invoke('auth:microsoft'),
  loadSession:     () => ipcRenderer.invoke('auth:loadSession'),
  logout:          () => ipcRenderer.invoke('auth:logout'),
  launchGame:      (opts: object) => ipcRenderer.invoke('game:launch', opts),
  onGameProgress:  (cb: (data: { label: string; percent: number }) => void) =>
    ipcRenderer.on('game:progress', (_, data) => cb(data)),
  onGameLog:       (cb: (line: string) => void) =>
    ipcRenderer.on('game:log', (_, line) => cb(line)),
  onGameCrashed:   (cb: (error: string) => void) =>
    ipcRenderer.on('game:crashed', (_, error) => cb(error)),
})
