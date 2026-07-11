import { useMemo, useState } from 'react'
import { Callout, Card, FormulaBlock, SegmentedControl, Slider, Stat, StepHeader } from '../../design-system'
import { ChartFrame, useChart } from '../../design-system/chart'
import { formatUSDWhole, texUSD } from '../../lib/format'
import { BEST_BAND, INVEST_RATE, SCORE_BANDS, SCORE_FACTORS, bandForScore } from './data'
import { fvOfMonthly, loanCost } from './compute'
import styles from './CreditScorePage.module.css'

/*
 * Your FICO Score: what the score is made of (the myFICO factor weights, as an
 * interactive donut), then what the score is worth (the same car loan priced
 * at every score band, with the total cost of a lower score and the lecture's
 * invest-the-difference twist).
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

const pctRate = (apr: number) => `${(apr * 100).toFixed(2)}%`

type Market = 'new' | 'used'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function CreditScorePage({ intro = true }: { intro?: boolean } = {}) {
  const [factorKey, setFactorKey] = useState(SCORE_FACTORS[0]!.key)
  const [market, setMarket] = useState<Market>('new')
  const [amount, setAmount] = useState(40000)
  const [months, setMonths] = useState(60)
  const [score, setScore] = useState(640)

  const factor = SCORE_FACTORS.find((f) => f.key === factorKey)!
  const band = bandForScore(score)
  const aprOf = (b: typeof band) => (market === 'new' ? b.newApr : b.usedApr)

  const costs = useMemo(
    () => SCORE_BANDS.map((b) => ({ band: b, cost: loanCost(amount, aprOf(b), months) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amount, months, market]
  )
  const yours = costs.find((c) => c.band.key === band.key)!.cost
  const best = costs.find((c) => c.band.key === BEST_BAND.key)!.cost
  const extraMonthly = yours.payment - best.payment
  const extraTotal = yours.totalPaid - best.totalPaid
  const invested = fvOfMonthly(extraMonthly, INVEST_RATE, months)
  const atBest = band.key === BEST_BAND.key

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Debt and credit scores</p>
          <h1 className={styles.h1}>Your FICO Score</h1>
          <p className={styles.lead}>
            Lenders read your credit score the way colleges read a GPA: one number summarizing how you
            have handled debt. Here is what goes into that number, and what it changes on a real loan.
          </p>
        </header>
      )}

      <Card tone="raised">
        <StepHeader
          title="What goes into the score"
          hint="FICO weighs five things, published at myFICO. Click a slice or a row to see what each one measures and what improves it."
        />
        <div className={styles.factorGrid}>
          <div className={styles.donutCol}>
            <FactorDonut selected={factorKey} onSelect={setFactorKey} />
          </div>
          <div className={styles.factorCol}>
            <div className={styles.factorList} role="tablist" aria-label="Score factors">
              {SCORE_FACTORS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={f.key === factorKey}
                  className={`${styles.factorBtn} ${f.key === factorKey ? styles.factorBtnActive : ''}`}
                  onClick={() => setFactorKey(f.key)}
                >
                  <span className={styles.chip} style={{ background: f.color }} aria-hidden="true" />
                  <span className={styles.factorName}>{f.label}</span>
                  <span className={`${styles.factorWeight} tnum`}>{f.weight}%</span>
                </button>
              ))}
            </div>
            <div className={styles.factorDetail}>
              <p className={styles.factorWhat}>{factor.what}</p>
              <p className={styles.tipsLabel}>What to do</p>
              <ul className={styles.tips}>
                {factor.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <Callout tone="note" label="Checking your own score is safe">
          Looking up your own score is a soft inquiry and does not affect it. A hard inquiry, when a
          lender checks you for a loan or card, can cause a small dip. Federal law entitles you to
          free credit reports from each of the three bureaus (Experian, TransUnion, Equifax) at
          AnnualCreditReport.com.
        </Callout>
      </Card>

      <Card tone="raised">
        <StepHeader
          title="The same loan, priced by your score"
          hint="Pick a car loan and drag the score. The rate follows the score band, and the difference compounds for the whole life of the loan."
        />
        <div className={styles.loanGrid}>
          <div className={styles.controlsCol}>
            <SegmentedControl
              label="The car"
              options={[
                { value: 'new', label: 'New' },
                { value: 'used', label: 'Used' },
              ]}
              value={market}
              onChange={setMarket}
            />
            <Slider
              label="Amount borrowed"
              value={amount}
              onChange={setAmount}
              min={5000}
              max={80000}
              step={1000}
              editable
              prefix="$"
            />
            <Slider
              label="Loan term"
              value={months}
              onChange={setMonths}
              min={36}
              max={84}
              step={12}
              editable
              suffix="months"
            />
            <Slider
              label="Your credit score"
              value={score}
              onChange={setScore}
              min={300}
              max={850}
              step={10}
              editable
              note={`${band.label} (${pctRate(aprOf(band))})`}
            />
            <div className={styles.stats}>
              <Stat
                label={`Payment at ${band.min}-${band.max}`}
                value={yours.payment}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={atBest ? GREEN : RED}
                animate={false}
              />
              <Stat
                label={`Payment at ${BEST_BAND.min}-${BEST_BAND.max}`}
                value={best.payment}
                format={(v) => `${formatUSDWhole(v)}/mo`}
                accentColor={GREEN}
                animate={false}
              />
              <Stat
                label={`Extra paid over ${months} months`}
                value={extraTotal}
                format={formatUSDWhole}
                emphasis
                accentColor={atBest ? GREEN : RED}
                animate={false}
              />
            </div>
          </div>

          <div className={styles.chartCol}>
            <BandBars costs={costs} selectedKey={band.key} amount={amount} months={months} market={market} />
            {atBest ? (
              <Callout tone="note" label="The best rate on the lot">
                At {score} you are already in the top band, so the market&rsquo;s average rate is as
                good as it gets on these settings. The chart shows what every step down would cost
                on the same loan.
              </Callout>
            ) : (
              <Callout tone="mark" label="What the score difference is worth">
                On this loan a {band.min}-{band.max} score pays{' '}
                <strong>{formatUSDWhole(extraMonthly)} more every month</strong> than a{' '}
                {BEST_BAND.min}+ score, which comes to{' '}
                <strong>{formatUSDWhole(extraTotal)}</strong> over the {months} months. Invest that
                monthly difference at {Math.round(INVEST_RATE * 100)}% instead and you would end the
                loan with <strong style={{ color: GREEN }}>{formatUSDWhole(invested)}</strong>.
                Lower payments add up.
              </Callout>
            )}
            <FormulaBlock
              tex={`PMT = PV \\cdot \\frac{i}{1-(1+i)^{-n}} = \\boxed{${texUSD(yours.payment)}\\text{/mo}}`}
              caption={`The installment-loan payment at your band's rate. PV is the ${formatUSDWhole(amount)} borrowed; i is the monthly rate (${pctRate(aprOf(band))} ÷ 12 = ${(aprOf(band) / 12).toFixed(4)}); n is the ${months} monthly payments.`}
              muted
            />
          </div>
        </div>
      </Card>

      <p className={styles.footnote}>
        Simplified for classroom discussion, not financial advice. Factor weights from myFICO,
        &ldquo;What&rsquo;s in my FICO Scores.&rdquo; Average APRs by score band from Experian,
        State of the Automotive Finance Market (Q1 2026); Experian reports these by VantageScore
        band, and FICO bands are similar. Loans assume nothing down and monthly compounding. The
        investing comparison assumes a {Math.round(INVEST_RATE * 100)}% annual return compounded
        monthly.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- donut -- */

const TAU = Math.PI * 2

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

function DonutSlices({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  const { innerWidth, innerHeight } = useChart()
  const cx = innerWidth / 2
  const cy = innerHeight / 2
  const r1 = Math.min(innerWidth, innerHeight) / 2 - 26
  const r0 = r1 * 0.62
  const active = SCORE_FACTORS.find((f) => f.key === selected)!

  let angle = -TAU / 4
  return (
    <g>
      {SCORE_FACTORS.map((f) => {
        const a0 = angle
        const a1 = a0 + (f.weight / 100) * TAU
        angle = a1
        const mid = (a0 + a1) / 2
        const isSel = f.key === selected
        const dx = isSel ? 6 * Math.cos(mid) : 0
        const dy = isSel ? 6 * Math.sin(mid) : 0
        const lr = r1 + 14
        return (
          <g key={f.key} transform={`translate(${dx},${dy})`}>
            <path
              d={arcPath(cx, cy, r0, r1, a0, a1)}
              fill={f.color}
              stroke="var(--surface)"
              strokeWidth={2}
              opacity={isSel ? 1 : 0.82}
              cursor="pointer"
              onClick={() => onSelect(f.key)}
            >
              <title>{`${f.label}: ${f.weight}% of the score`}</title>
            </path>
            <text
              x={cx + lr * Math.cos(mid)}
              y={cy + lr * Math.sin(mid)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={isSel ? 700 : 500}
              fill="var(--text-primary)"
              className="tnum"
              pointerEvents="none"
            >
              {f.weight}%
            </text>
          </g>
        )
      })}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize={30}
        fontWeight={650}
        fill={active.color}
        className="tnum"
        pointerEvents="none"
      >
        {active.weight}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill="var(--text-muted)" pointerEvents="none">
        of the score
      </text>
    </g>
  )
}

function FactorDonut({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  return (
    <ChartFrame
      height={300}
      margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
      figure="Figure 1."
      caption="How a FICO score is weighed. Payment history and amounts owed together are almost two thirds of it."
      ariaLabel="What makes up a FICO score"
      expandable={false}
      exportStats={SCORE_FACTORS.map((f) => ({ label: f.label, value: `${f.weight}%`, color: f.color }))}
    >
      <DonutSlices selected={selected} onSelect={onSelect} />
    </ChartFrame>
  )
}

/* ----------------------------------------------------------- band bars -- */

interface BandCost {
  band: (typeof SCORE_BANDS)[number]
  cost: { payment: number; totalPaid: number; totalInterest: number }
}

function BandBarsMarks({ costs, selectedKey }: { costs: BandCost[]; selectedKey: string }) {
  const { innerWidth, innerHeight } = useChart()
  const rowH = innerHeight / costs.length
  const barH = Math.min(24, rowH * 0.58)
  const maxInterest = Math.max(...costs.map((c) => c.cost.totalInterest))
  return (
    <g>
      {costs.map((c, idx) => {
        const y = idx * rowH + (rowH - barH) / 2
        const w = Math.max(2, (c.cost.totalInterest / maxInterest) * (innerWidth - 78))
        const isSel = c.band.key === selectedKey
        return (
          <g key={c.band.key}>
            <text
              x={-10}
              y={y + barH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={isSel ? 700 : 400}
              fill={isSel ? 'var(--text-primary)' : 'var(--text-muted)'}
            >
              <tspan x={-10} dy={-6}>
                {c.band.label}
              </tspan>
              <tspan x={-10} dy={13} fontSize={10.5} fontWeight={400} fill="var(--text-faint)" className="tnum">
                {c.band.min}-{c.band.max}
              </tspan>
            </text>
            <rect x={0} y={y} width={w} height={barH} rx={4} fill={isSel ? RED : SLATE} opacity={isSel ? 1 : 0.55} />
            <text
              x={w + 8}
              y={y + barH / 2}
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={isSel ? 700 : 500}
              fill="var(--text-primary)"
              className="tnum"
            >
              {formatUSDWhole(c.cost.totalInterest)}
              {isSel ? ' ← you' : ''}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function BandBars({
  costs,
  selectedKey,
  amount,
  months,
  market,
}: {
  costs: BandCost[]
  selectedKey: string
  amount: number
  months: number
  market: Market
}) {
  const worst = costs[costs.length - 1]!
  const best = costs[0]!
  return (
    <ChartFrame
      height={260}
      margin={{ top: 10, right: 16, bottom: 10, left: 118 }}
      figure="Figure 2."
      caption={`Total interest on the same ${formatUSDWhole(amount)} ${market} car loan over ${months} months: ${formatUSDWhole(best.cost.totalInterest)} in the top band, ${formatUSDWhole(worst.cost.totalInterest)} in the bottom one.`}
      ariaLabel="Total interest on the same loan at each credit score band"
      exportStats={[
        { label: 'Loan', value: `${formatUSDWhole(amount)} · ${months} mo` },
        { label: `Interest at ${best.band.min}+`, value: formatUSDWhole(best.cost.totalInterest), color: GREEN },
        { label: `Interest at ${worst.band.min}-${worst.band.max}`, value: formatUSDWhole(worst.cost.totalInterest), color: RED },
      ]}
    >
      <BandBarsMarks costs={costs} selectedKey={selectedKey} />
    </ChartFrame>
  )
}
