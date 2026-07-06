import { Navigate, useSearchParams } from 'react-router-dom'
import ResourceHubShell from '../components/ResourceHubShell'
import InstructorBar from '../components/InstructorBar'
import { CompoundInterestPage } from '../tools/CompoundInterest/CompoundInterestPage'
import { TvmPage } from '../tools/Tvm/TvmPage'
import { TvmCalculatorPage } from '../tools/Tvm/TvmCalculatorPage'

const CALCULATOR_TOOLS = [
  { key: 'tvm-calc', label: 'TVM Calculator', Component: TvmCalculatorPage },
  { key: 'compound', label: 'Compound Interest', Component: CompoundInterestPage },
  { key: 'tvm', label: 'Borrow & Save', Component: TvmPage },
] as const

type ToolKey = (typeof CALCULATOR_TOOLS)[number]['key']

// The lessons lived here before moving to /lessons. Old links and embedded
// iframes with ?tool=lifecycle / ?tool=taxes must keep working.
const MOVED_TO_LESSONS = ['lifecycle', 'taxes']

function isToolKey(v: string | null): v is ToolKey {
  return CALCULATOR_TOOLS.some((t) => t.key === v)
}

export default function Calculators() {
  const [params] = useSearchParams()
  const toolParam = params.get('tool')
  const active: ToolKey = isToolKey(toolParam) ? toolParam : 'tvm-calc'
  const embed = params.get('embed') === '1'
  const current = CALCULATOR_TOOLS.find((t) => t.key === active)!

  if (toolParam && MOVED_TO_LESSONS.includes(toolParam)) {
    return <Navigate to={`/lessons?${params.toString()}`} replace />
  }

  // The five-key calculator was a mode inside the TVM tool before it became
  // its own tool; keep those old links working.
  if (toolParam === 'tvm' && params.get('mode') === 'calc') {
    const next = new URLSearchParams(params)
    next.set('tool', 'tvm-calc')
    next.delete('mode')
    return <Navigate to={`/calculators?${next.toString()}`} replace />
  }

  // Embedded in a slide or another page: the tool alone, at full width.
  if (embed) {
    return (
      <div className="toolkitScope max-w-[1680px] mx-auto px-6 pb-10">
        <current.Component />
      </div>
    )
  }

  // Switching between calculators happens in the sidebar's sub-tabs.
  return (
    <ResourceHubShell title="Calculators" wide>
      <div className="toolkitScope">
        <current.Component />
      </div>

      <InstructorBar route="calculators" toolKey={active} toolLabel={current.label} />
    </ResourceHubShell>
  )
}
