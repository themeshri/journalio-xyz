/**
 * Apply a migration.sql through the Prisma *client* connection.
 *
 * Needed because Prisma's migration engine cannot reach this Supabase instance
 * from some networks (P1001 on both 5432 and 6543), while the client's pooled
 * connection works fine. Statements are executed one at a time and the
 * migration is recorded in _prisma_migrations so `migrate status` stays honest.
 *
 * Usage:
 *   npx tsx scripts/apply-migration.ts <migration-dir-name> [--dry-run]
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const name = process.argv[2]

if (!name || name.startsWith('--')) {
  console.error('Usage: npx tsx scripts/apply-migration.ts <migration-dir-name> [--dry-run]')
  process.exit(1)
}

/**
 * Split on semicolons at end-of-line only. Sufficient for Prisma-generated
 * DDL, which never contains procedural bodies or embedded semicolons.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*$/m)
    .map((chunk) =>
      // Prisma prefixes each statement with a "-- AlterTable"-style comment.
      // Strip comment lines rather than discarding the whole chunk.
      chunk
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0)
}

async function main() {
  const dir = join(process.cwd(), 'prisma', 'migrations', name)
  const sql = readFileSync(join(dir, 'migration.sql'), 'utf8')
  const statements = splitStatements(sql)
  const checksum = createHash('sha256').update(sql).digest('hex')

  console.log(`${DRY_RUN ? '— DRY RUN —' : '— APPLYING —'} ${name}`)
  console.log(`${statements.length} statement(s)\n`)

  const applied = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count FROM "_prisma_migrations"
    WHERE migration_name = ${name} AND finished_at IS NOT NULL
  `.catch(() => [{ count: BigInt(0) }])

  if (Number(applied[0]?.count ?? 0) > 0) {
    console.log('Already applied — nothing to do.')
    return
  }

  for (const [i, stmt] of statements.entries()) {
    const preview = stmt.split('\n')[0].slice(0, 90)
    console.log(`  [${i + 1}/${statements.length}] ${preview}…`)
    if (DRY_RUN) continue
    await prisma.$executeRawUnsafe(stmt)
  }

  if (DRY_RUN) {
    console.log('\nDry run complete — nothing was written.')
    return
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations"
       (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
     VALUES ($1, $2, now(), $3, NULL, NULL, now(), $4)`,
    crypto.randomUUID(),
    checksum,
    name,
    statements.length
  )

  console.log(`\nApplied ${statements.length} statement(s) and recorded the migration.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
