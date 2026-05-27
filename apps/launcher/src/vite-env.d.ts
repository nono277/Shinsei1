/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    minimize:       () => void
    maximize:       () => void
    close:          () => void
    openExternal:   (url: string) => void
    loginMicrosoft: () => Promise<{ success: boolean; data?: { uuid: string; username: string; accessToken: string }; error?: string }>
    loadSession:    () => Promise<{ success: boolean; data?: { uuid: string; username: string; accessToken: string } }>
    logout:         () => Promise<void>
    launchGame:     (opts: { username: string; uuid: string; accessToken: string; javaPath: string; ramGb: number }) => Promise<{ success: boolean; error?: string }>
    onGameProgress:  (cb: (data: { label: string; percent: number }) => void) => void
    onGameLog:       (cb: (line: string) => void) => void
    onGameCrashed:   (cb: (error: string) => void) => void
  }
}
