/**
 * Curated classroom "intuition pumps." Each is a fully-specified scenario plus a
 * one-line teaching caption.
 */
import type { Scenario } from './state'

export interface Preset {
  id: string
  title: string
  caption: string
  scenario: Scenario
}

export const PRESETS: Preset[] = [
  {
    id: 'start-early',
    title: 'Start early vs. start late',
    caption:
      'Forty years of an extra decade. Begin at 25 instead of 35 and compounding does the rest.',
    scenario: {
      principal: 0,
      ratePct: 8,
      years: 40,
      frequency: 'monthly',
      mode: 'fv',
      contribution: { amount: 400, timing: 'ordinary' },
    },
  },
  {
    id: 'discounting-shock',
    title: 'The discounting shock',
    caption: 'A promise of $100,000 in 50 years at 8% is worth only about $2,132 today.',
    scenario: {
      principal: 100_000,
      ratePct: 8,
      years: 50,
      frequency: 'annual',
      mode: 'pv',
      contribution: null,
    },
  },
  {
    id: 'frequency-myth',
    title: 'Does frequency really matter?',
    caption:
      'Annual, monthly, or continuous: at 10% for 30 years the gap is real but smaller than most expect.',
    scenario: {
      principal: 10_000,
      ratePct: 10,
      years: 30,
      frequency: 'continuous',
      mode: 'fv',
      contribution: null,
    },
  },
  {
    id: 'latte',
    title: 'The small-habit fund',
    caption: 'About $5 a day ($150 a month) at 7% for 40 years grows to six figures.',
    scenario: {
      principal: 0,
      ratePct: 7,
      years: 40,
      frequency: 'monthly',
      mode: 'fv',
      contribution: { amount: 150, timing: 'ordinary' },
    },
  },
  {
    id: 'rule-of-72',
    title: 'How long to double?',
    caption: 'At 8%, money doubles in about 9 years, exactly what the Rule of 72 predicts.',
    scenario: {
      principal: 10_000,
      ratePct: 8,
      years: 18,
      frequency: 'annual',
      mode: 'fv',
      contribution: null,
    },
  },
  {
    id: 'long-horizon',
    title: 'A lifetime of compounding',
    caption: 'A single $2,000 contribution at 9% over 50 years. Watch interest-on-interest take over.',
    scenario: {
      principal: 2000,
      ratePct: 9,
      years: 50,
      frequency: 'annual',
      mode: 'fv',
      contribution: null,
    },
  },
]
