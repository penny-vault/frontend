import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio vs. Benchmark', () => {
  test('tab navigation from summary to vs. Benchmark', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'vs. Benchmark' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/vs-benchmark$`), {
      timeout: 5_000
    })
  })

  test('renders stats, rolling excess, distribution, and scatter', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/vs-benchmark`)
    await expect(page.locator('.pvb-kpis .kpi')).toHaveCount(6, { timeout: 10_000 })
    await expect(page.locator('.rex-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.rdc-chart canvas')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.rsc-chart canvas')).toBeVisible({ timeout: 10_000 })
  })

  test('how-to-read dialog opens and closes', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/vs-benchmark`)
    await expect(page.locator('.rex-chart canvas')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /how to read this chart/i }).first().click()
    await expect(page.locator('.p-dialog')).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('.p-dialog')).not.toBeVisible()
  })
})
