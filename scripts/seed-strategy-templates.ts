/**
 * Seed: lib/strategy-templates.ts  ->  Strategy rows with isTemplate = true
 *
 * Phase A6 of the TradeZella refactor. Template rows are owned by a dedicated
 * system user so they are never mixed into a real user's strategy list; the
 * strategies page copies them into the current user via "Add to my strategies".
 *
 * Idempotent: re-running updates the existing template rows in place.
 *
 * Usage:
 *   npx tsx scripts/seed-strategy-templates.ts --dry-run
 *   npx tsx scripts/seed-strategy-templates.ts
 */
import { PrismaClient } from '@prisma/client'
import { STRATEGY_TEMPLATES } from '../lib/strategy-templates'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

/** Stable id so templates are never orphaned across re-seeds. */
const SYSTEM_USER_ID = 'system-templates'
const SYSTEM_USER_EMAIL = 'templates@journalio.system'

/** Assign stable rule/group ids so copies are deterministic. */
function withIds(groups: (typeof STRATEGY_TEMPLATES)[number]['ruleGroups'], slug: string) {
  return groups.map((g, gi) => ({
    ...g,
    id: `${slug}-g${gi}`,
    rules: g.rules.map((r, ri) => ({ ...r, id: `${slug}-g${gi}-r${ri}` })),
  }))
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  console.log(DRY_RUN ? '— DRY RUN — no writes will be made\n' : '— APPLYING —\n')
  console.log(`${STRATEGY_TEMPLATES.length} template(s) defined\n`)

  for (const t of STRATEGY_TEMPLATES) {
    const groups = withIds(t.ruleGroups, slugify(t.name))
    const ruleCount = groups.reduce((n, g) => n + g.rules.length, 0)
    console.log(`  ${t.icon}  ${t.name} — ${groups.length} group(s), ${ruleCount} rule(s)`)
  }

  if (DRY_RUN) {
    console.log(`\nWould ensure system user "${SYSTEM_USER_EMAIL}" and upsert ` +
      `${STRATEGY_TEMPLATES.length} template row(s).`)
    return
  }

  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},
    create: { id: SYSTEM_USER_ID, email: SYSTEM_USER_EMAIL, name: 'Journalio Templates' },
  })

  let created = 0
  let updated = 0
  for (const t of STRATEGY_TEMPLATES) {
    const groups = withIds(t.ruleGroups, slugify(t.name))
    const data = {
      name: t.name,
      description: t.description,
      color: t.color,
      icon: t.icon,
      ruleGroupsJson: JSON.stringify(groups),
      isTemplate: true,
      templateAuthor: 'Journalio',
    }

    // No natural unique key on Strategy, so match on (system user, name).
    const existing = await prisma.strategy.findFirst({
      where: { userId: SYSTEM_USER_ID, name: t.name, isTemplate: true },
      select: { id: true },
    })

    if (existing) {
      await prisma.strategy.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.strategy.create({ data: { ...data, userId: SYSTEM_USER_ID } })
      created++
    }
  }

  console.log(`\nCreated ${created}, updated ${updated} template(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
