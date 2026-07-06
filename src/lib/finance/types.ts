/**
 * Shared types for the finance math engine.
 *  - Rates are decimals: 8% is `0.08`.
 *  - Money is a plain `number`; rounding happens only at the display boundary.
 *  - Functions are pure.
 */

export type Frequency =
  | { kind: 'periodic'; m: number }
  | { kind: 'continuous' }

export type Timing = 'ordinary' | 'due'

export interface ContributionConfig {
  amount: number
  timing: Timing
}

export interface SeriesPoint {
  t: number
  balance: number
  principalContributed: number
  simpleInterest: number
  interestOnInterest: number
}

export const FREQUENCIES = {
  annual: { kind: 'periodic', m: 1 },
  semiannual: { kind: 'periodic', m: 2 },
  quarterly: { kind: 'periodic', m: 4 },
  monthly: { kind: 'periodic', m: 12 },
  daily: { kind: 'periodic', m: 365 },
  continuous: { kind: 'continuous' },
} as const satisfies Record<string, Frequency>

export type FrequencyName = keyof typeof FREQUENCIES
