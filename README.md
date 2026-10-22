# Launchpad interface

A Next.js App Router interface for Stellar reputation, token launches, and trading, built with React, strict TypeScript, Tailwind CSS 4, shadcn/Base UI, and Blux.

## Run locally

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `LUMENRISE_API_URL` to the browser-accessible API origin (an optional `/v1` suffix is accepted). Leave it empty for same-origin `/v1` requests. The API must serve `GET /v1/config` and allow the frontend origin and `X-Stellar-Network` through CORS.

The app loads and validates public configuration once per document before starting Blux, Stellar clients or route reads. Missing or invalid critical settings show an explicit error with Retry; no frontend environment defaults are used.

## Included flows

- Public Discover and project listings, launch details, auctions, reputation, missions, explorer, portfolio, and project dashboard.
- Blux authentication with account registration, profile photos, and optional identity setup.
- Bonding Curve launch creation on Stellar Testnet, with durable token setup and transaction recovery, Factory-managed token transfers, and indexed launch confirmation.
- Live Bonding trades, indexed market activity, holders, and price history where the connected services provide them.
- Campaigns, developer tools, and CLI remain coming-soon routes.

Network selection uses `?network=testnet` or `?network=public` (legacy `mainnet` is accepted), then the network chosen in this tab, then the server default. Unsupported selections fail explicitly. Changing networks reloads the document to isolate wallet state and pending signatures. Wallet operations, clients, addresses, API headers and explorer links use that same network. Creation remains Testnet-only because the existing USDC payment-asset registry has no Mainnet entry; server `launchConfigured` is also required.

## Source organization

- `src/app`: routes, layouts, route composition, and genuinely route-private components/data. Route internals are never imported by another route or shared module.
- `src/features/create-launch`: the creation wizard, form components, hooks, validation, transaction builders, and recovery logic.
- `src/features/launches`: launch details, public listings, shared project content, query hooks, Bonding operations, and trading UI. Launch and Trade share this domain without depending on route paths.
- `src/components`: cross-feature components and the application shell; `ui/` contains the existing shadcn/Base UI primitives, and `shell/` owns navigation, breadcrumbs, search, and wallet controls.
- `src/hooks`: cross-feature React hooks.
- `src/lib`: shared API clients, authentication context, helpers, and cross-feature data. `api/config.ts` decodes the public contract, `configuration.ts` exposes shared React configuration, `stellar/network.ts` installs the selected server configuration, `stellar/clients.ts` constructs RPC clients, and `stellar/amount.ts` handles exact token amounts without importing the SDK.

Features depend on shared modules, and routes compose features. Use feature entry points where available; keep internal feature imports within their owner. Architecture tests enforce route ownership, shared-module boundaries, feature isolation, and acyclic imports.

The configuration gate fetches the public Blux app ID, network settings, upload limits, profile/team/link rules, directory pagination/search/filter/sort rules, and trade/holder/chart limits. Feature flags indicate configured capabilities, while request errors and `429`/`Retry-After` remain authoritative. Reputation refresh, developer keys and policy editing are not implemented and their rules are intentionally unused. Contract launch economics, the existing Testnet payment-asset registry, transaction fees/timeouts, display range-to-candle mappings, UI debounce and polling schedules remain local because `/v1/config` does not define them. Global manual refresh intervals do not describe market polling or an individual user’s cooldown.

The Blux provider stays behind the browser-only boundary in `src/components/providers.tsx`. Pages remain Server Components where possible. The existing ink/lime theme tokens live in `src/app/globals.css`, and local Bricolage Grotesque loads through `next/font/local`.

## Checks

```bash

npm run typecheck
npm run lint
npm test
npm run build

```

Tests use Node's built-in runner and replace wallet/network boundaries; they do not sign transactions or perform live uploads. `npm test` discovers tests recursively, including feature and architecture tests. Docker installs use `npm ci` and build the standalone Next.js output.

## VPS deployment

Pushes to `master` run `.github/workflows/deploy.yml` directly on a self-hosted Linux runner on the VPS. It checks out the pushed commit, builds the local Docker image `lumenrise-interface`, and starts it using `compose.yaml`. No VPS connection secrets or image registry are needed. Deployment waits up to 120 seconds for the HTTP health check.

Configure the runner from this repository's Settings > Actions > Runners > New self-hosted runner. Use the configuration command GitHub provides, then answer the prompts:

- Runner group: press Enter to use `Default`. A group must already exist; this is not the runner name.
- Runner name: `lumenrise-interface`.
- Additional labels: `lumenrise-interface`. The workflow selects this label, not the runner name.
- Work folder: press Enter to use `_work`.

If using an organization runner, allow this repository in its runner group. Keep the runner up to date and install Docker with Compose v2 and Buildx. The runner user must be able to run `docker` without `sudo`.
