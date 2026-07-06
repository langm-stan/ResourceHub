import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  // ?embed=1 renders the page content alone, with no site chrome, so a tool
  // can live inside an <iframe> on a slide or another course page.
  const { search } = useLocation()
  const embed = new URLSearchParams(search).get('embed') === '1'

  if (embed) {
    return (
      <main className="min-h-screen bg-stone-50">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default App
