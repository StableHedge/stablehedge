'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export function ActionButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'calculate' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(action: 'calculate' | 'submit') {
    setError(null)
    setBusy(action)
    try {
      if (action === 'calculate') await api.calculateDistribution(id)
      else await api.submitDistribution(id)
      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const canCalculate = status === 'DRAFT' || status === 'READY'
  const canSubmit = status === 'READY'

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => run('calculate')}
          disabled={!canCalculate || busy !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
          {/* Calculator / grid icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <rect x="8" y="5" width="8" height="3" rx="0.5" />
            <path d="M8 11h.01M12 11h.01M16 11h.01" />
            <path d="M8 15h.01M12 15h.01M16 15h.01" />
            <path d="M8 19h.01M12 19h.01M16 19h.01" />
          </svg>
          {busy === 'calculate' ? 'Calculating...' : 'Calculate Distribution'}
        </button>

        <button
          onClick={() => run('submit')}
          disabled={!canSubmit || busy !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm disabled:opacity-50 hover:bg-teal-700 transition-colors"
        >
          {/* Paper plane / send icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
          {busy === 'submit' ? 'Submitting to XRPL...' : 'Submit XRPL Payment'}
        </button>
      </div>
      {isPending && <div className="text-xs text-slate-500">Refreshing...</div>}
      {error && <div className="text-xs text-rose-600 max-w-md">{error}</div>}
    </div>
  )
}
