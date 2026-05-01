import { computed, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

export interface ChartPalette {
  primary: string
  secondary: string
  gain: string
  loss: string
  text1: string
  text2: string
  text3: string
  text4: string
  text5: string
  border: string
  bg: string
  bgAlt: string
  panel: string
  // Muted alpha variants for chart fills / subtle bands
  primarySoft15: string
  secondarySoft15: string
  gainSoft15: string
  lossSoft15: string
  // Neutral mid-tone for diverging scales (near-zero cells, etc.)
  neutralMid: string
}

const DARK_FALLBACK: ChartPalette = {
  primary: '#3ba7ff',
  secondary: '#f7b84b',
  gain: '#7fd4a8',
  loss: '#ff6b6b',
  text1: '#e8edf2',
  text2: '#c5cdd7',
  text3: '#8593a3',
  text4: '#6f7c8a',
  text5: '#55606c',
  border: '#1e2730',
  bg: '#0f1419',
  bgAlt: '#0b1015',
  panel: '#141a20',
  primarySoft15: 'rgba(59, 167, 255, 0.15)',
  secondarySoft15: 'rgba(247, 184, 75, 0.15)',
  gainSoft15: 'rgba(127, 212, 168, 0.15)',
  lossSoft15: 'rgba(255, 107, 107, 0.15)',
  neutralMid: 'rgba(133, 147, 163, 0.22)'
}

const LIGHT_FALLBACK: ChartPalette = {
  primary: '#0f62fe',
  secondary: '#d97706',
  gain: '#198038',
  loss: '#da1e28',
  text1: '#121619',
  text2: '#3a434d',
  text3: '#6f7c8a',
  text4: '#8d9aa8',
  text5: '#a8b1bc',
  border: '#dde3ea',
  bg: '#f2f4f8',
  bgAlt: '#ffffff',
  panel: '#ffffff',
  primarySoft15: 'rgba(15, 98, 254, 0.12)',
  secondarySoft15: 'rgba(217, 119, 6, 0.14)',
  gainSoft15: 'rgba(25, 128, 56, 0.14)',
  lossSoft15: 'rgba(218, 30, 40, 0.12)',
  neutralMid: 'rgba(141, 154, 168, 0.18)'
}

function read(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function resolvePalette(isDark: boolean): ChartPalette {
  const fallback = isDark ? DARK_FALLBACK : LIGHT_FALLBACK
  const pick = (name: string, fb: string): string => {
    const v = read(name)
    return v !== '' ? v : fb
  }
  return {
    primary: pick('--primary', fallback.primary),
    secondary: pick('--secondary', fallback.secondary),
    gain: pick('--gain', fallback.gain),
    loss: pick('--loss', fallback.loss),
    text1: pick('--text-1', fallback.text1),
    text2: pick('--text-2', fallback.text2),
    text3: pick('--text-3', fallback.text3),
    text4: pick('--text-4', fallback.text4),
    text5: pick('--text-5', fallback.text5),
    border: pick('--border', fallback.border),
    bg: pick('--bg', fallback.bg),
    bgAlt: pick('--bg-alt', fallback.bgAlt),
    panel: pick('--panel', fallback.panel),
    primarySoft15: pick('--primary-soft-15', fallback.primarySoft15),
    secondarySoft15: pick('--secondary-soft-15', fallback.secondarySoft15),
    gainSoft15: pick('--gain-soft-15', fallback.gainSoft15),
    lossSoft15: pick('--loss-soft-15', fallback.lossSoft15),
    // Neutral mid is always derived — not from tokens
    neutralMid: fallback.neutralMid
  }
}

export function useChartPalette(): ComputedRef<ChartPalette> {
  const ui = useUiStore()
  const { theme } = storeToRefs(ui)
  return computed(() => resolvePalette(theme.value === 'dark'))
}
