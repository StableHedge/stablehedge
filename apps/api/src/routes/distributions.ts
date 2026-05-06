import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { config } from '../config.js'
import {
  calculateDistribution,
  submitDistribution,
} from '../services/distribution-engine.js'
import { getCurrentKrwPerUsd } from '../services/fx-service.js'

export const distributionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/',
    {
      schema: {
        tags: ['distributions'],
        summary: 'Create a draft distribution',
        body: z.object({
          fundId: z.string(),
          period: z.string(),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          totalDistributableUsd: z.string(),
          fxReferenceRateKrwPerUsd: z.string().optional(),
          notes: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const body = req.body
      const fxRate = body.fxReferenceRateKrwPerUsd ?? String(await getCurrentKrwPerUsd())
      const created = await prisma.distribution.create({
        data: {
          fundId: body.fundId,
          period: body.period,
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
          totalDistributableUsd: body.totalDistributableUsd,
          fxReferenceRateKrwPerUsd: fxRate,
          notes: body.notes,
          status: 'DRAFT',
        },
      })
      return { id: created.id, status: created.status }
    },
  )

  app.get(
    '/',
    {
      schema: {
        tags: ['distributions'],
        summary: 'List distributions',
        querystring: z.object({ fundId: z.string().optional() }),
      },
    },
    async (req) => {
      const where = req.query.fundId ? { fundId: req.query.fundId } : {}
      const list = await prisma.distribution.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        include: { _count: { select: { items: true } } },
      })
      return list.map((d) => ({
        id: d.id,
        fundId: d.fundId,
        period: d.period,
        status: d.status,
        totalDistributableUsd: d.totalDistributableUsd.toString(),
        fxReferenceRateKrwPerUsd: d.fxReferenceRateKrwPerUsd?.toString() ?? null,
        itemCount: d._count.items,
        calculatedAt: d.calculatedAt,
        submittedAt: d.submittedAt,
        settledAt: d.settledAt,
      }))
    },
  )

  // Deal Distribution Dashboard payload
  app.get(
    '/:id',
    {
      schema: {
        tags: ['distributions'],
        params: z.object({ id: z.string() }),
      },
    },
    async (req) => {
      const dist = await prisma.distribution.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          fund: { include: { token: true } },
          items: {
            include: { investor: true },
            orderBy: { ownershipBp: 'desc' },
          },
        },
      })

      const investments = await prisma.investment.findMany({
        where: {
          fundId: dist.fundId,
          investorId: { in: dist.items.map((it) => it.investorId) },
        },
      })
      const trustlineByInvestor = new Map(
        investments.map((iv) => [iv.investorId, iv.trustlineStatus] as const),
      )

      return {
        id: dist.id,
        fund: {
          id: dist.fund.id,
          name: dist.fund.name,
          network: dist.fund.network,
          treasuryAddress: dist.fund.treasuryAddress,
          token: {
            currencyCode: dist.fund.token.currencyCode,
            displayLabel: dist.fund.token.displayLabel,
            issuerAddress: dist.fund.token.issuerAddress,
          },
        },
        period: dist.period,
        status: dist.status,
        totalDistributableUsd: dist.totalDistributableUsd.toString(),
        fxReferenceRateKrwPerUsd: dist.fxReferenceRateKrwPerUsd?.toString() ?? null,
        calculatedAt: dist.calculatedAt,
        submittedAt: dist.submittedAt,
        settledAt: dist.settledAt,
        items: dist.items.map((it) => ({
          id: it.id,
          investor: {
            id: it.investor.id,
            externalId: it.investor.externalId,
            name: it.investor.name,
            walletAddress: it.investor.walletAddress,
          },
          ownershipBp: it.ownershipBp,
          ownershipPercent: (it.ownershipBp / 100).toFixed(2),
          amountUsd: it.amountUsd.toString(),
          amountKrw: it.amountKrw?.toString() ?? null,
          trustlineStatus: trustlineByInvestor.get(it.investorId) ?? 'PENDING',
          paymentStatus: it.paymentStatus,
          txHash: it.txHash,
          ledgerIndex: it.ledgerIndex,
          validatedAt: it.validatedAt,
          explorerUrl: it.txHash
            ? `${config.XRPL_EXPLORER_BASE}/transactions/${it.txHash}`
            : null,
        })),
        explorerBase: config.XRPL_EXPLORER_BASE,
      }
    },
  )

  // "Calculate Distribution" button
  app.post(
    '/:id/calculate',
    {
      schema: {
        tags: ['distributions'],
        params: z.object({ id: z.string() }),
      },
    },
    async (req) => {
      const result = await calculateDistribution(req.params.id)
      return {
        id: result.id,
        status: result.status,
        itemCount: result.items.length,
        calculatedAt: result.calculatedAt,
      }
    },
  )

  // "Submit XRPL Payment" button — actually touches XRPL Testnet
  app.post(
    '/:id/submit',
    {
      schema: {
        tags: ['distributions'],
        params: z.object({ id: z.string() }),
      },
    },
    async (req) => {
      const result = await submitDistribution(req.params.id)
      const items = result.items
      return {
        id: result.id,
        status: result.status,
        itemCount: items.length,
        submittedAt: result.submittedAt,
        settledAt: result.settledAt,
        items: items.map((it) => ({
          id: it.id,
          investorExternalId: it.investor.externalId,
          paymentStatus: it.paymentStatus,
          txHash: it.txHash,
          ledgerIndex: it.ledgerIndex,
          failureReason: it.failureReason,
          explorerUrl: it.txHash
            ? `${config.XRPL_EXPLORER_BASE}/transactions/${it.txHash}`
            : null,
        })),
      }
    },
  )
}
