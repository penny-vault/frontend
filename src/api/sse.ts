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

export async function openProgressStream(
  url: string,
  handlers: ProgressStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
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

    if (!terminalEventSeen) {
      handlers.onError?.('disconnected', 'Connection closed before the run finished. Please try again.')
    }
  } finally {
    reader.releaseLock()
  }
}
