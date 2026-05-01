# Phase 2b: Splash + Portfolio List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Splash/login page and a Portfolio List landing page so the app has a real login-to-dashboard flow: Splash → auth → Portfolio List → click → Portfolio Summary.

**Architecture:** Two new pages (SplashPage, PortfolioList) with a new layout (SplashLayout for the login page). Router restructured from single-route to multi-route with nested layouts. PortfolioSummary moves from `/` to `/portfolios/:id` and reads the portfolio ID from route params. MSW fixtures enriched with multiple portfolios for a realistic list view.

**Tech Stack:** Vue 3.5, vue-router 4, @auth0/auth0-vue 2, TanStack Vue Query 5, existing component kit (Panel, KpiCard), MSW 2.

**Working directory:** `/Users/jdf/Developer/penny-vault/frontend-ng`

**Critical rule:** After every task, `npm run typecheck && npm run build && npm run test && npm run e2e` must all pass.

---

## File Structure

```
src/
  layouts/
    MainLayout.vue          # EXISTING — no changes
    SplashLayout.vue        # NEW — full-bleed wallpaper + overlay + slot
  pages/
    SplashPage.vue          # NEW — login card, auth redirect, mock mode bypass
    PortfolioList.vue       # NEW — portfolio grid with Panel + KPI values
    PortfolioSummary.vue    # MODIFY — read :id from route params
  composables/
    usePortfolioList.ts     # NEW — Vue Query wrapper for listPortfolios
  mocks/
    fixtures.ts             # MODIFY — add 2-3 more portfolios
  router.ts                 # MODIFY — restructure routes
tests/
  e2e/
    summary.spec.ts         # MODIFY — update routes from / to /portfolios/:id
    flow.spec.ts            # NEW — splash → list → summary flow test
```

---

## Task 0: Enrich MSW fixtures with multiple portfolios

**Files:**
- Modify: `src/mocks/fixtures.ts`
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: Add 2 more portfolios to fixtures**

Open `src/mocks/fixtures.ts`. Currently there's one portfolio with ID `00000000-0000-4000-a000-000000000001`. Add two more portfolio fixtures and update the list fixture.

```ts
const PORTFOLIO_ID_2 = '00000000-0000-4000-a000-000000000002'
const PORTFOLIO_ID_3 = '00000000-0000-4000-a000-000000000003'

export const portfolioFixture2: Portfolio = {
  id: PORTFOLIO_ID_2,
  name: 'Tax-Efficient Core — Bond Ladder',
  benchmark: 'Bloomberg Agg',
  inceptionDate: '2019-06-15',
  currentAssets: ['BND', 'VTIP', 'SHY'],
  lastUpdated: '2026-04-14T21:00:00Z',
  summary: {
    currentValue: 142380.22,
    ytdReturn: 0.0198,
    oneYearReturn: 0.0456,
    cagrSinceInception: 0.0312,
    maxDrawDown: -0.0843,
    sharpe: 0.62,
    sortino: 0.89,
    stdDev: 0.0421,
    ulcerIndex: 0.0198,
    beta: 0.15,
    alpha: 0.0089,
    taxCostRatio: 0.0032
  },
  drawdowns: [
    { start: '2022-01-05', trough: '2022-10-30', recovery: '2024-01-15', depth: -0.0843, days: 520 },
    { start: '2020-03-01', trough: '2020-03-18', recovery: '2020-05-10', depth: -0.0412, days: 50 }
  ],
  metrics: [
    { label: 'Sharpe Ratio', value: 0.62, format: 'number' },
    { label: 'Sortino Ratio', value: 0.89, format: 'number' },
    { label: 'Std. Deviation', value: 0.0421, format: 'percent' }
  ],
  trailingReturns: [
    { title: 'Portfolio — Time-Weighted', kind: 'portfolio', ytd: 0.0198, oneYear: 0.0456, threeYear: 0.0289, fiveYear: 0.0301, tenYear: 0, sinceInception: 0.0312 }
  ],
  allocation: [
    { ticker: 'BND', name: 'Vanguard Total Bond Market', weight: 0.60, value: 85428, dayChange: -0.0008 },
    { ticker: 'VTIP', name: 'Vanguard Short-Term TIPS', weight: 0.25, value: 35595, dayChange: 0.0002 },
    { ticker: 'SHY', name: 'iShares 1-3 Year Treasury', weight: 0.15, value: 21357, dayChange: -0.0003 }
  ]
}

export const portfolioFixture3: Portfolio = {
  id: PORTFOLIO_ID_3,
  name: 'Global Tactical — All Weather',
  benchmark: 'MSCI ACWI',
  inceptionDate: '2021-01-04',
  currentAssets: ['VT', 'GLD', 'TLT'],
  lastUpdated: '2026-04-14T21:00:00Z',
  summary: {
    currentValue: 87450.10,
    ytdReturn: 0.0532,
    oneYearReturn: 0.1245,
    cagrSinceInception: 0.0867,
    maxDrawDown: -0.1892,
    sharpe: 0.94,
    sortino: 1.31,
    stdDev: 0.1102,
    ulcerIndex: 0.0487,
    beta: 0.78,
    alpha: 0.0156,
    taxCostRatio: 0.0065
  },
  drawdowns: [
    { start: '2022-01-03', trough: '2022-09-30', recovery: '2023-11-20', depth: -0.1892, days: 450 }
  ],
  metrics: [
    { label: 'Sharpe Ratio', value: 0.94, format: 'number' },
    { label: 'Sortino Ratio', value: 1.31, format: 'number' },
    { label: 'Std. Deviation', value: 0.1102, format: 'percent' }
  ],
  trailingReturns: [
    { title: 'Portfolio — Time-Weighted', kind: 'portfolio', ytd: 0.0532, oneYear: 0.1245, threeYear: 0.0789, fiveYear: 0, tenYear: 0, sinceInception: 0.0867 }
  ],
  allocation: [
    { ticker: 'VT', name: 'Vanguard Total World Stock', weight: 0.55, value: 48098, dayChange: 0.0087 },
    { ticker: 'GLD', name: 'SPDR Gold Shares', weight: 0.25, value: 21863, dayChange: 0.0042 },
    { ticker: 'TLT', name: 'iShares 20+ Year Treasury', weight: 0.20, value: 17490, dayChange: -0.0065 }
  ]
}
```

Update `portfolioListFixture` to include all three:

```ts
export const portfolioListFixture: PortfolioListItem[] = [
  {
    id: PORTFOLIO_ID,
    name: portfolioFixture.name,
    benchmark: portfolioFixture.benchmark,
    inceptionDate: portfolioFixture.inceptionDate,
    currentValue: portfolioFixture.summary.currentValue,
    ytdReturn: portfolioFixture.summary.ytdReturn,
    maxDrawDown: portfolioFixture.summary.maxDrawDown,
    lastUpdated: portfolioFixture.lastUpdated
  },
  {
    id: PORTFOLIO_ID_2,
    name: portfolioFixture2.name,
    benchmark: portfolioFixture2.benchmark,
    inceptionDate: portfolioFixture2.inceptionDate,
    currentValue: portfolioFixture2.summary.currentValue,
    ytdReturn: portfolioFixture2.summary.ytdReturn,
    maxDrawDown: portfolioFixture2.summary.maxDrawDown,
    lastUpdated: portfolioFixture2.lastUpdated
  },
  {
    id: PORTFOLIO_ID_3,
    name: portfolioFixture3.name,
    benchmark: portfolioFixture3.benchmark,
    inceptionDate: portfolioFixture3.inceptionDate,
    currentValue: portfolioFixture3.summary.currentValue,
    ytdReturn: portfolioFixture3.summary.ytdReturn,
    maxDrawDown: portfolioFixture3.summary.maxDrawDown,
    lastUpdated: portfolioFixture3.lastUpdated
  }
]

export { PORTFOLIO_ID, PORTFOLIO_ID_2, PORTFOLIO_ID_3 }
```

- [ ] **Step 2: Update MSW handler to serve all portfolios by ID**

In `src/mocks/handlers.ts`, update the `GET /portfolios/:id` handler to look up by ID from a map instead of checking against a single ID:

```ts
import {
  portfolioFixture,
  portfolioFixture2,
  portfolioFixture3,
  portfolioListFixture,
  measurementsFixture,
  PORTFOLIO_ID
} from './fixtures'

const portfolioMap: Record<string, Portfolio> = {
  [portfolioFixture.id]: portfolioFixture,
  [portfolioFixture2.id]: portfolioFixture2,
  [portfolioFixture3.id]: portfolioFixture3
}

// In the GET /portfolios/:id handler:
http.get(`${base}/portfolios/:id`, ({ params }) => {
  const id = typeof params.id === 'string' ? params.id : String(params.id)
  const portfolio = portfolioMap[id]
  if (!portfolio) {
    return HttpResponse.json(
      { title: 'Not Found', status: 404 },
      { status: 404, headers: { 'content-type': 'application/problem+json' } }
    )
  }
  return HttpResponse.json(portfolio)
})
```

Note: the measurements handler can still return `measurementsFixture` for all portfolios (same time-series shape, different data isn't critical for the mockup).

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint && npm run test && npm run build && npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(mocks): add 2 more portfolio fixtures for list page"
```

---

## Task 1: Create usePortfolioList composable

**Files:**
- Create: `src/composables/usePortfolioList.ts`

- [ ] **Step 1: Write the composable**

```ts
import { useQuery } from '@tanstack/vue-query'
import { listPortfolios, type PortfolioListItem } from '@/api/endpoints/portfolios'

export function usePortfolioList() {
  return useQuery<PortfolioListItem[]>({
    queryKey: ['portfolios'],
    queryFn: listPortfolios
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add usePortfolioList composable"
```

---

## Task 2: Create SplashLayout

**Files:**
- Create: `src/layouts/SplashLayout.vue`

- [ ] **Step 1: Create the layout**

```vue
<script setup lang="ts">
</script>

<template>
  <div class="splash-root">
    <div class="splash-bg" />
    <div class="splash-overlay" />
    <div class="splash-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.splash-root {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Sans', 'Inter', sans-serif;
  color: #e8edf2;
  overflow: hidden;
}
.splash-bg {
  position: absolute;
  inset: 0;
  background: url('/wallpaper.png') center / cover no-repeat;
  z-index: 0;
}
.splash-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 20, 25, 0.55);
  z-index: 1;
}
.splash-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  padding: 24px;
}
</style>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add SplashLayout with full-bleed wallpaper"
```

---

## Task 3: Create SplashPage

**Files:**
- Create: `src/pages/SplashPage.vue`

- [ ] **Step 1: Create the page**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'

const router = useRouter()
const isMockMode = import.meta.env.VITE_USE_MOCKS === '1'

// In mock mode, Auth0 isn't initialized with real credentials.
// Provide a fallback for the login function.
let isAuthenticated = { value: false }
let loginWithRedirect = async () => {}

if (!isMockMode) {
  const auth = useAuth0()
  isAuthenticated = auth.isAuthenticated
  loginWithRedirect = auth.loginWithRedirect
}

onMounted(() => {
  if (!isMockMode && isAuthenticated.value) {
    router.replace('/portfolios')
  }
})

function handleLogin() {
  if (isMockMode) {
    router.push('/portfolios')
  } else {
    loginWithRedirect()
  }
}
</script>

<template>
  <div class="splash-card">
    <div class="splash-logo">
      <img src="/pv-icon-blue.jpg" alt="Penny Vault" width="56" height="56" />
    </div>
    <h1 class="splash-title">Penny Vault</h1>
    <p class="splash-sub">Portfolio visualization and investment strategy analysis</p>
    <button class="splash-btn" @click="handleLogin">
      {{ isMockMode ? 'Continue as demo user' : 'Sign in' }}
    </button>
  </div>
</template>

<style scoped>
.splash-card {
  background: rgba(20, 26, 32, 0.85);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(111, 124, 138, 0.2);
  border-radius: 16px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.6);
}
.splash-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(111, 124, 138, 0.3);
}
.splash-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.splash-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
  color: #e8edf2;
}
.splash-sub {
  font-size: 14px;
  line-height: 1.5;
  color: #8593a3;
  margin-bottom: 32px;
}
.splash-btn {
  width: 100%;
  padding: 14px 24px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  color: #0f1419;
  background: #3ba7ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.splash-btn:hover {
  background: #5ab8ff;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -8px rgba(59, 167, 255, 0.4);
}
.splash-btn:active {
  transform: translateY(0);
}
</style>
```

**Note on Auth0 in mock mode:** `useAuth0()` throws if the Auth0 plugin wasn't properly initialized (which happens in mock mode with placeholder credentials). The conditional `if (!isMockMode)` avoids calling it. If this causes TypeScript issues with the auth0 reactive refs, the implementer should wrap the auth0 usage in a try/catch or check `isAuthenticated` via the auth0 plugin's `isLoading` state.

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add SplashPage with login card"
```

---

## Task 4: Create PortfolioList page

**Files:**
- Create: `src/pages/PortfolioList.vue`

- [ ] **Step 1: Create the page**

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import Panel from '@/components/ui/Panel.vue'
import { usePortfolioList } from '@/composables/usePortfolioList'
import { formatCurrency, formatPercent, formatDate } from '@/util/format'

const router = useRouter()
const { data: portfolios, isLoading, error } = usePortfolioList()

function openPortfolio(id: string) {
  router.push(`/portfolios/${id}`)
}
</script>

<template>
  <div class="d-breadcrumb">
    <span>Portfolios</span>
  </div>

  <div v-if="isLoading" class="loading-skel">
    <span class="pulse-dot" /> Loading portfolios...
  </div>
  <div v-else-if="error" class="error-banner" role="alert">
    Could not load portfolios. {{ (error as Error).message }}
  </div>
  <div v-else-if="!portfolios?.length" class="empty-state">
    No portfolios found.
  </div>

  <main v-if="portfolios?.length" class="list-main">
    <div class="list-header">
      <h1>Portfolios</h1>
      <p class="list-sub">{{ portfolios.length }} strategies</p>
    </div>

    <div class="list-grid">
      <Panel
        v-for="p in portfolios"
        :key="p.id"
        class="portfolio-card"
        @click="openPortfolio(p.id)"
        tabindex="0"
        @keydown.enter="openPortfolio(p.id)"
      >
        <div class="card-top">
          <h2>{{ p.name }}</h2>
          <span class="card-bench">{{ p.benchmark }}</span>
        </div>
        <div class="card-kpis">
          <div class="card-kpi">
            <div class="card-kpi-label">Current value</div>
            <div class="card-kpi-value num">{{ formatCurrency(p.currentValue) }}</div>
          </div>
          <div class="card-kpi">
            <div class="card-kpi-label">YTD</div>
            <div class="card-kpi-value num" :class="p.ytdReturn >= 0 ? 'up' : 'down'">
              {{ formatPercent(p.ytdReturn) }}
            </div>
          </div>
          <div class="card-kpi">
            <div class="card-kpi-label">Max DD</div>
            <div class="card-kpi-value num warn">{{ formatPercent(p.maxDrawDown) }}</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">Since {{ formatDate(p.inceptionDate, { month: 'short', year: 'numeric' }) }}</span>
          <span class="card-updated">Updated {{ formatDate(p.lastUpdated) }}</span>
        </div>
      </Panel>
    </div>
  </main>
</template>

<style scoped>
.list-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}
.list-header {
  margin-bottom: 28px;
}
.list-header h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}
.list-sub {
  font-size: 13px;
  color: var(--text-3);
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}
.portfolio-card {
  cursor: pointer;
  transition: border-color 180ms ease, transform 180ms ease;
}
.portfolio-card:hover {
  border-color: var(--primary-border);
}
.portfolio-card:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
.card-top {
  margin-bottom: 18px;
}
.card-top h2 {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.005em;
  margin-bottom: 4px;
}
.card-bench {
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.02em;
}
.card-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.card-kpi-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 4px;
}
.card-kpi-value {
  font-size: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.card-kpi-value.up { color: var(--gain); }
.card-kpi-value.down { color: var(--loss); }
.card-kpi-value.warn { color: var(--secondary); }
.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  font-size: 12px;
  color: var(--text-4);
}
.empty-state {
  padding: 80px 24px;
  text-align: center;
  font-size: 15px;
  color: var(--text-3);
}
@media (max-width: 720px) {
  .list-grid { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add PortfolioList page"
```

---

## Task 5: Restructure router + update PortfolioSummary for route params

**Files:**
- Modify: `src/router.ts`
- Modify: `src/pages/PortfolioSummary.vue`

- [ ] **Step 1: Rewrite router**

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { requireAuth } from './auth/guard'
import MainLayout from './layouts/MainLayout.vue'
import SplashLayout from './layouts/SplashLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: SplashLayout,
    children: [
      {
        path: '',
        name: 'splash',
        component: () => import('./pages/SplashPage.vue')
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    beforeEnter: requireAuth,
    children: [
      {
        path: 'portfolios',
        name: 'portfolio-list',
        component: () => import('./pages/PortfolioList.vue')
      },
      {
        path: 'portfolios/:id',
        name: 'portfolio-summary',
        component: () => import('./pages/PortfolioSummary.vue')
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

**Note:** Two route groups share `/` as parent path but have different layouts. The first match wins for exact `/` (SplashLayout). The `/portfolios` and `/portfolios/:id` routes match the second group (MainLayout).

- [ ] **Step 2: Update PortfolioSummary to read route params**

In `src/pages/PortfolioSummary.vue`, the current script has:

```ts
const PORTFOLIO_ID = '00000000-0000-4000-a000-000000000001'
const portfolioId = ref<string | null>(PORTFOLIO_ID)
```

Replace with:

```ts
import { useRoute } from 'vue-router'

const route = useRoute()
const portfolioId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})
```

Remove the `PORTFOLIO_ID` constant. Update `usePortfolio(portfolioId)` and `usePortfolioMeasurements(portfolioId, ...)` — they already accept `Ref<string | null>`, so `computed` (which is a `Ref`) works.

Also update any template references that used the hardcoded benchmark label. The benchmark should come from `portfolioData?.benchmark` (it already does in ValueChart via the `benchmark-label` prop).

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: restructure router — splash, portfolio list, portfolio detail"
```

---

## Task 6: Update existing e2e tests + add flow test

**Files:**
- Modify: `tests/e2e/summary.spec.ts`
- Create: `tests/e2e/flow.spec.ts`

- [ ] **Step 1: Update summary spec routes**

The summary page now lives at `/portfolios/:id`. Update the test:

```ts
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

    await expect(page.locator('.pt-row')).toHaveCount(4, { timeout: 5_000 })
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
```

- [ ] **Step 2: Write the flow test**

`tests/e2e/flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('Login → List → Summary flow', () => {
  test('splash page shows login button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.splash-card')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.splash-btn')).toContainText(/Continue as demo user|Sign in/)
  })

  test('clicking login navigates to portfolio list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.splash-btn').click()
    await expect(page).toHaveURL(/\/portfolios$/, { timeout: 5_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Portfolios', {
      timeout: 5_000
    })
  })

  test('portfolio list shows cards and navigates to detail', async ({ page }) => {
    await page.goto('/portfolios')

    // Should show 3 portfolio cards (from enriched fixtures)
    const cards = page.locator('.portfolio-card')
    await expect(cards).toHaveCount(3, { timeout: 5_000 })

    // First card should be "Adaptive Momentum — Growth Sleeve"
    await expect(cards.first().locator('h2')).toContainText('Growth Sleeve')

    // Click the first card → navigates to detail
    await cards.first().click()
    await expect(page).toHaveURL(/\/portfolios\/00000000/, { timeout: 5_000 })

    // Summary page loads
    await expect(page.locator('.kpi')).toHaveCount(6, { timeout: 10_000 })
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
npm run test && npm run e2e
```

Expected: all unit tests pass, all e2e tests pass (existing summary tests + new flow tests).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: update e2e for new routes + add login-to-summary flow test"
```

---

## Task 7: Final verification

- [ ] **Step 1: Full verification suite**

```bash
npm run typecheck && npm run lint:check && npm run format:check && npm run test && npm run build && npm run e2e
```

All must exit 0.

- [ ] **Step 2: Visual verification**

Start the dev server (`npm run dev`) and verify in a browser:
- `/` shows splash page with wallpaper background and login card
- Click "Continue as demo user" → navigates to `/portfolios`
- Portfolio list shows 3 portfolio cards with name, value, YTD, max DD
- Click a card → navigates to `/portfolios/:id`
- Portfolio summary loads with chart, KPIs, theme toggle
- Dark/light theme toggle works on both list and summary pages
- Browser back button from summary → returns to list

- [ ] **Step 3: Commit (if any format fixes needed)**

```bash
npm run format && git add -A && git commit -m "chore: format pass for Phase 2b" || echo "No changes needed"
```

---

## Done-criteria

- [ ] `/` renders the Splash page with wallpaper + login card
- [ ] Mock mode shows "Continue as demo user" and navigates to `/portfolios`
- [ ] `/portfolios` renders the Portfolio List with 3 cards
- [ ] Clicking a card navigates to `/portfolios/:id`
- [ ] `/portfolios/:id` renders the Portfolio Summary (identical to before)
- [ ] Theme toggle works on both list and summary pages
- [ ] All unit tests pass (37+)
- [ ] All e2e tests pass (5+: 2 existing summary + 3 new flow)
- [ ] `npm run typecheck && npm run build` exit 0
