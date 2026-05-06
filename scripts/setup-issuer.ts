import 'dotenv/config'
import { Client, Wallet } from 'xrpl'
import { setupIssuer, openTrustline, issueTokens } from '@stablehedge/xrpl-adapter'

const RPC = process.env.XRPL_RPC_URL ?? 'wss://s.altnet.rippletest.net:51233'

async function fundFromFaucet(label: string): Promise<string> {
  const client = new Client(RPC)
  await client.connect()
  const { wallet } = await client.fundWallet()
  await client.disconnect()
  if (!wallet.seed) throw new Error('Faucet returned wallet without seed')
  console.log(`[${label}] funded wallet ${wallet.address}`)
  return wallet.seed
}

async function main() {
  const currency = process.env.TOKEN_CURRENCY_CODE ?? 'USD'

  const issuerSeed = process.env.ISSUER_SEED || (await fundFromFaucet('issuer'))
  const treasurySeed = process.env.TREASURY_SEED || (await fundFromFaucet('treasury'))

  const issuer = Wallet.fromSeed(issuerSeed)
  const treasury = Wallet.fromSeed(treasurySeed)

  console.log(`issuer  : ${issuer.address}`)
  console.log(`treasury: ${treasury.address}`)

  console.log('\n[1/3] Setting issuer flags (DefaultRipple, AllowTrustLineClawback)...')
  const issuerSetup = await setupIssuer({
    rpcUrl: RPC,
    issuerSeed,
    enableDefaultRipple: true,
    enableClawback: true,
  })
  console.log('     txs:', issuerSetup.txHashes)

  console.log('\n[2/3] Opening trustline from treasury to issuer...')
  const trust = await openTrustline({
    rpcUrl: RPC,
    holderSeed: treasurySeed,
    issuerAddress: issuer.address,
    currencyCode: currency,
    limit: '1000000000',
  })
  console.log('     tx:', trust.txHash)

  console.log('\n[3/3] Issuing 1,500,000 to treasury...')
  const issued = await issueTokens({
    rpcUrl: RPC,
    issuerSeed,
    treasuryAddress: treasury.address,
    currencyCode: currency,
    amount: '1500000',
  })
  console.log('     tx:', issued.txHash, 'ledger:', issued.ledgerIndex)

  console.log('\nDone. Save these to your .env:')
  console.log(`ISSUER_SEED=${issuerSeed}`)
  console.log(`TREASURY_SEED=${treasurySeed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
