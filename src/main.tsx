import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import '@fontsource-variable/inter'
import 'katex/dist/katex.min.css'
import './styles/tokens.css'
// Tailwind (index.css) must load before toolkitBase.css so the toolkit's
// element-level typography wins over Tailwind's preflight reset.
import './index.css'
import './styles/toolkitBase.css'
import App from './App.tsx'
import FinancialStatements from './pages/FinancialStatements.tsx'
import TeacherTraining from './pages/TeacherTraining.tsx'
import TeacherTrainingSection from './pages/TeacherTrainingSection.tsx'

// One route per teacher training section; the component maps slugs to the
// shared tool content.
const TEACHER_TRAINING_SECTIONS = [
  'big-three',
  'big-three/quiz',
  'big-three/explained',
  'big-three/stories',
  'literacy-data',
  'checklist',
  'tvm-calculator',
  'budget',
  'compound-interest',
  'inflation',
  'borrow-save',
  'lifecycle',
  'paying-off-debt',
  'credit-score',
  'gambling-sim',
  'stock-picker',
  'single-stock',
  'gambling-investing',
  'bitcoin-mining',
  'index-fund-fees',
  'stocks-bonds',
  'bond-pricing',
  'bond-rates',
  'taxes',
  'tax-advantages',
  'insurance',
  'retirement-simulator',
  'savings-rate',
  'housing',
  'used-vs-new',
  'rent-or-own',
] as const

/*
 * The Resource Hub was retired in August 2026: the Personal Finance Teaching
 * Toolkit (the teacher training site) is now the whole app, and each tool
 * lives at its bare slug (/taxes, /budget) so the URLs read cleanly wherever
 * the site is hosted. Two generations of older URLs live on in shared
 * slides, worksheets, and QR codes, so both forward here, carrying the query
 * string (notably embed=1) along: /teacher-training/<slug> from the toolkit
 * era, and the hub-era ?tool= shells below.
 */

/** Forward a retired path to its current home, keeping the query string. */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
}

/** Forward /teacher-training/<anything> to /<anything>, keeping the query. */
function TeacherTrainingRedirect() {
  const { search } = useLocation()
  const rest = useParams()['*'] ?? ''
  return <Navigate to={{ pathname: `/${rest}`, search }} replace />
}

/**
 * Forward a retired ?tool= shell (/calculators, /lessons, /investing) to the
 * standalone toolkit page for that tool, dropping the tool param but keeping
 * the rest (embed=1 and any scenario state).
 */
function LegacyToolRedirect({ map, fallback }: { map: Record<string, string>; fallback: string }) {
  const [params] = useSearchParams()
  const tool = params.get('tool')
  const slug = (tool && map[tool]) || fallback
  const rest = new URLSearchParams(params)
  rest.delete('tool')
  const search = rest.toString()
  return <Navigate to={{ pathname: `/${slug}`, search: search ? `?${search}` : '' }} replace />
}

/*
 * Reset scroll when the visitor opens another page. Keyed on the pathname
 * only; search params carry in-page scenario state and must not move the
 * scroll.
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<App />}>
          <Route index element={<TeacherTraining />} />
          {TEACHER_TRAINING_SECTIONS.map((slug) => (
            <Route key={slug} path={slug} element={<TeacherTrainingSection slug={slug} />} />
          ))}

          {/* Toolkit-era URLs: everything under /teacher-training forwards to
              the bare slug. */}
          <Route path="teacher-training" element={<LegacyRedirect to="/" />} />
          <Route path="teacher-training/*" element={<TeacherTrainingRedirect />} />

          {/* Hub-era shells and renames. The bare content URLs (/big-three,
              /checklist, /budget, /literacy-data) are live routes again. */}
          <Route path="checkup" element={<LegacyRedirect to="/budget" />} />
          <Route
            path="calculators"
            element={
              <LegacyToolRedirect
                map={{ 'tvm-calc': 'tvm-calculator', compound: 'compound-interest', tvm: 'borrow-save' }}
                fallback="tvm-calculator"
              />
            }
          />
          <Route
            path="lessons"
            element={
              <LegacyToolRedirect
                map={{ lifecycle: 'lifecycle', taxes: 'taxes', housing: 'housing' }}
                fallback="lifecycle"
              />
            }
          />
          <Route
            path="investing"
            element={
              <LegacyToolRedirect
                map={{ stock: 'single-stock', gambling: 'gambling-investing' }}
                fallback="single-stock"
              />
            }
          />
          <Route path="faculty-insights" element={<Navigate to="/" replace />} />

          {/* Preview of the standalone embed handed to Stanford IT (see
              stanford-embed/). The embed build renders this same component. */}
          <Route
            path="statements"
            element={
              <div className="toolkitScope">
                <FinancialStatements />
              </div>
            }
          />

          {/* Anything unrecognized lands on the course overview. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
