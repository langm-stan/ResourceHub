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
  { key: 'consuming', label: 'Consuming / Budgeting', national: 49, color: '#946803' },
  { key: 'saving', label: 'Saving', national: 48, color: '#6E7630' },
  { key: 'risk', label: 'Comprehending Risk', national: 46, color: '#1E756A' },
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

/* ------------------------------------------------------------------ *
 * Added from the IFDM conference deck "Using Data to Strengthen
 * Teaching" (Lusardi & Lang, Teaching Personal Finance Conference,
 * September 2026). Every figure below is read from that deck's native
 * chart data rather than from a picture of a chart, so it carries the
 * precision the deck carries.
 * ------------------------------------------------------------------ */

/** The four bands the P-Fin Index reports, lowest first. */
export const BANDS = [
  { key: 'low', label: '0–7 correct', share: 'Under 26%', color: '#8C1515' },
  { key: 'lowMid', label: '8–14 correct', share: '26–50%', color: '#C77B2B' },
  { key: 'highMid', label: '15–21 correct', share: '51–75%', color: '#6E7630' },
  { key: 'high', label: '22–28 correct', share: '76–100%', color: '#1E756A' },
] as const

/*
 * What financial literacy is associated with. The share of each band who
 * are certain they could raise $2,000 for an unexpected need within a
 * month, and the share who have ever worked out how much they need to save
 * for retirement. Source: P-Fin Index 2026.
 */
export const OUTCOMES_BY_BAND: {
  band: string
  /** % certain they could come up with $2,000 within a month. */
  couldRaise2000: number
  /** % who have tried to work out what they need to retire. */
  planned: number
}[] = [
  { band: 'Under 26%', couldRaise2000: 29, planned: 21 },
  { band: '26–50%', couldRaise2000: 37, planned: 31 },
  { band: '51–75%', couldRaise2000: 62, planned: 52 },
  { band: '76–100%', couldRaise2000: 76, planned: 64 },
]

/*
 * Ten years of the same survey. The share of U.S. adults in each band, and
 * the average share of the 28 questions answered correctly.
 * Source: P-Fin Index 2017-2026.
 */
export const DECADE: {
  year: number
  low: number
  lowMid: number
  highMid: number
  high: number
  average: number
}[] = [
  { year: 2017, low: 19.7, lowMid: 31.9, highMid: 32.3, high: 16.1, average: 49.4 },
  { year: 2018, low: 20.6, lowMid: 28.4, highMid: 34.9, high: 16.2, average: 50.0 },
  { year: 2019, low: 20.0, lowMid: 26.7, highMid: 35.1, high: 18.2, average: 51.1 },
  { year: 2020, low: 16.8, lowMid: 30.2, highMid: 33.0, high: 19.9, average: 52.0 },
  { year: 2021, low: 20.5, lowMid: 28.1, highMid: 33.9, high: 17.5, average: 50.4 },
  { year: 2022, low: 22.8, lowMid: 26.0, highMid: 32.7, high: 18.4, average: 49.9 },
  { year: 2023, low: 25.0, lowMid: 26.3, highMid: 32.7, high: 16.0, average: 47.9 },
  { year: 2024, low: 24.3, lowMid: 27.8, highMid: 31.6, high: 16.3, average: 48.0 },
  { year: 2025, low: 23.0, lowMid: 27.8, highMid: 31.6, high: 16.3, average: 49.0 },
  { year: 2026, low: 25.0, lowMid: 29.0, highMid: 32.0, high: 15.0, average: 47.0 },
]

/*
 * The full 28-question index by functional area, nine years apart. Seven of
 * the eight are flat or lower in 2026 than in 2017; only saving rose, by a
 * point. Source: P-Fin Index 2026 and 2017.
 */
export const AREA_THEN_NOW: { area: string; y2017: number; y2026: number }[] = [
  { area: 'Comprehending risk', y2017: 39, y2026: 36 },
  { area: 'Insuring', y2017: 44, y2026: 41 },
  { area: 'Investing', y2017: 46, y2026: 44 },
  { area: 'Earning', y2017: 49, y2026: 46 },
  { area: 'Go-to information sources', y2017: 47, y2026: 47 },
  { area: 'Consuming', y2017: 53, y2026: 48 },
  { area: 'Saving', y2017: 53, y2026: 54 },
  { area: 'Borrowing', y2017: 61, y2026: 58 },
]

/*
 * The Big Three: the share answering all three questions correctly.
 * Source: National Financial Capability Study (NFCS) 2024.
 */
export const BIG_THREE_ALL_CORRECT: {
  dimension: 'Age' | 'Education' | 'Gender'
  rows: { group: string; value: number }[]
}[] = [
  {
    dimension: 'Age',
    rows: [
      { group: '18–29', value: 13.4 },
      { group: '30–44', value: 21.5 },
      { group: '45–59', value: 30.4 },
      { group: '60+', value: 42.4 },
    ],
  },
  {
    dimension: 'Education',
    rows: [
      { group: 'High school or less', value: 11.0 },
      { group: 'Some college', value: 25.7 },
      { group: 'College degree or more', value: 47.2 },
    ],
  },
  {
    dimension: 'Gender',
    rows: [
      { group: 'Women', value: 20.8 },
      { group: 'Men', value: 36.5 },
    ],
  },
]

/*
 * The youngest adults know the least, and the gap is wide at both ends.
 * Share of each age group in each band, and the group's average.
 * Source: P-Fin Index 2026.
 */
export const BANDS_BY_AGE: {
  group: string
  low: number
  lowMid: number
  highMid: number
  high: number
  average: number
}[] = [
  { group: '18–29', low: 37, lowMid: 28, highMid: 26, high: 9, average: 38 },
  { group: '30–44', low: 28, lowMid: 29, highMid: 28, high: 16, average: 46 },
  { group: '45–59', low: 22, lowMid: 28, highMid: 34, high: 16, average: 49 },
  { group: '60+', low: 17, lowMid: 29, highMid: 37, high: 17, average: 52 },
]

export const SOURCE_DECK =
  'Lusardi & Lang, "Using Data to Strengthen Teaching", Teaching Personal Finance Conference, September 2026'
export const SOURCE_NFCS = 'FINRA Investor Education Foundation, National Financial Capability Study, 2024'
