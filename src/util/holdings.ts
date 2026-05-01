import type { HoldingsHistoryEntry, HistoricalHolding } from '@/api/endpoints/portfolios'

export function buildJustificationColumns(entries: HoldingsHistoryEntry[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const e of entries) {
    for (const key of Object.keys(e.annotations ?? {})) {
      if (!seen.has(key)) {
        seen.add(key)
        order.push(key)
      }
    }
  }
  return order
}

export interface TickerFrequency {
  ticker: string
  monthCount: number
  percentOfMonths: number
}

export function computeTickerFrequency(entries: HoldingsHistoryEntry[]): TickerFrequency[] {
  const total = entries.length
  const counts = new Map<string, number>()
  for (const e of entries) {
    for (const item of e.items) {
      if (item.ticker === '$CASH') continue
      counts.set(item.ticker, (counts.get(item.ticker) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([ticker, monthCount]) => ({
      ticker,
      monthCount,
      percentOfMonths: total === 0 ? 0 : monthCount / total
    }))
    .sort((a, b) => b.monthCount - a.monthCount || a.ticker.localeCompare(b.ticker))
}

export interface CalculatorRow {
  ticker: string
  weight: number
  shares: number
  value: number
}

export function recomputeCalculatorRows(
  entry: HoldingsHistoryEntry,
  investAmount: number
): CalculatorRow[] {
  if (!Number.isFinite(investAmount) || investAmount <= 0) return []
  const totalValue = entry.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
  return entry.items.map((item: HistoricalHolding) => {
    const weight = totalValue > 0 ? item.lastTradeValue / totalValue : 0
    const pricePerShare = item.quantity > 0 ? item.lastTradeValue / item.quantity : 0
    const value = investAmount * weight
    const shares = pricePerShare > 0 ? value / pricePerShare : 0
    return { ticker: item.ticker, weight, value, shares }
  })
}

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function entriesToCsv(entries: HoldingsHistoryEntry[], annotationKeys: string[]): string {
  const header = ['Timestamp', 'Tickers', 'Value', ...annotationKeys]
  const lines = [header.join(',')]
  for (const e of entries) {
    const tickers = e.items
      .map((i) => i.ticker)
      .filter((t) => t !== '$CASH')
      .sort()
      .join(' ')
    const totalValue = e.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
    const row = [
      csvCell(e.timestamp),
      csvCell(tickers),
      csvCell(totalValue),
      ...annotationKeys.map((k) => csvCell(e.annotations?.[k] ?? ''))
    ]
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}
