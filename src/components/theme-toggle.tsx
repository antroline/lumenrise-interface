'use client'

import { useDarkTheme } from '@/hooks/use-dark-theme'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const dark = useDarkTheme()

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
    try {
      localStorage.setItem('lumenrise:theme', next ? 'dark' : 'light')
    } catch {
      // Storage can be unavailable (private mode); the theme then resets on the next visit.
    }
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      className={cn(
        'rounded-full text-muted-foreground hover:text-foreground',
        showLabel && 'h-12 w-full justify-start gap-4 rounded-xl bg-secondary px-4 text-base text-foreground hover:bg-muted [&>svg]:size-5',
      )}
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun /> : <Moon />}
      {showLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </Button>
  )
}
