import styles from '../BitcoinMining.module.css'

/*
 * What each control does, in the order you would touch them.
 *
 * Folded away: someone who has run it once does not need it again, and open
 * by default it would push the simulation off the screen. A <details> rather
 * than a scripted tour, so it opens on a click or a keypress, prints with the
 * page, and needs no focus handling of its own.
 */
export function SimulationGuide() {
  return (
    <details className={styles.guide}>
      <summary className={styles.guideSummary}>How to run this page</summary>
      <div className={styles.guideBody}>
        <ol>
          <li>
            <strong>Set the difficulty.</strong> It is the number of zeros a block&rsquo;s
            fingerprint has to start with. One zero takes about 16 guesses, two about 256, and
            every zero after that multiplies by sixteen again.
          </li>
          <li>
            <strong>Say how many are mining.</strong> This only feeds the estimate of how many
            guesses each person needs. It does not change the puzzle.
          </li>
          <li>
            <strong>Add a transfer, if you want one.</strong> Who pays, who is paid, how much. It
            goes inside the block you are about to mine, and shows up in the balances afterwards.
          </li>
          <li>
            <strong>Put a name in &ldquo;Who mined it?&rdquo;</strong> Whoever commits the block is
            the name recorded on it.
          </li>
          <li>
            <strong>Type a number in the nonce box.</strong> The fingerprint recomputes as you
            type. When it starts with enough zeros the block commits on its own.
          </li>
          <li>
            <strong>Or press Auto-mine.</strong> The page guesses thousands a second until one
            lands. Worth doing by hand first, so the guessing is not an abstraction.
          </li>
          <li>
            <strong>Read the chain and the balances.</strong> Every block is listed with its
            fingerprint, and the sheet below totals who holds what.
          </li>
          <li>
            <strong>Turn on tamper mode and change a committed block.</strong> Every block after
            it fails at once, because each one carries the fingerprint of the one before. This is
            the security argument in a single click.
          </li>
          <li>
            <strong>Scan the QR code to move the chain.</strong> It carries the whole chain in the
            link, so another device opens the same one. Nothing is stored on a server.
          </li>
          <li>
            <strong>Reset clears it.</strong> It asks twice.
          </li>
        </ol>
      </div>
    </details>
  )
}
