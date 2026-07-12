import { Card, StepHeader } from '../../design-system'
import { TvmCalculator } from './components/TvmCalculator'
import styles from './TvmPage.module.css'

/**
 * The five-key financial calculator as its own tool, separate from the
 * guided borrow/save scenarios in TvmPage.
 * `intro` hides the page's own header when a surrounding shell already provides the title.
 */
export function TvmCalculatorPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Calculator · Time value of money</p>
          <h1 className={styles.h1}>The five-key calculator</h1>
          <p className={styles.lead}>
            The same model a financial calculator uses: N, I/Y, PV, PMT, and FV. Enter any four and
            solve for the fifth. Remember the sign rule: money you receive is positive, money you pay
            out is negative.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <StepHeader
          title="Solve for any value"
          hint="Pick the key to solve for, fill in the other four, and the answer appears with the formula it came from."
        />
        <TvmCalculator />
      </Card>
    </div>
  )
}
