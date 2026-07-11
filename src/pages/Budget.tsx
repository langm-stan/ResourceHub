import ResourceHubShell from '../components/ResourceHubShell'
import FinancialStatements from './FinancialStatements'

/*
 * The main site's Financial Budget page: the site shell around the exact same
 * FinancialStatements component that ships to Stanford IT, so the prototype
 * page and the embed can never drift apart.
 */
export default function Budget() {
  return (
    <ResourceHubShell
      title="Financial Budget"
      intro="An interactive balance sheet and budget: pay yourself first, compare the plan to what actually happened, and see where each dollar of take-home income goes. Your numbers save in your browser and download as Excel."
    >
      <FinancialStatements standalone={false} />
    </ResourceHubShell>
  )
}
