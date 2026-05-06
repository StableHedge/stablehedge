// DTOs aligned with Figma screens.
// 1) Deal Distribution Dashboard
// 2) XRPL Settlement Monitor
// 3) Investor Statement

export type DistributionStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'SETTLED' | 'FAILED'
export type PaymentStatus = 'PREPARED' | 'SUBMITTED' | 'VALIDATED' | 'REFLECTED' | 'FAILED'
export type TrustlineStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'REVOKED'

export interface TokenView {
  currencyCode: string
  displayLabel: string
  issuerAddress?: string
}

// =============== Deal Distribution Dashboard ===============

export interface DealDistributionView {
  id: string
  fund: {
    id: string
    name: string
    network: string
    treasuryAddress: string
    token: TokenView
  }
  period: string
  status: DistributionStatus
  totalDistributableUsd: string
  fxReferenceRateKrwPerUsd?: string | null
  calculatedAt?: string | null
  submittedAt?: string | null
  settledAt?: string | null
  items: InvestorDistributionItem[]
  explorerBase: string
}

export interface InvestorDistributionItem {
  id: string
  investor: {
    id: string
    externalId: string
    name: string
    walletAddress: string
  }
  ownershipBp: number
  ownershipPercent: string
  amountUsd: string
  amountKrw?: string | null
  trustlineStatus: TrustlineStatus
  paymentStatus: PaymentStatus
  txHash?: string | null
  ledgerIndex?: number | null
  validatedAt?: string | null
  explorerUrl?: string | null
}

// =============== XRPL Settlement Monitor ===============

export interface SettlementMonitorView {
  fund: { id: string; name: string; network: string }
  treasuryWallet: string
  issuerWallet: string
  token: TokenView
  summary: {
    totalIssued: string
    treasuryBalance: string
    investorBalancesTotal: string
    latestTransactionStatus: { status: string; ledgerIndex?: number | null } | null
  }
  treasuryBalanceCard: {
    beforePayout: string
    afterPayout: string
    change: string
    changePercent: string
  }
  investorBalances: Array<{
    investorId: string
    investorName: string
    balance: string
    percent: string
  }>
  recentTransactions: Array<{
    txHash: string
    amount?: string | null
    status: string
    ledgerIndex?: number | null
    timestampUtc?: string | null
    explorerUrl: string
  }>
  pagination: { page: number; pageSize: number; total: number }
}

// =============== Investor Statement / Portfolio ===============

export type StatementStatus = 'Settled' | 'Submitted' | 'Failed' | 'Pending'

export interface InvestorStatementItemView {
  id: string
  investor: { id: string; externalId: string; name: string }
  deal: { id: string; name: string }
  reportingPeriod: string
  beginningValueUsd: string | null
  ownershipBp: number
  distributionAmount: { token: string; value: string }
  settlementMethod: string
  walletAddress: string
  transactionHash: string | null
  status: StatementStatus
  fxReferenceRate?: string | null
  krwEquivalent?: string | null
  distributionYield: string | null
  onChainProof: {
    walletAddress: string
    tokenAmount: string
    txHash: string
    ledgerStatus: string
    ledgerIndex?: number | null
    timestampUtc?: string | null
    explorerUrl: string
  } | null
  payoutSummary: {
    paidAmount: { token: string; value: string }
    krwEquivalent?: string | null
  }
}

export interface FundStatementGroupView {
  fund: { id: string; name: string }
  statementCount: number
  totalDistributedUsd: string
  totalDistributedKrw: string | null
  latestReportingPeriod: string | null
  items: InvestorStatementItemView[]
}

export interface InvestorStatementsGroupedView {
  investor: { id: string; externalId: string; name: string }
  filters: { period?: string; fundId?: string }
  fundCount: number
  totalStatements: number
  funds: FundStatementGroupView[]
}

export interface InvestorPortfolioFundSummaryView {
  fund: { id: string; name: string }
  beginningValueUsd: string | null
  currentOwnershipBp: number | null
  currentOwnershipPercent: string | null
  totalDistributionsUsd: string
  totalDistributionsKrw: string | null
  statementCount: number
  latestReportingPeriod: string | null
}

export interface InvestorPortfolioStatementView {
  investor: { id: string; externalId: string; name: string; walletAddress: string }
  totals: {
    fundCount: number
    totalBeginningValueUsd: string | null
    totalDistributionsUsd: string
    totalDistributionsKrw: string | null
    settledCount: number
    pendingCount: number
  }
  funds: InvestorPortfolioFundSummaryView[]
}
