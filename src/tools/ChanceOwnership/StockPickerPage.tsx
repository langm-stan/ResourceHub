import { useMemo, useState } from 'react'
import { Button, Callout, Card, SegmentedControl, Stat } from '../../design-system'
import { REAL_BOARDS } from './realBoards'
import { drawBasket } from './compute'
import { StationChart } from './components/StationChart'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Stock Picker (formerly the middle station of Chance & Ownership):
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

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

const fmtSignedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString()}%`

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
  const allStrays = stocks
    .map((s) => strayFrom(s.r1 ?? -100, s.r5 ?? -100, s.r10 ?? -100))
    .sort((a, b) => a - b)
  const typicalStray = allStrays[Math.floor(allStrays.length / 2)]!

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
              In lecture, splitting one dollar across more coin flips made the extreme outcomes
              rare without changing the average. This board plays the same game with real
              companies: keep ticket #{pick! + 1} and split the $1,000 equally across extra
              tickets drawn at random, highlighted on the board above. Watch the chart as the
              basket grows from 1 ticket to 25: the individual tickets stay as wild as ever, but
              their average starts to move like the market itself.
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
              }, held for the real decade. Thin grey lines: each ticket in the basket on its own, scaled to the full $1,000. Green: your basket, the average of the thin lines. Dashed red: the same $1,000 in the S&P 500. Segments connect the measured 1, 5, and 10-year marks; tickets that left the chart's top kept their gains. More tickets do not tame the thin lines, they tame the average.`}
              ariaLabel={`Value of $1,000 over ten years from January ${year}: each ticket in the basket, the basket itself, and the S&P 500`}
              exportStats={[
                { label: 'Tickets held', value: `${basketSize}` },
                { label: 'Basket 10-yr return', value: fmtSignedPct(basketR10), color: basketR10 >= sp.r10 ? GREEN : RED },
                { label: 'Market 10-yr return', value: fmtSignedPct(sp.r10) },
                { label: 'Strays from the market by', value: `${Math.round(basketStray)} pts`, color: GREEN },
              ]}
            />

            <div className={styles.stats}>
              <Stat
                label={`Your basket of ${basketSize} returned (10 yr)`}
                value={basketR10}
                format={(v) => fmtSignedPct(Math.round(v))}
                emphasis
                accentColor={basketR10 >= sp.r10 ? GREEN : RED}
                animate={false}
                note={basketSize === 1 ? 'the whole $1,000 on one ticket' : 'equal dollars in every ticket'}
              />
              <Stat
                label="The market (S&P 500) returned (10 yr)"
                value={sp.r10}
                format={fmtSignedPct}
                emphasis
                accentColor={sp.r10 >= 0 ? GREEN : RED}
                animate={false}
                note="the benchmark the basket is settling onto"
              />
              <Stat
                label="Your basket strays from the market by"
                value={basketStray}
                format={(v) => `${Math.round(v)} pts`}
                animate={false}
                note={`average gap at the 1, 5, and 10-year marks; a single ticket here typically strays ${Math.round(typicalStray)} pts`}
              />
            </div>

            <Callout tone="mark" label="More tickets make the basket move like the market">
              Each extra ticket is another company whose good and bad luck is mostly its own, so
              the swings cancel, just as the coin game predicted: a single ticket on this board
              typically strays {Math.round(typicalStray)} points from the market&rsquo;s path, and
              your basket of {basketSize} strays {Math.round(basketStray)}. Notice what the
              cancelling did not do: it never promised a better return than the market, only the
              market&rsquo;s return with less luck involved. And the destination is the market
              itself, not safety. In the lecture&rsquo;s numbers, one large-cap stock swings about
              40% in a typical year while the whole market still swings about 20%; that remaining
              swing is systematic risk, and no number of tickets removes it.
            </Callout>
            <Callout tone="note" label="A broad fund holds every ticket at once">
              Assembling 25 tickets by hand is a chore, and the basket above still covers only a
              quarter of the board. One share of a broad index fund or ETF holds every company
              here plus hundreds of smaller ones, for a fee of pennies per year on $1,000. The
              spreading you just did by clicking is what the fund does automatically, which is why
              the advice lands on funds rather than on picking more tickets.
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
          <h1 className={styles.h1}>Stock Picker</h1>
          <p className={styles.lead}>
            Picking a single stock is ownership, not a bet: the company earns money and some of it is
            yours. But owning one company is a gamble of a different kind. Commit to one ticket from a
            real January and watch its actual decade. Most single picks trail the index they belong
            to, because a few extreme winners carry the whole market. Then spread the same $1,000
            across more tickets and watch the extreme outcomes cancel out.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <StockPicker />
      </Card>
    </div>
  )
}
