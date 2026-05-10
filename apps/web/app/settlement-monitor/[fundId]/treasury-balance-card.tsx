import { ArrowDown, Landmark } from 'lucide-react'

interface TreasuryBalanceCardProps {
  token: string
  beforePayout: string
  afterPayout: string
  change: string
  changePercent: string
}

function fmt(n: string): string {
  return Number(n).toLocaleString()
}

export function TreasuryBalanceCard({
  token,
  beforePayout,
  afterPayout,
  change,
  changePercent,
}: TreasuryBalanceCardProps) {
  const isNegative = Number(change) < 0
  const amountColor  = isNegative ? 'text-rose-600'  : 'text-emerald-600'
  const percentColor = isNegative ? 'text-rose-400'  : 'text-emerald-400'

  return (
    <div className="h-[280px] bg-white rounded-xl border border-slate-100 shadow-sm p-6 relative overflow-hidden">
      {/* Ghost background icon */}
      <Landmark
        size={76}
        strokeWidth={2}
        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-100 pointer-events-none select-none"
      />

      <div className="relative">
        <p className="text-sm font-semibold text-slate-700">
          Treasury Balance{' '}
          <span className="font-normal text-slate-400 text-xs">({token})</span>
        </p>

        <div className="mt-4">
          {/* Before Payout */}
          <div>
            <p className="text-xs text-slate-500 tracking-wide">Before Payout</p>
            <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums leading-none">
              {fmt(beforePayout)}
            </p>
          </div>

          {/* Dashed connector + arrow */}
          <div className="py-4">
            <div className="relative my-4 w-[68%] border-t border-dashed border-slate-300">
              <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
                <ArrowDown className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* After Payout */}
          <div>
            <p className="text-xs text-slate-500 tracking-wide">After Payout</p>
            <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums leading-none">
              {fmt(afterPayout)}
            </p>
          </div>
        </div>

        {/* Change row */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Change</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-sm font-semibold tabular-nums ${amountColor}`}>
              {fmt(change)}
            </span>
            <span className={`text-xs font-medium ${percentColor}`}>
              ({changePercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
