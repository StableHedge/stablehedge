import { Client, type TransactionStream } from 'xrpl'
import { prisma } from '../db/client.js'
import { config } from '../config.js'

let client: Client | null = null

export async function startLedgerWatcher(): Promise<void> {
  if (client) return
  const next = new Client(config.XRPL_RPC_URL)

  try {
    await next.connect()
    client = next
    console.log(`[ledger-watcher] connected to ${config.XRPL_RPC_URL}`)

    const funds = await prisma.fund.findMany({ select: { treasuryAddress: true } })
    const accounts = funds.map((f) => f.treasuryAddress).filter(Boolean)
    if (accounts.length === 0) {
      console.log('[ledger-watcher] no treasury accounts to subscribe; skipping subscription')
      return
    }

    await next.request({ command: 'subscribe', accounts })
    console.log(`[ledger-watcher] subscribed to ${accounts.length} treasury account(s)`)

    next.on('transaction', async (event: TransactionStream) => {
      // Stream messages have either {transaction} (api_version=1) or {tx_json} (api_version=2).
      const txObj =
        (event as unknown as { transaction?: { hash?: string; TransactionType?: string } })
          .transaction ??
        (event as unknown as { tx_json?: { hash?: string; TransactionType?: string } }).tx_json
      const txHash = txObj?.hash
      if (!txHash) return
      const validated = event.validated === true
      const ledgerIndex =
        typeof event.ledger_index === 'number' ? event.ledger_index : undefined

      try {
        await prisma.xrplTransaction.upsert({
          where: { txHash },
          create: {
            txHash,
            txType: txObj?.TransactionType ?? 'Unknown',
            status: validated ? 'VALIDATED' : 'SUBMITTED',
            ledgerIndex,
            rawResult: event as unknown as object,
            validatedAt: validated ? new Date() : null,
          },
          update: {
            status: validated ? 'VALIDATED' : 'SUBMITTED',
            ledgerIndex,
            validatedAt: validated ? new Date() : null,
            rawResult: event as unknown as object,
          },
        })

        if (validated) {
          await prisma.distributionItem.updateMany({
            where: { txHash, paymentStatus: { in: ['PREPARED', 'SUBMITTED'] } },
            data: {
              paymentStatus: 'VALIDATED',
              validatedAt: new Date(),
              ledgerIndex,
            },
          })
        }
      } catch (err) {
        console.error('[ledger-watcher] failed to record tx', err)
      }
    })
  } catch (err) {
    console.error('[ledger-watcher] startup failed', err)
    if (next.isConnected()) await next.disconnect()
    client = null
  }
}

export async function stopLedgerWatcher(): Promise<void> {
  if (!client) return
  await client.disconnect()
  client = null
}
