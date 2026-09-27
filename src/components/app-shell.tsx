'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChartPie,
  Code,
  Compass,
  Copy,
  Hexagon,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Blockie } from '@/components/blockie'
import { LogoSymbol } from '@/components/logo'
import { StatusDot } from '@/components/status'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { shortAddress } from '@/lib/connections'
import { getAuction, getLaunch, getTradingToken } from '@/lib/data'
import { useLaunchpad } from '@/lib/launchpad'
import { cn } from '@/lib/utils'

const NETWORK = 'Testnet'

type NavItem = { label: string; href: string; icon: LucideIcon; count?: string; match?: string[] }

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Explore',
    items: [
      { label: 'Discover', href: '/', icon: Compass, match: ['/launch', '/trade', '/auction', '/launches'] },
      { label: 'Reputation explorer', href: '/explorer', icon: Trophy },
    ],
  },
  {
    label: 'You',
    items: [
      { label: 'Portfolio', href: '/portfolio', icon: ChartPie },
      { label: 'Reputation', href: '/reputation', icon: Hexagon },
      { label: 'Missions', href: '/missions', icon: Target, count: '6' },
      { label: 'Account', href: '/settings', icon: Settings },
    ],
  },
  {
    label: 'For projects',
    items: [
      { label: 'Create launch', href: '/create', icon: Plus },
      { label: 'Project dashboard', href: '/dashboard', icon: LayoutGrid, match: ['/campaigns'] },
    ],
  },
  {
    label: 'Developers',
    items: [{ label: 'API & SDK', href: '/developers', icon: Code, match: ['/cli'] }],
  },
]

function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])]
  if (item.href === '/' && pathname === '/') return true
  return prefixes.some((prefix) => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`)))
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col gap-[26px] px-4 pt-[22px] pb-6">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-2 text-[19px] font-bold tracking-[-0.03em]">
        <LogoSymbol size={30} />
        LumenRise
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-[26px]">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <h2 className="px-2.5 pb-2 font-mono text-2xs font-medium tracking-[0.16em] text-faint uppercase">
              {group.label}
            </h2>
            {group.items.map((item) => {
              const active = isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-[38px] items-center gap-[11px] rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none',
                    active &&
                      'bg-secondary text-foreground hover:bg-secondary before:absolute before:top-[11px] before:-left-4 before:h-4 before:w-1 before:rounded-r-[3px] before:bg-emphasis',
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                  {item.count && (
                    <span className="ml-auto font-mono text-caption text-faint" aria-label={`${item.count} available`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 rounded-[14px] border p-3.5 font-mono text-caption text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <StatusDot tone="ok" />
          <b className="font-medium text-foreground">Stellar {NETWORK}</b>
        </div>
        <div className="flex justify-between">
          <span>Ledger</span>
          <b className="font-medium text-foreground">58,214,907</b>
        </div>
        <div className="flex justify-between">
          <span>Synced</span>
          <b className="font-medium text-foreground">4s ago</b>
        </div>
      </div>
    </div>
  )
}

type Crumb = { label: string; href?: string }

function projectName(section: string, slug: string) {
  const record = section === 'auction' ? getAuction(slug) : section === 'trade' ? getTradingToken(slug) : getLaunch(slug)
  return record?.name ?? 'Project'
}

function crumbsFor(pathname: string): Crumb[] {
  const [first, second, third] = pathname.split('/').filter(Boolean)
  switch (first) {
    case undefined:
    case 'launches':
      return [{ label: 'Explore' }, { label: 'Discover' }]
    case 'launch':
    case 'trade':
    case 'auction': {
      const name = projectName(first, second ?? '')
      const tail = first === 'trade' ? 'Trade' : first === 'auction' ? 'Auction' : third === 'participate' ? 'Participate' : null
      const projectHref = first === 'launch' && tail ? `/launch/${second}` : undefined
      return [{ label: 'Discover', href: '/' }, { label: name, href: projectHref }, ...(tail ? [{ label: tail }] : [])]
    }
    case 'explorer':
      return [{ label: 'Explore' }, { label: 'Reputation explorer' }]
    case 'portfolio':
      return [{ label: 'You' }, { label: 'Portfolio' }]
    case 'reputation':
      return [{ label: 'You' }, { label: 'Reputation' }]
    case 'missions':
      return [{ label: 'You' }, { label: 'Missions' }]
    case 'settings':
      return [{ label: 'You' }, { label: 'Account' }]
    case 'onboarding':
      return [{ label: 'You' }, { label: 'Onboarding' }]
    case 'create':
      return [{ label: 'For projects' }, { label: 'Create launch' }]
    case 'dashboard':
      return [{ label: 'For projects' }, { label: 'Northstar' }, { label: 'Dashboard' }]
    case 'campaigns':
      return [{ label: 'For projects' }, { label: 'Campaigns' }]
    case 'developers':
    case 'cli':
      return [{ label: 'Developers' }, { label: 'API & SDK' }]
    default:
      return [{ label: 'LumenRise' }]
  }
}

function Breadcrumbs() {
  const crumbs = crumbsFor(usePathname())
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
      <ol className="flex items-center gap-2 font-mono text-meta tracking-[0.08em] text-faint uppercase">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={crumb.label} className="flex items-center gap-2 whitespace-nowrap">
              {last ? (
                <b aria-current="page" className="font-medium text-foreground">
                  {crumb.label}
                </b>
              ) : crumb.href ? (
                <Link href={crumb.href} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <form
      role="search"
      className="ml-auto hidden w-[340px] sm:block"
      onSubmit={(event) => {
        event.preventDefault()
        const query = new FormData(event.currentTarget).get('q')?.toString().trim()
        if (query) router.push(`/explorer?q=${encodeURIComponent(query)}`)
      }}
    >
      <InputGroup className="h-10">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          name="q"
          type="search"
          placeholder="Search projects, tokens, addresses"
          aria-label="Search projects, tokens and addresses"
          className="text-body"
        />
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}

const notifications = [
  { title: 'Northstar sale closes in 2 days', time: '2h ago' },
  { title: 'Commons final allocation is published', time: 'Yesterday' },
]

function Notifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Notifications, 2 unread" className="relative">
            <Bell />
            <span
              aria-hidden="true"
              className="absolute top-[9px] right-2.5 size-[7px] rounded-full border-[1.5px] border-background bg-orange"
            />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {notifications.map((notification) => (
            <DropdownMenuItem key={notification.title} className="flex-col items-start gap-0.5">
              <span className="text-ui font-medium text-foreground">{notification.title}</span>
              <span className="font-mono text-caption text-faint">{notification.time}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WalletButton() {
  const { isSignedIn, address, login, logout, loginPending, notify } = useLaunchpad()

  if (!isSignedIn || !address) {
    return (
      <Button variant="dark" className="h-10" onClick={() => void login()} disabled={loginPending}>
        <Wallet data-icon="inline-start" />
        {loginPending ? 'Connecting…' : 'Connect wallet'}
      </Button>
    )
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      notify('Address copied to clipboard.')
    } catch {
      notify('Could not copy the address. Copy it from your account page instead.')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-10 gap-2.5 pr-3.5 pl-1.5 font-mono text-small font-normal">
            <Blockie seed={address} size={28} radius={7} />
            <span className="hidden sm:inline">{shortAddress(address)}</span>
            <span className="sr-only sm:hidden">Wallet menu</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void copyAddress()}>
            <Copy />
            Copy address
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout}>
            <LogOut />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Routes that render as a focused flow without the sidebar and top bar. */
const bareRoutes = new Set(['/onboarding'])

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const pathname = usePathname()

  if (bareRoutes.has(pathname)) return children

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r lg:block">
        <SidebarContent />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-10">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu />
                </Button>
              }
            />
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/" aria-label="LumenRise home" className="lg:hidden">
            <LogoSymbol size={28} />
          </Link>

          <Breadcrumbs />
          <GlobalSearch />

          <div className="ml-auto flex items-center gap-3 sm:ml-0">
            <div className="hidden h-10 items-center gap-2 rounded-lg border px-3.5 text-ui font-medium xl:flex">
              <StatusDot tone="ok" />
              {NETWORK}
            </div>
            <ThemeToggle />
            <Notifications />
            <WalletButton />
          </div>
        </header>

        <main className="animate-settle mx-auto w-full max-w-[1200px] px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 lg:pb-[72px]">
          {children}
        </main>
      </div>
    </div>
  )
}
