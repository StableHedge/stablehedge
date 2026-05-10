'use client'

import { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  ExternalLink,
  Search,
  ChevronDown,
  Users,
  CheckCircle2,
  Loader,
  Snowflake,
  Ban,
} from 'lucide-react'
import type {
  InvestorDistributionItem,
  PaymentStatus,
  TrustlineStatus,
} from '@stablehedge/shared-types'

type SortOption =
  | 'default'
  | 'ownership-desc'
  | 'ownership-asc'
  | 'amount-desc'
  | 'amount-asc'

type StatusFilter = 'ALL' | PaymentStatus

const PAYMENT_BADGE: Record<PaymentStatus, { bg: string; text: string; ring: string; dot: string }> = {
  PREPARED:  { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-200',   dot: 'bg-slate-400' },
  SUBMITTED: { bg: 'bg-sky-50',     text: 'text-sky-600',     ring: 'ring-sky-100',     dot: 'bg-sky-400' },
  VALIDATED: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-400' },
  REFLECTED: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-400' },
  FAILED:    { bg: 'bg-rose-50',    text: 'text-rose-600',    ring: 'ring-rose-100',    dot: 'bg-rose-400' },
}

const TRUSTLINE_BADGE: Record<TrustlineStatus, { icon: string }> = {
  ACTIVE:  { icon: 'text-emerald-500' },
  PENDING: { icon: 'text-yellow-500' },
  FROZEN:  { icon: 'text-slate-500' },
  REVOKED: { icon: 'text-rose-500' },
}

function short(addr: string): string {
  if (!addr || addr.length <= 14) return addr ?? '—'
  return `${addr.slice(0, 7)}...${addr.slice(-6)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
      title="Copy address"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

function TrustlineIcon({ status }: { status: TrustlineStatus }) {
  const className = `w-3.5 h-3.5 ${TRUSTLINE_BADGE[status]?.icon ?? 'text-slate-400'}`

  if (status === 'ACTIVE') return <CheckCircle2 className={className} />
  if (status === 'PENDING') return <Loader className={className} />
  if (status === 'FROZEN') return <Snowflake className={className} />
  return <Ban className={className} />
}

export function InvestorTable({
  items,
  tokenLabel,
}: {
  items: InvestorDistributionItem[]
  tokenLabel: string
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sortOption, setSortOption] = useState<SortOption>('default')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return items.filter((it) => {
      const matchesQuery =
        !q ||
        it.investor.name.toLowerCase().includes(q) ||
        it.investor.externalId.toLowerCase().includes(q) ||
        it.investor.walletAddress.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'ALL' || it.paymentStatus === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [items, query, statusFilter])

  const sorted = useMemo(() => {
    const list = [...filtered]

    if (sortOption === 'ownership-desc') {
      return list.sort((a, b) => b.ownershipBp - a.ownershipBp)
    }
    if (sortOption === 'ownership-asc') {
      return list.sort((a, b) => a.ownershipBp - b.ownershipBp)
    }
    if (sortOption === 'amount-desc') {
      return list.sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))
    }
    if (sortOption === 'amount-asc') {
      return list.sort((a, b) => Number(a.amountUsd) - Number(b.amountUsd))
    }

    return list
  }, [filtered, sortOption])

  const hasActiveFilter = query || statusFilter !== 'ALL' || sortOption !== 'default'

  return (
    <div>
      {/* Controls */}
      <div className="mb-6 flex items-start justify-between gap-4 ">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Investor Distribution</h2>
          <p className="text-xs text-slate-500 mt-1">
            Investor Distribution Amount = Total Distribution Amount × Investor Ownership %
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by investor name, ID, or wallet address..."
              className="w-full h-9 pl-9 pr-8 text-sm border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs leading-none"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative">
            <select
             value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="ALL">All Status</option>
              <option value="PREPARED">Prepared</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VALIDATED">Validated</option>
              <option value="REFLECTED">Reflected</option>
              <option value="FAILED">Failed</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="default">Sort: Default</option>
              <option value="ownership-desc">Ownership ↓</option>
              <option value="ownership-asc">Ownership ↑</option>
              <option value="amount-desc">Amount ↓</option>
              <option value="amount-asc">Amount ↑</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Investor
              </th>
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ownership % 
              </th>
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Distribution Amount
              </th>
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Wallet Address
              </th>
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trustline
              </th>
              <th className="pb-2.5 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment Status
              </th>
              <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transaction
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-slate-300" />
                    {hasActiveFilter ? (
                      <>
                        <p className="text-sm font-medium text-slate-500">
                          No matching investor distributions
                        </p>
                        <p className="text-xs text-slate-400">
                          Try changing the search keyword, status filter, or sort option
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-500">
                          No investor distributions found
                        </p>
                        <p className="text-xs text-slate-400">
                          Calculate distribution to generate payout rows
                        </p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((it) => {
                const badge = PAYMENT_BADGE[it.paymentStatus]
                const tl = TRUSTLINE_BADGE[it.trustlineStatus]
                return (
                  <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                    {/* Investor */}
                    <td className="py-3.5 pr-6">
                      <div className="font-medium text-slate-900">{it.investor.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{it.investor.externalId}</div>
                    </td>

                    {/* Ownership % */}
                    <td className="py-3.5 pr-6 font-medium tabular-nums text-slate-700">
                      {it.ownershipPercent}%
                    </td>

                    {/* Distribution Amount */}
                    <td className="py-3.5 pr-6 tabular-nums">
                      <span className="font-medium text-slate-900">
                        {Number(it.amountUsd).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{tokenLabel}</span>
                    </td>

                    {/* Wallet Address */}
                    <td className="py-3.5 pr-6">
                      {it.investor.walletAddress ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-500">
                            {short(it.investor.walletAddress)}
                          </span>
                          <CopyButton text={it.investor.walletAddress} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Trustline Status*/}
                    <td className="py-3.5 pr-6">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <TrustlineIcon status={it.trustlineStatus} />
                        {it.trustlineStatus}
                      </span>                
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 pr-6">
                      {badge ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                          {it.paymentStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{it.paymentStatus}</span>
                      )}
                    </td>

                    {/* Transaction */}
                    <td className="py-3.5">
                      {it.explorerUrl ? (
                        <a
                          href={it.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 border border-sky-200 hover:border-sky-700 rounded px-2 py-1 transition-colors"
                        >
                          View Tx
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-sky-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Filter result count */}
      {query && sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {sorted.length} of {items.length} investors
        </p>
      )}
    </div>
  )
}
