import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('defaults to dark when system has no preference', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
    const ui = useUiStore()
    expect(ui.theme).toBe('dark')
  })

  it('toggles and persists to localStorage', () => {
    const ui = useUiStore()
    const before = ui.theme
    ui.toggleTheme()
    expect(ui.theme).not.toBe(before)
    expect(window.localStorage.getItem('pv:theme')).toBe(ui.theme)
  })

  it('reads persisted theme on init', () => {
    window.localStorage.setItem('pv:theme', 'light')
    const ui = useUiStore()
    expect(ui.theme).toBe('light')
  })
})
