import { colfer } from '../../assets/colfer.js'

export const NoNotify = 0x00000001
export const Daily = 0x00000010
export const Weekly = 0x00000100
export const Monthly = 0x00001000
export const Annually = 0x00010000

export const emptyHoldings = {
  Items: []
}

export const emptyPerformance = {
  periodStart: new Date(),
  periodEnd: new Date(),
  computedOn: new Date(),
  measurements: [
    {
      time: 0,
      value: 0,
      riskFreeValue: 0,
      holdings: '',
      percentReturn: 0,
      justification: {
      }
    }
  ],
  transactions: [
    {
      date: '1982-07-27T00:00:00.000Z',
      ticker: '$CASH',
      kind: 'DEPOSIT',
      pricePerShare: 1,
      shares: 0,
      totalValue: 0,
      justification: {
      }
    }
  ],
  cagrSinceInception: 0,
  ytdReturn: 0,
  currentAsset: '',
  currentAssets: [],
  totalDeposited: 0,
  totalWithdrawn: 0,
  metrics: {
    cagrs: {
      '1-yr': 0,
      '3-yr': 0,
      '5-yr': 0,
      '10-yr': 0
    },
    drawDowns: [
      {
        begin: 0,
        end: 0,
        recovery: 0,
        lossPercent: 0
      }
    ],
    sharpeRatio: 0,
    sortinoRatio: 0,
    stdDev: 0,
    ulcerIndexAvg: 0
  },
  maxDrawDown: 0
}

export const emptyMeasurements = colfer.PerformanceMeasurementItemList()

export const emptyMetrics = {
  finalBalance: {
    name: 'Final Balance',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  totalDeposited: {
    name: 'Total Deposited',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  totalWithdrawn: {
    name: 'Total Withdrawn',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  stdDev: {
    name: 'Std. Dev.',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  bestYear: {
    name: 'Best Year',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  worstYear: {
    name: 'Worst Year',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  taxCostRatio: {
    name: 'Tax Cost',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  sharpeRatio: {
    name: 'Sharpe Ratio',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  sortinoRatio: {
    name: 'Sortino Ratio',
    portfolioValue: 0,
    benchmarkValue: 0
  },
  ulcerIndex: {
    name: 'Ulcer Index',
    portfolioValue: 0,
    benchmarkValue: 0
  }
}

export const emptyPortfolio = {
  id: '',
  name: '',
  strategy: '',
  lastfetch: new Date(0),
  arguments: {
  },
  startDate: '1982-07-27T00:00:00.000Z',
  ytdReturn: {
    Float: 0.0,
    Status: 0
  },
  cagrSinceInception: {
    Float: 0.0,
    Status: 0
  },
  notifications: 0,
  created: 0,
  lastChanged: '1982-07-27T00:00:00.000Z',
  performance: emptyPerformance,
  benchmark: emptyPerformance
}
