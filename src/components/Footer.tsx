/*
 * Site footer: the initiative's own row, then Stanford's Global Footer — the
 * cardinal block with the wordmark, the four university links, and the policy
 * row (including the accessibility barrier-report link the minimum web
 * standards require). Link targets mirror www.stanford.edu's live footer.
 */

const UNIVERSITY_LINKS = [
  { label: 'Stanford Home', href: 'https://www.stanford.edu/' },
  { label: 'Maps & Directions', href: 'https://visit.stanford.edu/basics' },
  { label: 'Search Stanford', href: 'https://www.stanford.edu/search' },
  { label: 'Emergency Info', href: 'https://emergency.stanford.edu', nofollow: true },
]

const POLICY_LINKS = [
  { label: 'Terms of Use', href: 'https://www.stanford.edu/terms', title: 'Terms of use for sites' },
  { label: 'Privacy', href: 'https://www.stanford.edu/privacy', title: 'Privacy and cookie policy' },
  {
    label: 'Copyright',
    href: 'https://uit.stanford.edu/security/copyright-infringement',
    title: 'Report alleged copyright infringement',
    nofollow: true,
  },
  {
    label: 'Trademarks',
    href: 'https://adminguide.stanford.edu/chapter-1/subchapter-5/policy-1-5-4',
    title: 'Ownership and use of Stanford trademarks and images',
    nofollow: true,
  },
  {
    label: 'Non-Discrimination',
    href: 'https://non-discrimination.stanford.edu/',
    title: 'Non-discrimination policy',
    nofollow: true,
  },
  {
    label: 'Accessibility',
    href: 'https://www.stanford.edu/accessibility',
    title: 'Report web accessibility issues',
  },
]

export function GlobalFooter() {
  return (
    <footer className="bg-cardinal text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <a
          href="https://www.stanford.edu"
          className="su-wordmark text-white hover:text-white text-3xl inline-block mb-6"
        >
          Stanford University
        </a>
        <nav aria-label="Stanford footer links">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold mb-4">
            {UNIVERSITY_LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  rel={l.nofollow ? 'nofollow' : undefined}
                  className="text-white hover:underline underline-offset-2"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-6">
            {POLICY_LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  title={l.title}
                  rel={l.nofollow ? 'nofollow' : undefined}
                  className="text-white hover:underline underline-offset-2"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-white/90">
          © Stanford University. Stanford, California 94305.
        </p>
      </div>
    </footer>
  )
}

export default function Footer() {
  return (
    <div className="mt-16">
      <div className="border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="font-serif text-lg text-cardinal font-semibold">
            Stanford{' '}
            <span className="text-stone-400 font-sans font-normal text-sm ml-1">
              Initiative for Financial Decision-Making
            </span>
          </div>
        </div>
      </div>
      <GlobalFooter />
    </div>
  )
}
