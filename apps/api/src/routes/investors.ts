import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { config } from '../config.js'
import type { PaymentStatus } from '@prisma/client'
import type {
  FundStatementGroupView,
  InvestorPortfolioFundSummaryView,
  InvestorPortfolioStatementView,
  InvestorStatementItemView,
  InvestorStatementsGroupedView,
  StatementStatus,
} from '@stablehedge/shared-types'

export const investorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', { schema: { tags: ['investors'], summary: 'List investors' } }, async () => {
    const list = await prisma.investor.findMany({ orderBy: { externalId: 'asc' } })
    return list.map((i) => ({
      id: i.id,
      externalId: i.externalId,
      name: i.name,
      walletAddress: i.walletAddress,
    }))
  })

  app.get(
    '/:investorId/statements',
    {
      schema: {
        tags: ['investors'],
        summary: 'Investor statements grouped by fund (period + fund optional)',
        params: z.object({ investorId: z.string() }),
        querystring: z.object({
          period: z.string().optional(),
          fundId: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const { investorId } = req.params
      const investor = await prisma.investor.findUniqueOrThrow({ where: { id: investorId } })
      const items = await loadStatementItems(investorId, req.query)

      const grouped = groupStatementsByFund(items)

      const view: InvestorStatementsGroupedView = {
        investor: {
          id: investor.id,
          externalId: investor.externalId,
          name: investor.name,
        },
        filters: {
          period: req.query.period,
          fundId: req.query.fundId,
        },
        fundCount: grouped.length,
        totalStatements: items.length,
        funds: grouped,
      }

      return view
    },
  )

  app.get(
    '/:investorId/portfolio-statement',
    {
      schema: {
        tags: ['investors'],
        summary: 'Investor portfolio statement across all funds',
        params: z.object({ investorId: z.string() }),
      },
    },
    async (req) => {
      const { investorId } = req.params
      const investor = await prisma.investor.findUniqueOrThrow({ where: { id: investorId } })
      const items = await loadStatementItems(investorId, {})

      const grouped = groupStatementsByFund(items)
      const fundSummaries: InvestorPortfolioFundSummaryView[] = grouped.map((group) => {
        const first = group.items[0]
        const beginningValueUsd = first?.beginningValueUsd ?? null
        const ownershipBp = first?.ownershipBp ?? null
        return {
          fund: group.fund,
          beginningValueUsd,
          currentOwnershipBp: ownershipBp,
          currentOwnershipPercent: ownershipBp === null ? null : (ownershipBp / 100).toFixed(2),
          totalDistributionsUsd: group.totalDistributedUsd,
          totalDistributionsKrw: group.totalDistributedKrw,
          statementCount: group.statementCount,
          latestReportingPeriod: group.latestReportingPeriod,
        }
      })

      const totalBeginningValueUsd = sumNullableStrings(
        fundSummaries.map((fund) => fund.beginningValueUsd),
      )
      const totalDistributionsUsd = sumStrings(fundSummaries.map((fund) => fund.totalDistributionsUsd))
      const totalDistributionsKrw = sumNullableStrings(
        fundSummaries.map((fund) => fund.totalDistributionsKrw),
      )
      const settledCount = items.filter((item) => item.status === 'Settled').length
      const pendingCount = items.filter((item) => item.status !== 'Settled').length

      const view: InvestorPortfolioStatementView = {
        investor: {
          id: investor.id,
          externalId: investor.externalId,
          name: investor.name,
          walletAddress: investor.walletAddress,
        },
        totals: {
          fundCount: fundSummaries.length,
          totalBeginningValueUsd,
          totalDistributionsUsd,
          totalDistributionsKrw,
          settledCount,
          pendingCount,
        },
        funds: fundSummaries,
      }

      return view
    },
  )
}

async function loadStatementItems(
  investorId: string,
  filters: { period?: string; fundId?: string },
): Promise<InvestorStatementItemView[]> {
  const items = await prisma.distributionItem.findMany({
    where: {
      investorId,
      ...(filters.period || filters.fundId
        ? {
            distribution: {
              ...(filters.period ? { period: filters.period } : {}),
              ...(filters.fundId ? { fundId: filters.fundId } : {}),
            },
          }
        : {}),
    },
    include: {
      investor: true,
      distribution: { include: { fund: { include: { token: true } } } },
    },
    orderBy: [{ distribution: { fundId: 'asc' } }, { createdAt: 'desc' }],
  })

  const investments = await prisma.investment.findMany({
    where: {
      investorId,
      fundId: { in: Array.from(new Set(items.map((it) => it.distribution.fundId))) },
    },
  })
  const investmentByFund = new Map(investments.map((iv) => [iv.fundId, iv] as const))

  return items.map((it) => {
    const investment = investmentByFund.get(it.distribution.fundId)
    const beginningValueUsd = investment?.beginningValueUsd?.toString() ?? null
    const distributionYield =
      investment && Number(investment.beginningValueUsd) > 0
        ? ((Number(it.amountUsd) / Number(investment.beginningValueUsd)) * 100).toFixed(2)
        : null

    return {
      id: it.id,
      investor: {
        id: it.investor.id,
        externalId: it.investor.externalId,
        name: it.investor.name,
      },
      deal: { id: it.distribution.fund.id, name: it.distribution.fund.name },
      reportingPeriod: it.distribution.period,
      beginningValueUsd,
      ownershipBp: it.ownershipBp,
      distributionAmount: {
        token: it.distribution.fund.token.displayLabel,
        value: it.amountUsd.toString(),
      },
      settlementMethod: 'XRPL issued stablecoin',
      walletAddress: it.investor.walletAddress,
      transactionHash: it.txHash,
      status: paymentStatusToStatement(it.paymentStatus),
      fxReferenceRate: it.distribution.fxReferenceRateKrwPerUsd?.toString() ?? null,
      krwEquivalent: it.amountKrw?.toString() ?? null,
      distributionYield,
      onChainProof: it.txHash
        ? {
            walletAddress: it.investor.walletAddress,
            tokenAmount: it.amountUsd.toString(),
            txHash: it.txHash,
            ledgerStatus:
              it.paymentStatus === 'VALIDATED' || it.paymentStatus === 'REFLECTED'
                ? 'Validated'
                : it.paymentStatus,
            ledgerIndex: it.ledgerIndex,
            timestampUtc: it.validatedAt?.toISOString() ?? null,
            explorerUrl: `${config.XRPL_EXPLORER_BASE}/transactions/${it.txHash}`,
          }
        : null,
      payoutSummary: {
        paidAmount: {
          token: it.distribution.fund.token.displayLabel,
          value: it.amountUsd.toString(),
        },
        krwEquivalent: it.amountKrw?.toString() ?? null,
      },
    }
  })
}

function groupStatementsByFund(items: InvestorStatementItemView[]): FundStatementGroupView[] {
  const grouped = new Map<string, FundStatementGroupView>()

  for (const item of items) {
    const key = item.deal.id
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        fund: item.deal,
        statementCount: 1,
        totalDistributedUsd: item.distributionAmount.value,
        totalDistributedKrw: item.krwEquivalent ?? null,
        latestReportingPeriod: item.reportingPeriod,
        items: [item],
      })
      continue
    }

    existing.statementCount += 1
    existing.totalDistributedUsd = sumStrings([existing.totalDistributedUsd, item.distributionAmount.value])
    existing.totalDistributedKrw = sumNullableStrings([existing.totalDistributedKrw, item.krwEquivalent])
    if (existing.latestReportingPeriod === null || item.reportingPeriod > existing.latestReportingPeriod) {
      existing.latestReportingPeriod = item.reportingPeriod
    }
    existing.items.push(item)
  }

  return Array.from(grouped.values())
}

function sumStrings(values: string[]): string {
  return values.reduce((sum, value) => sum + Number(value), 0).toString()
}

function sumNullableStrings(values: Array<string | null | undefined>): string | null {
  const present = values.filter((value): value is string => value !== null && value !== undefined)
  if (present.length === 0) return null
  return present.reduce((sum, value) => sum + Number(value), 0).toString()
}

function paymentStatusToStatement(s: PaymentStatus): StatementStatus {
  if (s === 'VALIDATED' || s === 'REFLECTED') return 'Settled'
  if (s === 'SUBMITTED') return 'Submitted'
  if (s === 'FAILED') return 'Failed'
  return 'Pending'
}
