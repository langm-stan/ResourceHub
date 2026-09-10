import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { useFramed } from './hooks/useFramed'
import { useSafariTabStops } from './hooks/useSafariTabStops'

/*
 * The app routes on the hash (HashRouter), so a skip link cannot rely on an
 * href="#main" jump: the router would read "#main" as a route and send the
 * visitor to the course overview instead of moving focus. The link therefore
 * moves focus itself, onto a <main> that takes focus programmatically
 * (tabIndex -1) without joining the tab order.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        e.preventDefault()
        const main = document.getElementById('main')
        if (!main) return
        main.focus()
        main.scrollIntoView()
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-cardinal focus:px-4 focus:py-2 focus:rounded-md focus:shadow-card"
    >
      Skip to main content
    </a>
  )
}

function App() {
  // ?embed=1 renders the page content alone, with no site chrome, so a tool
  // can live inside an <iframe> on a slide or another course page.
  const { search } = useLocation()
  const embed = new URLSearchParams(search).get('embed') === '1'
  // ?frame=1 (see useFramed) drops the header and footer too: the host
  // page on ifdm.stanford.edu provides both around the iframe.
  const framed = useFramed()
  // Put every control back in Safari's tab sequence (see the hook).
  useSafariTabStops()

  if (embed || framed) {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* The frame view still repeats a banner on every tool page, so a
            keyboard visitor gets the same way past it. The embed view has no
            chrome at all, but the link costs nothing and stays consistent. */}
        <SkipLink />
        <main id="main" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default App
