import { useLauncherStore } from '../store/launcherStore'

interface BreadcrumbItem {
  label: string
  page?: string
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const setCurrentPage = useLauncherStore((s) => s.setCurrentPage)

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase mb-1">
      <button
        onClick={() => setCurrentPage('home')}
        className="text-[#ffffff28] hover:text-[#7c3aed] transition-colors duration-150"
      >
        Accueil
      </button>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-[#ffffff18]">/</span>
          {item.page ? (
            <button
              onClick={() => setCurrentPage(item.page as never)}
              className="text-[#ffffff28] hover:text-[#7c3aed] transition-colors duration-150"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[#7c3aed88]">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
