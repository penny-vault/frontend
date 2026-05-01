import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { usePortfolioRisk } from '@/composables/usePortfolioRisk'
import type { Portfolio, PortfolioPerformance, Drawdown } from '@/api/endpoints/portfolios'

function fakePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    slug: 'p1',
    name: 'Test',
    benchmark: 'SPY',
    strategyCode: 'test-strategy',
    strategyCloneUrl: 'https://example.com/strategy.git',
    parameters: {},
    status: 'ready',
    createdAt: '2023-01-01T00:00:00Z',
    lastUpdated: '2024-06-01T00:00:00Z',
    ...overrides
  } as Portfolio
}

const defaultDrawdowns: Drawdown[] = [
  { start: '2023-03-01', trough: '2023-04-01', recovery: '2023-06-01', depth: -0.05, days: 92 },
  { start: '2024-01-01', trough: '2024-02-15', recovery: '2024-04-30', depth: -0.08, days: 120 }
]

describe('usePortfolioRisk', () => {
  it('returns null when inputs are missing', () => {
    const p = ref<Portfolio | undefined>(undefined)
    const m = ref<PortfolioPerformance | undefined>(undefined)
    const d = ref<Drawdown[] | undefined>(undefined)
    expect(usePortfolioRisk(p, m, d).value).toBeNull()
  })

  it('derives winLoss, capture, episodes, crisisEpisodes, volGauge, verdict', () => {
    const p = ref<Portfolio | undefined>(fakePortfolio())
    // 18 monthly anchors to get a rolling-vol series of 7 points (18 - 12 + 1 = 7)
    const points = Array.from({ length: 18 }, (_, i) => {
      const y = 2023 + Math.floor(i / 12)
      const mo = (i % 12) + 1
      const date = `${y}-${String(mo).padStart(2, '0')}-28`
      return {
        date,
        portfolioValue: 100 * (1 + (i % 2 === 0 ? 0.02 : -0.01)) ** i,
        benchmarkValue: 100 * (1 + (i % 2 === 0 ? 0.015 : -0.005)) ** i
      }
    })
    const m = ref<PortfolioPerformance | undefined>({
      portfolioSlug: 'p1',
      from: '2023-01-28',
      to: '2024-06-28',
      points
    })
    const d = ref<Drawdown[] | undefined>(defaultDrawdowns)
    const result = usePortfolioRisk(p, m, d).value
    expect(result).not.toBeNull()
    expect(result!.winLoss.total).toBeGreaterThan(0)
    expect(result!.capture.up).not.toBeNull()
    expect(Number.isFinite(result!.capture.up)).toBe(true)
    expect(result!.capture.down).not.toBeNull()
    expect(Number.isFinite(result!.capture.down)).toBe(true)
    expect(result!.episodes).toHaveLength(2)
    expect(result!.episodes[0]!.recoveryDays).toBeGreaterThan(0)
    expect(result!.crisisEpisodes.length).toBeGreaterThan(0)
    expect(result!.crisisEpisodes[0]!.days.length).toBeGreaterThan(0)
    expect(result!.volGauge.history.length).toBeGreaterThan(0)
    expect(result!.volGauge.percentile).toBeGreaterThanOrEqual(0)
    expect(result!.volGauge.percentile).toBeLessThanOrEqual(100)
    expect(result!.verdict.benchmarkVol).toBeGreaterThan(0)
    expect(result!.verdict.pctLosingMonths).toBeGreaterThanOrEqual(0)
  })

  it('skips drawdowns that have not yet recovered', () => {
    const p = ref<Portfolio | undefined>(fakePortfolio())
    const m = ref<PortfolioPerformance | undefined>({
      portfolioSlug: 'p1',
      from: '2024-01-01',
      to: '2024-04-01',
      points: [
        { date: '2024-01-01', portfolioValue: 100, benchmarkValue: 100 },
        { date: '2024-04-01', portfolioValue: 80, benchmarkValue: 90 }
      ]
    })
    const d = ref<Drawdown[] | undefined>([
      { start: '2024-01-01', trough: '2024-03-01', recovery: null, depth: -0.2, days: 120 }
    ])
    const result = usePortfolioRisk(p, m, d).value
    expect(result!.episodes).toHaveLength(0)
    expect(result!.crisisEpisodes).toHaveLength(0)
  })

  it('returns null capture when no up or down benchmark months exist', () => {
    const p = ref<Portfolio | undefined>(fakePortfolio())
    // All benchmark returns are exactly 0
    const m = ref<PortfolioPerformance | undefined>({
      portfolioSlug: 'p1',
      from: '2024-01-01',
      to: '2024-03-01',
      points: [
        { date: '2024-01-31', portfolioValue: 100, benchmarkValue: 100 },
        { date: '2024-02-29', portfolioValue: 105, benchmarkValue: 100 },
        { date: '2024-03-31', portfolioValue: 110, benchmarkValue: 100 }
      ]
    })
    const d = ref<Drawdown[] | undefined>([])
    const result = usePortfolioRisk(p, m, d).value
    expect(result!.capture.up).toBeNull()
    expect(result!.capture.down).toBeNull()
  })
})
