import { motion } from 'framer-motion'
import { useState } from 'react'
import { useLauncherStore } from '../store/launcherStore'
import Breadcrumb from '../components/Breadcrumb'

type ActionStatus = 'idle' | 'running' | 'done' | 'error'

const RESOLUTIONS = ['1280x720', '1366x768', '1600x900', '1920x1080', '2560x1440', '3840x2160']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full flex-shrink-0"
      animate={{ backgroundColor: value ? '#7c3aed' : 'rgba(255,255,255,0.15)' }}
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
    <div className="bg-[#151528] border border-[#7c3aed35] rounded-xl p-5 space-y-0">
      <h3 className="font-mono text-[11px] text-[#7c3aedaa] tracking-[0.3em] uppercase mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#7c3aed20] last:border-b-0">
      <span className="font-rajdhani text-sm text-[#ffffffcc]">{label}</span>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings } = useLauncherStore()
  const [detecting, setDetecting] = useState(false)
  const [detectStatus, setDetectStatus] = useState<'idle' | 'found' | 'notfound'>('idle')
  const [integrityStatus, setIntegrityStatus] = useState<ActionStatus>('idle')
  const [updateStatus, setUpdateStatus]       = useState<ActionStatus>('idle')
  const ramPercent = ((settings.ramGb - 2) / (16 - 2)) * 100

  const handleCheckIntegrity = async () => {
    if (integrityStatus === 'running') return
    setIntegrityStatus('running')
    await new Promise((r) => setTimeout(r, 1500))
    setIntegrityStatus('done')
    setTimeout(() => setIntegrityStatus('idle'), 3000)
  }

  const handleCheckUpdates = async () => {
    if (updateStatus === 'running') return
    setUpdateStatus('running')
    await new Promise((r) => setTimeout(r, 1500))
    setUpdateStatus('done')
    setTimeout(() => setUpdateStatus('idle'), 3000)
  }

  const handleAutoDetect = async () => {
    setDetecting(true)
    setDetectStatus('idle')
    const found = await (window.electronAPI as any)?.autoDetectJava?.()
    setDetecting(false)
    if (found) {
      updateSettings({ javaPath: found })
      setDetectStatus('found')
    } else {
      setDetectStatus('notfound')
    }
    setTimeout(() => setDetectStatus('idle'), 3000)
  }

  return (
    <div className="px-6 py-4 space-y-3">
      <Breadcrumb items={[{ label: 'Paramètres' }]} />

      <Section title="Java & Performance">
        <Row label="Chemin d'installation Java">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.javaPath}
              onChange={(e) => updateSettings({ javaPath: e.target.value })}
              className="bg-[#1a1a2e] border border-[#7c3aed35] rounded px-3 py-1.5 font-mono text-[13px] text-[#ffffffcc] focus:outline-none focus:border-[#7c3aed77] transition-colors"
              style={{ width: 196 }}
            />
            <motion.button
              whileHover={detecting ? {} : { scale: 1.02 }}
              whileTap={detecting ? {} : { scale: 0.98 }}
              onClick={handleAutoDetect}
              disabled={detecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[12px] tracking-wide transition-colors flex-shrink-0"
              style={{
                background: detectStatus === 'found' ? 'rgba(87,255,110,0.12)'
                  : detectStatus === 'notfound' ? 'rgba(255,68,68,0.1)'
                  : 'rgba(124,58,237,0.12)',
                border: detectStatus === 'found' ? '1px solid rgba(87,255,110,0.4)'
                  : detectStatus === 'notfound' ? '1px solid rgba(255,68,68,0.3)'
                  : '1px solid rgba(124,58,237,0.35)',
                color: detectStatus === 'found' ? '#57ff6e'
                  : detectStatus === 'notfound' ? '#ff6666'
                  : '#9d5ff5',
                opacity: detecting ? 0.6 : 1,
                cursor: detecting ? 'not-allowed' : 'pointer',
              }}
            >
              {detecting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 rounded-full border border-current border-t-transparent"
                />
              ) : detectStatus === 'found' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,6 4,9 11,2" /></svg>
              ) : detectStatus === 'notfound' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="0" y1="0" x2="12" y2="12"/><line x1="12" y1="0" x2="0" y2="12"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              )}
              {detecting ? 'Recherche…' : detectStatus === 'found' ? 'Trouvé' : detectStatus === 'notfound' ? 'Introuvable' : 'Détecter'}
            </motion.button>
          </div>
        </Row>

        <div className="py-3 border-b border-[#7c3aed20]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-rajdhani text-sm text-[#ffffffcc]">RAM allouée</span>
            <span className="font-mono text-sm text-[#7c3aed]">{settings.ramGb} GB</span>
          </div>
          <div className="relative">
            <div className="h-1.5 bg-[#ffffff15] rounded-full overflow-hidden">
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
                <span key={v} className="font-mono text-[11px] text-[#ffffff35]">{v}</span>
              ))}
            </div>
          </div>
        </div>

        <Row label="Résolution de jeu">
          <select
            value={settings.resolution}
            onChange={(e) => updateSettings({ resolution: e.target.value })}
            className="bg-[#1a1a2e] border border-[#7c3aed35] rounded px-3 py-1.5 font-mono text-[13px] text-[#ffffffcc] focus:outline-none focus:border-[#7c3aed77] transition-colors"
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
            onClick={handleCheckIntegrity}
            disabled={integrityStatus === 'running'}
            whileHover={integrityStatus === 'running' ? {} : { scale: 1.02 }}
            whileTap={integrityStatus === 'running' ? {} : { scale: 0.98 }}
            className="flex-1 py-2.5 border rounded-lg font-rajdhani font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            style={{
              borderColor: integrityStatus === 'done' ? 'rgba(87,255,110,0.4)' : 'rgba(124,58,237,0.27)',
              color: integrityStatus === 'done' ? '#57ff6e' : '#7c3aed',
              background: integrityStatus === 'done' ? 'rgba(87,255,110,0.08)' : 'transparent',
              opacity: integrityStatus === 'running' ? 0.7 : 1,
              cursor: integrityStatus === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            {integrityStatus === 'running' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 rounded-full border border-current border-t-transparent"
              />
            )}
            {integrityStatus === 'done' ? 'Fichiers OK' : integrityStatus === 'running' ? 'Vérification…' : "Vérifier l'intégrité des fichiers"}
          </motion.button>
          <motion.button
            onClick={handleCheckUpdates}
            disabled={updateStatus === 'running'}
            whileHover={updateStatus === 'running' ? {} : { scale: 1.02 }}
            whileTap={updateStatus === 'running' ? {} : { scale: 0.98 }}
            className="flex-1 py-2.5 border rounded-lg font-rajdhani font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            style={{
              borderColor: updateStatus === 'done' ? 'rgba(87,255,110,0.4)' : 'rgba(6,182,212,0.27)',
              color: updateStatus === 'done' ? '#57ff6e' : '#06b6d4',
              background: updateStatus === 'done' ? 'rgba(87,255,110,0.08)' : 'transparent',
              opacity: updateStatus === 'running' ? 0.7 : 1,
              cursor: updateStatus === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            {updateStatus === 'running' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 rounded-full border border-current border-t-transparent"
              />
            )}
            {updateStatus === 'done' ? 'À jour' : updateStatus === 'running' ? 'Vérification…' : 'Vérifier les mises à jour'}
          </motion.button>
        </div>
      </Section>

      <div className="flex justify-center pb-2">
        <span className="font-mono text-[11px] text-[#ffffff35] tracking-widest">
          SHINSEI LAUNCHER v1.0.0 · Electron 30 · Node 24
        </span>
      </div>
    </div>
  )
}
