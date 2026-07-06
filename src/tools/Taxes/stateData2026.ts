/*
 * State individual income tax parameters for TAX YEAR 2026 — compiled July
 * 2026 from the Tax Foundation's "2026 State Individual Income Tax Rates and
 * Brackets" table (rates as in effect January 1, 2026):
 *   https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
 * Cross-checked against the Tax Foundation's "2026 State Tax Changes Taking
 * Effect January 1st" (rate cuts in IN, KY, MS, MT, NE, NC, OH, OK).
 *
 * Teaching simplifications, stated in the UI:
 * - State taxable income = wages − 401(k) − the state's deduction below. The
 *   `deduction` field bundles the standard deduction and personal exemption
 *   where the state gives them as income offsets. Where a state gives the
 *   exemption as a flat tax CREDIT instead, it is in `credit`.
 * - Phase-outs of deductions/exemptions/credits at high incomes (CT, ME, RI,
 *   UT, WI, ...), benefit recapture (NY), and federal-tax deductibility
 *   (AL, OR partial) are NOT modeled.
 * - LOCAL income taxes (Maryland counties, New York City, Ohio
 *   municipalities, ...) are NOT included — flagged per state in `note`.
 * - Zero-rate lower brackets (ID, MS, MO, ND, OH, OK, SC, DE) are encoded as
 *   explicit 0% brackets.
 *
 * When updating for a new tax year: refresh every number from the new Tax
 * Foundation table and bump STATE_TAX_YEAR.
 */
import type { Bracket, FilingStatus } from './data2026'

export const STATE_TAX_YEAR = 2026

export interface StateTaxConfig {
  name: string
  type: 'none' | 'flat' | 'progressive'
  /** Marginal brackets on state taxable income (after `deduction`). */
  brackets?: Record<FilingStatus, Bracket[]>
  /** Standard deduction plus personal exemption, where they offset income. */
  deduction?: Record<FilingStatus, number>
  /** Flat credit subtracted from the computed tax (floored at zero). */
  credit?: Record<FilingStatus, number>
  /** One-line caveat surfaced in the UI. */
  note?: string
}

const INF = Number.POSITIVE_INFINITY

/** Same bracket schedule for both filing statuses. */
function all(brackets: Bracket[]): Record<FilingStatus, Bracket[]> {
  return { single: brackets, mfj: brackets }
}

function flat(rate: number): Record<FilingStatus, Bracket[]> {
  return all([{ rate, upTo: INF }])
}

export const STATE_TAXES: Record<string, StateTaxConfig> = {
  AL: {
    name: 'Alabama',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.02, upTo: 500 },
        { rate: 0.04, upTo: 3_000 },
        { rate: 0.05, upTo: INF },
      ],
      mfj: [
        { rate: 0.02, upTo: 1_000 },
        { rate: 0.04, upTo: 6_000 },
        { rate: 0.05, upTo: INF },
      ],
    },
    deduction: { single: 4_500, mfj: 11_500 },
    note: 'Alabama also lets filers deduct federal income tax paid, which this model skips, so it overstates the bill somewhat.',
  },
  AK: { name: 'Alaska', type: 'none' },
  AZ: {
    name: 'Arizona',
    type: 'flat',
    brackets: flat(0.025),
    deduction: { single: 8_350, mfj: 16_700 },
  },
  AR: {
    name: 'Arkansas',
    type: 'progressive',
    brackets: all([
      { rate: 0.02, upTo: 4_600 },
      { rate: 0.039, upTo: INF },
    ]),
    deduction: { single: 2_470, mfj: 4_940 },
    credit: { single: 29, mfj: 58 },
  },
  CA: {
    name: 'California',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.01, upTo: 11_079 },
        { rate: 0.02, upTo: 26_264 },
        { rate: 0.04, upTo: 41_452 },
        { rate: 0.06, upTo: 57_542 },
        { rate: 0.08, upTo: 72_724 },
        { rate: 0.093, upTo: 371_479 },
        { rate: 0.103, upTo: 445_771 },
        { rate: 0.113, upTo: 742_953 },
        { rate: 0.123, upTo: 1_000_000 },
        { rate: 0.133, upTo: INF },
      ],
      mfj: [
        { rate: 0.01, upTo: 22_158 },
        { rate: 0.02, upTo: 52_528 },
        { rate: 0.04, upTo: 82_904 },
        { rate: 0.06, upTo: 115_084 },
        { rate: 0.08, upTo: 145_448 },
        { rate: 0.093, upTo: 742_958 },
        { rate: 0.103, upTo: 891_542 },
        { rate: 0.113, upTo: 1_000_000 },
        { rate: 0.123, upTo: 1_485_906 },
        { rate: 0.133, upTo: INF },
      ],
    },
    deduction: { single: 5_540, mfj: 11_080 },
    credit: { single: 153, mfj: 306 },
    note: 'The 13.3% top rate includes the 1% mental-health surtax over $1M. The 1.3% SDI payroll tax is not included.',
  },
  CO: {
    name: 'Colorado',
    type: 'flat',
    brackets: flat(0.044),
    deduction: { single: 16_100, mfj: 32_200 },
  },
  CT: {
    name: 'Connecticut',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.02, upTo: 10_000 },
        { rate: 0.045, upTo: 50_000 },
        { rate: 0.055, upTo: 100_000 },
        { rate: 0.06, upTo: 200_000 },
        { rate: 0.065, upTo: 250_000 },
        { rate: 0.069, upTo: 500_000 },
        { rate: 0.0699, upTo: INF },
      ],
      mfj: [
        { rate: 0.02, upTo: 20_000 },
        { rate: 0.045, upTo: 100_000 },
        { rate: 0.055, upTo: 200_000 },
        { rate: 0.06, upTo: 400_000 },
        { rate: 0.065, upTo: 500_000 },
        { rate: 0.069, upTo: 1_000_000 },
        { rate: 0.0699, upTo: INF },
      ],
    },
    deduction: { single: 15_000, mfj: 24_000 },
    note: 'The personal exemption phases out at higher incomes and high earners face benefit recapture, neither modeled here.',
  },
  DE: {
    name: 'Delaware',
    type: 'progressive',
    brackets: all([
      { rate: 0, upTo: 2_000 },
      { rate: 0.022, upTo: 5_000 },
      { rate: 0.039, upTo: 10_000 },
      { rate: 0.048, upTo: 20_000 },
      { rate: 0.052, upTo: 25_000 },
      { rate: 0.0555, upTo: 60_000 },
      { rate: 0.066, upTo: INF },
    ]),
    deduction: { single: 3_250, mfj: 6_500 },
    credit: { single: 110, mfj: 220 },
    note: 'Wilmington levies a local wage tax, not included.',
  },
  DC: {
    name: 'District of Columbia',
    type: 'progressive',
    brackets: all([
      { rate: 0.04, upTo: 10_000 },
      { rate: 0.06, upTo: 40_000 },
      { rate: 0.065, upTo: 60_000 },
      { rate: 0.085, upTo: 250_000 },
      { rate: 0.0925, upTo: 500_000 },
      { rate: 0.0975, upTo: 1_000_000 },
      { rate: 0.1075, upTo: INF },
    ]),
    deduction: { single: 16_100, mfj: 32_200 },
  },
  FL: { name: 'Florida', type: 'none' },
  GA: {
    name: 'Georgia',
    type: 'flat',
    brackets: flat(0.0519),
    deduction: { single: 12_000, mfj: 24_000 },
  },
  HI: {
    name: 'Hawaii',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.014, upTo: 9_600 },
        { rate: 0.032, upTo: 14_400 },
        { rate: 0.055, upTo: 19_200 },
        { rate: 0.064, upTo: 24_000 },
        { rate: 0.068, upTo: 36_000 },
        { rate: 0.072, upTo: 48_000 },
        { rate: 0.076, upTo: 125_000 },
        { rate: 0.079, upTo: 175_000 },
        { rate: 0.0825, upTo: 225_000 },
        { rate: 0.09, upTo: 275_000 },
        { rate: 0.1, upTo: 325_000 },
        { rate: 0.11, upTo: INF },
      ],
      mfj: [
        { rate: 0.014, upTo: 19_200 },
        { rate: 0.032, upTo: 28_800 },
        { rate: 0.055, upTo: 38_400 },
        { rate: 0.064, upTo: 48_000 },
        { rate: 0.068, upTo: 72_000 },
        { rate: 0.072, upTo: 96_000 },
        { rate: 0.076, upTo: 250_000 },
        { rate: 0.079, upTo: 350_000 },
        { rate: 0.0825, upTo: 450_000 },
        { rate: 0.09, upTo: 550_000 },
        { rate: 0.1, upTo: 650_000 },
        { rate: 0.11, upTo: INF },
      ],
    },
    deduction: { single: 5_544, mfj: 11_088 },
  },
  ID: {
    name: 'Idaho',
    type: 'flat',
    brackets: {
      single: [
        { rate: 0, upTo: 4_811 },
        { rate: 0.053, upTo: INF },
      ],
      mfj: [
        { rate: 0, upTo: 9_622 },
        { rate: 0.053, upTo: INF },
      ],
    },
    deduction: { single: 16_100, mfj: 32_200 },
  },
  IL: {
    name: 'Illinois',
    type: 'flat',
    brackets: flat(0.0495),
    deduction: { single: 2_925, mfj: 5_850 },
  },
  IN: {
    name: 'Indiana',
    type: 'flat',
    brackets: flat(0.0295),
    deduction: { single: 1_000, mfj: 2_000 },
    note: 'Indiana counties add their own income taxes, not included.',
  },
  IA: {
    name: 'Iowa',
    type: 'flat',
    brackets: flat(0.038),
    deduction: { single: 16_100, mfj: 32_200 },
    credit: { single: 40, mfj: 80 },
  },
  KS: {
    name: 'Kansas',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.052, upTo: 23_000 },
        { rate: 0.0558, upTo: INF },
      ],
      mfj: [
        { rate: 0.052, upTo: 46_000 },
        { rate: 0.0558, upTo: INF },
      ],
    },
    deduction: { single: 12_765, mfj: 26_560 },
  },
  KY: {
    name: 'Kentucky',
    type: 'flat',
    brackets: flat(0.035),
    deduction: { single: 3_360, mfj: 3_360 },
    note: 'Kentucky does not double the deduction for joint filers. Local occupational taxes are not included.',
  },
  LA: {
    name: 'Louisiana',
    type: 'flat',
    brackets: flat(0.03),
    deduction: { single: 12_875, mfj: 25_750 },
  },
  ME: {
    name: 'Maine',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.058, upTo: 27_399 },
        { rate: 0.0675, upTo: 64_849 },
        { rate: 0.0715, upTo: INF },
      ],
      mfj: [
        { rate: 0.058, upTo: 54_849 },
        { rate: 0.0675, upTo: 129_749 },
        { rate: 0.0715, upTo: INF },
      ],
    },
    deduction: { single: 13_650, mfj: 27_300 },
    note: 'The deduction and exemption phase out at higher incomes, not modeled here.',
  },
  MD: {
    name: 'Maryland',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.02, upTo: 1_000 },
        { rate: 0.03, upTo: 2_000 },
        { rate: 0.04, upTo: 3_000 },
        { rate: 0.0475, upTo: 100_000 },
        { rate: 0.05, upTo: 125_000 },
        { rate: 0.0525, upTo: 150_000 },
        { rate: 0.055, upTo: 250_000 },
        { rate: 0.0575, upTo: 500_000 },
        { rate: 0.0625, upTo: 1_000_000 },
        { rate: 0.065, upTo: INF },
      ],
      mfj: [
        { rate: 0.02, upTo: 1_000 },
        { rate: 0.03, upTo: 2_000 },
        { rate: 0.04, upTo: 3_000 },
        { rate: 0.0475, upTo: 150_000 },
        { rate: 0.05, upTo: 175_000 },
        { rate: 0.0525, upTo: 225_000 },
        { rate: 0.055, upTo: 300_000 },
        { rate: 0.0575, upTo: 600_000 },
        { rate: 0.0625, upTo: 1_200_000 },
        { rate: 0.065, upTo: INF },
      ],
    },
    deduction: { single: 6_550, mfj: 13_100 },
    note: 'Maryland counties add roughly 2.2% to 3.3% of income on top, not included here.',
  },
  MA: {
    name: 'Massachusetts',
    type: 'progressive',
    brackets: all([
      { rate: 0.05, upTo: 1_083_150 },
      { rate: 0.09, upTo: INF },
    ]),
    deduction: { single: 4_400, mfj: 8_800 },
    note: 'The 9% rate is the 5% rate plus the 4% millionaire surtax above $1,083,150.',
  },
  MI: {
    name: 'Michigan',
    type: 'flat',
    brackets: flat(0.0425),
    deduction: { single: 5_900, mfj: 11_800 },
    note: 'Some Michigan cities, including Detroit, levy their own income tax, not included.',
  },
  MN: {
    name: 'Minnesota',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.0535, upTo: 33_310 },
        { rate: 0.068, upTo: 109_430 },
        { rate: 0.0785, upTo: 203_150 },
        { rate: 0.0985, upTo: INF },
      ],
      mfj: [
        { rate: 0.0535, upTo: 48_700 },
        { rate: 0.068, upTo: 193_480 },
        { rate: 0.0785, upTo: 337_930 },
        { rate: 0.0985, upTo: INF },
      ],
    },
    deduction: { single: 15_300, mfj: 30_600 },
  },
  MS: {
    name: 'Mississippi',
    type: 'flat',
    brackets: all([
      { rate: 0, upTo: 10_000 },
      { rate: 0.04, upTo: INF },
    ]),
    deduction: { single: 8_300, mfj: 16_600 },
  },
  MO: {
    name: 'Missouri',
    type: 'progressive',
    brackets: all([
      { rate: 0, upTo: 1_348 },
      { rate: 0.02, upTo: 2_696 },
      { rate: 0.025, upTo: 4_044 },
      { rate: 0.03, upTo: 5_392 },
      { rate: 0.035, upTo: 6_740 },
      { rate: 0.04, upTo: 8_088 },
      { rate: 0.045, upTo: 9_436 },
      { rate: 0.047, upTo: INF },
    ]),
    deduction: { single: 16_100, mfj: 32_200 },
    note: 'Kansas City and St. Louis add a 1% earnings tax, not included.',
  },
  MT: {
    name: 'Montana',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.047, upTo: 47_500 },
        { rate: 0.0565, upTo: INF },
      ],
      mfj: [
        { rate: 0.047, upTo: 95_000 },
        { rate: 0.0565, upTo: INF },
      ],
    },
    deduction: { single: 16_100, mfj: 32_200 },
  },
  NE: {
    name: 'Nebraska',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.0246, upTo: 4_130 },
        { rate: 0.0351, upTo: 24_760 },
        { rate: 0.0455, upTo: INF },
      ],
      mfj: [
        { rate: 0.0246, upTo: 8_250 },
        { rate: 0.0351, upTo: 49_530 },
        { rate: 0.0455, upTo: INF },
      ],
    },
    deduction: { single: 8_850, mfj: 17_700 },
    credit: { single: 176, mfj: 352 },
  },
  NV: { name: 'Nevada', type: 'none' },
  NH: {
    name: 'New Hampshire',
    type: 'none',
    note: 'New Hampshire repealed its interest and dividends tax as of 2025; wages were never taxed.',
  },
  NJ: {
    name: 'New Jersey',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.014, upTo: 20_000 },
        { rate: 0.0175, upTo: 35_000 },
        { rate: 0.035, upTo: 40_000 },
        { rate: 0.0553, upTo: 75_000 },
        { rate: 0.0637, upTo: 500_000 },
        { rate: 0.0897, upTo: 1_000_000 },
        { rate: 0.1075, upTo: INF },
      ],
      mfj: [
        { rate: 0.014, upTo: 20_000 },
        { rate: 0.0175, upTo: 50_000 },
        { rate: 0.0245, upTo: 70_000 },
        { rate: 0.035, upTo: 80_000 },
        { rate: 0.0553, upTo: 150_000 },
        { rate: 0.0637, upTo: 500_000 },
        { rate: 0.0897, upTo: 1_000_000 },
        { rate: 0.1075, upTo: INF },
      ],
    },
    deduction: { single: 1_000, mfj: 2_000 },
    note: 'New Jersey has no standard deduction, only a small personal exemption.',
  },
  NM: {
    name: 'New Mexico',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.015, upTo: 5_500 },
        { rate: 0.032, upTo: 16_500 },
        { rate: 0.043, upTo: 33_500 },
        { rate: 0.047, upTo: 66_500 },
        { rate: 0.049, upTo: 210_000 },
        { rate: 0.059, upTo: INF },
      ],
      mfj: [
        { rate: 0.015, upTo: 8_000 },
        { rate: 0.032, upTo: 25_000 },
        { rate: 0.043, upTo: 50_000 },
        { rate: 0.047, upTo: 100_000 },
        { rate: 0.049, upTo: 315_000 },
        { rate: 0.059, upTo: INF },
      ],
    },
    deduction: { single: 16_100, mfj: 32_200 },
  },
  NY: {
    name: 'New York',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.039, upTo: 8_500 },
        { rate: 0.044, upTo: 11_700 },
        { rate: 0.0515, upTo: 13_900 },
        { rate: 0.054, upTo: 80_650 },
        { rate: 0.059, upTo: 215_400 },
        { rate: 0.0685, upTo: 1_077_550 },
        { rate: 0.0965, upTo: 5_000_000 },
        { rate: 0.103, upTo: 25_000_000 },
        { rate: 0.109, upTo: INF },
      ],
      mfj: [
        { rate: 0.039, upTo: 17_150 },
        { rate: 0.044, upTo: 23_600 },
        { rate: 0.0515, upTo: 27_900 },
        { rate: 0.054, upTo: 161_550 },
        { rate: 0.059, upTo: 323_200 },
        { rate: 0.0685, upTo: 2_155_350 },
        { rate: 0.0965, upTo: 5_000_000 },
        { rate: 0.103, upTo: 25_000_000 },
        { rate: 0.109, upTo: INF },
      ],
    },
    deduction: { single: 8_000, mfj: 16_050 },
    note: 'New York City (roughly 3% to 3.9%) and Yonkers taxes are not included.',
  },
  NC: {
    name: 'North Carolina',
    type: 'flat',
    brackets: flat(0.0399),
    deduction: { single: 12_750, mfj: 25_500 },
  },
  ND: {
    name: 'North Dakota',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0, upTo: 48_475 },
        { rate: 0.0195, upTo: 244_825 },
        { rate: 0.025, upTo: INF },
      ],
      mfj: [
        { rate: 0, upTo: 80_975 },
        { rate: 0.0195, upTo: 298_075 },
        { rate: 0.025, upTo: INF },
      ],
    },
    deduction: { single: 16_100, mfj: 32_200 },
  },
  OH: {
    name: 'Ohio',
    type: 'flat',
    brackets: all([
      { rate: 0, upTo: 26_050 },
      { rate: 0.0275, upTo: INF },
    ]),
    deduction: { single: 2_400, mfj: 4_800 },
    note: 'Ohio moved to a flat tax in 2026. Municipal income taxes (about 1.2% on average) are not included.',
  },
  OK: {
    name: 'Oklahoma',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0, upTo: 3_750 },
        { rate: 0.025, upTo: 4_900 },
        { rate: 0.035, upTo: 7_200 },
        { rate: 0.045, upTo: INF },
      ],
      mfj: [
        { rate: 0, upTo: 7_500 },
        { rate: 0.025, upTo: 9_800 },
        { rate: 0.035, upTo: 14_400 },
        { rate: 0.045, upTo: INF },
      ],
    },
    deduction: { single: 7_350, mfj: 14_700 },
  },
  OR: {
    name: 'Oregon',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.0475, upTo: 4_550 },
        { rate: 0.0675, upTo: 11_400 },
        { rate: 0.0875, upTo: 125_000 },
        { rate: 0.099, upTo: INF },
      ],
      mfj: [
        { rate: 0.0475, upTo: 9_100 },
        { rate: 0.0675, upTo: 22_800 },
        { rate: 0.0875, upTo: 250_000 },
        { rate: 0.099, upTo: INF },
      ],
    },
    deduction: { single: 2_910, mfj: 5_820 },
    credit: { single: 256, mfj: 512 },
    note: 'Oregon lets filers deduct part of their federal tax, and the Portland area adds local taxes; neither is modeled.',
  },
  PA: {
    name: 'Pennsylvania',
    type: 'flat',
    brackets: flat(0.0307),
    note: 'Pennsylvania has no deductions or exemptions, taxes 401(k) contributions (unlike this model), and most municipalities add a local earned-income tax.',
  },
  RI: {
    name: 'Rhode Island',
    type: 'progressive',
    brackets: all([
      { rate: 0.0375, upTo: 82_050 },
      { rate: 0.0475, upTo: 186_450 },
      { rate: 0.0599, upTo: INF },
    ]),
    deduction: { single: 16_450, mfj: 32_900 },
    note: 'The deduction and exemption phase out at higher incomes, not modeled here.',
  },
  SC: {
    name: 'South Carolina',
    type: 'progressive',
    brackets: all([
      { rate: 0, upTo: 3_640 },
      { rate: 0.03, upTo: 18_230 },
      { rate: 0.06, upTo: INF },
    ]),
    deduction: { single: 8_350, mfj: 16_700 },
  },
  SD: { name: 'South Dakota', type: 'none' },
  TN: { name: 'Tennessee', type: 'none' },
  TX: { name: 'Texas', type: 'none' },
  UT: {
    name: 'Utah',
    type: 'flat',
    brackets: flat(0.045),
    credit: { single: 966, mfj: 1_932 },
    note: 'Utah gives a taxpayer credit instead of a deduction; it phases out at higher incomes, which this model skips.',
  },
  VT: {
    name: 'Vermont',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.0335, upTo: 49_400 },
        { rate: 0.066, upTo: 119_700 },
        { rate: 0.076, upTo: 249_700 },
        { rate: 0.0875, upTo: INF },
      ],
      mfj: [
        { rate: 0.0335, upTo: 82_500 },
        { rate: 0.066, upTo: 199_450 },
        { rate: 0.076, upTo: 304_000 },
        { rate: 0.0875, upTo: INF },
      ],
    },
    deduction: { single: 12_950, mfj: 25_900 },
  },
  VA: {
    name: 'Virginia',
    type: 'progressive',
    brackets: all([
      { rate: 0.02, upTo: 3_000 },
      { rate: 0.03, upTo: 5_000 },
      { rate: 0.05, upTo: 17_000 },
      { rate: 0.0575, upTo: INF },
    ]),
    deduction: { single: 9_680, mfj: 19_360 },
  },
  WA: {
    name: 'Washington',
    type: 'none',
    note: 'Washington taxes no wages. It does tax large capital gains (7%, more over $1M), which this wage tool does not cover.',
  },
  WV: {
    name: 'West Virginia',
    type: 'progressive',
    brackets: all([
      { rate: 0.0222, upTo: 10_000 },
      { rate: 0.0296, upTo: 25_000 },
      { rate: 0.0333, upTo: 40_000 },
      { rate: 0.0444, upTo: 60_000 },
      { rate: 0.0482, upTo: INF },
    ]),
    deduction: { single: 2_000, mfj: 4_000 },
    note: 'West Virginia uses the same brackets for all filing statuses.',
  },
  WI: {
    name: 'Wisconsin',
    type: 'progressive',
    brackets: {
      single: [
        { rate: 0.035, upTo: 15_110 },
        { rate: 0.044, upTo: 51_950 },
        { rate: 0.053, upTo: 332_720 },
        { rate: 0.0765, upTo: INF },
      ],
      mfj: [
        { rate: 0.035, upTo: 20_150 },
        { rate: 0.044, upTo: 69_260 },
        { rate: 0.053, upTo: 443_630 },
        { rate: 0.0765, upTo: INF },
      ],
    },
    deduction: { single: 13_960, mfj: 25_840 },
    note: 'The standard deduction phases out as income rises, not modeled here.',
  },
  WY: { name: 'Wyoming', type: 'none' },
}

export type StateCode = keyof typeof STATE_TAXES

/** Alphabetical by full state name, for the picker. */
export const STATE_OPTIONS: { value: string; label: string }[] = Object.entries(STATE_TAXES)
  .map(([code, cfg]) => ({ value: code, label: cfg.name }))
  .sort((a, b) => a.label.localeCompare(b.label))
