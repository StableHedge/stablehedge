import { Prisma } from '@prisma/client'

const D = (n: Prisma.Decimal | number | string) => new Prisma.Decimal(n)
const BASIS_POINTS = D(10000)

export interface ComputeAmountsInvestment {
  investorId: string
  ownershipBp: number
}

export interface ComputeAmountsResult {
  investorId: string
  ownershipBp: number
  amountUsd: Prisma.Decimal
  amountKrw: Prisma.Decimal | null
}

/**
 * Pure helper: distributes a total USD amount across investments by ownership basis points.
 * `amountKrw` is computed when `fxRate` is provided.
 */
export function computeDistributionAmounts(
  totalUsd: Prisma.Decimal | string | number,
  investments: ComputeAmountsInvestment[],
  fxRate: Prisma.Decimal | string | number | null,
): ComputeAmountsResult[] {
  const total = D(totalUsd)
  const fx = fxRate != null ? D(fxRate) : null
  return investments.map((inv) => {
    const amountUsd = total.mul(D(inv.ownershipBp)).div(BASIS_POINTS)
    return {
      investorId: inv.investorId,
      ownershipBp: inv.ownershipBp,
      amountUsd,
      amountKrw: fx ? amountUsd.mul(fx) : null,
    }
  })
}

/** "INV-0001" → 1 (used as XRPL DestinationTag for audit). */
export function parseDestinationTagFromExternalId(externalId: string): number | undefined {
  const m = externalId.match(/(\d+)$/)
  if (!m || !m[1]) return undefined
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : undefined
}
