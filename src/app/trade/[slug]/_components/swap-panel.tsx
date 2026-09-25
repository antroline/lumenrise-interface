'use client'

import { useState } from 'react'
import { ArrowDownUp, ArrowRight, ChevronDown, Info, Settings } from 'lucide-react'
import { StellarIcon } from '@/components/brand-icons'
import { ProjectMark } from '@/components/project-mark'
import { KeyValue } from '@/components/stat'
import { StatusDot } from '@/components/status'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLaunchpad } from '@/lib/launchpad'
import type { ProjectMarkName } from '@/components/project-mark'
import {
  BEST_ROUTE,
  NETWORK_FEE_XLM,
  POOL_FEES_XLM,
  PRICE_IMPACT,
  XLM_BALANCE,
  XLM_PER_TOKEN,
  XLM_USD,
  slippageOptions,
  type Slippage,
} from '../_data'

const TOKEN_BALANCE = 0

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, ''))
  return Number.isFinite(amount) ? amount : Number.NaN
}

function formatAmount(value: number, decimals = 2) {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function SwapPanel({
  slug,
  name,
  ticker,
  priceUsd,
}: {
  slug: string
  name: ProjectMarkName
  ticker: string
  priceUsd: number
}) {
  const { isSignedIn, login, loginPending, notify } = useLaunchpad()
  const [payAmount, setPayAmount] = useState('500')
  const [selling, setSelling] = useState(false)
  const [slippage, setSlippage] = useState<Slippage>('0.5')

  const payToken = selling ? ticker : 'XLM'
  const receiveToken = selling ? 'XLM' : ticker
  const payBalance = selling ? TOKEN_BALANCE : XLM_BALANCE

  const amount = parseAmount(payAmount)
  const receive = Number.isFinite(amount) && amount > 0 ? (selling ? amount * XLM_PER_TOKEN : amount / XLM_PER_TOKEN) : 0
  const payUsd = Number.isFinite(amount) && amount > 0 ? amount * (selling ? priceUsd : XLM_USD) : 0
  const receiveUsd = receive * (selling ? XLM_USD : priceUsd)
  const minimumReceived = receive * (1 - Number(slippage) / 100)

  const error = !Number.isFinite(amount) || amount <= 0 ? 'Enter an amount' : amount > payBalance ? `Insufficient ${payToken} balance` : null

  const submit = () => {
    if (error) return
    if (!isSignedIn) {
      void login(`/trade/${slug}`)
      return
    }
    notify(`Review swap: ${payAmount} ${payToken} → ~${formatAmount(receive)} ${receiveToken}. Swaps are not connected to a backend in this preview.`)
  }

  const flip = () => {
    setSelling((current) => !current)
    setPayAmount(receive > 0 ? String(Math.round(receive * 100) / 100) : '')
  }

  const payTokenPill = (
    <span className="flex h-9 shrink-0 items-center gap-2 rounded-full border pr-3 pl-1.5">
      {selling ? (
        <ProjectMark name={name} size={24} />
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-foreground text-background">
          <StellarIcon className="size-3.5" />
        </span>
      )}
      <b className="font-semibold">{payToken}</b>
      <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </span>
  )

  return (
    <Card className="gap-0 p-[22px]">
      <div className="flex items-center justify-between">
        <CardTitle>Swap</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="net" size="sm">
            <StatusDot />
            Testnet
          </Badge>
          <Button
            variant="outline"
            size="icon-sm"
            className="size-8"
            aria-label="Swap settings"
            onClick={() => notify('Routing is automatic in this preview. Slippage can be adjusted below.')}
          >
            <Settings data-icon="inline-start" />
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between gap-3 text-small">
          <span>You pay</span>
          <span>
            Balance {formatAmount(payBalance)} {payToken}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <input
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-label={`Amount to pay in ${payToken}`}
            aria-invalid={error ? true : undefined}
            placeholder="0"
            className="w-full min-w-0 bg-transparent text-[30px] font-semibold tracking-[-0.03em] tabular-nums outline-none placeholder:text-faint"
          />
          {payTokenPill}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-small">
          <span>≈ ${formatAmount(payUsd)}</span>
          <span className="flex items-center gap-1.5">
            {[0.5, 1].map((fraction) => (
              <Badge
                key={fraction}
                variant="tag-outline"
                render={
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(Math.round(payBalance * fraction * 100) / 100))}
                  />
                }
              >
                {fraction === 1 ? 'Max' : '50%'}
              </Badge>
            ))}
          </span>
        </div>
      </div>
      {error && payAmount !== '' && (
        <p role="alert" className="mt-2 text-small text-bad">
          {error}
        </p>
      )}

      <div className="relative z-10 -my-2.5 grid place-items-center">
        <Button variant="outline" size="icon-sm" className="size-9 bg-card" aria-label="Flip swap direction" onClick={flip}>
          <ArrowDownUp data-icon="inline-start" />
        </Button>
      </div>

      <div className="rounded-xl bg-muted p-4">
        <div className="flex items-center justify-between gap-3 text-small">
          <span>You receive · estimated</span>
          <span>
            Balance {formatAmount(selling ? XLM_BALANCE : TOKEN_BALANCE)} {receiveToken}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span aria-live="polite" className="text-[30px] font-semibold tracking-[-0.03em] tabular-nums">
            {receive > 0 ? formatAmount(receive) : '0'}
          </span>
          <span className="flex h-9 shrink-0 items-center gap-2 rounded-full border pr-3 pl-1.5">
            {selling ? (
              <span className="grid size-6 place-items-center rounded-full bg-foreground text-background">
                <StellarIcon className="size-3.5" />
              </span>
            ) : (
              <ProjectMark name={name} size={24} />
            )}
            <b className="font-semibold">{receiveToken}</b>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-2 text-small">≈ ${formatAmount(receiveUsd)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-small">Slippage tolerance</span>
        <ToggleGroup
          aria-label="Slippage tolerance"
          value={[slippage]}
          onValueChange={(values) => {
            const [next] = values
            if (next) setSlippage(next as Slippage)
          }}
        >
          {slippageOptions.map((option) => (
            <ToggleGroupItem key={option} value={option} size="sm" className="font-mono">
              {option}%
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="mt-2">
        <KeyValue label="Rate">
          <span className="font-mono text-small font-medium">
            {selling ? `1 XLM = ${formatAmount(1 / XLM_PER_TOKEN, 4)} ${ticker}` : `1 ${ticker} = ${formatAmount(XLM_PER_TOKEN, 3)} XLM`}
          </span>
        </KeyValue>
        <KeyValue label="Route">{BEST_ROUTE}</KeyValue>
        <KeyValue label="Price impact">{PRICE_IMPACT}</KeyValue>
        <KeyValue label={`Minimum received · ${slippage}% slippage`}>
          {formatAmount(minimumReceived)} {receiveToken}
        </KeyValue>
        <KeyValue label="Pool fees">{POOL_FEES_XLM} XLM</KeyValue>
        <KeyValue label="Network fee">{NETWORK_FEE_XLM} XLM</KeyValue>
      </div>

      {!selling && (
        <Alert size="sm" className="mt-4">
          <Info />
          <span>
            First time holding {ticker}. This swap adds an {ticker} trustline, which reserves 0.5 XLM in your wallet.
          </span>
        </Alert>
      )}

      <Button size="lg" className="mt-4 w-full" disabled={Boolean(error) || loginPending} onClick={submit}>
        Review swap
        <ArrowRight data-icon="inline-end" />
      </Button>
      <p className="mt-3 text-center text-small">
        Swaps execute against third-party liquidity from your wallet. LumenRise does not hold funds or run an exchange.
      </p>
    </Card>
  )
}
