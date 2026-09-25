'use client'

import { useState } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import { SectionHeader } from '@/components/page-header'
import { KeyValue } from '@/components/stat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLaunchpad } from '@/lib/launchpad'

export function CommitmentForm({ slug, ticker, open }: { slug: string; ticker: string; open: boolean }) {
  const { isSignedIn, login, loginPending, notify } = useLaunchpad()
  const [mode, setMode] = useState('deposit')
  const [amount, setAmount] = useState('500')
  const value = Number(amount)
  const limit = mode === 'deposit' ? 500 : 1500
  const valid = Number.isFinite(value) && value > 0 && value <= limit
  return <Card><SectionHeader title="Manage commitment" action={<ToggleGroup value={[mode]} onValueChange={values => { if (values[0]) setMode(values[0]) }}><ToggleGroupItem value="deposit">Deposit</ToggleGroupItem><ToggleGroupItem value="withdraw">Withdraw</ToggleGroupItem></ToggleGroup>} />
    <label htmlFor="commitment-amount" className="text-ui font-medium">Amount</label><div className="flex items-center gap-2"><Input id="commitment-amount" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" aria-invalid={amount !== '' && !valid} className="h-16 text-2xl" /><span className="font-mono text-ui">USDC</span></div>
    <p className="text-small text-muted-foreground">{mode === 'deposit' ? 'Reference wallet balance 2,340 USDC · max remaining 500 USDC' : 'Reference committed balance 1,500 USDC'}</p>{amount !== '' && !valid && <p role="alert" className="text-small text-bad">Enter an amount between 0 and {limit} USDC.</p>}
    <div className="rounded-xl bg-muted p-4"><KeyValue label={`New total ${mode === 'deposit' ? 'commitment' : 'after withdrawal'}`}>{valid ? (mode === 'deposit' ? 1500 + value : 1500 - value).toLocaleString() : '—'} USDC</KeyValue><KeyValue label="Estimated allocation">{valid ? `≈ ${Math.round((mode === 'deposit' ? 1500 + value : 1500 - value) / 0.042).toLocaleString()} ${ticker}` : '—'}</KeyValue><KeyValue label="Sale price">0.042 USDC / {ticker}</KeyValue><KeyValue label="Network fee">≈ 0.0001 XLM</KeyValue></div>
    <Button disabled={!open || !valid || loginPending} onClick={() => { if (!isSignedIn) { void login(`/launch/${slug}/participate`); return } notify(`${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} preview only. Contract transactions are not connected.`) }}>{!open ? 'Participation not open' : isSignedIn ? `${mode === 'deposit' ? 'Review deposit' : 'Review withdrawal'}` : 'Connect wallet with Blux'} <ArrowRight data-icon="inline-end" /></Button>
    <p className="flex gap-2 rounded-xl bg-muted p-4 text-small text-muted-foreground"><Lock className="size-4 shrink-0" />Withdrawals are permitted until the sale closes. Unallocated USDC is returned at settlement.</p>
  </Card>
}
