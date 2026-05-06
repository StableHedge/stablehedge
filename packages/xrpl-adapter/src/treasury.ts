import { Wallet, type Payment, type TrustSet } from 'xrpl'
import { withClient } from './client.js'
import { encodeCurrencyCode } from './currency.js'

export interface OpenTrustlineInput {
  rpcUrl: string
  holderSeed: string
  issuerAddress: string
  currencyCode: string
  /** Default 1,000,000,000 */
  limit?: string
}

export interface OpenTrustlineResult {
  holderAddress: string
  txHash: string
}

export async function openTrustline(input: OpenTrustlineInput): Promise<OpenTrustlineResult> {
  const wallet = Wallet.fromSeed(input.holderSeed)
  const currency = encodeCurrencyCode(input.currencyCode)

  return withClient(input.rpcUrl, async (client) => {
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency,
        issuer: input.issuerAddress,
        value: input.limit ?? '1000000000',
      },
    }
    const prepared = await client.autofill(tx)
    const signed = wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)
    const meta = result.result.meta
    if (typeof meta === 'object' && meta !== null && 'TransactionResult' in meta) {
      const tr = (meta as { TransactionResult: string }).TransactionResult
      if (tr !== 'tesSUCCESS') throw new Error(`TrustSet failed: ${tr}`)
    }
    return { holderAddress: wallet.address, txHash: result.result.hash }
  })
}

export interface IssueTokensInput {
  rpcUrl: string
  issuerSeed: string
  treasuryAddress: string
  currencyCode: string
  amount: string
}

export interface IssueTokensResult {
  txHash: string
  ledgerIndex?: number
}

export async function issueTokens(input: IssueTokensInput): Promise<IssueTokensResult> {
  const wallet = Wallet.fromSeed(input.issuerSeed)
  const currency = encodeCurrencyCode(input.currencyCode)

  return withClient(input.rpcUrl, async (client) => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: input.treasuryAddress,
      Amount: {
        currency,
        issuer: wallet.address,
        value: input.amount,
      },
    }
    const prepared = await client.autofill(tx)
    const signed = wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)
    const meta = result.result.meta
    if (typeof meta === 'object' && meta !== null && 'TransactionResult' in meta) {
      const tr = (meta as { TransactionResult: string }).TransactionResult
      if (tr !== 'tesSUCCESS') throw new Error(`Issue failed: ${tr}`)
    }
    return {
      txHash: result.result.hash,
      ledgerIndex: typeof result.result.ledger_index === 'number' ? result.result.ledger_index : undefined,
    }
  })
}
