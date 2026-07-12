import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import '@fontsource-variable/inter'
import 'katex/dist/katex.min.css'
import './styles/tokens.css'
// Tailwind (index.css) must load before toolkitBase.css so the toolkit's
// element-level typography wins over Tailwind's preflight reset.
import './index.css'
import './styles/toolkitBase.css'
import App from './App.tsx'
import Hub from './pages/Hub.tsx'
import Calculators from './pages/Calculators.tsx'
import Lessons from './pages/Lessons.tsx'
import Investing from './pages/Investing.tsx'
import Budget from './pages/Budget.tsx'
import Checklist from './pages/Checklist.tsx'
import FinancialStatements from './pages/FinancialStatements.tsx'
import LiteracyData from './pages/LiteracyData.tsx'
import BigThree from './pages/BigThree.tsx'
import BigThreeQuiz from './pages/BigThreeQuiz.tsx'
import BigThreeExplained from './pages/BigThreeExplained.tsx'
import BigThreeStories from './pages/BigThreeStories.tsx'
import FacultyInsights from './pages/FacultyInsights.tsx'
import TeacherTraining from './pages/TeacherTraining.tsx'
import TeacherTrainingSection from './pages/TeacherTrainingSection.tsx'

// One route per teacher training section; the component maps slugs to the
// shared content behind the equivalent Resource Hub pages.
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
  'credit-score',
  'gambling-investing',
  'taxes',
  'retirement-simulator',
  'housing',
  'used-vs-new',
  'rent-or-own',
] as const

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Hub />} />
          <Route path="big-three" element={<BigThree />} />
          <Route path="big-three/quiz" element={<BigThreeQuiz />} />
          <Route path="big-three/explained" element={<BigThreeExplained />} />
          <Route path="big-three/stories" element={<BigThreeStories />} />
          <Route path="literacy-data" element={<LiteracyData />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="budget" element={<Budget />} />
          <Route path="checkup" element={<Navigate to="/budget" replace />} />
          <Route path="calculators" element={<Calculators />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="investing" element={<Investing />} />
          <Route path="faculty-insights" element={<FacultyInsights />} />
          <Route path="teacher-training" element={<TeacherTraining />} />
          {TEACHER_TRAINING_SECTIONS.map((slug) => (
            <Route
              key={slug}
              path={`teacher-training/${slug}`}
              element={<TeacherTrainingSection slug={slug} />}
            />
          ))}
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
