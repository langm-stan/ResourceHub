import { useMemo, useState } from 'react'
import { Callout, Card, Slider, Stat } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
import { CHEAP_FEE, DEFAULT_RETURN_PCT, buildFeeSeries } from './compute'
import { StationChart } from './components/StationChart'
import styles from './ChanceOwnershipPage.module.css'

/*
 * Index Fund Fees (formerly the last station of Chance & Ownership): the
 * same monthly habit in a fund that owns all 500 companies, with the
 * expense ratio as the only variable. An annual fee compounds against the
 * balance the way a return compounds for it.
 */

const RED = 'var(--c-accent)'
const GREEN = 'var(--c-series-1)'
const GOLD = 'var(--c-series-2)'

function IndexFund() {
  const [monthly, setMonthly] = useState(100)
  const [years, setYears] = useState(30)
  const [fee, setFee] = useState(1.0)
  const [ret, setRet] = useState(DEFAULT_RETURN_PCT)

  const series = useMemo(() => buildFeeSeries(monthly, years, fee, ret), [monthly, years, fee, ret])

  const contributed = monthly * 12 * years
  const cheapFinal = series.cheap[series.cheap.length - 1]!
  const costlyFinal = series.costly[series.costly.length - 1]!
  const yMax = cheapFinal * 1.1

  return (
    <div className={styles.stationGrid}>
      <div className={styles.controlsCol}>
        <p className={styles.stationLede}>
          The same monthly amount goes into a fund holding all 500 companies and compounds over
          decades. The remaining variable is the fund's <strong>expense ratio</strong>.
        </p>
        <Slider
          label="Invested per month"
          value={monthly}
          onChange={setMonthly}
          min={25}
          max={500}
          step={25}
          readout={formatUSDWhole(monthly)}
        />
        <Slider label="Years" value={years} onChange={setYears} min={10} max={45} step={1} readout={`${years}`} />
        <Slider
          label="Average yearly return"
          value={ret}
          onChange={setRet}
          min={3}
          max={12}
          step={0.5}
          readout={`${ret.toFixed(1)}%`}
        />
        <Slider
          label="Fund expense ratio"
          value={fee}
          onChange={setFee}
          min={0.1}
          max={2}
          step={0.05}
          readout={`${fee.toFixed(2)}%`}
        />
        <div className={styles.statsColumn}>
          <Stat
            label={`Index ETF at ${CHEAP_FEE.toFixed(2)}%, after ${years} years`}
            value={cheapFinal}
            format={formatUSDWhole}
            accentColor={GREEN}
            emphasis
            animate={false}
          />
          <Stat label={`The same fund at ${fee.toFixed(2)}%`} value={costlyFinal} format={formatUSDWhole} animate={false} />
          <Stat
            label="Eaten by the higher fee"
            value={cheapFinal - costlyFinal}
            format={formatUSDWhole}
            accentColor={RED}
            animate={false}
          />
        </div>
      </div>
      <div className={styles.chartCol}>
        <div className={styles.legend}>
          <span style={{ color: GREEN }}>&#9632; {CHEAP_FEE.toFixed(2)}% expense ratio</span>
          <span style={{ color: GOLD }}>&#9632; {fee.toFixed(2)}% expense ratio</span>
          <span style={{ color: 'var(--text-muted)' }}>&#9476; total contributed</span>
        </div>
        <StationChart
          x={series.x}
          yMax={yMax}
          yRef={contributed}
          refLabel="total contributed"
          lines={[
            { ys: series.costly, color: GOLD, width: 2.5, label: `At ${fee.toFixed(2)}% expense ratio` },
            { ys: series.cheap, color: GREEN, width: 3, label: `At ${CHEAP_FEE.toFixed(2)}% expense ratio` },
          ]}
          extraHover={[{ label: 'Contributed so far', ys: series.x.map((t) => monthly * 12 * t) }]}
          xTickFormat={(v) => `${Math.round(v)} yr`}
          xHoverLabel={(v) => `Year ${Math.round(v)}`}
          figure="Figure 1."
          caption={`The same ${formatUSDWhole(monthly)} a month at a ${ret.toFixed(1)}% average yearly return, held steady for illustration. Real markets swing; the average only shows up if you stay in.`}
          ariaLabel="Growth of a monthly index fund habit at two expense ratios"
          exportStats={[
            { label: `At ${CHEAP_FEE.toFixed(2)}%`, value: formatUSDWhole(cheapFinal), color: GREEN },
            { label: `At ${fee.toFixed(2)}%`, value: formatUSDWhole(costlyFinal), color: GOLD },
            { label: 'Eaten by the higher fee', value: formatUSDWhole(cheapFinal - costlyFinal), color: RED },
          ]}
        />
        <Callout tone="mark" label="Fees compound like returns">
          Both lines hold the same asset for the same {years} years; only the expense ratio differs.
          An annual fee compounds against the balance the same way a return compounds for it, which is
          why the gap between the lines widens with time.
        </Callout>
      </div>
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function IndexFundFeesPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Investing</p>
          <h1 className={styles.h1}>Index Fund Fees</h1>
          <p className={styles.lead}>
            An index fund owns all 500 companies, so its return is the market's, no picking required.
            The one thing you still choose is what the fund charges to run it. That expense ratio
            looks like a rounding error each year, but it compounds against your balance exactly the
            way returns compound for it, and over decades the gap is enormous.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <IndexFund />
      </Card>
    </div>
  )
}
