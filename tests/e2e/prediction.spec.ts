import { test, expect } from '@playwright/test'

const TRADES_ID = 'adm-growth-mk01'
const NO_TRADES_ID = 'tec-bond-ladder-zk02'
const NO_PREDICTION_ID = 'gta-all-weather-pp03'

test.describe('Trade prediction on the Holdings tab', () => {
  test('shows a flagged predicted row pinned above the history', async ({ page }) => {
    await page.goto(`/portfolios/${TRADES_ID}/holdings`)
    const badge = page.locator('.pred-badge')
    await expect(badge).toBeVisible({ timeout: 10_000 })
    await expect(badge).toHaveText('Predicted upcoming')
    await expect(page.locator('.pred-date')).toContainText('May 29, 2026')
  })

  test('selecting the predicted row shows post-trade positions and orders', async ({ page }) => {
    await page.goto(`/portfolios/${TRADES_ID}/holdings`)
    await page.locator('.pred-date').click()
    await expect(page.locator('.hdp-pred-badge')).toHaveText('Predicted', { timeout: 5_000 })
    await expect(page.locator('.hdp-title')).toContainText('May 29, 2026')
    const orders = page.locator('.hdp-order')
    await expect(orders).toHaveCount(2)
    await expect(page.locator('.hdp-order-type.tx-sell')).toHaveText('Sell')
    await expect(page.locator('.hdp-order-type.tx-buy')).toHaveText('Buy')
    await expect(page.locator('.hdp-pred-note')).toContainText('estimated at last close')
  })

  test('shows a no-trades message when the strategy would not trade', async ({ page }) => {
    await page.goto(`/portfolios/${NO_TRADES_ID}/holdings`)
    await page.locator('.pred-date').click()
    await expect(page.locator('.hdp-orders-empty')).toContainText('No trades predicted', {
      timeout: 5_000
    })
    await expect(page.locator('.hdp-order')).toHaveCount(0)
  })

  test('hides the predicted row entirely when no prediction exists', async ({ page }) => {
    await page.goto(`/portfolios/${NO_PREDICTION_ID}/holdings`)
    // The rest of the holdings page still renders
    await expect(page.locator('.revo-wrap revo-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.pred-badge')).toHaveCount(0)
    await expect(page.locator('.pp-error')).toHaveCount(0)
  })
})
