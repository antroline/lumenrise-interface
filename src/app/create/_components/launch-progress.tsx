'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { shortAddress, type LaunchRecord } from '../_launch/launch-state'
import { LOCK_CONTRACT_ID } from '../_launch/transactions'

function TransactionLink({ hash, label = 'View transaction' }: { hash?: string; label?: string }) {
  if (!hash) return null
  return <a className="inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4" href={`https://stellar.expert/explorer/testnet/tx/${hash}`} target="_blank" rel="noreferrer">{label}<ExternalLink className="size-3" aria-hidden="true" /></a>
}

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="grid min-w-0 grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-divider py-3 last:border-0"><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className="min-w-0 text-right font-mono text-[13px] break-all">{href ? <a className="underline underline-offset-4" href={href} target="_blank" rel="noreferrer" title={value}>{shortAddress(value)}</a> : value}</dd></div>
}

export function LaunchProgress({ record, step }: { record: LaunchRecord | null; step: 1 | 2 | 3 | null }) {
  const firstDone = !!record && record.stage !== 'setupPending' && record.stage !== 'issuerReady'
  const secondDone = record?.stage === 'sacConfirmed' || record?.stage === 'depositPending' || record?.stage === 'complete' || record?.stage === 'withdrawPending' || record?.stage === 'withdrawn'
  const thirdDone = record?.stage === 'complete' || record?.stage === 'withdrawPending' || record?.stage === 'withdrawn'
  const steps = [
    {
      number: 1,
      title: 'Issue token',
      done: firstDone,
      active: !record || step === 1 || record.stage === 'setupPending' || record.stage === 'issuerReady',
    },
    {
      number: 2,
      title: 'Deploy contract',
      done: secondDone,
      active: step === 2 || record?.stage === 'sacPending' || record?.stage === 'setupConfirmed',
    },
    {
      number: 3,
      title: 'Lock supply',
      done: thirdDone,
      active: step === 3 || record?.stage === 'depositPending' || record?.stage === 'sacConfirmed',
    },
  ]

  return <section aria-label="Launch sequence">
    <ol>
      {steps.map((item, index) => <li key={item.number} aria-current={item.active && !item.done ? 'step' : undefined} className="relative grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-x-3.5 pb-9 last:pb-0">
        {index < steps.length - 1 && <span className={cn('absolute top-12 bottom-2 left-5 w-px bg-border', item.done && 'bg-foreground')} aria-hidden="true" />}
        <span className={cn('relative z-10 grid size-10 place-items-center rounded-full text-[16px] font-medium tabular-nums', item.done || item.active ? 'bg-foreground text-background' : 'bg-surface text-muted-foreground')}>
          {item.done ? <Check className="size-5" aria-label="Complete" /> : item.number}
        </span>
        <div className="min-w-0">
          <span className="text-[14px] leading-none text-muted-foreground">Step {item.number}</span>
          <h3 className={cn('mt-1 text-[16px] font-medium leading-tight', !item.done && !item.active && 'text-muted-foreground')}>{item.title}</h3>
        </div>
      </li>)}
    </ol>
  </section>
}

export function LaunchOverview({ record }: { record: LaunchRecord }) {
  return <section aria-labelledby="record-heading">
    <h2 id="record-heading" className="text-[18px] font-semibold tracking-[-0.015em]">On-chain record</h2>
    <dl className="mt-4">
      <Detail label="Asset" value={`${record.code}:${shortAddress(record.issuer)}`} />
      <Detail label="Issuer" value={record.issuer} href={`https://stellar.expert/explorer/testnet/account/${record.issuer}`} />
      <Detail label="SAC" value={record.sac} href={`https://stellar.expert/explorer/testnet/contract/${record.sac}`} />
      <Detail label="Lock" value={LOCK_CONTRACT_ID} href={`https://stellar.expert/explorer/testnet/contract/${LOCK_CONTRACT_ID}`} />
    </dl>
    <Button variant="outline" type="button" className="mt-5 w-full" onClick={() => void navigator.clipboard.writeText(`${record.code}:${record.issuer}`)}><Copy className="size-4" aria-hidden="true" />Copy full asset ID</Button>
    <div className="mt-6 border-t border-divider pt-5">
      <h3 className="text-[14px] font-semibold">Transactions</h3>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <TransactionLink hash={record.setupHash} label="Setup" />
        <TransactionLink hash={record.distributionHash} label="Issuance" />
        <TransactionLink hash={record.sacHash} label="Deployment" />
        <TransactionLink hash={record.depositHash} label="Deposit" />
        <TransactionLink hash={record.withdrawHash} label="Withdrawal" />
      </div>
    </div>
  </section>
}
