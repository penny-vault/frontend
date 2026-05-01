import { ofetch, type FetchOptions } from 'ofetch'

let getAuthToken: (() => Promise<string | null>) | null = null
let onUnauthenticated: (() => void) | null = null

export function registerAuthTokenProvider(fn: () => Promise<string | null>): void {
  getAuthToken = fn
}

export function registerUnauthHandler(fn: () => void): void {
  onUnauthenticated = fn
}

export const apiClient = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/v3',
  async onRequest({ options }) {
    if (getAuthToken) {
      const token = await getAuthToken()
      if (token) {
        const headers = new Headers(options.headers as HeadersInit)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    }
  },
  async onResponseError({ response }) {
    if (response?.status === 401 && onUnauthenticated) {
      onUnauthenticated()
    }
  }
})

export type ApiFetchOptions = FetchOptions<'json'>

export async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (getAuthToken) {
    const token = await getAuthToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(url, { ...init, headers })
}
