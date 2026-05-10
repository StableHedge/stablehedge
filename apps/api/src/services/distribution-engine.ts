import { Prisma } from '@prisma/client'
import {
  getTrustlineBalance,
  submitDistributionPayments,
  type DistributionPayment,
} from '@stablehedge/xrpl-adapter'
import { prisma } from '../db/client.js'
import { config } from '../config.js'
import { decryptSeed } from './wallet-vault.js'
import {
  computeDistributionAmounts,
  parseDestinationTagFromExternalId,
} from './distribution-math.js'

const D = (n: Prisma.Decimal | number | string) => new Prisma.Decimal(n)

export interface DistributionFundingStatus {
  totalRequiredUsd: string
  treasuryBalanceUsd: string
  shortfallUsd: string
  readyToSubmit: boolean
  trustlineExists: boolean
}

/**
 * Reads the distribution items + Treasury trustline balance and decides
 * whether Submit can run safely. Used by:
 *   - GET /api/distributions/:id  (UI shows badge)
 *   - POST /api/distributions/:id/calculate  (response hint)
 *   - POST /api/distributions/:id/submit  (hard guard)
 */
export async function getDistributionFundingStatus(
  distributionId: string,
): Promise<DistributionFundingStatus> {
  const dist = await prisma.distribution.findUniqueOrThrow({
    where: { id: distributionId },
    include: {
      fund: { include: { token: true } },
      items: true,
    },
  })

  const totalRequired = dist.items.reduce(
    (sum, it) => sum.add(D(it.amountUsd)),
    D(0),
  )

  if (totalRequired.eq(0)) {
    return {
      totalRequiredUsd: '0',
      treasuryBalanceUsd: '0',
      shortfallUsd: '0',
      readyToSubmit: false,
      trustlineExists: false,
    }
  }

  const trustline = await getTrustlineBalance({
    rpcUrl: config.XRPL_RPC_URL,
    holderAddress: dist.fund.treasuryAddress,
    issuerAddress: dist.fund.issuerAddress,
    currencyCode: dist.fund.token.currencyCode,
  })

  const balance = D(trustline.balance)
  const shortfall = totalRequired.sub(balance)
  const shortfallPositive = shortfall.gt(0) ? shortfall : D(0)

  return {
    totalRequiredUsd: totalRequired.toString(),
    treasuryBalanceUsd: balance.toString(),
    shortfallUsd: shortfallPositive.toString(),
    readyToSubmit: trustline.exists && shortfall.lte(0),
    trustlineExists: trustline.exists,
  }
}

/**
 * Backs the "Calculate Distribution" button in Deal Distribution Dashboard.
 *  - Reads investments for the fund
 *  - Computes amountUsd = totalDistributableUsd × ownershipBp / 10000
 *  - Computes amountKrw = amountUsd × fxReferenceRate (when set)
 *  - Replaces existing items
 *  - Marks Distribution as READY
 */
export async function calculateDistribution(distributionId: string) {
  const dist = await prisma.distribution.findUniqueOrThrow({
    where: { id: distributionId },
    include: {
      fund: {
        include: {
          investments: { include: { investor: true } },
        },
      },
    },
  })

  if (dist.status === 'SUBMITTED' || dist.status === 'SETTLED') {
    throw new Error(`Cannot recalculate distribution in status ${dist.status}`)
  }

  const items = computeDistributionAmounts(
    dist.totalDistributableUsd,
    dist.fund.investments.map((iv) => ({
      investorId: iv.investorId,
      ownershipBp: iv.ownershipBp,
    })),
    dist.fxReferenceRateKrwPerUsd ?? null,
  )

  await prisma.$transaction(async (tx) => {
    await tx.distributionItem.deleteMany({ where: { distributionId } })
    await tx.distributionItem.createMany({
      data: items.map((it) => ({
        distributionId,
        investorId: it.investorId,
        ownershipBp: it.ownershipBp,
        amountUsd: it.amountUsd,
        amountKrw: it.amountKrw,
        paymentStatus: 'PREPARED' as const,
      })),
    })
    await tx.distribution.update({
      where: { id: distributionId },
      data: { status: 'READY', calculatedAt: new Date() },
    })
  })

  return prisma.distribution.findUniqueOrThrow({
    where: { id: distributionId },
    include: { items: { include: { investor: true } } },
  })
}

/**
 * Backs the "Submit XRPL Payment" button in Deal Distribution Dashboard.
 * THIS is the only action that touches XRPL Testnet.
 *  - Loads the distribution + items + fund/treasury wallet
 *  - Decrypts treasury seed
 *  - For each item, submits a Payment of the issued currency to the investor
 *  - Updates DistributionItem.paymentStatus and txHash as it progresses
 *  - Aggregates result: SETTLED if all VALIDATED, FAILED if any FAILED
 */
export async function submitDistribution(distributionId: string) {
  const dist = await prisma.distribution.findUniqueOrThrow({
    where: { id: distributionId },
    include: {
      fund: {
        include: { token: true, treasuryWallet: true },
      },
      items: { include: { investor: true } },
    },
  })

  if (dist.status !== 'READY') {
    throw new Error(`Cannot submit distribution in status ${dist.status}; expected READY`)
  }
  if (!dist.fund.treasuryWallet) {
    throw new Error('Fund has no treasury wallet configured')
  }
  if (dist.items.length === 0) {
    throw new Error('Distribution has no items; run /calculate first')
  }

  const funding = await getDistributionFundingStatus(distributionId)
  if (!funding.trustlineExists) {
    throw new Error('Treasury trustline missing; run setup-issuer first')
  }
  if (!funding.readyToSubmit) {
    throw new Error(
      `Treasury balance ${funding.treasuryBalanceUsd} is below required ${funding.totalRequiredUsd}; fund treasury with ${funding.shortfallUsd} more before submitting`,
    )
  }

  const treasurySeed = decryptSeed(dist.fund.treasuryWallet.encryptedSeed)

  const itemById = new Map(dist.items.map((it) => [it.id, it]))
  const payments: DistributionPayment[] = dist.items.map((item) => ({
    distributionItemId: item.id,
    investorAddress: item.investor.walletAddress,
    investorExternalId: item.investor.externalId,
    amountValue: item.amountUsd.toString(),
    destinationTag: parseDestinationTagFromExternalId(item.investor.externalId),
  }))

  await prisma.distribution.update({
    where: { id: distributionId },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  const results = await submitDistributionPayments({
    rpcUrl: config.XRPL_RPC_URL,
    treasurySeed,
    issuerAddress: dist.fund.issuerAddress,
    currencyCode: dist.fund.token.currencyCode,
    payments,
    memo: { period: dist.period, fundId: dist.fundId, distributionId: dist.id },
    onSubmitted: async ({ distributionItemId, txHash }) => {
      const item = itemById.get(distributionItemId)
      if (!item) return
      await prisma.$transaction([
        prisma.distributionItem.update({
          where: { id: distributionItemId },
          data: { txHash, paymentStatus: 'SUBMITTED' },
        }),
        prisma.xrplTransaction.upsert({
          where: { txHash },
          create: {
            txHash,
            txType: 'Payment',
            fundId: dist.fundId,
            distributionId: dist.id,
            status: 'SUBMITTED',
            amount: item.amountUsd,
            currencyCode: dist.fund.token.currencyCode,
            fromAddress: dist.fund.treasuryAddress,
            toAddress: item.investor.walletAddress,
          },
          update: { status: 'SUBMITTED' },
        }),
      ])
    },
  })

  for (const r of results) {
    const item = itemById.get(r.distributionItemId)
    if (!item) continue
    await prisma.distributionItem.update({
      where: { id: r.distributionItemId },
      data: {
        paymentStatus: r.status,
        txHash: r.txHash ?? item.txHash,
        ledgerIndex: r.ledgerIndex ?? item.ledgerIndex,
        validatedAt: r.status === 'VALIDATED' ? new Date() : item.validatedAt,
        failureReason: r.failureReason ?? null,
      },
    })

    if (r.txHash) {
      await prisma.xrplTransaction.upsert({
        where: { txHash: r.txHash },
        create: {
          txHash: r.txHash,
          txType: 'Payment',
          fundId: dist.fundId,
          distributionId: dist.id,
          status: r.status,
          ledgerIndex: r.ledgerIndex,
          amount: item.amountUsd,
          currencyCode: dist.fund.token.currencyCode,
          fromAddress: dist.fund.treasuryAddress,
          toAddress: item.investor.walletAddress,
          validatedAt: r.status === 'VALIDATED' ? new Date() : null,
          failureReason: r.failureReason,
        },
        update: {
          status: r.status,
          ledgerIndex: r.ledgerIndex,
          validatedAt: r.status === 'VALIDATED' ? new Date() : null,
          failureReason: r.failureReason,
        },
      })
    }
  }

  const failed = results.filter((r) => r.status === 'FAILED')
  if (failed.length === 0) {
    await prisma.distribution.update({
      where: { id: distributionId },
      data: { status: 'SETTLED', settledAt: new Date() },
    })
  } else {
    await prisma.distribution.update({
      where: { id: distributionId },
      data: { status: 'FAILED', failedAt: new Date() },
    })
  }

  return prisma.distribution.findUniqueOrThrow({
    where: { id: distributionId },
    include: { items: { include: { investor: true } } },
  })
}

