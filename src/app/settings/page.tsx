'use client'

import { useState, type ReactNode, type ComponentType, type SVGProps } from 'react'
import { useRouter } from 'next/navigation'
import { GitFork, LogOut, Wallet } from 'lucide-react'
import { AuthGate } from '@/components/auth-gate'
import { GithubIcon, XLogoIcon } from '@/components/brand-icons'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { loadConnections, randomScore, saveConnections, shortAddress, type ConnectionKey, type Connections } from '@/lib/connections'
import { useLaunchpad } from '@/lib/launchpad'

const providers: { key: ConnectionKey; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'x', label: 'X', Icon: XLogoIcon }, { key: 'github', label: 'GitHub', Icon: GithubIcon }, { key: 'gitlab', label: 'GitLab', Icon: GitFork },
]

export default function SettingsPage() {
  const { isSignedIn, address, logout } = useLaunchpad()
  if (!isSignedIn) return <AuthGate destination="/settings" description="Connect your Stellar wallet to manage linked identities and account settings." />
  return <SettingsContent key={address} address={address} logout={logout} />
}

function SettingsContent({ address, logout }: { address?: string; logout: () => void }) {
  const router = useRouter()
  const [connections, setConnections] = useState<Connections>(() => loadConnections(address))
  const [connecting, setConnecting] = useState<ConnectionKey | null>(null)
  const [publicProfile, setPublicProfile] = useState(true)
  const [showHandles, setShowHandles] = useState(false)
  const [launchEmails, setLaunchEmails] = useState(true)

  function updateConnection(provider: ConnectionKey) {
    if (connections[provider].connected) {
      const next = { ...connections, [provider]: { connected: false } }
      setConnections(next)
      saveConnections(address, next)
      return
    }
    setConnecting(provider)
    window.setTimeout(() => {
      const next = { ...connections, [provider]: { connected: true, handle: provider === 'x' ? '@stellar_builder' : 'stellar-builder', score: randomScore(), source: 'prototype' as const } }
      setConnections(next)
      saveConnections(address, next)
      setConnecting(null)
    }, 850)
  }

  return <div className="flex flex-col gap-7">
    <PageHeader eyebrow="Account" title="Account and connections" description="Manage the wallets and accounts behind your reputation, and decide what is public." />
    <div className="grid items-start gap-6 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)]"><aside className="flex flex-col gap-1 text-ui font-medium lg:sticky lg:top-6">{[['Wallets','wallets'],['Linked accounts','linked'],['Privacy','privacy'],['Notifications','notifications'],['API permissions','permissions'],['Security','security']].map(([label,id],index)=><a key={id} href={`#${id}`} className={`rounded-lg px-3 py-2 ${index===0?'bg-secondary':'text-muted-foreground hover:bg-muted'}`}>{label}</a>)}<div className="mt-4 rounded-xl bg-muted p-4"><Wallet className="size-5" /><b className="mt-2 block">{shortAddress(address)}</b><span className="text-small text-muted-foreground">Stellar Testnet · Blux</span></div></aside>
      <div className="flex min-w-0 flex-col gap-5">
        <SettingsCard id="wallets" title="Wallets" description="Wallets you prove ownership of by signing a message. No funds move."><div className="flex flex-wrap items-center gap-3 border-t py-4"><span className="grid size-10 place-items-center rounded-lg bg-muted"><Wallet className="size-5" /></span><div className="grow"><b className="font-mono text-ui">{shortAddress(address)}</b><span className="block text-small text-muted-foreground">Connected through Blux</span></div><Badge variant="lime">Primary</Badge><Badge variant="net">TESTNET</Badge><Button variant="outline" size="sm" onClick={() => router.push('/portfolio')}>Portfolio</Button></div><p className="text-small text-muted-foreground">Additional wallet linking is not available through the current Blux integration.</p></SettingsCard>
        <SettingsCard id="linked" title="Linked accounts" description="Optional accounts add independent signals to your reputation profile."><div className="flex flex-col">{providers.map(({key,label,Icon})=><div key={key} className="flex flex-wrap items-center gap-3 border-t py-3"><span className="grid size-9 place-items-center rounded-lg bg-muted"><Icon className="size-4" /></span><div className="min-w-28 grow"><b className="text-ui">{label}</b><span className="block text-small text-muted-foreground">{connections[key].connected ? `${connections[key].handle} · Signal ${connections[key].score}` : 'Not connected'}</span></div>{connections[key].connected && <Badge variant="ok">Connected</Badge>}<Button variant={connections[key].connected?'outline':'default'} size="sm" disabled={connecting!==null} onClick={()=>updateConnection(key)}>{connecting===key?'Connecting…':connections[key].connected?'Disconnect':'Connect'}</Button></div>)}</div><p className="text-small text-muted-foreground">Optional connection buttons generate local prototype signals until OAuth linking is available.</p></SettingsCard>
        <SettingsCard id="privacy" title="Privacy" description="Choose what appears on your public reputation profile."><ToggleRow label="Public reputation profile" description="Let people find the signals you choose to publish." value={publicProfile} onChange={setPublicProfile} /><ToggleRow label="Show linked account handles" description="Show public usernames next to connected signals." value={showHandles} onChange={setShowHandles} /><p className="pt-2 text-small text-muted-foreground">These display preferences are local to this session until profile settings are connected.</p></SettingsCard>
        <SettingsCard id="notifications" title="Notifications" description="Decide which launch events should reach you."><ToggleRow label="Launch and claim reminders" description="Get reminders before commitments close or tokens unlock." value={launchEmails} onChange={setLaunchEmails} /><p className="pt-2 text-small text-muted-foreground">Notification delivery is not configured yet.</p></SettingsCard>
        <SettingsCard id="permissions" title="API permissions" description="Apps that can read your reputation through the LumenRise API."><p className="border-t pt-4 text-small text-muted-foreground">No API permission records are available in this frontend. Access logs and revocation require the permissions service.</p></SettingsCard>
        <SettingsCard id="security" title="Security" description="Manage your browser session."><div className="flex flex-wrap items-center justify-between gap-4 border-t py-3"><div><b className="text-ui">Sign out</b><p className="text-small text-muted-foreground">Your saved prototype identity connections remain attached to this wallet.</p></div><Button variant="outline" onClick={logout}><LogOut data-icon="inline-start" /> Log out</Button></div></SettingsCard>
      </div>
    </div>
  </div>
}

function SettingsCard({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <Card id={id}><CardHeader><CardTitle className="text-title">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>{children}</Card>
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 border-t py-4"><div><b className="text-ui">{label}</b><p className="text-small text-muted-foreground">{description}</p></div><Switch checked={value} onCheckedChange={onChange} aria-label={label} /></div>
}
