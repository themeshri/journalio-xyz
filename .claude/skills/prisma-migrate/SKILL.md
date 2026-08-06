---
name: prisma-migrate
description: Apply a Prisma migration to Supabase when the migration engine can't connect (P1001 on both 5432 and 6543) even though the Prisma client works fine.
---

# Prisma migration fallback (P1001)

## When this applies

`npx prisma migrate dev` / `migrate deploy` fails with `P1001: Can't reach database
server` on both the direct connection (5432) and the pooled one (6543) — but the
Prisma *client* connects fine at runtime. This is a network-level block on the
migration engine, not a bad `DATABASE_URL`.

**Prefer `prisma migrate deploy` whenever it works.** Only fall back when it doesn't.

## The workaround

```
npx tsx scripts/apply-migration.ts <migration-dir>
```

It reads the `migration.sql` in that directory, applies it statement-by-statement
through the ordinary Prisma client connection, and records the migration in
`_prisma_migrations` so Prisma's state stays consistent.

`<migration-dir>` is a directory under `prisma/migrations/`, e.g.
`prisma/migrations/20260309120000_add_rule_adherence`.

## After running

Confirm Prisma agrees the migration landed:

```
npx prisma migrate status
```

If it still reports the migration as pending, the `_prisma_migrations` insert
didn't happen — do not re-run the script blindly, since the DDL may already be
applied. Inspect the table first.

## Related

Connection string split: `DATABASE_URL` is pooled (port 6543, `?pgbouncer=true`)
for runtime; `DIRECT_URL` is direct (port 5432) and used only for migrations.
