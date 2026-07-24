/**
 * Backfill: JournalEntry.sellMistakesJson  ->  TradeTag + JournalEntryTag
 *
 * Phase A2 of the TradeZella refactor. Reads every journal entry's legacy
 * `sellMistakesJson` string array, creates one `TradeTag{kind:"mistake"}` per
 * distinct label per user, and writes the join rows.
 *
 * `sellMistakesJson` is NOT dropped here — it is dual-written through Phase C
 * and removed in Phase E, so this script is safe to re-run and safe to roll back.
 *
 * Usage:
 *   npx tsx scripts/backfill-trade-tags.ts --dry-run   # print the plan, write nothing
 *   npx tsx scripts/backfill-trade-tags.ts             # apply
 */
import { PrismaClient } from '@prisma/client'
import { DEFAULT_MISTAKE_TAGS } from '../lib/tags'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

function parseMistakes(json: string): string[] {
  try {
    const parsed = JSON.parse(json || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
  } catch {
    return []
  }
}

async function main() {
  console.log(DRY_RUN ? '— DRY RUN — no writes will be made\n' : '— APPLYING —\n')

  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  console.log(`${users.length} user(s)\n`)

  let totalTags = 0
  let totalLinks = 0

  for (const user of users) {
    const journals = await prisma.journalEntry.findMany({
      where: { userId: user.id },
      select: { id: true, sellMistakesJson: true },
    })

    // Distinct labels actually used by this user, plus the standard defaults so
    // every user starts with the full picker even if they never tagged before.
    const used = new Set<string>()
    for (const j of journals) {
      for (const m of parseMistakes(j.sellMistakesJson)) used.add(m)
    }
    const labels = new Set<string>([...DEFAULT_MISTAKE_TAGS, ...used])
    // 'Other' was a UI catch-all, not a real mistake category — do not migrate it.
    labels.delete('Other')

    console.log(`user ${user.email ?? user.id}: ${journals.length} journal(s), ` +
      `${used.size} distinct mistake label(s) in use, ${labels.size} tag(s) to ensure`)

    if (DRY_RUN) {
      const links = journals.reduce(
        (n, j) => n + parseMistakes(j.sellMistakesJson).filter((m) => m !== 'Other').length,
        0
      )
      const extra = [...used].filter((u) => !DEFAULT_MISTAKE_TAGS.includes(u) && u !== 'Other')
      if (extra.length) console.log(`  custom labels found: ${extra.join(', ')}`)
      console.log(`  would create/ensure ${labels.size} tag(s), ${links} link(s)`)
      totalTags += labels.size
      totalLinks += links
      continue
    }

    // Upsert tags — idempotent on the (userId, label, kind) unique constraint.
    const tagIdByLabel = new Map<string, string>()
    let sortOrder = 0
    for (const label of labels) {
      const tag = await prisma.tradeTag.upsert({
        where: { userId_label_kind: { userId: user.id, label, kind: 'mistake' } },
        update: {},
        create: { userId: user.id, label, kind: 'mistake', sortOrder: sortOrder++ },
      })
      tagIdByLabel.set(label, tag.id)
      totalTags++
    }

    // Link journals to tags. skipDuplicates makes re-runs a no-op.
    const links: { journalEntryId: string; tagId: string }[] = []
    for (const j of journals) {
      for (const label of parseMistakes(j.sellMistakesJson)) {
        const tagId = tagIdByLabel.get(label)
        if (!tagId) continue // 'Other', or a label we deliberately skipped
        links.push({ journalEntryId: j.id, tagId })
      }
    }
    if (links.length > 0) {
      // Batched to stay well under pgBouncer statement limits, matching the
      // 200-row convention used for trade storage.
      for (let i = 0; i < links.length; i += 200) {
        const batch = links.slice(i, i + 200)
        const res = await prisma.journalEntryTag.createMany({
          data: batch,
          skipDuplicates: true,
        })
        totalLinks += res.count
      }
    }
    console.log(`  ensured ${labels.size} tag(s), wrote ${links.length} link(s)`)
  }

  console.log(
    `\n${DRY_RUN ? 'Would create' : 'Created'}: ${totalTags} tag(s), ${totalLinks} link(s)`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
