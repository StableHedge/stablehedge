'use client'

import { useState } from 'react'
import { Download, Share2, Link, Check } from 'lucide-react'

export function HeaderActions() {
  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
        <Download size={13} />
        Download PDF
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
        <Share2 size={13} />
        Share
      </button>
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        {copied
          ? <Check size={13} className="text-emerald-500" />
          : <Link size={13} />
        }
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}
