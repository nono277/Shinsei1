import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import { Class } from '@shinsei/shared'
import classSprite from '../img/icon class/5afa20bf-066e-4f6c-a845-fff2f7c46977.png'

interface ClassInfo {
  id: Class
  label: string
  color: string
  desc: string
  spriteX: number
  spriteY: number
}

const SPRITE_SIZE = 252
const ICON_SIZE = 76

const classes: ClassInfo[] = [
  { id: Class.HUNTER,    label: 'Hunter',    color: '#7c3aed', desc: 'Traqueur des failles',  spriteX: -22,  spriteY: -10  },
  { id: Class.TITAN,     label: 'Titan',     color: '#ffaa00', desc: 'Rempart indestructible', spriteX: -158, spriteY: -10  },
  { id: Class.ARCANE,    label: 'Arcane',    color: '#06b6d4', desc: 'Maître des arcanes',     spriteX: -90,  spriteY: -83  },
  { id: Class.SHINIGAMI, label: 'Shinigami', color: '#ff2222', desc: 'Faucheur des âmes',      spriteX: -7,   spriteY: -147 },
  { id: Class.BETE,      label: 'Bête',      color: '#57ff6e', desc: 'Instinct primordial',    spriteX: -173, spriteY: -147 },
]

export default function ClassSelector() {
  const { selectedClass, setSelectedClass } = useLauncherStore()

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[#ffffff55] font-mono text-[12px] tracking-[0.3em] uppercase">Classe active</span>
        <div className="flex-1 h-px bg-[#7c3aed35]" />
      </div>
      <div className="flex gap-2">
        {classes.map((cls) => {
          const isSelected = selectedClass === cls.id
          return (
            <motion.button
              key={cls.id}
              initial={false}
              animate={{
                opacity: isSelected ? 1 : 0.65,
                borderColor: isSelected ? '#7c3aed' : 'rgba(0,0,0,0)',
                boxShadow: isSelected
                  ? '0 0 20px rgba(124,58,237,0.35), 0 0 40px rgba(124,58,237,0.15)'
                  : '0 0 0px rgba(0,0,0,0)',
              }}
              whileHover={{
                opacity: 1,
                scale: 1.03,
                borderColor: isSelected ? '#7c3aed' : '#4c1d95',
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedClass(cls.id)}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 relative overflow-hidden"
              style={{ backgroundColor: isSelected ? 'rgba(124,58,237,0.1)' : '#1a1a2e' }}
            >
              <motion.div
                animate={{ opacity: isSelected ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 110%, ${cls.color}20, transparent 65%)`,
                }}
              />

              <div
                className="relative z-10 rounded-full overflow-hidden flex-shrink-0"
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  backgroundImage: `url(${classSprite})`,
                  backgroundSize: `${SPRITE_SIZE}px ${SPRITE_SIZE}px`,
                  backgroundPosition: `${cls.spriteX}px ${cls.spriteY}px`,
                  backgroundRepeat: 'no-repeat',
                  filter: isSelected
                    ? `brightness(1.1) drop-shadow(0 0 10px ${cls.color}99)`
                    : 'brightness(0.85) saturate(0.9)',
                  transition: 'filter 0.2s',
                  outline: isSelected ? `2px solid ${cls.color}66` : '2px solid transparent',
                  outlineOffset: 2,
                }}
              />

              <span
                className="font-rajdhani font-semibold text-sm tracking-wide relative z-10 transition-colors duration-200"
                style={{ color: isSelected ? cls.color : '#ffffff99' }}
              >
                {cls.label}
              </span>
              <span className="text-[#ffffff55] text-[11px] font-mono text-center leading-tight relative z-10">
                {cls.desc}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
