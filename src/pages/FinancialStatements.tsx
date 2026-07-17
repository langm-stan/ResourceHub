import { useMemo, useState } from 'react'
import SnapshotControls from '../components/checkup/SnapshotControls'
import StorageNotice from '../components/checkup/StorageNotice'
import { LineItemsEditor } from '../components/checkup/LineItemsEditor'
import { PlanVsActual } from '../components/checkup/PlanVsActual'
import { IncomePie } from '../components/checkup/IncomePie'
import { GoalChart } from '../components/checkup/GoalChart'
import { useFinancialSnapshot } from '../hooks/useFinancialSnapshot'
import { GROUP_HINTS, sumItems } from '../data/checkupData'
import { exportBalanceSheetXlsx, exportBudgetXlsx } from '../lib/exportExcel'
import { growthSeries } from '../lib/finance'
import { fmtPct, formatPercent, formatUSDWhole, texUSD } from '../lib/format'
import {
  Callout,
  Card,
  FormulaBlock,
  NumberField,
  Slider,
  Stat,
  StepHeader,
  Tabs,
  type TabItem,
} from '../design-system'

/*
 * The interactive Balance Sheet + Budget + Goal. This one component is the
 * single source of truth for the tool: the prototype's Financial Budget page
 * wraps it in the site shell (standalone={false}), and the Stanford embed
 * builds render it bare for ifdm.stanford.edu/resourcehub/financial-statements.
 * No site chrome, no router dependency; everything a visitor types stays in
 * their own browser (localStorage).
 */

type TabKey = 'balance-sheet' | 'budget' | 'goal'

const TABS: TabItem<TabKey>[] = [
  { value: 'balance-sheet', label: 'Balance Sheet' },
  { value: 'budget', label: 'Budget' },
  { value: 'goal', label: 'Your Goal' },
]

const GREEN = 'var(--c-series-1)'
const CARDINAL = 'var(--c-accent)'

export default function FinancialStatements({ standalone = true }: { standalone?: boolean }) {
  const [tab, setTab] = useState<TabKey>('balance-sheet')
  const [goalRate, setGoalRate] = useState(7)
  const [goalYears, setGoalYears] = useState(10)
  const {
    snapshot,
    totalAssets,
    totalLiabilities,
    netWorth,
    totalIncome,
    totalExpenses,
    totalSaving,
    isExampleData,
    setGroupItems,
    setIncomeItems,
    setExpenseItems,
    setSavingItems,
    importFile,
    loadExampleData,
    clearAll,
  } = useFinancialSnapshot()

  // Saving is money kept, not spent: whatever income does not go to expenses
  // is investable each month, with the budgeted saving as its deliberate part
  // and the leftover on top.
  const investable = totalIncome - totalExpenses
  const leftover = investable - totalSaving
  const monthly = Math.max(0, investable)
  const savingsRate = totalIncome > 0 ? monthly / totalIncome : 0

  const goalSeries = useMemo(
    () =>
      growthSeries({
        principal: 0,
        annualRate: goalRate / 100,
        years: goalYears,
        freq: { kind: 'periodic', m: 12 },
        contribution: monthly > 0 ? { amount: monthly, timing: 'ordinary' } : undefined,
      }).points,
    [monthly, goalRate, goalYears]
  )
  const goalFinal = goalSeries.length ? goalSeries[goalSeries.length - 1]!.balance : 0
  const goalContributed = monthly * goalYears * 12

  const ratios = useMemo(() => {
    const liquid = snapshot.assets.find((g) => g.key === 'liquid')
    const shortTerm = snapshot.liabilities.find((g) => g.key === 'short-term')
    const liquidTotal = liquid ? sumItems(liquid.items) : 0
    const shortTermTotal = shortTerm ? sumItems(shortTerm.items) : 0
    return [
      {
        label: 'Liquid Assets / Total Assets',
        value: totalAssets ? (liquidTotal / totalAssets) * 100 : 0,
        explain:
          'How much of what you own you could turn into cash quickly. Higher means more flexibility when a surprise expense hits.',
      },
      {
        label: 'Short-Term Debt / Liquid Assets',
        value: liquidTotal ? (shortTermTotal / liquidTotal) * 100 : 0,
        explain: 'Could your cash on hand cover the debts due soon? Under 100% means yes.',
      },
      {
        label: 'Total Liabilities / Total Assets',
        value: totalAssets ? (totalLiabilities / totalAssets) * 100 : 0,
        explain:
          'The share of what you own that is financed by debt. Lower is sturdier; over 100% means you owe more than you own.',
      },
      {
        label: 'Total Liabilities / Net Worth',
        value: netWorth ? (totalLiabilities / netWorth) * 100 : 0,
        explain:
          'Your debt compared to what you would keep after settling everything. Lower is better; it goes negative while net worth is negative.',
      },
    ]
  }, [snapshot, totalAssets, totalLiabilities, netWorth])

  return (
    <div className={standalone ? 'max-w-6xl mx-auto px-4 sm:px-6 py-6' : undefined}>
      <Card tone="raised" className="mb-6">
        <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
          <Stat
            label="Net worth"
            value={netWorth}
            format={formatUSDWhole}
            emphasis
            accentColor={netWorth >= 0 ? GREEN : CARDINAL}
          />
          <Stat label="Total assets" value={totalAssets} format={formatUSDWhole} />
          <Stat label="Total liabilities" value={totalLiabilities} format={formatUSDWhole} />
          <Stat
            label="Investable each month"
            value={investable}
            format={formatUSDWhole}
            accentColor={investable >= 0 ? GREEN : CARDINAL}
          />
        </div>
      </Card>

      <div className="mb-6">
        <Tabs items={TABS} value={tab} onChange={setTab} size="lg" />
      </div>

      {tab === 'balance-sheet' && (
        <div className="flex flex-col gap-6">
          <StorageNotice isExampleData={isExampleData} onLoadExample={loadExampleData} onClear={clearAll} />

          <StepHeader
            title="What you own and owe"
            hint="Assets are what you have; liabilities are what you owe. Add, rename, or remove rows until it matches your situation."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Card tone="raised" className="flex flex-col gap-6">
              {snapshot.assets.map((g) => (
                <LineItemsEditor
                  key={g.key}
                  title={g.label}
                  hint={GROUP_HINTS[g.key]}
                  items={g.items}
                  onChange={(items) => setGroupItems('assets', g.key, items)}
                  accent={GREEN}
                  addLabel="Add an asset"
                />
              ))}
              <Stat label="Total assets" value={totalAssets} format={formatUSDWhole} accentColor={GREEN} />
            </Card>
            <Card tone="raised" className="flex flex-col gap-6">
              {snapshot.liabilities.map((g) => (
                <LineItemsEditor
                  key={g.key}
                  title={g.label}
                  hint={GROUP_HINTS[g.key]}
                  items={g.items}
                  onChange={(items) => setGroupItems('liabilities', g.key, items)}
                  accent={CARDINAL}
                  addLabel="Add a debt"
                />
              ))}
              <Stat label="Total liabilities" value={totalLiabilities} format={formatUSDWhole} accentColor={CARDINAL} />
            </Card>
          </div>

          <Card
            tone="raised"
            className="border-l-4"
            style={{ borderLeftColor: netWorth >= 0 ? GREEN : CARDINAL }}
          >
            <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
              <Stat
                label="Net worth"
                value={netWorth}
                format={formatUSDWhole}
                emphasis
                accentColor={netWorth >= 0 ? GREEN : CARDINAL}
              />
              <div className="flex items-baseline gap-x-6 text-stone-500">
                <Stat label="Total assets" value={totalAssets} format={formatUSDWhole} />
                <span className="text-2xl" aria-hidden="true">
                  &minus;
                </span>
                <Stat label="Total liabilities" value={totalLiabilities} format={formatUSDWhole} />
              </div>
              <p className="text-stone-600 max-w-md basis-72 grow">
                {netWorth < 0
                  ? 'This is the number to watch. You owe more than you own right now, which is common early in a career. Paying down debt and saving both move it up.'
                  : 'This is the number to watch: what you would keep if you sold everything and paid off every debt. Saving and paying down debt both move it up.'}
              </p>
            </div>
          </Card>

          <StepHeader
            title="How healthy is this balance sheet?"
            hint="Four ratios advisors actually use, computed live from your numbers."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {ratios.map((r) => (
              <Card key={r.label} tone="raised">
                <Stat label={r.label} value={r.value} format={(v) => fmtPct(v)} note={r.explain} animate={false} />
              </Card>
            ))}
          </div>

          <SnapshotControls
            onExportExcel={() => exportBalanceSheetXlsx(snapshot.assets, snapshot.liabilities)}
            onImportFile={importFile}
          />
        </div>
      )}

      {tab === 'budget' && (
        <div className="flex flex-col gap-6">
          <StorageNotice isExampleData={isExampleData} onLoadExample={loadExampleData} onClear={clearAll} />

          <Card tone="raised">
            <StepHeader
              title="Your monthly budget"
              hint="List what comes in, what you pay yourself first, and what goes out. The totals update as you type."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <LineItemsEditor
                title="Money in"
                items={snapshot.income}
                onChange={setIncomeItems}
                accent={GREEN}
                addLabel="Add income"
              />
              <div className="flex flex-col gap-8">
                <LineItemsEditor
                  title="Money out"
                  hint="The percent by each row is that expense's share of your total planned spending."
                  items={snapshot.expenses}
                  onChange={setExpenseItems}
                  accent={CARDINAL}
                  addLabel="Add expense"
                  showShare
                />
                <LineItemsEditor
                  title="Saving"
                  hint="Money out too, but out to yourself: it is kept, not spent, so it counts toward what you can invest each month."
                  items={snapshot.saving}
                  onChange={setSavingItems}
                  accent={GREEN}
                  addLabel="Add saving"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-4 items-baseline border-t border-stone-200 mt-8 pt-6 mb-4">
              <Stat label="Income" value={totalIncome} format={formatUSDWhole} />
              <Stat label="Expenses" value={totalExpenses} format={formatUSDWhole} />
              <Stat label="Saving" value={totalSaving} format={formatUSDWhole} accentColor={GREEN} />
              <Stat
                label="Extra saving"
                value={leftover}
                format={formatUSDWhole}
                accentColor={leftover >= 0 ? GREEN : CARDINAL}
              />
              <Stat
                label="Investable each month"
                value={investable}
                format={formatUSDWhole}
                emphasis
                accentColor={investable >= 0 ? GREEN : CARDINAL}
              />
            </div>
            <Callout tone={leftover >= 0 && investable > 0 ? 'note' : 'mark'} label="What this means">
              {investable <= 0 ? (
                <>
                  You&rsquo;re spending <strong>{formatUSDWhole(-investable)}</strong> more than you
                  earn each month, before any saving. Trim an expense or add income until this turns
                  positive.
                </>
              ) : leftover < 0 ? (
                <>
                  After expenses there is <strong>{formatUSDWhole(investable)}</strong> a month left,
                  short of the <strong>{formatUSDWhole(totalSaving)}</strong> you planned to pay
                  yourself first. Trim an expense or lower a saving row until the budget fits.
                </>
              ) : (
                <>
                  You keep <strong>{formatUSDWhole(investable)}</strong> a month,{' '}
                  {formatPercent(savingsRate, 0)} of what you earn: the{' '}
                  {formatUSDWhole(totalSaving)} you pay yourself first plus{' '}
                  {formatUSDWhole(leftover)} of extra saving. The <em>Your Goal</em> tab shows what
                  that becomes if you invest it.
                </>
              )}
            </Callout>
          </Card>

          <Card tone="raised">
            <StepHeader
              title="Where your income goes"
              hint="Each planned expense as a share of take-home income, with saving and extra saving completing the dollar. Quoted guidelines (like 28% of income on housing) usually mean gross income; a budget divides what actually lands in your account."
            />
            <div className="mt-6">
              <IncomePie
                income={totalIncome}
                expenses={snapshot.expenses}
                totalSaving={totalSaving}
                leftover={leftover}
              />
            </div>
          </Card>

          <Card tone="raised">
            <StepHeader
              title="Plan versus actual"
              hint="Fill in what you actually spent, and what you actually set aside, next to each planned amount. The table shows the gap in each category, plus each row's share of actual spending and of take-home income."
            />
            <div className="mt-6">
              <PlanVsActual
                income={totalIncome}
                expenses={snapshot.expenses}
                saving={snapshot.saving}
                onExpensesChange={setExpenseItems}
                onSavingChange={setSavingItems}
              />
            </div>
          </Card>

          <SnapshotControls
            onExportExcel={() => exportBudgetXlsx(snapshot.income, snapshot.expenses, snapshot.saving)}
            onImportFile={importFile}
          />
        </div>
      )}

      {tab === 'goal' && (
        <Card tone="raised" className="flex flex-col gap-6">
          <StepHeader
            title="Turn your saving into wealth"
            hint="Everything you keep each month from the Budget tab: your budgeted saving plus the extra saving on top, invested every month."
          />
          {monthly <= 0 ? (
            <Callout tone="mark" label="Nothing to invest yet">
              Right now nothing is left after expenses. Head back to the <em>Budget</em> tab and get
              your saving above zero first.
            </Callout>
          ) : (
            <>
              <p className="text-lg text-stone-900">
                Investing the <strong>{formatUSDWhole(monthly)}/month</strong> you keep
                {totalSaving > 0 && leftover >= 0 ? (
                  <span className="text-stone-600">
                    {' '}
                    ({formatUSDWhole(totalSaving)} budgeted saving + {formatUSDWhole(leftover)}{' '}
                    extra saving)
                  </span>
                ) : null}{' '}
                at
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
                <NumberField
                  label="Annual return"
                  value={goalRate}
                  onChange={setGoalRate}
                  min={0}
                  max={15}
                  suffix="%"
                  precision={1}
                />
                <Slider
                  label="For how long"
                  value={goalYears}
                  onChange={setGoalYears}
                  min={1}
                  max={40}
                  step={1}
                  readout={`${goalYears} years`}
                />
              </div>
              <div className="flex flex-wrap gap-x-12 gap-y-4 items-baseline border-t border-stone-200 pt-6">
                <Stat label="Could grow to" value={goalFinal} format={formatUSDWhole} emphasis accentColor={GREEN} />
                <Stat label="You'd contribute" value={goalContributed} format={formatUSDWhole} />
                <Stat label="Interest adds" value={goalFinal - goalContributed} format={formatUSDWhole} accentColor={GREEN} />
              </div>
              <GoalChart points={goalSeries} years={goalYears} />
              {goalRate === 0 ? (
                <FormulaBlock
                  tex={`FV = PMT \\cdot n = ${texUSD(monthly)} \\cdot ${goalYears * 12} = \\boxed{${texUSD(goalFinal)}}`}
                  caption={`With a 0% return there is no compounding: the future value is just the ${goalYears * 12} monthly deposits added up.`}
                  muted
                />
              ) : (
                <FormulaBlock
                  tex={`FV = PMT \\cdot \\frac{(1+i)^{n} - 1}{i} = ${texUSD(monthly)} \\cdot \\frac{(1+${(goalRate / 1200).toFixed(6)})^{${goalYears * 12}} - 1}{${(goalRate / 1200).toFixed(6)}} = \\boxed{${texUSD(goalFinal)}}`}
                  caption={`The future value of an annuity. i is the monthly rate (${goalRate}% ÷ 12); n is the ${goalYears * 12} monthly deposits.`}
                  muted
                />
              )}
              <Callout tone="note" label="The payoff">
                Setting aside <strong>{formatUSDWhole(monthly)}</strong> a month for {goalYears} years
                could grow to <strong>{formatUSDWhole(goalFinal)}</strong>. You&rsquo;d put in{' '}
                {formatUSDWhole(goalContributed)}; compounding adds the other{' '}
                {formatUSDWhole(goalFinal - goalContributed)}.
              </Callout>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
