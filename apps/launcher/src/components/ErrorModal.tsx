import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'

type JavaErrorKind = 'not_found' | 'out_of_memory' | 'other'

function getJavaErrorKind(error: string): JavaErrorKind | null {
  const hasJava = /java/i.test(error)
  const hasJvmTerms = /vm|jvm|heap|object heap/i.test(error)
  if (!hasJava && !hasJvmTerms) return null
  if (/could not create|could not reserve|unable to create|reserve.*heap|object heap|out of memory|heap space/i.test(error)) return 'out_of_memory'
  if (/no such file|not found|cannot find|introuvable|not recognized|ENOENT/i.test(error)) return 'not_found'
  return 'other'
}

interface Props {
  error: string
  onClose: () => void
}

export default function ErrorModal({ error, onClose }: Props) {
  const { settings, setCurrentPage } = useLauncherStore()
  const javaKind = getJavaErrorKind(error)
  const is32bit  = settings.javaPath.toLowerCase().includes('program files (x86)')

  const handleOpenSettings = () => {
    setCurrentPage('settings')
    onClose()
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg mx-4 rounded-xl p-6 space-y-4"
        style={{
          background: '#151528',
          border: '1px solid rgba(255,68,68,0.35)',
          boxShadow: '0 0 40px rgba(255,34,34,0.15), 0 0 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.35)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="font-mono font-bold text-[#ff4444] tracking-widest text-sm uppercase">Erreur de lancement</h2>
            <p className="font-mono text-[11px] text-[#ffffff40] mt-0.5">Minecraft n'a pas pu démarrer</p>
          </div>
        </div>

        {/* Java-specific diagnostic */}
        {javaKind === 'not_found' && (
          <div
            className="rounded-lg p-4 space-y-2"
            style={{ background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.25)' }}
          >
            <p className="font-mono text-[13px] text-[#ff6666] font-bold">Java introuvable</p>
            <p className="font-mono text-[12px] text-[#ffffff77]">
              Chemin configuré : <span className="text-[#ffffffbb]">{settings.javaPath || '(vide)'}</span>
            </p>
            <p className="font-mono text-[12px] text-[#ffffff55]">
              Installe Java 21 64-bit (Adoptium Temurin) puis clique "Détecter" dans les Paramètres.
            </p>
          </div>
        )}

        {javaKind === 'out_of_memory' && (
          <div
            className="rounded-lg p-4 space-y-2"
            style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.25)' }}
          >
            <p className="font-mono text-[13px] text-[#ffaa00] font-bold">
              {is32bit ? 'Java 32-bit détecté — incompatible' : 'Mémoire insuffisante'}
            </p>
            {is32bit ? (
              <p className="font-mono text-[12px] text-[#ffffff77]">
                Le chemin Java contient <span className="text-[#ffcc44]">Program Files (x86)</span> — Java 32-bit ne peut pas allouer plus de ~1 GB.<br />
                Installe Java 21 <strong>64-bit</strong> depuis adoptium.net.
              </p>
            ) : (
              <p className="font-mono text-[12px] text-[#ffffff77]">
                RAM configurée : <span className="text-[#ffffffbb]">{settings.ramGb} GB</span>.
                Réduis la RAM dans les Paramètres ou vérifie que Java 21 64-bit est utilisé.
              </p>
            )}
          </div>
        )}

        {/* Full error text */}
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] text-[#ffffff35] uppercase tracking-widest">Détail de l'erreur</p>
          <pre
            className="font-mono text-[12px] text-[#ff8888] rounded-lg p-3 overflow-auto max-h-40 leading-relaxed"
            style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,68,68,0.2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {error}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-1">
          {javaKind !== null && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenSettings}
              className="px-4 py-2 rounded-lg font-mono text-[12px] tracking-wide"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.35)',
                color: '#9d5ff5',
              }}
            >
              Ouvrir les paramètres
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-mono text-[12px] tracking-wide"
            style={{
              background: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              color: '#ff6666',
            }}
          >
            Fermer
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
