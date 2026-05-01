import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'VITE_USE_MOCKS=1 npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { VITE_USE_MOCKS: '1' }
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
