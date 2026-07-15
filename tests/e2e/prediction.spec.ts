import { test, expect } from '@playwright/test'

const TRADES_ID = 'adm-growth-mk01'
const NO_TRADES_ID = 'tec-bond-ladder-zk02'
const NO_PREDICTION_ID = 'gta-all-weather-pp03'

test.describe('Trade prediction on the Holdings tab', () => {
  test('shows predicted orders and post-trade positions', async ({ page }) => {
    await page.goto(`/portfolios/${TRADES_ID}/holdings`)
    const panel = page.locator('.pp')
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.locator('.pp-date')).toHaveText('May 29, 2026')
    await expect(panel.locator('.pp-sub')).toHaveText('Prices estimated at last close')
    await expect(panel.locator('.pp-order')).toHaveCount(2)
    await expect(panel.locator('.pp-type.tx-sell')).toHaveText('Sell')
    await expect(panel.locator('.pp-type.tx-buy')).toHaveText('Buy')
    await expect(panel.locator('.pp-row')).toHaveCount(3)
    await expect(panel.locator('.pp-total')).toContainText('$255,092')
  })

  test('shows a no-trades message when the strategy would not trade', async ({ page }) => {
    await page.goto(`/portfolios/${NO_TRADES_ID}/holdings`)
    const panel = page.locator('.pp')
    await expect(panel).toBeVisible({ timeout: 10_000 })
    await expect(panel.locator('.pp-empty')).toContainText('No trades predicted')
    await expect(panel.locator('.pp-order')).toHaveCount(0)
    await expect(panel.locator('.pp-row')).toHaveCount(3)
  })

  test('hides the panel entirely when no prediction exists', async ({ page }) => {
    await page.goto(`/portfolios/${NO_PREDICTION_ID}/holdings`)
    // The rest of the holdings page still renders
    await expect(page.locator('.revo-wrap revo-grid')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.pp')).toHaveCount(0)
    await expect(page.locator('.pp-error')).toHaveCount(0)
  })
})
