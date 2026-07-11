import { useMemo, useState } from 'react'
import SnapshotControls from '../components/checkup/SnapshotControls'
import StorageNotice from '../components/checkup/StorageNotice'
import { LineItemsEditor } from '../components/checkup/LineItemsEditor'
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
    isExampleData,
    setGroupItems,
    setIncomeItems,
    setExpenseItems,
    importFile,
    loadExampleData,
    clearAll,
  } = useFinancialSnapshot()

  const surplus = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? surplus / totalIncome : 0
  const monthly = Math.max(0, surplus)

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
            label="Left over each month"
            value={surplus}
            format={formatUSDWhole}
            accentColor={surplus >= 0 ? GREEN : CARDINAL}
          />
        </div>
      </Card>

      <div className="mb-6">
        <Tabs items={TABS} value={tab} onChange={setTab} />
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

          <Callout tone={netWorth >= 0 ? 'note' : 'mark'} label="What this means">
            Your net worth is <strong>{formatUSDWhole(netWorth)}</strong>
            {netWorth < 0
              ? '. You owe more than you own right now, which is common early in a career. Paying down debt and saving both move this number up.'
              : ': the amount left if you sold everything and paid off every debt.'}
          </Callout>

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
              hint="List what comes in and what goes out. The totals update as you type."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <LineItemsEditor
                title="Money in"
                items={snapshot.income}
                onChange={setIncomeItems}
                accent={GREEN}
                addLabel="Add income"
              />
              <LineItemsEditor
                title="Money out"
                items={snapshot.expenses}
                onChange={setExpenseItems}
                accent={CARDINAL}
                addLabel="Add expense"
              />
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-4 items-baseline border-t border-stone-200 mt-8 pt-6 mb-4">
              <Stat label="Income" value={totalIncome} format={formatUSDWhole} />
              <Stat label="Expenses" value={totalExpenses} format={formatUSDWhole} />
              <Stat
                label="Left over each month"
                value={surplus}
                format={formatUSDWhole}
                emphasis
                accentColor={surplus >= 0 ? GREEN : CARDINAL}
              />
              <Stat label="Savings rate" value={savingsRate} format={(v) => formatPercent(v, 0)} animate={false} />
            </div>
            <Callout tone={surplus >= 0 ? 'note' : 'mark'} label="What this means">
              {surplus >= 0 ? (
                <>
                  You keep <strong>{formatUSDWhole(surplus)}</strong> a month,{' '}
                  {formatPercent(savingsRate, 0)} of what you earn. The <em>Your Goal</em> tab shows
                  what that becomes if you invest it.
                </>
              ) : (
                <>
                  You&rsquo;re spending <strong>{formatUSDWhole(-surplus)}</strong> more than you earn
                  each month. Trim an expense or add income until this turns positive.
                </>
              )}
            </Callout>
          </Card>

          <SnapshotControls
            onExportExcel={() => exportBudgetXlsx(snapshot.income, snapshot.expenses)}
            onImportFile={importFile}
          />
        </div>
      )}

      {tab === 'goal' && (
        <Card tone="raised" className="flex flex-col gap-6">
          <StepHeader
            title="Turn your surplus into wealth"
            hint="Your leftover money from the Budget tab, invested every month."
          />
          {monthly <= 0 ? (
            <Callout tone="mark" label="No surplus yet">
              Right now there&rsquo;s nothing left over to invest. Head back to the <em>Budget</em>{' '}
              tab and get your &ldquo;left over&rdquo; above zero first.
            </Callout>
          ) : (
            <>
              <p className="text-lg text-stone-900">
                Investing your <strong>{formatUSDWhole(monthly)}/month</strong> surplus at
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
              <FormulaBlock
                tex={`FV = PMT \\cdot \\frac{(1+i)^{n} - 1}{i} = ${texUSD(monthly)} \\cdot \\frac{(1+${(goalRate / 1200).toFixed(6)})^{${goalYears * 12}} - 1}{${(goalRate / 1200).toFixed(6)}} = \\boxed{${texUSD(goalFinal)}}`}
                caption={`The future value of an annuity. i is the monthly rate (${goalRate}% ÷ 12); n is the ${goalYears * 12} monthly deposits.`}
                muted
              />
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
