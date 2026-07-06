/*
 * Federal tax parameters for TAX YEAR 2026 — verified July 2026 against primary
 * sources, cross-checked against Tax Foundation with no discrepancies:
 *
 * - Brackets + standard deduction: IRS Rev. Proc. 2025-32
 *   https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
 *   https://taxfoundation.org/data/all/federal/2026-tax-brackets/
 * - Social Security wage base: SSA 2026 COLA fact sheet
 *   https://www.ssa.gov/news/en/cola/factsheets/2026.html
 * - Medicare rates + Additional Medicare Tax (statutory, not indexed):
 *   https://www.irs.gov/taxtopics/tc751 and /tc560
 * - Retirement contribution limits: IRS Notice 2025-67
 *   https://www.irs.gov/pub/irs-drop/n-25-67.pdf
 *
 * When updating for a new tax year: replace every number in this file, update
 * TAX_YEAR, and re-run the checks in the tool's "math" notes (max OASDI etc.).
 */

export const TAX_YEAR = 2026

export type FilingStatus = 'single' | 'mfj'

export interface Bracket {
  /** Marginal rate as a decimal, e.g. 0.22. */
  rate: number
  /** Taxable income where this bracket ends (Infinity for the top bracket). */
  upTo: number
}

export const BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { rate: 0.1, upTo: 12_400 },
    { rate: 0.12, upTo: 50_400 },
    { rate: 0.22, upTo: 105_700 },
    { rate: 0.24, upTo: 201_775 },
    { rate: 0.32, upTo: 256_225 },
    { rate: 0.35, upTo: 640_600 },
    { rate: 0.37, upTo: Number.POSITIVE_INFINITY },
  ],
  mfj: [
    { rate: 0.1, upTo: 24_800 },
    { rate: 0.12, upTo: 100_800 },
    { rate: 0.22, upTo: 211_400 },
    { rate: 0.24, upTo: 403_550 },
    { rate: 0.32, upTo: 512_450 },
    { rate: 0.35, upTo: 768_700 },
    { rate: 0.37, upTo: Number.POSITIVE_INFINITY },
  ],
}

export const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16_100,
  mfj: 32_200,
}

export const FICA = {
  /** Employee OASDI (Social Security) rate. */
  ssRate: 0.062,
  /** 2026 Social Security taxable wage base. Max employee OASDI = $11,439. */
  ssWageBase: 184_500,
  /** Employee Medicare rate — applies to ALL wages, no cap. */
  medicareRate: 0.0145,
  /** Additional Medicare Tax rate on wages above the threshold. */
  additionalMedicareRate: 0.009,
  /** Statutory thresholds (IRC §3101(b)(2)) — deliberately NOT inflation-indexed. */
  additionalMedicareThreshold: { single: 200_000, mfj: 250_000 } as Record<FilingStatus, number>,
}

export const CONTRIBUTION_LIMITS = {
  /** 401(k)/403(b)/457/TSP employee elective deferral, 2026. */
  k401: 24_500,
  /** IRA (Traditional + Roth combined), 2026. */
  ira: 7_500,
}

export const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married filing jointly',
}
