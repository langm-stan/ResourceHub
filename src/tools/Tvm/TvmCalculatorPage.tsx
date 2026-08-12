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
            The same model a financial calculator uses: PV, PMT, FV, I/Y, and N. Fill in the four
            you know, then press the key for the fifth. Remember the sign rule: money you receive is
            positive, money you pay out is negative.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <StepHeader
          title="Solve for any value"
          hint="Press the key you want to solve for and the answer drops into its box. Save a result to carry it into the next step of a multi-step problem."
        />
        <TvmCalculator />
      </Card>
    </div>
  )
}
