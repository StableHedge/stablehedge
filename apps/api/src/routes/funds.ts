import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { config } from '../config.js'

export const fundRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', { schema: { tags: ['funds'], summary: 'List funds' } }, async () => {
    const funds = await prisma.fund.findMany({
      include: { token: true, _count: { select: { investments: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return funds.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      network: f.network,
      treasuryAddress: f.treasuryAddress,
      issuerAddress: f.issuerAddress,
      token: { currencyCode: f.token.currencyCode, displayLabel: f.token.displayLabel },
      totalIssued: f.totalIssued.toString(),
      investorCount: f._count.investments,
    }))
  })

  app.get(
    '/:fundId',
    {
      schema: {
        tags: ['funds'],
        summary: 'Get a fund with its investors',
        params: z.object({ fundId: z.string() }),
      },
    },
    async (req) => {
      const { fundId } = req.params
      const fund = await prisma.fund.findUniqueOrThrow({
        where: { id: fundId },
        include: {
          token: true,
          investments: { include: { investor: true }, orderBy: { ownershipBp: 'desc' } },
        },
      })

      return {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        network: fund.network,
        token: {
          currencyCode: fund.token.currencyCode,
          displayLabel: fund.token.displayLabel,
          issuerAddress: fund.token.issuerAddress,
        },
        treasuryAddress: fund.treasuryAddress,
        issuerAddress: fund.issuerAddress,
        totalIssued: fund.totalIssued.toString(),
        investorCount: fund.investments.length,
        explorerBase: config.XRPL_EXPLORER_BASE,
        investors: fund.investments.map((iv) => ({
          id: iv.investor.id,
          externalId: iv.investor.externalId,
          name: iv.investor.name,
          walletAddress: iv.investor.walletAddress,
          ownershipBp: iv.ownershipBp,
          ownershipPercent: (iv.ownershipBp / 100).toFixed(2),
          beginningValueUsd: iv.beginningValueUsd.toString(),
          trustlineStatus: iv.trustlineStatus,
        })),
      }
    },
  )
}
