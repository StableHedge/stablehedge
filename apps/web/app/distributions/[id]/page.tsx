import Link from 'next/link'
import {
  Info,
  CircleDollarSign,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Wallet,
  Landmark,
  Users,
  ArrowLeftRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { ActionButtons } from './action-buttons'
import { PeriodSelector } from './period-selector'
import { CopyAddress } from './copy-address'
import { InvestorTable } from './investor-table'

export const dynamic = 'force-dynamic'

function statusBadgeClasses(status: string): string {
  const map: Record<string, string> = {
    DRAFT:     'border-slate-300 bg-slate-50 text-slate-600',
    READY:     'border-emerald-400 bg-emerald-50 text-emerald-700',
    SUBMITTED: 'border-blue-400 bg-blue-50 text-blue-700',
    SETTLED:   'border-emerald-500 bg-emerald-50 text-emerald-800',
    FAILED:    'border-rose-400 bg-rose-50 text-rose-700',
  }
  return map[status] ?? 'border-slate-300 bg-slate-50 text-slate-600'
}


export default async function DistributionDetail({ params }: { params: { id: string } }) {
  const d = await api.distribution(params.id)
  const siblingDists = await api.distributions(d.fund.id).catch(() => [])

  const total = Number(d.totalDistributableUsd)
  const treasuryBalanceLabel = `${total.toLocaleString()} ${d.fund.token.displayLabel}`

  const periodOptions = siblingDists.map((dist) => ({
    id: dist.id,
    period: dist.period,
    status: dist.status,
  }))

  return (
    <div className="space-y-4">
      {/* ── Row 1: breadcrumb (left) + period selector (right) ── */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="breadcrumb">
          <Link href="/distributions" className="hover:text-slate-800 transition-colors">
            Distributions
          </Link>
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-slate-700">{d.fund.name}</span>
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-slate-900">{d.period}</span>
        </nav>

        <PeriodSelector options={periodOptions} currentId={d.id} />
      </div>

      {/* ── Divider ── */}
      <hr className="border-slate-200" />

      {/* ── Row 2: fund title + badges (left) / action buttons (right) ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{d.fund.name}</h1>

          <div className="flex gap-2 mt-3 text-sm flex-wrap">
            {/* Token badge */}
            <span className="px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 flex items-center gap-1.5 font-medium">
              <CircleDollarSign className="w-4 h-4" />
              {d.fund.token.displayLabel}
            </span>

            {/* Network badge */}
            <span className="px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 flex items-center gap-1.5 font-medium">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2" />
                <circle cx="18" cy="6" r="2" />
                <circle cx="18" cy="18" r="2" />
                <path d="M8 11.5l8-4M8 12.5l8 4" />
              </svg>
              XRPL {d.fund.network}
            </span>

            {/* Status badge */}
            <span className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-medium ${statusBadgeClasses(d.status)}`}>
              {(d.status === 'READY' || d.status === 'SETTLED') && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 12.5l2.5 2.5 4-4.5" />
                </svg>
              )}
              {d.status === 'FAILED' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
              )}
              {d.status === 'SUBMITTED' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4l2 2" />
                </svg>
              )}
              {d.status === 'DRAFT' && (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              )}
              Payout Status: {d.status}
            </span>
          </div>
        </div>

        <ActionButtons id={d.id} status={d.status} />
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Deal Information"
          value={d.fund.name}
          icon={<Info className="w-5 h-5" />}
          accent="neutral"
        />
        <KpiCard
          label="Total Distributable Amount"
          value={`$${total.toLocaleString()}`}
          sub="USD"
          icon={<CircleDollarSign className="w-5 h-5" />}
          accent="info"
        />
        <KpiCard
          label="Payout Token"
          value={d.fund.token.displayLabel}
          sub={`on XRPL ${d.fund.network}`}
          icon={<Coins className="w-5 h-5" />}
          accent="info"
        />
        <KpiCard
          label="Payout Status"
          value={d.status}
          sub={STATUS_SUB[d.status]}
          icon={<StatusIcon status={d.status} />}
          accent={STATUS_ACCENT[d.status] ?? 'neutral'}
          pill
        />
        <KpiCard
          label="Treasury Wallet"
          valueNode={<CopyAddress address={d.fund.treasuryAddress} />}
          icon={<Wallet className="w-5 h-5" />}
          accent="neutral"
        />
        <KpiCard
          label="Treasury Balance"
          value={treasuryBalanceLabel}
          sub="Issued USD Stablecoin"
          icon={<Landmark className="w-5 h-5" />}
          accent="info"
        />
        <KpiCard
          label="Investor Count"
          value={String(d.items.length)}
          sub="Investors"
          icon={<Users className="w-5 h-5" />}
          accent="neutral"
        />
        {d.fxReferenceRateKrwPerUsd && (
          <KpiCard
            label="Settlement FX Rate"
            value={`${Number(d.fxReferenceRateKrwPerUsd).toLocaleString()} KRW/USD`}
            icon={<ArrowLeftRight className="w-5 h-5" />}
            accent="warning"
          />
        )}
      </div>

      <section className="bg-white rounded-lg border p-6">
        <InvestorTable items={d.items} tokenLabel={d.fund.token.displayLabel} />
      </section>
    </div>
  )
}

// ── Status helpers ─────────────────────────────────────────────────────────────

type Accent = 'neutral' | 'info' | 'success' | 'warning' | 'error'

const STATUS_ACCENT: Record<string, Accent> = {
  DRAFT:     'neutral',
  READY:     'success',
  SUBMITTED: 'info',
  SETTLED:   'success',
  FAILED:    'error',
}

const STATUS_SUB: Record<string, string> = {
  DRAFT:     'Awaiting calculation',
  READY:     'Ready to submit payment',
  SUBMITTED: 'Submitted to XRPL',
  SETTLED:   'Settled on-chain',
  FAILED:    'Payment failed',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'READY' || status === 'SETTLED') return <CheckCircle2 className="w-5 h-5" />
  if (status === 'FAILED')                        return <XCircle className="w-5 h-5" />
  if (status === 'SUBMITTED')                     return <Clock className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

const ACCENT_STYLES: Record<Accent, { iconBg: string; pillBg: string }> = {
  neutral: { iconBg: 'bg-slate-100 text-slate-500',    pillBg: 'bg-slate-100 text-slate-700' },
  info:    { iconBg: 'bg-sky-50 text-sky-600',         pillBg: 'bg-sky-100 text-sky-700' },
  success: { iconBg: 'bg-emerald-50 text-emerald-600', pillBg: 'bg-emerald-100 text-emerald-700' },
  warning: { iconBg: 'bg-amber-50 text-amber-600',     pillBg: 'bg-amber-100 text-amber-700' },
  error:   { iconBg: 'bg-rose-50 text-rose-600',       pillBg: 'bg-rose-100 text-rose-700' },
}

function KpiCard({
  label,
  value,
  valueNode,
  sub,
  icon,
  accent = 'neutral',
  pill = false,
}: {
  label: string
  value?: string
  valueNode?: React.ReactNode
  sub?: string
  icon: React.ReactNode
  accent?: Accent
  pill?: boolean
}) {
  const { iconBg, pillBg } = ACCENT_STYLES[accent]

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      {/* Icon */}
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </span>

      {/* Text stack — all aligned to the same left edge */}
      <div className="flex flex-col min-w-0 pt-0.5">
        <span className="text-xs font-medium text-slate-500">{label}</span>

        {valueNode ? (
          <div className="mt-1.5">{valueNode}</div>
        ) : pill && value ? (
          <span className={`inline-flex self-start mt-1.5 px-3 py-1 rounded-full text-sm font-semibold ${pillBg}`}>
            {value}
          </span>
        ) : (
          <p className="mt-1.5 text-xl font-bold text-slate-900 leading-snug">{value}</p>
        )}

        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

