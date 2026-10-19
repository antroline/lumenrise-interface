# Launchpad interface

A Next.js App Router interface for Stellar reputation, token launches, and trading, built with React, strict TypeScript, Tailwind CSS 4, shadcn/Base UI, and Blux.

## Run locally

```bash
npm ci
cp .env.example .env
npm run dev
```

Create a project in the Blux dashboard and set `NEXT_PUBLIC_BLUX_APP_ID` in `.env`. Without a valid app ID, the interface remains browsable and Blux correctly reports that authentication is unavailable.

While running `next dev`, append `?preview=1` to any URL to preview the signed-in experience without a wallet.

## Included flows

- Public Discover and project listings, launch details, auctions, reputation, missions, explorer, portfolio, and project dashboard.
- Blux authentication with account registration, profile photos, and optional identity setup.
- Basic token creation and Bonding launch creation on Stellar Testnet, with durable transaction recovery and indexed launch confirmation.
- Live Bonding trades, indexed market activity, holders, and price history where the connected services provide them.
- Campaigns, developer tools, and CLI remain coming-soon routes.

Identity-linking buttons outside the Blux login flow generate local prototype signals. Illustrative launches, preview transactions, portfolio positions, and reputation figures remain labeled separately from live Bonding integrations. Public views can browse `?network=public`; wallet operations remain on Stellar Testnet.

## Source organization

- `src/app`: routes, layouts, route composition, and genuinely route-private components/data. Route internals are never imported by another route or shared module.
- `src/features/create-launch`: the creation wizard, form components, hooks, validation, transaction builders, and recovery logic.
- `src/features/launches`: launch details, public listings, shared project content, query hooks, Bonding operations, and trading UI. Launch and Trade share this domain without depending on route paths.
- `src/components`: cross-feature components and the application shell; `ui/` contains the existing shadcn/Base UI primitives, and `shell/` owns navigation, breadcrumbs, search, and wallet controls.
- `src/hooks`: cross-feature React hooks.
- `src/lib`: shared API clients, authentication context, helpers, and cross-feature data. `stellar/network.ts` contains network defaults, `stellar/clients.ts` constructs RPC clients, and `stellar/amount.ts` handles exact token amounts without importing the SDK.

Features depend on shared modules, and routes compose features. Use feature entry points where available; keep internal feature imports within their owner. Architecture tests enforce route ownership, shared-module boundaries, feature isolation, and acyclic imports.

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

Create `/var/www/lumenrise-interface/.env` on the VPS, readable only by the runner user, using `.env.example` as a starting point. Keep it outside the runner checkout so checkout cleanup cannot delete it. The workflow sources this file using Bash, so use `KEY=value` entries and quote values containing spaces or shell characters. `NEXT_PUBLIC_*` settings are baked into the image during each build. App environment values never need to be committed.

From the runner installation directory, install and start its service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

The app listens on `127.0.0.1:3001` for a reverse proxy.
