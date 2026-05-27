import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'

const tagColors: Record<string, string> = {
  'MISE À JOUR': '#7c3aed',
  'ÉVÉNEMENT': '#ffaa00',
  'ALERTE': '#ff2222',
  'INFO': '#06b6d4',
}

export default function NewsSection() {
  const { news } = useLauncherStore()

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[#ffffff77] font-mono text-[10px] tracking-[0.3em] uppercase">Actualités</span>
        <div className="flex-1 h-px bg-[#7c3aed22]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {news.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.01, borderColor: '#7c3aed44' }}
            className="bg-[#1c1c2e] border border-[#ffffff18] rounded-lg p-4 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="font-mono text-[9px] tracking-widest px-2 py-0.5 rounded"
                style={{
                  color: tagColors[item.tag] ?? '#7c3aed',
                  backgroundColor: (tagColors[item.tag] ?? '#7c3aed') + '22',
                  border: `1px solid ${(tagColors[item.tag] ?? '#7c3aed')}44`,
                }}
              >
                {item.tag}
              </span>
              <span className="text-[#ffffff66] font-mono text-[9px]">{item.date}</span>
            </div>
            <p className="font-rajdhani font-semibold text-sm text-white leading-tight">{item.title}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
