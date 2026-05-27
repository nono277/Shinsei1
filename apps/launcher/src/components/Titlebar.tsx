import { motion } from 'framer-motion'
import iconImg from '../img/icon/ChatGPT Image 26 mai 2026, 23_30_02.png'

export default function Titlebar() {
  return (
    <div
      className="flex items-center justify-between h-9 px-3 bg-[#0f0f1c] flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <img src={iconImg} alt="SHINSEI" className="w-5 h-5 rounded object-cover opacity-90" />
        <span className="text-[#7c3aed] font-mono text-[13px] tracking-[0.25em] font-bold">SHINSEI</span>
        <span className="text-[#06b6d4] font-mono text-sm leading-none">新世</span>
        <div className="w-px h-3 bg-[#ffffff25] mx-1" />
        <span className="text-[#ffffff40] font-mono text-[12px] tracking-widest">LAUNCHER v1.0</span>
      </div>

      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <motion.button
          whileHover={{ backgroundColor: '#ffffff0d' }}
          onClick={() => window.electronAPI?.minimize()}
          className="w-8 h-7 flex items-center justify-center rounded text-[#ffffff66] hover:text-white transition-colors"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: '#ffffff0d' }}
          onClick={() => window.electronAPI?.maximize()}
          className="w-8 h-7 flex items-center justify-center rounded text-[#ffffff66] hover:text-white transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="8" height="8" />
          </svg>
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: '#ff22220d' }}
          onClick={() => window.electronAPI?.close()}
          className="w-8 h-7 flex items-center justify-center rounded text-[#ffffff66] hover:text-[#ff4444] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
