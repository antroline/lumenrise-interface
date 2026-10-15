'use client';
import { Globe, Share2 } from 'lucide-react';
import { GithubIcon, XLogoIcon } from '@/components/brand-icons';
import { Button } from '@/components/ui/button';
import { TradeCopyFeedback } from './trade-copy-feedback';
import { TradeTooltip } from './trade-tooltip';

export type TradeProjectLinks = { website?: string; x?: string; github?: string };

function externalUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function TradeHeaderActions({ links, copy, copyMessage }: {
  links?: TradeProjectLinks;
  copy: (value: string, label: string) => Promise<void>;
  copyMessage?: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      <span className="relative inline-flex">
        <TradeTooltip content="Copy token page link">
          <Button variant="ghost" size="icon" aria-label="Copy token page link"
            onClick={() => void copy(window.location.href, 'Link')}>
            <Share2 />
          </Button>
        </TradeTooltip>
        <TradeCopyFeedback message={copyMessage} align="end" />
      </span>
      {[
        { label: 'Website', value: links?.website, Icon: Globe },
        { label: 'X', value: links?.x, Icon: XLogoIcon },
        { label: 'GitHub', value: links?.github, Icon: GithubIcon },
      ].map(({ label, value, Icon }) => {
        const href = externalUrl(value);
        return href ? (
          <TradeTooltip key={label} content={label}>
            <Button variant="ghost" size="icon" nativeButton={false} aria-label={`Project ${label}`}
              render={<a href={href} target="_blank" rel="noopener noreferrer" />}>
              <Icon />
            </Button>
          </TradeTooltip>
        ) : null;
      })}
    </div>
  );
}
