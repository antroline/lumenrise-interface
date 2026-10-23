'use client';

import { API_NETWORK } from '@/lib/stellar/network';
import { getConfiguration } from '@/lib/api/config';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, CornerDownLeft, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { searchPages } from './navigation';

const resultClassName =
  'h-12 min-w-0 cursor-pointer gap-2.5 px-2.5 py-1.5 text-ui sm:h-11 data-[selected=true]:bg-muted data-[selected=true]:text-foreground motion-reduce:transition-none';

const groupClassName =
  'p-0 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:tracking-caps [&_[cmdk-group-heading]]:uppercase';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        aria-keyshortcuts="/ Control+K Meta+K"
        onClick={() => setOpen(true)}
        className="rounded-full text-muted-foreground hover:text-foreground min-[1440px]:hidden"
      >
        <Search />
      </Button>
      <Button
        variant="outline"
        aria-label="Search in LumenRise"
        aria-keyshortcuts="/ Control+K Meta+K"
        onClick={() => setOpen(true)}
        className="hidden h-10 w-60 justify-start gap-2.5 rounded-2xl border-border/70 bg-secondary/40 px-3 text-ui font-normal text-muted-foreground hover:bg-secondary hover:text-foreground min-[1440px]:inline-flex"
      >
        <Search className="size-4" />
        <span className="truncate">Search LumenRise</span>
        <Kbd className="ml-auto">/</Kbd>
      </Button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** The search palette and its `/` and Ctrl/Cmd+K shortcuts. Mount once per page. */
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = event.target instanceof Element && event.target.closest(
        'input, textarea, select, [contenteditable="true"]',
      );
      if (
        (event.key === '/' && !typing) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
      ) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search LumenRise"
      description="Find a page or project"
      className="top-4 max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1.5rem)] gap-0 bg-card sm:top-[min(12dvh,6rem)] sm:max-h-[calc(100dvh-8rem)] sm:max-w-xl motion-reduce:animate-none motion-reduce:duration-0"
    >
      <Command
        className="h-auto min-h-0 bg-card p-0 text-card-foreground [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=input-group]]:h-13! [&_[data-slot=input-group]]:rounded-none! [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent [&_[data-slot=input-group-addon]]:pl-3.5! [&_[data-slot=input-group-addon]>svg]:opacity-100"
        filter={(value, search) =>
          value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
        }
      >
        <div className="relative shrink-0 border-b border-border pr-14">
          <CommandInput maxLength={getConfiguration().rules.launches.searchMaxLength}
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages and projects…"
            aria-label="Search pages and projects"
            className="h-13 min-w-0 text-base placeholder:text-muted-foreground sm:text-sm"
          />
          <div className="absolute top-1/2 right-1.5 -translate-y-1/2 sm:right-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close search"
              onClick={() => onOpenChange(false)}
              className="size-11 sm:size-8"
            >
              <X className="sm:hidden" aria-hidden="true" />
              <Kbd className="hidden sm:inline-flex">Esc</Kbd>
            </Button>
          </div>
        </div>
        <CommandList className="min-h-0 max-h-[min(28rem,calc(100dvh-6rem))] overscroll-contain scroll-py-1 px-1.5 pb-1.5 sm:max-h-[min(24rem,calc(100dvh-12rem))]">
          <CommandEmpty className="py-2">
            <Empty className="min-h-40">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>No results found</EmptyTitle>
                <EmptyDescription>Try another page or search the project directory.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CommandEmpty>
          <CommandGroup heading="Pages" className={groupClassName}>
            {searchPages.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.label} ${page.href}`}
                onSelect={() => navigate(page.href)}
                className={resultClassName}
              >
                <span className="grid size-7 shrink-0 place-items-center text-muted-foreground" aria-hidden="true">
                  <page.icon />
                </span>
                <span className="min-w-0 truncate font-medium">{page.label}</span>
                <CommandShortcut className="hidden shrink-0 opacity-0 sm:inline-flex group-data-[selected=true]/command-item:opacity-100">
                  <Kbd className="border-transparent bg-brand-lime text-ink"><CornerDownLeft aria-hidden="true" /></Kbd>
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Projects" className={groupClassName}>
            <CommandItem
              value={`Search projects ${query}`}
              onSelect={() => {
                const params = new URLSearchParams();
                params.set('network', API_NETWORK);
                if (query.trim()) params.set('q', query.trim());
                navigate(`/projects${params.size ? `?${params}` : ''}`);
              }}
              className={resultClassName}
            >
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 truncate">{query.trim() ? `Search projects for “${query.trim()}”` : 'Browse all projects'}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="hidden shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/50 px-3.5 py-2 text-caption text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd aria-label="Up arrow"><ArrowUp aria-hidden="true" /></Kbd>
            <Kbd aria-label="Down arrow"><ArrowDown aria-hidden="true" /></Kbd>
            <span className="ml-1">Navigate</span>
          </span>
          <span className="flex items-center gap-2"><Kbd>Enter</Kbd>Open</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

