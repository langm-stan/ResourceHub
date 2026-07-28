import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button, Callout, Card, SegmentedControl, Stat } from '../../design-system'
import { REAL_BOARDS } from './realBoards'
import { drawBasket, sampleBasketReturns } from './compute'
import { StationChart } from './components/StationChart'
import { BasketHistogram } from './components/BasketHistogram'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Stock Diversifier (formerly Stock Picker, the middle station of
 * Chance & Ownership; the stock-picker slug is kept so deck and
 * worksheet links stay live):
 * commit $1,000 to one of the 100 largest US companies of a real January,
 * then see its actual decade against the index. Most single picks trail.
 * Part two spreads the same $1,000 across more tickets from the same
 * board: the returns are the board's real data, and the yearly-swing
 * comparison uses the lecture's calibration (a 40% single-stock swing
 * falling toward the market's 20% floor).
 */

const BASKET_SIZES = [1, 5, 10, 25]
/** Tickets drawn up front per basket, so growing the basket adds tickets. */
const BASKET_POOL = 25
/** Part three's simulation: this many random baskets of each chosen size. */
const SIM_DRAWS = 2000
const SIM_SIZES = [1, 5, 10, 25, 50]
/** Baskets dealt per second of wall clock: a full deal takes ~2.5s. */
const DEAL_RATE = 800

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

const fmtSignedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString()}%`
const fmtSignedPts = (v: number) => {
  const r = Math.round(v)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)} pts`
}

function ReturnBars({
  ticket,
  sp,
  pickLabel = 'your pick',
}: {
  ticket: { r1: number; r5: number; r10: number }
  sp: { r1: number; r5: number; r10: number }
  pickLabel?: string
}) {
  const rows = [
    { h: '1 year', s: ticket.r1, m: sp.r1 },
    { h: '5 years', s: ticket.r5, m: sp.r5 },
    { h: '10 years', s: ticket.r10, m: sp.r10 },
  ]
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.s), Math.abs(r.m)]), 50)
  const barW = (v: number) => Math.max(2, (Math.abs(v) / maxAbs) * 100)

  return (
    <div className={styles.returnRows}>
      {rows.map((r) => {
        const beat = r.s > r.m
        return (
          <div key={r.h}>
            <div className={styles.returnHead}>
              <span className={styles.returnHorizon}>{r.h}</span>
              <span className={styles.returnVerdict} style={{ color: beat ? GREEN : RED }}>
                {beat ? 'beat the index' : 'lost to the index'}
              </span>
            </div>
            {[
              { label: pickLabel, v: r.s, color: r.s >= 0 ? GREEN : RED, bold: true },
              { label: 'S&P 500', v: r.m, color: SLATE, bold: false },
            ].map((b) => (
              <div key={b.label} className={styles.returnBarRow}>
                <span className={styles.returnBarLabel}>{b.label}</span>
                <div className={styles.returnBarTrack}>
                  <div
                    className={styles.returnBarFill}
                    style={{ width: `${barW(b.v)}%`, background: b.color, opacity: b.bold ? 1 : 0.45 }}
                  />
                </div>
                <span className={`${styles.returnBarValue} tnum`} style={{ color: b.color }}>
                  {fmtSignedPct(b.v)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function StockPicker() {
  const [year, setYear] = useState(2000)
  const [pick, setPick] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [basketSize, setBasketSize] = useState(1)
  const [draw, setDraw] = useState(0)
  const board = REAL_BOARDS[year]!
  const stocks = board.stocks
  const sp = board.sp
  const committed = pick !== null
  const beat = stocks.filter((s) => (s.r10 ?? -100) > sp.r10).length
  const r10s = useMemo(() => stocks.map((s) => s.r10 ?? -100), [stocks])
  /* What a growing basket converges to: the board held in equal amounts. */
  const boardMean = r10s.reduce((a, b) => a + b, 0) / r10s.length
  const sortedR10 = [...r10s].sort((a, b) => a - b)
  const medianR10 = sortedR10[Math.floor(sortedR10.length / 2)]!
  const best = Math.max(...sortedR10)

  /* Part two: the same $1,000 spread across a basket of tickets. The first
   * CURVE_MAX tickets are drawn once per (pick, draw), so growing the basket
   * adds tickets instead of reshuffling the ones already held. */
  const fullDraw = useMemo(
    () => (pick === null ? [] : drawBasket(stocks.length, BASKET_POOL, pick, year * 1000003 + pick * 101 + draw * 7919)),
    [stocks.length, pick, year, draw]
  )
  const basket = fullDraw.slice(0, basketSize)
  const basketSet = new Set(basket)
  const rawBasketAvg = (key: 'r1' | 'r5' | 'r10') =>
    basket.reduce((sum, i) => sum + (stocks[i]![key] ?? -100), 0) / Math.max(1, basket.length)
  const basketAvg = (key: 'r1' | 'r5' | 'r10') => Math.round(rawBasketAvg(key))
  const basketR10 = basketAvg('r10')

  /* How far a set of returns strays from the market: the average absolute
   * gap against the index at the 1, 5, and 10-year marks, in points. This
   * is the number the chart draws; it falls toward zero as tickets are
   * added while the market's own path stays exactly as risky as ever. */
  const strayFrom = (r1: number, r5: number, r10: number) =>
    (Math.abs(r1 - sp.r1) + Math.abs(r5 - sp.r5) + Math.abs(r10 - sp.r10)) / 3
  const basketStray = strayFrom(rawBasketAvg('r1'), rawBasketAvg('r5'), rawBasketAvg('r10'))
  /* Signed gaps, basket minus market: positive means ahead at that mark. */
  const gaps = [
    { h: '1 yr', v: rawBasketAvg('r1') - sp.r1 },
    { h: '5 yr', v: rawBasketAvg('r5') - sp.r5 },
    { h: '10 yr', v: rawBasketAvg('r10') - sp.r10 },
  ]
  const allStrays = stocks
    .map((s) => strayFrom(s.r1 ?? -100, s.r5 ?? -100, s.r10 ?? -100))
    .sort((a, b) => a - b)
  const typicalStray = allStrays[Math.floor(allStrays.length / 2)]!

  /* Part three: deal random baskets of one or two chosen sizes, live.
   * The full samples are computed up front (so bins and axes hold still);
   * the animation just reveals them in draw order, DEAL_STEP per tick. */
  const [sizeA, setSizeA] = useState(5)
  const [sizeB, setSizeB] = useState<number | null>(25)
  const [dealt, setDealt] = useState(0)
  const [dealing, setDealing] = useState(false)
  const [dealSeed, setDealSeed] = useState(0)
  const pileA = useMemo(
    () => sampleBasketReturns(r10s, sizeA, SIM_DRAWS, year * 131 + sizeA * 7 + dealSeed * 1009),
    [r10s, year, sizeA, dealSeed]
  )
  const pileB = useMemo(
    () => (sizeB === null ? null : sampleBasketReturns(r10s, sizeB, SIM_DRAWS, year * 131 + sizeB * 7 + dealSeed * 1009 + 1)),
    [r10s, year, sizeB, dealSeed]
  )
  /* Fresh samples (new size, year, or reseed) empty the table for a new deal. */
  useEffect(() => {
    setDealt(0)
  }, [pileA, pileB])
  /* Wall-clock pacing: dropped frames skip ahead instead of stretching
   * the deal, so it lasts the same ~2.5s on any machine. Fresh piles
   * mid-deal restart the clock along with the count. */
  useEffect(() => {
    if (!dealing) return
    const started = performance.now()
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - started) / 1000
      setDealt(Math.min(SIM_DRAWS, Math.round(elapsed * DEAL_RATE)))
    }, 1000 / 30)
    return () => window.clearInterval(id)
  }, [dealing, pileA, pileB])
  useEffect(() => {
    if (dealing && dealt >= SIM_DRAWS) setDealing(false)
  }, [dealing, dealt])

  const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]!
  const pileStats = (pile: number[]) => {
    const s = pile.slice(0, dealt).sort((a, b) => a - b)
    const mean = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)
    return { mean, p10: q(s, 0.1), p90: q(s, 0.9), span: q(s, 0.9) - q(s, 0.1) }
  }
  const statsA = dealt > 0 ? pileStats(pileA) : null
  const statsB = dealt > 0 && pileB ? pileStats(pileB) : null

  /* The decade as a path: $1,000 at purchase and at the real 1, 5, and
   * 10-year marks, for each ticket alone, the basket, and the index. */
  const PATH_YEARS = [0, 1, 5, 10]
  const pathOf = (rs: { r1: number | null; r5: number | null; r10: number | null }) =>
    [0, rs.r1 ?? -100, rs.r5 ?? -100, rs.r10 ?? -100].map((r) => 1000 * (1 + r / 100))
  const ticketPaths = basket.map((i) => pathOf(stocks[i]!))
  const basketPath = PATH_YEARS.map((_, t) => ticketPaths.reduce((s, p) => s + p[t]!, 0) / Math.max(1, ticketPaths.length))
  const spPath = pathOf(sp)

  /* Reset synchronously with the year switch so a committed ticket never
   * shows the new board's company for a frame under the old ticket number. */
  const changeYear = (y: number) => {
    setYear(y)
    setPick(null)
    setRevealed(false)
    setBasketSize(1)
    setDraw(0)
  }

  return (
    <div>
      <div className={styles.pickerHeader}>
        <SegmentedControl
          label="It is January of"
          options={Object.keys(REAL_BOARDS).map((y) => ({ value: y, label: y }))}
          value={String(year)}
          onChange={(y) => changeYear(Number(y))}
        />
        <p className={styles.pickerNote}>{board.note}</p>
      </div>

      <p className={styles.stationLede}>
        The board holds the <strong>100 largest US companies of that January, ranked by market
        cap</strong>, with no names shown. Choose one ticket and commit $1,000 to it, then compare
        its next decade against the index. These are real companies and their real returns.
      </p>

      <div className={styles.indexStrip}>
        <span className={styles.indexStripLabel}>The index (S&amp;P 500) from January {year}:</span>
        {[
          { h: '1 year', v: sp.r1 },
          { h: '5 years', v: sp.r5 },
          { h: '10 years', v: sp.r10 },
        ].map((r) => (
          <span key={r.h} className={styles.indexStripItem}>
            {r.h}{' '}
            <strong className="tnum" style={{ color: r.v >= 0 ? GREEN : RED }}>
              {fmtSignedPct(r.v)}
            </strong>
          </span>
        ))}
      </div>

      <div className={styles.stationGrid}>
        <div className={styles.boardCol}>
          <div className={styles.board}>
            {stocks.map((s, i) => {
              const selected = pick === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!committed) {
                      setPick(i)
                      setRevealed(false)
                    }
                  }}
                  title={committed ? undefined : `#${i + 1} · $${s.cap}B`}
                  className={[
                    styles.ticket,
                    selected ? styles.ticketSelected : '',
                    committed && !selected
                      ? basketSize > 1 && basketSet.has(i)
                        ? styles.ticketInBasket
                        : styles.ticketDimmed
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className={styles.boardScale}>
            <span>#1 · largest (${stocks[0]!.cap}B)</span>
            <span>#{stocks.length} · smallest (${stocks[stocks.length - 1]!.cap}B)</span>
          </div>
        </div>

        <div className={styles.resultCol}>
          {!committed ? (
            <div className={styles.pickPrompt}>
              Select a ticket to commit. The board then reveals how your pick performed against the
              index over the following decade, and how many of the 100 beat it.
            </div>
          ) : (
            <Card tone="raised" className={styles.pickResult}>
              <p className={styles.pickResultTitle}>
                Ticket <span className={styles.pickResultNumber}>#{pick! + 1}</span> ($
                {stocks[pick!]!.cap}B), bought January {year}
              </p>
              <ReturnBars
                ticket={{ r1: stocks[pick!]!.r1 ?? -100, r5: stocks[pick!]!.r5 ?? -100, r10: stocks[pick!]!.r10 ?? -100 }}
                sp={sp}
              />
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  setPick(null)
                  setRevealed(false)
                  setBasketSize(1)
                  setDraw(0)
                }}
              >
                Pick a different ticket
              </Button>
            </Card>
          )}
        </div>
      </div>

      {committed && (
        <>
          <div className={styles.stats}>
            <Stat
              label="Tickets that beat the index (10 yr)"
              value={beat}
              format={(v) => `${Math.round(v)} of ${stocks.length}`}
              accentColor={beat < stocks.length / 2 ? RED : GREEN}
              animate={false}
            />
            <Stat
              label="Typical ticket (10 yr)"
              value={medianR10}
              format={fmtSignedPct}
              accentColor={medianR10 < sp.r10 ? RED : GREEN}
              animate={false}
            />
            <Stat label="Best ticket on the board (10 yr)" value={best} format={fmtSignedPct} accentColor={GREEN} animate={false} />
          </div>
          <Callout tone="mark" label="Most stocks trail their own index">
            The index's average return is pulled up by a small number of extreme winners, so the
            typical individual stock underperforms the index over a decade even while the market as a
            whole gains. A single pick usually misses the winners; holding the index guarantees owning
            them, whichever stocks they turn out to be.
          </Callout>
          {!revealed ? (
            <Button variant="quiet" size="sm" onClick={() => setRevealed(true)}>
              So which company was it?
            </Button>
          ) : (
            <Callout tone="note" label={`Ticket #${pick! + 1} was ${stocks[pick!]!.name}`}>
              {stocks[pick!]!.fate ??
                `${stocks[pick!]!.name} stayed listed through the whole window; the bars above are its actual price returns, dividends excluded.`}
            </Callout>
          )}

          <div className={styles.basketSection}>
            <h3 className={styles.basketTitle}>Part two: spreading the same $1,000 across more tickets</h3>
            <p className={styles.stationLede}>
              Keep ticket #{pick! + 1} and split the $1,000 equally across extra tickets drawn at
              random, highlighted on the board above. As the basket grows from 1 ticket to 25,
              each ticket is as volatile as before, but their average moves more and more like the
              market.
            </p>

            <div className={styles.basketRow}>
              <SegmentedControl
                label="Tickets in the basket"
                options={BASKET_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(basketSize)}
                onChange={(v) => setBasketSize(Number(v))}
              />
              {basketSize > 1 && (
                <Button variant="quiet" size="sm" onClick={() => setDraw((d) => d + 1)}>
                  Draw different extra tickets
                </Button>
              )}
            </div>

            <StationChart
              x={PATH_YEARS}
              lines={[
                ...ticketPaths.map((ys) => ({ ys, color: SLATE, width: 1.25, opacity: 0.35 })),
                { ys: spPath, color: RED, width: 2.5, dashed: true, label: 'S&P 500' },
                { ys: basketPath, color: GREEN, width: 3, label: `your basket of ${basketSize}` },
              ]}
              yMax={Math.max(...basketPath, ...spPath) * 1.35}
              yRef={1000}
              refLabel="the $1,000"
              xTickFormat={(v) => (v === 0 ? 'buy' : `${v} yr`)}
              xHoverLabel={(v) => (v === 0 ? 'At purchase, January ' + year : `After ${v} year${v === 1 ? '' : 's'}`)}
              caption={`Your $1,000 from January ${year}: ${
                basketSize === 1
                  ? `all of it on ticket #${pick! + 1}`
                  : `$${(1000 / basketSize).toLocaleString(undefined, { maximumFractionDigits: 0 })} on ticket #${pick! + 1} and on each of ${basketSize - 1} random tickets`
              }, held for the real decade. Thin grey lines: each ticket in the basket on its own, scaled to the full $1,000. Green: your basket, the average of the thin lines. Dashed red: the same $1,000 in the S&P 500. Segments connect the measured 1, 5, and 10-year marks; tickets that left the chart's top kept their gains. Adding tickets leaves each grey line unchanged and smooths only their average.`}
              ariaLabel={`Value of $1,000 over ten years from January ${year}: each ticket in the basket, the basket itself, and the S&P 500`}
              exportStats={[
                { label: 'Tickets held', value: `${basketSize}` },
                { label: 'Basket 10-yr return', value: fmtSignedPct(basketR10), color: basketR10 >= sp.r10 ? GREEN : RED },
                { label: 'Market 10-yr return', value: fmtSignedPct(sp.r10) },
                ...gaps.map((g) => ({
                  label: `Basket minus market, ${g.h}`,
                  value: fmtSignedPts(g.v),
                  color: g.v >= 0 ? GREEN : RED,
                })),
              ]}
            />

            <div className={styles.compareTable}>
              <span />
              {['1 year', '5 years', '10 years'].map((h) => (
                <span key={h} className={styles.compareHead}>
                  {h}
                </span>
              ))}

              <span className={styles.compareLabel}>Your basket of {basketSize}</span>
              {(['r1', 'r5', 'r10'] as const).map((k) => {
                const v = basketAvg(k)
                return (
                  <span key={k} className={`${styles.compareValue} tnum`} style={{ color: v >= 0 ? GREEN : RED }}>
                    {fmtSignedPct(v)}
                  </span>
                )
              })}

              <span className={styles.compareLabel}>The market (S&amp;P 500)</span>
              {[sp.r1, sp.r5, sp.r10].map((v, i) => (
                <span key={i} className={`${styles.compareValue} tnum`} style={{ color: SLATE }}>
                  {fmtSignedPct(v)}
                </span>
              ))}

              <span className={styles.compareRule} />

              <span className={styles.compareLabel}>Difference</span>
              {gaps.map((g) => {
                const r = Math.round(g.v)
                return (
                  <span key={g.h} className={`${styles.compareValue} tnum`} style={{ color: g.v >= 0 ? GREEN : RED }}>
                    {`${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}`}
                  </span>
                )
              })}
            </div>
            <p className={styles.compareNote}>
              Difference is your basket minus the market at each mark, in percentage points; a
              single ticket on this board typically strays {Math.round(typicalStray)} points from
              the market&rsquo;s path.
            </p>

            <Callout tone="mark" label="More tickets make the basket move like the market">
              Each company&rsquo;s good and bad years are mostly its own, so across many tickets
              they partly cancel: a single ticket on this board typically strays{' '}
              {Math.round(typicalStray)} points from the market&rsquo;s path, while your basket of{' '}
              {basketSize} strays {Math.round(basketStray)}. The averaging does not raise the
              expected return; it narrows the range of outcomes around it. It also has a limit. A
              typical large-cap stock&rsquo;s annual return has a standard deviation near 40%, and
              the S&amp;P 500&rsquo;s is still near 20%; that shared movement is systematic risk,
              which diversification cannot remove.
            </Callout>
          </div>

          <div className={styles.basketSection}>
            <h3 className={styles.basketTitle}>
              Part three: repeating the draw {SIM_DRAWS.toLocaleString()} times
            </h3>
            <p className={styles.stationLede}>
              Your basket above is a single draw, and one draw can be lucky. To see whether the
              pattern holds in general, choose one or two basket sizes and deal{' '}
              {SIM_DRAWS.toLocaleString()} random baskets of each from this board; the chart
              records where every one of them lands after ten years.
            </p>

            <div className={styles.basketRow}>
              <SegmentedControl
                label="First basket size"
                options={SIM_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(sizeA)}
                onChange={(v) => setSizeA(Number(v))}
              />
              <SegmentedControl
                label="Second basket size"
                options={[
                  { value: 'none', label: 'none' },
                  ...SIM_SIZES.map((n) => ({ value: String(n), label: String(n) })),
                ]}
                value={sizeB === null ? 'none' : String(sizeB)}
                onChange={(v) => setSizeB(v === 'none' ? null : Number(v))}
              />
              <Button
                disabled={dealing}
                onClick={() => {
                  if (dealt >= SIM_DRAWS) setDealSeed((s) => s + 1)
                  setDealing(true)
                }}
              >
                {dealing
                  ? `Dealing… ${dealt.toLocaleString()} of ${SIM_DRAWS.toLocaleString()}`
                  : dealt >= SIM_DRAWS
                    ? 'Deal a fresh set'
                    : 'Deal the baskets'}
              </Button>
            </div>

            <BasketHistogram
              a={{ size: sizeA, all: pileA, shown: dealt }}
              b={pileB ? { size: sizeB!, all: pileB, shown: dealt } : undefined}
              market={sp.r10}
              exportStats={[
                { label: 'Baskets dealt', value: `${dealt.toLocaleString()} of each size` },
                ...(statsA
                  ? [
                      {
                        label: `Baskets of ${sizeA}: average / spread`,
                        value: `${fmtSignedPct(Math.round(statsA.mean))} / ${Math.round(statsA.span)} pts`,
                        color: pileB ? SLATE : GREEN,
                      },
                    ]
                  : []),
                ...(statsB
                  ? [
                      {
                        label: `Baskets of ${sizeB}: average / spread`,
                        value: `${fmtSignedPct(Math.round(statsB.mean))} / ${Math.round(statsB.span)} pts`,
                        color: GREEN,
                      },
                    ]
                  : []),
                { label: 'The market (10 yr)', value: fmtSignedPct(sp.r10), color: RED },
              ]}
              caption={`${SIM_DRAWS.toLocaleString()} random baskets of ${sizeA}${
                pileB ? ` (wide grey bars) and ${SIM_DRAWS.toLocaleString()} random baskets of ${sizeB} (narrow green bars)` : ' (green bars)'
              } from the January ${year} board, sorted into bins by 10-year return; the dashed line is the market's own result. ${
                dealt === 0
                  ? 'Every basket draws from the same 100 tickets. Deal to start.'
                  : dealt < SIM_DRAWS
                    ? `${dealt.toLocaleString()} of ${SIM_DRAWS.toLocaleString()} dealt so far.`
                    : 'Every basket draws from the same 100 tickets.'
              }`}
            />

            {statsA && (
              <>
                <div className={styles.simTable}>
                  <span />
                  <span className={styles.compareHead}>average (10 yr)</span>
                  <span className={styles.compareHead}>middle 80% land between</span>
                  <span className={styles.compareHead}>spread</span>

                  {[
                    { label: `Baskets of ${sizeA}`, s: statsA },
                    ...(statsB ? [{ label: `Baskets of ${sizeB}`, s: statsB }] : []),
                  ].map(({ label, s }) => (
                    <Fragment key={label}>
                      <span className={styles.compareLabel}>{label}</span>
                      <span
                        className={`${styles.compareValue} tnum`}
                        style={{ color: s.mean >= 0 ? GREEN : RED }}
                      >
                        {fmtSignedPct(Math.round(s.mean))}
                      </span>
                      <span className={`${styles.compareValueSm} tnum`}>
                        {fmtSignedPct(Math.round(s.p10))} to {fmtSignedPct(Math.round(s.p90))}
                      </span>
                      <span className={`${styles.compareValueSm} tnum`}>{Math.round(s.span)} pts</span>
                    </Fragment>
                  ))}

                  <span className={styles.compareRule} />

                  <span className={styles.compareLabel}>All 100 tickets, equal amounts</span>
                  <span className={`${styles.compareValue} tnum`} style={{ color: SLATE }}>
                    {fmtSignedPct(Math.round(boardMean))}
                  </span>
                  <span className={styles.compareValueSm}>one result</span>
                  <span className={`${styles.compareValueSm} tnum`}>0 pts</span>

                  <span className={styles.compareLabel}>The market (S&amp;P 500)</span>
                  <span className={`${styles.compareValue} tnum`} style={{ color: SLATE }}>
                    {fmtSignedPct(sp.r10)}
                  </span>
                  <span className={styles.compareValueSm}>one result</span>
                  <span className={`${styles.compareValueSm} tnum`}>0 pts</span>
                </div>
                <p className={styles.compareNote}>
                  Every basket size averages close to the 100-ticket row, and adding tickets does
                  not raise that average. It narrows the spread around it
                  {statsB && sizeA !== sizeB && Math.min(statsA.span, statsB.span) > 0
                    ? `: the ${statsA.span >= statsB.span ? sizeA : sizeB}-ticket baskets spread ${(
                        Math.max(statsA.span, statsB.span) / Math.min(statsA.span, statsB.span)
                      ).toFixed(1)} times as wide`
                    : ''}
                  . The bottom two rows have no spread because each is one fixed portfolio. They
                  can differ from each other: the S&amp;P 500 weights the largest companies most
                  heavily and holds 500 of them, so it runs ahead of an equal split when the
                  giants lead the decade and behind it when they lag.
                </p>
              </>
            )}

            <Callout tone="mark" label="The spread depends on how many tickets, not which ones">
              Every basket draws from the same board, so the piles differ only in how many tickets
              each basket holds. With fewer tickets the outcomes range widely; with more they
              concentrate near the board&rsquo;s average, close to the market&rsquo;s result. The
              concentration has a limit: the stocks on this board move together with the market,
              and that shared movement, systematic risk, does not diversify away.
            </Callout>
            <Callout tone="note" label="A broad fund holds every ticket at once">
              Holding 25 individual stocks takes effort to assemble and maintain, and it still
              covers only a quarter of this board. One share of a broad index fund or ETF holds
              every company here plus hundreds of smaller ones, at a cost of a few cents per year
              on $1,000. A fund is the standard way to get the diversification shown above.
            </Callout>
          </div>
        </>
      )}

      <p className={styles.footnote}>
        Real data: the 100 largest US-listed companies by market capitalization in January of each
        year (list sources: Vanguard 500 Index holdings 12/31/1994 via SEC EDGAR; period market-cap
        tables; FT Global 500; ranks below the top 30 are approximate). Returns are actual price
        returns, splits adjusted, dividends excluded on both the stocks and the index. Bankrupt
        companies go to zero; cash buyouts freeze at the deal price; stock mergers track the
        acquirer; major spinoffs are counted. Figures are approximate (within about 10%). The
        stray-from-market figure in part two is the average absolute gap between a holding&rsquo;s
        cumulative return and the index&rsquo;s at the measured 1, 5, and 10-year marks.
      </p>
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function StockPickerPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Gambling vs. investing</p>
          <h1 className={styles.h1}>Stock Diversifier</h1>
          <p className={styles.lead}>
            Picking a single stock is ownership, not a bet: the company earns money and some of it is
            yours. But owning one company still leaves a lot to chance. Commit $1,000 to one ticket
            from a real January and see its actual decade; most single picks trail their index,
            because a few extreme winners carry the whole market. Then spread the same $1,000 across
            more tickets and see how the basket comes to track the index.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <StockPicker />
      </Card>
    </div>
  )
}
