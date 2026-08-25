import { Link } from 'react-router-dom'

/*
 * The Resource Hub section rail from ifdm.stanford.edu, carried into the app
 * so the hub's shell survives the jump into the toolkit: the six hub pages
 * link back to the live site, and Toolkit renders the way the live nav marks
 * the current page (dark ink instead of cardinal, weight unchanged). Styling
 * mirrors the Stanford Sites secondary nav: cardinal links, hairline
 * separators, an indented block. Item list mirrors the live left nav as of
 * August 24, 2026.
 */

const SITE = 'https://ifdm.stanford.edu'

const HUB_PAGES = [
  { label: 'The Big Three', href: `${SITE}/the-big-three` },
  { label: 'Financial Literacy Data', href: `${SITE}/financial-literacy-data` },
  { label: 'Financial Checkup', href: `${SITE}/financialcheckup` },
  { label: 'Calculators', href: `${SITE}/resourcehub/calculators` },
  { label: 'Financial Statements', href: `${SITE}/resourcehub/financial-statements` },
  { label: 'Faculty Insights', href: `${SITE}/resourcehub/faculty-insights` },
]

export default function ResourceHubNav() {
  return (
    <nav aria-label="Resource Hub section">
      <a
        href={`${SITE}/resourcehub`}
        className="block px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500 hover:text-cardinal"
      >
        Resource Hub
      </a>
      <ul className="border-y border-stone-200 divide-y divide-stone-200">
        {HUB_PAGES.map((p) => (
          <li key={p.label}>
            <a
              href={p.href}
              className="block px-3 py-2.5 text-sm text-cardinal hover:underline underline-offset-4"
            >
              {p.label}
            </a>
          </li>
        ))}
        <li>
          <Link
            to="/"
            aria-current="location"
            className="block px-3 py-2.5 text-sm text-stone-900 hover:underline underline-offset-4"
          >
            Toolkit
          </Link>
        </li>
      </ul>
    </nav>
  )
}
