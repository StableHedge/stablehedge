import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { config } from '../config.js'

export const settlementMonitorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/funds/:fundId',
    {
      schema: {
        tags: ['settlement-monitor'],
        summary: 'Settlement Monitor view (treasury, balances, recent transactions)',
        params: z.object({ fundId: z.string() }),
        querystring: z.object({
          page: z.coerce.number().default(1),
          pageSize: z.coerce.number().default(5),
        }),
      },
    },
    async (req) => {
      const { fundId } = req.params
      const { page, pageSize } = req.query

      const fund = await prisma.fund.findUniqueOrThrow({
        where: { id: fundId },
        include: { token: true },
      })

      const investments = await prisma.investment.findMany({
        where: { fundId },
        include: { investor: true },
        orderBy: { ownershipBp: 'desc' },
      })

      // Settled distribution items act as a lightweight proxy for "investor balance"
      // until we add a dedicated balance ledger. Sum of validated amounts per investor.
      const settledItems = await prisma.distributionItem.findMany({
        where: {
          distribution: { fundId },
          paymentStatus: { in: ['VALIDATED', 'REFLECTED'] },
        },
        select: { investorId: true, amountUsd: true },
      })

      const balanceByInvestor = new Map<string, number>()
      for (const it of settledItems) {
        balanceByInvestor.set(
          it.investorId,
          (balanceByInvestor.get(it.investorId) ?? 0) + Number(it.amountUsd),
        )
      }
      const investorBalancesTotal = Array.from(balanceByInvestor.values()).reduce(
        (a, b) => a + b,
        0,
      )

      const totalIssued = Number(fund.totalIssued)
      const treasuryBalance = totalIssued - investorBalancesTotal

      const txs = await prisma.xrplTransaction.findMany({
        where: { fundId },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
      const txTotal = await prisma.xrplTransaction.count({ where: { fundId } })
      const latestTx = txs[0]
      const latestTxAmount = latestTx?.amount ? Number(latestTx.amount) : 0
      const beforePayout = treasuryBalance + latestTxAmount
      const change = treasuryBalance - beforePayout
      const changePercent =
        beforePayout > 0 ? ((change / beforePayout) * 100).toFixed(2) : '0.00'

      return {
        fund: { id: fund.id, name: fund.name, network: fund.network },
        treasuryWallet: fund.treasuryAddress,
        issuerWallet: fund.issuerAddress,
        token: {
          currencyCode: fund.token.currencyCode,
          displayLabel: fund.token.displayLabel,
        },
        summary: {
          totalIssued: totalIssued.toFixed(2),
          treasuryBalance: treasuryBalance.toFixed(2),
          investorBalancesTotal: investorBalancesTotal.toFixed(2),
          latestTransactionStatus: latestTx
            ? { status: latestTx.status, ledgerIndex: latestTx.ledgerIndex ?? null }
            : null,
        },
        treasuryBalanceCard: {
          beforePayout: beforePayout.toFixed(2),
          afterPayout: treasuryBalance.toFixed(2),
          change: change.toFixed(2),
          changePercent,
        },
        investorBalances: investments.map((iv) => {
          const bal = balanceByInvestor.get(iv.investorId) ?? 0
          const percent =
            investorBalancesTotal > 0 ? ((bal / investorBalancesTotal) * 100).toFixed(2) : '0.00'
          return {
            investorId: iv.investor.externalId,
            investorName: iv.investor.name,
            balance: bal.toFixed(2),
            percent,
          }
        }),
        recentTransactions: txs.map((t) => ({
          txHash: t.txHash,
          amount: t.amount?.toString() ?? null,
          status: t.status,
          ledgerIndex: t.ledgerIndex ?? null,
          timestampUtc: t.validatedAt ?? t.submittedAt,
          explorerUrl: `${config.XRPL_EXPLORER_BASE}/transactions/${t.txHash}`,
        })),
        pagination: { page, pageSize, total: txTotal },
      }
    },
  )
}
