import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function InvestorsList() {
  const list = await api.investors().catch(() => [])
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Investors</h1>
      <ul className="space-y-2">
        {list.map((i) => (
          <li key={i.id} className="bg-white rounded-lg p-4 border flex justify-between items-center">
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">{i.externalId} · <span className="font-mono">{i.walletAddress}</span></div>
            </div>
            <Link className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-sm" href={`/investors/${i.id}`}>
              Statement
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
