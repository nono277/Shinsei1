import Breadcrumb from '../components/Breadcrumb'

export default function RankingPage() {
  return (
    <div className="px-6 py-4 space-y-4">
      <Breadcrumb items={[{ label: 'Classement' }]} />
      <div className="h-72 bg-[#0f0f1a] border border-[#7c3aed1a] rounded-xl flex flex-col items-center justify-center gap-3">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed33" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <p className="font-rajdhani text-[#ffffff33] text-sm tracking-widest">CLASSEMENT DISPONIBLE PROCHAINEMENT</p>
      </div>
    </div>
  )
}
