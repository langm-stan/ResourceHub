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
  OUTCOMES_BY_BAND,
  DECADE,
  AREA_THEN_NOW,
  BIG_THREE_ALL_CORRECT,
  BANDS_BY_AGE,
  BANDS,
  SOURCE_NFCS,
  type AreaKey,
} from '../data/literacyData'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
} from 'recharts'
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
  'How well U.S. adults understand personal finance, by topic, gender, and generation.'

/** The data explorer body, shared by the Resource Hub page and the teacher training section. */

/* ------------------------------------------------------------------ *
 * What the scores are associated with, how they have moved over ten
 * years, and the Big Three behind them.
 * ------------------------------------------------------------------ */

/*
 * Where to stop the axis. Every chart ran to 100% while the values sat
 * between 30 and 60, so nine tenths of each plot was empty and the
 * differences that matter were squeezed into a sliver. Bars still start at
 * zero, because a bar chart that does not is a lie; only the top moves.
 */
function topOf(values: number[]): number {
  return Math.min(100, Math.ceil(Math.max(...values) / 10) * 10 + 10)
}

const GRID = <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" vertical={false} />

/*
 * The payoff section. Everything above it says how much people know; this
 * says what knowing it goes with. Two questions from the same survey, both
 * rising steeply with the score.
 */
function OutcomesSection() {
  const lowest = OUTCOMES_BY_BAND[0]!
  const highest = OUTCOMES_BY_BAND[OUTCOMES_BY_BAND.length - 1]!

  return (
    <>
      <StepHeader
        title="Financial literacy and financial outcomes"
        hint="The same survey asks people about their own finances. Grouped by how much of the index they answered correctly, 2026."
      />
      <div className="mb-6 flex flex-wrap gap-x-10 gap-y-5">
        <Stat
          label="Could certainly raise $2,000 · lowest scores"
          value={lowest.couldRaise2000}
          format={(v) => `${v}%`}
          accentColor="var(--accent)"
        />
        <Stat
          label="Could certainly raise $2,000 · highest scores"
          value={highest.couldRaise2000}
          format={(v) => `${v}%`}
          emphasis
          accentColor="#1E756A"
        />
        <Stat
          label="Have worked out what they need to retire · lowest"
          value={lowest.planned}
          format={(v) => `${v}%`}
          accentColor="var(--accent)"
        />
        <Stat
          label="Have worked out what they need to retire · highest"
          value={highest.planned}
          format={(v) => `${v}%`}
          emphasis
          accentColor="#1E756A"
        />
      </div>
      <Card tone="raised">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={OUTCOMES_BY_BAND} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {GRID}
              <XAxis dataKey="band" tick={{ fontSize: 15 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 15 }}
                tickLine={false}
                axisLine={false}
                domain={[
                  0,
                  topOf(OUTCOMES_BY_BAND.flatMap((b) => [b.couldRaise2000, b.planned])),
                ]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              <Legend wrapperStyle={{ fontSize: 15 }} />
              <Bar
                dataKey="couldRaise2000"
                name="Certain they could raise $2,000 in a month"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="planned"
                name="Have worked out what they need to retire"
                fill="#1E756A"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <Callout tone="plain" label="Reading this chart">
            Both are things people report about themselves, not test answers. The people who know
            the most are {(highest.couldRaise2000 / lowest.couldRaise2000).toFixed(1)} times as
            likely to say they could raise $2,000 for an emergency, and{' '}
            {(highest.planned / lowest.planned).toFixed(1)} times as likely to have worked out what
            retirement costs them. The survey shows they go together; it does not show which one
            causes the other.
          </Callout>
        </div>
      </Card>
    </>
  )
}

/* Ten years of the same questions, and the answer has not improved. */
function DecadeSection() {
  const first = DECADE[0]!
  const last = DECADE[DECADE.length - 1]!

  return (
    <>
      <StepHeader
        title="The index, 2017 to 2026"
        hint="The same 28 questions, asked every year since 2017. Each band is the share of U.S. adults answering that many correctly."
      />
      <div className="mb-6 flex flex-wrap gap-x-10 gap-y-5">
        <Stat
          label={`Scoring under 26%, ${first.year}`}
          value={first.low}
          format={(v) => `${v}%`}
          accentColor="var(--text-muted)"
        />
        <Stat
          label={`Scoring under 26%, ${last.year}`}
          value={last.low}
          format={(v) => `${v}%`}
          emphasis
          accentColor="var(--accent)"
        />
        <Stat
          label={`Scoring 76% or better, ${first.year}`}
          value={first.high}
          format={(v) => `${v}%`}
          accentColor="var(--text-muted)"
        />
        <Stat
          label={`Scoring 76% or better, ${last.year}`}
          value={last.high}
          format={(v) => `${v}%`}
          accentColor="#1E756A"
        />
      </div>
      <Card tone="raised">
        <p className="mb-3 text-[17px] font-semibold text-stone-800">Share of adults in each band</p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DECADE} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              {GRID}
              <XAxis dataKey="year" tick={{ fontSize: 15 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 15 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 40]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 15 }} />
              {BANDS.map((b) => (
                <Line
                  key={b.key}
                  type="monotone"
                  dataKey={b.key}
                  name={`${b.label} (${b.share})`}
                  stroke={b.color}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <Callout tone="plain" label="Reading this chart">
            The bottom band has grown from {first.low}% to {last.low}% and the top band has shrunk
            from {first.high}% to {last.high}%. The average share answered correctly has never
            exceeded {NATIONAL.fullIndexAvgNeverExceeded}% in the ten years of the survey, and sits
            at {last.average}% today.
          </Callout>
        </div>
      </Card>

      <div className="mt-6">
        <Card tone="raised">
          <p className="mb-3 text-[17px] font-semibold text-stone-800">
            By functional area, {first.year} against {last.year}
          </p>
          <div className="h-[26rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={AREA_THEN_NOW}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 15 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, topOf(AREA_THEN_NOW.flatMap((a) => [a.y2017, a.y2026]))]}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="area"
                  tick={{ fontSize: 15 }}
                  tickLine={false}
                  axisLine={false}
                  width={200}
                />
                <Tooltip formatter={(v) => `${Number(v)}%`} />
                <Legend wrapperStyle={{ fontSize: 15 }} />
                <Bar dataKey="y2017" name="2017" fill="var(--border-strong)" radius={[0, 5, 5, 0]} isAnimationActive={false} />
                <Bar dataKey="y2026" name="2026" fill="var(--accent)" radius={[0, 5, 5, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <Callout tone="plain" label="Reading this chart">
              Seven of the eight areas are flat or lower than they were nine years earlier. Only
              saving rose, by a point. Comprehending risk is the lowest of the eight and three
              points below where it started, which is the same thing the Big Three found twenty
              years ago.
            </Callout>
          </div>
        </Card>
      </div>
    </>
  )
}

/* The Big Three, which is the measure the tool next door is built on. */
function BigThreeSection() {
  return (
    <>
      <StepHeader
        title="The Big Three by demographic"
        hint="The fraction who answer all three of the Big Three questions correctly. National Financial Capability Study, 2024."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {BIG_THREE_ALL_CORRECT.map((d) => (
          <Card key={d.dimension} tone="raised">
            <p className="mb-3 text-[17px] font-semibold text-stone-800">{d.dimension}</p>
            <div style={{ height: d.rows.length * 62 + 44 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.rows} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 15 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, topOf(d.rows.map((r) => r.value))]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="group"
                    tick={{ fontSize: 15 }}
                    tickLine={false}
                    axisLine={false}
                    width={165}
                  />
                  <Tooltip formatter={(v) => `${Number(v)}%`} />
                  <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v) => `${Number(v)}%`}
                      style={{ fontSize: 15, fill: 'var(--text-muted)' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <Callout tone="note" label="Source">
          One adult in seven under 30 answers all three correctly, against more than four in ten of
          those over 60. One in nine with a high school education does, against nearly half of
          those with a degree. The gap between women and men is sixteen points. Source:{' '}
          {SOURCE_NFCS}.
        </Callout>
      </div>
    </>
  )
}

/*
 * How the four bands divide each age group.
 *
 * Stacked, because the four shares are one whole and that is the point. Its
 * own legend rather than the charting library's, which ordered the bands
 * 0-7, 15-21, 22-28, 8-14, and a value printed in every segment, because
 * nobody reads a stacked bar off an axis.
 */
function AgeBandsSection() {
  return (
    <>
      <StepHeader
        title="Scores by age group"
        hint="Every column is one age group, divided into the four bands of the 28-question index, 2026."
      />
      <Card tone="raised">
        <ul className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
          {BANDS.map((b) => (
            <li key={b.key} className="flex items-center gap-2 text-[15px] text-stone-600">
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-3.5"
                style={{ backgroundColor: b.color }}
              />
              {b.label} <span className="text-stone-400">({b.share})</span>
            </li>
          ))}
        </ul>
        <div className="h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={BANDS_BY_AGE} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              {GRID}
              <XAxis dataKey="group" tick={{ fontSize: 16 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 15 }}
                tickLine={false}
                axisLine={false}
                /* One group sums to 101 in the source's own rounding, so the
                   domain leaves room for it while the ticks stay round. */
                domain={[0, 101]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip formatter={(v) => `${Number(v)}%`} />
              {BANDS.map((b) => (
                <Bar
                  key={b.key}
                  dataKey={b.key}
                  name={`${b.label} (${b.share})`}
                  stackId="bands"
                  fill={b.color}
                  maxBarSize={110}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={b.key}
                    position="center"
                    formatter={(v) => `${Number(v)}%`}
                    style={{ fontSize: 15, fontWeight: 600, fill: '#ffffff' }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4">
          <Callout tone="plain" label="Reading this chart">
            More than a third of 18 to 29 year-olds answer fewer than eight of the twenty-eight
            questions correctly, and fewer than one in ten answer twenty-two or more. The bottom
            band shrinks with every older group and the top band grows. Shares are as the source
            published them, so one column sums to 101%.
          </Callout>
        </div>
      </Card>
    </>
  )
}

/* The source note and the three headline numbers, above every tab. */
function DataHeader() {
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
        <p className="mt-5 max-w-3xl border-t border-stone-200 pt-4 text-[17px] leading-relaxed text-stone-600">
          U.S. adults have averaged about half the questions right for a decade. The average has never
          exceeded {NATIONAL.fullIndexAvgNeverExceeded}% since the index began in 2017, and it
          declined again this year.
        </p>
      </Card>

    </>
  )
}

/* Tab 1: what people know, area by area. */
function AreaSection() {
  const [area, setArea] = useState<AreaKey>('earning')
  const activeArea = AREAS.find((a) => a.key === area)!
  /* One axis across both cuts, so the bars can be read against each other. */
  const drillTop = useMemo(
    () =>
      topOf(AREA_DIMENSIONS.flatMap((d) => d.data[area].map((r) => r.value))),
    [area],
  )

  return (
    <>
      <StepHeader
        title="Financial literacy by functional area"
        hint="% answering the 2026 P-Fin 8 proxy question correctly: one representative question for each of the eight areas U.S. adults routinely function in. Select an area to see the breakdown."
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
              <p className="mb-1.5 text-[15px] font-semibold leading-snug text-stone-600">{a.label}</p>
              <p className="text-2xl font-semibold tnum" style={{ color: a.color }}>
                {a.national}%
              </p>
            </button>
          )
        })}
      </div>

      {/*
        Both cuts side by side rather than a switch between them. The
        question is how the groups differ, and a reader cannot compare two
        charts they have to click between.
      */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {AREA_DIMENSIONS.map((d) => {
          const rows = d.data[area]
          return (
            <Card key={d.value} tone="raised">
              <p className="mb-1 text-[17px] font-semibold text-stone-800">
                {activeArea.label}, {d.label.replace('By ', 'by ').toLowerCase()}
              </p>
              <p className="mb-3 text-[15px] text-stone-500">
                Full 28-question index, % correct in this area
              </p>
              <div className="h-[26rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="group" tick={{ fontSize: 15 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 15 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, drillTop]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip formatter={(v) => `${Number(v)}%`} />
                    {/* Animation off so bars show fully in embeds, PNG downloads,
                        and prints that capture the first frame. */}
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {rows.map((_, i) => (
                        <Cell
                          key={i}
                          fill={activeArea.color}
                          fillOpacity={0.55 + (0.45 * i) / rows.length}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mb-8">
        <Callout tone="plain" label="Reading these charts">
          Both score all 28 index questions that touch{' '}
          {activeArea.label.toLowerCase()}. The tile above scores one representative question (the
          &ldquo;P-Fin 8&rdquo;), so the bars can sit above or below the {activeArea.national}%
          tile. Compare the bars with each other, not with the tile. Both charts share an axis, so
          the two cuts can be read against each other.
        </Callout>
      </div>

    </>
  )
}

/*
 * Tab 2: the same score cut by who is answering.
 *
 * Two to a row, and each chart as tall as its own categories need. One to a
 * row made them a metre wide and four bars deep, which is the shape that
 * hides differences rather than showing them.
 */
function DemographicSection() {
  return (
    <>
      <StepHeader
        title="Overall financial literacy by demographic"
        hint="% of the full 28-question P-Fin Index answered correctly, 2026. Each chart stops just above its own highest bar, so the differences are visible."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {OVERALL_CHARTS.map((c) => {
          const top = topOf(c.data.map((r) => r.value))
          return (
            <Card key={c.key} tone="raised">
              <p className="mb-3 text-[17px] font-semibold text-stone-800">{c.label}</p>
              {/* Height follows the number of bars, so a two-row chart does not
                  get the same slab as a five-row one. */}
              <div style={{ height: c.data.length * 62 + 44 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={c.data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 15 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, top]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="group"
                      tick={{ fontSize: 15 }}
                      tickLine={false}
                      axisLine={false}
                      width={165}
                    />
                    <Tooltip formatter={(v) => `${Number(v)}%`} />
                    <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v) => `${Number(v)}%`}
                        style={{ fontSize: 15, fill: 'var(--text-muted)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

/*
 * Four views rather than one scroll. The page had grown to seven thousand
 * pixels and twenty-five charts, which is a lot to ask of someone looking
 * for one number.
 */
type View = 'areas' | 'groups' | 'bigthree' | 'time' | 'why'

const VIEWS: TabItem<View>[] = [
  { value: 'areas', label: 'What people know' },
  { value: 'groups', label: 'Who knows it' },
  { value: 'bigthree', label: 'The Big Three' },
  { value: 'time', label: 'Over ten years' },
  { value: 'why', label: 'Why it matters' },
]

export function LiteracyDataContent() {
  const [view, setView] = useState<View>('areas')

  return (
    <>
      <DataHeader />

      <div className="mb-8">
        <Tabs items={VIEWS} value={view} onChange={setView} />
      </div>

      {view === 'areas' && <AreaSection />}
      {view === 'groups' && (
        <>
          <DemographicSection />
          <div className="mt-10">
            <AgeBandsSection />
          </div>
        </>
      )}
      {view === 'bigthree' && <BigThreeSection />}
      {view === 'time' && <DecadeSection />}
      {view === 'why' && <OutcomesSection />}
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
