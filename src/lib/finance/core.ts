/**
 * Core time-value-of-money: compounding, future/present value, effective rates.
 */
import { assert, assertFinite, assertNonNegative, assertPositive } from './assert'
import type { Frequency } from './types'

function periodsPerYear(freq: Frequency): number {
  if (freq.kind === 'continuous') return Number.POSITIVE_INFINITY
  assertPositive(freq.m, 'compounding frequency (m)')
  return freq.m
}

/** Future value of a lump sum. */
export function futureValue(
  principal: number,
  annualRate: number,
  years: number,
  freq: Frequency,
): number {
  assertFinite(principal, 'principal')
  assertFinite(annualRate, 'annual rate')
  assertNonNegative(years, 'years')

  if (annualRate === 0) return principal
  if (freq.kind === 'continuous') {
    return principal * Math.exp(annualRate * years)
  }
  const m = periodsPerYear(freq)
  return principal * Math.pow(1 + annualRate / m, m * years)
}

/** Present value of a future lump sum (discounting). */
export function presentValue(
  future: number,
  annualRate: number,
  years: number,
  freq: Frequency,
): number {
  assertFinite(future, 'future value')
  assertFinite(annualRate, 'annual rate')
  assertNonNegative(years, 'years')

  if (annualRate === 0) return future
  if (freq.kind === 'continuous') {
    return future * Math.exp(-annualRate * years)
  }
  const m = periodsPerYear(freq)
  return future / Math.pow(1 + annualRate / m, m * years)
}

/** Effective annual rate (EAR / APY) implied by a nominal rate + frequency. */
export function effectiveAnnualRate(nominalRate: number, freq: Frequency): number {
  assertFinite(nominalRate, 'nominal rate')
  if (nominalRate === 0) return 0
  if (freq.kind === 'continuous') {
    return Math.exp(nominalRate) - 1
  }
  const m = periodsPerYear(freq)
  return Math.pow(1 + nominalRate / m, m) - 1
}

/** Inverse of {@link effectiveAnnualRate}. */
export function nominalRateFromEAR(ear: number, freq: Frequency): number {
  assertFinite(ear, 'effective annual rate')
  assert(ear > -1, 'effective annual rate must be greater than −100%.')
  if (ear === 0) return 0
  if (freq.kind === 'continuous') {
    return Math.log(1 + ear)
  }
  const m = periodsPerYear(freq)
  return m * (Math.pow(1 + ear, 1 / m) - 1)
}

/** Years for a principal to grow to a target value at a given rate. */
export function yearsToReach(
  principal: number,
  target: number,
  annualRate: number,
  freq: Frequency,
): number {
  assertPositive(principal, 'principal')
  assertPositive(target, 'target')
  assertPositive(annualRate, 'annual rate')

  const ratio = Math.log(target / principal)
  if (freq.kind === 'continuous') {
    return ratio / annualRate
  }
  const m = periodsPerYear(freq)
  return ratio / (m * Math.log(1 + annualRate / m))
}

/** The classic Rule of 72 estimate of doubling time (for teaching comparison). */
export function ruleOf72(annualRatePercent: number): number {
  assertPositive(annualRatePercent, 'annual rate (percent)')
  return 72 / annualRatePercent
}
