/**
 * The Compound Interest scenario: one object that drives every panel and
 * round-trips losslessly to the URL, so an instructor can share a link.
 */
import { FREQUENCIES, type Frequency, type FrequencyName, type Timing } from '../../lib/finance'

export type Mode = 'fv' | 'pv'

export interface Scenario {
  principal: number
  ratePct: number
  years: number
  frequency: FrequencyName
  mode: Mode
  contribution: { amount: number; timing: Timing } | null
}

export const DEFAULT_SCENARIO: Scenario = {
  principal: 1000,
  ratePct: 8,
  years: 18,
  frequency: 'annual',
  mode: 'fv',
  contribution: null,
}

export function freqOf(s: Scenario): Frequency {
  return FREQUENCIES[s.frequency]
}

export function rateOf(s: Scenario): number {
  return s.ratePct / 100
}

/** True when two scenarios are identical (used to highlight the active example). */
export function scenariosEqual(a: Scenario, b: Scenario): boolean {
  return (
    a.principal === b.principal &&
    a.ratePct === b.ratePct &&
    a.years === b.years &&
    a.frequency === b.frequency &&
    a.mode === b.mode &&
    (a.contribution?.amount ?? null) === (b.contribution?.amount ?? null) &&
    (a.contribution?.timing ?? null) === (b.contribution?.timing ?? null)
  )
}

const FREQ_CODE: Record<FrequencyName, string> = {
  annual: 'a',
  semiannual: 's',
  quarterly: 'q',
  monthly: 'm',
  daily: 'd',
  continuous: 'c',
}
const CODE_FREQ = Object.fromEntries(
  Object.entries(FREQ_CODE).map(([k, v]) => [v, k]),
) as Record<string, FrequencyName>

export function toSearchParams(s: Scenario): URLSearchParams {
  const p = new URLSearchParams()
  p.set('p', String(s.principal))
  p.set('r', String(s.ratePct))
  p.set('t', String(s.years))
  p.set('f', FREQ_CODE[s.frequency])
  if (s.mode !== 'fv') p.set('mode', s.mode)
  if (s.contribution) {
    p.set('c', String(s.contribution.amount))
    if (s.contribution.timing === 'due') p.set('ct', 'due')
  }
  return p
}

function num(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw == null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function parseScenario(params: URLSearchParams): Scenario {
  const freqCode = params.get('f')
  const frequency: FrequencyName =
    freqCode && CODE_FREQ[freqCode] ? CODE_FREQ[freqCode] : DEFAULT_SCENARIO.frequency
  const mode: Mode = params.get('mode') === 'pv' ? 'pv' : 'fv'

  const cAmount = params.get('c')
  const contribution =
    cAmount != null && Number.isFinite(Number(cAmount)) && Number(cAmount) !== 0
      ? {
          amount: Number(cAmount),
          timing: (params.get('ct') === 'due' ? 'due' : 'ordinary') as Timing,
        }
      : null

  return {
    principal: num(params, 'p', DEFAULT_SCENARIO.principal),
    ratePct: num(params, 'r', DEFAULT_SCENARIO.ratePct),
    years: num(params, 't', DEFAULT_SCENARIO.years),
    frequency,
    mode,
    contribution,
  }
}
