import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Class, Faction } from '@shinsei/shared'

export type Page = 'home' | 'profile' | 'ranking' | 'shop' | 'settings' | 'social'

interface NewsItem {
  id: string
  tag: string
  title: string
  date: string
}

interface User {
  username: string
  uuid: string
  accessToken: string
  gradeShop: string
  gradeGameplay: string
  faction: Faction
  playTime: number
  dungeonsCompleted: number
  pvpKills: number
  xpCurrent: number
  xpForNext: number
}

export interface Settings {
  javaPath: string
  ramGb: number
  resolution: string
  closeLauncherOnPlay: boolean
  minimizeToTray: boolean
}

interface LauncherState {
  user: User | null
  selectedClass: Class | null
  downloadProgress: number
  isDownloading: boolean
  currentDownloadFile: string
  serverStatus: { online: boolean; players: number }
  ping: number | null
  news: NewsItem[]
  currentPage: Page
  settings: Settings
  setUser: (user: User | null) => void
  setSelectedClass: (cls: Class) => void
  setDownloadProgress: (progress: number) => void
  setIsDownloading: (downloading: boolean) => void
  setCurrentDownloadFile: (file: string) => void
  setServerStatus: (status: { online: boolean; players: number }) => void
  setPing: (ping: number | null) => void
  setCurrentPage: (page: Page) => void
  updateSettings: (patch: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  javaPath: 'C:\\Program Files\\Java\\jdk-21\\bin\\javaw.exe',
  ramGb: 4,
  resolution: '1920x1080',
  closeLauncherOnPlay: true,
  minimizeToTray: false,
}

export const useLauncherStore = create<LauncherState>()(
  persist(
    (set) => ({
      user: null,
      selectedClass: null,
      downloadProgress: 0,
      isDownloading: false,
      currentDownloadFile: '',
      serverStatus: { online: true, players: 47 },
      ping: 32,
      news: [
        { id: '1', tag: 'MISE À JOUR', title: 'Patch 2.4 — La Fissure des Anciens', date: '24 MAI 2026' },
        { id: '2', tag: 'ÉVÉNEMENT', title: 'Tournoi des Factions — Inscriptions ouvertes', date: '21 MAI 2026' },
      ],
      currentPage: 'home',
      settings: defaultSettings,
      setUser: (user) => set({ user }),
      setSelectedClass: (cls) => set({ selectedClass: cls }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
      setIsDownloading: (downloading) => set({ isDownloading: downloading }),
      setCurrentDownloadFile: (file) => set({ currentDownloadFile: file }),
      setServerStatus: (status) => set({ serverStatus: status }),
      setPing: (ping) => set({ ping }),
      setCurrentPage: (page) => set({ currentPage: page }),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
    }),
    {
      name: 'shinsei-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
