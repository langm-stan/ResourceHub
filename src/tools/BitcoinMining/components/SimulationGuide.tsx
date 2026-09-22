import styles from '../BitcoinMining.module.css'

/*
 * How to run the thing, folded away.
 *
 * Open by default would push the simulation itself off the screen, and a
 * reader who has used it once does not need it again. <details> rather than
 * a scripted overlay: it opens on a click or a keypress, prints with the
 * page, and needs no focus handling of its own.
 */
export function SimulationGuide() {
  return (
    <details className={styles.guide}>
      <summary className={styles.guideSummary}>How to run this with a class</summary>
      <div className={styles.guideBody}>
        <ol>
          <li>
            <strong>Set the room.</strong> Put in how many people are mining and choose a
            difficulty. One zero is found in a few guesses; four takes a room a while. Start at one
            and raise it once they have the idea.
          </li>
          <li>
            <strong>Send the chain round.</strong> The QR code carries the whole chain, so every
            phone in the room can open the same one. Nothing is stored on a server.
          </li>
          <li>
            <strong>Race.</strong> Everyone types a name and a guess at the nonce. The fingerprint
            updates as they type. The first guess that produces enough leading zeros wins the
            block, and only that person&rsquo;s name goes on it.
          </li>
          <li>
            <strong>Pay someone.</strong> Before mining a block, fill in a transfer: who pays, who
            is paid, how much. It rides along inside the block and shows up in the balances below.
          </li>
          <li>
            <strong>Let the machine do it.</strong> Auto-mine guesses thousands of nonces a second.
            Use it after the room has done one by hand, so they can feel what it replaced.
          </li>
          <li>
            <strong>Break it.</strong> Turn on tamper mode and edit an amount in a block already
            mined. Every block after it turns red at once, because each one names the fingerprint
            of the one before. That is the whole security argument in one click.
          </li>
          <li>
            <strong>Reset.</strong> Clears the chain for the next class. It asks twice.
          </li>
        </ol>
      </div>
    </details>
  )
}
