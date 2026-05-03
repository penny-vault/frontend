import { fetchWithAuth } from './client'

export interface ProgressData {
  step: number
  total_steps: number
  current_date: string
  target_date: string
  pct: number
  elapsed_ms: number
  eta_ms: number
  measurements: number
}

export interface ProgressStreamHandlers {
  onProgress?: (data: ProgressData) => void
  onDone?: (status: string) => void
  onError?: (status: string, error?: string) => void
}

export interface ProgressStreamResult {
  // True if the server emitted an explicit `done` or `error` event.
  // False means the stream closed before the run reached a terminal state —
  // progress pct=100 is emitted by the strategy binary before snapshot fsync,
  // KPI extraction, and the DB commit, so a clean close mid-finalization is
  // not completion. Reopen the stream to get an authoritative terminal event.
  terminalEventSeen: boolean
}

export async function openProgressStream(
  url: string,
  handlers: ProgressStreamHandlers,
  signal?: AbortSignal
): Promise<ProgressStreamResult> {
  const response = await fetchWithAuth(url, { signal: signal ?? null })
  if (!response.ok || !response.body) {
    throw new Error(`SSE connection failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let pendingEvent = ''
  let terminalEventSeen = false

  const dispatch = (line: string) => {
    if (line.startsWith('event:')) {
      pendingEvent = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      const data = JSON.parse(line.slice(5).trim())
      if (pendingEvent === 'progress') handlers.onProgress?.(data)
      else if (pendingEvent === 'done') {
        terminalEventSeen = true
        handlers.onDone?.(data.status)
      } else if (pendingEvent === 'error') {
        terminalEventSeen = true
        handlers.onError?.(data.status, data.error)
      }
      pendingEvent = ''
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) dispatch(line)
    }

    buffer += decoder.decode()
    for (const line of buffer.split('\n')) dispatch(line)
  } finally {
    reader.releaseLock()
  }

  return { terminalEventSeen }
}
