// src/composables/usePortfolioReturns.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { PortfolioPerformance } from '@/api/endpoints/portfolios'
import {
  toMonthly,
  toAnnual,
  rollingCAGR,
  rollingExcess,
  linearRegression,
  returnStats,
  toDrawdownSeries,
  type AnnualReturn,
  type DrawdownPoint,
  type MonthlyReturn,
  type Regression,
  type ReturnStats,
  type RollingExcessPoint,
  type RollingPoint,
  type ScatterPoint
} from '@/util/returns'

export interface PortfolioReturnsDerived {
  monthly: MonthlyReturn[]
  annual: AnnualReturn[]
  rolling: {
    oneYear: RollingPoint[]
    threeYear: RollingPoint[]
    fiveYear: RollingPoint[]
    excess12M: RollingExcessPoint[]
    excess36M: RollingExcessPoint[]
    excess60M: RollingExcessPoint[]
  }
  scatter: ScatterPoint[]
  regression: Regression
  stats: ReturnStats
  drawdowns: DrawdownPoint[]
}

export function usePortfolioReturns(
  measurements: Ref<PortfolioPerformance | undefined>
): ComputedRef<PortfolioReturnsDerived | null> {
  return computed<PortfolioReturnsDerived | null>(() => {
    const m = measurements.value
    if (!m || !m.points || m.points.length === 0) return null
    const days = m.points.map((p) => ({
      date: p.date,
      portfolioValue: p.portfolioValue,
      benchmarkValue: p.benchmarkValue
    }))
    const monthly = toMonthly(days)
    const annual = toAnnual(days)
    const scatter: ScatterPoint[] = monthly.map((mr) => ({ x: mr.benchmark, y: mr.portfolio }))
    return {
      monthly,
      annual,
      rolling: {
        oneYear: rollingCAGR(monthly, 12),
        threeYear: rollingCAGR(monthly, 36),
        fiveYear: rollingCAGR(monthly, 60),
        excess12M: rollingExcess(monthly, 12),
        excess36M: rollingExcess(monthly, 36),
        excess60M: rollingExcess(monthly, 60)
      },
      scatter,
      regression: linearRegression(scatter),
      stats: returnStats(monthly, annual),
      drawdowns: toDrawdownSeries(days)
    }
  })
}
