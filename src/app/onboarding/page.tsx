'use client'

import { useState, type ComponentType, type SVGProps } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Copy, GitFork, ShieldCheck, Wallet } from 'lucide-react'
import { GithubIcon, XLogoIcon } from '@/components/brand-icons'
import { AuthGate } from '@/components/auth-gate'
import { LogoHorizontal } from '@/components/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CoordinateField, InsetField, SignalTopology } from '@/components/visual-system'
import { loadConnections, randomScore, saveConnections, shortAddress, type Connection, type ConnectionKey, type Connections } from '@/lib/connections'
import { useLaunchpad } from '@/lib/launchpad'

const providers: { key: ConnectionKey; title: string; description: string; signal: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'x', title: 'Connect X', description: 'Use your X account as the public identity on your profile.', signal: 'Social reputation', Icon: XLogoIcon },
  { key: 'github', title: 'Connect GitHub', description: 'Verify contribution history and developer activity.', signal: 'Developer reputation', Icon: GithubIcon },
  { key: 'gitlab', title: 'Connect GitLab', description: 'Add project history from your GitLab account.', signal: 'Developer reputation', Icon: GitFork },
]

export default function OnboardingPage() {
  const { isSignedIn, address } = useLaunchpad()
  if (!isSignedIn) return <div className="mx-auto max-w-3xl p-6"><AuthGate destination="/onboarding" description="Connect your wallet with Blux to complete optional profile setup." /></div>
  return <OnboardingContent key={address} address={address} />
}

function OnboardingContent({ address }: { address?: string }) {
  const router = useRouter()
  const [connections, setConnections] = useState<Connections>(() => loadConnections(address))
  const [connecting, setConnecting] = useState<ConnectionKey | null>(null)
  const [copied, setCopied] = useState(false)
  const completed = Object.values(connections).filter(connection => connection.connected).length

  function connect(provider: ConnectionKey) {
    setConnecting(provider)
    window.setTimeout(() => {
      const next = { ...connections, [provider]: { connected: true, handle: provider === 'x' ? '@stellar_builder' : 'stellar-builder', score: randomScore(), source: 'prototype' as const } }
      setConnections(next)
      saveConnections(address, next)
      setConnecting(null)
    }, 850)
  }

  async function copyAddress() {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function finish() {
    window.localStorage.setItem(`launchpad:onboarded:${address}`, 'true')
    const destination = window.sessionStorage.getItem('launchpad:returnTo') || '/portfolio'
    window.sessionStorage.removeItem('launchpad:returnTo')
    router.push(destination)
  }

  return <div className="min-h-screen bg-background"><header className="mx-auto flex max-w-7xl items-center justify-between border-b px-5 py-6 sm:px-8"><LogoHorizontal height={24} /><Button variant="ghost" onClick={finish}>Skip for now</Button></header><main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14 lg:py-16">
    <aside className="flex flex-col gap-6 lg:pt-6"><div className="grid size-14 place-items-center rounded-2xl bg-lime text-ink"><Wallet className="size-7" /></div><h2 className="text-display font-bold tracking-[-0.04em]">Your wallet is ready.</h2><p className="text-body text-muted-foreground">Optional setup: add identities that make your activity easier to verify. You control what appears publicly.</p><InsetField className="relative isolate overflow-hidden"><CoordinateField className="opacity-50" /><div className="relative z-10"><span className="mb-3 block font-mono text-2xs tracking-caps text-muted-foreground uppercase">Sources → profile</span><SignalTopology sources={['Stellar wallet','X','GitHub','GitLab']} outcome="Reputation profile" /></div></InsetField><div><div className="mb-2 flex justify-between text-small"><span>Optional connections</span><b>{completed} of 3</b></div><Progress value={(completed / 3) * 100} /></div><p className="flex items-start gap-2 text-small text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />You can disconnect any account later in Settings.</p></aside>
    <section className="flex min-w-0 flex-col gap-5"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><h1 className="text-[34px] font-bold leading-tight tracking-[-0.04em]">Make your activity count.</h1><p className="mt-2 max-w-xl text-body text-muted-foreground">Connections are optional. Each one adds a separate, explainable signal.</p></div><Card size="sm" className="shrink-0"><span className="font-mono text-2xs text-faint uppercase">Stellar account</span><b className="font-mono text-ui">{shortAddress(address)}</b><Button variant="outline" size="sm" onClick={() => void copyAddress()}>{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? 'Copied' : 'Copy'}</Button></Card></div>
      {providers.map(provider=><ConnectionRow key={provider.key} title={provider.title} description={provider.description} signal={provider.signal} Icon={provider.Icon} connection={connections[provider.key]} isConnecting={connecting===provider.key} disabled={connecting!==null} onConnect={()=>connect(provider.key)} />)}
      <Card variant="flat" size="sm"><CardTitle className="text-ui">Prototype connection flow</CardTitle><CardDescription>These buttons generate an illustrative signal locally. Production OAuth linking requires backend integration.</CardDescription></Card>
      <div className="flex flex-col items-start justify-between gap-4 border-t pt-5 sm:flex-row sm:items-center"><p className="text-small text-muted-foreground">{completed===0?'Nothing else is required.':`${completed} optional ${completed===1?'identity':'identities'} connected.`}</p><Button size="lg" onClick={finish}>Continue to your portfolio <ArrowRight data-icon="inline-end" /></Button></div>
    </section></main></div>
}

function ConnectionRow({ title, description, signal, Icon, connection, isConnecting, disabled, onConnect }: { title: string; description: string; signal: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; connection: Connection; isConnecting: boolean; disabled: boolean; onConnect: () => void }) {
  return <Card className="flex-row flex-wrap items-center gap-4"><span className="grid size-11 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></span><div className="min-w-44 grow"><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription><span className="mt-1 block font-mono text-2xs text-faint uppercase">{signal}</span>{connection.connected && <span className="text-small text-ok">{connection.handle} · {connection.source==='blux'?'Connected through Blux':'Prototype connection'}</span>}</div>{connection.connected ? <Badge variant="ok">Signal {connection.score} · Connected</Badge> : <Button variant="outline" disabled={disabled} onClick={onConnect}>{isConnecting?'Connecting…':'Connect'}</Button>}</Card>
}
