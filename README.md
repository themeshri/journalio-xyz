# Journalio — Solana Trading Journal

A full-featured trading journal for Solana (and EVM) traders. Track trades, journal entries, strategies, missed opportunities, and analyze your performance over time.

## Features

- Multi-wallet support (Solana + EVM chains)
- Automatic trade fetching and cycle detection via Solana Tracker API
- Pre-session checklists and post-session reviews
- Per-trade journaling with strategy rules, emotions, and discipline scoring
- Missed trades tracker with hypothetical P/L
- Strategy management with grouped rules
- Analytics dashboard with 15+ chart types
- GitHub-style activity calendar
- Gamified daily checklist
- Last synced time indicator in header
- Supabase Auth (Google/Twitter OAuth, email magic links)

See [FEATURES.md](./FEATURES.md) for the full feature breakdown.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Auth**: Supabase Auth
- **APIs**: Solana Tracker, Zerion (EVM)
- **Deployment**: Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase, Solana Tracker, and Zerion credentials. See `.env.example` for required variables.

For Supabase:
- `DATABASE_URL` — Use the **connection pooler** URI (port 6543, `?pgbouncer=true`) for serverless
- `DIRECT_URL` — Use the **direct** URI (port 5432) for migrations

### 3. Set up the database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Link project: `vercel link`
2. Add env vars: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SOLANA_TRACKER_API_KEY`, `ZERION_API_KEY`
3. Deploy: `vercel --prod`

The build script runs `prisma generate && next build`. Migrations must be applied separately (Vercel serverless cannot reach the DB at build time).

## Development

```bash
npm run dev           # Dev server
npm run build         # Production build
npm run lint          # Linting
npm run test          # Jest tests
npx prisma studio     # DB GUI
npx prisma migrate dev --name <name>  # New migration
```

## License

ISC
