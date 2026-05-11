'use client'

import { PieChart, Pie, ResponsiveContainer, type PieLabelRenderProps } from 'recharts'

const COLORS = [
  '#0284C7', // sky-600
  '#38bdf8', // sky-400
  '#2dd4bf', // teal-400
  '#a78bfa', // violet-400
  '#818cf8', // indigo-400
  '#22d3ee', // cyan-400
]

const EMPTY_COLOR = '#F1F5F9' // slate-200
const MAX_VISIBLE = 6
const RADIAN = Math.PI / 180

interface InvestorBalance {
  investorId: string
  investorName: string
  balance: string
  percent: string
}

interface ChartEntry {
  name: string
  subLabel: string
  value: number
  displayPercent: number
  color: string
  fill: string
}

function buildChartData(balances: InvestorBalance[]): ChartEntry[] {
  const sorted = [...balances].sort((a, b) => Number(b.balance) - Number(a.balance))
  const total = sorted.reduce((sum, b) => sum + Number(b.balance), 0)

  const make = (b: InvestorBalance, i: number): ChartEntry => ({
    name: b.investorName,
    subLabel: b.investorId,
    value: Number(b.balance),
    displayPercent: total > 0 ? Number(b.percent) : 0,
    color: total > 0 ? COLORS[i % COLORS.length] : EMPTY_COLOR,
    fill: total > 0 ? COLORS[i % COLORS.length] : EMPTY_COLOR,
  })

  if (sorted.length <= MAX_VISIBLE || total === 0) {
    return sorted.map(make)
  }

  const top = sorted.slice(0, MAX_VISIBLE - 1)
  const rest = sorted.slice(MAX_VISIBLE - 1)
  const othersValue = rest.reduce((sum, b) => sum + Number(b.balance), 0)
  const othersColor = COLORS[(MAX_VISIBLE - 1) % COLORS.length]

  return [
    ...top.map(make),
    {
      name: 'Others',
      subLabel: `+${rest.length} investors`,
      value: othersValue,
      displayPercent: Math.round((othersValue / total) * 1000) / 10,
      color: othersColor,
      fill: othersColor,
    },
  ]
}

function PctLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props

  if (typeof cx !== 'number' || typeof cy !== 'number' || typeof midAngle !== 'number' ||
      typeof innerRadius !== 'number' || typeof outerRadius !== 'number' ||
      typeof percent !== 'number' || percent < 0.06) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

export function InvestorBalancesChart({ balances }: { balances: InvestorBalance[] }) {
  const hasInvestors = balances.length > 0
  const total = balances.reduce((sum, b) => sum + Number(b.balance), 0)
  const isZeroBalance = hasInvestors && total === 0
  const isEmpty = !hasInvestors || isZeroBalance

  const chartData = buildChartData(balances)

  const pieData = isEmpty ? [{ name: 'Empty', value: 1, fill: EMPTY_COLOR }] : chartData

  return (
    <div className="space-y-4">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
              paddingAngle={isEmpty ? 0 : 2}
              dataKey="value"
              stroke={isEmpty ? EMPTY_COLOR : 'white'}
              strokeWidth={isEmpty ? 0 : 2}
              labelLine={false}
              label={isEmpty ? false : PctLabel}
              isAnimationActive={!isEmpty}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {hasInvestors ? (
        <ul className="space-y-2.5">
          {chartData.map((entry) => (
            <li key={`${entry.name}-${entry.subLabel}`} className="flex items-center gap-3">
              <span
                className="shrink-0 w-7 h-7 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{entry.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{entry.subLabel}</p>
              </span>
              <span className="text-right shrink-0">
                <p className="text-sm font-medium tabular-nums text-slate-800">
                  {entry.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                  {entry.displayPercent}%
                </p>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center text-sm text-slate-400">
          No investor balances
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
