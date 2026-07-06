# Next session: design consistency + balance sheet/budget UX

Context for a fresh session with no memory of prior conversation. This ResourceHub project
is a clickable prototype of Stanford IFDM's Resource Hub (`ifdm.stanford.edu/resourcehub`),
built with Vite + React + TypeScript. Two sibling projects exist:
- `ResourceHub/` (this one) — the prototype site itself.
- `../Toolkit/` — a separate, more polished "financial toolkit" project the user built
  independently, whose design system + finance engine + 3 tool pages were ported into
  this project's `src/design-system/`, `src/lib/finance/`, `src/tools/` in the prior session.

## The core problem

There are now **two unrelated design systems in one app**:

1. **The original look** (Hub, Big Three, Financial Literacy Data, Financial Checkup,
   Faculty Insights) — Tailwind utility classes, Source Serif Pro / Source Sans Pro fonts
   (loaded via Google Fonts CDN in `src/index.css`), Stanford cardinal `#8C1515` as
   Tailwind theme color, card-heavy layout with visible borders/shadows.
2. **The ported Toolkit look** (Calculators only, `src/pages/Calculators.tsx`) — Inter
   Variable font, a CSS-custom-property token system (`src/styles/tokens.css`), CSS
   Modules per component (`src/design-system/*.module.css`), warm-paper neutrals,
   minimal/editorial aesthetic. Scoped under a `.toolkitScope` wrapper class
   (`src/styles/toolkitBase.css`) specifically so it wouldn't leak into the rest of the
   site.

Verified: the left sidebar nav (`src/components/ResourceHubShell.tsx`) itself has
identical computed CSS (font-family, color, weight) whether you're on `/checkup` or
`/calculators` — the scoping works correctly. So the "nav bar changes font and color"
complaint is very likely about the **overall page feeling different** when landing on
Calculators vs. everywhere else (different card style, different accent red, different
headline font, different spacing rhythm) rather than a literal CSS leak. That's a real
inconsistency even though the sidebar CSS in isolation is technically fine — worth
independently re-verifying with fresh eyes/screenshots before committing to the fix below,
since this diagnosis was made under time pressure at the end of a long session.

## Part 0 (do this first): "Budgeting & Balance Sheet" is duplicated — merge, don't keep both

The user flagged this directly: the Calculators page's third tool,
**"Budgeting & Balance Sheet"** (`src/tools/Budgeting/BudgetPage.tsx`, ported from the
Toolkit), does the same job as the **Financial Checkup** page's **Balance Sheet** and
**Budget** tabs (`src/pages/Checkup.tsx`). Two separate places for the same task is
confusing and redundant. Resolution:

1. **Remove `BudgetPage` from Calculators.** Edit `src/pages/Calculators.tsx` — drop the
   `budgeting` entry from the `TOOLS` array and the `BudgetPage` import. Calculators
   ends up with just two tools: Compound Interest and Time Value of Money (both genuinely
   calculation/lesson tools with no overlap elsewhere). The `src/tools/Budgeting/`
   directory's *code* isn't wasted — see next step.
2. **Bring `BudgetPage`'s better UX into `Checkup.tsx`, replacing the current
   implementation**, not the other way around. The ported `BudgetPage` component is a
   nicer, more thought-out interface (free-form `LineItemsEditor` line items, live
   income/expense totals, a "your goal" tab showing what leftover money could grow into)
   than the current `AccountGroupCard.tsx` / `BudgetPanel.tsx` — this directly satisfies
   the "make the balance sheet and budget more user-friendly" ask below, so treat Part 0
   and Part 2 as one merged effort, not two separate tasks.
3. **The one thing `BudgetPage` doesn't have that `Checkup.tsx` does: persistence.**
   `BudgetPage` today uses plain `useState` (resets on every reload) — it was designed as
   a stateless teaching demo. `Checkup.tsx` has `useFinancialSnapshot()`
   (`src/hooks/useFinancialSnapshot.ts`) wired to localStorage, snapshot history/trend,
   the "example data" disclosure banner, and Excel/JSON export. When merging, keep the
   persistence layer and swap in the nicer UI on top of it — i.e., port
   `LineItemsEditor` + the 50/30/20 meter/Sankey visuals into `Checkup.tsx`'s Balance
   Sheet/Budget tabs, but keep reading/writing through `useFinancialSnapshot()` so nothing
   about privacy/export/history regresses.
4. Watch for a data-shape mismatch while doing this: `useFinancialSnapshot`'s
   `AccountGroup`/`BudgetCategory` types (`src/data/checkupData.ts`) are fixed-category
   (matches the real Stanford balance-sheet Excel template, and
   `src/lib/exportExcel.ts`'s `exportBalanceSheetXlsx`/`exportBudgetXlsx` depend on that
   exact shape) — `LineItemsEditor`'s `LineItem` type
   (`src/tools/Budgeting/components/LineItemsEditor.tsx`) is free-form
   (id/label/amount, no fixed categories). Either (a) generalize
   `useFinancialSnapshot`/`exportExcel.ts` to handle free-form line items grouped under a
   small set of top-level groups (Assets/Liabilities, Income/Expenses), or (b) keep the
   fixed categories but let each category *contain* free-form sub-items the user names
   themselves. (a) is the more faithful merge; (b) is less work. Decide based on how much
   the Excel export needs to keep matching the original template exactly.

## Recommended fix: unify on ONE design system, not two

The Toolkit's system (`src/design-system/`, `src/lib/finance/`, `src/styles/tokens.css`)
is more mature: real design tokens (light + dark theme support already built),
accessibility features (`useReducedMotion`, focus rings), a presentation/projection zoom
mode, KaTeX math rendering, and a properly tested finance engine. Recommend making it the
**site-wide standard** rather than keeping it siloed to Calculators:

1. Replace the Google Fonts Source Serif Pro / Source Sans Pro import in `src/index.css`
   with Inter Variable (already installed as `@fontsource-variable/inter`, imported in
   `src/main.tsx`).
2. Remove the `.toolkitScope` scoping in `src/styles/toolkitBase.css` — promote it to
   apply globally (to `body`/`html` like the original Toolkit `base.css` did) once nothing
   else depends on Source Serif Pro / Source Sans Pro.
3. Rebuild the remaining pages' components to use `src/design-system/` primitives
   (`Card`, `Button`, `Stat`, `SectionHeader`, `StepHeader`, `Callout`, `Tabs`,
   `SegmentedControl`, `NumberField`) instead of raw Tailwind-styled `<div>`s, so every
   page shares the same card/button/input/heading treatment:
   - `src/pages/Hub.tsx` + `src/components/HubCard.tsx`
   - `src/pages/BigThree.tsx`, `BigThreeQuiz.tsx`, `BigThreeExplained.tsx`, `BigThreeStories.tsx`
   - `src/pages/LiteracyData.tsx`
   - `src/pages/Checkup.tsx` + `src/components/checkup/*`
   - `src/pages/FacultyInsights.tsx`
   - `src/components/ResourceHubShell.tsx`, `Header.tsx`, `Footer.tsx` (the shared chrome)
4. Tailwind can stay for layout utilities (flex/grid/spacing) — the recommendation is to
   stop using Tailwind for *color and typography*, and route all of that through the
   design tokens instead, so there's exactly one place (`tokens.css`) that defines "what
   red is cardinal" and "what the heading font is."
5. Recharts is still used in `LiteracyData.tsx` and `checkup/BudgetPanel.tsx` /
   `NetWorthChart.tsx` (this is also the source of 3 pre-existing, harmless TS typing
   errors — `Tooltip formatter` type mismatch — safe to fix while touching these files:
   change `formatter={(v: number) => ...}` to accept `ValueType | undefined`). Consider
   whether these should be reimplemented with the Toolkit's bespoke
   `design-system/chart/` primitives (d3-scale/d3-shape, no charting library) for visual
   consistency with the Calculators charts, or left as Recharts if that's not worth the
   effort.

This is a real site-wide visual pass — budget it as the primary chunk of the next
session, not a quick fix.

## Part 2: Make the Financial Checkup's Balance Sheet + Budget tabs more user-friendly

Location: `src/pages/Checkup.tsx`, `src/components/checkup/AccountGroupCard.tsx`,
`src/components/checkup/BudgetPanel.tsx`, `src/hooks/useFinancialSnapshot.ts`.

Current state: a fixed, fairly long list of preset sub-categories per asset/liability
group (Cash/Checking, Savings/MM, CDs, Other Liquid, Stocks, Bonds, ...) rendered as
plain bordered rows with inline number inputs — functional but form-like, and everyone
sees every category whether or not it applies to them (lots of visible `$0` rows).

**This is now the same task as Part 0 above** — merging the ported `BudgetPage`'s nicer
UI into `Checkup.tsx` (with its persistence kept) *is* the user-friendliness fix. Do them
together. Remaining improvements beyond that merge, roughly in priority order:

1. **Reskin with the design system** (ties directly into the "unify design system"
   section below) — use `NumberField` for every dollar input, `Card` for section
   containers, `Stat` for the net worth / totals headline (this also gets you the
   `useCountUp` animation for free), `SectionHeader`/`StepHeader` for consistent
   headings.
2. **Add plain-English explanations** for the four balance-sheet ratios (Liquid
   Assets/Total Assets, Short-Term Debt/Liquid Assets, Total Liabilities/Total Assets,
   Total Liabilities/Net Worth) — right now they're just labeled numbers, which assumes
   financial literacy the tool is supposed to be building. Use the `Callout` component
   for a one-line "what this means" per ratio, possibly on hover/click to avoid clutter.
3. **Recheck mobile/narrow-viewport layout** — most of this session's testing was done at
   1440px desktop width; the two-column Assets/Liabilities grid and the 5-key-calculator
   grid (already fixed once this session for a similar narrow-container issue, see
   `src/tools/Tvm/components/TvmCalculator.module.css`'s container query) should be
   spot-checked at mobile widths.
4. **Keep as-is**: the localStorage persistence model, the "example data" banner
   (`StorageNotice.tsx`), snapshot history/trend chart (`NetWorthChart.tsx`), and
   Excel/JSON export (`SnapshotControls.tsx`, `lib/exportExcel.ts`) — these were
   deliberately designed for privacy/portability in an earlier session and work well;
   just reskin their visual treatment, don't rearchitect the underlying logic.

## Known open items from earlier sessions (still unresolved, lower priority)

- **Seven Elements of Good Financial Health checklist** (`src/data/checklistItems.tsx`,
  rendered in `Checkup.tsx`'s "Health Checklist" tab) — real content, already in place
  from the user's own paste. No action needed, just noting it's done (earlier summaries
  may have called it a placeholder; it was filled in since).
- **Big Three Explained, questions 2 & 3** (`src/pages/BigThreeExplained.tsx`) — only
  question 1 (compound interest) has verified real explanation text from
  `ifdm.stanford.edu`; questions 2 (inflation) and 3 (risk diversification) show an
  honest "content pending" placeholder because that domain blocks automated fetches.
  Needs either the real text pasted in, or working browser access to fetch it directly.
- **Faculty Insights lesson content** — titles are real (verified against user
  screenshots of the live site), video thumbnails are real (YouTube oEmbed), but no
  per-lesson written summary/description beyond the title exists. Low priority unless
  the user wants more depth there.
