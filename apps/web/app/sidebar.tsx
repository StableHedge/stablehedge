'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BarChart3, Wallet, FileText, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: Home, exact: true },
  { href: '/distributions', label: 'Deal Distribution Dashboard', icon: BarChart3, exact: false },
  { href: '/settlement-monitor', label: 'XRPL Settlement Monitor', icon: Wallet, exact: false },
  { href: '/investors', label: 'Investor Statement', icon: FileText, exact: false },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0 min-h-screen">
      <div className="px-6 pt-6 pb-5">
        <div className="text-base font-semibold text-white leading-tight">StableHedge</div>
        <div className="text-xs text-slate-400 mt-0.5">Realty Platform</div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'relative flex items-center gap-4 pl-4 pr-3 py-3.5 rounded-lg',
                'transition-all duration-200',
                isActive
                  ? 'bg-blue-600/30 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute left-0 inset-y-2 w-1 rounded-r-full bg-cyan-400" />
              )}
              <Icon
                size={22}
                className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
              />
              <span className="text-base font-medium leading-snug">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-5 text-xs text-slate-500">© 2026 StableHedge</div>
    </aside>
  )
}
