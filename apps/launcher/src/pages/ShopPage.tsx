import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import Breadcrumb from '../components/Breadcrumb'
import imgKaigen from '../img/grade boutique/kaigen.png'
import imgRaijin from '../img/grade boutique/raijin.png'
import imgOni from '../img/grade boutique/oni.png'
import imgShogun from '../img/grade boutique/shogun.png'
import imgArchon from '../img/grade boutique/archon.png'
import { SHOP_GRADE_ORDER, SHOP_GRADE_CONFIG } from '../constants/shopGrades'

const grades = [
  {
    id: 'Kaigen',
    img: imgKaigen,
    price: '4,99€',
    perks: ['Quêtes exclusives Kaigen', 'Particules de glace', 'Préfixe [Kaigen] en chat'],
  },
  {
    id: 'Raijin',
    img: imgRaijin,
    price: '9,99€',
    perks: ['Tout Kaigen inclus', 'Aura de foudre animée', 'Bonus XP +15%'],
  },
  {
    id: 'Oni',
    img: imgOni,
    price: '19,99€',
    perks: ['Tout Raijin inclus', 'Effets de flammes Oni', 'Bonus XP +30%'],
  },
  {
    id: 'Shogun',
    img: imgShogun,
    price: '29,99€',
    perks: ['Tout Oni inclus', 'Monture Shogun exclusive', 'Bonus XP +60%'],
  },
  {
    id: 'Archon',
    img: imgArchon,
    price: '44,99€',
    perks: ['Tout Shogun inclus', 'Titre [ARCHON] animé', 'Skin divin exclusif', 'Support prioritaire'],
  },
]

const discordPerks = ['Rôle coloré par rang', 'Channels exclusifs', 'Annonces prioritaires', 'Support dédié']


export default function ShopPage() {
  const { user } = useLauncherStore()
  const userShopIndex = SHOP_GRADE_ORDER.indexOf(user?.gradeShop as any)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 20px',
        gap: 10,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <Breadcrumb items={[{ label: 'Boutique' }]} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 10,
          flex: 1,
          minHeight: 420,
        }}
      >
        {grades.map((grade, i) => {
          const cfg = SHOP_GRADE_CONFIG[grade.id as keyof typeof SHOP_GRADE_CONFIG]
          const color = cfg.color
          const isOwned = i <= userShopIndex

          return (
            <motion.div
              key={grade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: 'easeOut' }}
              style={{
                background: '#0d0d20',
                border: `1px solid ${isOwned ? color + '55' : '#7c3aed35'}`,
                boxShadow: isOwned ? `0 0 24px ${color}18, inset 0 0 30px ${color}06` : 'none',
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Zone image — ratio fixe 1:1 basé sur la largeur */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '130%', flexShrink: 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={grade.img}
                    alt={grade.id}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      objectPosition: 'center center',
                      display: 'block',
                    }}
                  />
                </div>
                {/* Fondu bas */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(to bottom, transparent, #0d0d20)',
                  }}
                />
                {isOwned && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: 2,
                      background: color,
                      boxShadow: `0 0 12px 2px ${color}`,
                    }}
                  />
                )}
                {isOwned && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color,
                      backgroundColor: color + '18',
                      border: `1px solid ${color}44`,
                      backdropFilter: 'blur(4px)',
                      fontSize: 10,
                      letterSpacing: '0.2em',
                      padding: '2px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    POSSÉDÉ
                  </span>
                )}
              </div>

              {/* Contenu texte */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 12px 10px',
                  gap: 5,
                  minHeight: 0,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <h3
                    style={{
                      color,
                      textShadow: `0 0 16px ${color}66`,
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: 900,
                      fontSize: 'clamp(18px, 1.6vw, 24px)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {grade.id}
                  </h3>
                  <p style={{ color: color + '88', fontFamily: 'monospace', fontSize: 'clamp(13px, 1vw, 16px)', margin: 0 }}>
                    {grade.price}
                  </p>
                </div>

                <div style={{ height: 1, flexShrink: 0, background: `linear-gradient(to right, transparent, ${color}55, transparent)` }} />

                <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, margin: 0, padding: 0, listStyle: 'none', overflow: 'hidden' }}>
                  {grade.perks.map((perk) => (
                    <li
                      key={perk}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 5,
                        fontFamily: 'Rajdhani, sans-serif',
                        fontSize: 'clamp(14px, 1.1vw, 17px)',
                        color: '#ffffffcc',
                        lineHeight: 1.3,
                      }}
                    >
                      <span style={{ color, fontSize: 13, marginTop: 2, flexShrink: 0 }}>▸</span>
                      {perk}
                    </li>
                  ))}
                </ul>

                {isOwned ? (
                  <div
                    style={{
                      flexShrink: 0,
                      padding: '5px 0',
                      borderRadius: 8,
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(15px, 1.2vw, 18px)',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                      color: color + 'bb',
                      background: color + '0d',
                      border: `1px solid ${color}33`,
                    }}
                  >
                    ✓ Actif
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: `0 0 18px ${color}44` }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => window.electronAPI?.openExternal('https://shop.shinsei.fr')}
                    style={{
                      flexShrink: 0,
                      padding: '5px 0',
                      borderRadius: 8,
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: 700,
                      fontSize: 'clamp(15px, 1.2vw, 18px)',
                      letterSpacing: '0.1em',
                      background: `linear-gradient(135deg, ${color}33, ${color}16)`,
                      border: `1px solid ${color}66`,
                      color,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    ACHETER
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, ease: 'easeOut' }}
        whileHover={{ scale: 1.01, boxShadow: '0 0 40px rgba(88,101,242,0.25)' }}
        onClick={() => window.electronAPI?.openExternal('https://discord.gg/x8q8ZdXSg')}
        style={{
          flexShrink: 0,
          borderRadius: 16,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          background: 'linear-gradient(135deg, #1a1a3a 0%, #12122a 60%, #1a1a3a 100%)',
          border: '1px solid rgba(88,101,242,0.4)',
          boxShadow: '0 0 20px rgba(88,101,242,0.1), inset 0 0 40px rgba(88,101,242,0.04)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* glow accent top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(to right, transparent, #5865F2, transparent)',
        }} />

        {/* logo + titre */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.030z"/>
          </svg>
          <span style={{
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 900,
            fontSize: 13, color: '#5865F2', letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}>Discord</span>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'linear-gradient(to bottom, transparent, #5865F266, transparent)', flexShrink: 0 }} />

        {/* texte central */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
            fontSize: 18, color: '#ffffff', margin: 0, letterSpacing: '0.03em',
          }}>
            Rejoins la communauté SHINSEI
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {discordPerks.map((perk) => (
              <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: '#ffffffaa' }}>
                <span style={{ color: '#5865F2', fontSize: 9 }}>◆</span>
                {perk}
              </div>
            ))}
          </div>
        </div>

        {/* bouton rejoindre */}
        <div style={{
          flexShrink: 0,
          padding: '8px 22px',
          borderRadius: 10,
          background: '#5865F2',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '0.12em',
          color: '#fff',
          textTransform: 'uppercase',
          boxShadow: '0 0 18px rgba(88,101,242,0.5)',
        }}>
          Rejoindre →
        </div>
      </motion.div>
    </div>
  )
}
