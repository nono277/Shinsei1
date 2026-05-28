import { motion } from 'framer-motion'
import Breadcrumb from '../components/Breadcrumb'

const DISCORD_URL = 'https://discord.gg/x8q8ZdXSg'

const features = [
  { icon: '📣', title: 'Annonces', desc: 'Patch notes, events, mises à jour en avant-première' },
  { icon: '🏆', title: 'Tournois', desc: 'Inscriptions aux tournois de factions et PvP' },
  { icon: '🛠️', title: 'Support', desc: 'Aide technique et suivi de bug 7j/7' },
  { icon: '🤝', title: 'Communauté', desc: 'Rencontre tes coéquipiers et forme une faction' },
  { icon: '🎁', title: 'Cadeaux', desc: 'Giveaways et codes exclusifs réservés aux membres' },
  { icon: '🗺️', title: 'Lore & guides', desc: 'Lore SHINSEI, wikis et guides de progression' },
]

function DiscordLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}

export default function SocialPage() {
  const open = () => window.electronAPI?.openExternal(DISCORD_URL)

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 20px 20px',
      gap: 14,
      boxSizing: 'border-box',
      overflowY: 'auto',
    }}>
      <Breadcrumb items={[{ label: 'Social' }]} />

      {/* Hero Discord */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* fond dégradé animé */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #23275a 0%, #1a1d4a 40%, #12122a 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(88,101,242,0.25) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(to right, transparent, #5865F2, #7289da, transparent)',
        }} />

        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          padding: '28px 36px',
        }}>
          {/* logo avec glow */}
          <motion.div
            animate={{ filter: ['drop-shadow(0 0 12px #5865F288)', 'drop-shadow(0 0 24px #5865F2bb)', 'drop-shadow(0 0 12px #5865F288)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ flexShrink: 0 }}
          >
            <DiscordLogo size={72} />
          </motion.div>

          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.3em',
              color: '#5865F2', textTransform: 'uppercase', margin: '0 0 6px',
            }}>Communauté officielle</p>
            <h1 style={{
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 900,
              fontSize: 'clamp(24px, 2.8vw, 36px)', color: '#fff',
              margin: '0 0 8px', letterSpacing: '0.04em', lineHeight: 1.1,
              textShadow: '0 0 30px rgba(88,101,242,0.4)',
            }}>
              SHINSEI Discord
            </h1>
            <p style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 15,
              color: '#ffffffaa', margin: '0 0 20px', lineHeight: 1.5,
            }}>
              Rejoins des centaines de joueurs, suis les actualités du serveur
              et prépare-toi avec ta faction.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 32px rgba(88,101,242,0.7)' }}
              whileTap={{ scale: 0.97 }}
              onClick={open}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '11px 28px',
                borderRadius: 12,
                background: '#5865F2',
                border: 'none',
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 800,
                fontSize: 16, letterSpacing: '0.12em',
                color: '#fff', cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 0 20px rgba(88,101,242,0.5)',
              }}
            >
              <DiscordLogo size={18} />
              Rejoindre le serveur
            </motion.button>
          </div>

          {/* invite code pill */}
          <div style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(88,101,242,0.12)',
            border: '1px solid rgba(88,101,242,0.3)',
            fontFamily: 'monospace', fontSize: 13,
            color: '#7289da', letterSpacing: '0.1em',
            alignSelf: 'flex-start',
          }}>
            discord.gg/x8q8ZdXSg
          </div>
        </div>
      </motion.div>

      {/* Grille des fonctionnalités */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        flex: 1,
      }}>
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, ease: 'easeOut' }}
            whileHover={{ scale: 1.03, borderColor: 'rgba(88,101,242,0.6)' }}
            onClick={open}
            style={{
              borderRadius: 14,
              padding: '16px 18px',
              background: '#0d0d20',
              border: '1px solid rgba(88,101,242,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
            <div>
              <p style={{
                fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
                fontSize: 15, color: '#fff', margin: '0 0 3px',
                letterSpacing: '0.03em',
              }}>{f.title}</p>
              <p style={{
                fontFamily: 'Rajdhani, sans-serif', fontSize: 13,
                color: '#ffffff77', margin: 0, lineHeight: 1.4,
              }}>{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
