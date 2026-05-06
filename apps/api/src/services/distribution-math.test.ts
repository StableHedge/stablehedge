import { describe, expect, it } from 'vitest'
import {
  computeDistributionAmounts,
  parseDestinationTagFromExternalId,
} from './distribution-math.js'

describe('computeDistributionAmounts', () => {
  const investors = [
    { investorId: 'a', ownershipBp: 5000 }, // 50%
    { investorId: 'b', ownershipBp: 3000 }, // 30%
    { investorId: 'c', ownershipBp: 2000 }, // 20%
  ]

  it('splits USD by ownership basis points', () => {
    const result = computeDistributionAmounts('1000000', investors, null)
    expect(result.map((r) => r.amountUsd.toString())).toEqual([
      '500000',
      '300000',
      '200000',
    ])
  })

  it('totals to the original amount when bp sums to 10000', () => {
    const result = computeDistributionAmounts('1000000', investors, null)
    const sum = result.reduce((acc, r) => acc.add(r.amountUsd), result[0]!.amountUsd.sub(result[0]!.amountUsd))
    expect(sum.toString()).toBe('1000000')
  })

  it('computes KRW equivalent when fx rate is provided', () => {
    const result = computeDistributionAmounts('1000000', investors, '1300')
    expect(result[0]!.amountKrw?.toString()).toBe('650000000') // 500000 * 1300
    expect(result[1]!.amountKrw?.toString()).toBe('390000000')
    expect(result[2]!.amountKrw?.toString()).toBe('260000000')
  })

  it('keeps KRW null when fx rate is null', () => {
    const result = computeDistributionAmounts('1000000', investors, null)
    expect(result.every((r) => r.amountKrw === null)).toBe(true)
  })

  it('handles non-round basis points without floating point loss', () => {
    const result = computeDistributionAmounts('1000', [
      { investorId: 'x', ownershipBp: 3333 },
      { investorId: 'y', ownershipBp: 3333 },
      { investorId: 'z', ownershipBp: 3334 },
    ], null)
    expect(result[0]!.amountUsd.toString()).toBe('333.3')
    expect(result[1]!.amountUsd.toString()).toBe('333.3')
    expect(result[2]!.amountUsd.toString()).toBe('333.4')
    const sum = result[0]!.amountUsd.add(result[1]!.amountUsd).add(result[2]!.amountUsd)
    expect(sum.toString()).toBe('1000')
  })
})

describe('parseDestinationTagFromExternalId', () => {
  it('extracts trailing digits', () => {
    expect(parseDestinationTagFromExternalId('INV-0001')).toBe(1)
    expect(parseDestinationTagFromExternalId('INV-0042')).toBe(42)
    expect(parseDestinationTagFromExternalId('INV-99999')).toBe(99999)
  })

  it('returns undefined when no digits trail', () => {
    expect(parseDestinationTagFromExternalId('INVESTOR')).toBeUndefined()
    expect(parseDestinationTagFromExternalId('')).toBeUndefined()
  })
})
