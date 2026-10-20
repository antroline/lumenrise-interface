export function isNumericInput(value: string, mode: 'decimal' | 'numeric' = 'decimal') {
  return !/[^\d.]/.test(value) &&
    (mode === 'numeric' ? /^\d*$/ : /^\d*(?:\.\d*)?$/).test(value)
}

export function formatSupply(value: string) {
  const [whole, fraction] = value.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}
