/**
 * Derives every figure the tool's panels need from a single scenario.
 */
import {
  effectiveAnnualRate,
  futureValue,
  growthSeries,
  presentValue,
  yearsToReach,
  type SeriesPoint,
} from '../../lib/finance'
import { freqOf, rateOf, type Scenario } from './state'

export interface PvPoint {
  t: number
  value: number
}

export interface Results {
  mode: 'fv' | 'pv'
  rate: number
  series: SeriesPoint[]
  final: SeriesPoint
  headline: number
  totalContributed: number
  totalInterest: number
  interestOnInterest: number
  ear: number
  doublingYears: number | null
  pvSeries: PvPoint[]
  futureAmount: number
}

export function computeResults(s: Scenario): Results {
  const freq = freqOf(s)
  const rate = rateOf(s)

  const fvSeries = growthSeries({
    principal: s.mode === 'pv' ? 0 : s.principal,
    annualRate: rate,
    years: s.years,
    freq,
    contribution: s.contribution ?? undefined,
  })

  const actualSeries =
    s.mode === 'fv'
      ? fvSeries
      : growthSeries({
          principal: s.principal,
          annualRate: rate,
          years: s.years,
          freq,
          contribution: s.contribution ?? undefined,
        })

  const fvFinal = actualSeries.final
  const totalContributed = fvFinal.principalContributed
  const totalInterest = fvFinal.balance - totalContributed
  const interestOnInterest = fvFinal.interestOnInterest

  const pvSteps = 80
  const pvSeries: PvPoint[] = []
  for (let k = 0; k <= pvSteps; k++) {
    const t = (s.years * k) / pvSteps
    pvSeries.push({ t, value: presentValue(s.principal, rate, t, freq) })
  }

  const headline =
    s.mode === 'pv' ? presentValue(s.principal, rate, s.years, freq) : fvFinal.balance

  const canDouble = s.mode === 'fv' && s.principal > 0 && rate > 0 && !s.contribution
  const doublingYears = canDouble
    ? yearsToReach(s.principal, s.principal * 2, rate, freq)
    : null

  return {
    mode: s.mode,
    rate,
    series: actualSeries.points,
    final: fvFinal,
    headline,
    totalContributed,
    totalInterest,
    interestOnInterest,
    ear: effectiveAnnualRate(rate, freq),
    doublingYears,
    pvSeries,
    futureAmount: s.principal,
  }
}

/** Convenience: closed-form final balance for a scenario (used by Compare/Frequency). */
export function finalBalanceFor(s: Scenario): number {
  const freq = freqOf(s)
  const rate = rateOf(s)
  if (s.contribution) {
    return growthSeries({
      principal: s.principal,
      annualRate: rate,
      years: s.years,
      freq,
      contribution: s.contribution,
    }).final.balance
  }
  return futureValue(s.principal, rate, s.years, freq)
}
