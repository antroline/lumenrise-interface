'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CircleAlert, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useLaunchpad } from '@/lib/launchpad'
import { saveAuthReturnTo } from '@/lib/auth-return'
import { getApiChain, getApiNetwork } from '@/lib/api/client'
import { routeNetwork } from '@/lib/chain-address'

/**
 * Renders in place of account-only content whenever access is not ready:
 * signed-out visitors get the connect prompt, an in-flight registration check
 * gets a loading state, a failed check gets an error with retry, and
 * unregistered users are sent to the registration flow. Pages decide when to
 * render it via `accountReady`, so no registered-only content shows on a guess.
 */
export function AuthGate({ destination, description }: { destination: string; description: string }) {
  const router = useRouter()
  const { isSignedIn, login, loginPending, loginPhase, account, retryStatusCheck } = useLaunchpad()

  const unregistered = isSignedIn && account.status === 'unregistered'

  useEffect(() => {
    if (!unregistered) return
    saveAuthReturnTo(destination)
    router.replace(getApiChain() === 'base' ? `/register?network=${routeNetwork(getApiNetwork())}` : '/register')
  }, [unregistered, destination, router])

  if (unregistered) {
    return (
      <Empty className="min-h-[60vh] border">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Finish setting up your account</EmptyTitle>
          <EmptyDescription>Taking you to registration…</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isSignedIn && account.status === 'error') {
    return (
      <Empty className="min-h-[60vh] border">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>We couldn&apos;t confirm your account</EmptyTitle>
          <EmptyDescription>{account.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="gap-4">
          <Button size="lg" onClick={retryStatusCheck}>Try again</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (isSignedIn) {
    // A signed-in visitor without a resolved account state is still waiting
    // on the status check, never on a wallet connection.
    return (
      <Empty className="min-h-[60vh] border">
        <EmptyHeader className="max-w-md">
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Checking your account</EmptyTitle>
          <EmptyDescription>Hold on while we confirm your registration.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

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
        <Button size="lg" loading={loginPending} onClick={() => void login(destination)}>
          {loginPending
            ? loginPhase === 'checking'
              ? 'Checking your account…'
              : getApiChain() === 'base' ? 'Opening Privy…' : 'Opening Blux…'
            : getApiChain() === 'base' ? 'Continue with Privy' : 'Continue with Blux'}
          {!loginPending && <ArrowRight data-icon="inline-end" />}
        </Button>
        <Link href="/" className="text-ui font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Browse launches without an account
        </Link>
      </EmptyContent>
    </Empty>
  )
}
