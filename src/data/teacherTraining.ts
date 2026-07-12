/*
 * The Personal Finance Teacher Training Institute (July 13-17, 2026, Stanford):
 * the daily lecture schedule and the tools each session uses. This drives both
 * the /teacher-training landing page and the section shell's sidebar, so the
 * two can never drift apart. Sessions with no tools yet render as placeholders.
 */

export interface TrainingTool {
  /** Path segment under /teacher-training, e.g. 'big-three'. */
  slug: string
  label: string
  description: string
}

export interface TrainingSession {
  id: string
  day: string
  date: string
  period: 'Morning' | 'Afternoon'
  lecture: string
  /** Two-or-three word session title for the compressed sidebar. */
  short: string
  speaker: string
  tools: TrainingTool[]
}

/**
 * Reference material used throughout the week rather than in one session:
 * shown across the top of the landing page and pinned atop the sidebar.
 */
export const FOUNDATION_TOOLS: TrainingTool[] = [
  {
    slug: 'big-three',
    label: 'The Big Three',
    description: 'The three questions that anchor the week: take the quiz, read the explanations, and see the stories.',
  },
  {
    slug: 'tvm-calculator',
    label: 'TVM Calculator',
    description:
      'The five-key financial calculator behind every money question this week: N, I/Y, PV, PMT, and FV. Enter any four and solve for the fifth.',
  },
  {
    slug: 'literacy-data',
    label: 'Financial Literacy Data',
    description: 'How U.S. adults score across eight functional areas, drilled down by gender and generation.',
  },
  {
    slug: 'checklist',
    label: 'Financial Checklist',
    description: 'The Seven Elements of Good Financial Health as a seven-question self-assessment.',
  },
]

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'monday-am',
    day: 'Monday',
    date: 'July 13',
    period: 'Morning',
    lecture: 'Building a Financial Literacy Foundation',
    short: 'Financial Literacy Foundations',
    speaker: 'Prof. Lusardi',
    tools: [
      {
        slug: 'compound-interest',
        label: 'Compound Interest Scenario',
        description: 'Watch interest earn interest, with the math shown and charts ready for a deck.',
      },
      {
        slug: 'inflation',
        label: 'The Effect of Inflation',
        description:
          'Rising prices, shrinking purchasing power, and whether cash, savings, bonds, or stocks keep pace.',
      },
      {
        slug: 'borrow-save',
        label: 'Borrow & Save',
        description: 'Guided borrow-and-save scenarios on the time-value-of-money engine.',
      },
    ],
  },
  {
    id: 'monday-pm',
    day: 'Monday',
    date: 'July 13',
    period: 'Afternoon',
    lecture: 'Household Accounting & Budgeting',
    short: 'Household Budgeting',
    speaker: 'Prof. Lusardi',
    tools: [
      {
        slug: 'budget',
        label: 'Financial Budget',
        description:
          'Balance sheet and budget with pay-yourself-first saving, a plan-versus-actual check, and where each dollar of income goes.',
      },
    ],
  },
  {
    id: 'tuesday-am',
    day: 'Tuesday',
    date: 'July 14',
    period: 'Morning',
    lecture: 'Moving from Static to Dynamic Money Management: Lifecycle Model of Savings and Borrowing Responsibly',
    short: 'Life Cycle',
    speaker: 'Prof. Lang',
    tools: [
      {
        slug: 'lifecycle',
        label: 'The Life-Cycle Model',
        description: 'Income is hump-shaped; smoothing it explains borrowing young, saving in midlife, and retiring.',
      },
    ],
  },
  {
    id: 'tuesday-pm',
    day: 'Tuesday',
    date: 'July 14',
    period: 'Afternoon',
    lecture: 'Debt Management & FICO Scores',
    short: 'Debt & FICO Scores',
    speaker: 'Prof. Lusardi',
    tools: [
      {
        slug: 'credit-score',
        label: 'Your FICO Score',
        description: 'What goes into the score, and what the same car loan costs at every score band.',
      },
    ],
  },
  {
    id: 'wednesday-am',
    day: 'Wednesday',
    date: 'July 15',
    period: 'Morning',
    lecture: 'Investing Basics, Risk Management, Basics of Stocks and Bonds',
    short: 'Investing Basics',
    speaker: 'Prof. Boskin',
    tools: [],
  },
  {
    id: 'wednesday-pm',
    day: 'Wednesday',
    date: 'July 15',
    period: 'Afternoon',
    lecture: 'Index & Mutual Funds and Gambling vs. Investing',
    short: 'Gambling vs. Investing',
    speaker: 'Prof. Lang',
    tools: [
      {
        slug: 'gambling-investing',
        label: 'Chance & Ownership',
        description: 'Four stations from pure chance to ownership: the house, the prediction market, the stock picker, and the index fund.',
      },
    ],
  },
  {
    id: 'thursday-am',
    day: 'Thursday',
    date: 'July 16',
    period: 'Morning',
    lecture: 'Tax Efficiency, Employer Benefits, and Planning for Retirement',
    short: 'Taxes & Retirement',
    speaker: 'Prof. Lang',
    tools: [
      {
        slug: 'taxes',
        label: 'Understanding Taxes',
        description: 'Brackets, marginal vs. effective rates, the paycheck, and the accounts that shelter savings.',
      },
      {
        slug: 'retirement-simulator',
        label: 'Retirement Planning Simulator',
        description: 'Four stations: take-home pay, account taxation, employer matching, and retirement timing, each with an exit ticket.',
      },
      {
        slug: 'freedom',
        label: 'When Can You Stop Working?',
        description: 'The savings rate sets the date work becomes optional. Four lives to try, and a match toggle measured in years.',
      },
    ],
  },
  {
    id: 'thursday-pm',
    day: 'Thursday',
    date: 'July 16',
    period: 'Afternoon',
    lecture: 'Housing, Cars, and Durable Goods',
    short: 'Housing & Cars',
    speaker: 'Prof. Lang',
    tools: [
      {
        slug: 'used-vs-new',
        label: 'Used vs. New',
        description: 'The same car bought new or a few years old: payments, interest, and the underwater months, side by side. Type a real listing price straight in.',
      },
      {
        slug: 'housing',
        label: 'Buying a Home',
        description: 'PITI, affordability, rate and credit score, and the itemize test.',
      },
      {
        slug: 'rent-or-own',
        label: 'Rent or Own',
        description: 'The year-one cost test, then the fifteen-year wealth race between an owner and a renter of the same home.',
      },
    ],
  },
  {
    id: 'friday-am',
    day: 'Friday',
    date: 'July 17',
    period: 'Morning',
    lecture: 'Connecting Ideas',
    short: 'Connecting Ideas',
    speaker: 'Prof. Lusardi and Prof. Lang',
    tools: [],
  },
]

/** Days in schedule order, each with its sessions. */
export const TRAINING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
  day,
  date: TRAINING_SESSIONS.find((s) => s.day === day)!.date,
  sessions: TRAINING_SESSIONS.filter((s) => s.day === day),
}))

/** The session a section page belongs to ('big-three/quiz' matches 'big-three'). */
export function sessionForSlug(slug: string): TrainingSession | undefined {
  const root = slug.split('/')[0]!
  return TRAINING_SESSIONS.find((s) => s.tools.some((t) => t.slug === root))
}

/** Whether a section page is one of the week-long foundation resources. */
export function isFoundationSlug(slug: string): boolean {
  const root = slug.split('/')[0]!
  return FOUNDATION_TOOLS.some((t) => t.slug === root)
}

/** The schedule's one-line tool description, reused as the section page's intro. */
export function toolDescription(slug: string): string | undefined {
  const root = slug.split('/')[0]!
  for (const session of TRAINING_SESSIONS) {
    const tool = session.tools.find((t) => t.slug === root)
    if (tool) return tool.description
  }
  return FOUNDATION_TOOLS.find((t) => t.slug === root)?.description
}
