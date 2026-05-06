import { prisma } from '../db/client.js'

// Demo-fixed rate. FX feed integration planned — track via GitHub issues.
const FALLBACK_KRW_PER_USD = 1468

export async function getCurrentKrwPerUsd(): Promise<number> {
  const latest = await prisma.fxRate.findFirst({
    where: { base: 'KRW', quote: 'USD' },
    orderBy: { observedAt: 'desc' },
  })
  if (latest) return Number(latest.rate)
  return FALLBACK_KRW_PER_USD
}

export async function recordFxRate(rate: number, source = 'manual') {
  return prisma.fxRate.create({
    data: {
      base: 'KRW',
      quote: 'USD',
      rate,
      source,
      observedAt: new Date(),
    },
  })
}
