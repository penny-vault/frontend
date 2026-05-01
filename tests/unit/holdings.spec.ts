import { describe, it, expect } from 'vitest'
import {
  buildJustificationColumns,
  computeTickerFrequency,
  recomputeCalculatorRows,
  entriesToCsv
} from '@/util/holdings'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'

const entry = (
  timestamp: string,
  items: Array<[string, number, number]>,
  annotations?: Record<string, string>
): HoldingsHistoryEntry => ({
  batchId: 1,
  timestamp,
  items: items.map(([ticker, quantity, lastTradeValue]) => ({
    ticker,
    quantity,
    lastTradeValue,
    avgCost: 0
  })),
  ...(annotations ? { annotations } : {})
})

describe('buildJustificationColumns', () => {
  it('returns the union of annotation keys in first-seen order', () => {
    const entries = [
      entry('2025-01-31T00:00:00Z', [['VTI', 10, 1000]], { Momentum: '0.82', Vol: '0.11' }),
      entry('2025-02-28T00:00:00Z', [['VTI', 10, 1000]], { Vol: '0.09', Sector: 'Tech' })
    ]
    expect(buildJustificationColumns(entries)).toEqual(['Momentum', 'Vol', 'Sector'])
  })

  it('returns empty array when no entries carry annotations', () => {
    const entries = [entry('2025-01-31T00:00:00Z', [['VTI', 10, 1000]])]
    expect(buildJustificationColumns(entries)).toEqual([])
  })
})

describe('computeTickerFrequency', () => {
  it('counts entries per ticker excluding $CASH', () => {
    const entries = [
      entry('2025-01-31T00:00:00Z', [['VTI', 10, 500], ['BND', 20, 500]]),
      entry('2025-02-28T00:00:00Z', [['VTI', 10, 500], ['$CASH', 0, 500]]),
      entry('2025-03-31T00:00:00Z', [['VTI', 10, 1000]])
    ]
    const freq = computeTickerFrequency(entries)
    expect(freq).toEqual([
      { ticker: 'VTI', monthCount: 3, percentOfMonths: 1 },
      { ticker: 'BND', monthCount: 1, percentOfMonths: 1 / 3 }
    ])
  })
})

describe('recomputeCalculatorRows', () => {
  it('scales value proportionally by weight and recomputes shares', () => {
    // VTI: qty=10, marketValue=6000 → price=600/share, weight=6000/10000=0.6
    // BND: qty=20, marketValue=4000 → price=200/share, weight=4000/10000=0.4
    const e = entry('2025-01-31T00:00:00Z', [['VTI', 10, 6000], ['BND', 20, 4000]])
    const rows = recomputeCalculatorRows(e, 10000)
    expect(rows[0]).toMatchObject({ ticker: 'VTI', value: 6000, shares: 10 })
    expect(rows[1]).toMatchObject({ ticker: 'BND', value: 4000, shares: 20 })
  })

  it('returns empty array for invalid investAmount', () => {
    const e = entry('2025-01-31T00:00:00Z', [['VTI', 10, 1000]])
    expect(recomputeCalculatorRows(e, 0)).toEqual([])
    expect(recomputeCalculatorRows(e, -10)).toEqual([])
  })
})

describe('entriesToCsv', () => {
  it('emits header plus one row per entry with tickers joined and total value', () => {
    const entries = [
      entry('2025-01-31T00:00:00Z', [['VTI', 10, 600], ['BND', 20, 400]]),
      entry('2025-02-28T00:00:00Z', [['VTI', 10, 700]], { Momentum: '0.82' })
    ]
    const csv = entriesToCsv(entries, ['Momentum'])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('Timestamp,Tickers,Value,Momentum')
    expect(lines[1]).toBe('2025-01-31T00:00:00Z,BND VTI,1000,')
    expect(lines[2]).toBe('2025-02-28T00:00:00Z,VTI,700,0.82')
  })

  it('escapes commas and quotes in annotation values', () => {
    const entries = [
      entry('2025-01-31T00:00:00Z', [['VTI', 10, 1000]], { Reason: 'risk-off, "bear"' })
    ]
    const csv = entriesToCsv(entries, ['Reason'])
    expect(csv.trim().split('\n')[1]).toBe('2025-01-31T00:00:00Z,VTI,1000,"risk-off, ""bear"""')
  })
})
