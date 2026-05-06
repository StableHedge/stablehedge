import { describe, expect, it, beforeAll } from 'vitest'

beforeAll(() => {
  // 32-byte hex key for AES-256-GCM
  process.env.WALLET_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
})

describe('wallet-vault', () => {
  it('round-trips a seed through encrypt/decrypt', async () => {
    const { encryptSeed, decryptSeed } = await import('./wallet-vault.js')
    const seed = 'sEdTM1uX8pu2do5XvTnutH6HsouMaM2'
    const enc = encryptSeed(seed)
    expect(enc).not.toContain(seed)
    expect(enc.split(':')).toHaveLength(3) // iv:tag:cipher
    expect(decryptSeed(enc)).toBe(seed)
  })

  it('produces a different ciphertext on each encryption (IV randomness)', async () => {
    const { encryptSeed } = await import('./wallet-vault.js')
    const seed = 'sEdTM1uX8pu2do5XvTnutH6HsouMaM2'
    const a = encryptSeed(seed)
    const b = encryptSeed(seed)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const { encryptSeed, decryptSeed } = await import('./wallet-vault.js')
    const seed = 'sEdTM1uX8pu2do5XvTnutH6HsouMaM2'
    const enc = encryptSeed(seed)
    const [iv, tag, cipher] = enc.split(':')
    const tampered = `${iv}:${tag}:${cipher!.slice(0, -2)}ff`
    expect(() => decryptSeed(tampered)).toThrow()
  })
})
