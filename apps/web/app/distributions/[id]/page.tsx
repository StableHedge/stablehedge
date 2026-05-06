import { api } from '@/lib/api'
import { ActionButtons } from './action-buttons'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  READY: 'bg-emerald-100 text-emerald-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  SETTLED: 'bg-emerald-200 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-700',
}

const PAYMENT_BADGE: Record<string, string> = {
  PREPARED: 'bg-sky-100 text-sky-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  VALIDATED: 'bg-emerald-100 text-emerald-700',
  REFLECTED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
}

export default async function DistributionDetail({ params }: { params: { id: string } }) {
  const d = await api.distribution(params.id)
  const total = Number(d.totalDistributableUsd)
  const treasuryBalanceLabel = `${total.toLocaleString()} ${d.fund.token.displayLabel}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{d.fund.name}</h1>
          <div className="text-sm text-slate-500 mt-1">배당 대상 부동산 투자 딜명</div>
          <div className="flex gap-2 mt-3 text-sm">
            <span className="px-2.5 py-1 rounded-full bg-slate-100">{d.fund.token.displayLabel}</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100">XRPL {d.fund.network}</span>
            <span className={`px-2.5 py-1 rounded-full ${STATUS_BADGE[d.status] ?? 'bg-slate-100'}`}>
              Payout Status: {d.status}
            </span>
          </div>
        </div>
        <ActionButtons id={d.id} status={d.status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card label="Deal Information" value={d.fund.name} />
        <Card label="Total Distributable Amount" value={`$${total.toLocaleString()}`} />
        <Card label="Payout Token" value={d.fund.token.displayLabel} sub={`on XRPL ${d.fund.network}`} />
        <Card label="Payout Status" value={d.status} sub={d.status === 'READY' ? 'Ready to submit payment' : ''} />
        <Card label="Treasury Wallet" value={short(d.fund.treasuryAddress)} mono />
        <Card label="Treasury Balance" value={treasuryBalanceLabel} sub="Issued USD Stablecoin" />
        <Card label="Investor Count" value={String(d.items.length)} sub="Investors" />
        {d.fxReferenceRateKrwPerUsd && (
          <Card label="FX Reference (KRW/USD)" value={`${Number(d.fxReferenceRateKrwPerUsd).toLocaleString()} KRW/USD`} />
        )}
      </div>

      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-1">Investor Distribution</h2>
        <div className="text-xs text-slate-500 mb-4">
          Investor Distribution Amount = Total Distribution Amount × Investor Ownership %
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="py-2">Investor</th>
              <th className="py-2">Ownership %</th>
              <th className="py-2">Distribution Amount</th>
              <th className="py-2">Wallet Address</th>
              <th className="py-2">Trustline</th>
              <th className="py-2">Payment Status</th>
              <th className="py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-3">
                  <div className="font-medium">{it.investor.name}</div>
                  <div className="text-xs text-slate-500">{it.investor.externalId}</div>
                </td>
                <td className="py-3">{it.ownershipPercent}%</td>
                <td className="py-3">{Number(it.amountUsd).toLocaleString()} {d.fund.token.displayLabel}</td>
                <td className="py-3 font-mono text-xs">{short(it.investor.walletAddress)}</td>
                <td className="py-3">{it.trustlineStatus}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${PAYMENT_BADGE[it.paymentStatus] ?? 'bg-slate-100'}`}>
                    {it.paymentStatus}
                  </span>
                </td>
                <td className="py-3">
                  {it.explorerUrl ? (
                    <a className="text-blue-600 underline text-xs" href={it.explorerUrl} target="_blank" rel="noreferrer">
                      Explorer ↗
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Card({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${mono ? 'font-mono' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function short(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 7)}...${addr.slice(-6)}`
}
