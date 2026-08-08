import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom'
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
  'retirement-simulator',
  'housing',
  'used-vs-new',
  'rent-or-own',
] as const

/*
 * The Resource Hub was retired in August 2026: the Personal Finance Teaching
 * Toolkit (the teacher training site) is now the whole app. Old hub URLs
 * live on in shared slides, worksheets, and QR codes, so each one forwards
 * to its toolkit twin, carrying the query string (notably embed=1) along.
 */

/** Forward a retired path to its toolkit twin, keeping the query string. */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={{ pathname: to, search }} replace />
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
  return <Navigate to={{ pathname: `/teacher-training/${slug}`, search: search ? `?${search}` : '' }} replace />
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
          <Route path="teacher-training" element={<TeacherTraining />} />
          {TEACHER_TRAINING_SECTIONS.map((slug) => (
            <Route
              key={slug}
              path={`teacher-training/${slug}`}
              element={<TeacherTrainingSection slug={slug} />}
            />
          ))}

          {/* Retired Resource Hub URLs, forwarded to their toolkit twins. */}
          <Route path="big-three" element={<LegacyRedirect to="/teacher-training/big-three" />} />
          <Route path="big-three/quiz" element={<LegacyRedirect to="/teacher-training/big-three/quiz" />} />
          <Route path="big-three/explained" element={<LegacyRedirect to="/teacher-training/big-three/explained" />} />
          <Route path="big-three/stories" element={<LegacyRedirect to="/teacher-training/big-three/stories" />} />
          <Route path="literacy-data" element={<LegacyRedirect to="/teacher-training/literacy-data" />} />
          <Route path="checklist" element={<LegacyRedirect to="/teacher-training/checklist" />} />
          <Route path="budget" element={<LegacyRedirect to="/teacher-training/budget" />} />
          <Route path="checkup" element={<LegacyRedirect to="/teacher-training/budget" />} />
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
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
