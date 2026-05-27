import { motion } from 'framer-motion'
import { useLauncherStore } from '../store/launcherStore'
import Breadcrumb from '../components/Breadcrumb'

const RESOLUTIONS = ['1280x720', '1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full flex-shrink-0"
      animate={{ backgroundColor: value ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </motion.button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f0f1a] border border-[#7c3aed1a] rounded-xl p-5 space-y-0">
      <h3 className="font-mono text-[9px] text-[#7c3aed88] tracking-[0.3em] uppercase mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#7c3aed0d] last:border-b-0">
      <span className="font-rajdhani text-sm text-[#ffffffbb]">{label}</span>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings } = useLauncherStore()
  const ramPercent = ((settings.ramGb - 2) / (16 - 2)) * 100

  return (
    <div className="px-6 py-4 space-y-3">
      <Breadcrumb items={[{ label: 'Paramètres' }]} />

      <Section title="Java & Performance">
        <Row label="Chemin d'installation Java">
          <input
            type="text"
            value={settings.javaPath}
            onChange={(e) => updateSettings({ javaPath: e.target.value })}
            className="bg-[#12121e] border border-[#7c3aed1a] rounded px-3 py-1.5 font-mono text-[11px] text-[#ffffffbb] w-68 focus:outline-none focus:border-[#7c3aed55] transition-colors"
            style={{ width: 280 }}
          />
        </Row>

        <div className="py-3 border-b border-[#7c3aed0d]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-rajdhani text-sm text-[#ffffffbb]">RAM allouée</span>
            <span className="font-mono text-sm text-[#7c3aed]">{settings.ramGb} GB</span>
          </div>
          <div className="relative">
            <div className="h-1.5 bg-[#ffffff08] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{ width: `${ramPercent}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
              />
            </div>
            <input
              type="range"
              min={2} max={16} step={1}
              value={settings.ramGb}
              onChange={(e) => updateSettings({ ramGb: Number(e.target.value) })}
              className="shinsei-range"
            />
            <div className="flex justify-between mt-1">
              {[2, 4, 6, 8, 10, 12, 14, 16].map((v) => (
                <span key={v} className="font-mono text-[8px] text-[#ffffff18]">{v}</span>
              ))}
            </div>
          </div>
        </div>

        <Row label="Résolution de jeu">
          <select
            value={settings.resolution}
            onChange={(e) => updateSettings({ resolution: e.target.value })}
            className="bg-[#12121e] border border-[#7c3aed1a] rounded px-3 py-1.5 font-mono text-[11px] text-[#ffffffbb] focus:outline-none focus:border-[#7c3aed55] transition-colors"
          >
            {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Row>
      </Section>

      <Section title="Comportement du launcher">
        <Row label="Fermer le launcher au lancement du jeu">
          <Toggle value={settings.closeLauncherOnPlay} onChange={(v) => updateSettings({ closeLauncherOnPlay: v })} />
        </Row>
        <Row label="Réduire dans la barre des tâches">
          <Toggle value={settings.minimizeToTray} onChange={(v) => updateSettings({ minimizeToTray: v })} />
        </Row>
      </Section>

      <Section title="Fichiers & Mises à jour">
        <div className="flex gap-3 pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-2.5 border border-[#7c3aed33] rounded-lg font-rajdhani font-semibold text-sm text-[#7c3aed] hover:bg-[#7c3aed0d] transition-colors"
          >
            Vérifier l'intégrité des fichiers
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-2.5 border border-[#06b6d433] rounded-lg font-rajdhani font-semibold text-sm text-[#06b6d4] hover:bg-[#06b6d40d] transition-colors"
          >
            Vérifier les mises à jour
          </motion.button>
        </div>
      </Section>

      <div className="flex justify-center pb-2">
        <span className="font-mono text-[9px] text-[#ffffff18] tracking-widest">
          SHINSEI LAUNCHER v2.4.0 · Electron 30 · Node 24
        </span>
      </div>
    </div>
  )
}
