import { Client } from 'xrpl'

export const DEFAULT_TESTNET_RPC = 'wss://s.altnet.rippletest.net:51233'

export async function withClient<T>(
  rpcUrl: string | undefined,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client(rpcUrl ?? DEFAULT_TESTNET_RPC)
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.disconnect()
  }
}
