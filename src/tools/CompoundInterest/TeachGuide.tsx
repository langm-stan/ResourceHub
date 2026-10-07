import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Download, Maximize2, X } from 'lucide-react'
import { ruleOf72 } from '../../lib/finance'
import { isNativeApp, saveFile } from '../../lib/nativeApp'
import { formatUSD, formatUSDWhole, formatYears } from '../../lib/format'
import { Slider, Stat } from '../../design-system'
import { GrowthChart } from './components/GrowthChart'
import { computeResults, finalBalanceFor, type Results } from './compute'
import { DEFAULT_SCENARIO, scenariosEqual, type Scenario } from './state'
import styles from './TeachGuide.module.css'

/*
 * PROTOTYPE. A lesson plan for teaching compound interest with the tool, for
 * a teacher who has never opened it: five steps, one on screen at a time. It describes the lesson and does not give orders:
 * there is no "say this" or "show this". The teacher never has to set a
 * slider, and every number quoted in the guide is computed by the tool's own
 * engine, so the guide and the chart cannot disagree.
 *
 * The tool here is the Compound Interest tool cut down to what the lesson
 * uses: an amount, a rate and a number of years. Present value, regular
 * contributions and compounding periods are left to the full tool.
 */

const lump = (principal: number, ratePct: number, years: number): Scenario => ({
  ...DEFAULT_SCENARIO,
  principal,
  ratePct,
  years,
})

/*
 * The lesson is anchored on one account: $1,000 at 8%, left alone. The
 * estimate, the first two examples and the exit question are all that
 * account, looked at a different way or with one number
 * changed. The third example picks up the $8,000 the second one ends on and
 * asks what a ten-year wait does to it.
 */
const ANCHOR = lump(1000, 8, 18)
/** The same account left twice as long, for the exit question. */
const LONGER = lump(1000, 8, 36)
/** The second example: the same account nine years on, when it has doubled again. */
const DOUBLED_AGAIN = lump(1000, 8, 27)
/** The third example: $8,000 invested at 27 or at 37 and left until 70. */
const RETIRE_AGE = 70
const EARLY_AGE = 27
const LATE_AGE = 37
const EARLY = lump(8000, 8, RETIRE_AGE - EARLY_AGE)
const LATE = lump(8000, 8, RETIRE_AGE - LATE_AGE)
/*
 * The practice problems use an account of their own, with a different
 * amount, rate and term, so that working them is practice and not recall.
 */
const PRACTICE = lump(2500, 6, 10)
/** The same practice account over a longer run, so the chart shows it doubling. */
const PRACTICE_DOUBLING = lump(2500, 6, 24)
/** Twice the money for the original time, for the exit question. */
const EXIT_MONEY = lump(2000, 8, 18)

const GUESS = ANCHOR
const guess = computeResults(ANCHOR)
const simpleGuess = ANCHOR.principal * (1 + (ANCHOR.ratePct / 100) * ANCHOR.years)
const doublingYears = guess.doublingYears ?? 0
const doubledAgain = finalBalanceFor(DOUBLED_AGAIN)
const early = finalBalanceFor(EARLY)
const late = finalBalanceFor(LATE)
const practice = finalBalanceFor(PRACTICE)
const practiceDoubling = computeResults(PRACTICE_DOUBLING).doublingYears ?? 0

/*
 * The lesson's slides, as data. The page draws them from this list and the
 * download writes the same list into a PowerPoint file, so the two cannot
 * drift apart.
 */
type Run = string | { sup: string }
type Line = Run[]

interface SlideDef {
  title: string
  table?: { head: string[]; rows: string[][] }
  lines?: Line[]
  /** The three answers to the estimate, lettered A to C. */
  choices?: string[]
  /** Lines set in cardinal under the rest, one sentence to a line. */
  notes?: Line[]
}

const CHOICES = ['About $2,400', 'About $4,000', 'About $8,000']
const usd = formatUSDWhole

/** The four sentences of step 1, shown on the page and as the opening slide. */
const IDEA = [
  'In the first year, you earn interest on the money you invested.',
  'In the second year, you earn interest on the new balance, which includes the first year’s interest.',
  'This is compounding: earning interest on interest.',
  'Over many years, the interest earned this way becomes substantial.',
]

const DECK: SlideDef[] = [
  {
    title: 'Introducing Compound Interest',
    lines: IDEA.map((sentence) => [sentence]),
  },
  {
    title: 'Two years at 8% on $1,000',
    table: {
      head: ['Year', 'Interest earned', 'Balance'],
      rows: [
        ['1', '8% of $1,000 = $80.00', '$1,080.00'],
        ['2', '8% of $1,080 = $86.40', '$1,166.40'],
      ],
    },
    notes: [
      ['Each year, the 8% is earned on the balance at the start of that year.'],
      ['In year 2 that is $1,080, so the interest is $86.40, not $80.00.'],
    ],
  },
  {
    title: 'The formula',
    lines: [['Future value = Amount today × (1 + rate)', { sup: 'years' }]],
    notes: [['$1,000 × 1.08 × 1.08 = $1,166.40'], ['$1,000 × 1.08', { sup: '2' }, ' = $1,166.40']],
  },
  {
    title: 'Estimate the future value',
    lines: [
      [`You put ${usd(ANCHOR.principal)} in an account that pays ${ANCHOR.ratePct}% a year and leave it for ${ANCHOR.years} years.`],
      ['You add nothing.'],
      ['About how much is in the account at the end?'],
    ],
    choices: CHOICES,
  },
  {
    title: 'Check the estimate',
    lines: [
      [`${usd(ANCHOR.principal)} at ${ANCHOR.ratePct}% for ${ANCHOR.years} years.`],
      ['Which answer was right?'],
    ],
    choices: CHOICES,
  },
  {
    title: 'How long to double',
    lines: [
      [`It is about ${usd(ANCHOR.principal * 4)} after ${ANCHOR.years} years.`],
      [`How many more years until it is ${usd(ANCHOR.principal * 8)}?`],
    ],
  },
  {
    title: 'Start early or start late',
    lines: [
      [`We invest ${usd(EARLY.principal)} at age ${EARLY_AGE} and leave it until age ${RETIRE_AGE}.`],
      [`What if we wait until age ${LATE_AGE} to invest the ${usd(LATE.principal)}?`],
    ],
  },
  {
    title: 'Find the future value',
    lines: [
      [`${usd(PRACTICE.principal)} is invested at ${PRACTICE.ratePct}% a year for ${PRACTICE.years} years.`],
      ['What is it worth at the end?'],
    ],
  },
  {
    title: 'The Rule of 72',
    lines: [
      ['Divide 72 by the interest rate to estimate the years it takes money to double.'],
      [`At ${PRACTICE.ratePct}%, how long until the ${usd(PRACTICE.principal)} becomes ${usd(PRACTICE.principal * 2)}?`],
    ],
  },
  {
    title: 'Exit question',
    lines: [
      [`Which ends with more at ${LONGER.ratePct}%?`],
      [`${usd(LONGER.principal)} left for ${LONGER.years} years, or ${usd(EXIT_MONEY.principal)} left for ${EXIT_MONEY.years} years.`],
    ],
  },
]

/** Which slides go with each of the five steps, by position in DECK. */
const STEP_SLIDES = [[0, 1, 2], [3], [4, 5, 6], [7, 8], [9]]

/** Builds the deck as a PowerPoint presentation, one slide for each entry in DECK. */
export async function buildDeck() {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 by 7.5 inches
  pptx.title = 'Compound interest'
  const W = 13.33
  const INK = '221F1E'
  const CARDINAL = '8C1515'
  const runs = (lines: Line[]) =>
    lines.flatMap((line) =>
      line.map((run, i) => ({
        text: typeof run === 'string' ? run : run.sup,
        options: {
          superscript: typeof run !== 'string',
          breakLine: i === line.length - 1,
        },
      })),
    )

  for (const def of DECK) {
    const slide = pptx.addSlide()
    slide.background = { color: 'FFFFFF' }
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: CARDINAL } })
    slide.addText(def.title, {
      x: 0.6,
      y: 0.7,
      w: W - 1.2,
      h: 1.1,
      fontFace: 'Arial',
      fontSize: 38,
      bold: true,
      align: 'center',
      color: INK,
    })

    // The parts are stacked and the stack is centred in the room under the title.
    const tableH = def.table ? 0.62 * (def.table.rows.length + 1) : 0
    const linesH = def.lines ? 0.85 * def.lines.length : 0
    const choicesH = def.choices ? 1.0 : 0
    const notesH = def.notes ? 0.7 * def.notes.length : 0
    const parts = [tableH, linesH, choicesH, notesH].filter((h) => h > 0)
    const gap = 0.35
    const total = parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1)
    let y = 2.0 + Math.max(0, (5.0 - total) / 2)

    if (def.table) {
      const cell = (text: string, head: boolean) => ({
        text,
        options: {
          bold: head,
          color: head ? '6B6662' : INK,
          fontSize: head ? 16 : 22,
          align: 'center' as const,
          fontFace: 'Arial',
        },
      })
      slide.addTable(
        [def.table.head.map((t) => cell(t.toUpperCase(), true)), ...def.table.rows.map((r) => r.map((t) => cell(t, false)))],
        {
          x: 1.4,
          y,
          w: W - 2.8,
          colW: [1.6, 5.6, 3.33],
          rowH: 0.62,
          border: { type: 'solid', pt: 1, color: 'D6D2CE' },
        },
      )
      y += tableH + gap
    }
    if (def.lines) {
      slide.addText(runs(def.lines), {
        x: 0.8,
        y,
        w: W - 1.6,
        h: linesH,
        fontFace: 'Arial',
        fontSize: 26,
        align: 'center',
        valign: 'middle',
        color: INK,
        paraSpaceAfter: 8,
      })
      y += linesH + gap
    }
    if (def.choices) {
      const w = 3.6
      const space = 0.3
      const x0 = (W - (w * 3 + space * 2)) / 2
      def.choices.forEach((choice, i) => {
        slide.addText(`${'ABC'[i]}   ${choice}`, {
          x: x0 + i * (w + space),
          y,
          w,
          h: choicesH,
          fontFace: 'Arial',
          fontSize: 24,
          bold: true,
          align: 'center',
          valign: 'middle',
          color: INK,
          line: { color: 'D6D2CE', width: 1 },
        })
      })
      y += choicesH + gap
    }
    if (def.notes) {
      slide.addText(runs(def.notes), {
        x: 0.5,
        y,
        w: W - 1.0,
        h: notesH,
        fontFace: 'Arial',
        fontSize: 24,
        bold: true,
        align: 'center',
        valign: 'middle',
        color: CARDINAL,
      })
    }
  }
  return pptx
}

/** Writes the deck to a file and hands it to the browser to save. */
async function downloadDeck() {
  const pptx = await buildDeck()
  if (isNativeApp) {
    const blob = (await pptx.write({ outputType: 'blob' })) as Blob
    await saveFile(blob, 'Compound interest lesson.pptx')
    return
  }
  await pptx.writeFile({ fileName: 'Compound interest lesson.pptx' })
}

const describe = (s: Scenario) =>
  `${formatUSDWhole(s.principal)} at ${s.ratePct}% for ${s.years} years`

/** The three headline numbers, above the chart and in its expanded window. */
const toolStats = (results: Results) => (
  <div className={styles.toolStats}>
    <Stat
      label="Ends at"
      value={results.final.balance}
      format={formatUSDWhole}
      emphasis
      accentColor="var(--c-series-1)"
    />
    <Stat label="You put in" value={results.totalContributed} format={formatUSDWhole} />
    <Stat
      label="Interest earned"
      value={results.totalInterest}
      format={formatUSDWhole}
      accentColor="var(--c-series-2)"
    />
  </div>
)

/** The three answers to the estimate, shown with the question and again when it is checked. */
const choices = (
  <ul className={styles.choices}>
    {CHOICES.map((choice, i) => (
      <li key={choice}>
        <span>{'ABC'[i]}</span> {choice}
      </li>
    ))}
  </ul>
)

/*
 * One part of a step. A part is named for what it is (a question, a result)
 * where the name helps, and left unnamed where the text speaks for itself.
 * The guide does not tell the teacher what to say or do.
 */
function Part({
  label,
  lines = false,
  children,
}: {
  label?: string
  /** Each sentence is its own paragraph and keeps to one line where the step is wide enough. */
  lines?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.part}>
      {label && <p className={styles.partLabel}>{label}</p>}
      <div className={lines ? `${styles.partBody} ${styles.lines}` : styles.partBody}>{children}</div>
    </div>
  )
}

/*
 * The two ways to an example's result, side by side: "See the result" opens
 * the chart in a window over the page, and "Show the answer" uncovers the
 * result in words.
 */
function Result({ onSee, children }: { onSee: () => void; children: ReactNode }) {
  const [shown, setShown] = useState(false)
  return (
    <div className={styles.result}>
      <div className={styles.resultButtons}>
        <button type="button" className={styles.seeButton} onClick={onSee}>
          See the result
        </button>
        {!shown && (
          <button type="button" className={styles.revealButton} onClick={() => setShown(true)}>
            Show the answer
          </button>
        )}
      </div>
      {shown && <div className={`${styles.answer} ${styles.partBody} ${styles.lines}`}>{children}</div>}
    </div>
  )
}

const renderLine = (line: Line) =>
  line.map((run, i) => (typeof run === 'string' ? run : <sup key={i}>{run.sup}</sup>))

/** The face of a slide: its title and contents, at whatever width it is given. */
function SlideFace({ def }: { def: SlideDef }) {
  return (
    <div className={styles.slide}>
      <p className={styles.slideTitle}>{def.title}</p>
      <div className={styles.slideBody}>
        {def.table && (
          <table className={styles.slideTable}>
            <thead>
              <tr>
                {def.table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {def.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {def.lines?.map((line, i) => (
          <p key={i} className={styles.slideLine}>
            {renderLine(line)}
          </p>
        ))}
        {def.choices && (
          <ul className={styles.slideChoices}>
            {def.choices.map((choice, i) => (
              <li key={choice}>
                <span>{'ABC'[i]}</span> {choice}
              </li>
            ))}
          </ul>
        )}
        {def.notes && (
          <p className={styles.slideNote}>
            {def.notes.map((line, i) => (
              <span key={i}>{renderLine(line)}</span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

/** One slide of the deck as a preview, with the button that opens it large. */
function Slide({ index, onExpand }: { index: number; onExpand: () => void }) {
  const def = DECK[index]!
  return (
    <figure className={styles.slideFrame}>
      {/* A press anywhere on the preview opens it; the button is the keyboard's way in. */}
      <div className={styles.slideShell} onClick={onExpand}>
        <SlideFace def={def} />
        <button
          type="button"
          className={styles.slideExpand}
          onClick={(e) => {
            e.stopPropagation()
            onExpand()
          }}
          aria-label={`Expand slide ${index + 1}: ${def.title}`}
          title="Expand slide"
        >
          <Maximize2 size={15} aria-hidden="true" />
        </button>
      </div>
      <figcaption className={styles.slideCaption}>Slide {index + 1}</figcaption>
    </figure>
  )
}

/*
 * A step's slides opened large over the page, the way a chart opens. The
 * arrows, on screen and on the keyboard, move through the step's slides.
 * Closed by the X, Escape or a press outside.
 */
function SlideViewer({
  indexes,
  at,
  onMove,
  onClose,
}: {
  indexes: number[]
  /** Position within the step's slides. */
  at: number
  onMove: (to: number) => void
  onClose: () => void
}) {
  const index = indexes[at]!
  const def = DECK[index]!
  const hasPrev = at > 0
  const hasNext = at < indexes.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onMove(at - 1)
      if (e.key === 'ArrowRight' && hasNext) onMove(at + 1)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [at, hasPrev, hasNext, onMove, onClose])

  return createPortal(
    <div
      className={styles.slideOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Slide ${index + 1}: ${def.title}`}
      onClick={onClose}
    >
      <div className={styles.slideOverlayPanel} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.slideClose}
          onClick={onClose}
          aria-label="Close slide"
          title="Close (Esc)"
          autoFocus
        >
          <X size={18} aria-hidden="true" />
        </button>
        <SlideFace def={def} />
        {indexes.length > 1 && (
          <div className={styles.slideNav}>
            <button
              type="button"
              className={styles.slideArrow}
              onClick={() => onMove(at - 1)}
              disabled={!hasPrev}
              aria-label="Previous slide"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <span className={styles.slideCount} aria-live="polite">
              Slide {at + 1} of {indexes.length}
            </span>
            <button
              type="button"
              className={styles.slideArrow}
              onClick={() => onMove(at + 1)}
              disabled={!hasNext}
              aria-label="Next slide"
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>,
    // Inside whatever fills the screen, as the chart's window does.
    document.fullscreenElement ?? document.body,
  )
}

/*
 * A step's slides, folded away until asked for. Opened, they are previews
 * side by side, with the way to the download, which sits on the last step.
 */
function StepSlides({ step, onDownload }: { step: number; onDownload?: () => void }) {
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const indexes = STEP_SLIDES[step]!
  return (
    <div className={styles.stepSlides}>
      <button
        type="button"
        className={styles.slidesToggle}
        aria-expanded={open}
        aria-controls={`guide-slides-${step}`}
        onClick={() => setOpen(!open)}
      >
        {indexes.length === 1 ? 'Slide for this step' : `Slides for this step (${indexes.length})`}
        <ChevronDown size={18} aria-hidden="true" className={styles.slidesChevron} />
      </button>
      <div id={`guide-slides-${step}`} hidden={!open}>
        <div
          className={styles.slidesSmall}
          style={{ '--slides': indexes.length } as CSSProperties}
        >
          {indexes.map((index, i) => (
            <Slide key={index} index={index} onExpand={() => setViewing(i)} />
          ))}
        </div>
        {onDownload && (
          <p className={styles.slidesLink}>
            <button type="button" onClick={onDownload}>
              Download the slides
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </p>
        )}
      </div>
      {viewing !== null && (
        <SlideViewer
          indexes={indexes}
          at={viewing}
          onMove={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

interface StepDef {
  title: string
  /** Whether the tool is shown under this step. */
  tool: boolean
}

const STEPS: StepDef[] = [
  { title: 'Introducing Compound Interest', tool: false },
  { title: 'Estimate the future value', tool: false },
  { title: 'Use the tool', tool: true },
  { title: 'Practice problems', tool: true },
  { title: 'Wrap up', tool: true },
]

export function CompoundInterestGuide() {
  const [step, setStep] = useState(0)
  // What the tool is showing. It starts on the estimate from step 2.
  const [scenario, setScenario] = useState<Scenario>(GUESS)
  const results = useMemo(() => computeResults(scenario), [scenario])
  // Counts requests to open the chart in its window (see ChartFrame).
  const [resultSignal, setResultSignal] = useState(0)
  const seeResult = () => setResultSignal((n) => n + 1)
  const topRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  // A new step starts at its top with nothing open. The one exception is
  // arriving at step 3 from the estimate: the answer to the estimate is the
  // first example, so that example is already open.
  const first = useRef(true)
  const arriveWithAnswer = useRef(false)
  useEffect(() => {
    if (step === 2 && arriveWithAnswer.current) {
      setExample(0)
      setScenario(GUESS)
    } else {
      setExample(null)
      // The last step's question starts on its first case.
      if (step === STEPS.length - 1) setScenario(LONGER)
    }
    arriveWithAnswer.current = false
    if (first.current) {
      first.current = false
      return
    }
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [step])

  // Step 3: which of the three examples is open. Opening one puts it on the
  // tool, so there is no separate button to press.
  const [example, setExample] = useState<number | null>(null)
  const openExample = (i: number, s: Scenario) => {
    if (example === i) return setExample(null)
    setExample(i)
    setScenario(s)
  }

  /** A button that puts a scenario on the tool, and can open its chart too. */
  const SetUp = ({
    scenario: s,
    see = false,
    children,
  }: {
    scenario: Scenario
    see?: boolean
    children: ReactNode
  }) => (
    <button
      type="button"
      className={styles.setUp}
      onClick={() => {
        setScenario(s)
        if (see) seeResult()
      }}
    >
      {scenariosEqual(scenario, s) && <Check size={20} aria-hidden="true" />}
      {children}
    </button>
  )

  const current = STEPS[step]!

  return (
    <div className={styles.guide}>
      <div ref={topRef} className={styles.top}>
        <p className={styles.summary}>
          A Toolkit-Integrated lesson on compound interest in 5 steps.
        </p>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={styles.stepTab}
                aria-current={i === step ? 'step' : undefined}
                data-done={i < step}
                onClick={() => setStep(i)}
              >
                <span className={styles.stepNo}>{i + 1}</span>
                <span className={styles.stepName}>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <section className={styles.card} aria-labelledby="guide-step-title">
        <p className={styles.stepCount}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="guide-step-title" className={styles.stepTitle}>
          {current.title}
        </h2>

        {step === 0 && (
          <>
            <Part lines>
              {IDEA.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </Part>
          </>
        )}

        {step === 1 && (
          <>
            <Part lines>
              <p>
                You put {formatUSDWhole(GUESS.principal)} in an account that pays {GUESS.ratePct}%
                a year and leave it for {GUESS.years} years.
              </p>
              <p>You add nothing.</p>
              <p>About how much is in the account at the end?</p>
              {choices}
            </Part>
          </>
        )}

        {step === 2 && (
          <>
            {/* Three examples, closed until one is chosen, so the step opens
                on three names and not on three columns of text. */}
            <div className={styles.examples}>
              {[
                { title: 'Check the estimate', scenario: GUESS },
                { title: 'How long to double', scenario: DOUBLED_AGAIN },
                { title: 'Start early or start late', scenario: EARLY },
              ].map((e, i) => (
                <button
                  key={e.title}
                  type="button"
                  className={styles.example}
                  aria-expanded={example === i}
                  aria-controls={example === i ? 'guide-example' : undefined}
                  onClick={() => openExample(i, e.scenario)}
                >
                  <span className={styles.stepNo}>{i + 1}</span>
                  <span className={styles.exampleTitle}>{e.title}</span>
                </button>
              ))}
            </div>

            {example !== null && (
              <div id="guide-example" className={styles.examplePanel}>
                {example === 0 && (
                  <>
                    <Part lines>
                      <p>
                        {formatUSDWhole(GUESS.principal)} at {GUESS.ratePct}% for {GUESS.years}{' '}
                        years.
                      </p>
                      <p>Which answer was right?</p>
                      {choices}
                    </Part>
                    <Result key="e0" onSee={seeResult}>
                        <p>
                          The balance ends at {formatUSDWhole(guess.headline)}, so the answer is B.
                        </p>
                        <p>
                          {formatUSDWhole(simpleGuess)} is what the account would hold if interest
                          were paid only on the original {formatUSDWhole(GUESS.principal)}.
                        </p>
                        <p>
                          The other {formatUSDWhole(guess.headline - simpleGuess)} is interest
                          earned on interest.
                        </p>
                    </Result>
                  </>
                )}
                {example === 1 && (
                  <>
                    <Part lines>
                      <p>
                        It is about {formatUSDWhole(ANCHOR.principal * 4)} after {ANCHOR.years}{' '}
                        years.
                      </p>
                      <p>
                        How many more years until it is {formatUSDWhole(ANCHOR.principal * 8)}?
                      </p>
                    </Part>
                    <Result key="e1" onSee={seeResult}>
                      <p>About {DOUBLED_AGAIN.years - ANCHOR.years} more years.</p>
                      <p>
                        After {DOUBLED_AGAIN.years} years the balance is{' '}
                        {formatUSDWhole(doubledAgain)}.
                      </p>
                      <p>
                        At {ANCHOR.ratePct}%, the balance doubles about every{' '}
                        {formatYears(doublingYears)}.
                      </p>
                    </Result>
                  </>
                )}
                {example === 2 && (
                  <>
                    <Part lines>
                      <p>
                        We invest {formatUSDWhole(EARLY.principal)} at age {EARLY_AGE} and leave it
                        until age {RETIRE_AGE}.
                      </p>
                      <p>
                        What if we wait until age {LATE_AGE} to invest the{' '}
                        {formatUSDWhole(LATE.principal)}?
                      </p>
                    </Part>
                    <div className={styles.pair}>
                      <SetUp scenario={EARLY}>Invest at {EARLY_AGE}</SetUp>
                      <SetUp scenario={LATE}>Invest at {LATE_AGE}</SetUp>
                    </div>
                    <Result key="e2" onSee={seeResult}>
                      <p>
                        Investing at {EARLY_AGE} ends at {formatUSDWhole(early)}.
                      </p>
                      <p>
                        Investing at {LATE_AGE} ends at {formatUSDWhole(late)}.
                      </p>
                      <p>Waiting ten years costs {formatUSDWhole(early - late)}.</p>
                    </Result>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            {/* Two problems, closed until one is chosen, as in step 3. */}
            <div className={`${styles.examples} ${styles.examplesTwo}`}>
              {[
                { title: 'Find the future value', scenario: PRACTICE },
                { title: 'The Rule of 72', scenario: PRACTICE_DOUBLING },
              ].map((e, i) => (
                <button
                  key={e.title}
                  type="button"
                  className={styles.example}
                  aria-expanded={example === i}
                  aria-controls={example === i ? 'guide-example' : undefined}
                  onClick={() => openExample(i, e.scenario)}
                >
                  <span className={styles.stepNo}>{i + 1}</span>
                  <span className={styles.exampleTitle}>{e.title}</span>
                </button>
              ))}
            </div>

            {example !== null && (
              <div id="guide-example" className={styles.examplePanel}>
                {example === 0 && (
                  <>
                    <Part lines>
                      <p>
                        {formatUSDWhole(PRACTICE.principal)} is invested at {PRACTICE.ratePct}% a
                        year for {PRACTICE.years} years.
                      </p>
                      <p>What is it worth at the end?</p>
                    </Part>
                    <Result key="p0" onSee={seeResult}>
                      <p>
                        {formatUSDWhole(PRACTICE.principal)} &times; 1.06<sup>{PRACTICE.years}</sup>{' '}
                        = <strong>{formatUSD(practice)}</strong>
                      </p>
                    </Result>
                  </>
                )}
                {example === 1 && (
                  <>
                    <Part lines>
                      <p>
                        The Rule of 72: divide 72 by the interest rate to estimate the years it
                        takes money to double.
                      </p>
                      <p>
                        At {PRACTICE.ratePct}%, how long until the{' '}
                        {formatUSDWhole(PRACTICE.principal)} becomes{' '}
                        {formatUSDWhole(PRACTICE.principal * 2)}?
                      </p>
                    </Part>
                    <Result key="p1" onSee={seeResult}>
                      <p>
                        72 &divide; {PRACTICE.ratePct} ={' '}
                        <strong>{ruleOf72(PRACTICE.ratePct)} years</strong>
                      </p>
                      <p>The exact figure is {formatYears(practiceDoubling)}.</p>
                    </Result>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <Part lines>
              <p>Compound interest rewards time more than it rewards the amount.</p>
              <p>
                The earlier the money goes in, the more of the final balance is interest earned on
                interest.
              </p>
            </Part>
            <Part lines>
              <p>Which ends with more at {LONGER.ratePct}%?</p>
              <p>
                {formatUSDWhole(LONGER.principal)} left for {LONGER.years} years, or{' '}
                {formatUSDWhole(EXIT_MONEY.principal)} left for {EXIT_MONEY.years} years.
              </p>
            </Part>
            <div className={styles.pair}>
              <SetUp scenario={LONGER}>
                {formatUSDWhole(LONGER.principal)} for {LONGER.years} years
              </SetUp>
              <SetUp scenario={EXIT_MONEY}>
                {formatUSDWhole(EXIT_MONEY.principal)} for {EXIT_MONEY.years} years
              </SetUp>
            </div>
            <Result onSee={seeResult}>
              <p>
                <strong>
                  {formatUSDWhole(LONGER.principal)} for {LONGER.years} years.
                </strong>
              </p>
              <p>
                It ends at {formatUSDWhole(finalBalanceFor(LONGER))}, against{' '}
                {formatUSDWhole(finalBalanceFor(EXIT_MONEY))}.
              </p>
              <p>The longer period ends with twice as much.</p>
            </Result>
          </>
        )}

        {/* Keyed by step, so each step starts with its slides folded. The
            last step holds the download itself, so it needs no link to it. */}
        <StepSlides
          key={step}
          step={step}
          onDownload={step < STEPS.length - 1 ? () => setStep(STEPS.length - 1) : undefined}
        />

        {step === STEPS.length - 1 && (
          <div className={styles.download}>
            <button
              type="button"
              className={styles.downloadButton}
              disabled={downloading}
              onClick={() => {
                setDownloading(true)
                void downloadDeck().finally(() => setDownloading(false))
              }}
            >
              <Download size={20} aria-hidden="true" />
              {downloading ? 'Preparing the slides' : 'Download the slides'}
            </button>
            <p className={styles.downloadNote}>
              All {DECK.length} slides from the five steps, as a PowerPoint file.
            </p>
          </div>
        )}

        <div className={styles.nav}>
          {step > 0 ? (
            <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
              <ArrowLeft size={20} aria-hidden="true" />
              Back
            </button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <button
              type="button"
              className={styles.next}
              onClick={() => {
                arriveWithAnswer.current = true
                setStep(2)
              }}
            >
              Next: See the answer on the tool
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          ) : step < STEPS.length - 1 ? (
            <button type="button" className={styles.next} onClick={() => setStep(step + 1)}>
              Next: {STEPS[step + 1]!.title}
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          ) : (
            <Link to="/compound-interest" className={styles.next}>
              Return to the Compound Interest Tool
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      {/* The tool, cut down to the three numbers the lesson uses. It stays
          mounted through the lesson, since the window "See the result" opens
          is this chart's own expanded view. */}
      <div className={styles.tool} hidden={!current.tool}>
        <p className={styles.toolLabel}>
          The tool<span> · {describe(scenario)}</span>
        </p>
        <div className={styles.toolCard}>
          <div className={`${styles.toolBand} fieldBand`}>
            <Slider
              label="Initial amount"
              value={scenario.principal}
              onChange={(principal) => setScenario({ ...scenario, principal })}
              min={0}
              max={100_000}
              step={500}
              editable
              inputMax={Number.MAX_SAFE_INTEGER}
              prefix="$"
            />
            <Slider
              label="Annual rate"
              value={scenario.ratePct}
              onChange={(ratePct) => setScenario({ ...scenario, ratePct })}
              min={0}
              max={20}
              step={0.1}
              editable
              inputMax={40}
              suffix="%"
              precision={1}
            />
            <Slider
              label="Time horizon"
              value={scenario.years}
              onChange={(years) => setScenario({ ...scenario, years })}
              min={1}
              max={60}
              step={1}
              editable
              inputMax={100}
              suffix="years"
            />
          </div>
          {toolStats(results)}
          <GrowthChart
            scenario={scenario}
            results={results}
            overlayHeader={toolStats(results)}
            title="Balance over time"
            expandSignal={resultSignal}
          />
        </div>
      </div>
    </div>
  )
}
