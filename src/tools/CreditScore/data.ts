/*
 * Your FICO Score: the five factor weights and the auto-loan rates by score
 * band. Verified July 2026.
 *
 * - Factor weights and guidance: myFICO, "What's in my FICO Scores"
 *   (https://www.myfico.com/credit-education/whats-in-your-credit-score),
 *   the same source the Econ 43 lecture slides cite.
 * - Average auto-loan APRs by score band: Experian, State of the Automotive
 *   Finance Market, Q1 2026 (as reported by NerdWallet's rate table).
 *   Experian reports these by VantageScore band; FICO bands are similar.
 *   When updating for a new year, re-check both APR columns.
 */

export interface ScoreFactor {
  key: string
  label: string
  /** Percent of the FICO score. The five weights sum to 100. */
  weight: number
  /** CSS color token for this factor's slice. */
  color: string
  what: string
  tips: string[]
}

export const SCORE_FACTORS: ScoreFactor[] = [
  {
    key: 'payment-history',
    label: 'Payment history',
    weight: 35,
    color: 'var(--c-series-1)',
    what: 'Whether you have paid past credit accounts on time. Your track record of payments is the strongest single predictor that you will pay your debts.',
    tips: [
      'Pay every bill on time, every month',
      'If you have missed payments, get current and stay current',
      'Ask creditors whether your rates can be lowered, so debts get paid off faster',
    ],
  },
  {
    key: 'amounts-owed',
    label: 'Amounts owed',
    weight: 30,
    color: 'var(--c-series-2)',
    what: 'How much total debt you carry, and especially credit utilization: the share of your available credit you are using. A high share signals you may be overextended.',
    tips: [
      'Keep track of what you owe and how much of each limit you use',
      'Keep utilization low; balances near the limit read as maxing out',
      'Pay down installment loans to show you can and will repay',
    ],
  },
  {
    key: 'length-of-history',
    label: 'Length of credit history',
    weight: 15,
    color: 'var(--c-series-3)',
    what: 'How long your accounts have been open: the age of your oldest account, your newest one, and the average across all of them.',
    tips: [
      'Starting out? A secured credit card begins the record',
      'A family member with good credit can join as a co-applicant',
      'Pay on time and keep balances low, so the long record is a good one',
    ],
  },
  {
    key: 'credit-mix',
    label: 'Credit mix',
    weight: 10,
    color: 'var(--c-series-4)',
    what: 'Your ability to manage different types of credit: credit cards, retail accounts, installment loans, a mortgage. It does not mean you should apply for every type.',
    tips: [
      'Manage the accounts you already have well before adding new kinds',
      'Do not open accounts just to diversify the mix',
    ],
  },
  {
    key: 'new-credit',
    label: 'New credit',
    weight: 10,
    color: 'var(--c-series-5)',
    what: 'Recently opened accounts and hard inquiries, which can affect the score for about 12 months. Several new accounts in a short stretch reads as risk to lenders.',
    tips: [
      'Do not open several accounts in a short period',
      'Check your credit report; checking your own score never hurts it',
      'Ask whether you really need the account before applying',
    ],
  },
]

export interface ScoreBand {
  key: string
  /** Experian's tier name for the band. */
  label: string
  min: number
  max: number
  newApr: number
  usedApr: number
}

/** Average auto-loan APRs by score band. Experian, Q1 2026. Best band first. */
export const SCORE_BANDS: ScoreBand[] = [
  { key: 'super-prime', label: 'Super prime', min: 781, max: 850, newApr: 0.0455, usedApr: 0.063 },
  { key: 'prime', label: 'Prime', min: 661, max: 780, newApr: 0.0623, usedApr: 0.0877 },
  { key: 'near-prime', label: 'Near prime', min: 601, max: 660, newApr: 0.0967, usedApr: 0.1403 },
  { key: 'subprime', label: 'Subprime', min: 501, max: 600, newApr: 0.1344, usedApr: 0.1942 },
  { key: 'deep-subprime', label: 'Deep subprime', min: 300, max: 500, newApr: 0.1601, usedApr: 0.2177 },
]

export const BEST_BAND = SCORE_BANDS[0]!

export function bandForScore(score: number): ScoreBand {
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]!
}

/** The lecture's investing assumption: put the payment difference to work at 5%. */
export const INVEST_RATE = 0.05
