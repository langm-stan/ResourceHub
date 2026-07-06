/**
 * Growth-path generation for the visualization. Decomposes the balance into
 * three stacked teaching bands: principal, simple interest, and interest on
 * interest. Bands always satisfy balance = principal + simple + interestOnInterest,
 * and interestOnInterest is 0 at t=0 and whenever the rate is 0.
 */
import { assertFinite, assertNonNegative } from './assert'
import type { ContributionConfig, Frequency, SeriesPoint } from './types'

export interface GrowthSeriesInput {
  principal: number
  annualRate: number
  years: number
  freq: Frequency
  contribution?: ContributionConfig
  maxPoints?: number
}

export interface GrowthSeries {
  points: SeriesPoint[]
  final: SeriesPoint
}

function stepsPerYear(freq: Frequency, hasContributions: boolean): number {
  if (freq.kind === 'periodic') return freq.m
  return hasContributions ? 12 : 52
}

export function growthSeries(input: GrowthSeriesInput): GrowthSeries {
  const { principal, annualRate, years, freq, contribution } = input
  assertFinite(principal, 'principal')
  assertFinite(annualRate, 'annual rate')
  assertNonNegative(years, 'years')

  const hasContrib = contribution != null && contribution.amount !== 0
  const c = hasContrib ? contribution!.amount : 0
  const due = hasContrib && contribution!.timing === 'due'

  const sPerYear = stepsPerYear(freq, hasContrib)
  const growthPerStep =
    freq.kind === 'continuous'
      ? Math.exp(annualRate / sPerYear)
      : 1 + annualRate / sPerYear
  const simpleRatePerStep = annualRate / sPerYear

  const totalSteps = Math.max(1, Math.round(sPerYear * years))
  const maxPoints = input.maxPoints ?? 600
  const stride = Math.max(1, Math.ceil(totalSteps / Math.max(1, maxPoints - 1)))

  let invested = principal
  let balance = principal
  let cumulativeSimple = 0

  const points: SeriesPoint[] = [
    {
      t: 0,
      balance: principal,
      principalContributed: principal,
      simpleInterest: 0,
      interestOnInterest: 0,
    },
  ]

  for (let step = 1; step <= totalSteps; step++) {
    if (due) {
      balance += c
      invested += c
    }

    cumulativeSimple += invested * simpleRatePerStep
    balance *= growthPerStep

    if (hasContrib && !due) {
      balance += c
      invested += c
    }

    const isSampled = step % stride === 0 || step === totalSteps
    if (isSampled) {
      const principalContributed = invested
      const simpleInterest = cumulativeSimple
      const interestOnInterest = balance - principalContributed - simpleInterest
      points.push({
        t: step / sPerYear,
        balance,
        principalContributed,
        simpleInterest: simpleInterest < 0 ? 0 : simpleInterest,
        interestOnInterest: Math.abs(interestOnInterest) < 1e-9 ? 0 : interestOnInterest,
      })
    }
  }

  return { points, final: points[points.length - 1]! }
}
