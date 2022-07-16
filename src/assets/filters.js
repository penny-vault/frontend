export function formatPercent (value) {
  if (isNaN(value)) {
    return "-"
  }

  let percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })

  if (typeof value === "number") {
    return percentFormatter.format(value)
  } else if (typeof value === "object") {
    if (value["Status"] === 2) {
      return percentFormatter.format(value["Float"])
    }
  }
}

export function formatNumber (value) {
  if (isNaN(value)) {
    return "-"
  }
  let numberFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2})
  if (typeof value === "number") {
    return numberFormatter.format(value)
  } else if (typeof value === "object") {
    if (value["Status"] === 2) {
      return numberFormatter.format(value["Float"])
    }
  }
}

export function formatDate (date) {
  let options = {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
  }
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

function testWhite(x) {
  var white = new RegExp(/^\s$/);
  return white.test(x.charAt(0));
}

export function wordWrap(str, maxWidth) {
  const newLineStr = "\n"
  let res = ''
  while (str.length > maxWidth) {
      let found = false
      // Inserts new line at first whitespace of the line
      for (var i = maxWidth - 1; i >= 0; i--) {
          if (testWhite(str.charAt(i))) {
              res = res + [str.slice(0, i), newLineStr].join('')
              str = str.slice(i + 1)
              found = true
              break
          }
      }
      // Inserts new line at maxWidth position, the word is too long to wrap
      if (!found) {
          res += [str.slice(0, maxWidth), newLineStr].join('')
          str = str.slice(maxWidth)
      }

  }

  return res + str
}