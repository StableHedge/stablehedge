import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config.js'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  if (!config.WALLET_ENCRYPTION_KEY) {
    throw new Error('WALLET_ENCRYPTION_KEY not set')
  }
  const buf = Buffer.from(config.WALLET_ENCRYPTION_KEY, 'hex')
  if (buf.length !== 32) {
    throw new Error('WALLET_ENCRYPTION_KEY must be 32 bytes hex (64 chars)')
  }
  return buf
}

export function encryptSeed(seed: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(seed, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptSeed(payload: string): string {
  const [ivHex, tagHex, encHex] = payload.split(':')
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted seed format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}
