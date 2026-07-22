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
    description: 'The three questions that anchor the course: take the quiz, read the explanations, and see the stories.',
    keywords: ['quiz', 'financial literacy', 'interest', 'inflation', 'risk', 'diversification'],
  },
  {
    slug: 'tvm-calculator',
    label: 'TVM Calculator',
    description:
      'The five-key financial calculator behind every money question in the course: N, I/Y, PV, PMT, and FV. Enter any four and solve for the fifth.',
    keywords: ['time value of money', 'present value', 'future value', 'payment', 'annuity', 'discounting'],
  },
  {
    slug: 'literacy-data',
    label: 'Financial Literacy Data',
    description: 'How U.S. adults score across eight functional areas, drilled down by gender and generation.',
    keywords: ['survey', 'statistics', 'demographics', 'knowledge'],
  },
  {
    slug: 'checklist',
    label: 'Financial Checklist',
    description: 'The Seven Elements of Good Financial Health as a seven-question self-assessment.',
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
      'How money grows and how prices erode it: interest earning interest, inflation, and the time value of money.',
    tools: [
      {
        slug: 'compound-interest',
        label: 'Compound Interest Scenario',
        description: 'Watch interest earn interest, with the math shown and charts ready for a deck.',
        keywords: ['compounding', 'growth', 'savings', 'interest on interest', 'exponential', 'APY'],
      },
      {
        slug: 'inflation',
        label: 'The Effect of Inflation',
        description:
          'Rising prices, shrinking purchasing power, and whether cash, savings, bonds, or stocks keep pace.',
        keywords: ['prices', 'CPI', 'purchasing power', 'cost of living', 'real return'],
      },
      {
        slug: 'borrow-save',
        label: 'Borrow & Save',
        description: 'Guided borrow-and-save scenarios on the time-value-of-money engine.',
        keywords: ['loan', 'saving', 'time value of money', 'scenarios', 'interest'],
      },
    ],
  },
  {
    id: 'household-accounting',
    title: 'Accounting for Households',
    short: 'Household Accounting',
    description:
      'Household accounting: the balance sheet, the budget, and pay-yourself-first saving.',
    tools: [
      {
        slug: 'budget',
        label: 'Financial Budget',
        description:
          'Balance sheet and budget with pay-yourself-first saving, a plan-versus-actual check, and where each dollar of income goes.',
        keywords: ['budgeting', 'balance sheet', 'net worth', 'income', 'expenses', 'spending', 'pay yourself first', 'Excel', 'assets', 'liabilities'],
      },
    ],
  },
  {
    id: 'lifecycle',
    title: 'Life-Cycle Model of Saving',
    short: 'Life-Cycle Model',
    description:
      'Managing money over a lifetime: borrowing young, saving in midlife, and spending in retirement.',
    tools: [
      {
        slug: 'lifecycle',
        label: 'The Life-Cycle Model',
        description: 'Income is hump-shaped; smoothing it explains borrowing young, saving in midlife, and retiring.',
        keywords: ['life cycle', 'income smoothing', 'consumption', 'borrowing', 'retirement', 'wealth over a lifetime'],
      },
    ],
  },
  {
    id: 'debt-management',
    title: 'Debt Management',
    short: 'Debt Management',
    description:
      'What borrowing costs: how long a budgeted payment takes to clear a debt, and what a term costs per month.',
    tools: [
      {
        slug: 'paying-off-debt',
        label: 'Paying off Debt',
        description:
          'Installment loans: how long a budgeted payment takes to clear a debt, what a term costs per month, and where each payment goes.',
        keywords: ['loans', 'credit card', 'student loan', 'payoff', 'amortization', 'minimum payment', 'interest'],
      },
    ],
  },
  {
    id: 'fico',
    title: 'FICO Score and Its Determinants',
    short: 'FICO Score',
    description:
      'What goes into the score that sets the price of credit, and what the same loan costs at every score band.',
    tools: [
      {
        slug: 'credit-score',
        label: 'Your FICO Score',
        description: 'What goes into the score, and what the same car loan costs at every score band.',
        keywords: ['FICO', 'credit score', 'credit report', 'APR', 'car loan', 'payment history', 'credit history', 'VantageScore'],
      },
    ],
  },
  {
    id: 'purchases',
    title: 'Home, Car, and Other Purchases',
    short: 'Home & Car',
    description:
      'The biggest purchases: financing a car, and buying or renting a home.',
    tools: [
      {
        slug: 'used-vs-new',
        label: 'Used vs. New',
        description: 'The same car bought new or a few years old: the payment, the total interest, and how long the loan exceeds the car’s value. Takes real listing prices and rates.',
        keywords: ['cars', 'auto loan', 'used car', 'new car', 'depreciation', 'APR', 'negative equity', 'car payment'],
      },
      {
        slug: 'housing',
        label: 'Buying a Home',
        description: 'PITI, affordability, rate and credit score, the length of the loan, and the itemize test.',
        keywords: ['mortgage', 'house', 'home buying', 'PITI', 'down payment', 'affordability', 'property tax', 'homeowners insurance', 'itemize', '30-year', 'interest rate'],
      },
      {
        slug: 'rent-or-own',
        label: 'Rent or Own',
        description: 'The first-year cost of owning versus renting the same home, then the wealth of each household over the loan’s thirty years.',
        keywords: ['renting', 'mortgage', 'home', 'house', 'equity', 'landlord', 'wealth', 'buy vs rent'],
      },
    ],
  },
  {
    id: 'education',
    title: 'Investing in Education',
    short: 'Education',
    description:
      'What schooling costs, what it returns over a working life, and how to finance it.',
    tools: [],
  },
  {
    id: 'financial-markets',
    title: 'Investing in Financial Markets',
    short: 'Financial Markets',
    description:
      'Risk, diversification, and fees: what stocks and bonds return, why the fund beats the single pick, and why gambling is not investing.',
    tools: [
      {
        slug: 'stocks-bonds',
        label: 'Stocks vs. Bonds',
        description: 'Rolling returns since 1928: pick the start year and window for stocks, then compare against bonds, bills, or the same stocks at another window.',
        keywords: ['stocks', 'bonds', 'bills', 'returns', 'risk', 'volatility', 'holding period', 'market history'],
      },
      {
        slug: 'bond-pricing',
        label: 'Pricing a Bond',
        description: 'A bond is a loan: set the coupon, the maturity, and the market rate, then price the stream of payments the borrower has promised.',
        keywords: ['bonds', 'coupon', 'face value', 'par', 'premium', 'discount', 'present value', 'yield', 'treasury', 'T-bill', 'zero coupon', 'valuation'],
      },
      {
        slug: 'bond-rates',
        label: 'Bonds and Interest Rates',
        description: 'Why prices move opposite rates and why long bonds swing hardest, with the Silicon Valley Bank case priced live.',
        keywords: ['bonds', 'interest rate risk', 'duration', 'maturity', 'rate shock', 'Silicon Valley Bank', 'SVB', 'treasury', 'losses'],
      },
      {
        slug: 'gambling-sim',
        label: 'Gambling Simulation',
        description: 'A thousand players bet at real house odds: blackjack, straight bets, parlays, or prediction markets, and the law of large numbers grinds the group down.',
        keywords: ['gambling', 'betting', 'sports betting', 'casino', 'blackjack', 'parlays', 'prediction markets', 'house edge', 'odds', 'lottery'],
      },
      {
        slug: 'stock-picker',
        label: 'Stock Picker',
        description: 'Commit $1,000 to one of the 100 largest US companies of a real January and watch its actual decade against the index. Most single picks trail.',
        keywords: ['stocks', 'single stock', 'diversification', 'index fund', 'S&P 500', 'stock picking', 'market cap'],
      },
      {
        slug: 'index-fund-fees',
        label: 'Index Fund Fees',
        description: 'The same monthly habit in a fund that owns all 500 companies, with the expense ratio as the only variable: a fee compounds against the balance the way a return compounds for it.',
        keywords: ['index funds', 'fees', 'expense ratio', 'mutual funds', 'ETF', 'costs', 'compounding'],
      },
    ],
  },
  {
    id: 'taxes-benefits',
    title: 'Investing, Taxes and Employer Benefits',
    short: 'Taxes & Benefits',
    description:
      'How income is taxed, how retirement accounts shelter savings, and how an employer match adds free money.',
    tools: [
      {
        slug: 'taxes',
        label: 'Understanding Taxes',
        description: 'Brackets, marginal vs. effective rates, the paycheck, and the accounts that shelter savings.',
        keywords: ['income tax', 'tax brackets', 'marginal rate', 'effective rate', 'paycheck', 'withholding', 'federal', 'state', 'FICA'],
      },
      {
        slug: 'tax-advantages',
        label: 'Tax Advantages',
        description: 'Three parts: how a paycheck is taxed, how taxable, traditional, and Roth accounts are taxed, and how an employer match adds free money.',
        keywords: ['401k', '401(k)', 'Roth', 'traditional', 'IRA', 'employer match', 'retirement accounts', 'tax shelter', 'contributions'],
      },
    ],
  },
  {
    id: 'insurance-retirement',
    title: 'Insurance and Retirement Planning',
    short: 'Insurance & Retirement',
    description:
      'Working backward from a retirement income to the yearly saving that funds it.',
    tools: [
      {
        slug: 'retirement-simulator',
        label: 'Retirement Planning Simulator',
        description: 'The two-step method: the savings that fund a retirement income, then the yearly saving that builds it, and how starting age and savings rate move the date.',
        keywords: ['retirement planning', '401k', 'savings rate', 'nest egg', 'withdrawal', 'starting age', 'annuity'],
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
