import { Wallet, convertStringToHex, type Payment } from 'xrpl'
import { withClient } from './client.js'
import { encodeCurrencyCode } from './currency.js'

export interface DistributionPayment {
  distributionItemId: string
  investorAddress: string
  investorExternalId: string
  amountValue: string
  destinationTag?: number
}

export interface DistributionMemo {
  period?: string
  fundId?: string
  distributionId?: string
}

export type PaymentResultStatus = 'VALIDATED' | 'SUBMITTED' | 'FAILED'

export interface PaymentResult {
  distributionItemId: string
  status: PaymentResultStatus
  txHash?: string
  ledgerIndex?: number
  failureReason?: string
}

export interface SubmitDistributionInput {
  rpcUrl: string
  treasurySeed: string
  issuerAddress: string
  currencyCode: string
  payments: DistributionPayment[]
  memo?: DistributionMemo
  /** Called once we have a tx_blob hash but before it is validated. */
  onSubmitted?: (event: {
    distributionItemId: string
    txHash: string
  }) => Promise<void> | void
}

/**
 * Submits a Payment per recipient sequentially.
 * Will be migrated to XLS-56 Batch (AllOrNothing mode) once that amendment
 * is active on the target network.
 */
export async function submitDistributionPayments(
  input: SubmitDistributionInput,
): Promise<PaymentResult[]> {
  const wallet = Wallet.fromSeed(input.treasurySeed)
  const currency = encodeCurrencyCode(input.currencyCode)

  return withClient(input.rpcUrl, async (client) => {
    const results: PaymentResult[] = []

    for (const payment of input.payments) {
      try {
        const tx: Payment = {
          TransactionType: 'Payment',
          Account: wallet.address,
          Destination: payment.investorAddress,
          Amount: {
            currency,
            issuer: input.issuerAddress,
            value: payment.amountValue,
          },
          ...(payment.destinationTag != null
            ? { DestinationTag: payment.destinationTag }
            : {}),
          Memos: buildMemos({
            ...input.memo,
            investorExternalId: payment.investorExternalId,
            distributionItemId: payment.distributionItemId,
          }),
        }

        const prepared = await client.autofill(tx)
        const signed = wallet.sign(prepared)

        const txHash = signed.hash

        if (input.onSubmitted) {
          await input.onSubmitted({
            distributionItemId: payment.distributionItemId,
            txHash,
          })
        }

        const final = await client.submitAndWait(signed.tx_blob)
        const meta = final.result.meta
        let status: PaymentResultStatus = 'SUBMITTED'
        let failureReason: string | undefined

        if (typeof meta === 'object' && meta !== null && 'TransactionResult' in meta) {
          const tr = (meta as { TransactionResult: string }).TransactionResult
          if (tr === 'tesSUCCESS') {
            status = 'VALIDATED'
          } else {
            status = 'FAILED'
            failureReason = tr
          }
        }

        results.push({
          distributionItemId: payment.distributionItemId,
          status,
          txHash: final.result.hash,
          ledgerIndex:
            typeof final.result.ledger_index === 'number' ? final.result.ledger_index : undefined,
          failureReason,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({
          distributionItemId: payment.distributionItemId,
          status: 'FAILED',
          failureReason: message,
        })
      }
    }

    return results
  })
}

function buildMemos(meta: Record<string, string | undefined>) {
  const entries = Object.entries(meta).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return undefined
  return entries.map(([k, v]) => ({
    Memo: {
      MemoType: convertStringToHex(k),
      MemoData: convertStringToHex(String(v)),
    },
  }))
}
