import Link from 'next/link'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function DistributionsList({
  searchParams,
}: {
  searchParams: { fundId?: string }
}) {
  const list = await api.distributions(searchParams.fundId).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Distributions</h1>
      </div>

      <ul className="space-y-2">
        {list.map((d) => (
          <li key={d.id} className="bg-white rounded-lg p-4 border flex items-center justify-between">
            <div>
              <div className="font-medium">{d.period}</div>
              <div className="text-sm text-slate-500">
                Total: ${Number(d.totalDistributableUsd).toLocaleString()} ·{' '}
                Status: <span className="font-medium">{d.status}</span> ·{' '}
                {d.itemCount} items
              </div>
            </div>
            <Link className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-sm" href={`/distributions/${d.id}`}>
              Open
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-slate-500">No distributions yet.</li>
        )}
      </ul>
    </div>
  )
}
