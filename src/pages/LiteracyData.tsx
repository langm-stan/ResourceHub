import { useMemo, useState } from 'react'
import ResourceHubShell from '../components/ResourceHubShell'
import {
  NATIONAL,
  AREAS,
  GENDER_BY_AREA,
  GENERATION_BY_AREA,
  OVERALL_BY_EDUCATION,
  OVERALL_BY_INCOME,
  OVERALL_BY_RACE,
  OVERALL_BY_GENDER,
  OVERALL_BY_GENERATION,
  type AreaKey,
} from '../data/literacyData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { ExternalLink } from 'lucide-react'
import { Callout, Card, Stat, StepHeader, Tabs, type TabItem } from '../design-system'
import { fmtPct } from '../lib/format'

type Dimension = 'gender' | 'generation'

const AREA_DIMENSIONS: (TabItem<Dimension> & { data: typeof GENDER_BY_AREA })[] = [
  { value: 'gender', label: 'By Gender', data: GENDER_BY_AREA },
  { value: 'generation', label: 'By Generation', data: GENERATION_BY_AREA },
]

const OVERALL_CHARTS = [
  { key: 'education', label: 'Education', data: OVERALL_BY_EDUCATION },
  { key: 'income', label: 'Household Income', data: OVERALL_BY_INCOME },
  { key: 'race', label: 'Race & Ethnicity', data: OVERALL_BY_RACE },
  { key: 'gender', label: 'Gender', data: OVERALL_BY_GENDER },
  { key: 'generation', label: 'Generation', data: OVERALL_BY_GENERATION },
] as const

const pct = (v: number) => fmtPct(v, 0)

export const LITERACY_DATA_INTRO =
  'Explore how well U.S. adults understand personal finance across eight functional areas, then drill down by gender or generation.'

/** The data explorer body, shared by the Resource Hub page and the teacher training section. */
export function LiteracyDataContent() {
  const [area, setArea] = useState<AreaKey>('earning')
  const [dimension, setDimension] = useState<Dimension>('gender')

  const activeArea = AREAS.find((a) => a.key === area)!
  const dim = AREA_DIMENSIONS.find((d) => d.value === dimension)!
  const drillData = useMemo(() => dim.data[area], [dim, area])

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <Callout tone="plain" label="Source">
          <strong>TIAA Institute–GFLEC Personal Finance Index (P-Fin Index), 2026</strong>: "A Decade of
          Tracking Financial Literacy in America." Survey of 3,602 U.S. adults, fielded Jan 2026.{' '}
          <a
            href="https://gflec.org/wp-content/uploads/2026/06/TIAA_GFLEC_Report_AnnualPFin_June2026_fin2.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-cardinal hover:underline"
          >
            Read the report <ExternalLink size={12} />
          </a>
        </Callout>
      </div>

      <Card tone="raised" className="mb-8">
        <div className="flex flex-wrap gap-x-12 gap-y-4 items-end">
          <Stat
            label="National average, 2026"
            value={NATIONAL.fullIndexAvg2026}
            format={pct}
            emphasis
            accentColor="var(--accent)"
            note="of the 28 P-Fin Index questions answered correctly"
          />
          <Stat
            label="Struggling (≤7 of 28 correct)"
            value={NATIONAL.lowLiteracyShare2026}
            format={pct}
            note={`up from ${NATIONAL.lowLiteracyShare2017}% in 2017`}
          />
          <Stat
            label="Very strong (22+ correct)"
            value={NATIONAL.highLiteracyShare2026}
            format={pct}
            note="of U.S. adults"
          />
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mt-5 max-w-3xl border-t border-stone-200 pt-4">
          U.S. adults have averaged about half the questions right for a decade. The average has never
          exceeded {NATIONAL.fullIndexAvgNeverExceeded}% since the index began in 2017, and it
          declined again this year.
        </p>
      </Card>

      <StepHeader
        title="Financial literacy by functional area"
        hint="% answering the 2026 P-Fin 8 proxy question correctly: one representative question for each of the eight areas U.S. adults routinely function in. Select an area to drill down."
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {AREAS.map((a) => {
          const active = area === a.key
          return (
            <button
              key={a.key}
              onClick={() => setArea(a.key)}
              aria-pressed={active}
              className={`text-left rounded-xl border bg-white p-4 transition-all ${
                active ? 'shadow-card-hover' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={active ? { borderColor: a.color, boxShadow: `0 0 0 1px ${a.color}` } : undefined}
            >
              <p className="text-xs font-semibold text-stone-600 mb-1.5 leading-snug">{a.label}</p>
              <p className="text-2xl font-semibold tnum" style={{ color: a.color }}>
                {a.national}%
              </p>
            </button>
          )
        })}
      </div>

      <Card tone="raised" className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{activeArea.label}: drill down</h3>
            <p className="text-xs text-stone-500">
              Full 28-question index, % correct in this area, {dim.label.toLowerCase()}
            </p>
          </div>
          <Tabs items={AREA_DIMENSIONS} value={dimension} onChange={setDimension} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drillData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {drillData.map((_, i) => (
                  <Cell key={i} fill={activeArea.color} fillOpacity={0.55 + (0.45 * i) / drillData.length} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <Callout tone="plain" label="Reading this chart">
            These bars can sit above or below the {activeArea.national}% tile. That is not an error. The
            tile scores one representative question (the "P-Fin 8"); this chart scores all 28 index
            questions that touch {activeArea.label.toLowerCase()}. Compare the bars with each other, not
            with the tile.
          </Callout>
        </div>
      </Card>

      <StepHeader
        title="Overall financial literacy by demographic"
        hint="% of the full 28-question P-Fin Index answered correctly, 2026."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {OVERALL_CHARTS.map((c) => (
          <Card key={c.key} tone="raised">
            <p className="text-sm font-semibold text-stone-800 mb-3">{c.label}</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={c.data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis type="category" dataKey="group" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip formatter={(v) => `${Number(v)}%`} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function LiteracyData() {
  return (
    <ResourceHubShell title="Financial Literacy Data" intro={LITERACY_DATA_INTRO}>
      <LiteracyDataContent />
    </ResourceHubShell>
  )
}
