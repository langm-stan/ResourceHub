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

function num(params: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = params.get(key)
  if (raw == null) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  // Clamp to the same bounds the tool's own inputs enforce, so a hand-edited
  // link cannot load a negative principal or an absurd magnitude.
  return Math.min(max, Math.max(min, n))
}

const STORAGE_KEY = 'ifdm-compound-scenario-v1'

/** Remember the scenario so leaving the tool and coming back restores it. */
export function saveScenario(s: Scenario): void {
  try {
    localStorage.setItem(STORAGE_KEY, toSearchParams(s).toString())
  } catch {
    /* storage unavailable: the URL still carries the scenario */
  }
}

/** The saved scenario, or null when none is stored or storage is unavailable. */
export function loadSavedScenario(): Scenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseScenario(new URLSearchParams(raw)) : null
  } catch {
    return null
  }
}

/** True when the URL carries any scenario parameter (a shared or embedded link). */
export function hasScenarioParams(params: URLSearchParams): boolean {
  return ['p', 'r', 't', 'f', 'mode', 'c'].some((k) => params.has(k))
}

export function parseScenario(params: URLSearchParams): Scenario {
  const freqCode = params.get('f')
  const frequency: FrequencyName =
    freqCode && CODE_FREQ[freqCode] ? CODE_FREQ[freqCode] : DEFAULT_SCENARIO.frequency
  const mode: Mode = params.get('mode') === 'pv' ? 'pv' : 'fv'

  // Contribution amounts get the same clamp as the tool's input (0..10,000);
  // anything that clamps to zero means no contribution.
  const cAmount = num(params, 'c', 0, 0, 10_000)
  const contribution =
    cAmount > 0
      ? {
          amount: cAmount,
          timing: (params.get('ct') === 'due' ? 'due' : 'ordinary') as Timing,
        }
      : null

  return {
    principal: num(params, 'p', DEFAULT_SCENARIO.principal, 0, 1_000_000),
    ratePct: num(params, 'r', DEFAULT_SCENARIO.ratePct, 0, 40),
    years: num(params, 't', DEFAULT_SCENARIO.years, 1, 100),
    frequency,
    mode,
    contribution,
  }
}
