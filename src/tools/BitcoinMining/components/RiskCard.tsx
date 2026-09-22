import { useMemo } from 'react'
import { Callout, Card, Stat, StepHeader } from '../../../design-system'
import { formatPercent } from '../../../lib/format'
import { bitcoinRisk } from '../riskCompute'
import { SOURCE } from '../marketData'
import { UnderwaterChart } from './UnderwaterChart'
import styles from '../BitcoinMining.module.css'

/*
 * What holding bitcoin has been like, before the mining simulation asks a
 * reader to go and produce some.
 *
 * Every number is computed from the committed FRED series, so refreshing the
 * data moves the page. Nothing here is typed in.
 */

const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`

const iso = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function RiskCard() {
  const r = useMemo(() => bitcoinRisk(), [])
  const fiveBtc = r.bigDays[0]!.btc
  const fiveSpx = r.bigDays[0]!.spx
  const tenBtc = r.bigDays[1]!.btc
  const worst = r.worstDrawdowns[0]!

  return (
    <Card tone="raised">
      {/*
        What the thing does, before what it costs.
        A price chart invites a reader to treat the price as evidence that
        something works. Bitcoin's function is narrow and worth stating
        plainly, and it is a separate question from what anyone will pay.
      */}
      <StepHeader title="What bitcoin does" />
      <div className={styles.definition}>
        <p>
          Bitcoin lets one person send bitcoin to another without a bank in the middle, in a way
          nobody can forge and nobody can reverse. That is the whole of the function. It is not a
          share of a company, a claim on anyone&rsquo;s profits, or a promise from anyone to pay
          you back.
        </p>
        <p>
          So the price below is not a measure of how well it works. It is what people were willing
          to pay on each day, which is a different question from whether the thing does its job.
        </p>
        <p>
          <strong>Nobody issues bitcoin.</strong> New bitcoin appears only as the payment to
          whoever adds the next block to the record, and that payment halves about every four
          years until it stops, at 21 million. Mining is the only thing that changes how much
          bitcoin exists, and it is what the next tab does.
        </p>
      </div>

      <StepHeader
        title="Price history and volatility"
        hint={`Daily prices, ${iso(r.first.date)} to ${iso(r.last.date)}. The S&P 500 comparison starts ${iso(r.windowStart)}, where the records overlap.`}
      />

      <div className={styles.riskStats}>
        <Stat
          label="Bitcoin, annual volatility"
          value={r.btcVol}
          format={(v) => formatPercent(v, 0)}
          emphasis
          accentColor="var(--c-accent)"
        />
        <Stat
          label="S&P 500, annual volatility"
          value={r.spxVol}
          format={(v) => formatPercent(v, 0)}
          accentColor="var(--c-series-1)"
        />
        <Stat
          label="Deepest fall"
          value={worst.depth}
          format={(v) => formatPercent(v, 0)}
          accentColor="var(--c-accent)"
        />
      </div>

      <p className={styles.riskLead}>
        Bitcoin&rsquo;s price has moved about{' '}
        <strong>{r.volRatio.toFixed(1)} times</strong> as much as the S&amp;P 500 from one day to
        the next. It moved more than 5% on <strong>{formatPercent(fiveBtc, 0)}</strong> of days,
        against <strong>{formatPercent(fiveSpx, 1)}</strong> for the S&amp;P, and more than 10% on{' '}
        <strong>{formatPercent(tenBtc, 0)}</strong> of them.
      </p>

      <UnderwaterChart
        caption={`How far bitcoin sat below its own previous high, each day since ${r.first.date.getUTCFullYear()}. Zero means a new high; everything below is time spent under the previous one.`}
        exportStats={[
          { label: 'Deepest fall', value: formatPercent(worst.depth, 0), color: 'var(--c-accent)' },
          {
            label: 'Back to even',
            value: worst.recoveryDays ? `${(worst.recoveryDays / 365).toFixed(1)} years` : 'not yet',
          },
        ]}
      />

      <h3 className={styles.riskSubhead}>$10,000 bought at a top</h3>
      <p className={styles.riskNote}>
        The two all-time highs in the record, and what a purchase at each was worth afterwards.
      </p>
      <table className={styles.riskTable}>
        <thead>
          <tr>
            <th scope="col">Bought</th>
            <th scope="col">Price</th>
            <th scope="col">Value at purchase</th>
            {r.topBuys[0]?.after.map((a) => (
              <th key={a.years} scope="col">
                After {a.years} year{a.years === 1 ? '' : 's'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {r.topBuys.map((b) => (
            <tr key={b.peakDate.toISOString()}>
              <td>{iso(b.peakDate)}</td>
              <td className={styles.riskPlain}>{usd(b.peakPrice)}</td>
              <td className={styles.riskPlain}>{usd(b.stake)}</td>
              {b.after.map((a) => (
                <td key={a.years} className={a.value < 10_000 ? undefined : styles.riskPlain}>
                  {usd(a.value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.riskNote}>
        A buyer at the December 2017 high was down to{' '}
        <strong>{usd(r.topBuys[0]!.after[0]!.value)}</strong> a year later and waited three years
        to get back to roughly what they put in. A buyer at the November 2021 high was at{' '}
        <strong>{usd(r.topBuys[1]!.after[0]!.value)}</strong> after a year. Neither lost the money
        permanently, and both spent years finding that out.
      </p>

      <h3 className={styles.riskSubhead}>The three deepest falls</h3>
      <table className={styles.riskTable}>
        <thead>
          <tr>
            <th scope="col">Fall</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Back to even</th>
          </tr>
        </thead>
        <tbody>
          {r.worstDrawdowns.map((d) => (
            <tr key={d.peakDate.toISOString()}>
              <td>{formatPercent(d.depth, 0)}</td>
              <td>{iso(d.peakDate)}</td>
              <td>{iso(d.troughDate)}</td>
              <td>
                {d.recoveredDate
                  ? `${iso(d.recoveredDate)} · ${(d.recoveryDays! / 365).toFixed(1)} years`
                  : 'not yet'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Callout tone="note" label="Best and worst twelve months">
        The best twelve months in the record returned{' '}
        <strong>{formatPercent(r.year.best.ret, 0)}</strong> ({iso(r.year.best.from.date)} to{' '}
        {iso(r.year.best.to.date)}). The worst returned{' '}
        <strong>{formatPercent(r.year.worst.ret, 0)}</strong> ({iso(r.year.worst.from.date)} to{' '}
        {iso(r.year.worst.to.date)}), starting the day the best one ended. Both are the same
        asset held for one year.
      </Callout>

      <p className={styles.riskSource}>
        Source: {SOURCE}. The record opens {iso(r.recordOpens)}, and bitcoin traded above $1,000
        the year before that, so falls are measured from all-time highs inside the record rather
        than from any earlier one.
      </p>
    </Card>
  )
}
