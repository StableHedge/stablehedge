import {
  AccountSetAsfFlags,
  Wallet,
  type AccountSet,
  type Client,
} from 'xrpl'
import { withClient } from './client.js'

export interface SetupIssuerInput {
  rpcUrl: string
  issuerSeed: string
  enableDefaultRipple?: boolean
  enableClawback?: boolean
  /** TransferRate, e.g. 1005000000 = 0.5% transfer fee. 0 means none. */
  transferRate?: number
}

export interface SetupIssuerResult {
  issuerAddress: string
  txHashes: string[]
}

export async function setupIssuer(input: SetupIssuerInput): Promise<SetupIssuerResult> {
  const wallet = Wallet.fromSeed(input.issuerSeed)

  return withClient(input.rpcUrl, async (client) => {
    const txHashes: string[] = []

    if (input.enableDefaultRipple !== false) {
      txHashes.push(
        await submitAccountSet(client, wallet, {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          SetFlag: AccountSetAsfFlags.asfDefaultRipple,
        }),
      )
    }

    if (input.enableClawback !== false) {
      txHashes.push(
        await submitAccountSet(client, wallet, {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          SetFlag: AccountSetAsfFlags.asfAllowTrustLineClawback,
        }),
      )
    }

    if (typeof input.transferRate === 'number' && input.transferRate > 0) {
      txHashes.push(
        await submitAccountSet(client, wallet, {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          TransferRate: input.transferRate,
        }),
      )
    }

    return { issuerAddress: wallet.address, txHashes }
  })
}

async function submitAccountSet(client: Client, wallet: Wallet, tx: AccountSet): Promise<string> {
  const prepared = await client.autofill(tx)
  const signed = wallet.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)
  const meta = result.result.meta
  if (typeof meta === 'object' && meta !== null && 'TransactionResult' in meta) {
    if ((meta as { TransactionResult: string }).TransactionResult !== 'tesSUCCESS') {
      throw new Error(`AccountSet failed: ${(meta as { TransactionResult: string }).TransactionResult}`)
    }
  }
  return result.result.hash
}
