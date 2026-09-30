'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  ChartPie,
  ChevronDown,
  Compass,
  Copy,
  Gavel,
  Hexagon,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Rocket,
  Search,
  Settings,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Blockie } from '@/components/blockie'
import { LogoHorizontal } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { shortAddress } from '@/lib/connections'
import { getAuction, getLaunch, getTradingToken } from '@/lib/data'
import { useLaunchpad } from '@/lib/launchpad'
import { cn } from '@/lib/utils'
import { projects } from '@/app/launches/_data/projects'

type NavItem = { label: string; href: string; icon: LucideIcon; count?: string; match?: string[] }

const discoverItem: NavItem = { label: 'Discover', href: '/', icon: Compass }
const projectBrowseItems: NavItem[] = [
  { label: 'All projects', href: '/launches', icon: LayoutGrid },
  { label: 'Launches', href: '/launches?category=launch', icon: Rocket, match: ['/launch'] },
  { label: 'Auctions', href: '/launches?category=auction', icon: Gavel, match: ['/auction'] },
  { label: 'Trading', href: '/launches?category=trading', icon: ArrowLeftRight, match: ['/trade'] },
]
const explorerItem: NavItem = { label: 'Reputation explorer', href: '/explorer', icon: Trophy }
const missionsItem: NavItem = { label: 'Missions', href: '/missions', icon: Target, count: '6' }
const projectItems: NavItem[] = [
  { label: 'Create launch', href: '/create', icon: Plus },
  { label: 'Project dashboard', href: '/dashboard', icon: LayoutGrid, match: ['/campaigns'] },
]
const portfolioItem: NavItem = { label: 'Portfolio', href: '/portfolio', icon: ChartPie }
const reputationItem: NavItem = { label: 'Reputation', href: '/reputation', icon: Hexagon }
const reputationMenuItems: NavItem[] = [
  { label: 'My reputation', href: '/reputation', icon: Hexagon },
  explorerItem,
]
const settingsItem: NavItem = { label: 'Account settings', href: '/settings', icon: Settings }
const searchPages = [discoverItem, ...projectBrowseItems, reputationItem, explorerItem, missionsItem, portfolioItem, ...projectItems, settingsItem]

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Explore',
    items: [discoverItem],
  },
  {
    label: 'Projects',
    items: projectBrowseItems,
  },
  {
    label: 'Reputation',
    items: reputationMenuItems,
  },
  {
    label: 'You',
    items: [missionsItem, portfolioItem],
  },
  {
    label: 'For projects',
    items: projectItems,
  },
]

function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])]
  if (item.href === '/' && pathname === '/') return true
  return prefixes.some((prefix) => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`)))
}

function MobileNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col gap-7 overflow-y-auto px-5 pt-6 pb-6">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.03em]">
        <LogoHorizontal height={30} variant="lime" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <h2 className="px-2.5 pb-2 font-mono text-2xs font-medium tracking-[0.16em] text-faint uppercase">
              {group.label}
            </h2>
            {group.items.map((item) => {
              const active = item.href === '/launches' ? false : isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-[11px] rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none',
                    active && 'bg-secondary text-foreground hover:bg-secondary',
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
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

      <div className="mt-auto flex items-center justify-between rounded-lg px-2.5 text-sm text-muted-foreground">
        <span>Appearance</span>
        <ThemeToggle />
      </div>
    </div>
  )
}

const headerNavItem =
  'inline-flex h-full items-center gap-1 whitespace-nowrap px-2.5 text-lg font-medium text-muted-foreground hover:text-foreground focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none'

function HeaderDropdown({ label, href, items, active, pathname }: { label: string; href?: string; items: NavItem[]; active: boolean; pathname: string }) {
  const [open, setOpen] = useState(false)
  const menuId = `header-${label.toLowerCase().replaceAll(' ', '-')}-menu`

  return (
    <div
      className="relative flex h-full items-center"
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') setOpen(true) }}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch') setOpen(false) }}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      {href ? (
        <>
          <Link href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setOpen(false)} className={cn(headerNavItem, 'pr-1', active && 'text-foreground')}>
            {label}
          </Link>
          <button type="button" aria-label={`Show ${label} links`} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(true)} className="mr-2 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none">
            <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
          </button>
        </>
      ) : (
        <button type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(true)} className={cn(headerNavItem, active && 'text-foreground')}>
          {label}
          <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      )}
      <div
        id={menuId}
        aria-label={`${label} links`}
        className={cn(
          'absolute top-full left-0 z-40 flex w-max origin-top-left flex-col gap-1 rounded-2xl bg-popover p-2 shadow-lg ring-1 ring-foreground/10 transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible translate-y-2 scale-[0.98] opacity-0',
        )}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={!item.href.startsWith('/launches') && isActive(pathname, item) ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className="group/item flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-xl bg-muted px-3 py-2 text-base font-medium text-popover-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
          >
            <item.icon className="size-[18px] shrink-0 text-muted-foreground transition-colors group-hover/item:text-foreground group-focus-visible/item:text-foreground" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function HeaderNavigation() {
  const pathname = usePathname()
  const projectsActive = pathname === '/launches' || projectBrowseItems.some((item) => item.match?.some((prefix) => pathname.startsWith(`${prefix}/`)))
  const forProjectsActive = projectItems.some((item) => isActive(pathname, item))
  const reputationActive = isActive(pathname, reputationItem) || isActive(pathname, explorerItem)

  return (
    <nav aria-label="Primary" className="hidden h-full items-center gap-1 xl:flex">
      <Link
        href={discoverItem.href}
        aria-current={pathname === '/' ? 'page' : undefined}
        className={cn(headerNavItem, pathname === '/' && 'text-foreground')}
      >
        Discover
      </Link>
      <HeaderDropdown label="Projects" items={projectBrowseItems} active={projectsActive} pathname={pathname} />
      <HeaderDropdown label="Reputation" href="/reputation" items={reputationMenuItems} active={reputationActive} pathname={pathname} />
      <Link href="/missions" aria-current={isActive(pathname, missionsItem) ? 'page' : undefined} className={cn(headerNavItem, isActive(pathname, missionsItem) && 'text-foreground')}>
        Missions <span className="ml-1 font-mono text-caption text-faint">6</span>
      </Link>
      <Link href={portfolioItem.href} aria-current={isActive(pathname, portfolioItem) ? 'page' : undefined} className={cn(headerNavItem, isActive(pathname, portfolioItem) && 'text-foreground')}>
        Portfolio
      </Link>
      <HeaderDropdown label="For projects" items={projectItems} active={forProjectsActive} pathname={pathname} />
    </nav>
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
      return [{ label: 'Explore' }, { label: 'Discover' }]
    case 'launches':
      return [{ label: 'Explore' }, { label: 'Projects' }]
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
      return [{ label: 'Developers' }, { label: 'API & SDK' }]
    case 'cli':
      return [{ label: 'Developers' }, { label: 'CLI & agents' }]
    default:
      return [{ label: 'LumenRise' }]
  }
}

function Breadcrumbs() {
  const pathname = usePathname()
  if (!/^\/(launch|trade|auction)\//.test(pathname)) return null
  const crumbs = crumbsFor(pathname)
  return (
    <nav aria-label="Breadcrumb" className="mb-6 hidden min-w-0 md:block">
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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.key === '/' && !typing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Search" aria-keyshortcuts="/ Control+K Meta+K" onClick={() => setOpen(true)} className="rounded-full text-muted-foreground hover:text-foreground min-[1440px]:hidden">
        <Search />
      </Button>
      <Button variant="outline" aria-label="Search in LumenRise" aria-keyshortcuts="/ Control+K Meta+K" onClick={() => setOpen(true)} className="hidden h-10 w-60 justify-start gap-2.5 rounded-xl border-border/70 bg-secondary/40 px-3 text-ui font-normal text-muted-foreground hover:bg-secondary hover:text-foreground min-[1440px]:inline-flex">
        <Search className="size-4" />
        <span className="truncate">search in LumenRise</span>
        <Kbd className="ml-auto">/</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search LumenRise" description="Find a page or project" className="sm:max-w-lg">
        <Command filter={(value, search) => value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0}>
          <CommandInput autoFocus placeholder="Search pages and projects…" aria-label="Search pages and projects" />
          <CommandList>
            <CommandEmpty>No matching pages or projects.</CommandEmpty>
            <CommandGroup heading="Pages">
              {searchPages.map((page) => (
                <CommandItem key={page.href} value={`${page.label} ${page.href}`} onSelect={() => navigate(page.href)}>
                  <page.icon className="text-muted-foreground" />
                  <span>{page.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Projects">
              {projects.map((project) => {
                const Icon = project.category === 'Launch' ? Rocket : project.category === 'Auction' ? Gavel : ArrowLeftRight
                return (
                  <CommandItem key={project.id} value={`${project.name} ${project.ticker} ${project.category}`} onSelect={() => navigate(project.href)}>
                    <Icon className="text-muted-foreground" />
                    <span>{project.name}</span>
                    <span className="ml-auto text-caption text-muted-foreground">{project.ticker} · {project.category}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

function WalletButton() {
  const { isSignedIn, address, login, logout, loginPending, notify } = useLaunchpad()
  const [displayNetwork, setDisplayNetwork] = useState<'Testnet' | 'Mainnet'>('Testnet')

  if (!isSignedIn || !address) {
    return (
      <Button className="h-10 rounded-full" onClick={() => void login()} disabled={loginPending}>
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
          <Button variant="ghost" className="h-10 gap-2 rounded-full bg-ink px-2.5 font-mono text-small font-medium text-white hover:bg-ink/85 hover:text-white aria-expanded:bg-ink/85 dark:bg-lime dark:text-ink dark:hover:bg-lime-hover dark:hover:text-ink dark:aria-expanded:bg-lime-hover">
            <Blockie seed={address} size={24} radius={6} />
            <span className="hidden sm:inline">{shortAddress(address)}</span>
            <span className="sr-only sm:hidden">Wallet menu</span>
            <ChevronDown className="size-3.5 text-white/70 dark:text-ink/70" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pt-2">Network · display only</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={displayNetwork} onValueChange={(value) => {
            if (value === 'Testnet' || value === 'Mainnet') setDisplayNetwork(value)
          }}>
            <DropdownMenuRadioItem value="Testnet">Testnet</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="Mainnet">Mainnet <span className="text-caption text-muted-foreground">Preview</span></DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <p className="px-2 py-1 text-caption leading-relaxed text-muted-foreground">Wallet remains on Stellar Testnet.</p>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href={settingsItem.href} />}>
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyAddress()}>
            <Copy />
            Copy address
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

/** Routes that render as a focused flow without the site navigation. */
const bareRoutes = new Set(['/onboarding'])

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 0)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  if (bareRoutes.has(pathname)) return children

  return (
    <div className="min-h-screen bg-background">
      <header className={cn('sticky top-0 z-30 transition-colors duration-200', scrolled && 'bg-background/95 backdrop-blur-sm')}>
        <div className="flex h-[68px] w-full items-center gap-2 px-4 sm:gap-3 sm:px-5 lg:px-6">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open navigation">
                  <Menu />
                </Button>
              }
            />
            <SheetContent side="left" className="w-[280px] p-0 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileNavigation onNavigate={() => setNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/" aria-label="LumenRise home" className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-1 text-[19px] font-bold tracking-[-0.03em] focus-visible:ring-3 focus-visible:ring-lime/55 focus-visible:outline-none">
            <span className="block w-[30px] overflow-hidden sm:w-auto">
              <LogoHorizontal height={30} variant="lime" className="max-w-none" />
            </span>
          </Link>
          <HeaderNavigation />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <GlobalSearch />
            <div className="hidden xl:block"><ThemeToggle /></div>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className={cn(
        'animate-settle mx-auto w-full px-4 pt-6 pb-16 sm:pt-8 lg:pt-10 lg:pb-[72px]',
        pathname === '/launches' ? 'sm:px-5 lg:px-6' : 'max-w-[1200px] sm:px-6 lg:px-10',
      )}>
        <Breadcrumbs />
        {children}
      </main>
    </div>
  )
}
