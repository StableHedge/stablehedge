import { api } from '@/lib/api'
import { SettlementFlow } from './settlement-flow'
import { KpiCard, WalletKpiCard, StatusKpiCard } from './kpi-cards'
import { TreasuryBalanceCard } from './treasury-balance-card'
import { InvestorBalancesChart } from './investor-balances-chart'

export const dynamic = 'force-dynamic'

export default async function SettlementMonitor({ params }: { params: { fundId: string } }) {
  const m = await api.settlementMonitor(params.fundId)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-medium">XRPL Settlement Monitor</span>
          </nav>
          <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
            <option>Q1-2026</option>
            <option>Q2-2026</option>
            <option>Q3-2026</option>
          </select>
        </div>
        <hr className="border-slate-200 mb-4" />
        <h1 className="text-3xl font-semibold text-slate-900">XRPL Settlement Monitor</h1>
        <p className="text-m font-medium text-sky-600 mt-0.5">{m.fund.name}</p>
      </div>

      {/*KPI Card*/}
      <div className="space-y-4">
        {/* Row 1: Wallet + Token + Network */}
        <div className="grid grid-cols-4 gap-4">
          <WalletKpiCard
            label="Treasury Wallet"
            address={m.treasuryWallet}
            sub="Investor payout wallet"
            iconName="wallet"
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
          />
          <WalletKpiCard
            label="Issuer Wallet"
            address={m.issuerWallet}
            sub="Token issuer wallet"
            iconName="wallet"
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
          />
          <KpiCard
            label="Token"
            value={m.token.displayLabel}
            iconName="coins"
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
          />
          <KpiCard
            label="Network"
            value={`XRPL ${m.fund.network}`}
            iconName="globe"
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            valueColor={
              m.fund.network.toLowerCase().includes('testnet')
                ? 'text-sky-600'
                : 'text-emerald-700'
            }
          />
        </div>

        {/* Row 2: Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="Total Issued"
            value={fmt(m.summary.totalIssued)}
            sub={m.token.displayLabel}
            iconName="database"
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
          />
          <KpiCard
            label="Treasury Balance"
            value={fmt(m.summary.treasuryBalance)}
            sub={m.token.displayLabel}
            iconName="landmark"
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
          />
          <KpiCard
            label="Investor Balances (Total)"
            value={fmt(m.summary.investorBalancesTotal)}
            sub={m.token.displayLabel}
            iconName="users"
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
          />
          <StatusKpiCard
            status={m.summary.latestTransactionStatus?.status}
            ledgerIndex={m.summary.latestTransactionStatus?.ledgerIndex}
          />
        </div>
      </div>

      {/* Settlement Flow + Treasury Balance */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <section className="col-span-2 h-[280px] bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-8">XRPL Settlement Flow</h2>
          <SettlementFlow status={m.summary.latestTransactionStatus?.status} />
        </section>

        <TreasuryBalanceCard
          token={m.token.displayLabel}
          beforePayout={m.treasuryBalanceCard.beforePayout}
          afterPayout={m.treasuryBalanceCard.afterPayout}
          change={m.treasuryBalanceCard.change}
          changePercent={m.treasuryBalanceCard.changePercent}
        />
      </div>

      {/* Transactions + Investor Balances */}
      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Recent XRPL Transactions</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 font-medium">Tx Hash</th>
                <th className="py-2 font-medium">Amount</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Ledger</th>
                <th className="py-2 font-medium">Time (UTC)</th>
                <th className="py-2 font-medium">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {m.recentTransactions.map((t) => (
                <tr key={t.txHash} className="border-b last:border-0">
                  <td className="py-2.5 font-mono text-xs text-slate-700">{short(t.txHash)}</td>
                  <td className="py-2.5 tabular-nums">{t.amount ? Number(t.amount).toLocaleString() : '—'}</td>
                  <td className="py-2.5">
                    <TxStatusBadge status={t.status} />
                  </td>
                  <td className="py-2.5 text-slate-600">{t.ledgerIndex?.toLocaleString() ?? '—'}</td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {t.timestampUtc ? new Date(t.timestampUtc).toISOString().slice(0, 19).replace('T', ' ') : '—'}
                  </td>
                  <td className="py-2.5">
                    <a
                      className="text-sky-600 text-xs hover:underline"
                      href={t.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ↗ View
                    </a>
                  </td>
                </tr>
              ))}
              {m.recentTransactions.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-400 text-sm" colSpan={6}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Investor Balances</h2>
          <InvestorBalancesChart balances={m.investorBalances} />
        </section>
      </div>
    </div>
  )
}

function TxStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    VALIDATED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    REFLECTED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    SUBMITTED: 'bg-sky-50 text-sky-700 border border-sky-100',
    PREPARED:  'bg-slate-50 text-slate-600 border border-slate-100',
    FAILED:    'bg-rose-50 text-rose-700 border border-rose-100',
  }
  const cls = styles[status] ?? 'bg-slate-50 text-slate-600 border border-slate-100'
  return (
    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status}
    </span>
  )
}

function short(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 7)}...${addr.slice(-6)}`
}

function fmt(n: string): string {
  return Number(n).toLocaleString()
}
