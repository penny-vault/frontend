import type {
  HoldingsHistoryEntry,
  HistoricalHolding,
  PredictionResponse
} from '@/api/endpoints/portfolios'

const CASH_TICKER = '$CASH'

// Sentinel batchId for the synthetic entry built from a trade prediction; real
// snapshot batches are numbered from 1.
export const PREDICTION_BATCH_ID = -1

/**
 * Adapts a trade prediction to the holdings-history entry shape so the grid
 * and detail panel can show it alongside real snapshots. Market values are
 * estimated at the last available close and exclude cash; avgCost is unknown
 * for predicted positions.
 */
export function predictionToEntry(p: PredictionResponse): HoldingsHistoryEntry {
  // The API returns prediction annotations as an ordered key/value list;
  // the grid consumes the history entries' map form. Guard against backends
  // that predate the field.
  const pairs = p.annotations ?? []
  const annotations = Object.fromEntries(pairs.map((a) => [a.key, a.value]))
  return {
    batchId: PREDICTION_BATCH_ID,
    // Noon UTC so the America/New_York date labels show the calendar date the
    // API meant.
    timestamp: `${p.date}T12:00:00Z`,
    items: p.holdings.map((h) => ({
      ticker: h.ticker,
      figi: h.figi ?? null,
      quantity: h.quantity,
      avgCost: 0,
      lastTradeValue: h.marketValue
    })),
    portfolioValue: p.totalMarketValue,
    ...(pairs.length ? { annotations } : {})
  }
}

export function isPredictionEntry(e: HoldingsHistoryEntry): boolean {
  return e.batchId === PREDICTION_BATCH_ID
}

// Positions worth less than this fraction of the snapshot total are treated as
// immaterial and hidden from holdings displays so trivial residuals (often
// cash) don't clutter them.
const MIN_DISPLAY_WEIGHT = 0.01

/**
 * The holdings worth at least 1% of the snapshot total. Used by both the
 * history table and the detail sidebar so they show the same set of positions.
 */
export function materialHoldings(entry: HoldingsHistoryEntry): HistoricalHolding[] {
  const total = computeEntryValue(entry)
  if (total <= 0) return entry.items
  return entry.items.filter((i) => i.lastTradeValue / total >= MIN_DISPLAY_WEIGHT)
}

/**
 * Total mark-to-market value of a holdings snapshot.
 *
 * Prefers the API's authoritative portfolioValue (mark-to-market total, includes
 * cash). Falls back to summing items[].lastTradeValue — which now also includes
 * cash — when portfolioValue is null (e.g. a snapshot timestamp that lands off
 * the computed equity curve).
 */
export function computeEntryValue(entry: HoldingsHistoryEntry): number {
  if (entry.portfolioValue != null) return entry.portfolioValue
  return entry.items.reduce((sum, i) => sum + i.lastTradeValue, 0)
}

/**
 * Compact, comma-separated ticker summary for a snapshot, including $CASH.
 * Positions worth less than 1% of the snapshot total are omitted to avoid
 * clutter. e.g. "$CASH, GLD, SPY".
 */
export function formatTickers(entry: HoldingsHistoryEntry): string {
  const symbols = materialHoldings(entry)
    .map((i) => i.ticker)
    .sort()
  return symbols.length ? symbols.join(', ') : '—'
}

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
      if (item.ticker === CASH_TICKER) continue
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
    const row = [
      csvCell(e.timestamp),
      csvCell(formatTickers(e)),
      csvCell(computeEntryValue(e)),
      ...annotationKeys.map((k) => csvCell(e.annotations?.[k] ?? ''))
    ]
    lines.push(row.join(','))
  }
  return lines.join('\n') + '\n'
}
