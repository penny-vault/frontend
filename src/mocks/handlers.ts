import { http, HttpResponse } from 'msw'
import type { Portfolio, PortfolioCreated } from '@/api/endpoints/portfolios'
import type { Alert, AlertFrequency } from '@/api/endpoints/alerts'
import {
  portfolioFixture,
  portfolioFixture2,
  portfolioFixture3,
  portfolioListFixture,
  performanceFixture,
  holdingsMap,
  holdingsHistoryMap,
  transactionsMap,
  holdingsImpactMap,
  factorMap,
  summaryMap,
  drawdownsMap,
  statisticsMap,
  metricsMap,
  trailingReturnsMap,
  strategyListFixture,
  securityFixtures,
  alertsMap
} from './fixtures'

const base = import.meta.env.VITE_API_BASE_URL ?? '/v3'

const portfolioMap: Record<string, Portfolio> = {
  [portfolioFixture.slug]: portfolioFixture,
  [portfolioFixture2.slug]: portfolioFixture2,
  [portfolioFixture3.slug]: portfolioFixture3
}

export const handlers = [
  http.get(`${base}/security`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const results = q
      ? securityFixtures
          .filter((s) => s.ticker.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q))
          .slice(0, 10)
      : []
    return HttpResponse.json(results)
  }),

  http.get(`${base}/strategies`, () => HttpResponse.json(strategyListFixture)),

  http.get(`${base}/strategies/:shortCode`, ({ params }) => {
    const shortCode =
      typeof params.shortCode === 'string' ? params.shortCode : String(params.shortCode)
    const strategy = strategyListFixture.find((s) => s.shortCode === shortCode)
    if (!strategy) return HttpResponse.json({ error: 'not found' }, { status: 404 })
    return HttpResponse.json(strategy)
  }),

  http.get(`${base}/portfolios`, () => HttpResponse.json(portfolioListFixture)),

  http.post(`${base}/portfolios`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const created: PortfolioCreated = {
      slug: `new-portfolio-${Date.now()}`,
      name: String(body.name ?? 'New Portfolio'),
      strategyCode: String(body.strategyCode ?? ''),
      strategyCloneUrl: String(body.strategyCloneUrl ?? ''),
      parameters: (body.parameters as Record<string, unknown>) ?? {},
      benchmark: String(body.benchmark ?? 'SPY'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runRetention: 2,
      runId: crypto.randomUUID()
    }
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(`${base}/portfolios/:slug`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const portfolio = portfolioMap[slug]
    if (!portfolio) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(portfolio)
  }),

  http.patch(`${base}/portfolios/:slug`, async ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const portfolio = portfolioMap[slug]
    if (!portfolio) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const body = (await request.json()) as { name?: string }
    if (body.name)
      portfolioMap[slug] = { ...portfolio, name: body.name, updatedAt: new Date().toISOString() }
    return HttpResponse.json(portfolioMap[slug])
  }),

  http.delete(`${base}/portfolios/:slug`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    if (!(slug in portfolioMap)) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    delete portfolioMap[slug]
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${base}/portfolios/:slug/runs/:runId/progress`, () => {
    const totalSteps = 8
    const stepMs = 400
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }
        const startYear = 2010
        const endYear = 2026
        for (let step = 1; step <= totalSteps; step++) {
          await new Promise((r) => setTimeout(r, stepMs))
          const yearOffset = Math.floor(((step - 1) / totalSteps) * (endYear - startYear))
          send('progress', {
            step,
            total_steps: totalSteps,
            current_date: `${startYear + yearOffset}-01-01`,
            target_date: `${endYear}-01-01`,
            pct: Math.round((step / totalSteps) * 100),
            elapsed_ms: step * stepMs,
            eta_ms: (totalSteps - step) * stepMs,
            measurements: step * 21
          })
        }
        send('done', { status: 'success' })
        controller.close()
      }
    })

    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    })
  }),

  http.get(`${base}/portfolios/:slug/summary`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const summary = summaryMap[slug]
    if (!summary) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(summary)
  }),

  http.get(`${base}/portfolios/:slug/drawdowns`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const drawdowns = drawdownsMap[slug]
    if (!drawdowns) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(drawdowns)
  }),

  http.get(`${base}/portfolios/:slug/statistics`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const statistics = statisticsMap[slug]
    if (!statistics) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(statistics)
  }),

  http.get(`${base}/portfolios/:slug/metrics`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const metrics = metricsMap[slug]
    if (!metrics) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(metrics)
  }),

  http.get(`${base}/portfolios/:slug/trailing-returns`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const rows = trailingReturnsMap[slug]
    if (!rows) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(rows)
  }),

  http.get(`${base}/portfolios/:slug/performance`, ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    if (!(slug in portfolioMap)) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from && !to) return HttpResponse.json(performanceFixture)

    const fromT = from ? new Date(from).getTime() : -Infinity
    const toT = to ? new Date(to).getTime() : Infinity
    const filtered = performanceFixture.points.filter((p) => {
      const t = new Date(p.date).getTime()
      return t >= fromT && t <= toT
    })
    return HttpResponse.json({ ...performanceFixture, portfolioSlug: slug, points: filtered })
  }),

  http.get(`${base}/portfolios/:slug/holdings`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const holdings = holdingsMap[slug]
    if (!holdings) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(holdings)
  }),

  http.get(`${base}/portfolios/:slug/holdings/history`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const history = holdingsHistoryMap[slug]
    if (!history) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(history)
  }),

  http.get(`${base}/portfolios/:slug/holdings-impact`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const impact = holdingsImpactMap[slug]
    if (!impact) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(impact)
  }),

  http.get(`${base}/portfolios/:slug/alerts`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    if (!(slug in portfolioMap)) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(alertsMap[slug] ?? [])
  }),

  http.post(`${base}/portfolios/:slug/alerts`, async ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const portfolio = portfolioMap[slug]
    if (!portfolio) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const body = (await request.json().catch(() => null)) as {
      frequency?: unknown
      recipients?: unknown
    } | null
    const frequency = body?.frequency as AlertFrequency | undefined
    const recipients = Array.isArray(body?.recipients)
      ? (body!.recipients as unknown[]).map((r) => String(r).trim()).filter(Boolean)
      : []
    const validFreq: AlertFrequency[] = ['scheduled_run', 'daily', 'weekly', 'monthly']
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!frequency || !validFreq.includes(frequency)) {
      return HttpResponse.json(
        { title: 'Unprocessable Entity', status: 422, detail: 'frequency is required' },
        { status: 422, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    if (recipients.length === 0 || !recipients.every((r) => emailRe.test(r))) {
      return HttpResponse.json(
        {
          title: 'Unprocessable Entity',
          status: 422,
          detail: 'at least one valid recipient required'
        },
        { status: 422, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const created: Alert = {
      id: crypto.randomUUID(),
      portfolioId: crypto.randomUUID(),
      frequency,
      recipients,
      lastSentAt: null
    }
    const list = alertsMap[slug] ?? []
    alertsMap[slug] = [...list, created]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${base}/portfolios/:slug/alerts/:alertId`, async ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const alertId = typeof params.alertId === 'string' ? params.alertId : String(params.alertId)
    const list = alertsMap[slug]
    if (!list) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const idx = list.findIndex((a) => a.id === alertId)
    if (idx === -1) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const body = (await request.json().catch(() => null)) as {
      frequency?: unknown
      recipients?: unknown
    } | null
    const validFreq: AlertFrequency[] = ['scheduled_run', 'daily', 'weekly', 'monthly']
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const next: Alert = { ...list[idx]! }
    if (body?.frequency !== undefined) {
      if (!validFreq.includes(body.frequency as AlertFrequency)) {
        return HttpResponse.json(
          { title: 'Unprocessable Entity', status: 422, detail: 'invalid frequency' },
          { status: 422, headers: { 'content-type': 'application/problem+json' } }
        )
      }
      next.frequency = body.frequency as AlertFrequency
    }
    if (body?.recipients !== undefined) {
      const recipients = Array.isArray(body.recipients)
        ? (body.recipients as unknown[]).map((r) => String(r).trim()).filter(Boolean)
        : []
      if (recipients.length === 0 || !recipients.every((r) => emailRe.test(r))) {
        return HttpResponse.json(
          {
            title: 'Unprocessable Entity',
            status: 422,
            detail: 'at least one valid recipient required'
          },
          { status: 422, headers: { 'content-type': 'application/problem+json' } }
        )
      }
      next.recipients = recipients
    }
    list[idx] = next
    return HttpResponse.json(next)
  }),

  http.delete(`${base}/portfolios/:slug/alerts/:alertId`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const alertId = typeof params.alertId === 'string' ? params.alertId : String(params.alertId)
    const list = alertsMap[slug]
    if (!list) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const idx = list.findIndex((a) => a.id === alertId)
    if (idx === -1) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    list.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${base}/portfolios/:slug/email-summary`, async ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    if (!holdingsImpactMap[slug]) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const body = (await request.json().catch(() => null)) as { recipient?: unknown } | null
    const recipient = typeof body?.recipient === 'string' ? body.recipient.trim() : ''
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return HttpResponse.json(
        { title: 'Unprocessable Entity', status: 422, detail: 'recipient must be a valid email' },
        { status: 422, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return new HttpResponse(null, { status: 201 })
  }),

  http.get(`${base}/portfolios/:slug/factors`, ({ params }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const factors = factorMap[slug]
    if (!factors) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    return HttpResponse.json(factors)
  }),

  http.get(`${base}/portfolios/:slug/transactions`, ({ params, request }) => {
    const slug = typeof params.slug === 'string' ? params.slug : String(params.slug)
    const source = transactionsMap[slug]
    if (!source) {
      return HttpResponse.json(
        { title: 'Not Found', status: 404 },
        { status: 404, headers: { 'content-type': 'application/problem+json' } }
      )
    }
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const type = url.searchParams.get('type')
    const typeSet = type
      ? new Set(
          type
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      : null
    const fromT = from ? new Date(from).getTime() : -Infinity
    const toT = to ? new Date(to).getTime() : Infinity
    const filtered = source.items.filter((t) => {
      const ts = new Date(t.date).getTime()
      if (ts < fromT || ts > toT) return false
      if (typeSet && !typeSet.has(t.type)) return false
      return true
    })
    return HttpResponse.json({ items: filtered })
  })
]
