# Data Storage Architecture

## Current State

Journalio uses a split data storage model: some data lives in the browser's localStorage, while other data is persisted in a server-side database (SQLite/PostgreSQL via Prisma).

### Storage Map

| Data | Storage | Key / Table | Pages That Use It | Read Pattern | Write Pattern |
|------|---------|-------------|-------------------|--------------|---------------|
| Trade cache | DB | `Trade` table | Overview, Trade Journal, Analytics, History | API GET `/api/trades` | API GET with `refresh=true` |
| User settings | DB | `UserSettings` table | Settings | API GET/PATCH `/api/settings` | API PATCH `/api/settings` |
| Missed trades (papered plays) | DB | `PaperedPlay` table | Missed Trades | API GET `/api/papered-plays` | API POST/PATCH/DELETE `/api/papered-plays` |
| Trade edit overrides | DB | `TradeEdit` table | Trade Journal | API GET `/api/trade-edits` | API POST/DELETE `/api/trade-edits` |
| Wallets (auth-gated) | DB | `Wallet` table | — (unused currently) | API GET `/api/wallets` | API POST/DELETE `/api/wallets` |
| Saved wallets | localStorage | `journalio_saved_wallets` | Wallet Management, WalletProvider | JSON.parse on mount | JSON.stringify on change |
| Active wallets | localStorage | `journalio_active_wallets` | WalletProvider | JSON.parse on mount | JSON.stringify on toggle |
| Pre-session data | localStorage | `journalio_pre_session_{YYYY-MM-DD}` | Pre-Session, History | JSON.parse on mount | JSON.stringify on save |
| Pre-session index | localStorage | `journalio_pre_sessions` | Pre-Session, History, Sidebar | JSON.parse on mount | JSON.stringify on save |
| Journal entries | localStorage | `journalio_journal_{wallet}_{mint}_{tradeNum}` | Trade Journal, History, Analytics | JSON.parse per trade | JSON.stringify on save |
| Strategies | localStorage | `journalio_strategies` | Strategies, JournalModal, Analytics | JSON.parse on mount | JSON.stringify on save |
| Global rules | localStorage | `journalio_rules` | Strategies, Pre-Session, Sidebar | JSON.parse on mount | JSON.stringify on save |
| Trade comments | localStorage | `journalio_trade_comments` | Trade Journal, Analytics | JSON.parse on mount (seeds defaults if empty) | JSON.stringify on save |
| Journal view mode | localStorage | `journalio_journal_view_mode` | Trade Journal | Direct getItem | Direct setItem |

### What's NOT Stored

- Token metadata (logos, names): fetched live from Solana Tracker API, not cached client-side
- Wallet balances: fetched on Trade Journal mount with 60s in-memory cache, not persisted

## Rationale

### Why localStorage for journals/strategies/pre-sessions

1. **Instant writes** — No network round-trip. Pre-session data saves in <1ms.
2. **Offline-first authoring** — Users can journal and create strategies without connectivity.
3. **No auth dependency** — These features work even when NextAuth sessions expire.
4. **Rapid iteration** — During early development, schema changes don't require DB migrations.

### Why DB for trades/settings/missed trades

1. **Server-side API calls** — Trade data comes from Solana Tracker API, which requires a server-side API key. The server fetches and caches trades.
2. **Auth-gated data** — User settings are tied to authenticated sessions.
3. **Server validation** — Missed trades benefit from server-side validation before persistence.
4. **Cache management** — The 5-minute TTL trade cache with stale fallback is best managed server-side.

### Known Limitations

- **No multi-device sync** for journals, strategies, pre-sessions, or rules
- **localStorage quota** (~5-10MB) could be exceeded by heavy journaling users
- **No backup/restore** for localStorage data
- **Data loss risk** if browser storage is cleared

## Migration Plan

### Phase A: Current (Hardening)

- Document the storage split (this file)
- Add `safeLocalStorage` wrapper with quota error handling (see `lib/local-storage.ts`)
- Surface stale data indicators in the UI when trade cache serves old data
- All new localStorage writes go through `safeLocalStorage`

### Phase B: API Routes for User Content

Mirror the existing papered-plays CRUD pattern for localStorage data:

1. **Journals** — `GET/POST/PATCH /api/journals` with `{walletAddress, tokenMint, tradeNumber}` composite key
2. **Strategies** — `GET/POST/PATCH/DELETE /api/strategies` with strategy CRUD
3. **Pre-sessions** — `GET/POST /api/pre-sessions` with date-keyed entries
4. **Rules** — `GET/POST/PATCH/DELETE /api/rules`
5. **Trade comments** — `GET/POST/PATCH/DELETE /api/trade-comments`

Each route follows the pattern:
- Auth-gated via NextAuth session
- Prisma model with `userId` foreign key
- Request validation
- JSON response

### Phase C: Sync Layer

Once API routes exist, add a sync layer:

1. **localStorage remains the write-ahead log** — writes go to localStorage first for instant UX
2. **Background sync** — a `SyncProvider` context periodically pushes dirty records to the API
3. **Conflict resolution** — last-write-wins with `updatedAt` timestamps; server is source of truth
4. **Offline queue** — failed syncs are retried with exponential backoff
5. **Initial load** — on app mount, fetch from API and merge with localStorage (API wins on conflict)

## Guidelines for New Features

1. **Default to DB-backed** — New data types should have API routes and Prisma models
2. **Use localStorage only as cache** — For offline support or instant writes, mirror to localStorage but treat the API as source of truth
3. **Always use `safeLocalStorage`** — Never call `localStorage.setItem` directly; use the safe wrapper from `lib/local-storage.ts`
4. **Document new keys** — Add any new localStorage keys or DB tables to the table above
