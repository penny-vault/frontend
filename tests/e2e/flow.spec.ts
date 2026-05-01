import { test, expect } from '@playwright/test'

test.describe('Login → List → Summary flow', () => {
  test('splash page shows login button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.splash-heading')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.splash-login')).toContainText(/login/i)
  })

  test('clicking login navigates to portfolio list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.splash-login').click()
    await expect(page).toHaveURL(/\/portfolios$/, { timeout: 5_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Portfolios', {
      timeout: 5_000
    })
  })

  test('portfolio list shows cards and navigates to detail', async ({ page }) => {
    await page.goto('/portfolios')

    // Should show 3 portfolio cards
    const cards = page.locator('.portfolio-card')
    await expect(cards).toHaveCount(3, { timeout: 5_000 })

    // First card should contain the growth sleeve portfolio
    await expect(cards.first().locator('h2')).toContainText('Growth Sleeve')

    // Click the first card
    await cards.first().click()
    await expect(page).toHaveURL(/\/portfolios\/adm-growth-mk01/, { timeout: 5_000 })

    // Summary page loads with KPIs (5 KpiCards + 1 FlippableKpi)
    await expect(page.locator('.d-kpis > *')).toHaveCount(6, { timeout: 10_000 })
  })
})
