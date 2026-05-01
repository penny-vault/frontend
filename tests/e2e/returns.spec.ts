import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio Returns', () => {
  test('tab navigation from summary to returns', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Returns' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/returns$`), {
      timeout: 5_000
    })
  })

  test('renders stats, heatmap, and annual list', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/returns`)
    await expect(page.locator('.pr-kpis .kpi')).toHaveCount(6, { timeout: 10_000 })
    await expect(page.locator('.heatmap-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.arl li').first()).toBeVisible()
  })

  test('hovering an annual row highlights it', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/returns`)
    const firstRow = page.locator('.arl li').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })
    await firstRow.hover()
    await expect(page.locator('.arl li.is-dimmed').first()).toBeVisible({ timeout: 2_000 })
  })
})
