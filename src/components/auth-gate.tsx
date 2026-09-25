'use client'

import Link from 'next/link'
import { ArrowRight, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useLaunchpad } from '@/lib/launchpad'

export function AuthGate({ destination, description }: { destination: string; description: string }) {
  const { login, loginPending } = useLaunchpad()

  return (
    <Empty className="min-h-[60vh] border">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon">
          <Wallet />
        </EmptyMedia>
        <EmptyTitle>Connect a wallet to continue</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-4">
        <Button size="lg" disabled={loginPending} onClick={() => void login(destination)}>
          {loginPending ? <Spinner data-icon="inline-start" /> : null}
          {loginPending ? 'Opening Blux…' : 'Continue with Blux'}
          {!loginPending && <ArrowRight data-icon="inline-end" />}
        </Button>
        <Link href="/" className="text-ui font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Browse launches without an account
        </Link>
      </EmptyContent>
    </Empty>
  )
}
