'use client'

import { useRouter } from 'next/navigation'

interface PeriodOption {
  id: string
  period: string
  status: string
}

export function PeriodSelector({
  options,
  currentId,
}: {
  options: PeriodOption[]
  currentId: string
}) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 text-sm">
      <svg
        className="w-4 h-4 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span className="text-slate-500">Period</span>
      <select
        value={currentId}
        onChange={(e) => router.push(`/distributions/${e.target.value}`)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.period}
          </option>
        ))}
      </select>
    </div>
  )
}
