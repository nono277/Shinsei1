import { type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import loadingBg from '../img/loading/loading.png'

export default function LaunchOverlay() {
  const isDownloading = useLauncherStore((s) => s.isDownloading)
  const progress      = useLauncherStore((s) => s.downloadProgress)
  const rawLabel      = useLauncherStore((s) => s.currentDownloadFile)
  const user          = useLauncherStore((s) => s.user)

  const label = (rawLabel || '')
    .replace(/minecraft\s*[\d.]+/gi, '')
    .replace(/\bforge\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Initialisation…'

  return (
    <AnimatePresence>
      {isDownloading && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Fond */}
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${loadingBg})` }} />
          <div className="absolute inset-0 bg-[#08080f]/65" />

          {/* Drag region */}
          <div className="relative z-10 h-8 flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />

          {/* Contenu */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-0">

            {/* ── Titre ── */}
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
            >
              {/* Ligne décorative */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #06b6d4aa)' }} />
                <span className="font-mono text-[10px] tracking-[0.4em] text-[#06b6d488] uppercase">Launcher</span>
                <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #7c3aedaa)' }} />
              </div>

              <h1
                className="font-rajdhani font-bold tracking-[0.3em] uppercase select-none leading-none"
                style={{
                  fontSize: 'clamp(64px, 9vw, 100px)',
                  background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 40%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 50px #7c3aed66)',
                }}
              >
                SHINSEI
              </h1>

              {/* Ligne décorative bas */}
              <div className="flex items-center gap-3 mt-3">
                <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, #7c3aed66)' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed88]" />
                <div className="h-px w-24" style={{ background: 'linear-gradient(to left, transparent, #06b6d466)' }} />
              </div>
            </motion.div>

            {/* ── Panneau de chargement ── */}
            <motion.div
              className="mt-10 w-full max-w-sm mx-auto px-8 py-5 rounded-2xl flex flex-col gap-4"
              style={{
                background: 'rgba(8, 8, 20, 0.82)',
                border: '1px solid rgba(124, 58, 237, 0.22)',
                boxShadow: '0 0 40px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.45 }}
            >
              {/* Segments animés */}
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-4 rounded-sm"
                    animate={{
                      opacity: [0.25, 1, 0.25],
                      scaleY: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                    style={{
                      background: `linear-gradient(90deg, #7c3aed, #06b6d4)`,
                      boxShadow: '0 0 6px #7c3aed55',
                    }}
                  />
                ))}
              </div>

              {/* Label étape */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={label}
                  className="font-mono text-[12px] tracking-[0.18em] uppercase text-white text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {label}
                </motion.p>
              </AnimatePresence>

              {/* Barre */}
              <div className="flex flex-col gap-1">
                <div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, #7c3aed, #a855f7, #06b6d4)',
                      boxShadow: '0 0 16px #7c3aedcc',
                    }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 45, damping: 18 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)', backgroundSize: '200% 100%' }}
                      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
                <motion.div
                  className="h-[3px] rounded-full opacity-40 blur-[3px] -mt-1"
                  style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 45, damping: 18 }}
                />
              </div>

              {/* Bas : joueur + % */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#ffffff44] tracking-widest uppercase">
                  {user?.username ?? ''}
                </span>
                <span className="font-mono text-[13px] font-semibold" style={{ color: '#a855f7' }}>
                  {progress}%
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
