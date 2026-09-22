import { Callout } from '../../../design-system'
import styles from '../BitcoinMining.module.css'

/*
 * Where new bitcoin comes from, before the simulation asks a room to go and
 * produce some.
 *
 * The simulation is the race; this is what the race is. Written for someone
 * who has arrived on their own, not for a class an instructor has already
 * introduced: nothing here assumes the words block, nonce or mining mean
 * anything yet.
 */
export function MiningPrimer() {
  return (
    <details className={styles.guide} open>
      <summary className={styles.guideSummary}>How bitcoin is actually made</summary>
      <div className={styles.guideBody}>
        <p className={styles.primerLead}>
          Every bitcoin in existence was paid out as a prize for doing the work below. There is no
          other way to make one.
        </p>

        <ol className={styles.primer}>
        <li>
          <strong>Nobody keeps the ledger.</strong> A bank knows what is in your account because
          the bank keeps the record. Bitcoin has no bank, so everyone keeps a copy of the same
          record: every transfer that has ever happened, in order.
        </li>
        <li>
          <strong>New entries arrive in batches.</strong> Transfers are gathered into a block, and
          each block names the one before it. That is the chain: change anything in an old block
          and every block after it stops matching.
        </li>
        <li>
          <strong>Adding a block costs work, on purpose.</strong> To add one you must find a
          number, called a nonce, that makes the block&rsquo;s fingerprint start with a run of
          zeros. There is no way to work that number out. You guess, check, and guess again, which
          is what the machines are doing.
        </li>
        <li>
          <strong>Whoever finds it is paid in new bitcoin.</strong> That payment is the moment a
          bitcoin comes into existence. It is not issued by anyone, and it is not exchanged for
          anything.
        </li>
        <li>
          <strong>The payment halves, and then stops.</strong> It began at 50 bitcoin a block,
          halves every 210,000 blocks, and is 3.125 today. It keeps halving until it reaches
          nothing, some time around 2140, and no more than 21 million bitcoin will ever exist.
        </li>
        </ol>

        <Callout tone="note" label="More miners does not mean more bitcoin">
        The network watches how fast blocks are arriving and changes how many zeros it demands, so
        a block takes about ten minutes however many machines are guessing. Doubling the computing
        power in the world does not produce bitcoin twice as fast. It makes the puzzle twice as
        hard and produces bitcoin at the same rate, using twice the electricity. That is the
          difficulty setting in the simulation below.
        </Callout>
      </div>
    </details>
  )
}
