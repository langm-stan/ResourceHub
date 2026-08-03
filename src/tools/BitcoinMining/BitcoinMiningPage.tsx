import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import * as XLSX from 'xlsx'
import '@fontsource/source-serif-4/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import { FormulaBlock } from '../../design-system'
import { usePersistentState } from '../../hooks/usePersistentState'
import {
  type Block,
  GENESIS_HASH,
  HALVING_INTERVAL,
  MAX_DIFFICULTY,
  MAX_SUPPLY,
  NAME_MAX,
  NONCE_MAX,
  blockData,
  buildBalanceGrid,
  buildLedger,
  buildWorkbookData,
  circulatingSupply,
  decodeChain,
  deriveChain,
  encodeChain,
  fmtBtc,
  isBlockArray,
  meetsDifficulty,
  nameKey,
  rewardAt,
  sha256Hex,
  shortHash,
  swatch,
} from './compute'
import styles from './BitcoinMining.module.css'

/*
 * Bitcoin Mining, "Chain Rail" design: the classroom mining game as one
 * card. Students race to find a nonce, the winning block pops onto a
 * hash-linked rail of block cards, and the ledger is re-derived from the
 * chain on every change. A QR code carries the whole chain to every phone;
 * there is no server, each device re-derives the hashes on arrival.
 */

/** Auto-mine appears once the room has felt the work by hand. */
const AUTOMINE_UNLOCK = 2
const CHUNK = 600

/** Names feed the hashed data string, which is |-delimited, so | can never enter a name. */
function cleanName(raw: string): string {
  return raw.replace(/\|/g, '').slice(0, NAME_MAX)
}

function Swatch({ hash, small }: { hash: string; small?: boolean }) {
  return <span className={small ? styles.swatchSm : styles.swatch} style={{ background: swatch(hash) }} aria-hidden />
}

function MiningCard() {
  const [blocks, setBlocks] = usePersistentState<Block[]>('ifdm-bitcoin-chain', [], isBlockArray)
  const [difficulty, setDifficulty] = usePersistentState<number>(
    'ifdm-bitcoin-difficulty',
    1,
    (v) => Number.isInteger(v) && v >= 1 && v <= MAX_DIFFICULTY,
  )
  const [people, setPeople] = usePersistentState<number>('ifdm-bitcoin-room', 30, (v) => v >= 1 && v <= 100000)
  const [peopleDraft, setPeopleDraft] = useState(() => String(people))
  const [miner, setMiner] = useState('')
  const [nonce, setNonce] = useState('')
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [tamperOn, setTamperOn] = useState(false)
  const [tamperEdits, setTamperEdits] = useState<Record<number, string>>({})
  const [mining, setMining] = useState(false)
  const [tried, setTried] = useState(0)
  /** Timestamp of the newest commit; retriggers the green movement flash on ledger rows. */
  const [flashKey, setFlashKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)

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
      /* A scan mid-race replaces the round: stop any auto-mine and clear the half-typed block. */
      if (autoToken.current) autoToken.current.cancelled = true
      setMining(false)
      setBlocks(decoded)
      setTamperEdits({})
      setMiner('')
      setNonce('')
      setSender('')
      setReceiver('')
      setAmountStr('')
      setConfirmingReset(false)
      const last = decoded[decoded.length - 1]
      if (last) setDifficulty(last.difficulty)
    }
  }, [searchParams, setSearchParams, setBlocks, setDifficulty])

  const chain = useMemo(() => deriveChain(blocks, tamperOn ? tamperEdits : {}), [blocks, tamperOn, tamperEdits])
  const broken = chain.some((v) => !v.valid)
  /* Mining always continues from the real chain, not a tamper-demo view. */
  const tip = useMemo(() => {
    const base = tamperOn && Object.keys(tamperEdits).length ? deriveChain(blocks) : chain
    return base.length ? base[base.length - 1]!.hash : GENESIS_HASH
  }, [blocks, chain, tamperOn, tamperEdits])

  const ledger = useMemo(() => buildLedger(blocks), [blocks])
  const grid = useMemo(() => buildBalanceGrid(blocks), [blocks])
  const supply = useMemo(() => circulatingSupply(blocks), [blocks])
  const reward = rewardAt(blocks.length)
  const toHalving = HALVING_INTERVAL - (blocks.length % HALVING_INTERVAL)

  /* The candidate block, hashed live on every keystroke. */
  const amount = parseFloat(amountStr) || 0
  const candidate = { miner: miner.trim(), reward, sender: sender.trim(), receiver: receiver.trim(), amount, nonce: nonce.trim() }
  const liveData = blockData(tip, candidate)
  const liveHash = sha256Hex(liveData)

  /*
   * Payment safeguards: a payment must be complete (sender, receiver, and a
   * positive amount, or none of the three), can't pay yourself, and can't
   * spend coins the ledger doesn't show. The pre-block balance is what
   * counts: like real coinbase rules, this block's own reward can't fund it.
   */
  const txStarted = Boolean(candidate.sender || candidate.receiver || amount > 0)
  const txComplete = Boolean(candidate.sender && candidate.receiver && amount > 0)
  const txPartial = txStarted && !txComplete
  const txSelf = txComplete && nameKey(candidate.sender) === nameKey(candidate.receiver)
  const senderBalance = txComplete ? (ledger.find((r) => nameKey(r.name) === nameKey(candidate.sender))?.balance ?? 0) : 0
  const txOverdraft = txComplete && !txSelf && senderBalance < amount
  const txProblem = txPartial
    ? 'A payment needs a sender, a receiver, and an amount. Finish it or clear it.'
    : txSelf
      ? `${candidate.sender} can't pay themselves; pick a different receiver or clear the payment.`
      : txOverdraft
        ? `${candidate.sender} has only ${fmtBtc(senderBalance)} BTC to send. The network rejects a payment the ledger can't cover.`
        : null

  const liveValid = meetsDifficulty(liveHash, difficulty) && Boolean(candidate.miner) && candidate.nonce !== '' && !txProblem

  const expGuesses = 16 ** difficulty
  const expRoom = Math.max(1, Math.round(expGuesses / people))
  const zeros = `${difficulty} ${difficulty === 1 ? 'zero' : 'zeros'}`

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function commitBlock(block: Block) {
    setBlocks((prev) => [...prev, block])
    setMiner('')
    setNonce('')
    setSender('')
    setReceiver('')
    setAmountStr('')
    setMining(false)
    setTried(0)
    const key = Date.now()
    setFlashKey(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashKey(0), 2000)
  }

  function addBlock() {
    if (!liveValid) return
    stopAutoMine()
    commitBlock({ ...candidate, difficulty })
  }

  /* Auto-mine: churn nonces in chunks from a random start, spinning the nonce field live, and commit on the hit. */
  const autoToken = useRef<{ cancelled: boolean } | null>(null)
  function stopAutoMine() {
    if (autoToken.current) autoToken.current.cancelled = true
    setMining(false)
  }
  function autoMine() {
    if (mining) {
      stopAutoMine()
      return
    }
    /* Auto-mine would commit on the hit, so the contents must already pass every guard. */
    if (!candidate.miner || txProblem) return
    const token = { cancelled: false }
    autoToken.current = token
    setMining(true)
    setTried(0)
    const base = { ...candidate }
    const target = difficulty
    let n = Math.floor(Math.random() * 100000)
    let count = 0
    const step = () => {
      if (token.cancelled) return
      for (let i = 0; i < CHUNK; i++) {
        const h = sha256Hex(blockData(tip, { ...base, nonce: String(n) }))
        count++
        if (meetsDifficulty(h, target)) {
          setNonce(String(n))
          setTried(count)
          commitBlock({ ...base, nonce: String(n), difficulty: target })
          return
        }
        n++
      }
      setTried(count)
      setNonce(String(n))
      setTimeout(step, 0)
    }
    setTimeout(step, 0)
  }
  useEffect(
    () => () => {
      if (autoToken.current) autoToken.current.cancelled = true
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  /*
   * Reset is a two-step inline confirm, never window.confirm: the instructor
   * embed runs in a sandboxed iframe where browser dialogs are silently blocked.
   */
  useEffect(() => {
    if (!confirmingReset) return
    const t = setTimeout(() => setConfirmingReset(false), 6000)
    return () => clearTimeout(t)
  }, [confirmingReset])
  function resetChain() {
    setConfirmingReset(false)
    stopAutoMine()
    setBlocks([])
    setTamperEdits({})
    setTamperOn(false)
    setMiner('')
    setNonce('')
    setSender('')
    setReceiver('')
    setAmountStr('')
  }

  /* The QR encodes the chain itself in the page URL; no server involved. */
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
    QRCode.toDataURL(shareUrl, { width: 640, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } })
      .then((url) => {
        if (alive) setQrDataUrl(url)
      })
      .catch(() => {
        /* A very long chain can exceed QR capacity; the copy button still works. */
        if (alive) setQrDataUrl('')
      })
    return () => {
      alive = false
    }
  }, [shareUrl])
  function copyChain() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  /* The whole game as a workbook: blockchain with full hashes, ledger, and the movement grid. */
  function downloadExcel() {
    if (!blocks.length) return
    const data = buildWorkbookData(blocks)
    const wb = XLSX.utils.book_new()
    const wsChain = XLSX.utils.aoa_to_sheet(data.blockchain)
    wsChain['!cols'] = [
      { wch: 6 }, { wch: 66 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 66 }, { wch: 9 },
    ]
    XLSX.utils.book_append_sheet(wb, wsChain, 'Blockchain')
    const wsLedger = XLSX.utils.aoa_to_sheet(data.ledger)
    wsLedger['!cols'] = [{ wch: 18 }, { wch: 11 }, { wch: 13 }]
    XLSX.utils.book_append_sheet(wb, wsLedger, 'Ledger')
    const wsMove = XLSX.utils.aoa_to_sheet(data.movement)
    wsMove['!cols'] = [{ wch: 18 }, ...data.movement[0]!.slice(1).map(() => ({ wch: 10 }))]
    XLSX.utils.book_append_sheet(wb, wsMove, 'Movement')
    XLSX.writeFile(wb, `ifdm-bitcoin-mining-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className={styles.card}>
      {/* 1 · Mine the next block */}
      <div className={styles.sectionRow}>
        <span className={styles.badge}>1</span>
        <span className={styles.secTitle}>Mine the next block</span>
        <span className={styles.secHint}>race to a nonce whose hash starts with {zeros}</span>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <div className={styles.label}>PREVIOUS HASH</div>
          <div className={styles.hashRow}>
            <Swatch hash={tip} />
            <span className={styles.hashRowText}>{tip === GENESIS_HASH ? '000000…0000' : shortHash(tip)}</span>
          </div>
          <div className={styles.dialsRow}>
            <div>
              <span className={styles.fieldLabel}>DIFFICULTY</span>
              <div className={styles.diffPills}>
                {Array.from({ length: MAX_DIFFICULTY }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n === difficulty ? `${styles.diffPill} ${styles.diffPillActive}` : styles.diffPill}
                    onClick={() => setDifficulty(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={styles.fieldLabel}>PEOPLE MINING</span>
              <input
                className={`${styles.input} ${styles.peopleInput}`}
                value={peopleDraft}
                inputMode="numeric"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setPeopleDraft(digits)
                  const v = parseInt(digits, 10)
                  if (Number.isFinite(v) && v >= 1 && v <= 100000) setPeople(v)
                }}
                onBlur={() => setPeopleDraft(String(people))}
                aria-label="People mining"
              />
            </div>
            <div className={styles.paceCopy}>
              expect a winner after ~{expRoom.toLocaleString()} {expRoom === 1 ? 'guess' : 'guesses'} each
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <label className={styles.fieldLabel} htmlFor="btc-miner">
                MINER
              </label>
              <input
                id="btc-miner"
                className={styles.input}
                style={{ width: '100%' }}
                value={miner}
                onChange={(e) => setMiner(cleanName(e.target.value))}
                placeholder="Who mined it?"
                autoComplete="off"
              />
            </div>
            <div>
              <span className={styles.fieldLabel}>REWARD</span>
              <div className={styles.rewardValue}>{fmtBtc(reward)} BTC</div>
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="btc-sender">
                SENDER
              </label>
              <input
                id="btc-sender"
                className={`${styles.input} ${styles.inputSm}`}
                style={{ width: '100%' }}
                value={sender}
                onChange={(e) => setSender(cleanName(e.target.value))}
                placeholder="optional"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="btc-receiver">
                RECEIVER
              </label>
              <input
                id="btc-receiver"
                className={`${styles.input} ${styles.inputSm}`}
                style={{ width: '100%' }}
                value={receiver}
                onChange={(e) => setReceiver(cleanName(e.target.value))}
                placeholder="gets paid"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={styles.fieldLabel} htmlFor="btc-amount">
                AMOUNT
              </label>
              <input
                id="btc-amount"
                className={`${styles.input} ${styles.inputSm}`}
                style={{ width: '100%' }}
                value={amountStr}
                inputMode="decimal"
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9.]/g, '')
                  const [head, ...rest] = cleaned.split('.')
                  setAmountStr(rest.length ? `${head}.${rest.join('')}` : cleaned)
                }}
                placeholder="0 BTC"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live hash bar */}
      <div className={liveValid ? `${styles.hashBar} ${styles.hashBarValid}` : styles.hashBar}>
        <div className={styles.dataRow}>
          <div className={styles.label}>BLOCK DATA · PREV HASH | MINER | REWARD | SENDER | RECEIVER | AMOUNT | NONCE</div>
          <div className={styles.dataText}>{liveData}</div>
        </div>
        <div className={styles.hashBarRow}>
          <div>
            <div className={styles.label}>NONCE</div>
            <input
              className={styles.nonceInput}
              value={nonce}
              inputMode="numeric"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                if (digits && Number(digits) > NONCE_MAX) return
                setNonce(digits)
              }}
              placeholder="0 to 4,294,967,295"
              autoComplete="off"
              aria-label="Nonce"
            />
          </div>
          <div className={styles.liveHashCol}>
            <div className={styles.label}>SHA-256 OF THIS BLOCK · MUST START WITH {zeros}</div>
            <div className={styles.liveHash}>
              <span className={liveHash.startsWith('0'.repeat(difficulty)) ? `${styles.prefix} ${styles.prefixOk}` : styles.prefix}>
                {liveHash.slice(0, difficulty)}
              </span>
              <span className={styles.hashRest}>{liveHash.slice(difficulty)}</span>
            </div>
          </div>
          <div className={styles.buttonCol}>
            <button
              type="button"
              className={liveValid ? `${styles.addBtn} ${styles.addBtnValid}` : styles.addBtn}
              disabled={!liveValid}
              onClick={addBlock}
            >
              {liveValid ? '✓ Add block to the chain' : 'Add block to the chain'}
            </button>
            {blocks.length >= AUTOMINE_UNLOCK && (
              <button type="button" className={styles.autoBtn} disabled={!mining && !candidate.miner} onClick={autoMine}>
                {mining ? 'Stop' : 'Auto-mine'}
              </button>
            )}
          </div>
        </div>
        {mining && <div className={styles.miningLine}>⛏ trying nonces… {tried.toLocaleString()} guesses so far</div>}
        {txProblem && <div className={styles.warnLine}>{txProblem}</div>}
      </div>
      <div className={styles.halvingCopy}>
        Reward halves every {HALVING_INTERVAL} blocks (every 210,000 on the real network); next halving in {toHalving}{' '}
        {toHalving === 1 ? 'block' : 'blocks'}.
      </div>

      {/* 2 · The blockchain */}
      <div className={`${styles.sectionRow} ${styles.sectionGap}`}>
        <span className={styles.badge}>2</span>
        <span className={styles.secTitle}>The blockchain</span>
        <span className={styles.secHint}>follow a hash's color into the next block's previous-hash slot</span>
        <span className={styles.spacer} />
        <label className={styles.tamperLabel}>
          <input
            type="checkbox"
            checked={tamperOn}
            onChange={(e) => {
              setTamperOn(e.target.checked)
              if (!e.target.checked) setTamperEdits({})
            }}
          />{' '}
          Tamper mode
        </label>
        {confirmingReset ? (
          <>
            <button type="button" className={`${styles.ghostBtn} ${styles.ghostBtnDanger}`} onClick={resetChain}>
              Yes, clear {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setConfirmingReset(false)}>
              Keep the chain
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => {
              if (blocks.length) setConfirmingReset(true)
            }}
          >
            Start a new chain
          </button>
        )}
      </div>

      <div className={styles.rail}>
        <div className={styles.railInner}>
          <div className={styles.genesisCard}>
            <div className={styles.cardLabel}>GENESIS</div>
            <div className={styles.genesisHash}>
              <Swatch hash={GENESIS_HASH} small />
              <span>000000…0000</span>
            </div>
            <div className={styles.genesisNote}>the chain starts from all zeros</div>
          </div>
          {chain.map((v, i) => (
            <div key={i} className={styles.blockWrap}>
              <div
                className={styles.connector}
                style={{ backgroundImage: `repeating-linear-gradient(90deg, ${swatch(v.prevHash)} 0 10px, transparent 10px 16px)` }}
              />
              <div className={v.valid ? styles.blockCard : `${styles.blockCard} ${styles.blockCardInvalid}`}>
                <div className={styles.blockTitleRow}>
                  <span className={styles.blockTitle}>Block {i + 1}</span>
                  <span className={styles.spacer} />
                  <span className={v.valid ? styles.statusOk : styles.statusBad}>{v.valid ? '✓ verified' : '✗ invalid'}</span>
                </div>
                <div>
                  <div className={styles.cardLabel}>PREVIOUS HASH</div>
                  <div className={styles.cardHashRow}>
                    <Swatch hash={v.prevHash} small />
                    <span>{v.prevHash === GENESIS_HASH ? '000000…0000' : shortHash(v.prevHash)}</span>
                  </div>
                </div>
                {tamperOn ? (
                  <div className={styles.tamperBox}>
                    <div className={styles.cardLabelDanger}>CONTENTS · EDIT ME</div>
                    <input
                      className={styles.tamperInput}
                      value={v.contents}
                      onChange={(e) => setTamperEdits((prev) => ({ ...prev, [i]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div>
                    <div className={styles.cardLabel}>CONTENTS</div>
                    <div className={styles.cardContents}>{v.contents}</div>
                  </div>
                )}
                <div className={styles.nonceLine}>
                  nonce <span className={styles.nonceValue}>{v.block.nonce}</span>
                </div>
                <div>
                  <div className={styles.cardLabel}>HASH</div>
                  <div className={styles.cardHashRow}>
                    <Swatch hash={v.hash} small />
                    <span className={v.valid ? styles.hashOkText : styles.hashBadText}>{shortHash(v.hash)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {broken && blocks.length > 0 && (
        <div className={styles.brokenNote}>
          The chain is broken: a tampered block's hash no longer matches what the next block recorded. Every block after it
          is now invalid, and that is why history on a blockchain is hard to rewrite.
        </div>
      )}

      {/* Stats strip */}
      <div className={styles.statsRow}>
        <div>
          <div className={styles.label}>BLOCKS MINED</div>
          <div className={styles.statBig}>{blocks.length}</div>
        </div>
        <div className={styles.supplyCol}>
          <div className={styles.label}>CIRCULATING SUPPLY</div>
          <div className={styles.statBig}>
            {fmtBtc(supply)} <span className={styles.statUnit}>of {MAX_SUPPLY} BTC ever</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.min(100, (supply / MAX_SUPPLY) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className={styles.label}>NEXT HALVING</div>
          <div className={styles.statBig}>
            {toHalving} {toHalving === 1 ? 'block' : 'blocks'}
          </div>
        </div>
      </div>

      {/* 3 · The ledger */}
      <div className={`${styles.sectionRow} ${styles.sectionGap}`}>
        <span className={styles.badge}>3</span>
        <span className={styles.secTitle}>The ledger</span>
        <span className={styles.secHint}>nothing here is stored: every balance is re-read off the chain</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.ghostBtn} onClick={downloadExcel} disabled={!blocks.length}>
          Download Excel
        </button>
      </div>
      <div className={styles.ledgerTable}>
        <div className={styles.ledgerHead}>
          <span>PARTICIPANT</span>
          <span>BLOCKS WON</span>
          <span>LAST BLOCK</span>
          <span style={{ textAlign: 'right' }}>BALANCE</span>
        </div>
        {ledger.map((r) => (
          <div
            key={r.touchedLast && flashKey ? `${r.name}:${flashKey}` : r.name}
            className={r.touchedLast && flashKey ? `${styles.ledgerRow} ${styles.ledgerFlash}` : styles.ledgerRow}
          >
            <span className={styles.ledgerName}>{r.name}</span>
            <span className={styles.ledgerWon}>
              {r.blocksWon} {r.blocksWon === 1 ? 'block' : 'blocks'}
            </span>
            {r.minedLast > 0 || r.txLast !== 0 ? (
              <span className={styles.deltaCell}>
                {r.minedLast > 0 && <span className={styles.deltaMine}>⛏ +{fmtBtc(r.minedLast)}</span>}
                {r.txLast !== 0 && (
                  <span className={r.txLast > 0 ? styles.deltaUp : styles.deltaDown}>
                    {r.txLast > 0 ? '+' : '−'}
                    {fmtBtc(Math.abs(r.txLast))}
                  </span>
                )}
              </span>
            ) : (
              <span className={styles.deltaNone}>—</span>
            )}
            <span className={styles.ledgerBalance}>{fmtBtc(r.balance)} BTC</span>
          </div>
        ))}
        {ledger.length === 0 && <div className={styles.ledgerEmpty}>No blocks yet: mine one and the first balance appears here.</div>}
      </div>
      {ledger.length > 0 && (
        <div className={styles.colorLegend}>
          <span className={styles.deltaMine}>⛏ mined reward</span>
          <span className={styles.deltaUp}>+ received</span>
          <span className={styles.deltaDown}>− sent</span>
        </div>
      )}

      {/* The movement sheet: the hand-kept classroom spreadsheet, derived. */}
      {blocks.length > 0 && (
        <>
          <div className={styles.sheetHead}>
            <span className={styles.label}>MOVEMENT BY BLOCK</span>
            <span className={styles.secHint}>each cell is a balance after that block; the round's change is marked</span>
          </div>
          <div className={styles.sheetWrap}>
            <table className={styles.sheet}>
              <thead>
                <tr>
                  <th className={styles.sheetSticky}>PARTICIPANT</th>
                  {grid.rewards.map((_, r) => (
                    <th key={r} className={styles.sheetNum}>
                      BLOCK {r + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.names.map((name, i) => (
                  <tr key={name}>
                    <td className={`${styles.sheetName} ${styles.sheetSticky}`}>{name}</td>
                    {grid.balances.map((round, r) => {
                      const bal = round[i]
                      const prev = r > 0 ? grid.balances[r - 1]![i] : undefined
                      const delta = bal == null ? 0 : bal - (prev ?? 0)
                      const mined = grid.minedBy[r] === i
                      const cls = [
                        styles.sheetNum,
                        mined ? styles.cellMine : delta > 0 ? styles.cellUp : delta < 0 ? styles.cellDown : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <td key={r} className={cls}>
                          {bal == null ? '' : fmtBtc(bal)}
                          {bal != null && delta !== 0 && (
                            <span className={mined ? styles.cellDeltaMine : delta > 0 ? styles.cellDeltaUp : styles.cellDeltaDown}>
                              {mined && '⛏ '}
                              {delta > 0 ? `+${fmtBtc(delta)}` : `−${fmtBtc(Math.abs(delta))}`}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className={styles.sheetRule}>
                  <td className={`${styles.sheetName} ${styles.sheetSticky}`}>Block reward</td>
                  {grid.rewards.map((rw, r) => (
                    <td key={r} className={styles.sheetNum}>
                      {fmtBtc(rw)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`${styles.sheetName} ${styles.sheetSticky}`}>Circulating supply</td>
                  {grid.supply.map((s, r) => (
                    <td key={r} className={`${styles.sheetNum} ${styles.sheetStrong}`}>
                      {fmtBtc(s)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4 · Sync the room + See the math */}
      <div className={styles.footGrid}>
        <div className={styles.footPanel}>
          <div className={styles.sectionRow}>
            <span className={styles.badge}>4</span>
            <span className={styles.footTitle}>Sync the room</span>
          </div>
          <div className={styles.syncRow}>
            {qrDataUrl ? (
              <img src={qrDataUrl} className={styles.qrImg} alt={`QR code carrying the current ${blocks.length}-block chain`} />
            ) : (
              <div className={styles.qrImg} />
            )}
            <div className={styles.syncCopy}>
              The QR encodes the chain itself: every miner, nonce, and payment. Each phone re-derives the hashes on arrival,
              so a forged chain arrives broken. No server involved.
              <div style={{ marginTop: 8 }}>
                <button type="button" className={styles.ghostBtn} onClick={copyChain} disabled={!shareUrl}>
                  {copied ? 'Copied!' : 'Copy chain code'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.footPanel}>
          <div className={styles.footTitle}>See the math</div>
          <div className={styles.mathRows}>
            <FormulaBlock
              tex={'P(\\text{a guess is valid}) = 16^{-d}'}
              caption="Each hex character of the hash is one of 16 values, so d leading zeros means the first d characters must all land on 0."
            />
            <FormulaBlock
              tex={`d = ${difficulty}: \\quad P = 16^{-${difficulty}} = \\tfrac{1}{${expGuesses}}, \\qquad E[\\text{guesses, one miner}] = \\boxed{${expGuesses}}`}
              muted
            />
            <FormulaBlock
              tex={`\\text{a room of } ${people}: \\quad E[\\text{guesses each}] = \\tfrac{16^{${difficulty}}}{${people}} \\approx \\boxed{${expRoom}}`}
              caption="Guessing in parallel splits the work across the room, which is why the real network raises the difficulty as miners join."
              muted
            />
          </div>
          <p className={styles.mathNote}>
            Producing a block costs thousands of guesses; checking a claimed winner takes exactly one hash. That asymmetry
            is proof of work, and it is what lets every scanned phone verify the whole chain instantly.
          </p>
        </div>
      </div>
    </div>
  )
}

/* `intro` hides the page's own header when a surrounding shell already provides the title. */
export function BitcoinMiningPage({ intro = true }: { intro?: boolean } = {}) {
  return (
    <div className={styles.page}>
      {intro && (
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Teaching Toolkit · Unit 8: Financial Markets</p>
          <h1 className={styles.h1}>Bitcoin Mining</h1>
          <p className={styles.lead}>
            The class becomes the network: race to find a nonce, watch the block snap onto the chain, and read the ledger
            straight off it.
          </p>
        </header>
      )}
      <MiningCard />
    </div>
  )
}
