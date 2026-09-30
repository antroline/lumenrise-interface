import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Eye, Globe, Info, Plus, Target } from 'lucide-react'
import { Blockie } from '@/components/blockie'
import { DiscordIcon, FarcasterIcon, GithubIcon, StellarIcon, TelegramIcon, XLogoIcon } from '@/components/brand-icons'
import { IconTile } from '@/components/icon-tile'
import { PageHeader, SectionHeader } from '@/components/page-header'
import { Label } from '@/components/stat'
import { SourceLabel, StatusText } from '@/components/status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RuledPanel, Trajectory } from '@/components/visual-system'
import { accounts, categories, profile, radarLabels, radarValues, type AccountIcon } from './_data'
import { CategoryCard } from './_components/category-card'
import { CategoryFilter, type CategoryView } from './_components/category-filter'
import { CopyAddress } from './_components/copy-address'
import { RadarChart } from './_components/radar-chart'

export const metadata: Metadata = { title: 'Reputation' }

type SearchParams = Promise<{ cat?: string }>

const accountIcons: Record<AccountIcon, typeof GithubIcon> = {
  stellar: StellarIcon,
  github: GithubIcon,
  xlogo: XLogoIcon,
  discord: DiscordIcon,
  telegram: TelegramIcon,
  farcaster: FarcasterIcon,
}

function LevelBar() {
  return (
    <div className="flex gap-1">
      {Array.from({ length: profile.levelMax }, (_, i) => i + 1).map((step) => (
        <span key={step} className="h-2 flex-1 overflow-hidden rounded-xs bg-secondary">
          {step <= profile.level ? (
            <span className="block h-full w-full bg-emphasis" />
          ) : step === profile.level + 1 ? (
            <span className="block h-full bg-lime" style={{ width: `${profile.nextLevelProgress}%` }} />
          ) : null}
        </span>
      ))}
    </div>
  )
}

function AccountRow({ account, first }: { account: (typeof accounts)[number]; first: boolean }) {
  const Icon = accountIcons[account.icon]
  return (
    <div className={cn('flex items-center gap-3.5 py-[11px]', !first && 'border-t border-divider')}>
      <IconTile tone={account.emphasized ? 'dark' : 'default'}>
        <Icon className="size-[17px]" />
      </IconTile>
      <div className="flex min-w-0 grow flex-col">
        <b className="text-body font-semibold">{account.name}</b>
        <span className={cn('text-xs', account.mono ? 'font-mono text-muted-foreground' : 'text-muted-foreground')}>
          {account.handle}
        </span>
      </div>
      <span className="hidden w-[180px] text-small text-muted-foreground lg:block">{account.categories}</span>
      {account.connected ? (
        <StatusText tone="ok" icon={Check} className="w-[110px] shrink-0 justify-end sm:justify-start">
          Connected
        </StatusText>
      ) : (
        <Button
          variant="secondary"
          size="xs"
          className="w-[110px] shrink-0"
          render={<Link href="/settings" />}
          nativeButton={false}
        >
          Connect
        </Button>
      )}
    </div>
  )
}

export default async function ReputationPage({ searchParams }: { searchParams: SearchParams }) {
  const { cat } = await searchParams
  const view: CategoryView = cat === 'work' ? 'work' : 'all'
  const visible = view === 'work' ? categories.filter((category) => category.items.some((item) => !item.done)) : categories

  return (
    <>
      <PageHeader
        eyebrow="Reputation"
        title="Your reputation"
        description="Six signals built from the accounts you connect. Each one shows what counts, where the data comes from and when it was last updated."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href={`/explorer?q=${profile.name}`} />} nativeButton={false}>
              <Eye data-icon="inline-start" />
              View public profile
            </Button>
            <Button variant="dark" render={<Link href="/missions" />} nativeButton={false}>
              <Target data-icon="inline-start" />
              Improve with missions
            </Button>
          </div>
        }
      />

      <p className="mt-5 text-small text-muted-foreground">This reputation profile and its connection statuses are illustrative. Live profile data is not connected yet.</p>

      <Card className="relative mt-5 grid gap-8 overflow-hidden p-7 xl:grid-cols-[minmax(0,1fr)_1px_360px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Blockie seed={profile.address} size={84} radius={22} className="shrink-0" />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-big font-bold tracking-[-0.03em]">{profile.name}</span>
              <Badge variant="ok" size="sm">
                <Check />
                Wallet verified
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted-foreground">
              <span className="font-mono">{profile.addressShort}</span>
              <CopyAddress address={profile.address} />
              <span aria-hidden="true">·</span>
              <span>Member since {profile.memberSince}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Globe aria-hidden="true" className="size-3.5" />
                {profile.visibility}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="tag">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="bg-divider max-xl:h-px xl:w-px" />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Reputation level</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="inline-flex items-center gap-1 text-small font-medium text-foreground underline-offset-4 hover:underline">
                  How levels work
                  <Info aria-hidden="true" className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Levels sum your six signals. Launches set their own rules, so a level alone never decides eligibility.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[34px] font-semibold tracking-[-0.03em] tabular-nums">Level {profile.level}</span>
            <span className="text-small text-muted-foreground">
              of {profile.levelMax} · {profile.levelName}
            </span>
          </div>
          <LevelBar />
          <span className="text-small text-muted-foreground">
            {profile.pointsToNext} points to Level {profile.level + 1}. Launches set their own rules, so a level alone
            never decides eligibility.
          </span>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Signal overview</CardTitle>
            <CardAction>
              <SourceLabel>Methodology v2.3</SourceLabel>
            </CardAction>
          </CardHeader>
          <div className="grid place-items-center">
            <RadarChart values={radarValues} labels={radarLabels} />
          </div>
          <p className="mt-3 text-center text-small text-muted-foreground">
            Sybil risk is shown inverted here as resistance, so a larger shape is always better.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Connected accounts</CardTitle>
              <CardDescription>
                6 of 7 connected. Each account only adds signals to the categories it can prove.
              </CardDescription>
            </div>
            <CardAction>
              <Button variant="outline" size="sm" render={<Link href="/settings" />} nativeButton={false}>
                <Plus data-icon="inline-start" />
                Connect account
              </Button>
            </CardAction>
          </CardHeader>
          <div className="flex flex-col">
            {accounts.map((account, i) => (
              <AccountRow key={account.key} account={account} first={i === 0} />
            ))}
          </div>
        </Card>
      </div>

      <RuledPanel className="mt-8"><Trajectory label="How reputation informs eligibility" active={2} steps={[{label:'Connected sources'},{label:'Measured signals'},{label:'Reputation profile'},{label:'Launch rule'}]} /></RuledPanel>

      <section className="mt-10">
        <SectionHeader
          title="Categories"
          description="What contributes to each signal and what you can still add."
          action={<CategoryFilter view={view} />}
        />
        <div className="border-t border-divider">
          {visible.map((category) => (
            <CategoryCard key={category.key} category={category} />
          ))}
        </div>
      </section>

      <Alert className="mt-6">
        <Info aria-hidden="true" />
        <AlertDescription>
          <b>Limitations.</b> Signals only use public data from accounts you connect. Activity on other chains, private
          repositories and deleted posts are not counted. Sybil risk is inferred by a model and can be wrong. You can
          request a review from Account settings.
        </AlertDescription>
      </Alert>
    </>
  )
}
