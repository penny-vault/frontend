import { test, expect } from '@playwright/test'

const DEMO_ID = 'adm-growth-mk01'

test.describe('Portfolio Holdings', () => {
  test('tab navigation from summary to holdings', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Growth Sleeve/, {
      timeout: 10_000
    })
    await page.getByRole('link', { name: 'Holdings' }).click()
    await expect(page).toHaveURL(new RegExp(`/portfolios/${DEMO_ID}/holdings$`), {
      timeout: 5_000
    })
  })

  test('renders grid, detail, and frequency panels', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/holdings`)
    // RevoGrid renders a <revo-grid> custom element
    await expect(page.locator('.revo-wrap revo-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.hdp-title')).toContainText('Holdings detail for')
    // Frequency chart is now a list, not a canvas
    await expect(page.locator('.freq .freq-row').first()).toBeVisible({ timeout: 10_000 })
  })

  test('calculator dialog opens with snapshot rows', async ({ page }) => {
    await page.goto(`/portfolios/${DEMO_ID}/holdings`)
    await page.getByRole('button', { name: /open holdings calculator/i }).click()
    await expect(page.locator('.p-dialog')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.p-dialog .hcalc-row').first()).toBeVisible()
  })
})
