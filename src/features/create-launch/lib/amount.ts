export type SupplyUnit = '' | 'M' | 'B'

export function formatSupply(value: string) {
  const [whole, fraction] = value.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

export function expandSupply(entry: string, unit: SupplyUnit) {
  if (!entry) return ''

  const [whole, fraction = ''] = entry.split('.')
  const integer = whole || '0'
  const places = integer.length + (unit === 'B' ? 9 : unit === 'M' ? 6 : 0)
  const digits = `${integer}${fraction}`.padEnd(places, '0')
  const expandedWhole = digits.slice(0, places).replace(/^0+(?=\d)/, '')
  const expandedFraction = digits.slice(places).replace(/0+$/, '')

  return expandedFraction ? `${expandedWhole}.${expandedFraction}` : expandedWhole
}
