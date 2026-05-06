import type {
  DealDistributionView,
  InvestorPortfolioStatementView,
  SettlementMonitorView,
  InvestorStatementsGroupedView,
} from '@stablehedge/shared-types'

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`POST ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export interface FundSummary {
  id: string
  name: string
  description: string | null
  network: string
  treasuryAddress: string
  issuerAddress: string
  token: { currencyCode: string; displayLabel: string }
  totalIssued: string
  investorCount: number
}

export interface DistributionListItem {
  id: string
  fundId: string
  period: string
  status: string
  totalDistributableUsd: string
  fxReferenceRateKrwPerUsd: string | null
  itemCount: number
}

export interface InvestorListItem {
  id: string
  externalId: string
  name: string
  walletAddress: string
}

export const api = {
  funds: () => get<FundSummary[]>('/api/funds'),
  fund: (id: string) => get<FundSummary & { explorerBase: string }>(`/api/funds/${id}`),

  distributions: (fundId?: string) =>
    get<DistributionListItem[]>(`/api/distributions${fundId ? `?fundId=${fundId}` : ''}`),
  distribution: (id: string) => get<DealDistributionView>(`/api/distributions/${id}`),
  createDistribution: (body: {
    fundId: string
    period: string
    periodStart: string
    periodEnd: string
    totalDistributableUsd: string
    fxReferenceRateKrwPerUsd?: string
  }) => post<{ id: string; status: string }>('/api/distributions', body),
  calculateDistribution: (id: string) =>
    post<{ id: string; status: string; itemCount: number }>(
      `/api/distributions/${id}/calculate`,
    ),
  submitDistribution: (id: string) =>
    post<{ id: string; status: string; itemCount: number; items: Array<{ id: string; investorExternalId: string; paymentStatus: string; txHash: string | null; explorerUrl: string | null }> }>(
      `/api/distributions/${id}/submit`,
    ),

  settlementMonitor: (fundId: string, page = 1, pageSize = 5) =>
    get<SettlementMonitorView>(
      `/api/settlement-monitor/funds/${fundId}?page=${page}&pageSize=${pageSize}`,
    ),

  investors: () => get<InvestorListItem[]>('/api/investors'),
  investorStatements: (investorId: string, params: { period?: string; fundId?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.period) qs.set('period', params.period)
    if (params.fundId) qs.set('fundId', params.fundId)
    const q = qs.toString()
    return get<InvestorStatementsGroupedView>(
      `/api/investors/${investorId}/statements${q ? `?${q}` : ''}`,
    )
  },
  investorPortfolioStatement: (investorId: string) =>
    get<InvestorPortfolioStatementView>(`/api/investors/${investorId}/portfolio-statement`),
}
