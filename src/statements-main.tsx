/*
 * Standalone entry for the embeddable Financial Statements tool.
 * Built by `npm run build:statements` into stanford-embed/financial-statements/,
 * a self-contained static folder for Stanford IT to host and iframe into
 * ifdm.stanford.edu/resourcehub/financial-statements.
 *
 * No router, no site chrome: the host page provides heading and navigation.
 * KaTeX renders the annuity formula on the Your Goal tab.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import 'katex/dist/katex.min.css'
import './styles/tokens.css'
import './index.css'
import './styles/toolkitBase.css'
import FinancialStatements from './pages/FinancialStatements.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="toolkitScope">
      <FinancialStatements />
    </div>
  </StrictMode>
)
