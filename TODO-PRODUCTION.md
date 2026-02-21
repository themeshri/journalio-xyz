# Journalio — Production Readiness TODO (1000 DAU SaaS)

## Phase 1: Auth & Multi-Tenancy (2-3 days)
- [ ] Add `getServerSession()` to `/api/trades/route.ts` — replace `"default-user"` with session user ID
- [ ] Add `getServerSession()` to `/api/papered-plays/route.ts` — replace `"default-user"` with session user ID
- [ ] Add `getServerSession()` to `/api/papered-plays/[id]/route.ts` — replace `"default-user"` with session user ID
- [ ] Audit all API routes — ensure every route that reads/writes user data requires auth
- [ ] Add ownership checks on DELETE/PATCH operations (verify resource belongs to session user)

## Phase 2: PostgreSQL Migration (3-4 days)
- [ ] Update `prisma/schema.prisma` — change provider from `sqlite` to `postgresql`
- [ ] Set up PostgreSQL instance (e.g., Supabase, Neon, Railway, or self-hosted)
- [ ] Configure connection pooling (PgBouncer or Prisma Accelerate)
- [ ] Run `prisma migrate dev` to generate PostgreSQL migration
- [ ] Update `lib/prisma.ts` — disable query logging in production (`log: process.env.NODE_ENV === 'development' ? ['query'] : ['error']`)
- [ ] Test all API routes against PostgreSQL
- [ ] Set up production DATABASE_URL with SSL and pool params

## Phase 3: localStorage → Database Migration (4-5 days) ✅
- [x] Create `Journal` table in Prisma schema (userId, walletAddress, tokenMint, tradeNumber, content, timestamps)
- [x] Create `Strategy` table in Prisma schema (userId, name, entryConditions, exitConditions, stopLoss, timestamps)
- [x] Create `Rule` table in Prisma schema (userId, title, description, category, timestamps)
- [x] Create `PreSession` table in Prisma schema (userId, date, energy, mindset, marketContext, limits, rules, timestamps)
- [x] Create API endpoints for journals CRUD (`/api/journals`)
- [x] Create API endpoints for strategies CRUD (`/api/strategies`)
- [x] Create API endpoints for rules CRUD (`/api/rules`)
- [x] Create API endpoints for pre-sessions CRUD (`/api/pre-sessions`)
- [x] Update `WalletProvider` — fetch journals from DB instead of localStorage
- [x] Update Strategies page — read/write from DB instead of localStorage
- [x] Update Pre-Session page — read/write from DB instead of localStorage
- [x] Build one-time migration script: localStorage → DB (for existing users)
- [x] Remove `lib/local-storage.ts` dependency for core data (keep for non-critical caching only)

## Phase 4: Server-Side Analytics (5-7 days)
- [x] Create `GET /api/analytics/summary` — KPIs: total P/L, win rate, avg hold time, total cycles (→ `/api/analytics/overview`)
- [x] Create `GET /api/analytics/equity-curve` — cumulative P/L over time (integrated into overview)
- [x] Create `GET /api/analytics/calendar` — monthly P/L heatmap data
- [x] Create `GET /api/analytics/time` — hourly/daily/session performance
- [x] Create `GET /api/analytics/discipline` — rule adherence, efficiency metrics (POST, includes patterns)
- [x] Create `GET /api/analytics/patterns` — detected trading patterns (integrated into discipline)
- [x] Create `GET /api/analytics/strategies` — strategy performance + rule impact (POST at `/api/analytics/strategy`)
- [x] Add Redis or in-memory caching (5-min TTL) for analytics results (in-memory; Redis deferred to Phase 5)
- [x] Move `calculateTradeCycles()` to server-side (called from analytics endpoints)
- [x] Update analytics page to fetch pre-computed data instead of computing client-side
- [x] Remove heavy `useMemo` computations from `analytics/page.tsx`

## Phase 5: Rate Limiting & Pagination (2-3 days)
- [ ] Set up Redis instance (e.g., Upstash)
- [ ] Add rate limiting middleware to `/api/trades` (10 req/min per user)
- [ ] Add rate limiting middleware to `/api/solana/*` proxy routes (10 req/min per IP)
- [ ] Add rate limiting middleware to `/api/papered-plays` (30 req/min per user)
- [ ] Implement cursor-based pagination on `GET /api/trades` (default 50, max 100)
- [ ] Implement cursor-based pagination on `GET /api/papered-plays` (default 50, max 100)
- [ ] Update frontend to handle paginated responses (load more / infinite scroll)

## Phase 6: Performance & Data Integrity (2-3 days) ✅
- [x] Add composite index `Trade(walletId, timestamp)` in Prisma schema
- [x] Add composite index `PaperedPlay(userId, createdAt)` in Prisma schema
- [x] Add composite index `Wallet(userId, createdAt)` in Prisma schema
- [x] Replace trade insert loop with `prisma.trade.createMany()` in `/api/trades/route.ts`
- [ ] Migrate `Float` fields to `Decimal` for financial values (`valueUSD`, `amountIn`, `amountOut`, etc.)
- [ ] Convert `tokenInData`/`tokenOutData`/`feeData` from `String` to PostgreSQL `Json` type
- [x] Fix cache staleness metric — store explicit cache refresh timestamp, not trade timestamp
- [ ] Remove `_count: { trades: true }` from wallet list endpoint (or make separate endpoint)
- [x] Add request deduplication for Solana Tracker proxy (prevent duplicate in-flight requests)

## Phase 7: Frontend Optimization (ongoing) ✅
- [x] Dynamic import Recharts components (EquityCurve dynamically imported on overview page)
- [~] Add SSR for overview page — **skipped**: page depends on client-side `useWallet()` context; requires data flow redesign
- [x] Optimize `WalletProvider` — memoize context value with `useMemo` to prevent cascading re-renders
- [~] Replace N+1 journal localStorage lookups — **skipped**: no N+1 exists; journals batch-fetched, `journalMap` is O(1) lookup
- [x] Add error boundaries per page section (overview, analytics tabs, trade-journal)
- [x] Implement progressive loading for analytics tabs (Time/Missed tabs only fetch data when active)

---

**Total estimated effort: ~3-4 weeks**

*Last updated: 2026-02-21*
