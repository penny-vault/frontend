export function formatPercent (value) {
  var v;
  if (typeof value === "number") {
    v = value * 100
    v = v.toFixed(1)
    return `${v}%`
  } else if (typeof value === "object") {
    if (value["Valid"]) {
      v = value["Float64"] * 100
      v = v.toFixed(1)
      return `${v}%`
    }
  }
}