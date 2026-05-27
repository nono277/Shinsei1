import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import Breadcrumb from '../components/Breadcrumb'
import gradeSprite from '../img/icon des rangs/b4248e24-a7b2-4448-8cb3-d1d330c7e1b0.png'
import gradeD from '../img/icon des rangs/D.png'
import gradeC from '../img/icon des rangs/C.png'
import gradeB from '../img/icon des rangs/B.png'
import gradeA from '../img/icon des rangs/A.png'
import logoKaigen from '../img/grade boutique/kaigenlogo.png'
import logoRaijin from '../img/grade boutique/raijinlogo.png'
import logoOni from '../img/grade boutique/onilogo.png'
import logoShogun from '../img/grade boutique/shogunlogo.png'
import { GRADE_CONFIG, GRADE_SPRITE_SIZE, GRADE_ICON_SIZE } from '../constants/grades'
import { SHOP_GRADE_CONFIG } from '../constants/shopGrades'

const GAMEPLAY_LOGOS: Record<string, string> = { D: gradeD, C: gradeC, B: gradeB, A: gradeA }
const SHOP_LOGOS: Record<string, string> = { Kaigen: logoKaigen, Raijin: logoRaijin, Oni: logoOni, Shogun: logoShogun }

const gradeOrder = ['D', 'C', 'B', 'A', 'S', 'SS']

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#151528] border border-[#7c3aed35] rounded-xl p-4 flex flex-col gap-1"
    >
      <span className="text-[#ffffff55] font-mono text-[11px] tracking-[0.25em] uppercase">{label}</span>
      <span className="font-rajdhani font-bold text-2xl text-white">{value}</span>
      {sub && <span className="text-[#7c3aedaa] font-mono text-[11px]">{sub}</span>}
    </motion.div>
  )
}

export default function ProfilePage() {
  const { user, selectedClass } = useLauncherStore()
  if (!user) return null

  const xpPercent = Math.round((user.xpCurrent / user.xpForNext) * 100)
  const nextGrade = gradeOrder[gradeOrder.indexOf(user.gradeGameplay) + 1] ?? 'MAX'

  return (
    <div className="px-6 py-4 space-y-3">
      <Breadcrumb items={[{ label: 'Profil' }]} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151528] border border-[#7c3aed35] rounded-xl p-5 flex gap-5 items-center"
      >
        <div className="flex-shrink-0 relative">
          <div className="w-24 h-24 rounded-xl border-2 border-[#7c3aed66] overflow-hidden bg-[#1a1a2e] flex items-center justify-center">
            <img
              src={`https://mc-heads.net/avatar/${user.uuid}/100`}
              alt={user.username}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none' }}
            />
            <span className="absolute font-rajdhani font-bold text-3xl text-[#7c3aed66]">
              {user.username.charAt(0)}
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#57ff6e] border-2 border-[#0f0f1c]" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-rajdhani font-bold text-2xl text-white">{user.username}</h2>
          <p className="font-mono text-[11px] text-[#ffffff40] tracking-widest truncate">{user.uuid}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-[#ffffff55] uppercase tracking-widest">Faction</span>
              <span className="font-rajdhani font-semibold text-sm text-[#7c3aed]">{user.faction}</span>
            </div>
            {selectedClass && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#ffffff55] uppercase tracking-widest">Classe</span>
                <span className="font-rajdhani font-semibold text-sm text-[#06b6d4] capitalize">{selectedClass}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-5 flex-shrink-0">
          {/* Badge boutique */}
          {(() => {
            const shopCfg = SHOP_GRADE_CONFIG[user.gradeShop as keyof typeof SHOP_GRADE_CONFIG]
            const color = shopCfg?.color ?? '#ffffff88'
            return (
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[11px] text-[#ffffff40] tracking-widest uppercase">Boutique</span>
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
                  {SHOP_LOGOS[user.gradeShop]
                    ? <img src={SHOP_LOGOS[user.gradeShop]} alt={user.gradeShop} style={{ width: 40, height: 40, objectFit: 'contain', mixBlendMode: 'lighten' }} />
                    : <span style={{ color, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13 }}>{user.gradeShop}</span>
                  }
                </motion.div>
              </div>
            )
          })()}
          {/* Badge gameplay */}
          {(() => {
            const gameplayCfg = GRADE_CONFIG[user.gradeGameplay]
            const color = gameplayCfg?.color ?? '#ffffff88'
            return (
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-[11px] text-[#ffffff40] tracking-widest uppercase">Gameplay</span>
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
                  {GAMEPLAY_LOGOS[user.gradeGameplay]
                    ? <img src={GAMEPLAY_LOGOS[user.gradeGameplay]} alt={user.gradeGameplay} style={{ width: 40, height: 40, objectFit: 'contain', mixBlendMode: 'lighten' }} />
                    : gameplayCfg
                      ? <div style={{ width: 40, height: 40, backgroundImage: `url(${gradeSprite})`, backgroundSize: `${GRADE_SPRITE_SIZE}px ${GRADE_SPRITE_SIZE}px`, backgroundPosition: gameplayCfg.bgPos, backgroundRepeat: 'no-repeat', backgroundBlendMode: 'screen' }} />
                      : <span style={{ color, fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13 }}>{user.gradeGameplay}</span>
                  }
                </motion.div>
              </div>
            )
          })()}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#151528] border border-[#7c3aed35] rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] text-[#ffffff55] tracking-[0.25em] uppercase">
            Progression vers {nextGrade}
          </span>
          <span className="font-mono text-xs text-[#7c3aed]">
            {user.xpCurrent.toLocaleString('fr-FR')} / {user.xpForNext.toLocaleString('fr-FR')} XP
          </span>
        </div>
        <div className="h-2 bg-[#ffffff15] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[11px] text-[#ffffff40]">{user.gradeGameplay}</span>
          <span className="font-mono text-[11px] text-[#7c3aedaa]">{xpPercent}%</span>
          <span className="font-mono text-[11px] text-[#ffffff40]">{nextGrade}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Temps de jeu"       value={`${user.playTime}h`}                 sub="depuis le lancement"  />
        <StatCard label="Donjons complétés"  value={user.dungeonsCompleted}               sub="dont 12 en solo"      />
        <StatCard label="Kills PvP"          value={user.pvpKills.toLocaleString('fr-FR')} sub="K/D ratio : 3.2"     />
      </div>
    </div>
  )
}
