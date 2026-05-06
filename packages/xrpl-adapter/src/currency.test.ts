import { describe, expect, it } from 'vitest'
import { encodeCurrencyCode, decodeCurrencyCode } from './currency.js'

describe('encodeCurrencyCode', () => {
  it('passes 3-char ASCII through unchanged', () => {
    expect(encodeCurrencyCode('USD')).toBe('USD')
    expect(encodeCurrencyCode('EUR')).toBe('EUR')
  })

  it('encodes 4+ char codes to 40-char uppercase hex', () => {
    const enc = encodeCurrencyCode('RUSD-DEMO')
    expect(enc).toHaveLength(40)
    expect(enc).toMatch(/^[0-9A-F]{40}$/)
  })

  it('refuses XRP', () => {
    expect(() => encodeCurrencyCode('XRP')).toThrow()
  })

  it('round-trips non-standard code via decode', () => {
    const enc = encodeCurrencyCode('RUSD-DEMO')
    expect(decodeCurrencyCode(enc)).toBe('RUSD-DEMO')
  })
})

describe('decodeCurrencyCode', () => {
  it('passes 3-char codes through', () => {
    expect(decodeCurrencyCode('USD')).toBe('USD')
  })

  it('decodes hex back to ASCII, trimming trailing nulls', () => {
    const enc = encodeCurrencyCode('USDX')
    expect(decodeCurrencyCode(enc)).toBe('USDX')
  })

  it('returns input as-is when not 40-char hex', () => {
    expect(decodeCurrencyCode('NOT_HEX')).toBe('NOT_HEX')
  })
})
