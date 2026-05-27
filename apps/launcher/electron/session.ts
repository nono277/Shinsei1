import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, unlink } from 'fs/promises'

const SESSION_FILE = join(app.getPath('userData'), 'session.json')
const SESSION_TTL  = 15 * 24 * 60 * 60 * 1000 // 15 jours en ms

export interface StoredSession {
  refreshToken: string
  username:     string
  uuid:         string
  savedAt:      number
}

export async function saveSession(data: Omit<StoredSession, 'savedAt'>): Promise<void> {
  const payload: StoredSession = { ...data, savedAt: Date.now() }
  await writeFile(SESSION_FILE, JSON.stringify(payload), 'utf-8')
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw  = await readFile(SESSION_FILE, 'utf-8')
    const data = JSON.parse(raw) as StoredSession
    if (Date.now() - data.savedAt > SESSION_TTL) {
      await clearSession()
      return null
    }
    return data
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try { await unlink(SESSION_FILE) } catch {}
}
