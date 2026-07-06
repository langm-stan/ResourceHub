import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'

interface SubItem {
  to: string
  label: string
  /** Match this path exactly (for a section's overview page). */
  end?: boolean
}

const SECTIONS: { to: string; label: string; children?: SubItem[] }[] = [
  {
    to: '/big-three',
    label: 'The Big Three',
    children: [
      { to: '/big-three', label: 'Overview', end: true },
      { to: '/big-three/quiz', label: 'The Quiz' },
      { to: '/big-three/explained', label: 'Explained' },
      { to: '/big-three/stories', label: 'Stories' },
    ],
  },
  { to: '/literacy-data', label: 'Financial Literacy Data' },
  { to: '/checklist', label: 'Financial Checklist' },
  { to: '/budget', label: 'Financial Budget' },
  {
    to: '/calculators',
    label: 'Calculators',
    children: [
      { to: '/calculators?tool=tvm-calc', label: 'TVM Calculator' },
      { to: '/calculators?tool=compound', label: 'Compound Interest' },
      { to: '/calculators?tool=tvm', label: 'Borrow & Save' },
    ],
  },
  {
    to: '/lessons',
    label: 'Interactive Lessons',
    children: [
      { to: '/lessons?tool=lifecycle', label: 'The Life-Cycle Model' },
      { to: '/lessons?tool=taxes', label: 'Understanding Taxes' },
      { to: '/lessons?tool=housing', label: 'Buying a Home' },
      { to: '/lessons?tool=freedom', label: 'When Can You Stop Working?' },
    ],
  },
  {
    to: '/investing',
    label: 'Investing',
    children: [
      { to: '/investing?tool=stock', label: 'One Stock or the Fund' },
      { to: '/investing?tool=gambling', label: 'Gambling vs. Investing' },
    ],
  },
  { to: '/faculty-insights', label: 'Faculty Insights' },
]

const subItemClass = (active: boolean) =>
  `px-3 py-1.5 md:ml-4 rounded-md text-[13px] font-medium transition-colors ${
    active
      ? 'text-cardinal font-semibold bg-cardinal/5'
      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
  }`

/**
 * A section's sub-tabs, shown only while that section is open. Tool pages
 * (calculators, lessons) address their tabs with a ?tool= query param; the
 * first child is the default when the param is absent.
 */
function SubNav({ items }: { items: SubItem[] }) {
  const { pathname } = useLocation()
  const [params] = useSearchParams()

  const isActive = (item: SubItem, first: SubItem) => {
    const [path, query] = item.to.split('?')
    if (!query) return item.end ? pathname === path : pathname.startsWith(path)
    const tool = new URLSearchParams(query).get('tool')
    const firstTool = new URLSearchParams(first.to.split('?')[1]).get('tool')
    return pathname === path && (params.get('tool') ?? firstTool) === tool
  }

  return (
    <>
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={subItemClass(isActive(item, items[0]))}>
          {item.label}
        </Link>
      ))}
    </>
  )
}

export default function ResourceHubShell({
  children,
  title,
  intro,
  wide = false,
}: {
  children: ReactNode
  title: string
  intro?: string
  /** Widen the content column for pages built around charts and side rails. */
  wide?: boolean
}) {
  const { pathname } = useLocation()

  // The sidebar sits outside the title/intro column so its position is
  // identical on every page, no matter how long a page's heading runs.
  // One container width for ALL pages, so the sidebar never shifts when
  // navigating between sections; `wide` only widens the content column.
  return (
    <div className="max-w-[1680px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-x-10 gap-y-6">
        <aside className="md:w-56 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 flex-wrap sticky top-6">
            {SECTIONS.map((s) => {
              const open = pathname === s.to || pathname.startsWith(`${s.to}/`)
              return (
                <div key={s.to} className="contents md:flex md:flex-col md:gap-1">
                  <NavLink
                    to={s.to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-cardinal/10 text-cardinal font-semibold'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`
                    }
                  >
                    {s.label}
                  </NavLink>
                  {s.children && open && <SubNav items={s.children} />}
                </div>
              )
            })}
          </nav>
        </aside>
        <div className={`flex-1 min-w-0 ${wide ? '' : 'max-w-5xl'}`}>
          <p className="text-xs font-semibold tracking-widest text-cardinal uppercase mb-2">Resource Hub</p>
          <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-4">{title}</h1>
          {intro && <p className="text-stone-600 max-w-3xl text-lg mb-10 leading-relaxed">{intro}</p>}
          {!intro && <div className="mb-10" />}
          {children}
        </div>
      </div>
    </div>
  )
}
