import { useSearchParams } from 'react-router-dom'
import ResourceHubShell from '../components/ResourceHubShell'
import InstructorBar from '../components/InstructorBar'
import { LifeCyclePage } from '../tools/LifeCycle/LifeCyclePage'
import { TaxPage } from '../tools/Taxes/TaxPage'
import { HousingPage } from '../tools/Housing/HousingPage'

const LESSON_TOOLS = [
  { key: 'lifecycle', label: 'The Life-Cycle Model', Component: LifeCyclePage },
  { key: 'taxes', label: 'Understanding Taxes', Component: TaxPage },
  { key: 'housing', label: 'Buying a Home', Component: HousingPage },
] as const

type ToolKey = (typeof LESSON_TOOLS)[number]['key']

function isToolKey(v: string | null): v is ToolKey {
  return LESSON_TOOLS.some((t) => t.key === v)
}

export default function Lessons() {
  const [params] = useSearchParams()
  const toolParam = params.get('tool')
  const active: ToolKey = isToolKey(toolParam) ? toolParam : 'lifecycle'
  const embed = params.get('embed') === '1'
  const current = LESSON_TOOLS.find((t) => t.key === active)!

  // Embedded in a slide or another page: the lesson alone, at full width.
  if (embed) {
    return (
      <div className="toolkitScope max-w-[1680px] mx-auto px-6 pb-10">
        <current.Component />
      </div>
    )
  }

  // Switching between lessons happens in the sidebar's sub-tabs.
  return (
    <ResourceHubShell title="Interactive Lessons" wide>
      <div className="toolkitScope">
        <current.Component />
      </div>

      <InstructorBar route="lessons" toolKey={active} toolLabel={current.label} />
    </ResourceHubShell>
  )
}
