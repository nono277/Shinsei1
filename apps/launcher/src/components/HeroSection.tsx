import { motion } from 'framer-motion'
import bgImage from '../img/background/c7ef688c-2493-4716-b3fd-a39a8e253d36.png'

export default function HeroSection() {
  return (
    <div className="relative h-52 rounded-xl overflow-hidden border border-[#7c3aed1a]">
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 72%', filter: 'brightness(0.92) saturate(1.3)' }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #0a0a0fbb 0%, #0a0a0f77 35%, transparent 65%), linear-gradient(0deg, #0a0a0f99 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 flex flex-col justify-end h-full p-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-baseline gap-3">
            <h1
              className="font-rajdhani font-bold text-4xl text-white tracking-wider"
              style={{ textShadow: '0 0 24px rgba(124,58,237,0.7), 0 0 48px rgba(124,58,237,0.3)' }}
            >
              SHINSEI
            </h1>
            <motion.span
              animate={{
                opacity: [0.75, 1, 0.75],
                textShadow: [
                  '0 0 8px rgba(157,95,245,0.4)',
                  '0 0 20px rgba(157,95,245,0.9)',
                  '0 0 8px rgba(157,95,245,0.4)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[#9d5ff5] font-mono text-lg"
            >
              新世
            </motion.span>
          </div>
          <p
            className="text-[#ffffffbb] text-sm tracking-widest uppercase mt-1"
            style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}
          >
            La faille dimensionnelle s'est rouverte
          </p>
        </motion.div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 bg-[#57ff6e18] border border-[#57ff6e44] rounded-full px-3 py-1 backdrop-blur-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#57ff6e]" />
          <span className="text-[#57ff6e] font-mono text-xs">EN LIGNE</span>
        </motion.div>
      </div>
    </div>
  )
}
