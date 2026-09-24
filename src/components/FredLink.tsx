import { ExternalLink } from 'lucide-react'

/*
 * A link to the FRED series behind a rate a tool asks for, set under that
 * rate's control so the most recent published figure is one click away.
 * The tool's own default stays as it is; the link goes to the live series
 * rather than quoting a number here that would go stale.
 */
export const FRED_SERIES = {
  cardRate: { id: 'TERMCBCCINTNS', label: 'Latest average card rate on FRED' },
  mortgage30: { id: 'MORTGAGE30US', label: 'Latest 30-year mortgage rate on FRED' },
  mortgage15: { id: 'MORTGAGE15US', label: 'Latest 15-year mortgage rate on FRED' },
  newCar: { id: 'RIFLPBCIANM60NM', label: 'Latest new car loan rate on FRED' },
} as const

export function FredLink({ series }: { series: keyof typeof FRED_SERIES }) {
  const { id, label } = FRED_SERIES[series]
  return (
    <a
      href={`https://fred.stlouisfed.org/series/${id}`}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-cardinal hover:underline"
    >
      {label} <ExternalLink size={12} aria-hidden="true" className="inline align-baseline" />
    </a>
  )
}
