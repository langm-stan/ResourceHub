/**
 * The classic five-key time-value-of-money solver: N, I/Y, PV, PMT, FV.
 * Enter any four and solve for the fifth — the model a BA II Plus / HP 12C uses.
 *
 * Sign convention (standard): cash you receive is positive, cash you pay out is
 * negative. A loan is +PV (money in now) with −PMT (payments out); saving is
 * −PMT (money out each period) with +FV (money back at the end).
 *
 * Governing equation (END mode):
 *   PV·(1+i)^N + PMT·d·((1+i)^N − 1)/i + FV = 0
 * where i = (I/Y / 100) / P/Y is the rate per period and d = (1+i) in BEGIN
 * (annuity-due) mode, else 1.
 */
import { assert } from './assert'

export type TvmVar = 'n' | 'iy' | 'pv' | 'pmt' | 'fv'

export interface TvmRegisters {
  /** Total number of periods. */
  n: number
  /** Annual nominal interest rate, in percent. */
  iy: number
  pv: number
  pmt: number
  fv: number
  /** Periods (and payments) per year. */
  py: number
  /** Payments at the beginning of each period (annuity due) vs. end. */
  due: boolean
}

const EPS = 1e-9

function dueFactor(i: number, due: boolean): number {
  return due ? 1 + i : 1
}

/** The TVM equation residual; zero when the registers are consistent. */
function residual(r: TvmRegisters, i: number): number {
  const d = dueFactor(i, r.due)
  if (Math.abs(i) < 1e-12) return r.pv + r.pmt * r.n + r.fv
  const g = Math.pow(1 + i, r.n)
  return r.pv * g + (r.pmt * d * (g - 1)) / i + r.fv
}

function perPeriod(r: TvmRegisters): number {
  return r.iy / 100 / r.py
}

/** Solve for the requested variable, returning its value. */
export function solveTvm(r: TvmRegisters, solveFor: TvmVar): number {
  switch (solveFor) {
    case 'fv':
      return solveFV(r)
    case 'pv':
      return solvePV(r)
    case 'pmt':
      return solvePMT(r)
    case 'n':
      return solveN(r)
    case 'iy':
      return solveIY(r)
  }
}

function solveFV(r: TvmRegisters): number {
  const i = perPeriod(r)
  const d = dueFactor(i, r.due)
  if (Math.abs(i) < EPS) return -(r.pv + r.pmt * r.n)
  const g = Math.pow(1 + i, r.n)
  return -(r.pv * g + (r.pmt * d * (g - 1)) / i)
}

function solvePV(r: TvmRegisters): number {
  const i = perPeriod(r)
  const d = dueFactor(i, r.due)
  if (Math.abs(i) < EPS) return -(r.fv + r.pmt * r.n)
  const g = Math.pow(1 + i, r.n)
  return -(r.fv + (r.pmt * d * (g - 1)) / i) / g
}

function solvePMT(r: TvmRegisters): number {
  const i = perPeriod(r)
  const d = dueFactor(i, r.due)
  assert(r.n !== 0, 'N must be greater than zero to solve for the payment.')
  if (Math.abs(i) < EPS) return -(r.pv + r.fv) / r.n
  const g = Math.pow(1 + i, r.n)
  const s = (d * (g - 1)) / i
  return -(r.pv * g + r.fv) / s
}

function solveN(r: TvmRegisters): number {
  const i = perPeriod(r)
  const d = dueFactor(i, r.due)
  if (Math.abs(i) < EPS) {
    assert(r.pmt !== 0, 'With a 0% rate and no payment, N has no solution.')
    return -(r.pv + r.fv) / r.pmt
  }
  const k = (r.pmt * d) / i
  const denom = r.pv + k
  assert(Math.abs(denom) > EPS, 'These values have no solution for N.')
  const x = (k - r.fv) / denom
  assert(x > 0, 'No solution for N. Check the signs: one amount must be negative.')
  return Math.log(x) / Math.log(1 + i)
}

/**
 * Solve for I/Y by finding the per-period rate that zeroes the residual, then
 * converting back to an annual nominal percent. Uses a bracketed bisection.
 */
function solveIY(r: TvmRegisters): number {
  assert(r.n > 0, 'N must be greater than zero to solve for the rate.')

  const lo0 = -0.9999
  const hi0 = 10
  let a = lo0
  let fa = residual(r, a)

  let bracketLo = NaN
  let bracketHi = NaN
  const steps = 200
  for (let k = 1; k <= steps; k++) {
    const b = lo0 + ((hi0 - lo0) * k) / steps
    const fb = residual(r, b)
    if (fa === 0) return a * r.py * 100
    if (fa * fb < 0) {
      bracketLo = a
      bracketHi = b
      break
    }
    a = b
    fa = fb
  }
  assert(
    !Number.isNaN(bracketLo),
    'No interest rate solves these values. Check the signs: the amounts must mix positive and negative.',
  )

  let lo = bracketLo
  let hi = bracketHi
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    const fm = residual(r, mid)
    if (Math.abs(fm) < 1e-10 || (hi - lo) / 2 < 1e-12) {
      return mid * r.py * 100
    }
    if (residual(r, lo) * fm < 0) hi = mid
    else lo = mid
  }
  return ((lo + hi) / 2) * r.py * 100
}
