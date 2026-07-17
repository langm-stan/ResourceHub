import { useState } from 'react'
import { Button, Callout, Card, SegmentedControl, Stat } from '../../design-system'
import { REAL_BOARDS } from './realBoards'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Stock Picker (formerly the middle station of Chance & Ownership):
 * commit $1,000 to one of the 100 largest US companies of a real January,
 * then see its actual decade against the index. Most single picks trail.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const SLATE = 'var(--c-series-3)'

const fmtSignedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString()}%`

function ReturnBars({ ticket, sp }: { ticket: { r1: number; r5: number; r10: number }; sp: { r1: number; r5: number; r10: number } }) {
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
              { label: 'your pick', v: r.s, color: r.s >= 0 ? GREEN : RED, bold: true },
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
  const board = REAL_BOARDS[year]!
  const stocks = board.stocks
  const sp = board.sp
  const committed = pick !== null
  const beat = stocks.filter((s) => (s.r10 ?? -100) > sp.r10).length
  const sortedR10 = stocks.map((s) => s.r10 ?? -100).sort((a, b) => a - b)
  const medianR10 = sortedR10[Math.floor(sortedR10.length / 2)]!
  const best = Math.max(...sortedR10)

  /* Reset synchronously with the year switch so a committed ticket never
   * shows the new board's company for a frame under the old ticket number. */
  const changeYear = (y: number) => {
    setYear(y)
    setPick(null)
    setRevealed(false)
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
                    committed && !selected ? styles.ticketDimmed : '',
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
        </>
      )}

      <p className={styles.footnote}>
        Real data: the 100 largest US-listed companies by market capitalization in January of each
        year (list sources: Vanguard 500 Index holdings 12/31/1994 via SEC EDGAR; period market-cap
        tables; FT Global 500; ranks below the top 30 are approximate). Returns are actual price
        returns, splits adjusted, dividends excluded on both the stocks and the index. Bankrupt
        companies go to zero; cash buyouts freeze at the deal price; stock mergers track the
        acquirer; major spinoffs are counted. Figures are approximate (within about 10%).
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
            to, because a few extreme winners carry the whole market.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <StockPicker />
      </Card>
    </div>
  )
}
