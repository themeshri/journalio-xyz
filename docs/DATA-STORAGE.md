# Data Storage Architecture

## Current State

Journalio stores all user data in a server-side database (SQLite in dev, PostgreSQL in prod) via Prisma ORM. Only wallet management and view preferences remain in localStorage.

### Storage Map

| Data | Storage | Key / Table | Pages That Use It | Read Pattern | Write Pattern |
|------|---------|-------------|-------------------|--------------|---------------|
| Trade cache | DB | `Trade` table | Overview, Trade Journal, Analytics, History | API GET `/api/trades` | API GET with `refresh=true` |
| User settings | DB | `UserSettings` table | Settings | API GET/PATCH `/api/settings` | API PATCH `/api/settings` |
| Missed trades (papered plays) | DB | `PaperedPlay` table | Missed Trades | API GET `/api/papered-plays` | API POST/PATCH/DELETE `/api/papered-plays` |
| Trade edit overrides | DB | `TradeEdit` table | Trade Journal | API GET `/api/trade-edits` | API POST/DELETE `/api/trade-edits` |
| Strategies | DB | `Strategy` table | Strategies, JournalModal, Analytics | API GET `/api/strategies` | API POST/PATCH/DELETE `/api/strategies` |
| Global rules | DB | `GlobalRule` table | Strategies, Pre-Session, Sidebar | API GET `/api/rules` | API POST/PATCH/DELETE `/api/rules` |
| Pre-session data | DB | `PreSession` table | Pre-Session, History, Sidebar | API GET `/api/pre-sessions` | API POST `/api/pre-sessions` (upsert) |
| Journal entries | DB | `JournalEntry` table | Trade Journal, History, Overview | API GET `/api/journals` | API POST `/api/journals` (upsert) |
| Trade comments | DB | `TradeComment` table | Settings, JournalModal, Sidebar | API GET `/api/trade-comments` | API POST/PATCH/DELETE `/api/trade-comments` |
| Wallets (auth-gated) | DB | `Wallet` table | — (unused currently) | API GET `/api/wallets` | API POST/DELETE `/api/wallets` |
| Saved wallets | localStorage | `journalio_saved_wallets` | Wallet Management, WalletProvider | JSON.parse on mount | JSON.stringify on change |
| Active wallets | localStorage | `journalio_active_wallets` | WalletProvider | JSON.parse on mount | JSON.stringify on toggle |
| Journal view mode | localStorage | `journalio_journal_view_mode` | Trade Journal, Settings | Direct getItem | Direct setItem |

### What's NOT Stored

- Token metadata (logos, names): fetched live from Solana Tracker API, not cached client-side
- Wallet balances: fetched on Trade Journal mount with 60s in-memory cache, not persisted

## Migration History

### Phase 3 Migration (localStorage → DB)

Completed: Strategies, global rules, pre-sessions, journal entries, and trade comments were migrated from localStorage to the database.

- **One-time migration**: `LocalStorageMigration` component runs on first dashboard load. Checks `journalio_migration_v1_complete` localStorage flag, reads legacy keys, POSTs data to API routes, sets flag on completion.
- **Approach**: Hard-switch (no dual-read). All reads/writes go directly to API. No sync layer needed.
- **Legacy keys**: Still read by migration component but no longer written to by the app.

### DB Models Added in Phase 3

| Model | Unique Constraint | Notes |
|-------|-------------------|-------|
| `Strategy` | `@@index([userId])` | `ruleGroupsJson` stores nested rule groups as JSON string |
| `GlobalRule` | `@@index([userId, sortOrder])` | Simple text + sort order |
| `PreSession` | `@@unique([userId, date])` | One per user per day, upsert pattern |
| `JournalEntry` | `@@unique([userId, walletAddress, tokenMint, tradeNumber])` | Composite key matches trade cycle identity |
| `TradeComment` | `@@index([userId, category])` | 18 defaults auto-seeded on first empty GET |

## Guidelines for New Features

1. **Default to DB-backed** — New data types should have API routes and Prisma models
2. **Use localStorage only for UI preferences** — View modes, collapsed states, etc.
3. **Always use `safeLocalStorage`** — Never call `localStorage.setItem` directly; use the safe wrapper from `lib/local-storage.ts`
4. **Document new keys** — Add any new localStorage keys or DB tables to the table above
