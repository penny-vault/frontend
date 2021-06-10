export function formatPercent (value) {
  let percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

  if (typeof value === "number") {
    return percentFormatter.format(value)
  } else if (typeof value === "object") {
    if (value["Valid"]) {
      return percentFormatter.format(value["Float64"])
    }
  }
}