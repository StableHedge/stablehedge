import { Client, type TransactionStream } from 'xrpl'

export interface WatcherOptions {
  rpcUrl: string
  accounts: string[]
  onTransaction: (event: TransactionStream) => Promise<void> | void
  onError?: (err: unknown) => void
}

export interface Watcher {
  stop: () => Promise<void>
}

export async function startSubscription(options: WatcherOptions): Promise<Watcher> {
  const client = new Client(options.rpcUrl)
  await client.connect()
  await client.request({ command: 'subscribe', accounts: options.accounts })
  client.on('transaction', async (event) => {
    try {
      await options.onTransaction(event)
    } catch (err) {
      options.onError?.(err)
    }
  })
  return {
    stop: async () => {
      await client.disconnect()
    },
  }
}
