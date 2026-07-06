// Source: "A Decade of Tracking Financial Literacy in America" — Findings from the 2026
// TIAA Institute–GFLEC Personal Finance Index (P-Fin Index), published June 2026.
// Yakoboski, Lusardi, Sticha & Mastry. Survey fielded Jan 5–22, 2026, n=3,602 U.S. adults
// (Ipsos KnowledgePanel), weighted to be nationally representative.
// https://gflec.org/wp-content/uploads/2026/06/TIAA_GFLEC_Report_AnnualPFin_June2026_fin2.pdf

export type AreaKey =
  | 'earning'
  | 'consuming'
  | 'saving'
  | 'investing'
  | 'borrowing'
  | 'insuring'
  | 'risk'
  | 'goto'

export const NATIONAL = {
  fullIndexAvg2026: 47, // % of 28 P-Fin Index questions answered correctly, 2026
  fullIndexAvgNeverExceeded: 52, // has never exceeded this since 2017
  pfin8Avg2026: 46, // % of P-Fin 8 proxy questions answered correctly, 2026
  lowLiteracyShare2026: 25, // % answering 7 or fewer of 28 questions correctly, 2026
  lowLiteracyShare2017: 20, // same, 2017
  highLiteracyShare2026: 15, // % answering 22+ of 28 questions correctly, 2026
}

// Single P-Fin 8 proxy question per functional area, 2026 survey — most precise
// area-level snapshot the report provides as a flat national number.
export const AREAS: { key: AreaKey; label: string; national: number; color: string }[] = [
  { key: 'earning', label: 'Earning', national: 56, color: '#8C1515' },
  { key: 'investing', label: 'Investing', national: 54, color: '#B1040E' },
  { key: 'consuming', label: 'Consuming / Budgeting', national: 49, color: '#E5A00D' },
  { key: 'saving', label: 'Saving', national: 48, color: '#8F993E' },
  { key: 'risk', label: 'Comprehending Risk', national: 46, color: '#279989' },
  { key: 'goto', label: 'Go-To Information Sources', national: 46, color: '#5A4FCF' },
  { key: 'borrowing', label: 'Borrowing & Managing Debt', national: 40, color: '#008566' },
  { key: 'insuring', label: 'Insuring', national: 27, color: '#6D1010' },
]

// Full 28-question P-Fin Index, % answered correctly within each functional area — by gender.
// Figure 4, p.10.
export const GENDER_BY_AREA: Record<AreaKey, { group: string; value: number }[]> = {
  borrowing: [
    { group: 'Men', value: 60 },
    { group: 'Women', value: 56 },
  ],
  saving: [
    { group: 'Men', value: 57 },
    { group: 'Women', value: 51 },
  ],
  consuming: [
    { group: 'Men', value: 48 },
    { group: 'Women', value: 48 },
  ],
  earning: [
    { group: 'Men', value: 48 },
    { group: 'Women', value: 44 },
  ],
  goto: [
    { group: 'Men', value: 50 },
    { group: 'Women', value: 45 },
  ],
  investing: [
    { group: 'Men', value: 50 },
    { group: 'Women', value: 39 },
  ],
  insuring: [
    { group: 'Men', value: 44 },
    { group: 'Women', value: 38 },
  ],
  risk: [
    { group: 'Men', value: 39 },
    { group: 'Women', value: 33 },
  ],
}

// Full 28-question P-Fin Index, % answered correctly within each functional area — by generation.
// Figure 5, p.11. Gen Z 1997–2007, Gen Y 1981–96, Gen X 1965–80, Baby boomers 1946–64, Silent ≤1945.
export const GENERATION_BY_AREA: Record<AreaKey, { group: string; value: number }[]> = {
  borrowing: [
    { group: 'Gen Z', value: 47 },
    { group: 'Gen Y', value: 57 },
    { group: 'Gen X', value: 60 },
    { group: 'Boomers', value: 65 },
    { group: 'Silent', value: 58 },
  ],
  saving: [
    { group: 'Gen Z', value: 45 },
    { group: 'Gen Y', value: 54 },
    { group: 'Gen X', value: 55 },
    { group: 'Boomers', value: 61 },
    { group: 'Silent', value: 52 },
  ],
  consuming: [
    { group: 'Gen Z', value: 43 },
    { group: 'Gen Y', value: 47 },
    { group: 'Gen X', value: 51 },
    { group: 'Boomers', value: 51 },
    { group: 'Silent', value: 41 },
  ],
  earning: [
    { group: 'Gen Z', value: 37 },
    { group: 'Gen Y', value: 46 },
    { group: 'Gen X', value: 48 },
    { group: 'Boomers', value: 53 },
    { group: 'Silent', value: 42 },
  ],
  goto: [
    { group: 'Gen Z', value: 42 },
    { group: 'Gen Y', value: 47 },
    { group: 'Gen X', value: 49 },
    { group: 'Boomers', value: 51 },
    { group: 'Silent', value: 45 },
  ],
  investing: [
    { group: 'Gen Z', value: 35 },
    { group: 'Gen Y', value: 43 },
    { group: 'Gen X', value: 47 },
    { group: 'Boomers', value: 51 },
    { group: 'Silent', value: 50 },
  ],
  insuring: [
    { group: 'Gen Z', value: 25 },
    { group: 'Gen Y', value: 37 },
    { group: 'Gen X', value: 46 },
    { group: 'Boomers', value: 53 },
    { group: 'Silent', value: 49 },
  ],
  risk: [
    { group: 'Gen Z', value: 33 },
    { group: 'Gen Y', value: 36 },
    { group: 'Gen X', value: 36 },
    { group: 'Boomers', value: 39 },
    { group: 'Silent', value: 32 },
  ],
}

// Overall full 28-question P-Fin Index score (not broken out by functional area) — Figure A2, p.35.
export const OVERALL_BY_EDUCATION = [
  { group: 'Less than HS', value: 30 },
  { group: 'High school', value: 36 },
  { group: 'Some college / associate', value: 46 },
  { group: "Bachelor's or higher", value: 61 },
]

export const OVERALL_BY_INCOME = [
  { group: '<$25k', value: 28 },
  { group: '$25k–50k', value: 35 },
  { group: '$50k–100k', value: 45 },
  { group: '$100k+', value: 55 },
]

export const OVERALL_BY_RACE = [
  { group: 'Asian', value: 53 },
  { group: 'White', value: 51 },
  { group: 'Hispanic', value: 39 },
  { group: 'Black', value: 36 },
]

export const OVERALL_BY_GENDER = [
  { group: 'Men', value: 50 },
  { group: 'Women', value: 44 },
]

export const OVERALL_BY_GENERATION = [
  { group: 'Gen Z', value: 38 },
  { group: 'Gen Y', value: 46 },
  { group: 'Gen X', value: 49 },
  { group: 'Boomers', value: 54 },
  { group: 'Silent', value: 47 },
]
