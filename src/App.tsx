import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { useFramed } from './hooks/useFramed'

function App() {
  // ?embed=1 renders the page content alone, with no site chrome, so a tool
  // can live inside an <iframe> on a slide or another course page.
  const { search } = useLocation()
  const embed = new URLSearchParams(search).get('embed') === '1'
  // ?frame=1 (see useFramed) drops the header and footer too: the host
  // page on ifdm.stanford.edu provides both around the iframe.
  const framed = useFramed()

  if (embed || framed) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:text-cardinal focus:px-4 focus:py-2 focus:rounded-md focus:shadow-card"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default App
