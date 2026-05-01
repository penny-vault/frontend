import { test, expect } from '@playwright/test'

const DEMO_ID = '00000000-0000-4000-a000-000000000001'

test.describe('Portfolio Summary', () => {
  test('renders the page shell with KPIs and chart', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Growth Sleeve|Penny Vault/,
      { timeout: 10_000 }
    )

    const kpis = page.locator('.kpi')
    await expect(kpis).toHaveCount(6, { timeout: 5_000 })

    await expect(page.locator('.chart canvas')).toBeVisible({ timeout: 5_000 })
  })

  test('theme toggle switches page class', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    const root = page.locator('.d-root')
    await expect(root).toBeVisible({ timeout: 5_000 })
    const before = await root.getAttribute('class')

    await page.getByRole('button', { name: /switch to (dark|light) mode/i }).click()

    const after = await root.getAttribute('class')
    expect(after).not.toBe(before)
  })
})
