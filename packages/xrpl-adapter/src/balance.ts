import { withClient } from './client.js'
import { encodeCurrencyCode } from './currency.js'

export interface TrustlineBalanceQuery {
  rpcUrl: string
  /** Holder of the trustline (e.g. Treasury or Investor address). */
  holderAddress: string
  /** Issuer of the IOU. */
  issuerAddress: string
  /** Plain currency code, e.g. "USD" or "RUSD-DEMO". */
  currencyCode: string
}

export interface TrustlineBalanceResult {
  /** Decimal string, e.g. "500000" or "0". */
  balance: string
  /** Decimal string of trustline limit, or "0" when no trustline exists. */
  limit: string
  /** True if a trustline row exists in the ledger for this holder/issuer/currency. */
  exists: boolean
}

/**
 * Reads a single trustline's balance via XRPL `account_lines`.
 * Returns `{ balance: "0", exists: false }` when the holder has no trustline
 * with the given issuer/currency yet.
 */
export async function getTrustlineBalance(
  query: TrustlineBalanceQuery,
): Promise<TrustlineBalanceResult> {
  const wantedCurrency = encodeCurrencyCode(query.currencyCode)

  return withClient(query.rpcUrl, async (client) => {
    const response = await client.request({
      command: 'account_lines',
      account: query.holderAddress,
      peer: query.issuerAddress,
    })

    const lines = response.result.lines ?? []
    const match = lines.find((line) => {
      const lineCurrency = line.currency.length === 3
        ? line.currency
        : line.currency.toUpperCase()
      return lineCurrency === wantedCurrency && line.account === query.issuerAddress
    })

    if (!match) {
      return { balance: '0', limit: '0', exists: false }
    }

    return {
      balance: match.balance,
      limit: match.limit,
      exists: true,
    }
  })
}
