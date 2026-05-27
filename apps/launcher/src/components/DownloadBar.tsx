import { motion, AnimatePresence } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'

export default function DownloadBar() {
  const { isDownloading, downloadProgress, currentDownloadFile, setIsDownloading, setDownloadProgress, setCurrentDownloadFile } = useLauncherStore()

  const cancel = () => {
    setIsDownloading(false)
    setDownloadProgress(0)
    setCurrentDownloadFile('')
  }

  return (
    <AnimatePresence>
      {isDownloading && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-t border-[#7c3aed1a] bg-[#0a0a0f]"
        >
          <div className="flex items-center gap-3 px-6 py-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] text-[#ffffff33] tracking-widest uppercase truncate">
                  {currentDownloadFile || 'Téléchargement des mods…'}
                </span>
                <span className="font-mono text-[10px] text-[#7c3aed] ml-2 flex-shrink-0">{downloadProgress}%</span>
              </div>
              <div className="h-1 bg-[#ffffff08] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', boxShadow: '0 0 8px #7c3aed66' }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={cancel}
              className="flex-shrink-0 flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase text-[#ff222266] hover:text-[#ff2222] transition-colors duration-200 px-2 py-1 rounded border border-transparent hover:border-[#ff222233]"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="1.5">
                <line x1="0" y1="0" x2="8" y2="8" />
                <line x1="8" y1="0" x2="0" y2="8" />
              </svg>
              Annuler
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
