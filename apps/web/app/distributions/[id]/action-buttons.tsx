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
          className="px-4 py-2 rounded bg-slate-800 text-white text-sm disabled:opacity-50"
        >
          {busy === 'calculate' ? 'Calculating...' : 'Calculate Distribution'}
        </button>
        <button
          onClick={() => run('submit')}
          disabled={!canSubmit || busy !== null}
          className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
        >
          {busy === 'submit' ? 'Submitting to XRPL...' : 'Submit XRPL Payment'}
        </button>
      </div>
      {isPending && <div className="text-xs text-slate-500">Refreshing...</div>}
      {error && <div className="text-xs text-rose-600 max-w-md">{error}</div>}
    </div>
  )
}
