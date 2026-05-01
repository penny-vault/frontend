// tests/e2e/risk.spec.ts
import { test, expect } from '@playwright/test'

const DEMO_ID = 'adm-growth-mk01'

test.describe('Portfolio Risk', () => {
  test('tab navigation from summary to risk', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Risk' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/risk$`), {
      timeout: 5_000
    })
  })

  test('renders KPI strip and the main risk visuals', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/risk`)
    // KPI strip — 6 flippable kpi wrappers
    await expect(page.locator('.prr-kpis .fk-scene')).toHaveCount(6, { timeout: 10_000 })
    // Sortino gauge inside a KpiCard
    await expect(page.locator('.sg-chart canvas')).toBeVisible({ timeout: 10_000 })
    // Holdings attribution — rows rendered
    await expect(page.locator('.hac-row').first()).toBeVisible({ timeout: 10_000 })
    // Monthly contribution — list-based chart with rows
    await expect(page.locator('.mcc .mcc-rows')).toBeVisible({ timeout: 10_000 })
    // Crisis small-multiples — at least one item
    await expect(page.locator('.csm-item').first()).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a holding row toggles the without-that-holding view', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/risk`)
    const firstRow = page.locator('.hac-row').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })
    await firstRow.click()
    await expect(page.locator('.hac-row-removed')).toHaveCount(1)
    await expect(page.locator('.hac-summary-value-adj').first()).toBeVisible()
    // Click again to deselect
    await firstRow.click()
    await expect(page.locator('.hac-row-removed')).toHaveCount(0)
  })
})
