import { Link } from 'react-router-dom'

/*
 * The top of the app view (see useAppView): the Stanford wordmark and the
 * toolkit's name as one lockup, in the arrangement the initiative's site uses
 * for its own name, with the toolkit's mark at the far side. The whole band
 * leads back to the list of tools.
 */
export default function AppHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <Link
        to="/"
        aria-label="Stanford Personal Finance Toolkit, all tools"
        className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-2.5"
      >
        <span className="su-wordmark shrink-0 text-[1.75rem] text-cardinal">Stanford</span>
        <span className="h-8 w-px shrink-0 bg-stone-400" aria-hidden="true" />
        <span className="text-[0.95rem] font-semibold leading-tight text-stone-800">
          Personal Finance
          <br />
          Toolkit
        </span>
        {/* The toolkit's mark: the same tile and rising bars as the site icon. */}
        <svg viewBox="0 0 48 48" aria-hidden="true" className="ml-auto h-9 w-9 shrink-0">
          <rect width="48" height="48" rx="10" fill="#8C1515" />
          <rect x="9" y="26" width="7" height="13" rx="2" fill="#fff" />
          <rect x="20.5" y="19" width="7" height="20" rx="2" fill="#fff" />
          <rect x="32" y="10" width="7" height="29" rx="2" fill="#fff" />
        </svg>
      </Link>
    </header>
  )
}
