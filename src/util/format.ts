const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
})

const currencyCentsFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const percentFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const numberFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return currencyFmt.format(value)
}

export function formatCurrencyCents(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return currencyCentsFmt.format(value)
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return percentFmt.format(value)
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return sign + percentFmt.format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return numberFmt.format(value)
}

// Date-only strings (YYYY-MM-DD) parsed by `new Date()` are treated as UTC
// midnight, which renders as the prior day for any timezone west of UTC. Parse
// them as local-time dates so callers see the calendar date the API meant.
const dateOnlyRe = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatDate(
  value: string | number | Date,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  let d: Date
  if (typeof value === 'string') {
    const m = dateOnlyRe.exec(value)
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
  } else {
    d = new Date(value)
  }
  return d.toLocaleDateString('en-US', opts)
}
