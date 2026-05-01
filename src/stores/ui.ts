import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const THEME_KEY = 'pv:theme'

type Theme = 'light' | 'dark'

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' ? raw : null
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>(readStoredTheme() ?? systemTheme())

  watch(
    theme,
    (value) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_KEY, value)
      }
    },
    { flush: 'sync' }
  )

  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setTheme(next: Theme): void {
    theme.value = next
  }

  return { theme, toggleTheme, setTheme }
})
