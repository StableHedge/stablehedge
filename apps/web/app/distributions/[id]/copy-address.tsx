'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-start gap-2 min-w-0">
      <p className="font-mono text-base font-bold text-slate-900 break-all leading-snug">
        {address}
      </p>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-slate-700 transition-colors"
        title="Copy address"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
