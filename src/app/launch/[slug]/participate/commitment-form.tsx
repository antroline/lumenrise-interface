'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLaunchpad } from '@/lib/launchpad'

export function CommitmentForm({ slug }: { slug: string }) {
  const { isSignedIn, login, loginPending, notify } = useLaunchpad()
  const [amount, setAmount] = useState('')
  const numericAmount = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(numericAmount) && numericAmount > 0

  const handleContinue = () => {
    if (!valid) return
    if (!isSignedIn) {
      void login(`/launch/${slug}/participate`)
      return
    }
    notify(`${numericAmount.toLocaleString()} USDC preview only. No contract transaction was submitted.`)
  }

  return (
    <section className="p-5 sm:p-7 lg:col-start-1 lg:row-start-1 lg:self-center" aria-labelledby="commitment-heading">
      <h2 id="commitment-heading" className="text-title font-semibold">Commitment preview</h2>
      <p className="mt-2 text-body text-muted-foreground">
        Enter an amount to preview a commitment. No funds will move.
      </p>

      <div className="mt-7">
        <label htmlFor="commitment-amount" className="text-ui font-medium">Amount</label>
        <div className="mt-2 flex items-center gap-3">
          <Input
            id="commitment-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            aria-invalid={amount !== '' && !valid}
            className="h-14 text-xl tabular-nums"
          />
          <span className="text-ui font-medium">USDC</span>
        </div>
        {amount !== '' && !valid && (
          <p role="alert" className="mt-2 text-small text-destructive">Enter an amount greater than zero.</p>
        )}
      </div>

      <Button className="mt-7 w-full" disabled={!valid || loginPending} onClick={handleContinue}>
        {isSignedIn ? 'Preview commitment' : 'Connect wallet to continue'}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </section>
  )
}
