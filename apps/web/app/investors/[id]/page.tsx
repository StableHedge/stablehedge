import { Landmark, Calendar, CircleDollarSign, Wallet, ArrowLeftRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { FundCardList } from './fund-card'
import { HeaderActions } from './header-actions'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">Home / Investor Statement</div>
          <h1 className="mt-1 text-3xl font-semibold">Investor Portfolio Statement</h1>
          <div className="mt-2 text-sm text-slate-500">
            {portfolio.investor.name} · {portfolio.investor.externalId}
            {statements.filters.period ? ` · ${statements.filters.period}` : ''}
            {statements.filters.fundId ? ` · ${statements.filters.fundId}` : ''}
          </div>
        </div>
        <div className="flex-shrink-0 pt-1">
          <HeaderActions />
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

      <section className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Portfolio Funds</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="pl-6 pr-4 py-2.5 font-medium">Fund</th>
                <th className="px-4 py-2.5 font-medium">Ownership</th>
                <th className="px-4 py-2.5 font-medium">Beginning Value</th>
                <th className="px-4 py-2.5 font-medium">Distributed (USD)</th>
                <th className="px-4 py-2.5 font-medium">Distributed (KRW)</th>
                <th className="px-4 py-2.5 font-medium">Statements</th>
                <th className="pl-4 pr-6 py-2.5 font-medium">Latest Period</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.funds.map((fund) => (
                <tr key={fund.fund.id} className="border-t border-slate-100">
                  <td className="pl-6 pr-4 py-3 font-medium text-slate-900">{fund.fund.name}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {fund.currentOwnershipPercent ? `${fund.currentOwnershipPercent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {fund.beginningValueUsd
                      ? `$${Number(fund.beginningValueUsd).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    ${Number(fund.totalDistributionsUsd).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {fund.totalDistributionsKrw
                      ? `₩${Number(fund.totalDistributionsKrw).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fund.statementCount}</td>
                  <td className="pl-4 pr-6 py-3 text-slate-700">{fund.latestReportingPeriod ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Fund Statements</h2>
        <FundCardList funds={statements.funds} />
      </section>
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
