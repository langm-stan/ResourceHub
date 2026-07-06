import { FormulaBlock } from '../../../design-system'
import { freqOf, rateOf, type Scenario } from '../state'
import type { Results } from '../compute'
import styles from './MathReport.module.css'

function tex(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

interface MathReportProps {
  scenario: Scenario
  results: Results
}

export function MathReport({ scenario, results }: MathReportProps) {
  const freq = freqOf(scenario)
  const r = rateOf(scenario)
  const continuous = freq.kind === 'continuous'
  const m = continuous ? null : freq.m
  const P = scenario.principal
  const t = scenario.years

  const rows: { tex: string; caption?: string; muted?: boolean }[] = []

  if (scenario.mode === 'pv') {
    if (continuous) {
      rows.push({ tex: `PV = FV \\cdot e^{-rt}`, caption: 'Present value, continuous discounting' })
      rows.push({ tex: `PV = ${tex(P, 0)} \\cdot e^{-(${scenario.ratePct / 100})(${t})}` })
      rows.push({
        tex: `PV = ${tex(P, 0)} \\cdot e^{-${tex(r * t, 4)}} = \\boxed{${tex(results.headline)}}`,
        muted: true,
      })
    } else {
      const i = r / (m as number)
      const n = (m as number) * t
      const factor = Math.pow(1 + i, n)
      rows.push({
        tex: `PV = \\dfrac{FV}{\\left(1 + \\frac{r}{m}\\right)^{mt}}`,
        caption: 'Present value of a future lump sum',
      })
      rows.push({
        tex: `PV = \\dfrac{${tex(P, 0)}}{\\left(1 + \\frac{${scenario.ratePct / 100}}{${m}}\\right)^{${m}\\cdot${t}}}`,
      })
      rows.push({
        tex: `PV = \\dfrac{${tex(P, 0)}}{(${tex(1 + i, 5)})^{${tex(n, 0)}}} = \\dfrac{${tex(P, 0)}}{${tex(factor, 3)}} = \\boxed{${tex(results.headline)}}`,
        muted: true,
      })
    }
    return <MathRows rows={rows} note={pvNote(results)} />
  }

  if (continuous) {
    rows.push({ tex: `FV = P \\cdot e^{rt}`, caption: 'Future value, continuous compounding' })
    rows.push({ tex: `FV = ${tex(P, 0)} \\cdot e^{(${scenario.ratePct / 100})(${t})}` })
    rows.push({
      tex: `FV = ${tex(P, 0)} \\cdot e^{${tex(r * t, 4)}} = \\boxed{${tex(results.final.balance)}}`,
      muted: true,
    })
  } else {
    const i = r / (m as number)
    const n = (m as number) * t
    const factor = Math.pow(1 + i, n)
    const lumpFV = P * factor
    rows.push({
      tex: `FV = P\\left(1 + \\frac{r}{m}\\right)^{mt}`,
      caption: 'Future value of a lump sum',
    })
    rows.push({
      tex: `FV = ${tex(P, 0)}\\left(1 + \\frac{${scenario.ratePct / 100}}{${m}}\\right)^{${m}\\cdot${t}}`,
    })
    rows.push({
      tex: `FV = ${tex(P, 0)}\\,(${tex(1 + i, 5)})^{${tex(n, 0)}} = ${tex(P, 0)} \\times ${tex(factor, 3)} = \\boxed{${tex(lumpFV)}}`,
      muted: true,
    })

    if (scenario.contribution) {
      const pmt = scenario.contribution.amount
      const annuity = (pmt * (factor - 1)) / i
      rows.push({
        tex: `+\\;\\; PMT \\cdot \\dfrac{(1 + i)^{n} - 1}{i}`,
        caption: 'Plus the future value of the contributions',
      })
      rows.push({
        tex: `= ${tex(pmt, 0)} \\cdot \\dfrac{(${tex(1 + i, 5)})^{${tex(n, 0)}} - 1}{${tex(i, 5)}} = \\boxed{${tex(annuity)}}`,
        muted: true,
      })
    }
  }

  return <MathRows rows={rows} note={fvNote(results)} />
}

function fvNote(results: Results): string {
  const pct = results.final.balance > 0 ? (results.interestOnInterest / results.final.balance) * 100 : 0
  return `Of the final balance, interest-on-interest alone accounts for ${pct.toFixed(0)}%. That money exists only because earlier interest kept earning.`
}

function pvNote(results: Results): string {
  const pct = results.futureAmount > 0 ? (results.headline / results.futureAmount) * 100 : 0
  return `Today's value is just ${pct.toFixed(1)}% of the promised future sum. Distance in time is expensive.`
}

function MathRows({
  rows,
  note,
}: {
  rows: { tex: string; caption?: string; muted?: boolean }[]
  note: string
}) {
  return (
    <div className={styles.report}>
      <div className={styles.rows}>
        {rows.map((row, idx) => (
          <FormulaBlock key={idx} tex={row.tex} caption={row.caption} muted={row.muted} />
        ))}
      </div>
      <p className={styles.note}>{note}</p>
    </div>
  )
}
