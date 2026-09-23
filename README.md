# Launchpad interface

A Next.js (App Router) + TypeScript + Tailwind CSS interface for Stellar reputation and launch infrastructure. Visitors can browse illustrative launches without an account; participation actions open Blux authentication and send authenticated users through an optional identity setup before they continue.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Create a project in the Blux dashboard and set `NEXT_PUBLIC_BLUX_APP_ID` in `.env`. Without a valid app ID, the interface remains browsable and Blux correctly reports that authentication is unavailable.

While running `next dev`, append `?preview=1` to any URL to preview the signed-in experience without a wallet.

## Included flows

- Public Discover directory with launch filters, search, eligibility, raise progress, and gated participation actions.
- Blux wallet, email, passkey, X, GitHub, and GitLab login configuration on Stellar Testnet.
- Optional post-login X/GitHub/GitLab setup with illustrative local reputation signals.
- Signed-in portfolio panel and connection/privacy settings.
- Routed coming-soon states for reputation, missions, project pages, auctions, campaigns, explorer, developer platform, launch creation, and CLI/agent tooling.

Identity-linking buttons outside the Blux login flow are intentionally frontend-only until a backend OAuth linking service is connected. All launch, portfolio, and score values are illustrative.

## Stack notes

- App Router under `src/app`; every page that touches wallet state is a client component behind a client-only provider boundary (`src/components/providers.tsx`).
- Design tokens from `DESIGN.md` live in the Tailwind v4 `@theme` block in `src/app/globals.css`; complex ledger patterns (launch rows, account strip, settings layout) stay as semantic component classes, while one-off styling uses Tailwind utilities.
- Fonts (Newsreader + Manrope) load through `next/font/google`.

## Checks

```bash
npm run build
npm run lint
```
