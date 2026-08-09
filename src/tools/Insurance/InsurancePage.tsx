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
import {
  ALWAYS_FINAL,
  SCENARIOS,
  SOLO,
  SOLO_FAIR,
  SOLO_LOAD,
  choicesPath,
  drawHits,
  judgeScenario,
  runStrategyMany,
  type ManyRuns,
} from './compute'
import styles from './InsurancePage.module.css'

type Surface = 'play' | 'math' | 'decide'

const TABS: TabItem<Surface>[] = [
  { value: 'play', label: 'Play the fifteen years' },
  { value: 'math', label: 'The math' },
  { value: 'decide', label: 'Should you insure it?' },
]

const GREEN = 'var(--c-series-1)'
const AMBER = 'var(--c-series-2)'
const SLATE = 'var(--c-series-3)'
const CARDINAL = 'var(--c-accent)'
const RUNS = 1_000

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function InsurancePage({ intro = true }: { intro?: boolean } = {}) {
  const [surface, setSurface] = useState<Surface>('play')

  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Insurance</p>
          <h1 className={styles.h1}>Why insurance works</h1>
          <p className={styles.lead}>
            An insurance premium is a bet with a negative expected value, like the games in the
            gambling lesson, and it is often rational to buy anyway. Play fifteen risky years
            with the road not taken always on screen, then run your choices a thousand times to
            see the draw you happened to get for what it is.
          </p>
        </header>
      )}

      <div className={styles.tabBar}>
        <Tabs items={TABS} value={surface} onChange={setSurface} />
      </div>
      <Card tone="raised" className={styles.panel}>
        {surface === 'play' && <PlayView />}
        {surface === 'math' && <MathView />}
        {surface === 'decide' && <DecideView />}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * The game: one household, fifteen years, one decision a year made before
 * that year's dice resolve. The mirror household makes the opposite choice
 * every year against the same dice, so what would have happened is on
 * screen the whole time; the thousand-run grid then shows the player's own
 * strategy against fresh dice.
 */
function PlayView() {
  const [gameId, setGameId] = useState(1)
  const [choices, setChoices] = useState<boolean[]>([])
  const [many, setMany] = useState<ManyRuns | null>(null)

  const hits = useMemo(() => drawHits(gameId * 7919 + 3, SOLO.years, SOLO.lossChance), [gameId])
  const yourPath = useMemo(() => choicesPath(hits, choices), [hits, choices])
  const mirrorPath = useMemo(() => choicesPath(hits, choices.map((c) => !c)), [hits, choices])

  const yearsPlayed = choices.length
  const balance = yourPath[yourPath.length - 1]!
  const wipedOut = balance < 0
  const over = wipedOut || yearsPlayed >= SOLO.years
  const mirrorAlive = mirrorPath.length === choices.length + 1
  const mirrorBalance = mirrorPath[mirrorPath.length - 1]!
  const gap = mirrorAlive ? balance - mirrorBalance : null

  const yourPremiums = choices.filter(Boolean).length * SOLO.premium
  const yourLosses = choices.filter((c, i) => !c && hits[i]).length * SOLO.lossSize
  const mirrorPremiums = choices.filter((c) => !c).length * SOLO.premium
  const mirrorLosses = choices.filter((c, i) => c && hits[i] && i < mirrorPath.length - 1).length * SOLO.lossSize

  const choose = (insured: boolean) => {
    if (!over) setChoices((c) => [...c, insured])
  }
  const restart = () => {
    setGameId((g) => g + 1)
    setChoices([])
    setMany(null)
  }

  return (
    <>
      <StepHeader
        title="Fifteen years, two households"
        hint={`You put away ${formatUSDWhole(SOLO.yearlySaving)} a year, starting from ${formatUSDWhole(SOLO.startSavings)}. Each year carries a ${formatPercent(SOLO.lossChance, 0)} chance of a ${formatUSDWhole(SOLO.lossSize)} loss; a policy costs ${formatUSDWhole(SOLO.premium)} against a fair price of ${formatUSDWhole(SOLO_FAIR)}. Decide before each year. The other household always chooses the opposite, and the same dice decide both fates.`}
      />

      <div className={styles.stats}>
        <Stat
          label={over ? 'Your final balance' : `You, entering year ${yearsPlayed + 1}`}
          value={balance}
          format={formatUSDWhole}
          emphasis
          accentColor={wipedOut ? CARDINAL : GREEN}
          animate={false}
          note={wipedOut ? `wiped out in year ${yearsPlayed}` : undefined}
        />
        <Stat
          label="The other you"
          value={mirrorAlive ? mirrorBalance : mirrorPath[mirrorPath.length - 1]!}
          format={formatUSDWhole}
          accentColor={!mirrorAlive ? CARDINAL : SLATE}
          animate={false}
          note={mirrorAlive ? 'same years, opposite choices' : `wiped out in year ${mirrorPath.length - 1}`}
        />
        <Stat
          label="The gap"
          value={gap ?? balance}
          format={(v) => (gap == null ? 'no contest' : `${v >= 0 ? '+' : ''}${formatUSDWhole(v)}`)}
          animate={false}
          note={
            gap == null
              ? 'the other you is out of the game'
              : gap >= 0
                ? 'you are ahead'
                : 'the other you is ahead'
          }
        />
        <Stat
          label="Years played"
          value={yearsPlayed}
          format={(v) => `${v} of ${SOLO.years}`}
          animate={false}
        />
      </div>

      {!over && (
        <div className={styles.choiceRow}>
          <Button onClick={() => choose(true)}>
            Buy the policy ({formatUSDWhole(SOLO.premium)})
          </Button>
          <Button onClick={() => choose(false)}>Go without</Button>
        </div>
      )}

      <GameChart yourPath={yourPath} mirrorPath={mirrorPath} />
      <div className={styles.legendRow}>
        <span><span className={styles.swatch} style={{ background: CARDINAL }} aria-hidden="true" /> you</span>
        <span><span className={styles.swatch} style={{ background: SLATE }} aria-hidden="true" /> the other you</span>
      </div>

      {yearsPlayed > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.ledger}>
            <caption className="sr-only">Year by year, you and the mirror household</caption>
            <thead>
              <tr>
                <th>Year</th>
                <th>You chose</th>
                <th>The dice</th>
                <th>You</th>
                <th>The other you</th>
              </tr>
            </thead>
            <tbody>
              {choices.map((insured, i) => {
                const hit = hits[i]!
                const mirrorOut = i + 1 > mirrorPath.length - 1
                return (
                  <tr key={i} className={hit ? styles.ledgerHit : undefined}>
                    <td className="tnum">{i + 1}</td>
                    <td>{insured ? 'insure' : 'go without'}</td>
                    <td>{hit ? 'the loss came' : 'no loss'}</td>
                    <td className="tnum">{formatUSDWhole(yourPath[i + 1]!)}</td>
                    <td className="tnum">
                      {mirrorOut ? `wiped out in year ${mirrorPath.length - 1}` : formatUSDWhole(mirrorPath[i + 1]!)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {over && (
        <>
          <Callout tone="note" label="Where the gap came from">
            You paid <strong>{formatUSDWhole(yourPremiums)}</strong> in premiums and took{' '}
            <strong>{formatUSDWhole(yourLosses)}</strong> in losses; the other you paid{' '}
            <strong>{formatUSDWhole(mirrorPremiums)}</strong> and took{' '}
            <strong>{formatUSDWhole(mirrorLosses)}</strong>
            {!mirrorAlive ? ' before running out of money' : ''}. The dice were rolled when the
            game began, so the choices never changed which years went bad, only who paid for
            them. For reference, insuring every single year ends at{' '}
            <strong>{formatUSDWhole(ALWAYS_FINAL)}</strong> with certainty.
          </Callout>

          {!many ? (
            <div className={styles.runAgain}>
              <Button onClick={() => setMany(runStrategyMany(choices, RUNS, gameId * 31_337 + 7))}>
                Run your choices 1,000 times
              </Button>
              <Button onClick={restart}>Start a new game</Button>
            </div>
          ) : (
            <ManyRunsView many={many} onRestart={restart} wipedOut={wipedOut} />
          )}
        </>
      )}
    </>
  )
}

/** The thousand parallel lives: the player's strategy against fresh dice. */
function ManyRunsView({
  many,
  onRestart,
  wipedOut,
}: {
  many: ManyRuns
  onRestart: () => void
  wipedOut: boolean
}) {
  return (
    <>
      <StepHeader
        title="Your choices, a thousand lives"
        hint={`The same choice sequence you just played${wipedOut ? ' (with your last choice repeated for the unplayed years)' : ''}, replayed against a thousand fresh draws of the dice. Your game was one of these squares; you did not get to pick which.`}
      />
      <OutcomeGrid outcomes={many.outcomes} />
      <div className={styles.legendRow}>
        <span><span className={styles.swatch} style={{ background: GREEN }} aria-hidden="true" /> finished ahead of insuring every year</span>
        <span><span className={styles.swatch} style={{ background: AMBER }} aria-hidden="true" /> did not</span>
        <span><span className={styles.swatch} style={{ background: CARDINAL }} aria-hidden="true" /> wiped out</span>
      </div>
      <div className={styles.stats}>
        <Stat
          label="Finished ahead of always insuring"
          value={many.ahead / RUNS}
          format={(v) => formatPercent(v, 1)}
          accentColor={GREEN}
          animate={false}
          note={`vs. a certain ${formatUSDWhole(ALWAYS_FINAL)}`}
        />
        <Stat
          label="Wiped out"
          value={many.ruined / RUNS}
          format={(v) => formatPercent(v, 1)}
          accentColor={CARDINAL}
          animate={false}
        />
        <Stat
          label="Median final balance"
          value={many.medianFinal}
          format={formatUSDWhole}
          animate={false}
        />
      </div>
      <Callout tone="note" label="What an insurer is">
        An insurance company is an entity rich enough to live all thousand squares at once. At
        that scale the dice average out, the fair premium of {formatUSDWhole(SOLO_FAIR)} covers
        the claims, and the {formatUSDWhole(SOLO_LOAD)} load pays for running the pool. A single
        household never gets that averaging; it gets one square. The premium is the price of
        renting the insurer&rsquo;s thousand.
      </Callout>
      <div className={styles.runAgain}>
        <Button onClick={onRestart}>Start a new game</Button>
      </div>
    </>
  )
}

function OutcomeGrid({ outcomes }: { outcomes: ManyRuns['outcomes'] }) {
  const cols = 50
  const size = 10
  const gap = 3
  const rows = Math.ceil(outcomes.length / cols)
  const w = cols * (size + gap) - gap
  const h = rows * (size + gap) - gap
  const fills = {
    ahead: 'var(--c-series-1)',
    notAhead: 'var(--c-series-2)',
    ruined: 'var(--c-accent)',
  } as const
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={styles.outcomeGrid}
      role="img"
      aria-label={`A thousand replays of your choices: ${outcomes.filter((o) => o === 'ruined').length} wiped out`}
    >
      {outcomes.map((o, i) => (
        <rect
          key={i}
          x={(i % cols) * (size + gap)}
          y={Math.floor(i / cols) * (size + gap)}
          width={size}
          height={size}
          rx={2.5}
          fill={fills[o]}
          opacity={o === 'notAhead' ? 0.75 : 1}
        />
      ))}
    </svg>
  )
}

/** Both households' balance paths, drawn live as the years resolve. */
function GameChart({ yourPath, mirrorPath }: { yourPath: number[]; mirrorPath: number[] }) {
  const w = 640
  const h = 180
  const pad = 6
  const all = [...yourPath, ...mirrorPath, 0, ALWAYS_FINAL]
  const lo = Math.min(...all)
  const hi = Math.max(...all, SOLO.startSavings + 1)
  const x = (i: number) => pad + (i / SOLO.years) * (w - 2 * pad)
  const y = (v: number) => pad + ((hi - v) / (hi - lo || 1)) * (h - 2 * pad)
  const line = (path: number[]) => path.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.gameChart} role="img" aria-label="Balance by year, you and the mirror household">
      <line x1={pad} y1={y(0)} x2={w - pad} y2={y(0)} stroke="var(--border-hairline)" strokeWidth="1" />
      <polyline points={line(mirrorPath)} fill="none" stroke="var(--c-series-3)" strokeWidth="2" strokeDasharray="5 4" />
      <polyline points={line(yourPath)} fill="none" stroke="var(--c-accent)" strokeWidth="2.5" />
      {yourPath.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="var(--c-accent)" />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */

function MathView() {
  return (
    <>
      <StepHeader
        title="See the math"
        hint="The game's numbers, priced with the same expected-value arithmetic as the gambling lesson."
      />
      <FormulaBlock
        tex={`\\text{fair premium} = ${SOLO.lossChance} \\times ${texUSD(SOLO.lossSize)} = ${texUSD(SOLO_FAIR)}`}
        caption="Step 1. The actuarially fair premium is the chance of the loss times its size: what a pool needs per household just to cover a year's claims."
      />
      <FormulaBlock
        tex={`\\text{load} = ${texUSD(SOLO.premium)} - ${texUSD(SOLO_FAIR)} = ${texUSD(SOLO_LOAD)}`}
        caption={`Step 2. The insurer charges ${formatPercent(SOLO_LOAD / SOLO_FAIR, 0)} above fair to pay its staff, its capital, and its shareholders. The load plays the same role as the house edge in the gambling lesson.`}
        muted
      />
      <FormulaBlock
        tex={`\\underbrace{${SOLO.lossChance} \\times ${texUSD(SOLO.lossSize)} = ${texUSD(SOLO_FAIR)}}_{\\text{expected yearly cost, uninsured}} \\qquad \\underbrace{${texUSD(SOLO.premium)}}_{\\text{certain yearly cost, insured}}`}
        caption="Step 3. On expected value alone, going without insurance comes out ahead by exactly the load, every year. This line is why insurance can never be judged on expected value by itself."
        muted
      />
      <FormulaBlock
        tex={`\\text{worst year, uninsured} = ${texUSD(SOLO.yearlySaving)} - ${texUSD(SOLO.lossSize)} = ${texUSD(SOLO.yearlySaving - SOLO.lossSize)} \\qquad \\text{worst year, insured} = ${texUSD(SOLO.yearlySaving - SOLO.premium)}`}
        caption="Step 4. A single household experiences one draw, not the average. An uninsured bad year swallows several years of saving at once; an insured year nets the same modest amount no matter what the dice do."
      />
      <FormulaBlock
        tex={`\\text{insured, all ${SOLO.years} years} = ${texUSD(SOLO.startSavings)} + ${SOLO.years} \\times (${texUSD(SOLO.yearlySaving)} - ${texUSD(SOLO.premium)}) = ${texUSD(ALWAYS_FINAL)}`}
        caption="Step 5. Insuring every year turns the whole game deterministic: this number arrives with certainty, and it is the benchmark the thousand-run grid on the play tab compares against."
        muted
      />
      <Callout tone="note" label="Compared with the gambling lesson">
        A lottery ticket pays a load for a small chance of a large gain. An insurance premium
        pays a load to remove a small chance of a large loss. The arithmetic is the same; the
        difference is which side of the risk the buyer is on.
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
        title="Deciding what to insure"
        hint="Insure losses you could not absorb, even at a load. Skip cover for losses you could absorb. Set your own cushion, then judge each offer."
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
            load is the price of protection you cannot provide yourself. Compare quotes across
            insurers, but this is the kind of risk insurance exists for.
          </>
        ) : (
          <>
            The {scenario.label.toLowerCase()} covers a loss your {formatUSDWhole(cushion)} cushion
            could absorb, so the load is a fee for protection you do not need. Declining offers
            like this one and keeping the premiums is called self-insuring, and over time the
            saved premiums become the repair fund.
          </>
        )}
      </Callout>
      <Callout tone="plain" label="Classroom assumptions, not quotes">
        The chances and prices above are stated round-number assumptions, chosen so the structure
        of each decision is easy to see; real quotes vary by person, place, and policy. The rule
        is what transfers: insure losses you could not absorb, self-insure the ones you could,
        and compare the quoted premium to chance × loss before signing.
      </Callout>
    </>
  )
}
