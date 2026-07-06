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
      intro="An interactive balance sheet, budget, and savings goal. These are the same tools as our downloadable templates, in live form, with your numbers saved in your browser."
    >
      <FinancialStatements standalone={false} />
    </ResourceHubShell>
  )
}
