import { describe, it, expect } from 'vitest'
import {
  buildJustificationColumns,
  computeTickerFrequency,
  recomputeCalculatorRows,
  entriesToCsv,
  computeEntryValue,
  formatTickers,
  isPredictionEntry,
  predictionToEntry,
  PREDICTION_BATCH_ID
} from '@/util/holdings'
import type { HoldingsHistoryEntry } from '@/api/endpoints/portfolios'

const entry = (
  timestamp: string,
  items: Array<[string, number, number]>,
  annotations?: Record<string, string>,
  portfolioValue?: number | null
): HoldingsHistoryEntry => ({
  batchId: 1,
  timestamp,
  items: items.map(([ticker, quantity, lastTradeValue]) => ({
    ticker,
    quantity,
    lastTradeValue,
    avgCost: 0
  })),
  ...(annotations ? { annotations } : {}),
  ...(portfolioValue !== undefined ? { portfolioValue } : {})
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
      entry('2025-01-31T00:00:00Z', [
        ['VTI', 10, 500],
        ['BND', 20, 500]
      ]),
      entry('2025-02-28T00:00:00Z', [
        ['VTI', 10, 500],
        ['$CASH', 0, 500]
      ]),
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
    const e = entry('2025-01-31T00:00:00Z', [
      ['VTI', 10, 6000],
      ['BND', 20, 4000]
    ])
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

describe('computeEntryValue', () => {
  it('prefers the authoritative portfolioValue over the item sum', () => {
    const e = entry(
      '2025-02-28T00:00:00Z',
      [
        ['GLD', 10, 6200],
        ['$CASH', 0, 4780]
      ],
      undefined,
      10980
    )
    expect(computeEntryValue(e)).toBe(10980)
  })

  it('falls back to summing item values (incl. cash) when portfolioValue is null', () => {
    const e = entry(
      '2025-03-31T00:00:00Z',
      [
        ['GLD', 10, 6500],
        ['$CASH', 0, 4800]
      ],
      undefined,
      null
    )
    expect(computeEntryValue(e)).toBe(11300)
  })

  it('falls back when portfolioValue is absent', () => {
    const e = entry('2025-01-31T00:00:00Z', [
      ['GLD', 10, 5000],
      ['SPY', 5, 3000]
    ])
    expect(computeEntryValue(e)).toBe(8000)
  })
})

describe('formatTickers', () => {
  it('lists tickers sorted, comma-separated', () => {
    const e = entry('2025-01-31T00:00:00Z', [
      ['SPY', 5, 3000],
      ['GLD', 10, 5000]
    ])
    expect(formatTickers(e)).toBe('GLD, SPY')
  })

  it('includes $CASH inline with no special casing', () => {
    const e = entry('2025-02-28T00:00:00Z', [
      ['GLD', 10, 6200],
      ['$CASH', 0, 4780]
    ])
    expect(formatTickers(e)).toBe('$CASH, GLD')
  })

  it('shows cash alone when there are no other holdings', () => {
    const e = entry('2025-02-28T00:00:00Z', [['$CASH', 0, 4780]])
    expect(formatTickers(e)).toBe('$CASH')
  })

  it('drops cash worth less than 1% of the total', () => {
    // GLD 9950 + cash 50 of 10000 → cash is 0.5%
    const e = entry('2025-02-28T00:00:00Z', [
      ['GLD', 10, 9950],
      ['$CASH', 0, 50]
    ])
    expect(formatTickers(e)).toBe('GLD')
  })

  it('drops any holding worth less than 1% of the total', () => {
    // SPY 9950 + GLD 50 of 10000 → GLD is 0.5%
    const e = entry('2025-02-28T00:00:00Z', [
      ['SPY', 10, 9950],
      ['GLD', 1, 50]
    ])
    expect(formatTickers(e)).toBe('SPY')
  })
})

describe('entriesToCsv', () => {
  it('emits header plus one row per entry with tickers joined and total value', () => {
    const entries = [
      entry('2025-01-31T00:00:00Z', [
        ['VTI', 10, 600],
        ['BND', 20, 400]
      ]),
      entry('2025-02-28T00:00:00Z', [['VTI', 10, 700]], { Momentum: '0.82' })
    ]
    const csv = entriesToCsv(entries, ['Momentum'])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('Timestamp,Tickers,Value,Momentum')
    expect(lines[1]).toBe('2025-01-31T00:00:00Z,"BND, VTI",1000,')
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

describe('predictionToEntry', () => {
  const prediction = {
    date: '2026-05-29',
    transactions: [],
    holdings: [
      { ticker: 'VTI', figi: 'BBG000BDTBL9', quantity: 710, marketValue: 169264, weight: 0.6635 },
      { ticker: 'BND', figi: null, quantity: 700, marketValue: 50400, weight: 0.1976 }
    ],
    totalMarketValue: 219664
  }

  it('adapts a prediction to the history entry shape', () => {
    const e = predictionToEntry(prediction)
    expect(e.batchId).toBe(PREDICTION_BATCH_ID)
    expect(e.timestamp).toBe('2026-05-29T12:00:00Z')
    expect(e.portfolioValue).toBe(219664)
    expect(e.items).toEqual([
      { ticker: 'VTI', figi: 'BBG000BDTBL9', quantity: 710, avgCost: 0, lastTradeValue: 169264 },
      { ticker: 'BND', figi: null, quantity: 700, avgCost: 0, lastTradeValue: 50400 }
    ])
  })

  it('is recognized by isPredictionEntry while real entries are not', () => {
    expect(isPredictionEntry(predictionToEntry(prediction))).toBe(true)
    expect(isPredictionEntry(entry('2025-01-31T00:00:00Z', [['VTI', 10, 1000]]))).toBe(false)
  })

  it('uses the authoritative total for value computation', () => {
    expect(computeEntryValue(predictionToEntry(prediction))).toBe(219664)
  })
})
