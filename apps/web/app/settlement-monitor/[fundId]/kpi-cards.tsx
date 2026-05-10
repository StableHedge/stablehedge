'use client'

import { useState } from 'react'
import { 
  CircleCheck,
  CircleAlert,
  Clock,
  Copy,
  Check,
  Wallet,
  Coins,
  Globe,
  Database,
  Landmark,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type IconName =
  | 'wallet'
  | 'coins'
  | 'globe'
  | 'database'
  | 'landmark'
  | 'users'

const ICONS: Record<IconName, LucideIcon> = {
  wallet: Wallet,
  coins: Coins,
  globe: Globe,
  database: Database,
  landmark: Landmark,
  users: Users,
}

// ── Base KPI Card ─────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  iconName: IconName
  iconBg?: string
  iconColor?: string
  valueColor?: string
}

export function KpiCard({
  label,
  value,
  sub,
  iconName,
  iconBg = 'bg-slate-100',
  iconColor = 'text-slate-500',
  valueColor = 'text-slate-900',
}: KpiCardProps) {
  const Icon = ICONS[iconName]
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={21} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-base font-semibold mt-0.5 truncate ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Wallet KPI Card (with clipboard copy) ────────────────────

interface WalletKpiCardProps {
  label: string
  address: string
  sub?: string
  iconName: IconName
  iconBg?: string
  iconColor?: string
}

export function WalletKpiCard({
  label,
  address,
  sub,
  iconName,
  iconBg = 'bg-sky-50',
  iconColor = 'text-sky-600',
}: WalletKpiCardProps) {
  const Icon = ICONS[iconName]
  const [copied, setCopied] = useState(false)

  const short =
    address.length > 14
      ? `${address.slice(0, 7)}...${address.slice(-6)}`
      : address

  async function handleCopy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={21} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="font-mono text-sm font-semibold text-slate-900 truncate">{short}</p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check size={13} className="text-emerald-500" />
            ) : (
              <Copy size={13} />
            )}
          </button>
        </div>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Latest Transaction Status KPI Card ───────────────────────

type StatusStyle = {
  Icon: LucideIcon
  iconBg: string
  iconColor: string
  valueColor: string
}

function resolveStatusStyle(status: string | null | undefined): StatusStyle {
  switch (status) {
    case 'VALIDATED':
    case 'REFLECTED':
      return { Icon: CircleCheck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', valueColor: 'text-emerald-700' }
    case 'SUBMITTED':
    case 'PREPARED':
      return { Icon: Clock,       iconBg: 'bg-sky-50',     iconColor: 'text-sky-500',     valueColor: 'text-sky-700'     }
    case 'FAILED':
      return { Icon: CircleAlert, iconBg: 'bg-rose-50',    iconColor: 'text-rose-500',    valueColor: 'text-rose-700'    }
    default:
      return { Icon: Clock,       iconBg: 'bg-slate-100',  iconColor: 'text-slate-400',   valueColor: 'text-slate-500'   }
  }
}

export function StatusKpiCard({
  status,
  ledgerIndex,
}: {
  status: string | null | undefined
  ledgerIndex?: number | null
}) {
  const { Icon, iconBg, iconColor, valueColor } = resolveStatusStyle(status)
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={21} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">Latest Transaction Status</p>
        <p className={`text-base font-semibold mt-0.5 truncate ${valueColor}`}>
          {status ?? '—'}
        </p>
        {ledgerIndex && (
          <p className="text-xs text-slate-400 mt-0.5">
            Ledger #{ledgerIndex.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
