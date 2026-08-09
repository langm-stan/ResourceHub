import { useMemo, useState } from 'react'
import {
  Button,
  Callout,
  Card,
  FormulaBlock,
  ScenarioChip,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../../design-system'
import { formatPercent, formatUSDWhole, texUSD } from '../../lib/format'
import { usePersistentState } from '../../hooks/usePersistentState'
import { SCENARIOS, judgeScenario, simulatePool } from './compute'
import styles from './InsurancePage.module.css'

type Surface = 'pool' | 'math' | 'decide'

const TABS: TabItem<Surface>[] = [
  { value: 'pool', label: 'A thousand households' },
  { value: 'math', label: 'The math' },
  { value: 'decide', label: 'Should you insure it?' },
]

const HOUSEHOLDS = 1_000
const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const CARDINAL = 'var(--c-accent)'

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function InsurancePage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('pool')
  const [lossChancePct, setLossChancePct] = usePersistentState('ifdm-insurance-chance', 1)
  const [lossSize, setLossSize] = usePersistentState('ifdm-insurance-loss', 40_000)
  const [premium, setPremium] = usePersistentState('ifdm-insurance-premium', 500)
  const [savings, setSavings] = usePersistentState('ifdm-insurance-savings', 25_000)
  const [seed, setSeed] = useState(12)

  const result = useMemo(
    () =>
      simulatePool(
        {
          households: HOUSEHOLDS,
          lossChance: lossChancePct / 100,
          lossSize,
          premium,
          savings,
        },
        seed,
      ),
    [lossChancePct, lossSize, premium, savings, seed],
  )

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Why insurance works</p>
          <h1 className={styles.h1}>A bet you should sometimes take</h1>
          <p className={styles.lead}>
            An insurance premium is a negative-expected-value bet, just like the games in the
            gambling lesson, and people are right to buy it anyway. This lesson runs a thousand
            households through one risky year to show what the premium actually purchases: not
            dollars, but a floor.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.stack}>
        <StepHeader
          title="One risky year"
          hint="Each of 1,000 households faces the same small chance of the same large loss. Set the risk, what the insurer charges, and what a household has saved."
        />
        <div className={styles.controlsRow}>
          <Slider
            label="Chance of the loss this year"
            value={lossChancePct}
            onChange={setLossChancePct}
            min={0.1}
            max={10}
            step={0.1}
            editable
            precision={1}
            suffix="%"
          />
          <Slider
            label="Size of the loss"
            value={lossSize}
            onChange={setLossSize}
            min={1_000}
            max={200_000}
            step={1_000}
            editable
            inputMax={10_000_000}
            prefix="$"
          />
          <Slider
            label="Yearly premium"
            value={premium}
            onChange={setPremium}
            min={0}
            max={5_000}
            step={10}
            editable
            inputMax={1_000_000}
            prefix="$"
          />
          <Slider
            label="Household savings"
            value={savings}
            onChange={setSavings}
            min={0}
            max={100_000}
            step={1_000}
            editable
            inputMax={10_000_000}
            prefix="$"
          />
        </div>
        <p className={styles.premiumNote}>
          The actuarially fair premium for this risk is{' '}
          <strong>{formatUSDWhole(result.fairPremium)}</strong> (chance × loss). Anything above
          that is the load: here{' '}
          {result.load >= 0
            ? `${formatUSDWhole(result.load)}, or ${formatPercent(result.loadShare, 0)} over fair`
            : `${formatUSDWhole(-result.load)} below fair, which no insurer sustains for long`}
          .
        </p>
      </Card>

      <Card tone="raised" className={styles.stack}>
        <div className={styles.stats}>
          <Stat
            label="Fair premium"
            value={result.fairPremium}
            format={formatUSDWhole}
            note="chance × loss"
          />
          <Stat
            label="Quoted premium"
            value={premium}
            format={formatUSDWhole}
            accentColor={CARDINAL}
            note={
              result.load >= 0
                ? `${formatPercent(result.loadShare, 0)} load over fair`
                : 'below the fair premium'
            }
          />
          <Stat
            label="Households expected to be hit"
            value={result.expectedHits}
            format={(v) => v.toFixed(0)}
            note={`of ${HOUSEHOLDS.toLocaleString()} in the pool`}
          />
          <Stat
            label="Loss vs. savings"
            value={lossSize / Math.max(1, savings)}
            format={(v) => `${v.toFixed(1)}×`}
            animate={false}
            note={
              lossSize > savings
                ? 'the loss is more than a household has'
                : 'a household could absorb this loss'
            }
          />
        </div>
      </Card>

      <div className={styles.tabBar}>
        <Tabs items={TABS} value={surface} onChange={setSurface} />
      </div>
      <Card tone="raised" className={styles.panel}>
        {surface === 'pool' && (
          <PoolView
            result={result}
            premium={premium}
            savings={savings}
            lossSize={lossSize}
            onRunAgain={() => setSeed((s) => s + 1)}
          />
        )}
        {surface === 'math' && (
          <MathView
            result={result}
            premium={premium}
            savings={savings}
            lossSize={lossSize}
            lossChancePct={lossChancePct}
          />
        )}
        {surface === 'decide' && <DecideView />}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PoolGrid({
  hits,
  insured,
  ruined,
}: {
  hits: boolean[]
  insured: boolean
  ruined: boolean
}) {
  // 50 x 20 dots in one SVG: cheap to render, easy to read from the back row.
  const cols = 50
  const size = 10
  const gap = 3
  const rows = Math.ceil(hits.length / cols)
  const w = cols * (size + gap) - gap
  const h = rows * (size + gap) - gap
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={styles.poolGrid}
      role="img"
      aria-label={
        insured
          ? 'Every insured household ends the year in the same place'
          : `${hits.filter(Boolean).length} uninsured households are hit`
      }
    >
      {hits.map((hit, i) => {
        const x = (i % cols) * (size + gap)
        const y = Math.floor(i / cols) * (size + gap)
        const fill = insured
          ? 'var(--c-series-2)'
          : hit
            ? ruined
              ? 'var(--c-accent)'
              : 'var(--c-series-2)'
            : 'var(--c-series-1)'
        const opacity = insured ? 0.85 : hit ? 1 : 0.55
        return <rect key={i} x={x} y={y} width={size} height={size} rx={2.5} fill={fill} opacity={opacity} />
      })}
    </svg>
  )
}

function PoolView({
  result,
  premium,
  savings,
  lossSize,
  onRunAgain,
}: {
  result: ReturnType<typeof simulatePool>
  premium: number
  savings: number
  lossSize: number
  onRunAgain: () => void
}) {
  const ruined = lossSize > savings
  const uninsuredFloor = savings - lossSize
  return (
    <>
      <StepHeader
        title="The same year, lived twice"
        hint="Left: nobody bought the policy. Right: everybody did. The dice land the same way in both worlds; only who carries the loss changes."
      />
      <div className={styles.pools}>
        <div>
          <p className={styles.poolTitle}>Uninsured</p>
          <PoolGrid hits={result.hits} insured={false} ruined={ruined} />
          <div className={styles.poolStats}>
            <span>
              Hit this year: <strong>{result.hitCount}</strong> households, each losing{' '}
              <strong>{formatUSDWhole(lossSize)}</strong>
            </span>
            <span>
              Average end-of-year savings: <strong>{formatUSDWhole(result.avgUninsured)}</strong>
            </span>
            <span>
              Worst outcome: <strong>{formatUSDWhole(uninsuredFloor)}</strong>
              {ruined ? ' — wiped out' : ''}
            </span>
          </div>
        </div>
        <div>
          <p className={styles.poolTitle}>Insured</p>
          <PoolGrid hits={result.hits} insured={true} ruined={false} />
          <div className={styles.poolStats}>
            <span>
              Every household pays the <strong>{formatUSDWhole(premium)}</strong> premium; the
              pool covers the {result.hitCount} losses
            </span>
            <span>
              Average end-of-year savings: <strong>{formatUSDWhole(result.endInsured)}</strong>
            </span>
            <span>
              Worst outcome: <strong>{formatUSDWhole(result.endInsured)}</strong> — the same as
              the best
            </span>
          </div>
        </div>
      </div>
      <div className={styles.legendRow}>
        <span style={{ color: GREEN }}>■ untouched</span>
        <span style={{ color: AMBER }}>■ paid {ruined ? 'the premium or a survivable loss' : 'the premium or the loss'}</span>
        {ruined && <span style={{ color: CARDINAL }}>■ wiped out</span>}
      </div>
      <div className={styles.runAgain}>
        <Button onClick={onRunAgain}>Run the year again</Button>
      </div>
      <Callout tone="note" label="What the premium buys">
        The insured pool ends the year{' '}
        <strong>{formatUSDWhole(Math.max(0, result.load))}</strong> per household poorer on
        average than going without: that is the load, and it is the price of the policy&rsquo;s
        real product. Without insurance the worst outcome is{' '}
        <strong>{formatUSDWhole(uninsuredFloor)}</strong>; with it, no household ends below{' '}
        <strong>{formatUSDWhole(result.endInsured)}</strong>. The premium does not raise the
        average. It raises the floor.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function MathView({
  result,
  premium,
  savings,
  lossSize,
  lossChancePct,
}: {
  result: ReturnType<typeof simulatePool>
  premium: number
  savings: number
  lossSize: number
  lossChancePct: number
}) {
  const p = lossChancePct / 100
  return (
    <>
      <StepHeader
        title="See the math"
        hint="The same expected-value arithmetic as the gambling lesson, with your inputs substituted in."
      />
      <FormulaBlock
        tex={`\\text{fair premium} = ${p} \\times ${texUSD(lossSize)} = ${texUSD(result.fairPremium)}`}
        caption="Step 1. The actuarially fair premium is the chance of the loss times its size: what the pool needs per household just to cover the year's claims."
      />
      <FormulaBlock
        tex={`\\text{load} = ${texUSD(premium)} - ${texUSD(result.fairPremium)} = ${texUSD(result.load)}`}
        caption={`Step 2. The insurer charges ${formatPercent(Math.max(0, result.loadShare), 0)} above fair to pay its staff, its capital, and its shareholders. The load is the house edge, out in the open.`}
        muted
      />
      <FormulaBlock
        tex={`\\underbrace{${texUSD(savings)} - ${p} \\times ${texUSD(lossSize)} = ${texUSD(savings - p * lossSize)}}_{\\text{expected, uninsured}} \\qquad \\underbrace{${texUSD(savings)} - ${texUSD(premium)} = ${texUSD(result.endInsured)}}_{\\text{certain, insured}}`}
        caption="Step 3. On expected value alone, going without insurance wins by exactly the load. Every extended warranty pitch and every casino relies on people reading only this line."
        muted
      />
      <FormulaBlock
        tex={`\\text{worst case, uninsured} = ${texUSD(savings)} - ${texUSD(lossSize)} = ${texUSD(savings - lossSize)} \\qquad \\text{worst case, insured} = ${texUSD(result.endInsured)}`}
        caption="Step 4. But no household lives the average; each one lives a single draw. The uninsured worst case falls with the size of the loss without limit. The insured worst case never moves."
      />
      <Callout tone="note" label="Gambling in reverse">
        A lottery ticket pays the load for a small chance of a jackpot that changes nothing you
        need. An insurance premium pays the load to remove a small chance of a loss that changes
        everything. Same arithmetic, opposite purpose: one buys variance, the other sells it.
      </Callout>
    </>
  )
}

/* ------------------------------------------------------------------ */

function DecideView() {
  const [cushion, setCushion] = usePersistentState('ifdm-insurance-cushion', 2_000)
  const [active, setActive] = useState('phone')
  const scenario = SCENARIOS.find((s) => s.key === active) ?? SCENARIOS[0]!
  const verdict = judgeScenario(scenario, cushion)

  return (
    <>
      <StepHeader
        title="The rule, applied"
        hint="Insure losses you could not absorb, even at a load. Skip cover for losses you could, and pocket the load yourself. Set your own cushion, then judge each offer."
      />
      <div className={styles.controlsRow}>
        <Slider
          label="What you could absorb without hardship"
          value={cushion}
          onChange={setCushion}
          min={0}
          max={25_000}
          step={500}
          editable
          inputMax={1_000_000}
          prefix="$"
        />
      </div>
      <div className={styles.chipsRow}>
        {SCENARIOS.map((s) => (
          <ScenarioChip key={s.key} label={s.label} active={s.key === active} onClick={() => setActive(s.key)} />
        ))}
      </div>
      <p className={styles.scenarioNote}>{scenario.note}</p>
      <div className={styles.tableWrap}>
        <table className={styles.decisionTable}>
          <thead>
            <tr>
              <th>Offer</th>
              <th>Chance</th>
              <th>Loss</th>
              <th>Fair premium</th>
              <th>Quoted</th>
              <th>Load</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((s) => {
              const v = judgeScenario(s, cushion)
              return (
                <tr key={s.key} className={s.key === active ? styles.rowActive : undefined}>
                  <td>{s.label}</td>
                  <td className="tnum">
                    {formatPercent(s.lossChance, s.lossChance < 0.001 ? 2 : (s.lossChance * 100) % 1 !== 0 ? 1 : 0)}
                  </td>
                  <td className="tnum">{formatUSDWhole(s.lossSize)}</td>
                  <td className="tnum">{formatUSDWhole(v.fairPremium)}</td>
                  <td className="tnum">
                    {formatUSDWhole(s.premium)} <span style={{ color: 'var(--text-muted)' }}>({s.quotedAs})</span>
                  </td>
                  <td className="tnum">{formatPercent(v.loadShare, 0)}</td>
                  <td>
                    <span className={`${styles.verdict} ${v.ruinous ? styles.verdictBuy : styles.verdictSkip}`}>
                      {v.ruinous ? 'Worth insuring' : 'Absorb it yourself'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Callout tone="note" label="Why the verdict ignores the load">
        {verdict.ruinous ? (
          <>
            The {scenario.label.toLowerCase()} covers a loss bigger than your{' '}
            {formatUSDWhole(cushion)} cushion, so the {formatPercent(Math.max(0, verdict.loadShare), 0)}{' '}
            load is the price of a floor you cannot build yourself. Shop the load across insurers,
            but buy the floor.
          </>
        ) : (
          <>
            The {scenario.label.toLowerCase()} covers a loss your {formatUSDWhole(cushion)} cushion
            could absorb, so the load is a fee for protection you do not need. Decline it every
            time, and the saved premiums become the repair fund. Self-insuring the small stuff is
            how households keep the load for themselves.
          </>
        )}
      </Callout>
      <Callout tone="plain" label="Classroom assumptions, not quotes">
        The chances and prices above are stated round-number assumptions, chosen so the structure
        of each decision is easy to see; real quotes vary by person, place, and policy. The rule
        is what transfers: insure the ruinous, self-insure the rest, and always compare the quoted
        premium to chance × loss before signing.
      </Callout>
    </>
  )
}
