'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

interface OnChainProof {
  txHash: string
  explorerUrl: string
}

interface StatementItem {
  id: string
  reportingPeriod: string
  beginningValueUsd?: string | null
  distributionAmount: { value: string; token: string }
  krwEquivalent?: string | null
  distributionYield?: string | null
  status: string
  walletAddress: string
  onChainProof?: OnChainProof | null
}

interface FundGroup {
  fund: { id: string; name: string }
  statementCount: number
  latestReportingPeriod?: string | null
  totalDistributedUsd: string | number
  totalDistributedKrw?: string | number | null
  items: StatementItem[]
}

function statusClass(status: string): string {
  if (status === 'Settled')   return 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
  if (status === 'Submitted') return 'inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700'
  if (status === 'Failed')    return 'inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700'
  return 'inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
}

function short(value: string): string {
  if (value.length <= 14) return value
  return `${value.slice(0, 7)}...${value.slice(-6)}`
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
      onClick={handleCopy}
      className="ml-1.5 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      title="Copy"
    >
      {copied
        ? <Check size={12} className="text-emerald-500" />
        : <Copy size={12} />
      }
    </button>
  )
}

function FundCard({ group }: { group: FundGroup }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-6 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{group.fund.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {group.statementCount} statements · Latest {group.latestReportingPeriod ?? '—'}
          </p>
        </div>

        <div className="flex items-center gap-8 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500">Distributed (USD)</p>
            <p className="text-sm font-semibold tabular-nums text-slate-900">
              ${Number(group.totalDistributedUsd).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Distributed (KRW)</p>
            <p className="text-sm font-semibold tabular-nums text-slate-900">
              {group.totalDistributedKrw
                ? `₩${Number(group.totalDistributedKrw).toLocaleString()}`
                : '—'}
            </p>
          </div>
          <div className="text-slate-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="pl-5 pr-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Beginning Value</th>
                  <th className="px-4 py-2.5 font-medium">Distribution</th>
                  <th className="px-4 py-2.5 font-medium">KRW Equivalent</th>
                  <th className="px-4 py-2.5 font-medium">Yield</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Wallet</th>
                  <th className="pl-4 pr-5 py-2.5 font-medium">On-Chain Proof</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="pl-5 pr-4 py-3 font-medium text-slate-900">{item.reportingPeriod}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {item.beginningValueUsd
                        ? `$${Number(item.beginningValueUsd).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {Number(item.distributionAmount.value).toLocaleString()}{' '}
                      {item.distributionAmount.token}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {item.krwEquivalent
                        ? `₩${Number(item.krwEquivalent).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {item.distributionYield ? `${item.distributionYield}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center font-mono text-xs text-slate-700">
                        <span>{short(item.walletAddress)}</span>
                        <CopyButton text={item.walletAddress} />
                      </div>
                    </td>
                    <td className="pl-4 pr-5 py-3 text-xs">
                      {item.onChainProof ? (
                        <div className="space-y-1">
                          <div className="flex items-center font-mono text-slate-700">
                            <span>{short(item.onChainProof.txHash)}</span>
                            <CopyButton text={item.onChainProof.txHash} />
                          </div>
                          <a
                            className="text-sky-600 hover:text-sky-700 underline underline-offset-2"
                            href={item.onChainProof.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on XRPL Explorer ↗
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400">Not yet settled on-chain.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function FundCardList({ funds }: { funds: FundGroup[] }) {
  return (
    <div className="space-y-3">
      {funds.map((group) => (
        <FundCard key={group.fund.id} group={group} />
      ))}
    </div>
  )
}
