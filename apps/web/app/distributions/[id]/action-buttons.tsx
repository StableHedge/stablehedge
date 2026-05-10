'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function ConfirmModal({
  investorCount,
  totalAmount,
  tokenLabel,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  investorCount: number
  totalAmount: number
  tokenLabel: string
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSubmitting) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isSubmitting, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={!isSubmitting ? onCancel : undefined}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-teal-50 flex items-center justify-center">
              {/* Send icon */}
              <svg
                className="w-4.5 h-4.5 text-teal-600"
                style={{ width: '18px', height: '18px' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </span>
            <div>
              <h3
                id="confirm-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                Submit XRPL Payment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review the details before broadcasting to the network.
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Investor Count</span>
            <span className="font-medium text-slate-900">{investorCount} investors</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Total Payout Amount</span>
            <span className="font-medium text-slate-900 tabular-nums">
              {totalAmount.toLocaleString()}{' '}
              <span className="text-slate-400 font-normal">{tokenLabel}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Network</span>
            <span className="font-medium text-slate-900">XRPL Testnet</span>
          </div>
        </div>

        {/* Warning */}
        <div className="mx-6 mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <svg
            className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            Once submitted, transactions will be broadcast to XRPL and cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                Submitting to XRPL...
              </>
            ) : (
              'Confirm & Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ActionButtons({
  id,
  status,
  investorCount,
  totalAmount,
  tokenLabel,
}: {
  id: string
  status: string
  investorCount: number
  totalAmount: number
  tokenLabel: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'calculate' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function calculate() {
    setError(null)
    setBusy('calculate')
    try {
      await api.calculateDistribution(id)
      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    setError(null)
    setBusy('submit')
    try {
      await api.submitDistribution(id)
      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      setShowConfirm(false)
    }
  }

  const canCalculate = status === 'DRAFT' || status === 'READY'
  const canSubmit = status === 'READY'

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          investorCount={investorCount}
          totalAmount={totalAmount}
          tokenLabel={tokenLabel}
          isSubmitting={busy === 'submit'}
          onCancel={() => setShowConfirm(false)}
          onConfirm={submit}
        />
      )}

      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={calculate}
            disabled={!canCalculate || busy !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50 hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {busy === 'calculate' ? (
              <Spinner />
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <rect x="8" y="5" width="8" height="3" rx="0.5" />
                <path d="M8 11h.01M12 11h.01M16 11h.01" />
                <path d="M8 15h.01M12 15h.01M16 15h.01" />
                <path d="M8 19h.01M12 19h.01M16 19h.01" />
              </svg>
            )}
            {busy === 'calculate' ? 'Calculating...' : 'Calculate Distribution'}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit || busy !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm disabled:opacity-50 hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
            Submit XRPL Payment
          </button>
        </div>
        
        <div className="min-h-4 text-xs">
          {isPending && <p className="text-xs text-slate-500">Refreshing...</p>}
          {error && <p className="text-xs text-rose-600 max-w-md">{error}</p>}
        </div>
      </div>
    </>
  )
}
