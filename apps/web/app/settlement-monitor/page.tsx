import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function SettlementMonitorIndex() {
  const funds = await api.funds().catch(() => [])
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">XRPL Settlement Monitor</h1>
      <p className="text-slate-500">Pick a fund:</p>
      <ul className="space-y-2">
        {funds.map((f) => (
          <li key={f.id} className="bg-white rounded-lg p-4 border">
            <Link className="font-medium text-blue-600" href={`/settlement-monitor/${f.id}`}>
              {f.name}
            </Link>
            <div className="text-sm text-slate-500">{f.token.displayLabel} · {f.network}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
