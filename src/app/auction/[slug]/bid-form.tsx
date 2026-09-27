'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { KeyValue } from '@/components/stat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLaunchpad } from '@/lib/launchpad'

export function BidForm({ slug, ticker, minPrice, open }: { slug: string; ticker: string; minPrice: number; open: boolean }) {
  const { isSignedIn, login, loginPending, notify } = useLaunchpad()
  const [price, setPrice] = useState('0.32')
  const [amount, setAmount] = useState('10000')
  const priceValue = Number(price)
  const amountValue = Number(amount)
  const locked = priceValue * amountValue
  const valid = Number.isFinite(priceValue) && priceValue >= minPrice && Number.isFinite(amountValue) && amountValue > 0 && locked <= 5100
  return <Card><h2 className="text-title font-semibold">Place a bid</h2><span className="text-small text-muted-foreground">Reference balance 5,100.00 USDC</span><label htmlFor="bid-price" className="text-ui font-medium">Bid price · USDC per {ticker}</label><Input id="bid-price" inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} aria-invalid={price !== '' && priceValue < minPrice} className="h-12 text-lg font-semibold" /><label htmlFor="bid-amount" className="text-ui font-medium">Amount · {ticker}</label><Input id="bid-amount" inputMode="numeric" value={amount} onChange={event=>setAmount(event.target.value)} aria-invalid={amount !== '' && !valid} className="h-12 text-lg font-semibold" />{!valid && price !== '' && amount !== '' && <p role="alert" className="text-small text-bad">Price must be at least {minPrice} USDC, amount positive, and locked value at most 5,100 USDC.</p>}<div className="rounded-xl bg-muted p-4"><KeyValue label="Locked while bid is open">{Number.isFinite(locked) ? locked.toLocaleString() : '—'} USDC</KeyValue><KeyValue label="Position today · est.">{priceValue >= 0.28 ? 'Inside range' : 'Below range'}</KeyValue><KeyValue label="If it clears at 0.31">{Number.isFinite(amountValue) ? Math.round(amountValue*0.31).toLocaleString() : '—'} USDC</KeyValue><KeyValue label="Network fee">≈ 0.0001 XLM</KeyValue></div><Button disabled={!open || !valid || loginPending} onClick={()=>{if(!isSignedIn){void login(`/auction/${slug}`);return}notify('Bid preview only. Auction contract transactions are not connected.')}}>{!open?'Auction not open':isSignedIn?'Review bid':'Connect wallet with Blux'} <ArrowRight data-icon="inline-end" /></Button><p className="text-small text-muted-foreground">Bids can be updated or cancelled until the auction ends. Every winning bid pays the same clearing price. Unfilled USDC is returned at settlement.</p></Card>
}
