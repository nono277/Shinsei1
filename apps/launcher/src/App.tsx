import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import DownloadBar from './components/DownloadBar'
import LaunchOverlay from './components/LaunchOverlay'
import BottomBar from './components/BottomBar'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import ShopPage from './pages/ShopPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import { useLauncherStore } from './store/launcherStore'
import { Faction } from '@shinsei/shared'

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
}

export default function App() {
  const currentPage = useLauncherStore((s) => s.currentPage)
  const user        = useLauncherStore((s) => s.user)
  const setUser     = useLauncherStore((s) => s.setUser)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    window.electronAPI?.loadSession().then((result) => {
      if (result?.success && result.data) {
        setUser({
          username:          result.data.username,
          uuid:              result.data.uuid,
          accessToken:       result.data.accessToken,
          gradeShop:         'Kaigen',
          gradeGameplay:     'D',
          faction:           Faction.ORDRE,
          playTime:          0,
          dungeonsCompleted: 0,
          pvpKills:          0,
          xpCurrent:         0,
          xpForNext:         1000,
        })
      }
    }).finally(() => setChecking(false))
  }, [setUser])

  if (checking) {
    return (
      <div className="flex flex-col w-full h-full bg-[#0f0f1c] overflow-hidden">
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full border-2 border-[#7c3aed33] border-t-[#7c3aed]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full bg-[#0f0f1c] overflow-hidden">
      <LaunchOverlay />
      <Titlebar />

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            className="flex-1 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            className="flex flex-1 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPage}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="min-h-full"
                  >
                    {currentPage === 'home'     && <HomePage />}
                    {currentPage === 'profile'  && <ProfilePage />}
                    {currentPage === 'ranking'  && <RankingPage />}
                    {currentPage === 'shop'     && <ShopPage />}
                    {currentPage === 'settings' && <SettingsPage />}
                  </motion.div>
                </AnimatePresence>
              </div>
              <DownloadBar />
              <BottomBar />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
