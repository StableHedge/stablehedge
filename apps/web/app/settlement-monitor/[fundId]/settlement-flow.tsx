import { ClipboardCheck, Send, CircleCheck, FileCheck, CircleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type StepState = 'completed' | 'current' | 'upcoming' | 'failed'

const STATUS_ORDER = ['PREPARED', 'SUBMITTED', 'VALIDATED', 'REFLECTED'] as const
type StepKey = (typeof STATUS_ORDER)[number]

interface StepConfig {
  key: StepKey
  title: string
  Icon: LucideIcon
}

const STEPS: StepConfig[] = [
  { key: 'PREPARED',  title: 'Payment Prepared',    Icon: ClipboardCheck },
  { key: 'SUBMITTED', title: 'Submitted to XRPL',   Icon: Send           },
  { key: 'VALIDATED', title: 'Validated in Ledger', Icon: CircleCheck    },
  { key: 'REFLECTED', title: 'Reflected in Report', Icon: FileCheck      },
]

export function computeSettlementStepStates(status: string | null | undefined): StepState[] {
  if (!status) return STEPS.map(() => 'upcoming')
  if (status === 'FAILED') return STEPS.map(() => 'failed')

  const idx = STATUS_ORDER.indexOf(status as StepKey)
  if (idx === -1) return STEPS.map(() => 'upcoming')

  // REFLECTED is the terminal success state — all steps fully done
  if (status === 'REFLECTED') return STEPS.map(() => 'completed')

  return STEPS.map((_, i) => {
    if (i < idx) return 'completed'
    if (i === idx) return 'current'
    return 'upcoming'
  })
}

function iconWrapperClass(state: StepState): string {
  switch (state) {
    case 'completed': return 'bg-emerald-500 text-white'
    case 'current':   return 'bg-sky-500 text-white ring-4 ring-sky-100'
    case 'failed':    return 'bg-rose-500 text-white'
    case 'upcoming':  return 'bg-slate-100 text-slate-400'
  }
}

function titleClass(state: StepState): string {
  switch (state) {
    case 'completed': return 'text-slate-700'
    case 'current':   return 'text-sky-700 font-medium'
    case 'failed':    return 'text-rose-600 font-medium'
    case 'upcoming':  return 'text-slate-400'
  }
}

function badgeClass(state: StepState): string {
  switch (state) {
    case 'completed': return 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    case 'current':   return 'bg-sky-50 text-sky-600 border border-sky-100'
    case 'failed':    return 'bg-rose-50 text-rose-600 border border-rose-100'
    case 'upcoming':  return 'bg-slate-50 text-slate-400 border border-slate-100'
  }
}

function connectorClass(leftState: StepState): string {
  return leftState === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
}

// w-11 = 44px → radius 22px, used in connector offset calc
const ICON_HALF = 22

export function SettlementFlow({ status }: { status: string | null | undefined }) {
  const stepStates = computeSettlementStepStates(status)

  return (
    <div className="w-full">
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const state = stepStates[i]
          const Icon = state === 'failed' ? CircleAlert : step.Icon

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              {/* Icon + connector row */}
              <div className="relative flex w-full items-center justify-center h-11">
                {/* Left connector: from container left to this icon's left edge */}
                {i > 0 && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-[2px] left-0 ${connectorClass(stepStates[i - 1])}`}
                    style={{ right: `calc(50% + ${ICON_HALF}px)` }}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-shadow ${iconWrapperClass(state)}`}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>

                {/* Right connector: from this icon's right edge to container right */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-[2px] right-0 ${connectorClass(state)}`}
                    style={{ left: `calc(50% + ${ICON_HALF}px)` }}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="text-center mt-3 px-1.5">
                <p className={`text-sm leading-snug ${titleClass(state)}`}>
                  {step.title}
                </p>
                <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium mt-2 ${badgeClass(state)}`}>
                  {state === 'failed' ? 'Failed' : step.key}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status legend */}
      <div className="mt-8 pt-4 border-t flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Status Legend:</span>
        <LegendDot color="bg-emerald-500" label="Completed" />
        <LegendDot color="bg-sky-500"     label="Current"   />
        <LegendDot color="bg-slate-300"   label="Upcoming"  />
        <LegendDot color="bg-rose-500"    label="Failed"    />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${color}`} />
      {label}
    </span>
  )
}
