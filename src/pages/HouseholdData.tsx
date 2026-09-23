import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { Callout, Card, Stat, Tabs, type TabItem } from '../design-system'
import {
  fetchedLabel,
  periodLabel,
  periodProse,
  type Frequency,
  type Obs,
} from '../data/household/compute'
import {
  BASE_YEAR,
  CAR,
  CAR_LOAN,
  CAR_MONTHS,
  CARD,
  CARD_BALANCE,
  CASH,
  DEBT_SERVICE,
  DELINQUENCY,
  GAS,
  HOME_PRICE,
  INCOME,
  INFLATION,
  MORTGAGE,
  PRICE_TO_INCOME,
  SAVING,
  SINCE_2000,
  SP500,
  SP_STAKE,
  STUDENT,
  TANK_GALLONS,
} from './household/model'
import { TimeChart } from './household/TimeChart'
import styles from './household/HouseholdData.module.css'

/*
 * Household Finance Data: what borrowing costs, what things cost, and what
 * households earn and save, from FRED.
 *
 * Every number and every date in the prose is computed from the series in
 * src/data/household/fredData.ts, which the deploy rewrites each night. The
 * sentences are written so they stay true whichever way the numbers move.
 */

/* ------------------------------ Formats ------------------------------ */

/* A true minus sign, which sits level with the digits; a hyphen does not. */
const signed = (text: string) => text.replace(/^-/, '\u2212')
const pct = (d: number) => (v: number) => signed(`${v.toFixed(d)}%`)
const pct1 = pct(1)
const pct2 = pct(2)
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`
const usd2 = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const trillions = (v: number) => `$${v.toFixed(2)}T`
const trillionsProse = (v: number) => `$${v.toFixed(2)} trillion`
const times = (v: number) => `${v.toFixed(1)}×`

/** Axis labels for dollar levels: $400K rather than $400,000. */
const usdAxis = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K` : `$${v}`

const label = (o: Obs, f: Frequency) => periodLabel(o.date, f)
const prose = (o: Obs, f: Frequency) => periodProse(o.date, f)
/* Weekly readings are named by month in prose; the week adds nothing. */
const month = (o: Obs) => periodProse(o.date, 'monthly')
const fullDate = (d: Date) => periodProse(d, 'weekly')

function fredLink(id: string) {
  return (
    <a
      href={`https://fred.stlouisfed.org/series/${id}`}
      target="_blank"
      rel="noreferrer"
      className={styles.fredLink}
    >
      {id}
    </a>
  )
}

/* --------------------------- Building blocks --------------------------- */

interface StatItem {
  label: string
  value: number
  format: (v: number) => string
  note?: string
}

/** The usual five: where it is, where it was, and the extremes. */
function standardStats(
  s: {
    latest: Obs
    yearAgo?: Obs
    tenYearsAgo?: Obs
    high: Obs
    low: Obs
  },
  f: Frequency,
  format: (v: number) => string,
): StatItem[] {
  const items: StatItem[] = [
    { label: 'Latest', value: s.latest.v, format, note: label(s.latest, f) },
  ]
  if (s.yearAgo)
    items.push({
      label: 'A year earlier',
      value: s.yearAgo.v,
      format,
      note: label(s.yearAgo, f),
    })
  if (s.tenYearsAgo)
    items.push({
      label: 'Ten years earlier',
      value: s.tenYearsAgo.v,
      format,
      note: label(s.tenYearsAgo, f),
    })
  items.push({
    label: 'Highest',
    value: s.high.v,
    format,
    note: label(s.high, f),
  })
  items.push({
    label: 'Lowest',
    value: s.low.v,
    format,
    note: label(s.low, f),
  })
  return items
}

function SeriesCard({
  id,
  title,
  description,
  stats,
  lead,
  wide = false,
  children,
}: {
  id: string
  title: string
  description: string
  stats: StatItem[]
  lead?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Card tone="raised" id={id} className={wide ? `${styles.card} ${styles.wide}` : styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>
      <div className={styles.stats}>
        {stats.map((s, i) => (
          <Stat
            key={s.label}
            label={s.label}
            value={s.value}
            format={s.format}
            note={s.note}
            accentColor={i === 0 ? 'var(--c-accent)' : undefined}
          />
        ))}
      </div>
      {lead && <p className={styles.lead}>{lead}</p>}
      {children}
    </Card>
  )
}

/* ------------------------------ Borrowing ------------------------------ */

function BorrowingTab() {
  const m = MORTGAGE
  const c = CARD
  const car = CAR
  const d = DELINQUENCY
  const st = STUDENT

  return (
    <div className={styles.grid}>
      <SeriesCard
        id="mortgage"
        wide
        title="30-year fixed mortgage rate"
        description="The average rate lenders offered on a 30-year fixed-rate mortgage, each week."
        stats={standardStats(m.stats, 'weekly', pct2)}
        lead={
          <>
            At <strong>{pct2(m.stats.latest.v)}</strong>, the monthly payment of principal and
            interest on the median new home ({usd(m.home.v)} in {prose(m.home, 'quarterly')}, with
            20% down) is <strong>{usd(m.payNow)}</strong>. At the {pct2(m.stats.low.v)} low in{' '}
            {month(m.stats.low)}, the same loan cost <strong>{usd(m.payLow)}</strong> a month. At
            the {pct2(m.stats.high.v)} high in {month(m.stats.high)}, it cost{' '}
            <strong>{usd(m.payHigh)}</strong>.
          </>
        }
      >
        <TimeChart
          figure="Figure 1."
          lines={[{ label: '30-year fixed', obs: m.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct2}
          periodOf={(date) => periodLabel(date, 'weekly')}
          ariaLabel="Average 30-year fixed mortgage rate, weekly since 1971"
          caption={
            <>
              Weekly, {label(m.obs[0]!, 'monthly')} to {label(m.stats.latest, 'weekly')}. Shaded
              bands are recessions. Freddie Mac, via FRED: {fredLink('MORTGAGE30US')}.
            </>
          }
          exportStats={[
            {
              label: label(m.stats.latest, 'weekly'),
              value: pct2(m.stats.latest.v),
              color: 'var(--c-accent)',
            },
            { label: `Payment on ${usd(m.loan)}`, value: usd(m.payNow) },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="credit-card"
        title="Credit card interest rate"
        description="The average rate on credit card accounts that were charged interest, at commercial banks."
        stats={standardStats(c.stats, 'monthly', pct2)}
        lead={
          <>
            At <strong>{pct2(c.stats.latest.v)}</strong>, a {usd(CARD_BALANCE)} balance with no
            payments grows by <strong>{usd(c.interestNow)}</strong> in a year, compounded monthly.
            {c.stats.tenYearsAgo && c.interestTenYearsAgo !== undefined && (
              <>
                {' '}
                At the {pct2(c.stats.tenYearsAgo.v)} rate of {month(c.stats.tenYearsAgo)}, it grew
                by {usd(c.interestTenYearsAgo)}.
              </>
            )}
          </>
        }
      >
        <TimeChart
          figure="Figure 2."
          lines={[{ label: 'Credit card rate', obs: c.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct2}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Average credit card interest rate on accounts charged interest, since 1994"
          caption={
            <>
              Quarterly, {label(c.obs[0]!, 'monthly')} to {label(c.stats.latest, 'monthly')}.
              Federal Reserve, via FRED: {fredLink('TERMCBCCINTNS')}.
            </>
          }
          exportStats={[
            {
              label: label(c.stats.latest, 'monthly'),
              value: pct2(c.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="car-loan"
        title="New car loan rate"
        description="The average rate on a 60-month loan for a new car, at commercial banks."
        stats={standardStats(car.stats, 'monthly', pct2)}
        lead={
          <>
            On a {usd(CAR_LOAN)} loan over {CAR_MONTHS} months, the interest comes to{' '}
            <strong>{usd(car.interestNow)}</strong> at {pct2(car.stats.latest.v)}. At the{' '}
            {pct2(car.stats.low.v)} low in {month(car.stats.low)}, it was{' '}
            <strong>{usd(car.interestLow)}</strong>.
          </>
        }
      >
        <TimeChart
          figure="Figure 3."
          lines={[
            {
              label: '60-month new car loan',
              obs: car.obs,
              color: 'var(--c-accent)',
            },
          ]}
          format={pct(0)}
          hoverFormat={pct2}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Average interest rate on a 60-month new car loan at commercial banks, since 2006"
          caption={
            <>
              Quarterly, {label(car.obs[0]!, 'monthly')} to {label(car.stats.latest, 'monthly')}.
              Federal Reserve, via FRED: {fredLink('RIFLPBCIANM60NM')}.
            </>
          }
          exportStats={[
            {
              label: label(car.stats.latest, 'monthly'),
              value: pct2(car.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="delinquency"
        title="Credit card balances past due"
        description="The share of credit card balances at commercial banks that are 30 or more days past due."
        stats={standardStats(d.stats, 'quarterly', pct2)}
      >
        <TimeChart
          figure="Figure 4."
          lines={[{ label: 'Past due', obs: d.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct2}
          periodOf={(date) => periodLabel(date, 'quarterly')}
          ariaLabel="Share of credit card balances 30 or more days past due, quarterly since 1991"
          caption={
            <>
              Quarterly, {label(d.obs[0]!, 'quarterly')} to {label(d.stats.latest, 'quarterly')}.
              Shaded bands are recessions. Federal Reserve, via FRED: {fredLink('DRCCLACBS')}.
            </>
          }
          exportStats={[
            {
              label: label(d.stats.latest, 'quarterly'),
              value: pct2(d.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="student-loans"
        title="Student loans outstanding"
        description="The total owed on student loans in the United States, federal and private."
        stats={standardStats(st.stats, 'monthly', trillions)}
        lead={
          <>
            Balances have grown <strong>{st.multiple.toFixed(1)} times</strong> since{' '}
            {prose(st.stats.first, 'monthly')}, from {trillionsProse(st.stats.first.v)} to{' '}
            <strong>{trillionsProse(st.stats.latest.v)}</strong>.
          </>
        }
      >
        <TimeChart
          figure="Figure 5."
          lines={[{ label: 'Student loans', obs: st.obs, color: 'var(--c-accent)' }]}
          format={(v) => `$${v.toFixed(1)}T`}
          hoverFormat={trillions}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Total student loans outstanding in trillions of dollars, since 2006"
          caption={
            <>
              Monthly, {label(st.obs[0]!, 'monthly')} to {label(st.stats.latest, 'monthly')}.
              Federal Reserve, via FRED: {fredLink('SLOASM')}.
            </>
          }
          exportStats={[
            {
              label: label(st.stats.latest, 'monthly'),
              value: trillions(st.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>
    </div>
  )
}

/* ------------------------------- Prices ------------------------------- */

function PricesTab() {
  const s = SINCE_2000
  const i = INFLATION
  const g = GAS
  const h = HOME_PRICE
  const p = PRICE_TO_INCOME
  const rise = (k: keyof typeof s.rise) => `${Math.round(s.rise[k])}%`

  return (
    <div className={styles.grid}>
      <SeriesCard
        id="since-2000"
        wide
        title={`Prices and income since ${BASE_YEAR}`}
        description={`Each line is set to 100 in ${BASE_YEAR}, so 200 means twice the ${BASE_YEAR} level. The figures below are the rise from ${BASE_YEAR} to ${s.lastYear}.`}
        stats={s.lines.map((l) => ({
          label: l.label,
          value: l.rise,
          format: (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}%`,
        }))}
        lead={
          <>
            From {BASE_YEAR} to {s.lastYear}, rent rose <strong>{rise('rent')}</strong> and the
            median new home price <strong>{rise('home')}</strong>. Median household income rose{' '}
            <strong>{rise('income')}</strong>, food at home {rise('food')}, and consumer prices
            overall {rise('cpi')}.
          </>
        }
      >
        <TimeChart
          figure="Figure 1."
          lines={s.lines.map((l) => ({
            label: l.label,
            obs: l.obs,
            color: l.color,
            endText: `${l.label} ${Math.round(l.obs[l.obs.length - 1]!.v)}`,
          }))}
          format={(v) => String(Math.round(v))}
          hoverFormat={(v) => v.toFixed(0)}
          zero={false}
          periodOf={(date) => String(date.getUTCFullYear())}
          rightMargin={190}
          ariaLabel={`Rent, new home prices, food at home, all consumer prices, and median household income, indexed to ${BASE_YEAR}`}
          caption={
            <>
              Annual averages, {BASE_YEAR} = 100. Shaded bands are recessions. Bureau of Labor
              Statistics and Census Bureau, via FRED: {fredLink('CUSR0000SEHA')},{' '}
              {fredLink('MSPUS')}, {fredLink('CUSR0000SAF11')}, {fredLink('CPIAUCSL')},{' '}
              {fredLink('MEHOINUSA646N')}.
            </>
          }
          exportStats={s.lines.map((l) => ({
            label: l.label,
            value: `+${Math.round(l.rise)}%`,
            color: l.color,
          }))}
        />
      </SeriesCard>

      <SeriesCard
        id="inflation"
        title="Inflation"
        description="The change in consumer prices from twelve months earlier, measured by the Consumer Price Index."
        stats={standardStats(i.stats, 'monthly', pct1)}
        lead={
          <>
            Prices in {prose(i.stats.latest, 'monthly')} were{' '}
            <strong>{pct1(i.stats.latest.v)}</strong> higher than a year earlier. Something that
            cost $100 in {periodProse(i.tenYearsAgoDate, 'monthly')} cost{' '}
            <strong>{usd2(i.hundredThen)}</strong> in {prose(i.stats.latest, 'monthly')}.
          </>
        }
      >
        <TimeChart
          figure="Figure 2."
          lines={[{ label: 'Inflation', obs: i.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct1}
          baseline={0}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Twelve-month change in the Consumer Price Index, monthly since 1948"
          caption={
            <>
              Monthly, {label(i.obs[0]!, 'monthly')} to {label(i.stats.latest, 'monthly')}. Shaded
              bands are recessions. Bureau of Labor Statistics, via FRED: {fredLink('CPIAUCSL')}.
            </>
          }
          exportStats={[
            {
              label: label(i.stats.latest, 'monthly'),
              value: pct1(i.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="gasoline"
        title="Price of regular gasoline"
        description={`The average price of a gallon of regular unleaded, at the time and in ${periodProse(g.priceDate, 'monthly')} dollars.`}
        stats={standardStats(g.stats, 'monthly', usd2)}
        lead={
          <>
            A {TANK_GALLONS}-gallon tank cost <strong>{usd2(g.tank)}</strong> in{' '}
            {prose(g.stats.latest, 'monthly')}. Adjusted for inflation, gasoline was most expensive
            in {prose(g.realPeak, 'monthly')}: {usd2(g.nominalAtRealPeak.v)} a gallon at the time,{' '}
            <strong>{usd2(g.realPeak.v)}</strong> in {periodProse(g.priceDate, 'monthly')} dollars.
          </>
        }
      >
        <TimeChart
          figure="Figure 3."
          lines={[
            { label: 'At the time', obs: g.obs, color: 'var(--c-accent)' },
            {
              label: `In ${periodLabel(g.priceDate, 'monthly')} dollars`,
              obs: g.real,
              color: 'var(--c-series-3)',
              dashed: true,
              endText: null,
            },
          ]}
          format={(v) => `$${v.toFixed(0)}`}
          hoverFormat={usd2}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Average price of a gallon of regular gasoline, nominal and adjusted for inflation, since 1976"
          caption={
            <>
              Monthly, {label(g.obs[0]!, 'monthly')} to {label(g.stats.latest, 'monthly')}. Solid:
              the price at the time. Dashed: adjusted by the Consumer Price Index. Bureau of Labor
              Statistics, via FRED: {fredLink('APU000074714')}.
            </>
          }
          exportStats={[
            {
              label: label(g.stats.latest, 'monthly'),
              value: usd2(g.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="home-price"
        title="Median price of new homes sold"
        description="The price of the new house in the middle of all those sold in the quarter."
        stats={standardStats(h.stats, 'quarterly', usd)}
        lead={
          h.stats.tenYearsAgo && (
            <>
              The median new home sold for <strong>{usd(h.stats.latest.v)}</strong> in{' '}
              {prose(h.stats.latest, 'quarterly')},{' '}
              {Math.round((h.stats.latest.v / h.stats.tenYearsAgo.v - 1) * 100)}% more than ten
              years earlier.
            </>
          )
        }
      >
        <TimeChart
          figure="Figure 4."
          lines={[{ label: 'Median new home', obs: h.obs, color: 'var(--c-accent)' }]}
          format={usdAxis}
          hoverFormat={usd}
          rightMargin={78}
          periodOf={(date) => periodLabel(date, 'quarterly')}
          ariaLabel="Median sales price of new houses sold in the United States, quarterly since 1963"
          caption={
            <>
              Quarterly, {label(h.obs[0]!, 'quarterly')} to {label(h.stats.latest, 'quarterly')}.
              Census Bureau and HUD, via FRED: {fredLink('MSPUS')}.
            </>
          }
          exportStats={[
            {
              label: label(h.stats.latest, 'quarterly'),
              value: usd(h.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="price-to-income"
        title="New home price as a multiple of income"
        description="The median new home price divided by median household income, each year."
        stats={standardStats(p.stats, 'annual', times)}
        lead={
          <>
            In {prose(p.stats.first, 'annual')}, the median new home cost{' '}
            <strong>{p.stats.first.v.toFixed(1)} years</strong> of the median household&rsquo;s
            income. In {prose(p.stats.latest, 'annual')}, it cost{' '}
            <strong>{p.stats.latest.v.toFixed(1)} years</strong>.
          </>
        }
      >
        <TimeChart
          figure="Figure 5."
          lines={[{ label: 'Years of income', obs: p.obs, color: 'var(--c-accent)' }]}
          format={(v) => `${v.toFixed(0)}×`}
          hoverFormat={times}
          periodOf={(date) => String(date.getUTCFullYear())}
          ariaLabel="Median new home price as a multiple of median household income, since 1984"
          caption={
            <>
              Annual, {label(p.obs[0]!, 'annual')} to {label(p.stats.latest, 'annual')}. The
              quarterly home price averaged over each year. Census Bureau, via FRED:{' '}
              {fredLink('MSPUS')}, {fredLink('MEHOINUSA646N')}.
            </>
          }
          exportStats={[
            {
              label: label(p.stats.latest, 'annual'),
              value: times(p.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>
    </div>
  )
}

/* -------------------------- Income and saving -------------------------- */

function IncomeTab() {
  const inc = INCOME
  const ds = DEBT_SERVICE
  const sv = SAVING
  const cash = CASH
  const sp = SP500

  return (
    <div className={styles.grid}>
      <SeriesCard
        id="income"
        wide
        title="Median household income, adjusted for inflation"
        description={`The income of the household in the middle of the distribution, each year, in ${inc.dollarsOf} dollars.`}
        stats={standardStats(inc.stats, 'annual', usd)}
        lead={
          <>
            Adjusted for inflation, the median household&rsquo;s income rose from{' '}
            {usd(inc.stats.first.v)} in {prose(inc.stats.first, 'annual')} to{' '}
            <strong>{usd(inc.stats.latest.v)}</strong> in {prose(inc.stats.latest, 'annual')}:{' '}
            <strong>{Math.round(inc.totalGrowth)}%</strong> in total, or {inc.perYear.toFixed(1)}% a
            year.
          </>
        }
      >
        <TimeChart
          figure="Figure 1."
          lines={[
            {
              label: 'Median household income',
              obs: inc.obs,
              color: 'var(--c-accent)',
            },
          ]}
          format={usdAxis}
          hoverFormat={usd}
          rightMargin={72}
          periodOf={(date) => String(date.getUTCFullYear())}
          ariaLabel={`Real median household income in ${inc.dollarsOf} dollars, since 1984`}
          caption={
            <>
              Annual, {label(inc.obs[0]!, 'annual')} to {label(inc.stats.latest, 'annual')}, in{' '}
              {inc.dollarsOf} dollars. Shaded bands are recessions. Census Bureau, via FRED:{' '}
              {fredLink('MEHOINUSA672N')}.
            </>
          }
          exportStats={[
            {
              label: label(inc.stats.latest, 'annual'),
              value: usd(inc.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="debt-payments"
        title="Debt payments as a share of income"
        description="Required payments on mortgages and consumer loans, as a percentage of income after taxes."
        stats={standardStats(ds.stats, 'quarterly', pct1)}
        lead={
          <>
            In {prose(ds.stats.latest, 'quarterly')}, households paid{' '}
            <strong>{usd(ds.stats.latest.v * 10)}</strong> of every $1,000 of after-tax income
            toward debt.
          </>
        }
      >
        <TimeChart
          figure="Figure 2."
          lines={[{ label: 'Debt payments', obs: ds.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct1}
          periodOf={(date) => periodLabel(date, 'quarterly')}
          ariaLabel="Household debt payments as a percentage of disposable income, quarterly"
          caption={
            <>
              Quarterly, {label(ds.obs[0]!, 'quarterly')} to {label(ds.stats.latest, 'quarterly')}.
              Shaded bands are recessions. Federal Reserve, via FRED: {fredLink('TDSP')}.
            </>
          }
          exportStats={[
            {
              label: label(ds.stats.latest, 'quarterly'),
              value: pct1(ds.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="saving-rate"
        title="Personal saving rate"
        description="The share of income after taxes that households save rather than spend."
        stats={standardStats(sv.stats, 'monthly', pct1)}
        lead={
          <>
            Households saved <strong>{usd(sv.stats.latest.v * 10)}</strong> of every $1,000 of
            after-tax income in {prose(sv.stats.latest, 'monthly')}. The average since{' '}
            {sv.stats.first.date.getUTCFullYear()} is {pct1(sv.stats.mean)}.
          </>
        }
      >
        <TimeChart
          figure="Figure 3."
          lines={[{ label: 'Saving rate', obs: sv.obs, color: 'var(--c-accent)' }]}
          format={pct(0)}
          hoverFormat={pct1}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Personal saving as a percentage of disposable income, monthly since 1959"
          caption={
            <>
              Monthly, {label(sv.obs[0]!, 'monthly')} to {label(sv.stats.latest, 'monthly')}. Shaded
              bands are recessions. Bureau of Economic Analysis, via FRED: {fredLink('PSAVERT')}.
            </>
          }
          exportStats={[
            {
              label: label(sv.stats.latest, 'monthly'),
              value: pct1(sv.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="cash"
        title="Interest on cash and inflation"
        description="The 3-month Treasury bill rate, a benchmark for what money market funds pay, against inflation."
        stats={[
          {
            label: 'Bill rate',
            value: cash.latestBill.v,
            format: pct2,
            note: label(cash.latestBill, 'monthly'),
          },
          {
            label: 'Inflation',
            value: cash.latestInfl.v,
            format: pct1,
            note: label(cash.latestInfl, 'monthly'),
          },
          {
            label: 'After inflation',
            value: cash.realNow,
            format: pct2,
            note: label(cash.latestBill, 'monthly'),
          },
          {
            label: 'Months behind inflation',
            value: cash.shareBehind,
            format: (v) => `${Math.round(v)}%`,
            note: `since ${BASE_YEAR}`,
          },
        ]}
        lead={
          <>
            In {prose(cash.latestBill, 'monthly')}, the bill rate was {pct2(cash.latestBill.v)} and
            inflation {pct1(cash.latestInfl.v)}, a return of <strong>{pct2(cash.realNow)}</strong>{' '}
            after inflation. Since {BASE_YEAR}, the bill rate has been below inflation in{' '}
            <strong>{Math.round(cash.shareBehind)}%</strong> of months.
          </>
        }
      >
        <TimeChart
          figure="Figure 4."
          lines={[
            {
              label: 'Treasury bill rate',
              obs: cash.bill,
              color: 'var(--c-accent)',
              endText: `Bill rate ${pct2(cash.latestBill.v)}`,
            },
            {
              label: 'Inflation',
              obs: cash.infl,
              color: 'var(--c-series-3)',
              endText: `Inflation ${pct1(cash.latestInfl.v)}`,
            },
          ]}
          format={pct(0)}
          hoverFormat={pct2}
          baseline={0}
          rightMargin={140}
          periodOf={(date) => periodLabel(date, 'monthly')}
          ariaLabel="Three-month Treasury bill rate and inflation, monthly since 1948"
          caption={
            <>
              Monthly, {label(cash.bill[0]!, 'monthly')} to {label(cash.latestBill, 'monthly')}.
              Shaded bands are recessions. Federal Reserve and Bureau of Labor Statistics, via FRED:{' '}
              {fredLink('TB3MS')}, {fredLink('CPIAUCSL')}.
            </>
          }
          exportStats={[
            {
              label: 'Bill rate',
              value: pct2(cash.latestBill.v),
              color: 'var(--c-accent)',
            },
            {
              label: 'Inflation',
              value: pct1(cash.latestInfl.v),
              color: 'var(--c-series-3)',
            },
          ]}
        />
      </SeriesCard>

      <SeriesCard
        id="sp500"
        title="S&P 500"
        description="The index of 500 large U.S. companies, at the end of each month. It leaves out dividends."
        stats={[
          {
            label: 'Latest',
            value: sp.stats.latest.v,
            format: usd,
            note: label(sp.stats.latest, 'weekly'),
          },
          {
            label: 'Start',
            value: sp.stats.first.v,
            format: usd,
            note: label(sp.stats.first, 'weekly'),
          },
          {
            label: 'Annual return',
            value: sp.perYear,
            format: pct1,
            note: 'before dividends',
          },
          {
            label: 'Largest fall',
            value: sp.drawdown.depth * 100,
            format: pct1,
            note: `${label(sp.drawdown.peak, 'monthly')} to ${label(sp.drawdown.trough, 'monthly')}`,
          },
        ]}
        lead={
          <>
            {usd(SP_STAKE)} invested on {fullDate(sp.stats.first.date)} was worth{' '}
            <strong>{usd(sp.grownTo)}</strong> on {fullDate(sp.stats.latest.date)}, a gain of{' '}
            {pct1(sp.perYear)} a year before dividends. The largest fall from a month-end high was{' '}
            <strong>{pct1(-sp.drawdown.depth * 100)}</strong>.
          </>
        }
      >
        <TimeChart
          figure="Figure 5."
          lines={[{ label: 'S&P 500', obs: sp.obs, color: 'var(--c-accent)' }]}
          format={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          hoverFormat={(v) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          rightMargin={66}
          periodOf={(date) => periodLabel(date, 'weekly')}
          ariaLabel="S&P 500 index at each month-end over the last ten years"
          caption={
            <>
              Month-end closes, {label(sp.stats.first, 'monthly')} to{' '}
              {label(sp.stats.latest, 'weekly')}. FRED publishes the last ten years. S&amp;P Dow
              Jones Indices, via FRED: {fredLink('SP500')}.
            </>
          }
          exportStats={[
            {
              label: label(sp.stats.latest, 'weekly'),
              value: usd(sp.stats.latest.v),
              color: 'var(--c-accent)',
            },
          ]}
        />
      </SeriesCard>
    </div>
  )
}

/* ------------------------------ The page ------------------------------ */

type View = 'borrowing' | 'prices' | 'income'

const VIEWS: TabItem<View>[] = [
  { value: 'borrowing', label: 'Borrowing' },
  { value: 'prices', label: 'Prices' },
  { value: 'income', label: 'Income and saving' },
]

/* The six figures most people have heard quoted, each opening its chart. */
const LATEST: {
  view: View
  anchor: string
  label: string
  value: string
  note: string
}[] = [
  {
    view: 'borrowing',
    anchor: 'mortgage',
    label: '30-year mortgage rate',
    value: pct2(MORTGAGE.stats.latest.v),
    note: label(MORTGAGE.stats.latest, 'weekly'),
  },
  {
    view: 'borrowing',
    anchor: 'credit-card',
    label: 'Credit card rate',
    value: pct2(CARD.stats.latest.v),
    note: label(CARD.stats.latest, 'monthly'),
  },
  {
    view: 'prices',
    anchor: 'inflation',
    label: 'Inflation',
    value: pct1(INFLATION.stats.latest.v),
    note: label(INFLATION.stats.latest, 'monthly'),
  },
  {
    view: 'prices',
    anchor: 'gasoline',
    label: 'Regular gasoline',
    value: usd2(GAS.stats.latest.v),
    note: label(GAS.stats.latest, 'monthly'),
  },
  {
    view: 'income',
    anchor: 'income',
    label: 'Median household income',
    value: usd(INCOME.stats.latest.v),
    note: label(INCOME.stats.latest, 'annual'),
  },
  {
    view: 'income',
    anchor: 'saving-rate',
    label: 'Personal saving rate',
    value: pct1(SAVING.stats.latest.v),
    note: label(SAVING.stats.latest, 'monthly'),
  },
]

export default function HouseholdDataContent() {
  const [view, setView] = useState<View>('borrowing')
  const [target, setTarget] = useState<string | null>(null)

  /* A figure in the top row opens its tab and scrolls to its chart. */
  useEffect(() => {
    if (!target) return
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTarget(null)
  }, [view, target])

  return (
    <>
      <div className={styles.latestWrap}>
        <div className={styles.latest}>
          {LATEST.map((t) => (
            <button
              key={t.anchor}
              type="button"
              className={styles.tile}
              onClick={() => {
                setView(t.view)
                setTarget(t.anchor)
              }}
            >
              <span className={styles.tileLabel}>{t.label}</span>
              <span className={`${styles.tileValue} tnum`}>{t.value}</span>
              <span className={styles.tileNote}>{t.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.source}>
        <Callout tone="plain" label="Source">
          Federal Reserve Bank of St. Louis, FRED. Downloaded {fetchedLabel}; each series runs to
          its latest release. Shaded bands on the charts are recessions.{' '}
          <a
            href="https://fred.stlouisfed.org/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-cardinal hover:underline"
          >
            fred.stlouisfed.org <ExternalLink size={12} />
          </a>
        </Callout>
      </div>

      <div className={styles.tabs}>
        <Tabs items={VIEWS} value={view} onChange={setView} />
      </div>

      {view === 'borrowing' && <BorrowingTab />}
      {view === 'prices' && <PricesTab />}
      {view === 'income' && <IncomeTab />}
    </>
  )
}
