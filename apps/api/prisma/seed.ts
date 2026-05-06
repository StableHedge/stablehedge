import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import { Client, Wallet } from 'xrpl'
import { encryptSeed } from '../src/services/wallet-vault.js'

const prisma = new PrismaClient()
const RPC = process.env.XRPL_RPC_URL ?? 'wss://s.altnet.rippletest.net:51233'

async function fundWallet(): Promise<Wallet> {
  const client = new Client(RPC)
  await client.connect()
  const { wallet } = await client.fundWallet()
  await client.disconnect()
  return wallet
}

async function ensureTreasuryWallet(fundId: string, label: string, network: string) {
  const existingFund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: { treasuryWallet: true },
  })
  if (existingFund?.treasuryWallet) return existingFund.treasuryWallet

  const w = await fundWallet()
  return prisma.wallet.create({
    data: {
      label,
      address: w.address,
      encryptedSeed: encryptSeed(w.seed!),
      role: 'TREASURY',
      network,
    },
  })
}

async function ensureDistributionWithItems(args: {
  fundId: string
  period: string
  periodStart: string
  periodEnd: string
  totalDistributableUsd: string
  fxReferenceRateKrwPerUsd: string
  notes?: string
  itemSpecs: Array<{
    investorId: string
    ownershipBp: number
    amountUsd: string
    amountKrw: string
    paymentStatus?: 'PREPARED' | 'VALIDATED'
  }>
}) {
  const dist = await prisma.distribution.upsert({
    where: { fundId_period: { fundId: args.fundId, period: args.period } },
    create: {
      fundId: args.fundId,
      period: args.period,
      periodStart: new Date(args.periodStart),
      periodEnd: new Date(args.periodEnd),
      totalDistributableUsd: new Prisma.Decimal(args.totalDistributableUsd),
      fxReferenceRateKrwPerUsd: new Prisma.Decimal(args.fxReferenceRateKrwPerUsd),
      notes: args.notes,
      status: 'READY',
      calculatedAt: new Date(),
    },
    update: {
      periodStart: new Date(args.periodStart),
      periodEnd: new Date(args.periodEnd),
      totalDistributableUsd: new Prisma.Decimal(args.totalDistributableUsd),
      fxReferenceRateKrwPerUsd: new Prisma.Decimal(args.fxReferenceRateKrwPerUsd),
      notes: args.notes,
      status: 'READY',
      calculatedAt: new Date(),
      submittedAt: null,
      settledAt: null,
      failedAt: null,
    },
  })

  await prisma.distributionItem.deleteMany({ where: { distributionId: dist.id } })
  await prisma.distributionItem.createMany({
    data: args.itemSpecs.map((item) => ({
      distributionId: dist.id,
      investorId: item.investorId,
      ownershipBp: item.ownershipBp,
      amountUsd: new Prisma.Decimal(item.amountUsd),
      amountKrw: new Prisma.Decimal(item.amountKrw),
      paymentStatus: item.paymentStatus ?? 'PREPARED',
    })),
  })

  return dist
}

async function main() {
  console.log('Seeding StableHedge demo data...')

  if (!process.env.WALLET_ENCRYPTION_KEY) {
    throw new Error('WALLET_ENCRYPTION_KEY env required (32 bytes hex)')
  }

  const issuerSeed = process.env.ISSUER_SEED
  const treasurySeed = process.env.TREASURY_SEED
  if (!issuerSeed || !treasurySeed) {
    throw new Error(
      'ISSUER_SEED / TREASURY_SEED missing. Run `pnpm scripts:setup-issuer` first and copy values to .env',
    )
  }
  const issuer = Wallet.fromSeed(issuerSeed)
  const treasury = Wallet.fromSeed(treasurySeed)

  const network = process.env.XRPL_NETWORK ?? 'testnet'
  const currencyCode = process.env.TOKEN_CURRENCY_CODE ?? 'USD'
  const displayLabel = process.env.TOKEN_DISPLAY_LABEL ?? 'RUSD-DEMO'

  const token = await prisma.token.upsert({
    where: {
      currencyCode_issuerAddress_network: {
        currencyCode,
        issuerAddress: issuer.address,
        network,
      },
    },
    create: { currencyCode, displayLabel, issuerAddress: issuer.address, network },
    update: { displayLabel },
  })

  const issuerWallet = await prisma.wallet.upsert({
    where: { address: issuer.address },
    create: {
      label: 'Fund Issuer',
      address: issuer.address,
      encryptedSeed: encryptSeed(issuerSeed),
      role: 'ISSUER',
      network,
    },
    update: {},
  })

  const treasuryWallet = await prisma.wallet.upsert({
    where: { address: treasury.address },
    create: {
      label: 'Fund Treasury',
      address: treasury.address,
      encryptedSeed: encryptSeed(treasurySeed),
      role: 'TREASURY',
      network,
    },
    update: {},
  })

  const redwoodFund = await prisma.fund.upsert({
    where: { id: 'fund-redwood' },
    create: {
      id: 'fund-redwood',
      name: 'Redwood Logistics Center Fund I',
      description: 'Demo fund — US logistics center, USD-denominated',
      network,
      treasuryAddress: treasury.address,
      treasuryWalletId: treasuryWallet.id,
      issuerAddress: issuer.address,
      issuerWalletId: issuerWallet.id,
      tokenId: token.id,
      totalIssued: new Prisma.Decimal('1500000'),
    },
    update: {
      treasuryAddress: treasury.address,
      issuerAddress: issuer.address,
      tokenId: token.id,
    },
  })

  const harborTreasuryWallet = await ensureTreasuryWallet(
    'fund-harbor',
    'Harbor Fund Treasury',
    network,
  )
  const harborFund = await prisma.fund.upsert({
    where: { id: 'fund-harbor' },
    create: {
      id: 'fund-harbor',
      name: 'Harbor Multifamily Income Fund I',
      description: 'Demo fund — US multifamily income, USD-denominated',
      network,
      treasuryAddress: harborTreasuryWallet.address,
      treasuryWalletId: harborTreasuryWallet.id,
      issuerAddress: issuer.address,
      issuerWalletId: issuerWallet.id,
      tokenId: token.id,
      totalIssued: new Prisma.Decimal('800000'),
    },
    update: {
      treasuryAddress: harborTreasuryWallet.address,
      issuerAddress: issuer.address,
      tokenId: token.id,
    },
  })

  const investorSpecs = [
    { externalId: 'INV-0001', name: 'Investor A', ownershipBp: 5000, beginningValue: '500000.00' },
    { externalId: 'INV-0002', name: 'Investor B', ownershipBp: 3000, beginningValue: '300000.00' },
    { externalId: 'INV-0003', name: 'Investor C', ownershipBp: 2000, beginningValue: '200000.00' },
  ]

  const investorIdsByExternalId = new Map<string, string>()

  for (const spec of investorSpecs) {
    let investorRow = await prisma.investor.findUnique({
      where: { externalId: spec.externalId },
      include: { wallet: true },
    })

    if (!investorRow) {
      const w = await fundWallet()
      const walletRow = await prisma.wallet.create({
        data: {
          label: spec.name,
          address: w.address,
          encryptedSeed: encryptSeed(w.seed!),
          role: 'INVESTOR',
          network,
        },
      })
      investorRow = await prisma.investor.create({
        data: {
          externalId: spec.externalId,
          name: spec.name,
          walletAddress: walletRow.address,
          walletId: walletRow.id,
        },
        include: { wallet: true },
      })
      console.log(`Created ${spec.externalId} wallet: ${walletRow.address}`)
    }

    investorIdsByExternalId.set(spec.externalId, investorRow.id)

    await prisma.investment.upsert({
      where: { fundId_investorId: { fundId: redwoodFund.id, investorId: investorRow.id } },
      create: {
        fundId: redwoodFund.id,
        investorId: investorRow.id,
        ownershipBp: spec.ownershipBp,
        beginningValueUsd: new Prisma.Decimal(spec.beginningValue),
        trustlineStatus: 'PENDING',
      },
      update: {
        ownershipBp: spec.ownershipBp,
        beginningValueUsd: new Prisma.Decimal(spec.beginningValue),
      },
    })
  }

  const harborInvestmentSpecs = [
    { externalId: 'INV-0001', ownershipBp: 4000, beginningValue: '200000.00' },
    { externalId: 'INV-0002', ownershipBp: 3500, beginningValue: '175000.00' },
    { externalId: 'INV-0003', ownershipBp: 2500, beginningValue: '125000.00' },
  ]

  for (const spec of harborInvestmentSpecs) {
    const investorId = investorIdsByExternalId.get(spec.externalId)
    if (!investorId) throw new Error(`Missing investor id for ${spec.externalId}`)

    await prisma.investment.upsert({
      where: { fundId_investorId: { fundId: harborFund.id, investorId } },
      create: {
        fundId: harborFund.id,
        investorId,
        ownershipBp: spec.ownershipBp,
        beginningValueUsd: new Prisma.Decimal(spec.beginningValue),
        trustlineStatus: 'PENDING',
      },
      update: {
        ownershipBp: spec.ownershipBp,
        beginningValueUsd: new Prisma.Decimal(spec.beginningValue),
      },
    })
  }

  await ensureDistributionWithItems({
    fundId: redwoodFund.id,
    period: 'Q1-2026',
    periodStart: '2026-01-01T00:00:00Z',
    periodEnd: '2026-03-31T23:59:59Z',
    totalDistributableUsd: '1000000',
    fxReferenceRateKrwPerUsd: '1468',
    notes: 'Demo distribution for Redwood fund',
    itemSpecs: [
      {
        investorId: investorIdsByExternalId.get('INV-0001')!,
        ownershipBp: 5000,
        amountUsd: '500000',
        amountKrw: '734000000',
      },
      {
        investorId: investorIdsByExternalId.get('INV-0002')!,
        ownershipBp: 3000,
        amountUsd: '300000',
        amountKrw: '440400000',
      },
      {
        investorId: investorIdsByExternalId.get('INV-0003')!,
        ownershipBp: 2000,
        amountUsd: '200000',
        amountKrw: '293600000',
      },
    ],
  })

  await ensureDistributionWithItems({
    fundId: harborFund.id,
    period: 'Q1-2026',
    periodStart: '2026-01-01T00:00:00Z',
    periodEnd: '2026-03-31T23:59:59Z',
    totalDistributableUsd: '120000',
    fxReferenceRateKrwPerUsd: '1468',
    notes: 'Demo distribution for Harbor fund',
    itemSpecs: [
      {
        investorId: investorIdsByExternalId.get('INV-0001')!,
        ownershipBp: 4000,
        amountUsd: '48000',
        amountKrw: '70464000',
      },
      {
        investorId: investorIdsByExternalId.get('INV-0002')!,
        ownershipBp: 3500,
        amountUsd: '42000',
        amountKrw: '61656000',
      },
      {
        investorId: investorIdsByExternalId.get('INV-0003')!,
        ownershipBp: 2500,
        amountUsd: '30000',
        amountKrw: '44040000',
      },
    ],
  })

  console.log('\nSeed complete.')
  console.log(`Fund ids     : ${redwoodFund.id}, ${harborFund.id}`)
  console.log(`Treasury     : ${treasury.address}`)
  console.log(`Issuer       : ${issuer.address}`)
  console.log(`Token        : ${currencyCode} (${displayLabel})`)
  console.log('Distributions: Redwood Q1-2026, Harbor Q1-2026 (READY, PREPARED)')
  console.log('\nNext: run `pnpm scripts:open-trustlines [fundId]` if you want to submit on XRPL')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
