/**
 * Time Value of Money scenarios: two guided teaching modes, borrowing and
 * saving. The five-key calculator lives in its own tool (TvmCalculatorPage).
 */

export type TvmMode = 'loan' | 'save'

export interface TvmState {
  mode: TvmMode
  /** Loan amount (borrow) or goal amount (save), in dollars. */
  amount: number
  /** Annual nominal rate as a percent (6 = 6%). */
  ratePct: number
  years: number
}

export const DEFAULT_TVM: TvmState = {
  mode: 'loan',
  amount: 25_000,
  ratePct: 6,
  years: 5,
}

export function toSearchParams(s: TvmState): URLSearchParams {
  const p = new URLSearchParams()
  p.set('mode', s.mode)
  p.set('a', String(s.amount))
  p.set('r', String(s.ratePct))
  p.set('t', String(s.years))
  return p
}

function num(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw == null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function parseTvm(params: URLSearchParams): TvmState {
  // 'calc' was a mode here before the five-key calculator became its own
  // tool; the Calculators page redirects those links to tool=tvm-calc.
  const raw = params.get('mode')
  const mode: TvmMode = raw === 'save' ? 'save' : 'loan'
  return {
    mode,
    amount: num(params, 'a', DEFAULT_TVM.amount),
    ratePct: num(params, 'r', DEFAULT_TVM.ratePct),
    years: num(params, 't', DEFAULT_TVM.years),
  }
}

export function tvmEqual(a: TvmState, b: TvmState): boolean {
  return a.mode === b.mode && a.amount === b.amount && a.ratePct === b.ratePct && a.years === b.years
}

export interface TvmPreset {
  id: string
  title: string
  caption: string
  state: TvmState
}

export const TVM_PRESETS: TvmPreset[] = [
  {
    id: 'car',
    title: 'New car loan',
    caption: '$25,000 at 6% over 5 years.',
    state: { mode: 'loan', amount: 25_000, ratePct: 6, years: 5 },
  },
  {
    id: 'mortgage',
    title: '30-year mortgage',
    caption: '$300,000 at 6.5% over 30 years.',
    state: { mode: 'loan', amount: 300_000, ratePct: 6.5, years: 30 },
  },
  {
    id: 'credit-card',
    title: 'Credit-card balance',
    caption: '$5,000 at 22% paid over 3 years.',
    state: { mode: 'loan', amount: 5_000, ratePct: 22, years: 3 },
  },
  {
    id: 'downpayment',
    title: 'Save for a down payment',
    caption: 'Reach $40,000 in 5 years at 4%.',
    state: { mode: 'save', amount: 40_000, ratePct: 4, years: 5 },
  },
  {
    id: 'emergency',
    title: 'Build an emergency fund',
    caption: 'Reach $15,000 in 3 years at 4%.',
    state: { mode: 'save', amount: 15_000, ratePct: 4, years: 3 },
  },
]
