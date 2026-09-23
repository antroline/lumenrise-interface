export type BluxUser = {
  address: string
  identifier?: string
  authValue?: string
  authMethod?: string
}

export type ConnectionKey = 'x' | 'github' | 'gitlab'

export type Connection = {
  connected: boolean
  handle?: string
  score?: number
  source?: 'blux' | 'prototype'
}

export type Connections = Record<ConnectionKey, Connection>

export const emptyConnections: Connections = {
  x: { connected: false },
  github: { connected: false },
  gitlab: { connected: false },
}

export function randomScore() {
  const values = new Uint32Array(1)
  window.crypto.getRandomValues(values)
  return 42 + (values[0] % 49)
}

export function shortAddress(address?: string) {
  if (!address) return 'GDEMO…7X2Q'
  return `${address.slice(0, 5)}…${address.slice(-4)}`
}

export function connectionStorageKey(address?: string) {
  return `launchpad:connections:${address || 'preview'}`
}

export function loadConnections(address?: string): Connections {
  try {
    const stored = window.localStorage.getItem(connectionStorageKey(address))
    return stored ? { ...emptyConnections, ...JSON.parse(stored) } : emptyConnections
  } catch {
    return emptyConnections
  }
}

export function saveConnections(address: string | undefined, value: Connections) {
  window.localStorage.setItem(connectionStorageKey(address), JSON.stringify(value))
}

function inferConnection(user: BluxUser): ConnectionKey | null {
  const identity = [user.authMethod, user.authValue, user.identifier]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (identity.includes('twitter') || identity.includes('x.com')) return 'x'
  if (identity.includes('github')) return 'github'
  if (identity.includes('gitlab')) return 'gitlab'
  return null
}

export function hydrateBluxConnection(user: BluxUser) {
  const provider = inferConnection(user)
  if (!provider) return

  const connections = loadConnections(user.address)
  if (connections[provider].connected) return

  const label = provider === 'x' ? '@stellar_builder' : 'stellar-builder'
  const next = {
    ...connections,
    [provider]: {
      connected: true,
      handle: label,
      score: randomScore(),
      source: 'blux' as const,
    },
  }
  saveConnections(user.address, next)
}
