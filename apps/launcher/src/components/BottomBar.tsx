import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLauncherStore } from '../store/launcherStore'
import gradeSprite from '../img/icon des rangs/b4248e24-a7b2-4448-8cb3-d1d330c7e1b0.png'
import gradeD from '../img/icon des rangs/D.png'
import gradeC from '../img/icon des rangs/C.png'
import gradeB from '../img/icon des rangs/B.png'
import gradeA from '../img/icon des rangs/A.png'

const GAMEPLAY_LOGOS: Record<string, string> = {
  D: gradeD,
  C: gradeC,
  B: gradeB,
  A: gradeA,
}
import logoKaigen from '../img/grade boutique/kaigenlogo.png'
import logoRaijin from '../img/grade boutique/raijinlogo.png'
import logoOni from '../img/grade boutique/onilogo.png'
import logoShogun from '../img/grade boutique/shogunlogo.png'

const SHOP_LOGOS: Record<string, string> = {
  Kaigen: logoKaigen,
  Raijin: logoRaijin,
  Oni: logoOni,
  Shogun: logoShogun,
}
import { GRADE_CONFIG, GRADE_SPRITE_SIZE, GRADE_ICON_SIZE } from '../constants/grades'
import { SHOP_GRADE_CONFIG } from '../constants/shopGrades'

// Badge gameplay : sprite D/C/B/A/S/SS
function GameplayBadge({ grade }: { grade: string }) {
  const cfg = GRADE_CONFIG[grade]
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[#ffffff22] font-mono text-[8px] tracking-widest uppercase">Gameplay</span>
      <motion.div
        whileHover={{ boxShadow: `0 0 18px ${cfg?.color ?? '#ffffff'}88, inset 0 0 12px ${cfg?.color ?? '#ffffff'}18` }}
        className="flex items-center justify-center rounded-lg"
        style={{
          width: 52,
          height: 52,
          background: `linear-gradient(135deg, ${cfg?.color ?? '#ffffff'}22, ${cfg?.color ?? '#ffffff'}0a)`,
          border: `1px solid ${cfg?.color ?? '#ffffff'}55`,
          boxShadow: `0 0 10px ${cfg?.color ?? '#ffffff'}30, inset 0 0 8px ${cfg?.color ?? '#ffffff'}0a`,
        }}
      >
        {GAMEPLAY_LOGOS[grade] ? (
          <img src={GAMEPLAY_LOGOS[grade]} alt={grade} style={{ width: 40, height: 40, objectFit: 'contain', mixBlendMode: 'lighten' }} />
        ) : cfg ? (
          <div
            style={{
              width: 40,
              height: 40,
              backgroundImage: `url(${gradeSprite})`,
              backgroundSize: `${GRADE_SPRITE_SIZE}px ${GRADE_SPRITE_SIZE}px`,
              backgroundPosition: cfg.bgPos,
              backgroundRepeat: 'no-repeat',
              backgroundBlendMode: 'screen',
            }}
          />
        ) : (
          <span className="font-mono font-bold text-sm text-white">{grade}</span>
        )}
      </motion.div>
    </div>
  )
}

// Badge boutique : CSS pur — Kaigen / Raijin / Oni / Shogun / Archon
function ShopBadge({ grade }: { grade: string }) {
  const cfg = SHOP_GRADE_CONFIG[grade as keyof typeof SHOP_GRADE_CONFIG]
  const color = cfg?.color ?? '#ffffff88'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[#ffffff22] font-mono text-[8px] tracking-widest uppercase">Boutique</span>
      <motion.div
        whileHover={{ boxShadow: `0 0 18px ${color}88, inset 0 0 12px ${color}18` }}
        className="flex items-center justify-center rounded-lg"
        style={{
          width: 52,
          height: 52,
          background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
          border: `1px solid ${color}55`,
          boxShadow: `0 0 10px ${color}30, inset 0 0 8px ${color}0a`,
        }}
      >
        {SHOP_LOGOS[grade]
          ? <img src={SHOP_LOGOS[grade]} alt={grade} style={{ width: 40, height: 40, objectFit: 'contain', mixBlendMode: 'lighten' }} />
          : <span style={{ color, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13 }}>{grade}</span>
        }
      </motion.div>
    </div>
  )
}

function PingIndicator({ ping }: { ping: number | null }) {
  const color =
    ping === null ? '#ff222288'
    : ping < 60   ? '#57ff6e'
    : ping < 120  ? '#ffaa00'
    : '#ff2222'

  const bars = ping === null ? 0 : ping < 60 ? 3 : ping < 120 ? 2 : 1

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3].map((b) => (
          <div
            key={b}
            className="w-[3px] rounded-sm transition-colors duration-500"
            style={{
              height: b === 1 ? '33%' : b === 2 ? '66%' : '100%',
              backgroundColor: b <= bars ? color : '#ffffff18',
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[9px] transition-colors duration-500" style={{ color }}>
        {ping !== null ? `${ping}ms` : '—'}
      </span>
    </div>
  )
}

export default function BottomBar() {
  const { user, serverStatus, ping, setServerStatus, setPing, settings, setIsDownloading, setDownloadProgress, setCurrentDownloadFile } = useLauncherStore()
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const handlePlay = async () => {
    if (!user || launching) return
    setLaunchError(null)
    setLaunching(true)
    setIsDownloading(true)
    setDownloadProgress(0)

    window.electronAPI?.onGameProgress(({ label, percent }) => {
      setCurrentDownloadFile(label)
      setDownloadProgress(percent)
    })

    const result = await window.electronAPI?.launchGame({
      username:    user.username,
      uuid:        user.uuid,
      accessToken: user.accessToken,
      javaPath:    settings.javaPath,
      ramGb:       settings.ramGb,
    })

    setLaunching(false)
    setIsDownloading(false)

    if (result && !result.success) {
      setLaunchError(result.error ?? 'Erreur de lancement')
    }
  }

  useEffect(() => {
    const poll = () => {
      const newPing = Math.floor(Math.random() * 18) + 26
      const newPlayers = Math.floor(Math.random() * 25) + 38
      setPing(newPing)
      setServerStatus({ online: true, players: newPlayers })
    }
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
  }, [setPing, setServerStatus])

  useEffect(() => {
    window.electronAPI?.onGameCrashed((error) => {
      setLaunchError(error.split('\n')[0]) // première ligne seulement dans l'UI
    })
  }, [])

  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-[#0a0a0f] border-t border-[#7c3aed1a] flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-[#7c3aed1a] border border-[#7c3aed44] flex items-center justify-center flex-shrink-0">
          <span className="text-[#7c3aed] font-mono text-xs font-bold">
            {user?.username.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="font-rajdhani font-semibold text-sm text-white leading-none">
            {user?.username ?? '—'}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${serverStatus.online ? 'bg-[#57ff6e]' : 'bg-[#ff2222]'}`} />
              <span className="font-mono text-[9px] text-[#57ff6e]">
                {serverStatus.online ? `${serverStatus.players} joueurs` : 'Hors ligne'}
              </span>
            </div>
            <span className="text-[#ffffff18]">·</span>
            <PingIndicator ping={ping} />
          </div>
        </div>

        {user && (
          <div className="flex gap-4 ml-2 items-end">
            <ShopBadge grade={user.gradeShop} />
            <GameplayBadge grade={user.gradeGameplay} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        {launchError && (
          <span className="font-mono text-[9px] text-[#ff6666] max-w-[200px] text-right truncate">{launchError}</span>
        )}
        <motion.button
          onClick={handlePlay}
          disabled={launching}
          whileHover={launching ? {} : { scale: 1.03, boxShadow: '0 0 28px rgba(124,58,237,0.55)' }}
          whileTap={launching ? {} : { scale: 0.97 }}
          className="relative px-10 py-2.5 rounded-lg font-rajdhani font-bold text-lg tracking-[0.2em] uppercase overflow-hidden"
          style={{
            background: launching
              ? 'linear-gradient(135deg, #4c1d95, #2d1155)'
              : 'linear-gradient(135deg, #7c3aed, #4c1d95)',
            boxShadow: '0 0 14px rgba(124,58,237,0.4)',
            border: '1px solid rgba(157,95,245,0.4)',
            cursor: launching ? 'not-allowed' : 'pointer',
            opacity: launching ? 0.7 : 1,
          }}
        >
          <span className="relative z-10 text-white flex items-center gap-2">
            {launching && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white"
              />
            )}
            {launching ? 'CHARGEMENT…' : 'JOUER'}
          </span>
          {!launching && (
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'linear-gradient(135deg, transparent, rgba(6,182,212,0.1), transparent)',
                  'linear-gradient(225deg, transparent, rgba(6,182,212,0.1), transparent)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>
    </div>
  )
}
