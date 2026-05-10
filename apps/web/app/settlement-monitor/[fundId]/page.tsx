import { api } from '@/lib/api'
import { SettlementFlow } from './settlement-flow'

export const dynamic = 'force-dynamic'

export default async function SettlementMonitor({ params }: { params: { fundId: string } }) {
  const m = await api.settlementMonitor(params.fundId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">XRPL Settlement Monitor</h1>
        <div className="text-blue-600 font-medium">{m.fund.name}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card label="Treasury Wallet" value={short(m.treasuryWallet)} mono sub="투자자에게 토큰 지급" />
        <Card label="Issuer Wallet" value={short(m.issuerWallet)} mono sub="토큰 발행 지갑" />
        <Card label="Token" value={m.token.displayLabel} />
        <Card label="Network" value={`XRPL ${m.fund.network}`} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card label="Total Issued" value={fmt(m.summary.totalIssued)} sub={m.token.displayLabel} />
        <Card label="Treasury Balance" value={fmt(m.summary.treasuryBalance)} sub={m.token.displayLabel} />
        <Card label="Investor Balances (Total)" value={fmt(m.summary.investorBalancesTotal)} sub={m.token.displayLabel} />
        <Card
          label="Latest Transaction Status"
          value={m.summary.latestTransactionStatus?.status ?? '—'}
          sub={
            m.summary.latestTransactionStatus?.ledgerIndex
              ? `Ledger #${m.summary.latestTransactionStatus.ledgerIndex.toLocaleString()}`
              : ''
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">XRPL Settlement Flow</h2>
          <SettlementFlow status={m.summary.latestTransactionStatus?.status} />
        </section>

        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Treasury Balance ({m.token.displayLabel})</h2>
          <div className="space-y-1 text-sm">
            <Row label="Before Payout" value={fmt(m.treasuryBalanceCard.beforePayout)} />
            <Row label="After Payout" value={fmt(m.treasuryBalanceCard.afterPayout)} />
            <Row
              label="Change"
              value={`${m.treasuryBalanceCard.change} (${m.treasuryBalanceCard.changePercent}%)`}
              tone={Number(m.treasuryBalanceCard.change) < 0 ? 'rose' : 'emerald'}
            />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Recent XRPL Transactions</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2">Tx Hash</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ledger</th>
                <th className="py-2">Time (UTC)</th>
                <th className="py-2">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {m.recentTransactions.map((t) => (
                <tr key={t.txHash} className="border-b">
                  <td className="py-2 font-mono text-xs">{short(t.txHash)}</td>
                  <td className="py-2">{t.amount ? Number(t.amount).toLocaleString() : '—'}</td>
                  <td className="py-2">{t.status}</td>
                  <td className="py-2">{t.ledgerIndex?.toLocaleString() ?? '—'}</td>
                  <td className="py-2 text-xs">{t.timestampUtc ? new Date(t.timestampUtc).toISOString().slice(0, 19) : '—'}</td>
                  <td className="py-2">
                    <a className="text-blue-600 text-xs underline" href={t.explorerUrl} target="_blank" rel="noreferrer">↗</a>
                  </td>
                </tr>
              ))}
              {m.recentTransactions.length === 0 && (
                <tr><td className="py-3 text-slate-500" colSpan={6}>No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-3">Investor Balances</h2>
          <ul className="space-y-2 text-sm">
            {m.investorBalances.map((b) => (
              <li key={b.investorId} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.investorName}</div>
                  <div className="text-xs text-slate-500">{b.investorId}</div>
                </div>
                <div className="text-right">
                  <div>{fmt(b.balance)}</div>
                  <div className="text-xs text-slate-500">{b.percent}%</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
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

function Row({ label, value, tone }: { label: string; value: string; tone?: 'rose' | 'emerald' }) {
  const cls = tone === 'rose' ? 'text-rose-600' : tone === 'emerald' ? 'text-emerald-600' : ''
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  )
}

function short(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 7)}...${addr.slice(-6)}`
}

function fmt(n: string): string {
  return Number(n).toLocaleString()
}
