import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const funds = await api.funds().catch(() => [])
  const investors = await api.investors().catch(() => [])

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Overview</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3">Funds</h2>
        <ul className="space-y-2">
          {funds.map((f) => (
            <li key={f.id} className="bg-white rounded-lg p-4 border flex items-center justify-between">
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-sm text-slate-500">
                  {f.token.displayLabel} · {f.network} · {f.investorCount} investors
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <Link className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200" href={`/distributions?fundId=${f.id}`}>
                  Distributions
                </Link>
                <Link className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200" href={`/settlement-monitor/${f.id}`}>
                  Settlement Monitor
                </Link>
              </div>
            </li>
          ))}
          {funds.length === 0 && (
            <li className="text-slate-500">No funds yet. Run <code>pnpm db:seed</code> to create demo data.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Investors</h2>
        <ul className="space-y-2">
          {investors.map((iv) => (
            <li key={iv.id} className="bg-white rounded-lg p-4 border flex items-center justify-between">
              <div>
                <div className="font-medium">{iv.name} <span className="text-sm text-slate-500">({iv.externalId})</span></div>
                <div className="text-xs font-mono text-slate-500">{iv.walletAddress}</div>
              </div>
              <Link className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-sm" href={`/investors/${iv.id}`}>
                Statement
              </Link>
            </li>
          ))}
          {investors.length === 0 && <li className="text-slate-500">No investors yet.</li>}
        </ul>
      </section>
    </div>
  )
}
