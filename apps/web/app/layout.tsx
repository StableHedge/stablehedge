import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StableHedge Realty Platform',
  description: 'Cross-border real estate FX hedge & XRPL settlement platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="w-64 bg-slate-900 text-slate-200 p-6 flex flex-col gap-2">
            <div className="text-lg font-semibold mb-6">StableHedge<br /><span className="text-xs text-slate-400">Realty Platform</span></div>
            <a href="/" className="px-3 py-2 rounded hover:bg-slate-800">Overview</a>
            <a href="/distributions" className="px-3 py-2 rounded hover:bg-slate-800">Deal Distribution Dashboard</a>
            <a href="/settlement-monitor" className="px-3 py-2 rounded hover:bg-slate-800">XRPL Settlement Monitor</a>
            <a href="/investors" className="px-3 py-2 rounded hover:bg-slate-800">Investor Statement</a>
            <div className="mt-auto text-xs text-slate-500">© 2026 StableHedge</div>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
