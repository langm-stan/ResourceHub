import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'

const NAV = ['Home', 'About', 'Research', 'Teaching', 'Policy & Programs', 'Resource Hub', 'Events', 'News']

export default function Header() {
  const { pathname } = useLocation()

  // The teacher training pages are self-contained: branding only, no links
  // out to the rest of the site.
  if (pathname.startsWith('/teacher-training')) {
    return (
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl text-cardinal font-semibold tracking-tight">Stanford</span>
            <span className="h-8 w-px bg-stone-200" />
            <span className="text-sm leading-tight text-stone-500">
              Initiative for Financial<br />Decision-Making
            </span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-serif text-2xl text-cardinal font-semibold tracking-tight">Stanford</span>
          <span className="h-8 w-px bg-stone-200" />
          <span className="text-sm leading-tight text-stone-500">
            Initiative for Financial<br />Decision-Making
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-1 rounded-full border border-stone-200 pl-4 pr-2 py-1.5 text-sm text-stone-500">
          <Search size={15} />
          <input
            placeholder="Search this site"
            className="outline-none bg-transparent placeholder:text-stone-400 w-40"
          />
        </div>
      </div>
      <nav className="max-w-7xl mx-auto px-6">
        <ul className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-cardinal pb-3">
          {NAV.map((item) => (
            <li key={item}>
              {item === 'Resource Hub' ? (
                <Link to="/" className="pb-3 border-b-2 border-cardinal text-stone-900">
                  {item}
                </Link>
              ) : (
                <span className="cursor-default hover:text-stone-900 transition-colors">{item}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
