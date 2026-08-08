import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/*
 * The header replicates the chrome of the live initiative site
 * (ifdm.stanford.edu, a Stanford Sites build) so the Resource Hub reads as
 * one of its pages rather than a separate app: the cardinal Stanford
 * University brand bar, the wordmark lockup with the site search, and the
 * red navigation row. Every item links to the live site except Resource
 * Hub, which is the page the visitor is already on: its label carries the
 * current-page underline and stays inside the app. Menu targets were taken
 * from the live site's navigation on August 8, 2026.
 */

const SITE = 'https://ifdm.stanford.edu'

interface NavChild {
  label: string
  href?: string
  /** In-app route for children of the Resource Hub item. */
  to?: string
}

interface NavItem {
  label: string
  href?: string
  to?: string
  current?: boolean
  children?: NavChild[]
}

const NAV: NavItem[] = [
  { label: 'Home', href: `${SITE}/home` },
  {
    label: 'About',
    href: `${SITE}/about-us`,
    children: [
      { label: 'About the Initiative', href: `${SITE}/about-us` },
      { label: 'Message from Faculty Director', href: `${SITE}/message` },
      { label: 'Contact Us', href: `${SITE}/contact` },
      { label: 'Opportunities', href: `${SITE}/about-us/opportunities` },
    ],
  },
  {
    label: 'Research',
    href: `${SITE}/research`,
    children: [
      { label: 'Policy Briefs', href: `${SITE}/research/policy-briefs` },
      { label: 'Publications', href: `${SITE}/research/publications` },
      { label: 'Working Papers', href: `${SITE}/research/working-papers` },
      { label: 'Reports', href: `${SITE}/research/reports` },
      { label: 'Presentations', href: `${SITE}/research/presentations` },
    ],
  },
  { label: 'Teaching', href: `${SITE}/teaching` },
  { label: 'Policy & Programs', href: `${SITE}/policy-programs` },
  // The Resource Hub remains its own section on the live site; the toolkit
  // is a separate tab, and it is the page the visitor is on here.
  {
    label: 'Resource Hub',
    href: `${SITE}/resourcehub`,
    children: [
      { label: 'The Big Three', href: `${SITE}/the-big-three` },
      { label: 'Financial Literacy Data', href: `${SITE}/financial-literacy-data` },
      { label: 'Financial Checkup', href: `${SITE}/financialcheckup` },
      { label: 'Calculators', href: `${SITE}/resourcehub/calculators` },
      { label: 'Financial Statements', href: `${SITE}/resourcehub/financial-statements` },
      { label: 'Faculty Insights', href: `${SITE}/resourcehub/faculty-insights` },
    ],
  },
  { label: 'Toolkit', to: '/', current: true },
  {
    label: 'Events',
    href: `${SITE}/events`,
    children: [
      { label: 'Stanford Financial Education Symposium', href: `${SITE}/events/stanford-financial-education-symposium` },
      { label: 'Teaching Personal Finance Conference', href: `${SITE}/events/TPFC` },
      { label: 'Financial Literacy Colloquia', href: `${SITE}/events/FLC` },
      { label: 'Financial Literacy Research Boot Camp', href: `${SITE}/events/financial-literacy-research-boot-camp` },
      { label: 'Personal Finance Teacher Training Institute', href: `${SITE}/events/personal-finance` },
      { label: 'Other Events', href: `${SITE}/events/other-events` },
    ],
  },
  {
    label: 'News',
    href: `${SITE}/news`,
    children: [
      { label: 'IFDM in the News', href: `${SITE}/news` },
      { label: 'Newsletter', href: `${SITE}/newsletter` },
    ],
  },
]

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavEntry({
  item,
  open,
  onToggle,
  onClose,
}: {
  item: NavItem
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  // Close the dropdown when focus or a click leaves the item.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const labelClass = `inline-block py-2 font-semibold text-cardinal hover:underline underline-offset-4 ${
    item.current ? 'border-b-[3px] border-stone-900 pb-[5px]' : ''
  }`

  return (
    <li ref={ref} className="relative flex items-center">
      {item.to ? (
        <Link to={item.to} aria-current={item.current ? 'page' : undefined} className={labelClass}>
          {item.label}
        </Link>
      ) : (
        <a href={item.href} className={labelClass}>
          {item.label}
        </a>
      )}
      {item.children && (
        <>
          <span className="mx-1.5 h-4 w-px bg-stone-300" aria-hidden="true" />
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${item.label} submenu`}
            onClick={onToggle}
            className="p-1 text-cardinal hover:bg-stone-100 rounded"
          >
            <Chevron open={open} />
          </button>
          {open && (
            <ul className="absolute right-0 top-full z-40 min-w-[16rem] bg-white border border-stone-200 shadow-lg py-2">
              {item.children.map((c) => (
                <li key={c.label}>
                  {c.to ? (
                    <Link
                      to={c.to}
                      onClick={onClose}
                      className="block px-4 py-2 text-sm text-stone-800 hover:bg-stone-100 hover:text-cardinal"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <a
                      href={c.href}
                      className="block px-4 py-2 text-sm text-stone-800 hover:bg-stone-100 hover:text-cardinal"
                    >
                      {c.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}

export default function Header() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <header className="bg-white border-b border-stone-200">
      <BrandBar />

      <div className="max-w-7xl mx-auto px-6 pt-5 pb-2 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <a
            href={`${SITE}/home`}
            className="su-wordmark text-cardinal hover:text-cardinal text-[2rem] shrink-0"
          >
            Stanford
          </a>
          <span className="h-9 w-px bg-stone-400" aria-hidden="true" />
          <Link to="/" className="text-stone-800 text-[0.95rem] font-semibold leading-tight">
            Initiative for Financial
            <br />
            Decision-Making
          </Link>
        </div>

        {/* The site search on ifdm.stanford.edu: GET /search?key=... */}
        <form
          action={`${SITE}/search`}
          method="get"
          role="search"
          className="hidden md:flex items-center border border-stone-300 rounded-full pl-4 pr-1 py-1 w-72 focus-within:border-stone-500"
        >
          <label htmlFor="site-search" className="sr-only">
            Search this site
          </label>
          <input
            id="site-search"
            type="search"
            name="key"
            placeholder="Search this site"
            className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-stone-500"
          />
          <button
            type="submit"
            aria-label="Search"
            className="p-2 text-cardinal hover:bg-stone-100 rounded-full"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="w-4 h-4">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>

      <nav aria-label="Initiative site navigation" className="max-w-7xl mx-auto px-6">
        <ul className="flex flex-wrap items-center justify-end gap-x-5 gap-y-0 pb-1">
          {NAV.map((item) => (
            <NavEntry
              key={item.label}
              item={item}
              open={openMenu === item.label}
              onToggle={() => setOpenMenu(openMenu === item.label ? null : item.label)}
              onClose={() => setOpenMenu(null)}
            />
          ))}
        </ul>
      </nav>
    </header>
  )
}

/** The cardinal Stanford University band that tops every Stanford Sites page. */
function BrandBar() {
  return (
    <div className="bg-cardinal">
      <div className="max-w-7xl mx-auto px-6 py-1.5">
        <a
          href="https://www.stanford.edu"
          className="su-wordmark text-white hover:text-white text-base"
        >
          Stanford University
        </a>
      </div>
    </div>
  )
}
