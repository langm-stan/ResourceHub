import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  MathSection,
  ScenarioChip,
  Slider,
  Stat,
  StepHeader,
  type MathRow,
} from '../../design-system'
import { formatPercent, formatUSDCompact, formatUSDWhole, texUSD } from '../../lib/format'
import { usePersistentState } from '../../hooks/usePersistentState'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { scaleLinear } from 'd3-scale'
// Chart primitives, composed here into one dual-axis figure.
import {
  AxisBottom,
  AxisLeft,
  ChartFrame,
  Gridlines,
  HoverProbe,
  LineSeries,
  useChart,
  type HoverSeries,
} from '../../design-system/chart'
import {
  FINANCE_YEARS,
  HOUSEHOLDS,
  SIM_YEARS,
  financedBill,
  quoteFor,
  simulateYears,
} from './compute'
import styles from './InsurancePage.module.css'

/*
 * Why Insurance Works, kept deliberately spare: price a risk, then run the
 * same twenty years for a thousand households twice, everybody buying and
 * nobody buying. The two averages stay at premium scale where they can never
 * spike; the per-year hit strip and the adaptive distribution carry the
 * violence of the tail.
 */

const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'
const CARDINAL = 'var(--c-accent)'
const SLATE = 'var(--c-series-3)'

/*
 * Ready-made risks, in round classroom numbers: severe house damage runs
 * about 1-in-200 a year; a totaled car about 1-in-50; a burgled or burned
 * apartment's contents about 1-in-100.
 */
const SCENARIOS = [
  { key: 'house', label: 'A $500K house', chancePct: 0.5, loss: 500_000 },
  { key: 'car', label: 'A $30K car', chancePct: 2, loss: 30_000 },
  { key: 'renters', label: '$20K of belongings', chancePct: 1, loss: 20_000 },
]

const bucketLabel = (k: number) =>
  k === 0 ? 'Never hit' : k === 1 ? 'Hit once' : k === 2 ? 'Hit twice' : `Hit ${k} times`

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function InsurancePage({ intro = true }: { intro?: boolean } = {}) {
  const [lossChancePct, setLossChancePct] = usePersistentState('ifdm-insurance-chance', 2)
  const [lossSize, setLossSize] = usePersistentState('ifdm-insurance-loss', 30_000)
  const [loadPct, setLoadPct] = usePersistentState('ifdm-insurance-load', 40)

  const [reached, setReached] = useState(1)
  // Random starting seed so each classroom gets its own draw; a new run
  // advances it, and a given run re-renders identically.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff))
  /** 0 = not yet run; each run increments, keying the reveal animation. */
  const [runId, setRunId] = useState(0)
  /** Years of the current run revealed so far, 0..SIM_YEARS. */
  const [revealYear, setRevealYear] = useState(0)
  const reduced = useReducedMotion()

  const p = lossChancePct / 100
  const loadFactor = 1 + loadPct / 100
  const quote = quoteFor(p, lossSize, loadFactor)
  const fin = financedBill(lossSize)
  const run = useMemo(
    () => simulateYears(p, lossSize, seed, loadFactor),
    [p, lossSize, seed, loadFactor],
  )

  // Reveal the run one year at a time; reduced motion sees it all at once.
  useEffect(() => {
    if (runId === 0) return
    if (reduced) {
      setRevealYear(SIM_YEARS)
      return
    }
    setRevealYear(0)
    const id = window.setInterval(() => {
      setRevealYear((y) => {
        if (y + 1 >= SIM_YEARS) {
          window.clearInterval(id)
          return SIM_YEARS
        }
        return y + 1
      })
    }, 220)
    return () => window.clearInterval(id)
  }, [runId, reduced])

  function runSim() {
    setSeed((s) => s + 1)
    setRunId((id) => id + 1)
  }
  /** A new scenario invalidates the current run. */
  const changeScenario = (set: (v: number) => void) => (v: number) => {
    setRunId(0)
    setRevealYear(0)
    set(v)
  }

  const done = runId > 0 && revealYear === SIM_YEARS
  const insuredTotal = SIM_YEARS * quote.premium
  const pAtLeastOnce = 1 - (1 - p) ** SIM_YEARS

  // The chart: each year's average bill per household, both worlds. No
  // single household's spikes, so the scale never jumps.
  const annualX = Array.from({ length: revealYear }, (_, i) => i + 1)
  const annualAvg = annualX.map((y) => run.avgBare[y]! - run.avgBare[y - 1]!)

  // How many non-buyers the loss found, year by year.
  const hitsPerYear = useMemo(
    () => run.hitsByYear.map((row) => row.filter(Boolean).length),
    [run],
  )

  // The distribution, in exact buckets as far as the worst household of
  // this draw (at least through "twice"; hits cannot exceed SIM_YEARS).
  // Empty buckets past "twice" stay out of the table and the bars.
  const bucketCount = Math.max(3, run.maxHits + 1)
  const countsNow = useMemo(() => {
    const per = new Array<number>(HOUSEHOLDS).fill(0)
    for (let y = 0; y < revealYear; y++) {
      run.hitsByYear[y]!.forEach((hit, i) => {
        if (hit) per[i]!++
      })
    }
    const c = new Array<number>(bucketCount).fill(0)
    per.forEach((h) => c[h]!++)
    return c
  }, [run, revealYear, bucketCount])
  const buckets = useMemo(
    () => countsNow.map((count, k) => ({ k, count })).filter((b) => b.k <= 2 || b.count > 0),
    [countsNow],
  )
  const buyersPaidSoFar = revealYear * quote.premium
  const worseNow = Math.round(run.worseShare[revealYear]! * HOUSEHOLDS)

  const mathRows: MathRow[] = [
    {
      tex: `\\text{fair premium} = ${lossChancePct}\\% \\times ${texUSD(lossSize)} = ${texUSD(quote.fairPremium)}`,
      caption: 'The fair premium covers the pool’s claims: chance × loss.',
    },
    {
      tex: `\\text{quote} = ${loadFactor.toFixed(2)} \\times ${texUSD(quote.fairPremium)} = ${texUSD(quote.premium)}`,
      caption: `The insurer adds ${loadPct}% to run the company: the load.`,
      muted: true,
    },
    {
      tex: `\\underbrace{${SIM_YEARS} \\times ${texUSD(quote.fairPremium)} = ${texUSD(SIM_YEARS * quote.fairPremium)}}_{\\text{going without, average}} \\qquad \\underbrace{${SIM_YEARS} \\times ${texUSD(quote.premium)} = ${texUSD(insuredTotal)}}_{\\text{buying, certain}}`,
      caption: 'Going without is cheaper on average, by exactly the load.',
      muted: true,
    },
    {
      tex: `P(\\text{hit within ${SIM_YEARS} years}) = 1 - (1 - ${p})^{${SIM_YEARS}} = ${Math.round(pAtLeastOnce * 100)}\\%`,
      caption: 'But nobody lives the average: this many non-buyers draw the loss.',
    },
  ]

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Insurance</p>
          <h1 className={styles.h1}>Why Insurance Works</h1>
          <p className={styles.lead}>
            A premium costs more than the risk, on average, and can still be worth it. Price a
            risk, then run twenty years for a thousand households.
          </p>
        </header>
      )}

      {/* Step 1: the risk, and the price the insurer puts on it. */}
      <Card tone="raised" className={styles.stack}>
        <StepHeader
          step={1}
          title="The risk and the price"
          hint="One bad event: how likely this year, and how big? The insurer prices it for you."
        />
        <div className={styles.chipsRow}>
          {SCENARIOS.map((s) => (
            <ScenarioChip
              key={s.key}
              label={s.label}
              active={lossChancePct === s.chancePct && lossSize === s.loss}
              onClick={() => {
                setRunId(0)
                setRevealYear(0)
                setLossChancePct(s.chancePct)
                setLossSize(s.loss)
              }}
            />
          ))}
        </div>
        <div className={styles.controlsRow}>
          <Slider
            label="Chance of the loss this year"
            value={lossChancePct}
            onChange={changeScenario(setLossChancePct)}
            min={0.5}
            max={100}
            step={0.5}
            editable
            precision={1}
            suffix="%"
          />
          <Slider
            label="Size of the loss"
            value={lossSize}
            onChange={changeScenario(setLossSize)}
            min={1_000}
            max={500_000}
            step={1_000}
            editable
            inputMax={10_000_000}
            prefix="$"
          />
          <Slider
            label="Insurer's markup over fair"
            value={loadPct}
            onChange={changeScenario(setLoadPct)}
            min={10}
            max={100}
            step={5}
            editable
            suffix="%"
            note="40% is typical; high-risk areas run higher."
          />
        </div>
        <div className={styles.stats}>
          <Stat
            label="Fair premium"
            value={quote.fairPremium}
            format={formatUSDWhole}
            note="chance × loss"
            animate={false}
          />
          <Stat
            label="The insurer's quote"
            value={quote.premium}
            format={formatUSDWhole}
            accentColor={CARDINAL}
            note={`fair plus ${loadPct}%`}
            emphasis
            animate={false}
          />
        </div>
        {reached < 2 && (
          <div className={styles.advanceRow}>
            <Button onClick={() => setReached(2)}>See the twenty years</Button>
          </div>
        )}
      </Card>

      {/* Step 2: the four outcomes, then the years. */}
      {reached >= 2 && (
        <Card tone="raised" className={styles.stack}>
          <StepHeader
            step={2}
            title="The twenty-year simulation"
            hint={`${HOUSEHOLDS.toLocaleString()} households live the same ${SIM_YEARS} years twice, once with the policy and once without.`}
          />
          <div className={styles.whatIfWrap}>
            <table className={styles.whatIf}>
              <caption className={styles.whatIfCaption}>What a year costs</caption>
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">Buy ({formatUSDWhole(quote.premium)}/yr)</th>
                  <th scope="col">Go without</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Quiet year ({formatPercent(1 - p, 1)})</td>
                  <td className="tnum">{formatUSDWhole(quote.premium)}</td>
                  <td className="tnum">$0</td>
                </tr>
                <tr>
                  <td>Loss year ({formatPercent(p, 1)})</td>
                  <td className="tnum">{formatUSDWhole(quote.premium)}</td>
                  <td className="tnum" style={{ color: CARDINAL, fontWeight: 600 }}>
                    {formatUSDWhole(lossSize)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className={styles.whatIfNote}>
              Buying costs {formatUSDWhole(SIM_YEARS * quote.load)} more over {SIM_YEARS} years,
              on average; what it buys is deleting the red cell. Few households can pay{' '}
              {formatUSDWhole(lossSize)} in cash: financed, it runs {formatUSDWhole(fin.monthly)}{' '}
              a month for {FINANCE_YEARS} years.
            </p>
          </div>
          <div className={styles.runButtons}>
            <Button onClick={runSim} disabled={runId > 0 && !done}>
              {runId === 0 ? `Run the ${SIM_YEARS} years` : 'Run it again'}
            </Button>
            {runId > 0 && !done && (
              <span className={styles.yearCounter}>
                Year {revealYear} of {SIM_YEARS}
              </span>
            )}
          </div>

          {runId === 0 ? (
            <div className={styles.chartEmpty}>
              <p>The results draw here once you run the years.</p>
            </div>
          ) : (
            revealYear >= 1 && (
              <>
                <div className={styles.legendRow}>
                  <span style={{ color: GOLD }}>─ every buyer</span>
                  <span style={{ color: SLATE }}>─ non-buyers, average bill</span>
                  <span style={{ color: CARDINAL }}>▮ non-buyers hit that year (right axis)</span>
                </div>
                <ChartFrame
                  ratio={0.42}
                  maxHeight={420}
                  margin={{ right: 64 }}
                  figure="Figure 1."
                  caption={`Each year's average bill (left axis) over the number of non-buyers the loss found (bars, right axis). Buyers pay ${formatUSDWhole(quote.premium)}, flat. The non-buyers' average wobbles around the ${formatUSDWhole(quote.fairPremium)} fair premium because the losses in the bars land on someone every year.`}
                  ariaLabel="Average bills for buyers and non-buyers over the count of non-buyers hit each year"
                  exportStats={[
                    { label: 'Every buyer', value: `${formatUSDWhole(quote.premium)}/yr`, color: GOLD },
                    {
                      label: 'Non-buyers, average',
                      value: `${formatUSDWhole(Math.round(run.avgBare[revealYear]! / Math.max(1, revealYear)))}/yr`,
                      color: SLATE,
                    },
                    { label: 'Expected hits', value: `${Math.round(p * HOUSEHOLDS)}/yr`, color: CARDINAL },
                  ]}
                >
                  <BillsAndHits
                    revealYear={revealYear}
                    annualAvg={annualAvg}
                    premium={quote.premium}
                    hitsPerYear={hitsPerYear}
                    expected={p * HOUSEHOLDS}
                  />
                </ChartFrame>
              </>
            )
          )}

          {runId > 0 && revealYear >= 1 && (
            <div className={styles.distWrap}>
              <div>
                <p className={styles.whatIfCaption}>
                  Households by what the {done ? SIM_YEARS : revealYear}{' '}
                  {(done ? SIM_YEARS : revealYear) === 1 ? 'year' : 'years'} cost them
                </p>
                <div className={styles.legendRow}>
                  <span style={{ color: GOLD }}>■ all {HOUSEHOLDS.toLocaleString()} buyers</span>
                  <span style={{ color: SLATE }}>■ non-buyers, never hit</span>
                  <span style={{ color: CARDINAL }}>■ non-buyers, hit</span>
                </div>
                <OutcomeBars buckets={buckets} buyersPaid={buyersPaidSoFar} lossSize={lossSize} />
              </div>
              <div>
                <table className={styles.whatIf}>
                  <caption className={styles.whatIfCaption}>
                    The non-buyers{done ? '' : `, year ${revealYear}`}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" />
                      <th scope="col">Households</th>
                      <th scope="col">vs a buyer&rsquo;s {formatUSDCompact(buyersPaidSoFar)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map(({ k, count }) => {
                      const diff = buyersPaidSoFar - k * lossSize
                      return (
                        <tr key={k}>
                          <td>{bucketLabel(k)}</td>
                          <td
                            className="tnum"
                            style={count === 0 ? { color: 'var(--text-faint)' } : undefined}
                          >
                            {count}
                          </td>
                          <td
                            className="tnum"
                            style={{
                              color:
                                count === 0 ? 'var(--text-faint)' : diff >= 0 ? GREEN : CARDINAL,
                              fontWeight: k > 0 && count > 0 ? 600 : 400,
                            }}
                          >
                            {diff >= 0
                              ? `${formatUSDCompact(diff)} ahead`
                              : `${formatUSDCompact(-diff)} behind`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className={styles.whatIfNote}>
                  <strong>{worseNow}</strong> non-buyers are behind the buyers so far. That number
                  only rises: nobody un-draws a loss.
                </p>
              </div>
            </div>
          )}

          <MathSection rows={mathRows} />
        </Card>
      )}

      <p className={styles.footnote}>
        Simplified for classroom use, not financial advice. Every household faces the same odds
        each year; the default 40% markup matches what U.S. insurers keep of each premium dollar,
        and runs higher in high-risk markets; financed losses assume a 12%, five-year loan.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The merged figure's marks: two average-bill lines on the dollar axis, with
 * the count of non-buyers hit each year as bars on a secondary count axis.
 * Fixed twenty-year domain, so nothing stretches as the reveal fills in.
 */
function BillsAndHits({
  revealYear,
  annualAvg,
  premium,
  hitsPerYear,
  expected,
}: {
  revealYear: number
  annualAvg: number[]
  premium: number
  hitsPerYear: number[]
  expected: number
}) {
  const { innerWidth, innerHeight } = useChart()
  const years = Array.from({ length: revealYear }, (_, i) => i + 1)

  const dollarMax = Math.max(premium * 2.2, ...annualAvg.map((v) => v * 1.3))
  const countMax = Math.max(expected * 2, ...hitsPerYear) * 1.05

  const xs = scaleLinear().domain([0.5, SIM_YEARS + 0.5]).range([0, innerWidth])
  const yd = scaleLinear().domain([0, dollarMax]).range([innerHeight, 0])
  const yc = scaleLinear().domain([0, countMax]).range([innerHeight, 0])

  const slot = xs(2) - xs(1)
  const barW = Math.max(4, slot * 0.55)

  const hover: HoverSeries<number>[] = [
    {
      label: 'Non-buyers, average bill',
      color: SLATE,
      y: (yr) => annualAvg[yr - 1]!,
      format: formatUSDWhole,
    },
    { label: 'Every buyer', color: GOLD, y: () => premium, format: formatUSDWhole },
    {
      label: 'Non-buyers hit',
      color: CARDINAL,
      y: (yr) => hitsPerYear[yr - 1]!,
      dotY: (yr) => (hitsPerYear[yr - 1]! / countMax) * dollarMax,
      format: (v) => `${Math.round(v)} of ${HOUSEHOLDS.toLocaleString()}`,
    },
  ]

  return (
    <>
      <Gridlines y={yd} ticks={5} />
      <AxisLeft y={yd} ticks={5} format={formatUSDCompact} />
      <AxisBottom x={xs} ticks={6} format={(v) => (Number.isInteger(v) ? `yr ${v}` : '')} />
      {/* Secondary axis: how many of the 1,000 non-buyers the loss found. */}
      <g aria-hidden="true">
        {yc.ticks(4).map((v) => (
          <text
            key={v}
            x={innerWidth + 12}
            y={yc(v)}
            dy="0.32em"
            fontSize={12}
            fill="var(--text-faint)"
            className="tnum"
          >
            {v}
          </text>
        ))}
        <text x={innerWidth + 12} y={-8} fontSize={10} fill="var(--text-faint)">
          hit
        </text>
      </g>
      {years.map((yr) => {
        const hits = hitsPerYear[yr - 1]!
        if (hits === 0) return null
        return (
          <rect
            key={yr}
            x={xs(yr) - barW / 2}
            y={yc(hits)}
            width={barW}
            height={innerHeight - yc(hits)}
            rx={2}
            fill={CARDINAL}
            opacity={0.28}
          />
        )
      })}
      <line
        x1={0}
        x2={innerWidth}
        y1={yc(expected)}
        y2={yc(expected)}
        stroke={CARDINAL}
        strokeWidth={1}
        strokeDasharray="2 4"
        opacity={0.6}
      />
      <text x={4} y={yc(expected) - 5} fontSize={10} fill="var(--text-faint)">
        expected {Math.round(expected)} hit a year
      </text>
      <LineSeries
        data={years}
        x={(d) => d}
        y={(d) => annualAvg[d - 1]!}
        xScale={xs}
        yScale={yd}
        stroke={SLATE}
        width={3}
      />
      <LineSeries
        data={years}
        x={(d) => d}
        y={() => premium}
        xScale={xs}
        yScale={yd}
        stroke={GOLD}
        width={3}
      />
      <HoverProbe
        data={years}
        x={(d) => d}
        xScale={xs}
        yScale={yd}
        series={hover}
        xLabel={(v) => `Year ${Math.round(v)}`}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The distribution drawn as bars, in cost order: non-buyers by exact hit
 * count, stretching only as far as this draw's unluckiest household, with
 * all 1,000 buyers standing in one gold column at the total they knew in
 * advance.
 */
function OutcomeBars({
  buckets,
  buyersPaid,
  lossSize,
}: {
  buckets: { k: number; count: number }[]
  buyersPaid: number
  lossSize: number
}) {
  const bars = [
    { cost: buyersPaid, count: HOUSEHOLDS, color: GOLD, tag: formatUSDCompact(buyersPaid) },
    ...buckets.map(({ k, count }) => ({
      cost: k * lossSize,
      count,
      color: k === 0 ? SLATE : CARDINAL,
      tag: formatUSDCompact(k * lossSize),
    })),
  ].sort((a, b) => a.cost - b.cost)

  const W = 560
  const H = 250
  const baseline = 205
  const n = bars.length
  const gap = 7
  const barW = (W - 16 - (n - 1) * gap) / n

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.distBars}
      role="img"
      aria-label={`Households by total paid: all ${HOUSEHOLDS.toLocaleString()} buyers at ${formatUSDWhole(buyersPaid)}; non-buyers by exact number of hits`}
    >
      {bars.map((b, i) => {
        const x = 8 + i * (barW + gap)
        const h = b.count === 0 ? 0 : Math.max(3, (b.count / HOUSEHOLDS) * 165)
        return (
          <g key={i}>
            <rect
              x={x}
              y={baseline - h}
              width={barW}
              height={h}
              rx={3}
              fill={b.color}
              opacity={b.color === CARDINAL ? 0.85 : 0.9}
            />
            <text
              x={x + barW / 2}
              y={baseline - h - 6}
              textAnchor="middle"
              fontSize={11}
              fill={b.count === 0 ? 'var(--text-faint)' : 'var(--text-primary)'}
              className="tnum"
            >
              {b.count.toLocaleString('en-US')}
            </text>
            <text
              x={x + barW / 2}
              y={baseline + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-muted)"
              className="tnum"
            >
              {b.tag}
            </text>
          </g>
        )
      })}
      <line x1={4} x2={W - 4} y1={baseline} y2={baseline} stroke="var(--border-hairline)" />
    </svg>
  )
}
