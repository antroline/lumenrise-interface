'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Gavel, Rocket, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { projects } from '@/features/launches/data/projects';
import { searchPages } from './navigation';

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
      className="sm:max-w-lg"
    >
      <Command
        filter={(value, search) =>
          value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
        }
      >
        <CommandInput
          autoFocus
          placeholder="Search pages and projects…"
          aria-label="Search pages and projects"
        />
        <CommandList>
          <CommandEmpty>No matching pages or projects.</CommandEmpty>
          <CommandGroup heading="Pages">
            {searchPages.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.label} ${page.href}`}
                onSelect={() => navigate(page.href)}
              >
                <page.icon className="text-muted-foreground" />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Projects">
            {projects.map((project) => {
              const Icon =
                project.category === 'Launch'
                  ? Rocket
                  : project.category === 'Auction'
                    ? Gavel
                    : ArrowLeftRight;
              return (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.ticker} ${project.category}`}
                  onSelect={() => navigate(project.href)}
                >
                  <Icon className="text-muted-foreground" />
                  <span>{project.name}</span>
                  <span className="ml-auto text-caption text-muted-foreground">
                    {project.ticker} · {project.category}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

