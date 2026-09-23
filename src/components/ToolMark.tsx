import type { ReactElement } from 'react'

/*
 * A small drawn mark for each tool, shown beside its name in the catalog.
 *
 * Drawn rather than photographed. A screenshot of a tool goes stale the day
 * the tool changes, and these tools are dense enough that one shrunk to this
 * size is grey noise rather than a chart. A mark is the idea of the chart,
 * which is what a reader scanning a list of names actually wants: a rising
 * curve, a falling one, a spread of bars.
 *
 * What makes them read as a set rather than as thirty unrelated drawings is
 * the shared frame: the same 40 unit box, the same inset, the same stroke,
 * the same two tones. Depart from any of those and the column stops looking
 * drawn and starts looking collected.
 *
 * Within a unit the marks are seen together, so that is where they are kept
 * furthest apart: the six in Investing are a jagged pair, a cash-flow comb, a
 * cross, a scatter, a wedge and a shaved bar, which no one could mistake for
 * each other at this size.
 *
 * They add nothing a screen reader needs, since the tool's name sits beside
 * them, so they are hidden from it.
 */

const ACCENT = 'var(--accent)'
/*
 * The hairline token is a border colour and disappears at this size, so the
 * second tone is muted ink held back instead. It follows the theme, so the
 * marks hold up in dark mode without a second set of values.
 */
const quiet = { stroke: 'var(--text-muted)', strokeOpacity: 0.45 }
const solid = { fill: ACCENT, stroke: 'none' }

function Frame({ children }: { children: ReactElement | ReactElement[] }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

/** A baseline for the marks that sit on one. */
const base = <line key="base" x1="6" y1="33" x2="34" y2="33" {...quiet} />

const MARKS: Record<string, ReactElement> = {
  // 1 · Tools and Data
  // Three questions, the first of them answered.
  'big-three': (
    <Frame>
      <circle cx="9" cy="20" r="5" {...solid} />
      <circle cx="20" cy="20" r="5" {...quiet} />
      <circle cx="31" cy="20" r="5" {...quiet} />
    </Frame>
  ),
  // A keypad: the calculator's registers, one of them live.
  'tvm-calculator': (
    <Frame>
      <rect x="7" y="8" width="12" height="7" {...solid} />
      <rect x="21" y="8" width="12" height="7" {...quiet} />
      <rect x="7" y="19" width="12" height="7" {...quiet} />
      <rect x="21" y="19" width="12" height="7" {...quiet} />
      <rect x="7" y="30" width="12" height="7" {...quiet} />
      <rect x="21" y="30" width="12" height="7" {...quiet} />
    </Frame>
  ),
  // A distribution, the last bar the one being read.
  'literacy-data': (
    <Frame>
      <line x1="8" y1="23" x2="8" y2="32" {...quiet} />
      <line x1="16" y1="17" x2="16" y2="32" {...quiet} />
      <line x1="24" y1="25" x2="24" y2="32" {...quiet} />
      <line x1="32" y1="12" x2="32" y2="32" stroke={ACCENT} />
      {base}
    </Frame>
  ),

  // 2 · Basics of Personal Finance
  // The curve the whole course rests on.
  'compound-interest': (
    <Frame>
      <path d="M7 32 C 17 32, 25 25, 33 8" stroke={ACCENT} />
      {base}
    </Frame>
  ),
  // The same curve the other way up: what a dollar is worth as time passes.
  inflation: (
    <Frame>
      <path d="M7 9 C 15 9, 22 19, 33 30" stroke={ACCENT} />
      {base}
    </Frame>
  ),
  // Two directions from one starting point: saving above, borrowing below.
  'borrow-save': (
    <Frame>
      <line x1="6" y1="20" x2="34" y2="20" {...quiet} />
      <path d="M8 20 C 17 20, 25 15, 33 8" stroke={ACCENT} />
      <path d="M8 20 C 17 20, 25 25, 33 32" {...quiet} />
    </Frame>
  ),

  // 3 · Balance Sheets and Budgeting
  // What is owned over what is owed.
  budget: (
    <Frame>
      <rect x="7" y="10" width="23" height="7" {...solid} />
      <line x1="6" y1="21" x2="34" y2="21" {...quiet} />
      <rect x="7" y="25" width="13" height="7" {...quiet} />
    </Frame>
  ),

  // 4 · Saving Decisions
  // Earnings over a working life: up, then over, then down.
  lifecycle: (
    <Frame>
      <path d="M7 31 C 13 9, 27 9, 33 31" stroke={ACCENT} />
      {base}
    </Frame>
  ),

  // 5 · Debt and Debt Management
  // A balance stepping down to nothing.
  'paying-off-debt': (
    <Frame>
      <path d="M7 9 H14 V17 H21 V24 H28 V31 H33" stroke={ACCENT} />
    </Frame>
  ),

  // 6 · FICO Score
  // A dial, because that is how the number is read.
  'credit-score': (
    <Frame>
      <path d="M8 29 A 12 12 0 0 1 32 29" {...quiet} />
      <line x1="20" y1="29" x2="28.5" y2="20.5" stroke={ACCENT} />
      <circle cx="20" cy="29" r="2.2" {...solid} />
    </Frame>
  ),

  // 7 · Buying a Car
  // Two prices, side by side.
  'used-vs-new': (
    <Frame>
      <rect x="9" y="13" width="9" height="19" {...quiet} />
      <rect x="23" y="21" width="9" height="11" {...solid} />
      {base}
    </Frame>
  ),

  // 8 · Buying a House
  housing: (
    <Frame>
      <path d="M7 21 L20 9 L33 21" stroke={ACCENT} />
      <path d="M11 22 V32 H29 V22" {...quiet} />
    </Frame>
  ),
  // Two paths from the same rent cheque, thirty years apart at the end.
  'rent-or-own': (
    <Frame>
      <path d="M8 31 C 17 31, 24 23, 33 9" stroke={ACCENT} />
      <path d="M8 31 C 17 31, 25 29, 33 24" {...quiet} />
      {base}
    </Frame>
  ),

  // 9 · Investing in Education
  // The cost comes first and the return comes after: a J.
  'education-return': (
    <Frame>
      <line x1="6" y1="22" x2="34" y2="22" {...quiet} />
      <path d="M8 22 C 11 30, 14 32, 18 28 C 24 23, 28 14, 33 8" stroke={ACCENT} />
    </Frame>
  ),
  // What was borrowed, and what it costs to pay it back.
  'student-loans': (
    <Frame>
      <rect x="7" y="16" width="14" height="9" {...quiet} />
      <rect x="21" y="16" width="12" height="9" {...solid} />
    </Frame>
  ),

  // 10 · Investing: Bonds, Stocks and Mutual Funds
  // One line that lurches and one that does not.
  'stocks-bonds': (
    <Frame>
      <path d="M7 30 L12 23 L16 27 L21 16 L26 20 L33 8" stroke={ACCENT} />
      <path d="M7 31 C 16 31, 24 27, 33 21" {...quiet} />
    </Frame>
  ),
  // The bond's own cash flows: the coupons, then the principal.
  'bond-pricing': (
    <Frame>
      <line x1="9" y1="26" x2="9" y2="32" {...quiet} />
      <line x1="15" y1="26" x2="15" y2="32" {...quiet} />
      <line x1="21" y1="26" x2="21" y2="32" {...quiet} />
      <line x1="27" y1="26" x2="27" y2="32" {...quiet} />
      <line x1="33" y1="11" x2="33" y2="32" stroke={ACCENT} />
      {base}
    </Frame>
  ),
  // One goes up, the other goes down.
  'bond-rates': (
    <Frame>
      <path d="M8 30 L32 11" {...quiet} />
      <path d="M8 11 L32 30" stroke={ACCENT} />
    </Frame>
  ),
  // Money spread across many, rather than resting on one.
  'stock-picker': (
    <Frame>
      <circle cx="9" cy="12" r="2.4" {...quiet} />
      <circle cx="12" cy="29" r="2.4" {...quiet} />
      <circle cx="21" cy="8" r="2.4" {...quiet} />
      <circle cx="28" cy="31" r="2.4" {...quiet} />
      <circle cx="32" cy="14" r="2.4" {...quiet} />
      <circle cx="20" cy="21" r="5" {...solid} />
    </Frame>
  ),
  // One company against the whole of them.
  'single-stock': (
    <Frame>
      <circle cx="20" cy="20" r="11" {...quiet} />
      <path d="M20 20 L20 9 A 11 11 0 0 1 30.4 16.6 Z" {...solid} />
    </Frame>
  ),
  // The part of the balance the expense ratio takes off the top.
  'index-fund-fees': (
    <Frame>
      <rect x="12" y="9" width="16" height="6" {...solid} />
      <rect x="12" y="18" width="16" height="14" {...quiet} />
      {base}
    </Frame>
  ),

  // 11 · Special Topics: Gambling, Bitcoin and Crypto
  'gambling-sim': (
    <Frame>
      <rect x="8" y="8" width="24" height="24" {...quiet} />
      <circle cx="14" cy="14" r="2.2" {...solid} />
      <circle cx="20" cy="20" r="2.2" {...solid} />
      <circle cx="26" cy="26" r="2.2" {...solid} />
    </Frame>
  ),
  // One of them compounds and one of them runs out.
  'gambling-investing': (
    <Frame>
      <path d="M7 30 C 16 30, 24 22, 33 8" stroke={ACCENT} />
      <path d="M7 26 L13 31 L33 32" {...quiet} />
      {base}
    </Frame>
  ),
  // Blocks, one after the other.
  'bitcoin-mining': (
    <Frame>
      <rect x="6" y="15" width="10" height="10" {...quiet} />
      <line x1="16" y1="20" x2="24" y2="20" {...quiet} />
      <rect x="24" y="15" width="10" height="10" {...solid} />
    </Frame>
  ),

  // 12 · Personal Taxes
  // The brackets, each step steeper than the last.
  taxes: (
    <Frame>
      <path d="M7 32 H14 V25 H21 V18 H28 V10 H33" stroke={ACCENT} />
    </Frame>
  ),

  // 13 · Employer Benefits
  // The same contribution, three ways.
  'account-taxation': (
    <Frame>
      <rect x="8" y="21" width="7" height="11" {...quiet} />
      <rect x="17" y="16" width="7" height="16" {...quiet} />
      <rect x="26" y="10" width="7" height="22" {...solid} />
      {base}
    </Frame>
  ),
  // What you put in, and the same again on top of it.
  'employer-match': (
    <Frame>
      <rect x="14" y="22" width="13" height="10" {...quiet} />
      <rect x="14" y="10" width="13" height="10" {...solid} />
      {base}
    </Frame>
  ),

  // 14 · Insurance
  // Many small years and the one that is not.
  insurance: (
    <Frame>
      <line x1="9" y1="29" x2="9" y2="32" {...quiet} />
      <line x1="14" y1="29" x2="14" y2="32" {...quiet} />
      <line x1="26" y1="29" x2="26" y2="32" {...quiet} />
      <line x1="31" y1="29" x2="31" y2="32" {...quiet} />
      <line x1="20" y1="9" x2="20" y2="32" stroke={ACCENT} />
      {base}
    </Frame>
  ),

  // 15 · Planning for Retirement
  // How much of the target is in hand.
  'retirement-simulator': (
    <Frame>
      <rect x="13" y="8" width="14" height="24" {...quiet} />
      <rect x="13" y="21" width="14" height="11" {...solid} />
    </Frame>
  ),
  // The share of each year's income that is put away.
  'savings-rate': (
    <Frame>
      <circle cx="20" cy="20" r="11" {...quiet} />
      <path d="M20 9 A 11 11 0 0 1 28.8 26.8" stroke={ACCENT} />
    </Frame>
  ),
}

/** The mark for a tool, or nothing where one has not been drawn. */
export function ToolMark({ slug }: { slug: string }) {
  return MARKS[slug] ?? null
}

/** Every slug that has a mark, so the catalog can check its own coverage. */
export const MARKED_SLUGS = Object.keys(MARKS)
