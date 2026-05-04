import { ref, onUnmounted } from 'vue'
import { getPortfolioRun } from '@/api/endpoints/portfolios'
import { openProgressStream } from '@/api/sse'

export interface UsePortfolioRunProgressOptions {
  onSuccess?: (slug: string, runId: string) => void
  onFailure?: (error: string) => void
}

// Progress events (incl. pct=100) are emitted by the strategy binary before
// snapshot fsync, KPI extraction, and the DB commit — only the SSE `done`/
// `error` event (or a terminal status from GET /runs/:runId) means the run
// is committed. Stream close or pct=100 alone is not completion.
export function usePortfolioRunProgress(options: UsePortfolioRunProgressOptions = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/v3'

  const progressPct = ref(0)
  const isWaiting = ref(false)
  let abortController: AbortController | null = null

  async function start(slug: string, runId: string): Promise<void> {
    isWaiting.value = true
    progressPct.value = 0
    abortController = new AbortController()
    const url = `${baseUrl}/portfolios/${slug}/runs/${runId}/progress`

    let finished = false
    const handleTerminal = (status: string, error?: string) => {
      if (finished) return
      finished = true
      if (status === 'success') {
        progressPct.value = 100
        options.onSuccess?.(slug, runId)
      } else {
        isWaiting.value = false
        options.onFailure?.(error ?? 'Backtest failed. Please try again.')
      }
    }

    // Monotonic forward: progress never regresses. Both SSE events and the
    // GET poll feed through here, so whichever source is ahead wins.
    const advance = (pct: number) => {
      if (pct > progressPct.value) progressPct.value = pct
    }

    const checkRunStatus = async (): Promise<boolean> => {
      try {
        const run = await getPortfolioRun(slug, runId)
        if (run.progress?.pct !== undefined) advance(run.progress.pct)
        if (run.status === 'success' || run.status === 'failed') {
          handleTerminal(run.status, run.error ?? undefined)
          return true
        }
      } catch {
        // best-effort; keep waiting on SSE
      }
      return false
    }

    // Backstop poll every 2s, regardless of SSE state. If the stream is
    // disconnected or buffered, the GET response still surfaces the latest
    // progress snapshot and terminal status.
    const POLL_MS = 2_000
    const pollTimer = window.setInterval(() => {
      if (finished) return
      checkRunStatus()
    }, POLL_MS)

    const MAX_REOPEN = 5
    const REOPEN_DELAY_MS = 1_000

    try {
      for (let attempt = 0; attempt < MAX_REOPEN && !finished; attempt++) {
        const result = await openProgressStream(
          url,
          {
            onProgress(data) {
              advance(data.pct)
            },
            onDone(status) {
              handleTerminal(status)
            },
            onError(status, error) {
              handleTerminal(status, error)
            }
          },
          abortController.signal
        )

        if (finished || result.terminalEventSeen) break
        if (await checkRunStatus()) break
        await new Promise((r) => setTimeout(r, REOPEN_DELAY_MS))
      }

      if (!finished) {
        if (await checkRunStatus()) return
        isWaiting.value = false
        options.onFailure?.('Lost connection to backtest. Open the portfolio to check status.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        isWaiting.value = false
        options.onFailure?.((e as Error).message)
      }
    } finally {
      window.clearInterval(pollTimer)
    }
  }

  function abort(): void {
    abortController?.abort()
  }

  onUnmounted(abort)

  return { progressPct, isWaiting, start, abort }
}
