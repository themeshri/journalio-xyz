import { Check, X, Minus } from 'lucide-react'
import { SectionHeader } from './section-header'

type Cell = 'yes' | 'no' | 'partial'

const COLUMNS = ['Journalio', 'Spreadsheet', 'Legacy journals']

const ROWS: { feature: string; cells: Cell[] }[] = [
  { feature: 'Imports on-chain swaps automatically', cells: ['yes', 'no', 'no'] },
  { feature: 'Rebuilds positions into real P&L trades', cells: ['yes', 'no', 'partial'] },
  { feature: 'Built for Solana and EVM', cells: ['yes', 'partial', 'no'] },
  { feature: 'Ranks mistakes by dollars lost', cells: ['yes', 'no', 'no'] },
  { feature: 'Daily discipline score', cells: ['yes', 'no', 'partial'] },
  { feature: 'Works without manual logging', cells: ['yes', 'no', 'no'] },
]

function Mark({ v }: { v: Cell }) {
  if (v === 'yes') return <Check className="mx-auto h-4 w-4 text-emerald-500" />
  if (v === 'no') return <X className="mx-auto h-4 w-4 text-red-500/70" />
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
}

export function UsVsThem() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20">
      <SectionHeader
        eyebrow="Compared"
        title="Why not just use"
        accent="what you already have?"
      />

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b px-3 py-3 text-left text-sm font-medium text-muted-foreground">
                &nbsp;
              </th>
              {COLUMNS.map((c, i) => (
                <th
                  key={c}
                  className={`border-b px-3 py-3 text-center text-sm font-semibold ${
                    i === 0 ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.feature}>
                <td className="border-b px-3 py-3 text-sm">{r.feature}</td>
                {r.cells.map((v, i) => (
                  <td
                    key={i}
                    className={`border-b px-3 py-3 ${i === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <Mark v={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
