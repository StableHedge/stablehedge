import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string(),
  XRPL_NETWORK: z.enum(['testnet', 'devnet', 'mainnet']).default('testnet'),
  XRPL_RPC_URL: z.string().default('wss://s.altnet.rippletest.net:51233'),
  XRPL_EXPLORER_BASE: z.string().default('https://testnet.xrpl.org'),
  ISSUER_SEED: z.string().optional(),
  TREASURY_SEED: z.string().optional(),
  TOKEN_CURRENCY_CODE: z.string().default('USD'),
  TOKEN_DISPLAY_LABEL: z.string().default('RUSD-DEMO'),
  WALLET_ENCRYPTION_KEY: z.string().optional(),
  JWT_SECRET: z.string().default('change-me'),
})

export const config = schema.parse(process.env)
