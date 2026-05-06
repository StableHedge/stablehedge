import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { openTrustline } from '@stablehedge/xrpl-adapter'
import { decryptSeed } from '../apps/api/src/services/wallet-vault.js'

const prisma = new PrismaClient()
const RPC = process.env.XRPL_RPC_URL ?? 'wss://s.altnet.rippletest.net:51233'
const CURRENCY = process.env.TOKEN_CURRENCY_CODE ?? 'USD'

async function main() {
  const fundId = process.argv[2] ?? 'fund-redwood'
  const fund = await prisma.fund.findUniqueOrThrow({
    where: { id: fundId },
    include: {
      investments: { include: { investor: { include: { wallet: true } } } },
    },
  })

  for (const inv of fund.investments) {
    const w = inv.investor.wallet
    if (!w) {
      console.log(`Skip ${inv.investor.externalId}: no wallet on file`)
      continue
    }
    if (inv.trustlineStatus === 'ACTIVE') {
      console.log(`Skip ${inv.investor.externalId}: trustline already ACTIVE`)
      continue
    }

    const seed = decryptSeed(w.encryptedSeed)
    const result = await openTrustline({
      rpcUrl: RPC,
      holderSeed: seed,
      issuerAddress: fund.issuerAddress,
      currencyCode: CURRENCY,
      limit: '10000000',
    })
    await prisma.investment.update({
      where: { id: inv.id },
      data: { trustlineStatus: 'ACTIVE' },
    })
    console.log(`${inv.investor.externalId} trustline opened: ${result.txHash}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
