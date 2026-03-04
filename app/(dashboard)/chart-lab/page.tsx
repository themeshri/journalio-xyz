import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Chart Lab | Journalio',
}

export default function ChartLabRedirect() {
  redirect('/chart-lab/calendar')
}
