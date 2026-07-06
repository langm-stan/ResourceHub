import { Link } from 'react-router-dom'
import ResourceHubShell from '../components/ResourceHubShell'
import ChecklistItem from '../components/checkup/ChecklistItem'
import { useChecklist } from '../hooks/useChecklist'
import { CHECKLIST_ITEMS } from '../data/checklistItems'
import { Card } from '../design-system'

export default function Checklist() {
  const { answers, setAnswer } = useChecklist()
  const answeredCount = Object.keys(answers).length
  const yesCount = Object.values(answers).filter(Boolean).length

  return (
    <ResourceHubShell
      title="Financial Checklist"
      intro="The Seven Elements of Good Financial Health: a self-assessment covering the habits that build financial security. Work through the seven questions, then use the Financial Budget to act on what you find."
    >
      <div className="flex flex-col gap-4 max-w-2xl">
        <Card tone="raised" className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-800">Seven Elements of Good Financial Health</p>
            <p className="text-xs text-stone-500">
              Answer with the checkmarks. Your answers save in this browser, like your balance sheet.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-semibold text-stone-900 tnum">
              {yesCount}/{CHECKLIST_ITEMS.length}
            </p>
            <p className="text-xs text-stone-500">{answeredCount === 0 ? 'not started' : `${answeredCount} answered`}</p>
          </div>
        </Card>
        {CHECKLIST_ITEMS.map((item) => (
          <ChecklistItem key={item.id} item={item} answer={answers[item.id]} onAnswer={(v) => setAnswer(item.id, v)} />
        ))}
        <p className="text-sm text-stone-600">
          Ready to put the answers to work? Build your balance sheet and budget in the{' '}
          <Link to="/budget" className="font-semibold text-cardinal hover:underline">
            Financial Budget
          </Link>
          .
        </p>
      </div>
    </ResourceHubShell>
  )
}
