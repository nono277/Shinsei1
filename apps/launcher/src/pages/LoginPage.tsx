import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import bgImage from '../img/background/c7ef688c-2493-4716-b3fd-a39a8e253d36.png'
import logoImg from '../img/logo/0abc0c6c-2297-4016-83a1-24ce22b54a29.png'
import { Faction } from '@shinsei/shared'

export default function LoginPage() {
  const setUser = useLauncherStore((s) => s.setUser)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)
  const [step,    setStep]      = useState<'idle' | 'connecting' | 'fetching'>('idle')

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    setStep('connecting')

    try {
      const result = await window.electronAPI?.loginMicrosoft()

      if (!result) throw new Error('Pas de réponse du processus principal')
      if (!result.success) throw new Error(result.error)

      setStep('fetching')
      const { uuid, username } = result.data

      setUser({
        username,
        uuid,
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
    } catch (err: any) {
      if (err.message !== 'Fenêtre fermée') {
        setError(err.message ?? 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
      setStep('idle')
    }
  }

  const stepLabel = step === 'connecting' ? 'Connexion Microsoft…' : 'Récupération du profil…'

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Background */}
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.35) saturate(1.2)', objectPosition: 'center 60%' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0a0a0f 100%)' }}
      />

      {/* Particles ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2, height: 2,
              background: '#7c3aed',
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
            animate={{ y: [-8, 8, -8], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-8">

        {/* Logo + titre */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3"
        >
          <img src={logoImg} alt="SHINSEI" className="w-20 h-20 object-contain drop-shadow-lg" />
          <div className="flex items-baseline gap-3">
            <h1
              className="font-rajdhani font-black text-5xl text-white tracking-widest"
              style={{ textShadow: '0 0 32px rgba(124,58,237,0.8), 0 0 64px rgba(124,58,237,0.3)' }}
            >
              SHINSEI
            </h1>
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6], textShadow: ['0 0 8px rgba(157,95,245,0.4)', '0 0 24px rgba(157,95,245,0.9)', '0 0 8px rgba(157,95,245,0.4)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[#9d5ff5] font-mono text-xl"
            >
              新世
            </motion.span>
          </div>
          <p className="font-mono text-[10px] text-[#ffffff55] tracking-[0.4em] uppercase">
            Connexion requise pour accéder au launcher
          </p>
        </motion.div>

        {/* Card de connexion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 w-full max-w-xs"
          style={{
            background: 'rgba(12,12,24,0.85)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 20,
            padding: '28px 32px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 60px rgba(124,58,237,0.08)',
          }}
        >
          <p className="font-rajdhani font-semibold text-sm text-[#ffffffbb] text-center leading-snug">
            Connecte-toi avec ton compte Microsoft lié à Minecraft
          </p>

          {/* Bouton Microsoft */}
          <motion.button
            onClick={handleLogin}
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.03, boxShadow: '0 0 28px rgba(0,120,212,0.5)' }}
            whileTap={loading ? {} : { scale: 0.97 }}
            className="w-full flex items-center justify-center gap-3 rounded-xl font-rajdhani font-bold text-sm tracking-wider uppercase"
            style={{
              padding: '12px 20px',
              background: loading ? 'rgba(0,90,160,0.3)' : 'linear-gradient(135deg, #0078d4, #005a9e)',
              border: '1px solid rgba(0,120,212,0.5)',
              color: loading ? '#ffffff66' : '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="spinner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white"
                  />
                  <span>{stepLabel}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  {/* Logo Microsoft */}
                  <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
                    <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                    <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  <span>Se connecter avec Microsoft</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-lg px-3 py-2 text-center"
                style={{
                  background: 'rgba(255,34,34,0.08)',
                  border: '1px solid rgba(255,34,34,0.3)',
                  color: '#ff6666',
                  fontFamily: 'monospace',
                  fontSize: 10,
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="font-mono text-[9px] text-[#ffffff22] tracking-widest"
        >
          SHINSEI © 2026 — Serveur Minecraft RPG
        </motion.p>
      </div>
    </div>
  )
}
