import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Button, Callout, Card, MathSection, NumberField, SegmentedControl, Stat, StepHeader, Toggle } from '../../design-system'
import { usePersistentState } from '../../hooks/usePersistentState'
import {
  type Block,
  MAX_DIFFICULTY,
  HALVING_INTERVAL,
  GENESIS_HASH,
  MAX_SUPPLY,
  blockData,
  buildBalanceGrid,
  buildLedger,
  circulatingSupply,
  computeChain,
  countChanged,
  decodeChain,
  encodeChain,
  hashHue,
  isBlockArray,
  leadingZeros,
  meetsDifficulty,
  sha256Hex,
  suggestedReward,
} from './compute'
import styles from './BitcoinMining.module.css'

/*
 * Bitcoin Mining: the classroom mining game as one page. Students race to
 * find a nonce, the instructor verifies the winner and adds the block, and
 * the blockchain and ledger build themselves. After each round a QR code
 * carries the whole chain to every phone in the room; there is no server,
 * the code encodes the typed inputs and each device re-derives the hashes.
 */

const fmtBtc = (v: number) => `${Number(v.toFixed(2))} BTC`
const fmtCount = (v: number) => v.toLocaleString()

const AUTOMINE_UNLOCK = 2
const CHUNK = 2000
/** A playful electricity price per guess; only shown once auto-mine has burned real guess counts. */
const COST_PER_GUESS = 0.0001
/** Real Bitcoin's nonce is a 32-bit integer, so the classroom one honors the same range. */
const NONCE_MAX = 4294967295

function shortHash(hash: string): string {
  return hash === GENESIS_HASH ? hash : `${hash.slice(0, 12)}…${hash.slice(-6)}`
}

/**
 * A color swatch derived from the hash itself, so a hash and the next
 * block's "previous hash" visibly match: the chain drawn as touching colors.
 */
function HashChip({ hash }: { hash: string }) {
  const bg = hash === GENESIS_HASH ? 'var(--text-faint)' : `hsl(${hashHue(hash).toFixed(0)}, 62%, 48%)`
  return <span className={styles.chip} style={{ background: bg }} aria-hidden />
}

/** The calculated hash with the first `difficulty` characters graded: green zeros hit the target, red characters miss it. */
function HashReadout({ hash, difficulty }: { hash: string; difficulty: number }) {
  const ok = meetsDifficulty(hash, difficulty)
  return (
    <div className={`${styles.readout} ${styles.mono} ${ok ? styles.hashOk : ''}`}>
      {hash
        .slice(0, difficulty)
        .split('')
        .map((ch, i) => (
          <span key={i} className={ch === '0' ? styles.zeroHit : styles.zeroMiss}>
            {ch}
          </span>
        ))}
      {hash.slice(difficulty)}
    </div>
  )
}

function MiningStation() {
  const [blocks, setBlocks] = usePersistentState<Block[]>('ifdm-bitcoin-chain', [], isBlockArray)
  const [difficulty, setDifficulty] = usePersistentState<number>(
    'ifdm-bitcoin-difficulty',
    1,
    (v) => Number.isInteger(v) && v >= 1 && v <= MAX_DIFFICULTY,
  )
  const [miner, setMiner] = useState('')
  const [reward, setReward] = useState(() => suggestedReward(blocks.length))
  const [txFrom, setTxFrom] = useState('')
  const [txTo, setTxTo] = useState('')
  const [txAmount, setTxAmount] = useState(0)
  const [nonce, setNonce] = useState('')
  const [roomSize, setRoomSize] = usePersistentState<number>('ifdm-bitcoin-room', 30, (v) => v >= 1 && v <= 100000)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  /* A scanned QR code lands here as ?chain=...; the URL wins, then is cleared so local progress takes over. */
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const code = searchParams.get('chain')
    if (code == null) return
    const decoded = decodeChain(code)
    const next = new URLSearchParams(searchParams)
    next.delete('chain')
    setSearchParams(next, { replace: true })
    if (decoded) {
      setBlocks(decoded)
      setReward(suggestedReward(decoded.length))
      const last = decoded[decoded.length - 1]
      if (last) setDifficulty(last.difficulty)
      setImportedCount(decoded.length)
      resetRound()
    }
  }, [searchParams, setSearchParams, setBlocks, setDifficulty])

  /* Tamper mode edits live beside the real chain and never persist, so leaving the demo always restores the room's chain. */
  const [tamperOn, setTamperOn] = useState(false)
  const [edits, setEdits] = useState<Record<number, { reward?: number; amount?: number }>>({})
  const viewBlocks = useMemo(
    () =>
      blocks.map((b, i) => {
        const e = edits[i]
        if (!e) return b
        const nb: Block = { ...b }
        if (e.reward != null) nb.reward = e.reward
        if (e.amount != null && nb.tx) nb.tx = { ...nb.tx, amount: e.amount }
        return nb
      }),
    [blocks, edits],
  )
  const tampered = Object.keys(edits).length > 0

  const chain = useMemo(() => computeChain(blocks), [blocks])
  const viewChain = useMemo(() => (tampered ? computeChain(viewBlocks) : null), [tampered, viewBlocks])
  const shownChain = viewChain ?? chain
  const brokenFrom = shownChain.findIndex((m) => !m.valid)

  const ledger = useMemo(() => buildLedger(blocks), [blocks])
  const grid = useMemo(() => buildBalanceGrid(blocks), [blocks])
  const supply = useMemo(() => circulatingSupply(blocks), [blocks])
  const prevHash = chain.length ? chain[chain.length - 1]!.hash : GENESIS_HASH

  /* The candidate block being mined right now, hashed live on every keystroke. */
  const tx = txFrom.trim() && txTo.trim() && txAmount > 0 ? { from: txFrom.trim(), to: txTo.trim(), amount: txAmount } : undefined
  const candidate: Block = { miner: miner.trim(), reward, difficulty, nonce: nonce.trim(), ...(tx ? { tx } : {}) }
  const data = blockData(prevHash, candidate)
  const hash = sha256Hex(data)
  const meets = meetsDifficulty(hash, difficulty)

  const senderBalance = tx ? (ledger.find((r) => r.name === tx.from)?.balance ?? 0) : 0
  const txProblem = tx && senderBalance < tx.amount
  const canMine = Boolean(candidate.miner) && Boolean(candidate.nonce) && meets && !txProblem

  /*
   * Personal race stats: every distinct nonce this device tries is a guess,
   * and the best run of leading zeros so far is the student's trophy even
   * when someone else wins the round. The previous guess's hash is kept to
   * show the avalanche effect: one nonce change rewrites the whole hash.
   */
  const lastTried = useRef<{ nonce: string; hash: string } | null>(null)
  const [prevGuess, setPrevGuess] = useState<{ nonce: string; hash: string } | null>(null)
  const [guessCount, setGuessCount] = useState(0)
  const [bestZeros, setBestZeros] = useState(0)
  const trimmedNonce = candidate.nonce
  useEffect(() => {
    if (!trimmedNonce) return
    if (lastTried.current?.nonce === trimmedNonce) return
    if (lastTried.current) setPrevGuess(lastTried.current)
    lastTried.current = { nonce: trimmedNonce, hash }
    setGuessCount((c) => c + 1)
    setBestZeros((b) => Math.max(b, leadingZeros(hash)))
  }, [trimmedNonce, hash])

  function resetRound() {
    lastTried.current = null
    setPrevGuess(null)
    setGuessCount(0)
    setBestZeros(0)
  }

  /* Auto-mine: churn nonces in small chunks so the guess counter stays live. */
  const autoToken = useRef<{ cancelled: boolean } | null>(null)
  const [autoState, setAutoState] = useState<{ running: boolean; attempts: number } | null>(null)
  const autoUnlocked = blocks.length >= AUTOMINE_UNLOCK

  function stopAutoMine() {
    if (autoToken.current) autoToken.current.cancelled = true
    setAutoState(null)
  }

  function startAutoMine() {
    if (autoToken.current) autoToken.current.cancelled = true
    const token = { cancelled: false }
    autoToken.current = token
    const prefix = blockData(prevHash, { ...candidate, nonce: '' })
    let n = 0
    setAutoState({ running: true, attempts: 0 })
    const step = () => {
      if (token.cancelled) return
      for (let i = 0; i < CHUNK; i++) {
        const h = sha256Hex(prefix + n)
        if (meetsDifficulty(h, difficulty)) {
          setNonce(String(n))
          setAutoState({ running: false, attempts: n + 1 })
          setGuessCount((c) => c + n)
          return
        }
        n++
      }
      setAutoState({ running: true, attempts: n })
      setTimeout(step, 0)
    }
    setTimeout(step, 0)
  }

  useEffect(
    () => () => {
      if (autoToken.current) autoToken.current.cancelled = true
    },
    [],
  )

  function mineBlock() {
    if (!canMine) return
    stopAutoMine()
    const next = [...blocks, candidate]
    setBlocks(next)
    setMiner('')
    setNonce('')
    setTxFrom('')
    setTxTo('')
    setTxAmount(0)
    setReward(suggestedReward(next.length))
    setImportedCount(null)
    resetRound()
  }

  /*
   * Reset is a two-step inline confirm, never window.confirm: the instructor
   * embed runs in a sandboxed iframe where browser dialogs are silently
   * blocked, which would make a dialog-gated reset a button that does nothing.
   */
  const [confirmingReset, setConfirmingReset] = useState(false)
  useEffect(() => {
    if (!confirmingReset) return
    const t = setTimeout(() => setConfirmingReset(false), 6000)
    return () => clearTimeout(t)
  }, [confirmingReset])

  function resetChain() {
    setConfirmingReset(false)
    stopAutoMine()
    setBlocks([])
    setEdits({})
    setTamperOn(false)
    setMiner('')
    setNonce('')
    setTxFrom('')
    setTxTo('')
    setTxAmount(0)
    setReward(suggestedReward(0))
    setImportedCount(null)
    resetRound()
  }

  /* The QR code encodes the chain itself in the page URL; no server involved. */
  const shareUrl = useMemo(() => {
    if (!blocks.length) return ''
    return `${window.location.href.split('#')[0]}#/teacher-training/bitcoin-mining?chain=${encodeChain(blocks)}`
  }, [blocks])
  const [qrDataUrl, setQrDataUrl] = useState('')
  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl('')
      return
    }
    let alive = true
    QRCode.toDataURL(shareUrl, {
      width: 440,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    }).then((url) => {
      if (alive) setQrDataUrl(url)
    })
    return () => {
      alive = false
    }
  }, [shareUrl])
  const [copied, setCopied] = useState(false)
  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const nextHalvingIn = HALVING_INTERVAL - (blocks.length % HALVING_INTERVAL)

  return (
    <div className={styles.stack}>
      {importedCount != null && (
        <Callout tone="note" label="Chain loaded">
          This device scanned in a chain of {importedCount} {importedCount === 1 ? 'block' : 'blocks'} and re-verified every
          hash. You are up to date with the room.
        </Callout>
      )}

      <section className={styles.section}>
        <StepHeader
          step={1}
          title="Mine the next block"
          hint="Everyone puts their own name as the miner and races to find a nonce that turns the hash green. The winner calls out their name and nonce; enter both here, watch the hash verify, and add the block."
        />
        <div className={styles.readout}>
          <div className={styles.readoutLabel}>Previous hash</div>
          <HashChip hash={prevHash} />
          <span className={styles.mono}>{prevHash}</span>
        </div>
        <div className={styles.band}>
          <SegmentedControl
            label="Difficulty (leading zeros)"
            options={Array.from({ length: MAX_DIFFICULTY }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
            value={String(difficulty)}
            onChange={(v) => setDifficulty(Number(v))}
          />
          <NumberField label="People mining" value={roomSize} onChange={setRoomSize} min={1} max={100000} precision={0} />
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="btc-miner">
              Miner
            </label>
            <input
              id="btc-miner"
              className={styles.textInput}
              value={miner}
              onChange={(e) => setMiner(e.target.value)}
              placeholder="Who mined it"
              autoComplete="off"
            />
          </div>
          <NumberField label="Block reward" value={reward} onChange={setReward} min={0} suffix=" BTC" precision={2} />
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="btc-from">
              Sender (optional)
            </label>
            <input
              id="btc-from"
              className={styles.textInput}
              value={txFrom}
              onChange={(e) => setTxFrom(e.target.value)}
              placeholder="Pays from balance"
              autoComplete="off"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="btc-to">
              Receiver
            </label>
            <input
              id="btc-to"
              className={styles.textInput}
              value={txTo}
              onChange={(e) => setTxTo(e.target.value)}
              placeholder="Gets paid"
              autoComplete="off"
            />
          </div>
          <NumberField label="Amount sent" value={txAmount} onChange={setTxAmount} min={0} suffix=" BTC" precision={2} />
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="btc-nonce">
              Nonce
            </label>
            <input
              id="btc-nonce"
              className={`${styles.textInput} ${styles.mono}`}
              value={nonce}
              inputMode="numeric"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                // Past the 32-bit ceiling the field simply stops accepting digits.
                if (digits && Number(digits) > NONCE_MAX) return
                setNonce(digits)
              }}
              placeholder="0 to 4,294,967,295"
              autoComplete="off"
            />
          </div>
        </div>
        <p className={styles.footnote}>
          Pace of this round: alone, a miner needs about {fmtCount(16 ** difficulty)} guesses at difficulty {difficulty}.
          With {fmtCount(roomSize)} people racing, expect a winner after about{' '}
          {fmtCount(Math.max(1, Math.round(16 ** difficulty / roomSize)))} guesses each. Raise the difficulty as the room
          grows, exactly as the real network does.
        </p>
        <div className={styles.readouts}>
          <div className={styles.readout}>
            <div className={styles.readoutLabel}>Block data (what gets hashed)</div>
            <span className={styles.mono}>{data}</span>
          </div>
          <div>
            <div className={styles.readoutLabel}>
              Calculated hash (must start with {'0'.repeat(difficulty)})
            </div>
            <HashReadout hash={hash} difficulty={difficulty} />
          </div>
        </div>
        {prevGuess && trimmedNonce && prevGuess.nonce !== trimmedNonce && (
          <div className={styles.avalanche}>
            <span className={styles.hint}>
              Your last guess, nonce {prevGuess.nonce}, gave a completely different hash: changing the nonce rewrote{' '}
              {countChanged(prevGuess.hash, hash)} of 64 characters. That unpredictability is why guessing is the only
              way to mine.
            </span>
            <span className={`${styles.mono} ${styles.avalancheHash}`}>
              {prevGuess.hash.split('').map((ch, i) => (
                <span key={i} className={ch !== hash[i] ? styles.avalancheChanged : undefined}>
                  {ch}
                </span>
              ))}
            </span>
          </div>
        )}
        {guessCount > 0 && (
          <p className={styles.footnote}>
            Your guesses this round: {fmtCount(guessCount)} · your best hash so far started with {bestZeros} leading{' '}
            {bestZeros === 1 ? 'zero' : 'zeros'}.
          </p>
        )}
        <div className={styles.actions}>
          {/* Quiet while unmineable (a disabled cardinal button washes its label out), flipping to solid cardinal the moment the hash verifies. */}
          <Button onClick={mineBlock} disabled={!canMine} variant={canMine ? 'primary' : 'quiet'}>
            Add block to the chain
          </Button>
          {autoUnlocked &&
            (autoState?.running ? (
              <Button variant="quiet" onClick={stopAutoMine}>
                Stop ({fmtCount(autoState.attempts)} guesses so far)
              </Button>
            ) : (
              <Button variant="quiet" onClick={startAutoMine} disabled={!candidate.miner || Boolean(txProblem)}>
                Auto-mine
              </Button>
            ))}
          {autoState && !autoState.running && (
            <span className={styles.hint}>
              Found after {fmtCount(autoState.attempts)} guesses
              {autoState.attempts >= 100
                ? `, about $${(autoState.attempts * COST_PER_GUESS).toFixed(2)} of electricity at $${COST_PER_GUESS} a guess. The reward has to beat that cost, or nobody mines.`
                : '.'}
            </span>
          )}
          {txProblem && tx && (
            <span className={styles.warn}>
              {tx.from} has only {fmtBtc(senderBalance)} to send. The network rejects a payment its ledger cannot cover.
            </span>
          )}
          {!txProblem && !canMine && (
            <span className={styles.hint}>
              {!candidate.miner
                ? 'Enter a miner name to start.'
                : !candidate.nonce
                  ? 'Guess a nonce, or hand the room the race.'
                  : `The hash must start with ${difficulty} ${difficulty === 1 ? 'zero' : 'zeros'}. Keep guessing.`}
            </span>
          )}
          {!autoUnlocked && (
            <span className={styles.hint}>
              Auto-mine unlocks after {AUTOMINE_UNLOCK} hand-mined blocks ({blocks.length} so far).
            </span>
          )}
        </div>
        <p className={styles.footnote}>
          The reward field follows Bitcoin's supply schedule: it halves every {HALVING_INTERVAL} blocks here (every 210,000
          on the real network), next halving in {nextHalvingIn} {nextHalvingIn === 1 ? 'block' : 'blocks'}. You can
          override it for your class.
        </p>
      </section>

      {blocks.length > 0 && (
        <section className={styles.section}>
          <StepHeader
            step={2}
            title="The blockchain"
            hint="Each block's hash is computed from the previous block's hash, so the blocks form a chain. The color swatch is a hash's fingerprint: follow it from one block's hash into the next block's previous-hash slot. Nothing below is stored, every hash is re-derived from the typed entries."
          />
          <div className={styles.stats}>
            <Stat label="Blocks mined" value={blocks.length} format={fmtCount} animate={false} />
            <Stat
              label="Circulating supply"
              value={supply}
              format={fmtBtc}
              note={`of the ${MAX_SUPPLY} BTC the halving schedule will ever allow`}
              emphasis
              animate={false}
            />
            <Stat label="Participants on the ledger" value={ledger.length} format={fmtCount} animate={false} />
          </div>
          <div className={styles.actions}>
            <Toggle
              label="Tamper with a mined block"
              checked={tamperOn}
              onChange={(v: boolean) => {
                setTamperOn(v)
                if (!v) setEdits({})
              }}
            />
            {confirmingReset ? (
              <>
                <Button size="sm" onClick={resetChain}>
                  Yes, clear all {blocks.length} blocks
                </Button>
                <Button variant="quiet" size="sm" onClick={() => setConfirmingReset(false)}>
                  Keep the chain
                </Button>
              </>
            ) : (
              <Button variant="quiet" size="sm" onClick={() => setConfirmingReset(true)}>
                Start a new chain
              </Button>
            )}
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Previous hash</th>
                  <th>Nonce</th>
                  <th>Block contents</th>
                  <th>Hash</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shownChain.map((m, i) => (
                  <tr key={i} className={m.valid ? '' : styles.invalidRow}>
                    <td className={styles.numCell}>{i + 1}</td>
                    <td className={styles.hashCell} title={m.prevHash}>
                      <HashChip hash={m.prevHash} />
                      {shortHash(m.prevHash)}
                    </td>
                    <td className={styles.hashCell}>{m.block.nonce}</td>
                    <td>
                      {m.block.miner} mined{' '}
                      {tamperOn ? (
                        <input
                          type="number"
                          className={styles.tamperInput}
                          value={m.block.reward}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [i]: { ...prev[i], reward: Number(e.target.value) || 0 } }))
                          }
                        />
                      ) : (
                        fmtBtc(m.block.reward)
                      )}
                      {m.block.tx && (
                        <>
                          <br />
                          {m.block.tx.from} paid {m.block.tx.to}{' '}
                          {tamperOn ? (
                            <input
                              type="number"
                              className={styles.tamperInput}
                              value={m.block.tx.amount}
                              onChange={(e) =>
                                setEdits((prev) => ({ ...prev, [i]: { ...prev[i], amount: Number(e.target.value) || 0 } }))
                              }
                            />
                          ) : (
                            fmtBtc(m.block.tx.amount)
                          )}
                        </>
                      )}
                    </td>
                    <td className={styles.hashCell} title={m.hash}>
                      <HashChip hash={m.hash} />
                      {shortHash(m.hash)}
                    </td>
                    <td>
                      {m.valid ? (
                        <span className={styles.statusOk}>verified</span>
                      ) : (
                        <span className={styles.statusBad}>broken</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tamperOn && (
            <Callout tone="mark" label={tampered ? 'The chain caught it' : 'Try to rewrite history'}>
              {tampered && brokenFrom >= 0 ? (
                <>
                  Changing block {brokenFrom + 1} changed its data, so its hash no longer starts with the required zeros,
                  and every block after it fails too because each one contains the hash of the one before. To sneak this
                  edit past the class, you would have to re-mine block {brokenFrom + 1} and every later block before
                  anyone noticed. Turn tamper mode off to restore the chain.
                </>
              ) : (
                <>
                  Edit any reward or payment amount in the table. The chain recomputes instantly, and you will see why an
                  edit to an old block cannot survive.
                </>
              )}
            </Callout>
          )}
        </section>
      )}

      {blocks.length > 0 && (
        <section className={styles.section}>
          <StepHeader
            step={3}
            title="The Bitcoin ledger"
            hint="The spreadsheet the room used to keep by hand, read off the chain: one column per block, each cell a participant's balance in BTC after that round, with the round's change marked. A blank cell means they had not joined yet."
          />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>Participant</th>
                  {grid.rewards.map((_, r) => (
                    <th key={r}>Block {r + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.names.map((name, i) => (
                  <tr key={name}>
                    <td className={`${styles.rowHead} ${styles.stickyCol}`}>{name}</td>
                    {grid.balances.map((round, r) => {
                      const bal = round[i]
                      const prev = r > 0 ? grid.balances[r - 1]![i] : undefined
                      const delta = bal == null ? 0 : bal - (prev ?? 0)
                      const cls = [
                        styles.numCell,
                        r === grid.balances.length - 1 ? styles.cellNow : '',
                        delta > 0 ? styles.cellUp : delta < 0 ? styles.cellDown : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <td key={r} className={cls}>
                          {bal == null ? '' : Number(bal.toFixed(2))}
                          {bal != null && delta !== 0 && (
                            <span className={delta > 0 ? styles.deltaUp : styles.deltaDown}>
                              {delta > 0 ? `+${Number(delta.toFixed(2))}` : `−${Number(Math.abs(delta).toFixed(2))}`}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className={styles.gridRule}>
                  <td className={`${styles.rowHead} ${styles.stickyCol}`}>Block reward</td>
                  {grid.rewards.map((rw, r) => (
                    <td key={r} className={styles.numCell}>
                      {Number(rw.toFixed(2))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`${styles.rowHead} ${styles.stickyCol}`}>Circulating supply</td>
                  {grid.supply.map((s, r) => (
                    <td key={r} className={`${styles.numCell} ${styles.supplyCell}`}>
                      {Number(s.toFixed(2))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {blocks.length > 0 && (
        <section className={styles.section}>
          <StepHeader
            step={4}
            title="Sync the room"
            hint="After each round, project this code. Anyone who scans it opens this page with the full chain loaded, and their phone re-computes and verifies every hash on arrival."
          />
          <div className={styles.qrRow}>
            {qrDataUrl && (
              <div className={styles.qrBox}>
                <img src={qrDataUrl} alt={`QR code carrying the current ${blocks.length}-block chain`} />
              </div>
            )}
            <div className={styles.qrCol}>
              <p className={styles.lede}>
                There is no server and no database behind this code. It encodes the chain itself: every miner, reward,
                payment, and nonce, small enough to fit because the hashes do not need to travel. Each phone re-derives
                them, which is the same reason a forged code cannot pass: its chain arrives broken.
              </p>
              <div className={styles.actions}>
                <Button variant="quiet" size="sm" onClick={copyLink}>
                  {copied ? 'Copied' : 'Copy link instead'}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <MathSection
        hint="Why finding a block is hard, checking one is instant, and a bigger room needs a higher difficulty."
        rows={[
          {
            tex: 'P(\\text{a guess is valid}) = 16^{-d}',
            caption: `Each character of the hash is one of 16 hex values. Requiring d leading zeros means the first d characters must all land on 0.`,
          },
          {
            tex: `d = ${difficulty}: \\quad P = 16^{-${difficulty}} = \\tfrac{1}{${16 ** difficulty}}, \\qquad E[\\text{guesses, one miner}] = 16^{${difficulty}} = \\boxed{${16 ** difficulty}}`,
            muted: true,
          },
          {
            tex: `\\text{a room of } ${roomSize} \\text{ mining together: } \\; E[\\text{guesses each}] = \\tfrac{16^{${difficulty}}}{${roomSize}} \\approx \\boxed{${Math.max(1, Math.round(16 ** difficulty / roomSize))}}`,
            caption:
              'Guessing in parallel splits the work: the more miners join, the faster blocks fall. That is why the real network raises the difficulty as miners join, to hold one block every ten minutes no matter how big the room gets.',
            muted: true,
          },
        ]}
        note={`Finding a block at difficulty ${difficulty} costs about ${(16 ** difficulty).toLocaleString()} guesses, but checking a claimed winner takes exactly one hash. That asymmetry is proof of work: expensive to produce, instant for the whole room to verify, which is also what the QR code relies on.`}
      />
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function BitcoinMiningPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Lesson · Investing</p>
          <h1 className={styles.h1}>Bitcoin Mining</h1>
          <p className={styles.lead}>
            The class becomes the network. Each round, everyone races to find a nonce whose hash clears the difficulty
            target; the winner earns the block reward, the block joins the chain, and the ledger of who owns what falls
            out of the chain itself. A QR code after each round carries the whole chain to every phone in the room.
          </p>
        </header>
      )}

      <Card tone="raised" className={styles.panel}>
        <MiningStation />
      </Card>
    </div>
  )
}
