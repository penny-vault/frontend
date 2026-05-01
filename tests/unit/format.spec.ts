import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatSignedPercent,
  formatNumber
} from '@/util/format'

describe('format', () => {
  it('formats currency with no decimals', () => {
    expect(formatCurrency(310760.55)).toBe('$310,761')
  })

  it('renders em-dash for null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency(Number.NaN)).toBe('—')
  })

  it('renders percent with two decimals', () => {
    expect(formatPercent(0.0714)).toBe('7.14%')
  })

  it('prefixes positive percents with +', () => {
    expect(formatSignedPercent(0.0714)).toBe('+7.14%')
    expect(formatSignedPercent(-0.0714)).toBe('-7.14%')
    expect(formatSignedPercent(0)).toBe('0.00%')
  })

  it('formats plain numbers with 2 decimals', () => {
    expect(formatNumber(1.24)).toBe('1.24')
  })
})
