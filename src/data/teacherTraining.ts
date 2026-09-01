/*
 * The Personal Finance Teaching Toolkit: the ten units of the personal
 * finance course and the tools each unit uses, in teaching order. This
 * drives both the /teacher-training landing page and the section shell's
 * sidebar, so the two can never drift apart. Units whose tools are still
 * being built have an empty tools list.
 */

export interface TrainingTool {
  /** Path segment under /teacher-training, e.g. 'big-three'. */
  slug: string
  label: string
  description: string
  /**
   * Invisible search vocabulary: the words a teacher might type that the
   * label and description don't contain (mortgage, 401k, FICO, ...).
   */
  keywords?: string[]
}

export interface CourseUnit {
  id: string
  title: string
  /** Two-or-three word unit title for chips and the compressed sidebar. */
  short: string
  description: string
  tools: TrainingTool[]
}

/**
 * Reference material used throughout the course rather than in one unit:
 * shown across the top of the landing page and pinned atop the sidebar.
 */
export const FOUNDATION_TOOLS: TrainingTool[] = [
  {
    slug: 'big-three',
    label: 'The Big Three',
    description: 'The three financial literacy questions, with a quiz, explanations, and stories.',
    keywords: ['quiz', 'financial literacy', 'interest', 'inflation', 'risk', 'diversification'],
  },
  {
    slug: 'tvm-calculator',
    label: 'TVM Calculator',
    description:
      'A financial calculator with N, I/Y, PV, PMT, and FV. Enter any four and solve for the fifth.',
    keywords: ['time value of money', 'present value', 'future value', 'payment', 'annuity', 'discounting'],
  },
  {
    slug: 'literacy-data',
    label: 'Financial Literacy Data',
    description: 'How well U.S. adults understand personal finance, by topic, gender, and generation.',
    keywords: ['survey', 'statistics', 'demographics', 'knowledge'],
  },
  {
    slug: 'checklist',
    label: 'Financial Checklist',
    description: 'A seven-question self-assessment of financial health.',
    keywords: ['financial health', 'habits', 'emergency fund', 'insurance', 'self-assessment'],
  },
]

/** The course's ten units, matching the course outline slide for slide. */
export const COURSE_UNITS: CourseUnit[] = [
  {
    id: 'basics',
    title: 'The Basics of Personal Finance',
    short: 'The Basics',
    description:
      'Compound interest, inflation, and the time value of money.',
    tools: [
      {
        slug: 'compound-interest',
        label: 'Compound Interest Scenario',
        description: 'How a balance grows under compound interest.',
        keywords: ['compounding', 'growth', 'savings', 'interest on interest', 'exponential', 'APY'],
      },
      {
        slug: 'inflation',
        label: 'The Effect of Inflation',
        description:
          'How inflation reduces purchasing power, and which investments keep up with it.',
        keywords: ['prices', 'CPI', 'purchasing power', 'cost of living', 'real return'],
      },
      {
        slug: 'borrow-save',
        label: 'Borrow & Save',
        description: 'The monthly payment on a loan, and the monthly saving needed to reach a goal.',
        keywords: ['loan', 'saving', 'time value of money', 'scenarios', 'interest'],
      },
    ],
  },
  {
    id: 'household-accounting',
    title: 'Accounting for Households',
    short: 'Household Accounting',
    description:
      'The balance sheet, the budget, and saving before spending.',
    tools: [
      {
        slug: 'budget',
        label: 'Financial Budget',
        description:
          'A personal balance sheet and monthly budget.',
        keywords: ['budgeting', 'balance sheet', 'net worth', 'income', 'expenses', 'spending', 'pay yourself first', 'Excel', 'assets', 'liabilities'],
      },
    ],
  },
  {
    id: 'lifecycle',
    title: 'Life-Cycle Model of Saving',
    short: 'Life-Cycle Model',
    description:
      'Borrowing, saving, and spending over a lifetime.',
    tools: [
      {
        slug: 'lifecycle',
        label: 'The Life-Cycle Model',
        description: 'How income, spending, and saving change over a lifetime.',
        keywords: ['life cycle', 'income smoothing', 'consumption', 'borrowing', 'retirement', 'wealth over a lifetime'],
      },
    ],
  },
  {
    id: 'debt-management',
    title: 'Debt Management',
    short: 'Debt Management',
    description:
      'The cost of borrowing and how loans are paid off.',
    tools: [
      {
        slug: 'paying-off-debt',
        label: 'Paying off Debt',
        description:
          'How long a loan takes to pay off, what it costs per month, and how much of each payment is interest.',
        keywords: ['loans', 'credit card', 'student loan', 'payoff', 'amortization', 'minimum payment', 'interest'],
      },
    ],
  },
  {
    id: 'fico',
    title: 'FICO Score and Its Determinants',
    short: 'FICO Score',
    description:
      'What determines a credit score and how the score affects the cost of a loan.',
    tools: [
      {
        slug: 'credit-score',
        label: 'Your FICO Score',
        description: 'What goes into a FICO score, and what a car loan costs at each score range.',
        keywords: ['FICO', 'credit score', 'credit report', 'APR', 'car loan', 'payment history', 'credit history', 'VantageScore'],
      },
    ],
  },
  {
    id: 'purchases',
    title: 'Home, Car, and Other Purchases',
    short: 'Home & Car',
    description:
      'Financing a car and buying or renting a home.',
    tools: [
      {
        slug: 'used-vs-new',
        label: 'Used vs. New',
        description: 'The payment, total interest, and loan balance for a new car versus a used one.',
        keywords: ['cars', 'auto loan', 'used car', 'new car', 'depreciation', 'APR', 'negative equity', 'car payment'],
      },
      {
        slug: 'housing',
        label: 'Buying a Home',
        description: 'The monthly mortgage payment, how much house a lender allows, and the effect of the rate, credit score, and loan term.',
        keywords: ['mortgage', 'house', 'home buying', 'PITI', 'down payment', 'affordability', 'property tax', 'homeowners insurance', 'itemize', '30-year', 'interest rate'],
      },
      {
        slug: 'rent-or-own',
        label: 'Rent or Own',
        description: 'The cost of owning versus renting the same home, and the wealth of each household after thirty years.',
        keywords: ['renting', 'mortgage', 'home', 'house', 'equity', 'landlord', 'wealth', 'buy vs rent'],
      },
    ],
  },
  {
    id: 'education',
    title: 'Investing in Education',
    short: 'Education',
    description:
      'What education costs, what it returns over a working life, and how to pay for it.',
    tools: [],
  },
  {
    id: 'financial-markets',
    title: 'Investing in Financial Markets',
    short: 'Financial Markets',
    description:
      'Returns and risk for stocks and bonds, diversification, fees, and the difference between investing and gambling.',
    tools: [
      {
        slug: 'stocks-bonds',
        label: 'Stocks vs. Bonds',
        description: 'Returns on stocks, bonds, and Treasury bills since 1928, over holding periods from one to thirty years.',
        keywords: ['stocks', 'bonds', 'bills', 'returns', 'risk', 'volatility', 'holding period', 'market history'],
      },
      {
        slug: 'bond-pricing',
        label: 'Pricing a Bond',
        description: 'How a bond is priced from its coupon, its maturity, and the market interest rate.',
        keywords: ['bonds', 'coupon', 'face value', 'par', 'premium', 'discount', 'present value', 'yield', 'treasury', 'T-bill', 'zero coupon', 'valuation'],
      },
      {
        slug: 'bond-rates',
        label: 'Bonds and Interest Rates',
        description: 'Why bond prices fall when interest rates rise, and why long-term bonds fall the most.',
        keywords: ['bonds', 'interest rate risk', 'duration', 'maturity', 'rate shock', 'Silicon Valley Bank', 'SVB', 'treasury', 'losses'],
      },
      {
        slug: 'stock-picker',
        label: 'Stock Diversifier',
        description: 'Invest $1,000 in one of the 100 largest U.S. companies, then spread it across more companies and compare with the index.',
        keywords: ['stocks', 'single stock', 'diversification', 'index fund', 'S&P 500', 'stock picking', 'stock picker', 'market cap', 'basket'],
      },
      {
        slug: 'single-stock',
        label: 'One Stock or the Fund',
        description: 'The most popular stocks of 2000, 2010, and 2021 compared with an index fund over ten years.',
        keywords: ['stocks', 'single stock', 'index fund', 'diversification', 'famous stocks', 'concentration', 'S&P 500'],
      },
      {
        slug: 'index-fund-fees',
        label: 'Index Fund Fees',
        description: 'How the expense ratio affects the balance of an index fund over time.',
        keywords: ['index funds', 'fees', 'expense ratio', 'mutual funds', 'ETF', 'costs', 'compounding'],
      },
      {
        slug: 'gambling-investing',
        label: 'Gambling vs. Investing',
        description: 'The same weekly amount spent on gambling versus invested in an index fund.',
        keywords: ['gambling', 'investing', 'expected value', 'SPY', 'lottery', 'parlay', 'index fund', 'weekly habit'],
      },
      {
        slug: 'gambling-sim',
        label: 'Gambling Simulation',
        description: 'A thousand players bet on blackjack, sports, parlays, or prediction markets at actual house odds.',
        keywords: ['gambling', 'betting', 'sports betting', 'casino', 'blackjack', 'parlays', 'prediction markets', 'house edge', 'odds', 'lottery'],
      },
      {
        slug: 'bitcoin-mining',
        label: 'Bitcoin Mining',
        description:
          'A classroom simulation of bitcoin mining. Students race to find a nonce, add a block to the chain, and read the ledger.',
        keywords: ['bitcoin', 'blockchain', 'crypto', 'cryptocurrency', 'mining', 'hash', 'SHA-256', 'nonce', 'proof of work', 'ledger', 'digital currency', 'halving'],
      },
    ],
  },
  {
    id: 'taxes-benefits',
    title: 'Investing, Taxes and Employer Benefits',
    short: 'Taxes & Benefits',
    description:
      'How income is taxed, how retirement accounts are taxed, and what an employer match is worth.',
    tools: [
      {
        slug: 'taxes',
        label: 'Understanding Taxes',
        description: 'Tax brackets, marginal and effective rates, and how a paycheck is divided between taxes and take-home pay.',
        keywords: ['income tax', 'tax brackets', 'marginal rate', 'effective rate', 'paycheck', 'withholding', 'federal', 'state', 'FICA', 'take-home pay'],
      },
      {
        slug: 'account-taxation',
        label: 'Account Taxation',
        description: 'The after-tax value of the same contribution in a taxable account, a traditional 401(k), and a Roth account.',
        keywords: ['401k', '401(k)', 'Roth', 'traditional', 'IRA', 'retirement accounts', 'tax shelter', 'contributions', 'tax now', 'tax later'],
      },
      {
        slug: 'employer-match',
        label: 'Employer Matching',
        description: 'What an employer match is worth over a career.',
        keywords: ['employer match', '401k', '401(k)', 'matching', 'free money', 'benefits', 'contribution'],
      },
    ],
  },
  {
    id: 'insurance-retirement',
    title: 'Insurance and Retirement Planning',
    short: 'Insurance & Retirement',
    description:
      'How insurance works, and how much to save for retirement.',
    tools: [
      {
        slug: 'insurance',
        label: 'Why Insurance Works',
        description:
          'A thousand households over twenty years, with and without insurance.',
        keywords: ['insurance', 'premium', 'risk pooling', 'expected value', 'load', 'shock', 'renters insurance', 'self-insure', 'deductible', 'claim'],
      },
      {
        slug: 'retirement-simulator',
        label: 'Retirement Planning Simulator',
        description: 'How much savings a retirement income requires, and how much to save each year to reach it.',
        keywords: ['retirement planning', '401k', 'nest egg', 'withdrawal', 'starting age', 'annuity', 'price of waiting'],
      },
      {
        slug: 'savings-rate',
        label: 'Savings Rate and Retirement Date',
        description: 'The share of income saved each year, and the age at which savings can replace earnings.',
        keywords: ['savings rate', 'retirement age', 'financial independence', 'work optional', 'saving share', 'retirement date'],
      },
    ],
  },
]

/** The unit a section page belongs to ('big-three/quiz' matches 'big-three'). */
export function unitForSlug(slug: string): CourseUnit | undefined {
  const root = slug.split('/')[0]!
  return COURSE_UNITS.find((u) => u.tools.some((t) => t.slug === root))
}

/** Whether a section page is one of the course-wide foundation resources. */
export function isFoundationSlug(slug: string): boolean {
  const root = slug.split('/')[0]!
  return FOUNDATION_TOOLS.some((t) => t.slug === root)
}

/** The unit's one-line tool description, reused as the section page's intro. */
export function toolDescription(slug: string): string | undefined {
  const root = slug.split('/')[0]!
  for (const unit of COURSE_UNITS) {
    const tool = unit.tools.find((t) => t.slug === root)
    if (tool) return tool.description
  }
  return FOUNDATION_TOOLS.find((t) => t.slug === root)?.description
}

export interface SequencedTool {
  tool: TrainingTool
  /** Where the tool sits in the course: 'Foundations' or 'Unit N · Short'. */
  badge: string
}

/** Every tool in course order: the foundations first, then unit by unit. */
export const TOOL_SEQUENCE: SequencedTool[] = [
  ...FOUNDATION_TOOLS.map((tool) => ({ tool, badge: 'Foundations' })),
  ...COURSE_UNITS.flatMap((u, i) =>
    u.tools.map((tool) => ({ tool, badge: `Unit ${i + 1} · ${u.short}` })),
  ),
]

/** The tools before and after this page in course order, for prev/next links. */
export function adjacentTools(slug: string): { prev?: SequencedTool; next?: SequencedTool } {
  const root = slug.split('/')[0]!
  const idx = TOOL_SEQUENCE.findIndex((s) => s.tool.slug === root)
  if (idx < 0) return {}
  return { prev: TOOL_SEQUENCE[idx - 1], next: TOOL_SEQUENCE[idx + 1] }
}
