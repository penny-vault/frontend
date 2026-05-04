<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Section {
  id: string
  label: string
}

const sections: Section[] = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'portfolios', label: 'Portfolios' },
  { id: 'views', label: 'Portfolio views' },
  { id: 'metrics', label: 'Metrics glossary' },
  { id: 'account', label: 'Account' }
]

const activeId = ref<string>(sections[0]!.id)

// Distance from the top of the viewport to the line that determines which
// section is "current". Anything above this line is considered passed.
const SCROLL_OFFSET = 140
let rafId = 0
let scrollLockUntil = 0

function updateActive() {
  if (performance.now() < scrollLockUntil) return
  let current = sections[0]!.id
  for (const s of sections) {
    const el = document.getElementById(s.id)
    if (!el) continue
    if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) current = s.id
  }
  activeId.value = current
}

function onScroll() {
  if (rafId) return
  rafId = window.requestAnimationFrame(() => {
    rafId = 0
    updateActive()
  })
}

onMounted(() => {
  updateActive()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (rafId) cancelAnimationFrame(rafId)
})

function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // Reflect the click immediately and freeze the scroll-driven detector while
  // the smooth scroll animates — otherwise the listener would overwrite the
  // click with whatever section is technically above the offset line.
  activeId.value = id
  scrollLockUntil = performance.now() + 800
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET + 1
  window.scrollTo({ top, behavior: 'smooth' })
}
</script>

<template>
  <main class="hp-main">
    <header class="hp-header">
      <h1>Help</h1>
      <p class="hp-sub">
        A quick tour of Penny Vault — how to find strategies, build portfolios, and read the
        results.
      </p>
    </header>

    <div class="hp-layout">
      <nav class="hp-toc" aria-label="Help sections">
        <ul>
          <li v-for="s in sections" :key="s.id">
            <a
              :href="`#${s.id}`"
              :class="{ active: activeId === s.id }"
              @click.prevent="jumpTo(s.id)"
            >
              {{ s.label }}
            </a>
          </li>
        </ul>
      </nav>

      <article class="hp-content">
        <section id="getting-started">
          <h2>Getting started</h2>
          <p>
            Penny Vault lets you backtest investment strategies and track portfolios built from
            them. The flow is: pick a strategy, configure it into a portfolio, run the backtest,
            then explore the results.
          </p>
          <ol>
            <li>
              Open <router-link to="/strategies">Strategies</router-link> to browse what's
              available.
            </li>
            <li>Click a strategy to see its parameters, then create a portfolio from it.</li>
            <li>
              The backtest runs server-side. Progress is shown live; large datasets can take a
              minute or two.
            </li>
            <li>
              Once it finishes, the portfolio appears in
              <router-link to="/portfolios">Portfolios</router-link> with full performance, risk,
              and holdings data.
            </li>
          </ol>
        </section>

        <section id="strategies">
          <h2>Strategies</h2>
          <p>
            A strategy is the rule set that decides what to hold and when. Each strategy ships with
            a default parameter set; you can override parameters when creating a portfolio.
          </p>
          <h3>Official vs community</h3>
          <p>
            <strong>Official</strong> strategies are maintained by Penny Vault and shown in the
            primary chart color. <strong>Community</strong> strategies are contributed by other
            users; they install from a public Git repository and run in the same sandbox.
          </p>
          <h3>Risk · return chart</h3>
          <p>
            The scatter on the Strategies page lets you compare every installed strategy across two
            dimensions. Use the <em>Compare</em> dropdown to switch the axis pair (CAGR vs Ulcer
            Index, Alpha vs Beta, etc.) and the <em>Bubble size</em> dropdown to encode a third
            dimension. Each pair has a clear "up and to the left is better" reading, except for
            Alpha vs Beta — there, upper-left is pure alpha and upper-right is leveraged beta.
          </p>
        </section>

        <section id="portfolios">
          <h2>Portfolios</h2>
          <h3>Creating a portfolio</h3>
          <p>
            From the Strategies list or the
            <router-link to="/portfolios">Portfolios</router-link> page, choose
            <em>Create portfolio</em>. You'll name it, optionally adjust the strategy's parameters,
            and pick a benchmark and date range. A backtest run is queued on submission.
          </p>
          <h3>Recalculation</h3>
          <p>
            When market data updates or a strategy is upgraded, the portfolio's snapshot can become
            stale. Penny Vault detects this and recalculates automatically the next time you open
            the portfolio; you'll see a progress bar. The page resumes once the run commits.
          </p>
          <h3>Run retention</h3>
          <p>
            Each portfolio keeps its most recent runs (defaults to two; configurable in
            <em>Settings</em>). Older runs are pruned to keep storage bounded.
          </p>
        </section>

        <section id="views">
          <h2>Portfolio views</h2>
          <p>Inside a portfolio, the tab bar gives you eight views:</p>
          <dl>
            <dt>Overview</dt>
            <dd>
              Top-line KPIs (current value, YTD, max drawdown, inception) and the equity curve.
            </dd>
            <dt>Returns</dt>
            <dd>Trailing-period returns, calendar-year breakdowns, and drawdown table.</dd>
            <dt>vs. Benchmark</dt>
            <dd>
              Cumulative excess return, rolling alpha, and capture ratios against your chosen
              benchmark.
            </dd>
            <dt>Risk</dt>
            <dd>Volatility, Sharpe, Sortino, ulcer index, and the deepest historical drawdowns.</dd>
            <dt>Holdings</dt>
            <dd>
              Current positions, weight, and a holdings-impact view showing each ticker's
              contribution.
            </dd>
            <dt>Transactions</dt>
            <dd>
              Every buy, sell, dividend, and adjustment the strategy generated, filterable by date
              and type.
            </dd>
            <dt>Settings</dt>
            <dd>
              Rename the portfolio, change the date range, adjust run retention, or delete it.
            </dd>
          </dl>
        </section>

        <section id="metrics">
          <h2>Metrics glossary</h2>
          <dl>
            <dt>CAGR</dt>
            <dd>
              Compound annual growth rate — the constant annual return that would produce the same
              final value over the backtest period.
            </dd>
            <dt>Volatility (σ)</dt>
            <dd>
              Annualized standard deviation of returns. Higher means a wider distribution of monthly
              outcomes.
            </dd>
            <dt>Max Drawdown</dt>
            <dd>
              The worst peak-to-trough decline observed during the backtest, expressed as a
              percentage.
            </dd>
            <dt>Ulcer Index</dt>
            <dd>
              A drawdown-aware risk measure that weights both depth and duration of underwater
              periods. Lower is better.
            </dd>
            <dt>Sharpe</dt>
            <dd>Excess return per unit of total volatility. A general-purpose efficiency score.</dd>
            <dt>Sortino</dt>
            <dd>
              Like Sharpe, but penalizes only downside volatility. Better for asymmetric strategies.
            </dd>
            <dt>Calmar</dt>
            <dd>
              CAGR divided by absolute max drawdown. Rewards strategies that recover quickly from
              losses.
            </dd>
            <dt>Beta</dt>
            <dd>
              Sensitivity to the benchmark. β = 1 moves with the market; β &lt; 1 is defensive; β
              &gt; 1 amplifies market moves.
            </dd>
            <dt>Alpha</dt>
            <dd>
              Annualized excess return after accounting for beta — the part of performance not
              explained by market exposure.
            </dd>
            <dt>Tax Cost Ratio</dt>
            <dd>
              The estimated annual return drag from taxes on dividends and realized gains, assuming
              a typical taxable account.
            </dd>
          </dl>
        </section>

        <section id="account">
          <h2>Account</h2>
          <p>
            Open the user menu in the top-right and choose <em>Account details</em> to see your
            profile, sign-in info, and email address. Penny Vault uses Auth0 for authentication;
            password changes and identity-provider connections are managed through the Auth0 sign-in
            page.
          </p>
          <p>
            <em>Sign out</em> in the same menu ends your session and returns you to the landing
            page.
          </p>
        </section>
      </article>
    </div>
  </main>
</template>

<style scoped>
.hp-main {
  padding: 24px 0 80px;
}
.hp-header {
  margin-bottom: 24px;
}
.hp-header h1 {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}
.hp-sub {
  font-size: 14px;
  color: var(--text-3);
  max-width: 60ch;
}
.hp-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
  align-items: start;
}
.hp-toc {
  position: sticky;
  top: 64px;
  font-size: 13px;
}
.hp-toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
  border-left: 1px solid var(--border);
}
.hp-toc li {
  margin: 0;
}
.hp-toc a {
  display: block;
  padding: 6px 12px;
  color: var(--text-3);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -1px;
  transition:
    color 140ms ease,
    border-color 140ms ease;
}
.hp-toc a:hover {
  color: var(--text-1);
}
.hp-toc a.active {
  color: var(--text-1);
  border-left-color: var(--primary);
}
.hp-content {
  min-width: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-2);
}
.hp-content section {
  margin-bottom: 40px;
}
.hp-content h2 {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--text-1);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.hp-content h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
  margin-top: 20px;
  margin-bottom: 6px;
}
.hp-content p {
  margin: 0 0 12px;
}
.hp-content a {
  color: var(--primary);
  text-decoration: none;
}
.hp-content a:hover {
  text-decoration: underline;
}
.hp-content ol,
.hp-content ul {
  margin: 0 0 12px;
  padding-left: 22px;
}
.hp-content li {
  margin-bottom: 4px;
}
.hp-content dl {
  margin: 8px 0 12px;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
}
.hp-content dt {
  font-weight: 500;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}
.hp-content dd {
  margin: 0;
}

@media (max-width: 720px) {
  .hp-layout {
    grid-template-columns: 1fr;
  }
  .hp-toc {
    position: static;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px;
  }
  .hp-toc ul {
    border-left: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .hp-toc a {
    border-left: none;
    padding: 4px 8px;
    border-radius: 3px;
  }
  .hp-toc a.active {
    background: var(--bg-alt);
    color: var(--text-1);
  }
  .hp-content dl {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .hp-content dt {
    margin-top: 8px;
  }
}
</style>
