import { Landmark, Calendar, CircleDollarSign, Wallet, ArrowLeftRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function InvestorStatement({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { period?: string; fundId?: string }
}) {
  const [statements, portfolio] = await Promise.all([
    api.investorStatements(params.id, searchParams),
    api.investorPortfolioStatement(params.id),
  ])

  if (statements.totalStatements === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Investor Statement</h1>
        <div className="text-slate-500">No statements yet for this investor.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-slate-500">Home / Investor Statement</div>
        <h1 className="mt-1 text-3xl font-semibold">Investor Portfolio Statement</h1>
        <div className="mt-2 text-sm text-slate-500">
          {portfolio.investor.name} · {portfolio.investor.externalId}
          {statements.filters.period ? ` · ${statements.filters.period}` : ''}
          {statements.filters.fundId ? ` · ${statements.filters.fundId}` : ''}
        </div>
      </div>

      <section className="grid grid-cols-5 gap-4">
        <StatCard
          label="Funds"
          value={String(portfolio.totals.fundCount)}
          icon={Landmark}
        />
        <StatCard
          label="Beginning Value"
          value={
            portfolio.totals.totalBeginningValueUsd
              ? `$${Number(portfolio.totals.totalBeginningValueUsd).toLocaleString()}`
              : '—'
          }
          icon={Calendar}
        />
        <StatCard
          label="Total Distributed (USD)"
          value={`$${Number(portfolio.totals.totalDistributionsUsd).toLocaleString()}`}
          icon={CircleDollarSign}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
        />
        <StatCard
          label="Total Distributed (KRW)"
          value={
            portfolio.totals.totalDistributionsKrw
              ? `₩${Number(portfolio.totals.totalDistributionsKrw).toLocaleString()}`
              : '—'
          }
          icon={Wallet}
        />
        <StatCard
          label="Settlement Status"
          value={`${portfolio.totals.settledCount} settled`}
          sub={`${portfolio.totals.pendingCount} pending`}
          icon={ArrowLeftRight}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
        />
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Portfolio Funds</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="pb-3 pr-4 font-medium">Fund</th>
                <th className="pb-3 pr-4 font-medium">Ownership</th>
                <th className="pb-3 pr-4 font-medium">Beginning Value</th>
                <th className="pb-3 pr-4 font-medium">Distributed (USD)</th>
                <th className="pb-3 pr-4 font-medium">Distributed (KRW)</th>
                <th className="pb-3 pr-4 font-medium">Statements</th>
                <th className="pb-3 font-medium">Latest Period</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.funds.map((fund) => (
                <tr key={fund.fund.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{fund.fund.name}</td>
                  <td className="py-3 pr-4">
                    {fund.currentOwnershipPercent ? `${fund.currentOwnershipPercent}%` : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {fund.beginningValueUsd
                      ? `$${Number(fund.beginningValueUsd).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    ${Number(fund.totalDistributionsUsd).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    {fund.totalDistributionsKrw
                      ? `₩${Number(fund.totalDistributionsKrw).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">{fund.statementCount}</td>
                  <td className="py-3">{fund.latestReportingPeriod ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-4">
        {statements.funds.map((group) => (
          <section key={group.fund.id} className="rounded-lg border bg-white p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{group.fund.name}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {group.statementCount} statements · Latest {group.latestReportingPeriod ?? '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <MiniStat
                  label="Fund Distributed (USD)"
                  value={`$${Number(group.totalDistributedUsd).toLocaleString()}`}
                />
                <MiniStat
                  label="Fund Distributed (KRW)"
                  value={
                    group.totalDistributedKrw
                      ? `₩${Number(group.totalDistributedKrw).toLocaleString()}`
                      : '—'
                  }
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr className="border-b">
                    <th className="pb-3 pr-4 font-medium">Period</th>
                    <th className="pb-3 pr-4 font-medium">Beginning Value</th>
                    <th className="pb-3 pr-4 font-medium">Distribution</th>
                    <th className="pb-3 pr-4 font-medium">KRW Equivalent</th>
                    <th className="pb-3 pr-4 font-medium">Yield</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Wallet</th>
                    <th className="pb-3 font-medium">On-Chain Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.id} className="border-b align-top last:border-0">
                      <td className="py-3 pr-4 font-medium">{item.reportingPeriod}</td>
                      <td className="py-3 pr-4">
                        {item.beginningValueUsd
                          ? `$${Number(item.beginningValueUsd).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {Number(item.distributionAmount.value).toLocaleString()}{' '}
                        {item.distributionAmount.token}
                      </td>
                      <td className="py-3 pr-4">
                        {item.krwEquivalent
                          ? `₩${Number(item.krwEquivalent).toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {item.distributionYield ? `${item.distributionYield}%` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={statusClass(item.status)}>{item.status}</span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{short(item.walletAddress)}</td>
                      <td className="py-3 text-xs">
                        {item.onChainProof ? (
                          <div className="space-y-1">
                            <div className="font-mono">{short(item.onChainProof.txHash)}</div>
                            <a
                              className="text-blue-600 underline"
                              href={item.onChainProof.explorerUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View on XRPL Explorer ↗
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-500">Not yet settled on-chain.</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg = 'bg-slate-100',
  iconColor = 'text-slate-500',
}: {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-base font-semibold mt-0.5 tabular-nums text-slate-900 truncate leading-snug">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  )
}

function statusClass(status: string): string {
  if (status === 'Settled') return 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700'
  if (status === 'Submitted') return 'rounded-full bg-blue-100 px-2 py-0.5 text-blue-700'
  if (status === 'Failed') return 'rounded-full bg-rose-100 px-2 py-0.5 text-rose-700'
  return 'rounded-full bg-amber-100 px-2 py-0.5 text-amber-700'
}

function short(value: string): string {
  if (value.length <= 14) return value
  return `${value.slice(0, 7)}...${value.slice(-6)}`
}
