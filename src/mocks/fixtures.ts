import type {
  Portfolio,
  PortfolioListItem,
  PortfolioSummary,
  Drawdown,
  PortfolioStatistic,
  PortfolioMetrics,
  TrailingReturnRow,
  PortfolioPerformance,
  HoldingsResponse,
  HoldingsHistoryEntry,
  HoldingsHistoryResponse,
  TransactionsResponse,
  HoldingsImpactResponse,
  PortfolioFactorAnalysis,
  FactorPeriod,
  FactorPeriodKey,
  FactorKey,
  FactorTimePoint
} from '@/api/endpoints/portfolios'
import type { Strategy } from '@/api/endpoints/strategies'
import type { SecurityResult } from '@/api/endpoints/securities'
import type { Alert } from '@/api/endpoints/alerts'

// Deterministic PRNG — for repeatable time-series data
function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PORTFOLIO_SLUG_1 = 'adm-growth-mk01'

interface HoldingsConfig {
  slug: string
  tickers: { ticker: string; baseWeight: number; avgCost?: number }[]
  totalValue: number
  date: string
}

function buildHoldings(cfg: HoldingsConfig): HoldingsResponse {
  const items = cfg.tickers.map((t) => {
    const marketValue = Math.round(cfg.totalValue * t.baseWeight * 100) / 100
    const avgCost = t.avgCost ?? 100
    return {
      ticker: t.ticker,
      quantity: Math.round((marketValue / avgCost) * 100) / 100,
      avgCost,
      marketValue,
      dayChange: null
    }
  })
  return {
    date: cfg.date,
    items,
    totalMarketValue: cfg.totalValue
  }
}

function buildPerformance(slug: string): PortfolioPerformance {
  const rand = mulberry32(7777)
  const randB = mulberry32(4242)
  const start = new Date('2015-01-02T00:00:00Z').getTime()
  const end = new Date('2026-04-14T00:00:00Z').getTime()
  const dayMs = 86_400_000

  const points: PortfolioPerformance['points'] = []
  let p = 100_000
  let b = 100_000
  for (let t = start; t <= end; t += dayMs) {
    const d = new Date(t)
    const wd = d.getUTCDay()
    if (wd === 0 || wd === 6) continue
    const drift = 0.00038
    const vol = 0.0078
    p = p * (1 + drift + (rand() - 0.5) * 2 * vol)
    b = b * (1 + drift * 0.75 + (randB() - 0.5) * 2 * vol * 0.85)
    points.push({
      date: d.toISOString().slice(0, 10),
      portfolioValue: Math.round(p * 100) / 100,
      benchmarkValue: Math.round(b * 100) / 100
    })
  }

  return {
    portfolioSlug: slug,
    from: points[0]!.date,
    to: points[points.length - 1]!.date,
    resolution: 'daily',
    points
  }
}

const PORTFOLIO_SLUG_2 = 'tec-bond-ladder-zk02'
const PORTFOLIO_SLUG_3 = 'gta-all-weather-pp03'

export const portfolioFixture: Portfolio = {
  slug: PORTFOLIO_SLUG_1,
  name: 'Adaptive Momentum — Growth Sleeve',
  benchmark: 'SPY',
  strategyCode: 'adm',
  strategyCloneUrl: 'https://github.com/penny-vault/strategy-adm',
  parameters: { lookback: 12, topN: 3 },
  status: 'ready',
  createdAt: '2025-01-02T00:00:00Z',
  updatedAt: '2026-04-14T21:00:00Z',
  lastRunAt: '2026-04-14T21:00:00Z',
  startDate: '2015-01-02',
  runRetention: 2
}

export const portfolioFixture2: Portfolio = {
  slug: PORTFOLIO_SLUG_2,
  name: 'Tax-Efficient Core — Bond Ladder',
  benchmark: 'AGG',
  strategyCode: 'tec',
  strategyCloneUrl: 'https://github.com/penny-vault/strategy-tec',
  parameters: { duration: 'short' },
  status: 'ready',
  createdAt: '2025-06-15T00:00:00Z',
  updatedAt: '2026-04-14T21:00:00Z',
  lastRunAt: '2026-04-14T21:00:00Z',
  startDate: '2019-06-15',
  runRetention: 2
}

export const portfolioFixture3: Portfolio = {
  slug: PORTFOLIO_SLUG_3,
  name: 'Global Tactical — All Weather',
  benchmark: 'ACWI',
  strategyCode: 'gta',
  strategyCloneUrl: 'https://github.com/penny-vault/strategy-gta',
  parameters: {},
  status: 'ready',
  createdAt: '2026-01-04T00:00:00Z',
  updatedAt: '2026-04-14T21:00:00Z',
  lastRunAt: '2026-04-14T21:00:00Z',
  startDate: '2021-01-04',
  runRetention: 2
}

export const summaryFixture1: PortfolioSummary = {
  currentValue: 310760.55,
  ytdReturn: 0.0714,
  benchmarkYtdReturn: 0.0538,
  oneYearReturn: 0.1832,
  cagrSinceInception: 0.1147,
  maxDrawDown: -0.3387,
  sharpe: 1.24,
  sortino: 1.78,
  stdDev: 0.1493,
  ulcerIndex: 0.0634,
  beta: 0.92,
  alpha: 0.0213,
  taxCostRatio: 0.0087
}

export const summaryFixture2: PortfolioSummary = {
  currentValue: 142380.22,
  ytdReturn: 0.0198,
  benchmarkYtdReturn: 0.0142,
  oneYearReturn: 0.0412,
  cagrSinceInception: 0.0318,
  maxDrawDown: -0.0843,
  sharpe: 0.62,
  sortino: 0.89,
  stdDev: 0.0621,
  ulcerIndex: 0.0214,
  beta: 0.88,
  alpha: 0.0041,
  taxCostRatio: 0.0031
}

export const summaryFixture3: PortfolioSummary = {
  currentValue: 87450.1,
  ytdReturn: 0.0532,
  benchmarkYtdReturn: 0.0389,
  oneYearReturn: 0.1214,
  cagrSinceInception: 0.0891,
  maxDrawDown: -0.1892,
  sharpe: 0.94,
  sortino: 1.31,
  stdDev: 0.1187,
  ulcerIndex: 0.0412,
  beta: 0.78,
  alpha: 0.0182,
  taxCostRatio: 0.0064
}

export const drawdownsFixture1: Drawdown[] = [
  { start: '2022-01-05', trough: '2022-10-12', recovery: '2023-08-02', depth: -0.2416, days: 402 },
  { start: '2020-02-20', trough: '2020-03-23', recovery: '2020-08-10', depth: -0.3387, days: 120 },
  { start: '2025-02-15', trough: '2025-04-08', recovery: null, depth: -0.1108, days: 59 },
  { start: '2018-10-01', trough: '2018-12-24', recovery: '2019-04-12', depth: -0.1974, days: 138 },
  { start: '2023-07-27', trough: '2023-10-27', recovery: '2023-12-19', depth: -0.0812, days: 102 }
]

export const drawdownsFixture2: Drawdown[] = [
  { start: '2022-01-03', trough: '2022-10-24', recovery: '2024-03-15', depth: -0.0843, days: 527 },
  { start: '2021-08-02', trough: '2021-09-28', recovery: '2021-11-15', depth: -0.0312, days: 81 },
  { start: '2023-04-06', trough: '2023-07-03', recovery: '2023-10-02', depth: -0.0201, days: 105 }
]

export const drawdownsFixture3: Drawdown[] = [
  { start: '2022-01-04', trough: '2022-09-30', recovery: '2023-11-20', depth: -0.1892, days: 419 },
  { start: '2021-11-22', trough: '2021-12-03', recovery: '2022-01-03', depth: -0.0521, days: 24 },
  { start: '2023-07-31', trough: '2023-10-27', recovery: '2024-01-12', depth: -0.0891, days: 101 }
]

export const statisticsFixture1: PortfolioStatistic[] = [
  { label: 'Sharpe Ratio', value: 1.24, format: 'number' },
  { label: 'Sortino Ratio', value: 1.78, format: 'number' },
  { label: 'Std. Deviation', value: 0.1493, format: 'percent' },
  { label: 'Ulcer Index', value: 0.0634, format: 'number' },
  { label: 'Beta vs. Benchmark', value: 0.92, format: 'number' },
  { label: "Jensen's Alpha", value: 0.0213, format: 'percent' },
  { label: 'Tax Cost Ratio', value: 0.0087, format: 'percent' },
  { label: 'Up Capture', value: 1.08, format: 'number' },
  { label: 'Down Capture', value: 0.81, format: 'number' },
  { label: 'Best Month', value: 0.1192, format: 'percent' },
  { label: 'Worst Month', value: -0.1283, format: 'percent' },
  { label: 'Avg. Turnover', value: 0.31, format: 'percent' }
]

export const statisticsFixture2: PortfolioStatistic[] = [
  { label: 'Sharpe Ratio', value: 0.62, format: 'number' },
  { label: 'Sortino Ratio', value: 0.89, format: 'number' },
  { label: 'Std. Deviation', value: 0.0621, format: 'percent' }
]

export const statisticsFixture3: PortfolioStatistic[] = [
  { label: 'Sharpe Ratio', value: 0.94, format: 'number' },
  { label: 'Sortino Ratio', value: 1.31, format: 'number' },
  { label: 'Std. Deviation', value: 0.1187, format: 'percent' }
]

export const trailingReturnsFixture1: TrailingReturnRow[] = [
  {
    title: 'Portfolio — Time-Weighted',
    kind: 'portfolio',
    ytd: 0.0714,
    oneYear: 0.1832,
    threeYear: 0.1083,
    fiveYear: 0.1274,
    tenYear: 0.1119,
    sinceInception: 0.1147
  },
  {
    title: 'Benchmark — Time-Weighted',
    kind: 'benchmark',
    ytd: 0.0538,
    oneYear: 0.1471,
    threeYear: 0.0912,
    fiveYear: 0.1129,
    tenYear: 0.1047,
    sinceInception: 0.1081
  },
  {
    title: 'Portfolio — TWRR (tax-adjusted)',
    kind: 'portfolio-tax',
    ytd: 0.0652,
    oneYear: 0.1673,
    threeYear: 0.0989,
    fiveYear: 0.1163,
    tenYear: 0.1022,
    sinceInception: 0.1047
  },
  {
    title: 'Benchmark — TWRR (tax-adjusted)',
    kind: 'benchmark-tax',
    ytd: 0.0457,
    oneYear: 0.125,
    threeYear: 0.0775,
    fiveYear: 0.096,
    tenYear: 0.0889,
    sinceInception: 0.0919
  }
]

export const trailingReturnsFixture2: TrailingReturnRow[] = [
  {
    title: 'Portfolio — Time-Weighted',
    kind: 'portfolio',
    ytd: 0.0198,
    oneYear: 0.0412,
    threeYear: 0.0289,
    fiveYear: 0.0318,
    tenYear: 0.0318,
    sinceInception: 0.0318
  },
  {
    title: 'Benchmark — Time-Weighted',
    kind: 'benchmark',
    ytd: 0.0142,
    oneYear: 0.0318,
    threeYear: 0.0201,
    fiveYear: 0.0241,
    tenYear: 0.0241,
    sinceInception: 0.0241
  },
  {
    title: 'Portfolio — TWRR (tax-adjusted)',
    kind: 'portfolio-tax',
    ytd: 0.0182,
    oneYear: 0.0378,
    threeYear: 0.0265,
    fiveYear: 0.0291,
    tenYear: 0.0291,
    sinceInception: 0.0291
  }
]

export const trailingReturnsFixture3: TrailingReturnRow[] = [
  {
    title: 'Portfolio — Time-Weighted',
    kind: 'portfolio',
    ytd: 0.0532,
    oneYear: 0.1214,
    threeYear: 0.0782,
    fiveYear: 0.0891,
    tenYear: 0.0891,
    sinceInception: 0.0891
  },
  {
    title: 'Benchmark — Time-Weighted',
    kind: 'benchmark',
    ytd: 0.0389,
    oneYear: 0.0982,
    threeYear: 0.0612,
    fiveYear: 0.0721,
    tenYear: 0.0721,
    sinceInception: 0.0721
  },
  {
    title: 'Portfolio — TWRR (tax-adjusted)',
    kind: 'portfolio-tax',
    ytd: 0.0481,
    oneYear: 0.1102,
    threeYear: 0.0711,
    fiveYear: 0.0812,
    tenYear: 0.0812,
    sinceInception: 0.0812
  }
]

export const portfolioListFixture: PortfolioListItem[] = [
  {
    ...portfolioFixture,
    inceptionDate: '2015-01-02',
    currentValue: summaryFixture1.currentValue,
    ytdReturn: summaryFixture1.ytdReturn,
    maxDrawDown: summaryFixture1.maxDrawDown
  },
  {
    ...portfolioFixture2,
    inceptionDate: '2019-06-15',
    currentValue: summaryFixture2.currentValue,
    ytdReturn: summaryFixture2.ytdReturn,
    maxDrawDown: summaryFixture2.maxDrawDown
  },
  {
    ...portfolioFixture3,
    inceptionDate: '2021-01-04',
    currentValue: summaryFixture3.currentValue,
    ytdReturn: summaryFixture3.ytdReturn,
    maxDrawDown: summaryFixture3.maxDrawDown
  }
]

export const performanceFixture: PortfolioPerformance = buildPerformance(PORTFOLIO_SLUG_1)

export const holdingsFixture1: HoldingsResponse = buildHoldings({
  slug: PORTFOLIO_SLUG_1,
  date: '2026-04-14',
  totalValue: summaryFixture1.currentValue,
  tickers: [
    { ticker: 'VTI', baseWeight: 0.58, avgCost: 230 },
    { ticker: 'VEA', baseWeight: 0.22, avgCost: 50 },
    { ticker: 'BND', baseWeight: 0.2, avgCost: 72 }
  ]
})

export const holdingsFixture2: HoldingsResponse = buildHoldings({
  slug: PORTFOLIO_SLUG_2,
  date: '2026-04-14',
  totalValue: summaryFixture2.currentValue,
  tickers: [
    { ticker: 'BND', baseWeight: 0.5, avgCost: 72 },
    { ticker: 'VTIP', baseWeight: 0.3, avgCost: 49 },
    { ticker: 'SHY', baseWeight: 0.2, avgCost: 85 }
  ]
})

export const holdingsFixture3: HoldingsResponse = buildHoldings({
  slug: PORTFOLIO_SLUG_3,
  date: '2026-04-14',
  totalValue: summaryFixture3.currentValue,
  tickers: [
    { ticker: 'VT', baseWeight: 0.55, avgCost: 110 },
    { ticker: 'GLD', baseWeight: 0.25, avgCost: 195 },
    { ticker: 'TLT', baseWeight: 0.2, avgCost: 88 }
  ]
})

export const holdingsMap: Record<string, HoldingsResponse> = {
  [PORTFOLIO_SLUG_1]: holdingsFixture1,
  [PORTFOLIO_SLUG_2]: holdingsFixture2,
  [PORTFOLIO_SLUG_3]: holdingsFixture3
}

// -----------------------------------------------------------------------------
// Holdings history — month-end snapshots used by the holdings page grid,
// frequency chart, and calculator dialog.
// -----------------------------------------------------------------------------

interface HistoryConfig {
  tickers: { ticker: string; weight: number; pricePerShare: number }[]
  totalValue: number
  months: { date: string; annotations?: Record<string, string> }[]
}

function buildHoldingsHistory(cfg: HistoryConfig): HoldingsHistoryResponse {
  const items: HoldingsHistoryEntry[] = cfg.months.map((m, idx) => {
    const holdings = cfg.tickers.map((t) => {
      const lastTradeValue = Math.round(cfg.totalValue * t.weight * 100) / 100
      const quantity = Math.round((lastTradeValue / t.pricePerShare) * 100) / 100
      return {
        ticker: t.ticker,
        quantity,
        avgCost: t.pricePerShare,
        lastTradeValue
      }
    })
    const entry: HoldingsHistoryEntry = {
      batchId: idx + 1,
      timestamp: `${m.date}T00:00:00Z`,
      items: holdings,
      portfolioValue: cfg.totalValue
    }
    if (m.annotations) entry.annotations = m.annotations
    return entry
  })
  return { items }
}

const HISTORY_MONTHS_1: HistoryConfig['months'] = [
  { date: '2026-01-30', annotations: { momentum: '0.18', vol: '0.12' } },
  { date: '2026-02-27', annotations: { momentum: '0.21', vol: '0.13' } },
  { date: '2026-03-31', annotations: { momentum: '0.19', vol: '0.11' } },
  { date: '2026-04-30', annotations: { momentum: '0.22', vol: '0.10' } }
]

export const holdingsHistoryFixture1: HoldingsHistoryResponse = buildHoldingsHistory({
  tickers: [
    { ticker: 'VTI', weight: 0.58, pricePerShare: 230 },
    { ticker: 'VEA', weight: 0.22, pricePerShare: 50 },
    { ticker: 'BND', weight: 0.2, pricePerShare: 72 }
  ],
  totalValue: summaryFixture1.currentValue,
  months: HISTORY_MONTHS_1
})

export const holdingsHistoryFixture2: HoldingsHistoryResponse = buildHoldingsHistory({
  tickers: [
    { ticker: 'BND', weight: 0.5, pricePerShare: 72 },
    { ticker: 'VTIP', weight: 0.3, pricePerShare: 49 },
    { ticker: 'SHY', weight: 0.2, pricePerShare: 85 }
  ],
  totalValue: summaryFixture2.currentValue,
  months: HISTORY_MONTHS_1
})

export const holdingsHistoryFixture3: HoldingsHistoryResponse = buildHoldingsHistory({
  tickers: [
    { ticker: 'VT', weight: 0.55, pricePerShare: 110 },
    { ticker: 'GLD', weight: 0.25, pricePerShare: 195 },
    { ticker: 'TLT', weight: 0.2, pricePerShare: 88 }
  ],
  totalValue: summaryFixture3.currentValue,
  months: HISTORY_MONTHS_1
})

export const holdingsHistoryMap: Record<string, HoldingsHistoryResponse> = {
  [PORTFOLIO_SLUG_1]: holdingsHistoryFixture1,
  [PORTFOLIO_SLUG_2]: holdingsHistoryFixture2,
  [PORTFOLIO_SLUG_3]: holdingsHistoryFixture3
}

// -----------------------------------------------------------------------------
// Transactions — static mock data
// -----------------------------------------------------------------------------

const transactionsFixture1: TransactionsResponse = {
  items: [
    {
      batchId: 1,
      date: '2015-01-02',
      type: 'deposit',
      amount: 250000,
      justification: 'Initial funding'
    },
    {
      batchId: 2,
      date: '2015-01-02',
      type: 'buy',
      ticker: 'VTI',
      quantity: 631.5,
      price: 229.8,
      amount: -145080
    },
    {
      batchId: 2,
      date: '2015-01-02',
      type: 'buy',
      ticker: 'VEA',
      quantity: 1098,
      price: 50.02,
      amount: -54922
    },
    {
      batchId: 2,
      date: '2015-01-02',
      type: 'buy',
      ticker: 'BND',
      quantity: 693,
      price: 72.1,
      amount: -49965
    },
    {
      batchId: 3,
      date: '2026-01-15',
      type: 'dividend',
      ticker: 'VTI',
      amount: 1021.5,
      qualified: true
    },
    {
      batchId: 3,
      date: '2026-01-15',
      type: 'dividend',
      ticker: 'BND',
      amount: 803.2,
      qualified: false
    },
    {
      batchId: 4,
      date: '2026-03-31',
      type: 'sell',
      ticker: 'VEA',
      quantity: 100,
      price: 51.4,
      amount: 5140
    },
    {
      batchId: 4,
      date: '2026-03-31',
      type: 'buy',
      ticker: 'VTI',
      quantity: 22.3,
      price: 231,
      amount: -5151.3
    },
    { batchId: 5, date: '2026-04-14', type: 'fee', amount: -25.88, justification: 'Platform fee' }
  ]
}

const transactionsFixture2: TransactionsResponse = {
  items: [
    {
      batchId: 1,
      date: '2019-06-15',
      type: 'deposit',
      amount: 135000,
      justification: 'Initial funding'
    },
    {
      batchId: 2,
      date: '2019-06-15',
      type: 'buy',
      ticker: 'BND',
      quantity: 936,
      price: 72.0,
      amount: -67392
    },
    {
      batchId: 2,
      date: '2019-06-15',
      type: 'buy',
      ticker: 'VTIP',
      quantity: 849,
      price: 49.1,
      amount: -41676
    },
    {
      batchId: 2,
      date: '2019-06-15',
      type: 'buy',
      ticker: 'SHY',
      quantity: 308,
      price: 85.0,
      amount: -26180
    },
    {
      batchId: 3,
      date: '2026-01-15',
      type: 'dividend',
      ticker: 'BND',
      amount: 548.9,
      qualified: false
    },
    { batchId: 4, date: '2026-04-14', type: 'fee', amount: -11.87, justification: 'Platform fee' }
  ]
}

const transactionsFixture3: TransactionsResponse = {
  items: [
    {
      batchId: 1,
      date: '2021-01-04',
      type: 'deposit',
      amount: 80000,
      justification: 'Initial funding'
    },
    {
      batchId: 2,
      date: '2021-01-04',
      type: 'buy',
      ticker: 'VT',
      quantity: 436,
      price: 101.0,
      amount: -44036
    },
    {
      batchId: 2,
      date: '2021-01-04',
      type: 'buy',
      ticker: 'GLD',
      quantity: 103,
      price: 194.0,
      amount: -19982
    },
    {
      batchId: 2,
      date: '2021-01-04',
      type: 'buy',
      ticker: 'TLT',
      quantity: 182,
      price: 88.0,
      amount: -16016
    },
    {
      batchId: 3,
      date: '2026-01-15',
      type: 'dividend',
      ticker: 'VT',
      amount: 415.3,
      qualified: true
    },
    { batchId: 4, date: '2026-04-14', type: 'fee', amount: -7.29, justification: 'Platform fee' }
  ]
}

export const transactionsMap: Record<string, TransactionsResponse> = {
  [PORTFOLIO_SLUG_1]: transactionsFixture1,
  [PORTFOLIO_SLUG_2]: transactionsFixture2,
  [PORTFOLIO_SLUG_3]: transactionsFixture3
}

// Holdings impact — mock. Numbers are hand-picked to tell a plausible
// concentration story (NVDA + TSLA punching above weight, BND a small
// drag, VTI the workhorse).
const holdingsImpactFixture1: HoldingsImpactResponse = {
  portfolioSlug: PORTFOLIO_SLUG_1,
  asOf: '2026-04-14',
  currency: 'USD',
  periods: [
    {
      period: 'inception',
      label: 'Since inception',
      startDate: '2015-01-02',
      endDate: '2026-04-14',
      years: 11.28,
      cumulativeReturn: 2.37,
      annualizedReturn: 0.1147,
      items: [
        { ticker: 'VTI', contribution: 0.45, avgWeight: 0.28, holdingDays: 4120 },
        { ticker: 'QQQ', contribution: 0.32, avgWeight: 0.18, holdingDays: 3890 },
        { ticker: 'NVDA', contribution: 0.3, avgWeight: 0.04, holdingDays: 2640 },
        { ticker: 'AAPL', contribution: 0.24, avgWeight: 0.07, holdingDays: 3900 },
        { ticker: 'MSFT', contribution: 0.2, avgWeight: 0.06, holdingDays: 3900 },
        { ticker: 'TSLA', contribution: 0.16, avgWeight: 0.03, holdingDays: 2100 },
        { ticker: 'GOOGL', contribution: 0.13, avgWeight: 0.05, holdingDays: 3900 },
        { ticker: 'AMZN', contribution: 0.12, avgWeight: 0.05, holdingDays: 3900 },
        { ticker: 'META', contribution: 0.09, avgWeight: 0.03, holdingDays: 3200 },
        { ticker: 'VEA', contribution: 0.08, avgWeight: 0.12, holdingDays: 4120 },
        { ticker: 'COST', contribution: 0.06, avgWeight: 0.03, holdingDays: 3500 },
        { ticker: 'UNH', contribution: 0.05, avgWeight: 0.03, holdingDays: 3200 },
        { ticker: 'JPM', contribution: 0.04, avgWeight: 0.03, holdingDays: 3100 },
        { ticker: 'JNJ', contribution: 0.02, avgWeight: 0.03, holdingDays: 4000 },
        { ticker: 'BND', contribution: -0.03, avgWeight: 0.08, holdingDays: 4120 }
      ],
      rest: { count: 14, contribution: 0.14 }
    },
    {
      period: '5y',
      label: 'Last 5 years',
      startDate: '2021-04-14',
      endDate: '2026-04-14',
      years: 5,
      cumulativeReturn: 0.82,
      annualizedReturn: 0.1274,
      items: [
        { ticker: 'VTI', contribution: 0.2, avgWeight: 0.28, holdingDays: 1825 },
        { ticker: 'QQQ', contribution: 0.15, avgWeight: 0.19, holdingDays: 1825 },
        { ticker: 'NVDA', contribution: 0.14, avgWeight: 0.05, holdingDays: 1825 },
        { ticker: 'MSFT', contribution: 0.1, avgWeight: 0.06, holdingDays: 1825 },
        { ticker: 'AAPL', contribution: 0.08, avgWeight: 0.07, holdingDays: 1825 },
        { ticker: 'META', contribution: 0.05, avgWeight: 0.03, holdingDays: 1620 },
        { ticker: 'GOOGL', contribution: 0.04, avgWeight: 0.05, holdingDays: 1825 },
        { ticker: 'AMZN', contribution: 0.03, avgWeight: 0.04, holdingDays: 1825 },
        { ticker: 'TSLA', contribution: 0.03, avgWeight: 0.03, holdingDays: 1825 },
        { ticker: 'VEA', contribution: 0.01, avgWeight: 0.11, holdingDays: 1825 },
        { ticker: 'BND', contribution: -0.02, avgWeight: 0.08, holdingDays: 1825 }
      ],
      rest: { count: 9, contribution: 0.01 }
    },
    {
      period: '3y',
      label: 'Last 3 years',
      startDate: '2023-04-14',
      endDate: '2026-04-14',
      years: 3,
      cumulativeReturn: 0.362,
      annualizedReturn: 0.1083,
      items: [
        { ticker: 'NVDA', contribution: 0.1, avgWeight: 0.05, holdingDays: 1095 },
        { ticker: 'VTI', contribution: 0.08, avgWeight: 0.28, holdingDays: 1095 },
        { ticker: 'QQQ', contribution: 0.07, avgWeight: 0.19, holdingDays: 1095 },
        { ticker: 'MSFT', contribution: 0.04, avgWeight: 0.06, holdingDays: 1095 },
        { ticker: 'META', contribution: 0.04, avgWeight: 0.03, holdingDays: 1095 },
        { ticker: 'AAPL', contribution: 0.03, avgWeight: 0.07, holdingDays: 1095 },
        { ticker: 'GOOGL', contribution: 0.02, avgWeight: 0.05, holdingDays: 1095 },
        { ticker: 'AMZN', contribution: 0.02, avgWeight: 0.04, holdingDays: 1095 },
        { ticker: 'COST', contribution: 0.01, avgWeight: 0.03, holdingDays: 1095 },
        { ticker: 'VEA', contribution: 0.01, avgWeight: 0.11, holdingDays: 1095 },
        { ticker: 'TSLA', contribution: -0.01, avgWeight: 0.03, holdingDays: 1095 },
        { ticker: 'BND', contribution: -0.02, avgWeight: 0.08, holdingDays: 1095 }
      ],
      rest: { count: 8, contribution: 0.022 }
    },
    {
      period: '1y',
      label: 'Last 12 months',
      startDate: '2025-04-14',
      endDate: '2026-04-14',
      years: 1,
      cumulativeReturn: 0.1832,
      annualizedReturn: 0.1832,
      items: [
        { ticker: 'NVDA', contribution: 0.058, avgWeight: 0.05, holdingDays: 365 },
        { ticker: 'VTI', contribution: 0.04, avgWeight: 0.28, holdingDays: 365 },
        { ticker: 'QQQ', contribution: 0.03, avgWeight: 0.19, holdingDays: 365 },
        { ticker: 'MSFT', contribution: 0.025, avgWeight: 0.06, holdingDays: 365 },
        { ticker: 'META', contribution: 0.02, avgWeight: 0.03, holdingDays: 365 },
        { ticker: 'AAPL', contribution: 0.018, avgWeight: 0.07, holdingDays: 365 },
        { ticker: 'GOOGL', contribution: 0.012, avgWeight: 0.05, holdingDays: 365 },
        { ticker: 'COST', contribution: 0.008, avgWeight: 0.03, holdingDays: 365 },
        { ticker: 'AMZN', contribution: 0.005, avgWeight: 0.04, holdingDays: 365 },
        { ticker: 'TSLA', contribution: -0.005, avgWeight: 0.03, holdingDays: 365 },
        { ticker: 'UNH', contribution: -0.012, avgWeight: 0.03, holdingDays: 365 }
      ],
      rest: { count: 9, contribution: 0.004 }
    }
  ]
}

export const holdingsImpactMap: Record<string, HoldingsImpactResponse> = {
  [PORTFOLIO_SLUG_1]: holdingsImpactFixture1,
  [PORTFOLIO_SLUG_2]: { ...holdingsImpactFixture1, portfolioSlug: PORTFOLIO_SLUG_2 },
  [PORTFOLIO_SLUG_3]: { ...holdingsImpactFixture1, portfolioSlug: PORTFOLIO_SLUG_3 }
}

// Factor analysis — mock. Story: a growth/momentum-tilted portfolio,
// underweight value and low-vol, slightly small-cap biased, positive
// alpha. Numbers are hand-picked to be internally consistent (R² and
// variance shares align, factor contribs + alpha ≈ total return).
// Replace with real /factors endpoint when backend ships.

interface FactorBuilder {
  factor: FactorKey
  portfolio: number
  benchmark: number
  returnContribution: number
  varianceShare: number
  tStat: number
  drift: number[] // exposure over time, 12 points
  driftOffset: number // ratio — current is drift[-1] + driftOffset baseline
  positive: { ticker: string; contribution: number }[]
  negative: { ticker: string; contribution: number }[]
}

function factorTimeSeries(drift: number[], startISO: string, endISO: string): FactorTimePoint[] {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  const n = drift.length
  const step = (end - start) / Math.max(1, n - 1)
  return drift.map((exposure, i) => ({
    date: new Date(start + step * i).toISOString().slice(0, 10),
    exposure
  }))
}

function buildFactorPeriod(
  period: FactorPeriodKey,
  label: string,
  startDate: string,
  endDate: string,
  years: number,
  totalReturn: number,
  alpha: number,
  idio: number,
  builders: FactorBuilder[]
): FactorPeriod {
  const sumVariance = builders.reduce((s, b) => s + b.varianceShare, 0)
  const rSquared = Math.max(0, Math.min(1, 1 - idio))
  return {
    period,
    label,
    startDate,
    endDate,
    years,
    totalReturn,
    alpha,
    rSquared,
    idiosyncraticShare: idio,
    factors: builders.map((b) => ({
      factor: b.factor,
      portfolio: b.portfolio,
      benchmark: b.benchmark,
      active: b.portfolio - b.benchmark,
      returnContribution: b.returnContribution,
      varianceShare: (b.varianceShare / sumVariance) * (1 - idio),
      tStat: b.tStat,
      timeSeries: factorTimeSeries(b.drift, startDate, endDate),
      positiveDrivers: b.positive,
      negativeDrivers: b.negative
    }))
  }
}

const factorFixture1: PortfolioFactorAnalysis = {
  periods: [
    buildFactorPeriod('1y', 'Last 12 months', '2025-04-14', '2026-04-14', 1, 0.1832, 0.041, 0.22, [
      {
        factor: 'market',
        portfolio: 0.92,
        benchmark: 1.0,
        returnContribution: 0.095,
        varianceShare: 0.48,
        tStat: 18.2,
        drift: [0.86, 0.88, 0.87, 0.9, 0.91, 0.89, 0.9, 0.92, 0.93, 0.92, 0.91, 0.92],
        driftOffset: 0,
        positive: [
          { ticker: 'VTI', contribution: 0.041 },
          { ticker: 'QQQ', contribution: 0.032 },
          { ticker: 'MSFT', contribution: 0.014 }
        ],
        negative: [
          { ticker: 'BND', contribution: -0.004 },
          { ticker: 'CASH', contribution: -0.001 }
        ]
      },
      {
        factor: 'size',
        portfolio: 0.08,
        benchmark: -0.1,
        returnContribution: 0.004,
        varianceShare: 0.06,
        tStat: 1.1,
        drift: [0.04, 0.03, 0.06, 0.07, 0.05, 0.06, 0.09, 0.1, 0.08, 0.08, 0.07, 0.08],
        driftOffset: 0,
        positive: [
          { ticker: 'VEA', contribution: 0.003 },
          { ticker: 'VTI', contribution: 0.002 }
        ],
        negative: [{ ticker: 'AAPL', contribution: -0.001 }]
      },
      {
        factor: 'value',
        portfolio: -0.41,
        benchmark: -0.1,
        returnContribution: -0.018,
        varianceShare: 0.08,
        tStat: -3.7,
        drift: [-0.28, -0.31, -0.33, -0.35, -0.38, -0.39, -0.4, -0.42, -0.43, -0.42, -0.41, -0.41],
        driftOffset: 0,
        positive: [
          { ticker: 'JPM', contribution: 0.002 },
          { ticker: 'UNH', contribution: 0.001 }
        ],
        negative: [
          { ticker: 'NVDA', contribution: -0.011 },
          { ticker: 'TSLA', contribution: -0.006 },
          { ticker: 'META', contribution: -0.004 }
        ]
      },
      {
        factor: 'momentum',
        portfolio: 0.42,
        benchmark: 0.05,
        returnContribution: 0.048,
        varianceShare: 0.14,
        tStat: 4.8,
        drift: [0.18, 0.22, 0.27, 0.3, 0.33, 0.35, 0.38, 0.4, 0.42, 0.43, 0.42, 0.42],
        driftOffset: 0,
        positive: [
          { ticker: 'NVDA', contribution: 0.024 },
          { ticker: 'META', contribution: 0.012 },
          { ticker: 'MSFT', contribution: 0.008 }
        ],
        negative: [{ ticker: 'TSLA', contribution: -0.003 }]
      },
      {
        factor: 'quality',
        portfolio: 0.28,
        benchmark: 0.08,
        returnContribution: 0.015,
        varianceShare: 0.09,
        tStat: 3.2,
        drift: [0.22, 0.21, 0.24, 0.26, 0.27, 0.27, 0.28, 0.29, 0.29, 0.28, 0.28, 0.28],
        driftOffset: 0,
        positive: [
          { ticker: 'MSFT', contribution: 0.006 },
          { ticker: 'AAPL', contribution: 0.004 },
          { ticker: 'COST', contribution: 0.003 }
        ],
        negative: [{ ticker: 'TSLA', contribution: -0.002 }]
      },
      {
        factor: 'lowvol',
        portfolio: -0.22,
        benchmark: 0.0,
        returnContribution: -0.003,
        varianceShare: 0.15,
        tStat: -2.4,
        drift: [-0.15, -0.16, -0.18, -0.2, -0.21, -0.2, -0.21, -0.23, -0.22, -0.22, -0.22, -0.22],
        driftOffset: 0,
        positive: [{ ticker: 'BND', contribution: 0.002 }],
        negative: [
          { ticker: 'NVDA', contribution: -0.003 },
          { ticker: 'TSLA', contribution: -0.002 }
        ]
      }
    ]),
    buildFactorPeriod('3y', 'Last 3 years', '2023-04-14', '2026-04-14', 3, 0.362, 0.062, 0.25, [
      {
        factor: 'market',
        portfolio: 0.9,
        benchmark: 1.0,
        returnContribution: 0.18,
        varianceShare: 0.5,
        tStat: 24.1,
        drift: [0.82, 0.84, 0.85, 0.86, 0.88, 0.9, 0.89, 0.9, 0.91, 0.9, 0.9, 0.9],
        driftOffset: 0,
        positive: [
          { ticker: 'VTI', contribution: 0.08 },
          { ticker: 'QQQ', contribution: 0.055 }
        ],
        negative: [{ ticker: 'BND', contribution: -0.008 }]
      },
      {
        factor: 'size',
        portfolio: 0.1,
        benchmark: -0.1,
        returnContribution: 0.009,
        varianceShare: 0.05,
        tStat: 1.6,
        drift: [0.04, 0.06, 0.07, 0.08, 0.08, 0.09, 0.1, 0.11, 0.1, 0.1, 0.1, 0.1],
        driftOffset: 0,
        positive: [{ ticker: 'VEA', contribution: 0.006 }],
        negative: []
      },
      {
        factor: 'value',
        portfolio: -0.35,
        benchmark: -0.1,
        returnContribution: -0.032,
        varianceShare: 0.09,
        tStat: -5.1,
        drift: [-0.22, -0.25, -0.28, -0.3, -0.32, -0.33, -0.34, -0.35, -0.36, -0.35, -0.35, -0.35],
        driftOffset: 0,
        positive: [{ ticker: 'UNH', contribution: 0.004 }],
        negative: [
          { ticker: 'NVDA', contribution: -0.02 },
          { ticker: 'TSLA', contribution: -0.01 }
        ]
      },
      {
        factor: 'momentum',
        portfolio: 0.38,
        benchmark: 0.04,
        returnContribution: 0.08,
        varianceShare: 0.15,
        tStat: 6.2,
        drift: [0.2, 0.24, 0.28, 0.3, 0.32, 0.34, 0.36, 0.37, 0.38, 0.39, 0.38, 0.38],
        driftOffset: 0,
        positive: [
          { ticker: 'NVDA', contribution: 0.042 },
          { ticker: 'META', contribution: 0.02 }
        ],
        negative: []
      },
      {
        factor: 'quality',
        portfolio: 0.3,
        benchmark: 0.08,
        returnContribution: 0.028,
        varianceShare: 0.09,
        tStat: 4.1,
        drift: [0.22, 0.24, 0.25, 0.27, 0.28, 0.29, 0.29, 0.3, 0.3, 0.3, 0.3, 0.3],
        driftOffset: 0,
        positive: [
          { ticker: 'MSFT', contribution: 0.011 },
          { ticker: 'AAPL', contribution: 0.008 }
        ],
        negative: []
      },
      {
        factor: 'lowvol',
        portfolio: -0.2,
        benchmark: 0.0,
        returnContribution: -0.006,
        varianceShare: 0.12,
        tStat: -3.1,
        drift: [-0.12, -0.14, -0.16, -0.18, -0.19, -0.2, -0.2, -0.21, -0.2, -0.2, -0.2, -0.2],
        driftOffset: 0,
        positive: [],
        negative: [{ ticker: 'NVDA', contribution: -0.005 }]
      }
    ]),
    buildFactorPeriod('5y', 'Last 5 years', '2021-04-14', '2026-04-14', 5, 0.82, 0.095, 0.28, [
      {
        factor: 'market',
        portfolio: 0.88,
        benchmark: 1.0,
        returnContribution: 0.42,
        varianceShare: 0.52,
        tStat: 28.5,
        drift: [0.85, 0.86, 0.87, 0.87, 0.88, 0.89, 0.88, 0.88, 0.89, 0.88, 0.88, 0.88],
        driftOffset: 0,
        positive: [
          { ticker: 'VTI', contribution: 0.18 },
          { ticker: 'QQQ', contribution: 0.14 }
        ],
        negative: [{ ticker: 'BND', contribution: -0.015 }]
      },
      {
        factor: 'size',
        portfolio: 0.12,
        benchmark: -0.1,
        returnContribution: 0.02,
        varianceShare: 0.05,
        tStat: 2.0,
        drift: [0.08, 0.09, 0.1, 0.11, 0.12, 0.12, 0.12, 0.13, 0.12, 0.12, 0.12, 0.12],
        driftOffset: 0,
        positive: [{ ticker: 'VEA', contribution: 0.012 }],
        negative: []
      },
      {
        factor: 'value',
        portfolio: -0.3,
        benchmark: -0.1,
        returnContribution: -0.045,
        varianceShare: 0.08,
        tStat: -5.8,
        drift: [-0.2, -0.22, -0.25, -0.27, -0.28, -0.29, -0.3, -0.3, -0.31, -0.3, -0.3, -0.3],
        driftOffset: 0,
        positive: [{ ticker: 'JPM', contribution: 0.006 }],
        negative: [
          { ticker: 'NVDA', contribution: -0.03 },
          { ticker: 'TSLA', contribution: -0.015 }
        ]
      },
      {
        factor: 'momentum',
        portfolio: 0.34,
        benchmark: 0.04,
        returnContribution: 0.16,
        varianceShare: 0.15,
        tStat: 7.4,
        drift: [0.22, 0.25, 0.28, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.34, 0.34, 0.34],
        driftOffset: 0,
        positive: [
          { ticker: 'NVDA', contribution: 0.082 },
          { ticker: 'META', contribution: 0.04 }
        ],
        negative: []
      },
      {
        factor: 'quality',
        portfolio: 0.32,
        benchmark: 0.08,
        returnContribution: 0.055,
        varianceShare: 0.08,
        tStat: 4.6,
        drift: [0.24, 0.26, 0.27, 0.29, 0.3, 0.31, 0.32, 0.32, 0.32, 0.32, 0.32, 0.32],
        driftOffset: 0,
        positive: [
          { ticker: 'MSFT', contribution: 0.022 },
          { ticker: 'AAPL', contribution: 0.018 }
        ],
        negative: []
      },
      {
        factor: 'lowvol',
        portfolio: -0.18,
        benchmark: 0.0,
        returnContribution: -0.01,
        varianceShare: 0.12,
        tStat: -3.6,
        drift: [-0.1, -0.12, -0.14, -0.16, -0.17, -0.18, -0.18, -0.19, -0.18, -0.18, -0.18, -0.18],
        driftOffset: 0,
        positive: [],
        negative: [{ ticker: 'NVDA', contribution: -0.008 }]
      }
    ]),
    buildFactorPeriod(
      'inception',
      'Since inception',
      '2015-01-02',
      '2026-04-14',
      11.28,
      2.37,
      0.22,
      0.3,
      [
        {
          factor: 'market',
          portfolio: 0.91,
          benchmark: 1.0,
          returnContribution: 1.2,
          varianceShare: 0.54,
          tStat: 42.1,
          drift: [0.82, 0.83, 0.85, 0.86, 0.87, 0.88, 0.89, 0.9, 0.91, 0.91, 0.91, 0.91],
          driftOffset: 0,
          positive: [
            { ticker: 'VTI', contribution: 0.48 },
            { ticker: 'QQQ', contribution: 0.38 }
          ],
          negative: [{ ticker: 'BND', contribution: -0.04 }]
        },
        {
          factor: 'size',
          portfolio: 0.14,
          benchmark: -0.1,
          returnContribution: 0.08,
          varianceShare: 0.06,
          tStat: 3.1,
          drift: [0.06, 0.08, 0.09, 0.1, 0.11, 0.12, 0.12, 0.13, 0.14, 0.14, 0.14, 0.14],
          driftOffset: 0,
          positive: [{ ticker: 'VEA', contribution: 0.042 }],
          negative: []
        },
        {
          factor: 'value',
          portfolio: -0.25,
          benchmark: -0.1,
          returnContribution: -0.08,
          varianceShare: 0.07,
          tStat: -6.5,
          drift: [
            -0.15, -0.17, -0.19, -0.21, -0.22, -0.23, -0.24, -0.25, -0.26, -0.25, -0.25, -0.25
          ],
          driftOffset: 0,
          positive: [{ ticker: 'JPM', contribution: 0.012 }],
          negative: [
            { ticker: 'NVDA', contribution: -0.06 },
            { ticker: 'TSLA', contribution: -0.02 }
          ]
        },
        {
          factor: 'momentum',
          portfolio: 0.3,
          benchmark: 0.04,
          returnContribution: 0.34,
          varianceShare: 0.13,
          tStat: 9.2,
          drift: [0.2, 0.22, 0.24, 0.26, 0.28, 0.29, 0.3, 0.31, 0.32, 0.31, 0.3, 0.3],
          driftOffset: 0,
          positive: [
            { ticker: 'NVDA', contribution: 0.18 },
            { ticker: 'MSFT', contribution: 0.08 }
          ],
          negative: []
        },
        {
          factor: 'quality',
          portfolio: 0.34,
          benchmark: 0.08,
          returnContribution: 0.18,
          varianceShare: 0.08,
          tStat: 5.4,
          drift: [0.24, 0.26, 0.28, 0.3, 0.31, 0.32, 0.33, 0.34, 0.34, 0.34, 0.34, 0.34],
          driftOffset: 0,
          positive: [
            { ticker: 'MSFT', contribution: 0.07 },
            { ticker: 'AAPL', contribution: 0.055 }
          ],
          negative: []
        },
        {
          factor: 'lowvol',
          portfolio: -0.15,
          benchmark: 0.0,
          returnContribution: -0.04,
          varianceShare: 0.12,
          tStat: -4.2,
          drift: [
            -0.08, -0.1, -0.12, -0.13, -0.14, -0.14, -0.15, -0.15, -0.16, -0.15, -0.15, -0.15
          ],
          driftOffset: 0,
          positive: [],
          negative: [{ ticker: 'NVDA', contribution: -0.03 }]
        }
      ]
    )
  ]
}

export const factorMap: Record<string, PortfolioFactorAnalysis> = {
  [PORTFOLIO_SLUG_1]: factorFixture1,
  [PORTFOLIO_SLUG_2]: factorFixture1,
  [PORTFOLIO_SLUG_3]: factorFixture1
}

export const summaryMap: Record<string, PortfolioSummary> = {
  [PORTFOLIO_SLUG_1]: summaryFixture1,
  [PORTFOLIO_SLUG_2]: summaryFixture2,
  [PORTFOLIO_SLUG_3]: summaryFixture3
}

export const drawdownsMap: Record<string, Drawdown[]> = {
  [PORTFOLIO_SLUG_1]: drawdownsFixture1,
  [PORTFOLIO_SLUG_2]: drawdownsFixture2,
  [PORTFOLIO_SLUG_3]: drawdownsFixture3
}

export const statisticsMap: Record<string, PortfolioStatistic[]> = {
  [PORTFOLIO_SLUG_1]: statisticsFixture1,
  [PORTFOLIO_SLUG_2]: statisticsFixture2,
  [PORTFOLIO_SLUG_3]: statisticsFixture3
}

export const trailingReturnsMap: Record<string, TrailingReturnRow[]> = {
  [PORTFOLIO_SLUG_1]: trailingReturnsFixture1,
  [PORTFOLIO_SLUG_2]: trailingReturnsFixture2,
  [PORTFOLIO_SLUG_3]: trailingReturnsFixture3
}

export const metricsFixture1: PortfolioMetrics = {
  windows: ['since_inception'],
  risk: {
    UpsideCaptureRatio: [1.08],
    DownsideCaptureRatio: [0.81]
  }
}

export const metricsMap: Record<string, PortfolioMetrics> = {
  [PORTFOLIO_SLUG_1]: metricsFixture1
}

export { PORTFOLIO_SLUG_1, PORTFOLIO_SLUG_2, PORTFOLIO_SLUG_3 }

// =====================================================================
// Strategy registry fixtures — mocks GET /strategies. Spread across the
// risk/return plane so the scatter on the Strategies page has shape.
// =====================================================================

export const strategyListFixture: Strategy[] = [
  {
    shortCode: 'adm',
    repoOwner: 'penny-vault',
    repoName: 'adaptive-momentum',
    cloneUrl: 'https://github.com/penny-vault/adaptive-momentum',
    isOfficial: true,
    description: 'Dual-momentum rotation across global equity and bond sleeves.',
    categories: ['momentum', 'tactical'],
    stars: 184,
    installState: 'ready',
    installedVer: 'v1.4.2',
    installedAt: '2026-02-12T18:24:00Z',
    cagr: 0.1147,
    sharpe: 1.24,
    maxDrawDown: -0.3387,
    describe: {
      shortCode: 'adm',
      name: 'Adaptive Momentum',
      description: 'Dual-momentum rotation across global equity and bond sleeves.',
      parameters: [
        { name: 'lookback', type: 'int', default: 12, description: 'Lookback period in months' },
        { name: 'top_n', type: 'int', default: 3, description: 'Number of top assets to hold' },
        {
          name: 'rebalance_threshold',
          type: 'float',
          default: 0.05,
          description: 'Minimum drift before rebalancing'
        }
      ],
      presets: [
        { name: 'default', parameters: { lookback: 12, top_n: 3, rebalance_threshold: 0.05 } },
        { name: 'aggressive', parameters: { lookback: 6, top_n: 5, rebalance_threshold: 0.02 } }
      ],
      schedule: '0 16 * * 1-5',
      benchmark: 'SPY'
    }
  },
  {
    shortCode: 'tec',
    repoOwner: 'penny-vault',
    repoName: 'tax-efficient-core',
    cloneUrl: 'https://github.com/penny-vault/tax-efficient-core',
    isOfficial: true,
    description: 'Tax-aware bond ladder with tilt to short-duration TIPS.',
    categories: ['fixed-income', 'tax'],
    stars: 92,
    installState: 'ready',
    installedVer: 'v0.9.0',
    installedAt: '2025-11-04T16:10:00Z',
    cagr: 0.0318,
    sharpe: 0.62,
    maxDrawDown: -0.0843
  },
  {
    shortCode: 'gtaw',
    repoOwner: 'penny-vault',
    repoName: 'global-tactical-all-weather',
    cloneUrl: 'https://github.com/penny-vault/global-tactical-all-weather',
    isOfficial: true,
    description: 'Risk-parity tilt across global equity, gold, and long bonds.',
    categories: ['tactical', 'risk-parity'],
    stars: 118,
    installState: 'ready',
    installedVer: 'v2.1.0',
    installedAt: '2026-01-21T12:00:00Z',
    cagr: 0.0891,
    sharpe: 0.94,
    maxDrawDown: -0.1892
  },
  {
    shortCode: 'lvm',
    repoOwner: 'penny-vault',
    repoName: 'low-vol-minvar',
    cloneUrl: 'https://github.com/penny-vault/low-vol-minvar',
    isOfficial: true,
    description: 'Minimum-variance large-cap selection rebalanced quarterly.',
    categories: ['low-vol', 'factor'],
    stars: 67,
    installState: 'ready',
    installedVer: 'v1.0.3',
    installedAt: '2025-09-30T20:42:00Z',
    cagr: 0.0712,
    sharpe: 1.08,
    maxDrawDown: -0.1421
  },
  {
    shortCode: 'qtm',
    repoOwner: 'kfinch',
    repoName: 'quality-momentum',
    cloneUrl: 'https://github.com/kfinch/quality-momentum',
    isOfficial: false,
    ownerSub: 'auth0|user-kfinch',
    description: 'Quality-screened US large-cap momentum, monthly rebalance.',
    categories: ['momentum', 'quality'],
    stars: 41,
    installState: 'ready',
    installedVer: 'v0.6.1',
    installedAt: '2026-03-08T14:30:00Z',
    cagr: 0.1284,
    sharpe: 1.41,
    maxDrawDown: -0.271
  },
  {
    shortCode: 'cgr',
    repoOwner: 'penny-vault',
    repoName: 'crisis-gold-regime',
    cloneUrl: 'https://github.com/penny-vault/crisis-gold-regime',
    isOfficial: true,
    description: 'Switches to gold and long Treasuries when SPY breaks 200-day.',
    categories: ['regime', 'defensive'],
    stars: 53,
    installState: 'ready',
    installedVer: 'v1.2.0',
    installedAt: '2026-02-28T09:15:00Z',
    cagr: 0.0584,
    sharpe: 0.71,
    maxDrawDown: -0.0987
  },
  {
    shortCode: 'sml',
    repoOwner: 'penny-vault',
    repoName: 'small-cap-leaders',
    cloneUrl: 'https://github.com/penny-vault/small-cap-leaders',
    isOfficial: true,
    description: 'High-momentum small-cap basket, weekly rebalance.',
    categories: ['momentum', 'small-cap'],
    stars: 38,
    installState: 'ready',
    installedVer: 'v0.4.0',
    installedAt: '2026-03-19T11:00:00Z',
    cagr: 0.1612,
    sharpe: 0.98,
    maxDrawDown: -0.3812
  },
  {
    shortCode: 'div',
    repoOwner: 'penny-vault',
    repoName: 'dividend-growers',
    cloneUrl: 'https://github.com/penny-vault/dividend-growers',
    isOfficial: true,
    description: 'Long-tenure dividend growers screened on payout coverage.',
    categories: ['dividend', 'value'],
    stars: 72,
    installState: 'ready',
    installedVer: 'v1.1.0',
    installedAt: '2025-12-05T17:50:00Z',
    cagr: 0.0826,
    sharpe: 0.89,
    maxDrawDown: -0.2114
  },
  {
    shortCode: 'eml',
    repoOwner: 'penny-vault',
    repoName: 'em-leaders',
    cloneUrl: 'https://github.com/penny-vault/em-leaders',
    isOfficial: true,
    description: 'Top-quintile emerging market country rotation.',
    categories: ['momentum', 'em'],
    stars: 29,
    installState: 'installing',
    installedVer: null,
    lastAttemptedVer: 'v0.2.0',
    cagr: null,
    sharpe: null,
    maxDrawDown: null
  },
  {
    shortCode: 'expr',
    repoOwner: 'rgreen',
    repoName: 'experimental-vol-targeting',
    cloneUrl: 'https://github.com/rgreen/experimental-vol-targeting',
    isOfficial: false,
    ownerSub: 'auth0|user-rgreen',
    description: 'Vol-targeted leveraged equity sleeve. Author marked experimental.',
    categories: ['volatility', 'leverage'],
    stars: 7,
    installState: 'failed',
    installedVer: null,
    lastAttemptedVer: 'v0.1.0',
    installError: 'pvbt build failed: missing parameter `targetVol`',
    cagr: null,
    sharpe: null,
    maxDrawDown: null
  }
]

export const securityFixtures: SecurityResult[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { ticker: 'VEA', name: 'Vanguard FTSE Developed Markets ETF' },
  { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
  { ticker: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF' },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF' },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF' },
  { ticker: 'ACWI', name: 'iShares MSCI ACWI ETF' },
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'META', name: 'Meta Platforms Inc.' }
]

export const alertsMap: Record<string, Alert[]> = {
  [PORTFOLIO_SLUG_1]: [
    {
      id: '7d3c1b40-1111-4f00-8000-000000000001',
      portfolioId: '00000000-0000-4000-8000-000000000001',
      frequency: 'weekly',
      recipients: ['jeremy@fergason.me'],
      lastSentAt: '2026-04-19T12:00:00Z'
    },
    {
      id: '7d3c1b40-1111-4f00-8000-000000000002',
      portfolioId: '00000000-0000-4000-8000-000000000001',
      frequency: 'scheduled_run',
      recipients: ['jeremy@fergason.me', 'cpa@example.com'],
      lastSentAt: '2026-04-14T21:00:30Z'
    }
  ],
  [PORTFOLIO_SLUG_2]: [
    {
      id: '7d3c1b40-2222-4f00-8000-000000000001',
      portfolioId: '00000000-0000-4000-8000-000000000002',
      frequency: 'monthly',
      recipients: ['jeremy@fergason.me'],
      lastSentAt: '2026-04-01T12:00:00Z'
    }
  ],
  [PORTFOLIO_SLUG_3]: []
}
