'use client'

import { useState, type ReactNode } from 'react'
import { Check, Code2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { KeyValue } from '@/components/stat'

type Mechanism = 'Reputation-weighted' | 'Fixed price' | 'Proportional' | 'Auction' | 'Private / community' | 'Other'
type Draft = {
  mechanism: Mechanism
  tokenSupply: string
  saleAllocation: string
  target: string
  softCap: string
  price: string
  minCommitment: string
  maxCommitment: string
  usdc: boolean
  xlm: boolean
  eurc: boolean
  yxlm: boolean
  level: string
  activity: string
  walletAge: string
  sybilRisk: string
  tge: string
  cliff: string
  duration: string
  opens: string
  closes: string
  claims: string
  allocation: string
  refundable: boolean
  withdrawals: boolean
  extension: boolean
}

const initial: Draft = {
  mechanism: 'Reputation-weighted', tokenSupply: '100,000,000', saleAllocation: '10,000,000', target: '350,000', softCap: '150,000',
  price: '0.035', minCommitment: '50', maxCommitment: 'By reputation', usdc: true, xlm: true, eurc: false, yxlm: false,
  level: '2', activity: '40', walletAge: '90', sybilRisk: 'Low',
  tge: '25', cliff: '1', duration: '6', opens: '2026-10-06T14:00', closes: '2026-10-13T14:00',
  allocation: '2026-10-14T14:00', claims: '2026-10-16T14:00', refundable: true, withdrawals: true, extension: false,
}

const mechanisms: { name: Mechanism; description: string }[] = [
  { name: 'Fixed price', description: 'First come, first served at a set price.' },
  { name: 'Proportional', description: 'Allocate by each participant’s share of commitments.' },
  { name: 'Reputation-weighted', description: 'Caps and weights come from reputation signals.' },
  { name: 'Auction', description: 'Participants bid toward a clearing price.' },
  { name: 'Private / community', description: 'Allowlist or credential-gated round.' },
  { name: 'Other', description: 'Quadratic, lottery or a custom contract.' },
]

function Field({ label, value, onChange, type = 'text', suffix }: { label: string; value: string; onChange: (value: string) => void; type?: string; suffix?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><div className="relative"><Input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} className={suffix ? 'pr-16' : undefined} />{suffix && <span className="pointer-events-none absolute top-3 right-3 font-mono text-small text-faint">{suffix}</span>}</div></div>
}

function FormSection({ number, title, description, children }: { number: number; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6"><div className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime font-mono text-small font-bold text-ink">{number}</span><div><h2 className="text-h2 font-semibold">{title}</h2><p className="mt-1 text-ui text-muted-foreground">{description}</p></div></div>{children}</section>
}

function isDraft(value: unknown): value is Draft {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.entries(initial).every(([key, sample]) => key in value && typeof Reflect.get(value, key) === typeof sample) &&
    mechanisms.some((item) => item.name === Reflect.get(value, 'mechanism'))
}

export function CreateDraft() {
  const [draft, setDraft] = useState<Draft>(initial)
  const [saved, setSaved] = useState(false)
  const [loadMessage, setLoadMessage] = useState('')
  const load = () => {
    const stored = window.localStorage.getItem('lumenrise:create-preview')
    if (!stored) { setLoadMessage('No local draft found in this browser.'); return }
    try {
      const value: unknown = JSON.parse(stored)
      if (!isDraft(value)) { setLoadMessage('The saved draft is invalid.'); return }
      setDraft(value)
      setSaved(true)
      setLoadMessage('Loaded the saved draft.')
    } catch { setLoadMessage('The saved draft could not be read.') }
  }
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setSaved(false); setLoadMessage('') }
  const save = () => { window.localStorage.setItem('lumenrise:create-preview', JSON.stringify(draft)); setSaved(true); setLoadMessage('') }

  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="space-y-8">
      <FormSection number={3} title="Sale mechanism" description="How allocations are decided. You can change this until contracts are deployed.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mechanisms.map((option) => <button key={option.name} type="button" aria-pressed={draft.mechanism === option.name} onClick={() => update('mechanism', option.name)} className={`rounded-xl border p-4 text-left transition-colors ${draft.mechanism === option.name ? 'border-foreground bg-accent' : 'border-border bg-card hover:bg-muted'}`}><span className="flex items-center justify-between text-ui font-semibold">{option.name}<span className={`size-4 rounded-full border-4 ${draft.mechanism === option.name ? 'border-foreground bg-lime' : 'border-border'}`} /></span><span className="mt-1 block text-small text-muted-foreground">{option.description}</span></button>)}
        </div>
      </FormSection>
      <FormSection number={4} title="Token and raise" description="Set the supply, price and commitment limits for this round.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Tokens for sale" value={draft.saleAllocation} onChange={(v) => update('saleAllocation', v)} suffix="TIDE" /><Field label="Target raise" value={draft.target} onChange={(v) => update('target', v)} suffix="USDC" /><Field label="Soft cap" value={draft.softCap} onChange={(v) => update('softCap', v)} suffix="USDC" /><Field label="Price" value={draft.price} onChange={(v) => update('price', v)} suffix="USDC" /><Field label="Min commitment" value={draft.minCommitment} onChange={(v) => update('minCommitment', v)} suffix="USDC" /><Field label="Max commitment" value={draft.maxCommitment} onChange={(v) => update('maxCommitment', v)} /></div><div className="space-y-2"><Label>Accepted assets</Label><div className="flex flex-wrap gap-2">{(['usdc', 'xlm', 'eurc', 'yxlm'] as const).map((asset) => <Button key={asset} size="sm" variant={draft[asset] ? 'dark' : 'outline'} aria-pressed={draft[asset]} onClick={() => update(asset, !draft[asset])}>{draft[asset] && <Check className="size-3" />}{asset === 'yxlm' ? 'yXLM' : asset.toUpperCase()}</Button>)}</div></div>
      </FormSection>
      <FormSection number={5} title="Eligibility and reputation" description="Participants see exactly which rules they pass or fail.">
        <p className="font-mono text-2xs tracking-caps text-faint uppercase">Participants must meet all rules</p><div className="grid gap-4 sm:grid-cols-3"><Field label="Stellar activity · at least" value={draft.activity} onChange={(v) => update('activity', v)} type="number" /><Field label="Wallet age · at least" value={draft.walletAge} onChange={(v) => update('walletAge', v)} type="number" suffix="days" /><Field label="Sybil risk · at most" value={draft.sybilRisk} onChange={(v) => update('sybilRisk', v)} /></div><div className="border-t border-divider pt-4"><Field label="Minimum reputation level" value={draft.level} onChange={(v) => update('level', v)} type="number" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['Level 2 · 250 USDC', 'Level 3 · 1,000 USDC', 'Level 4 · 2,000 USDC', 'Level 5+ · 3,000 USDC'].map((item) => <span key={item} className="rounded-lg bg-muted p-3 text-small">{item}</span>)}</div>
      </FormSection>
      <FormSection number={6} title="Vesting" description="Applies to every allocation from this round.">
        <div className="grid gap-4 sm:grid-cols-3"><Field label="At TGE" value={draft.tge} onChange={(v) => update('tge', v)} type="number" suffix="%" /><Field label="Cliff" value={draft.cliff} onChange={(v) => update('cliff', v)} type="number" suffix="mo" /><Field label="Linear vesting" value={draft.duration} onChange={(v) => update('duration', v)} type="number" suffix="mo" /></div>
      </FormSection>
      <FormSection number={7} title="Schedule and refunds" description="All times are UTC and would be written into a sale contract.">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Opens · UTC" value={draft.opens} onChange={(v) => update('opens', v)} type="datetime-local" /><Field label="Closes · UTC" value={draft.closes} onChange={(v) => update('closes', v)} type="datetime-local" /><Field label="Final allocation · UTC" value={draft.allocation} onChange={(v) => update('allocation', v)} type="datetime-local" /><Field label="TGE and claims · UTC" value={draft.claims} onChange={(v) => update('claims', v)} type="datetime-local" /></div><label className="flex items-center gap-3 border-t border-divider pt-4 text-ui"><Checkbox checked={draft.refundable} onCheckedChange={(value) => update('refundable', value === true)} /> Refund everyone if soft cap is not met</label><label className="flex items-center gap-3 border-t border-divider pt-4 text-ui"><Checkbox checked={draft.withdrawals} onCheckedChange={(value) => update('withdrawals', value === true)} /> Allow withdrawals while the sale is open</label><label className="flex items-center gap-3 border-t border-divider pt-4 text-ui"><Checkbox checked={draft.extension} onCheckedChange={(value) => update('extension', value === true)} /> Allow the team to extend the sale once</label>
      </FormSection>
      <FormSection number={8} title="Contracts" description="Deployment is unavailable until a launch service and verified templates are connected.">
        {['Sale contract', 'Vesting contract', 'Eligibility verifier'].map((name) => <div key={name} className="flex items-center gap-3 border-b border-divider py-3 last:border-0"><span className="grid size-9 place-items-center rounded-lg bg-muted"><Code2 className="size-4" /></span><span className="flex-1 text-ui font-semibold">{name}</span><Badge variant="tag-outline">Not deployed</Badge></div>)}
      </FormSection>
    </div>
    <aside className="space-y-5 xl:sticky xl:top-6">
      <Card><div className="flex justify-between"><CardTitle>Summary</CardTitle><Badge variant="tag-outline">Local draft</Badge></div><div><KeyValue label="Mechanism">{draft.mechanism}</KeyValue><KeyValue label="For sale">{draft.saleAllocation} TIDE</KeyValue><KeyValue label="Price">{draft.price} USDC</KeyValue><KeyValue label="Target · soft cap">{draft.target} · {draft.softCap} USDC</KeyValue><KeyValue label="Accepted">{[['USDC', draft.usdc], ['XLM', draft.xlm], ['EURC', draft.eurc], ['yXLM', draft.yxlm]].filter(([, enabled]) => enabled).map(([name]) => name).join(', ') || 'None'}</KeyValue><KeyValue label="Rules">3 rules</KeyValue><KeyValue label="Vesting">{draft.tge}% TGE · {draft.cliff} + {draft.duration} mo</KeyValue><KeyValue label="Sale window">{draft.opens.slice(5, 10)} – {draft.closes.slice(5, 10)}</KeyValue></div></Card>
      <Card><CardTitle>Launch checklist</CardTitle><CardDescription>Preview configuration only. No project verification or contract deployment has occurred.</CardDescription>{['Mechanism selected', 'Eligibility rules set'].map((item) => <div key={item} className="flex gap-2 text-ui"><Check className="size-4 text-lime" />{item}</div>)}{['Project verified', 'Contracts deployed', 'Audit report attached'].map((item) => <div key={item} className="flex gap-2 text-ui text-muted-foreground"><span className="size-4 rounded border" />{item}</div>)}</Card>
      <Card><CardTitle>Save your preview</CardTitle><CardDescription>This draft stays in this browser. Publishing and contract deployment are not connected.</CardDescription><Button onClick={save}><Save data-icon="inline-start" /> Save local draft</Button><Button variant="outline" onClick={load}>Load saved draft</Button>{(saved || loadMessage) && <p role="status" className="text-small text-muted-foreground">{loadMessage || 'Saved in this browser.'}</p>}<Button variant="outline" disabled title="Launch deployment is not connected">Review and deploy</Button></Card>
    </aside>
  </div>
}
