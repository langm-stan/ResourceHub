import { useSearchParams } from 'react-router-dom'
import ResourceHubShell from '../components/ResourceHubShell'
import InstructorBar from '../components/InstructorBar'
import { SingleStockPage } from '../tools/SingleStock/SingleStockPage'
import { GamblingPage } from '../tools/Gambling/GamblingPage'

const INVESTING_TOOLS = [
  { key: 'stock', label: 'One Stock or the Fund', Component: SingleStockPage },
  { key: 'gambling', label: 'Gambling vs. Investing', Component: GamblingPage },
] as const

type ToolKey = (typeof INVESTING_TOOLS)[number]['key']

function isToolKey(v: string | null): v is ToolKey {
  return INVESTING_TOOLS.some((t) => t.key === v)
}

export default function Investing() {
  const [params] = useSearchParams()
  const toolParam = params.get('tool')
  const active: ToolKey = isToolKey(toolParam) ? toolParam : 'stock'
  const embed = params.get('embed') === '1'
  const current = INVESTING_TOOLS.find((t) => t.key === active)!

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
    <ResourceHubShell title="Investing" wide>
      <div className="toolkitScope">
        <current.Component />
      </div>

      <InstructorBar route="investing" toolKey={active} toolLabel={current.label} />
    </ResourceHubShell>
  )
}
