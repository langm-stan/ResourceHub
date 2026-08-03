/*
 * Bitcoin Mining: the chain math behind the "Chain Rail" design. A block
 * stores only what a student typed (miner, nonce, difficulty, optional
 * payment); every hash is re-derived from that, so a chain serialized into
 * a QR code is re-derived and re-verified on whatever device scans it.
 * Nothing here is async: the SHA-256 below is a plain synchronous
 * implementation so the hash readout can update on every keystroke.
 */

export interface Block {
  miner: string
  reward: number
  /** Leading zeros required of this block's hash, recorded so old blocks stay verifiable after the instructor changes the dial. */
  difficulty: number
  nonce: string
  sender: string
  receiver: string
  amount: number
}

export const GENESIS_HASH = '0'.repeat(64)
export const MAX_DIFFICULTY = 4
export const INITIAL_REWARD = 50
/** Blocks between reward halvings. Real Bitcoin waits 210,000 blocks; a class period gets two. */
export const HALVING_INTERVAL = 2
/** The geometric series the halving schedule sums to: the same arithmetic that caps real Bitcoin at 21 million. */
export const MAX_SUPPLY = INITIAL_REWARD * HALVING_INTERVAL * 2

/* ------------------------------ SHA-256 ------------------------------ */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message)
  const bitLen = bytes.length * 8
  const padded = new Uint8Array((((bytes.length + 9 + 63) / 64) | 0) * 64)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32))
  dv.setUint32(padded.length - 4, bitLen >>> 0)

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Uint32Array(64)

  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4)
    for (let t = 16; t < 64; t++) {
      const a = w[t - 15]!
      const b = w[t - 2]!
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[t]! + w[t]!) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g; g = f; f = e
      e = (d + temp1) >>> 0
      d = c; c = b; b = a
      a = (temp1 + temp2) >>> 0
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, '0')).join('')
}

/* ------------------------------ the chain ------------------------------ */

/** The exact string that gets hashed: prevHash|miner|reward|sender|receiver|amount|nonce. */
export function blockData(prevHash: string, b: Omit<Block, 'difficulty'>): string {
  return [prevHash, b.miner, b.reward, b.sender || '', b.receiver || '', b.amount || 0, b.nonce].join('|')
}

export function meetsDifficulty(hash: string, difficulty: number): boolean {
  return hash.startsWith('0'.repeat(difficulty))
}

/** The reward at a given chain height, halving every HALVING_INTERVAL blocks. */
export function rewardAt(height: number): number {
  return INITIAL_REWARD / 2 ** Math.floor(height / HALVING_INTERVAL)
}

export interface ChainView {
  block: Block
  /** The prev-hash the block recorded when it was mined; tampering never rewrites it. */
  prevHash: string
  /** The block's current hash: re-derived from the tamper text when the block was edited. */
  hash: string
  contents: string
  tampered: boolean
  /** meets its difficulty AND still points at the previous block's current hash AND every earlier block is valid. */
  valid: boolean
}

/**
 * Derive the whole chain. `tamper` maps a block index to replacement
 * contents text; an edited block re-hashes with its RECORDED prev-hash (that
 * pointer is history and does not move), so its new hash both misses its
 * difficulty and no longer matches what the next block recorded. Everything
 * downstream flips invalid: rewriting one block means re-mining them all.
 */
export function deriveChain(blocks: Block[], tamper: Record<number, string> = {}): ChainView[] {
  // First pass: the hashes as mined, which is what each block recorded.
  const stored: { prev: string; hash: string }[] = []
  let prev = GENESIS_HASH
  for (const b of blocks) {
    const hash = sha256Hex(blockData(prev, b))
    stored.push({ prev, hash })
    prev = hash
  }
  // Second pass: apply tamper text and grade validity cumulatively.
  let prevCurrent = GENESIS_HASH
  let broken = false
  return blocks.map((b, i) => {
    const text = tamper[i]
    const tampered = text != null
    const hash = tampered ? sha256Hex(blockData(stored[i]!.prev, { ...b, miner: text })) : stored[i]!.hash
    const valid = !broken && meetsDifficulty(hash, b.difficulty) && stored[i]!.prev === prevCurrent
    if (!valid) broken = true
    prevCurrent = hash
    return {
      block: b,
      prevHash: stored[i]!.prev,
      hash,
      tampered,
      valid,
      contents: tampered
        ? text
        : `${b.miner} mined ${fmtBtc(b.reward)} BTC${b.amount ? ` · ${b.sender} → ${b.receiver} ${fmtBtc(b.amount)}` : ''}`,
    }
  })
}

/* ------------------------------ display helpers ------------------------------ */

/** A hash's identity color: its own first six hex characters, worn as a swatch. Genesis is near-black. */
export function swatch(hash: string): string {
  return hash === GENESIS_HASH ? '#111' : `#${hash.slice(0, 6)}`
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

export function fmtBtc(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

/* ------------------------------ the ledger ------------------------------ */

export interface LedgerRow {
  name: string
  balance: number
  blocksWon: number
  /** Net change from the newest block, 0 when this participant sat it out. */
  delta: number
  touchedLast: boolean
}

/** Every balance follows from the chain: rewards in, payments across. Sorted by balance, richest first. */
export function buildLedger(blocks: Block[]): LedgerRow[] {
  const accounts = new Map<string, { balance: number; blocksWon: number; delta: number; touchedLast: boolean }>()
  const touch = (name: string) => {
    let acc = accounts.get(name)
    if (!acc) {
      acc = { balance: 0, blocksWon: 0, delta: 0, touchedLast: false }
      accounts.set(name, acc)
    }
    return acc
  }
  const last = blocks.length - 1
  blocks.forEach((b, i) => {
    const isLast = i === last
    const acc = touch(b.miner)
    acc.balance += b.reward
    acc.blocksWon++
    if (isLast) {
      acc.delta += b.reward
      acc.touchedLast = true
    }
    if (b.amount && b.sender && b.receiver) {
      const from = touch(b.sender)
      const to = touch(b.receiver)
      from.balance -= b.amount
      to.balance += b.amount
      if (isLast) {
        from.delta -= b.amount
        from.touchedLast = true
        to.delta += b.amount
        to.touchedLast = true
      }
    }
  })
  return [...accounts.entries()]
    .map(([name, acc]) => ({ name, ...acc }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name))
}

export function circulatingSupply(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.reward, 0)
}

/* ---------------------- QR / URL serialization ---------------------- */

/*
 * Only the typed inputs travel; hashes are re-derived on arrival. A block is
 * [miner, reward, difficulty, nonce, sender, receiver, amount], JSON encoded
 * then base64url encoded for the ?chain= param.
 */
type Packed = [string, number, number, string, string, string, number]

export function encodeChain(blocks: Block[]): string {
  const packed: Packed[] = blocks.map((b) => [b.miner, b.reward, b.difficulty, b.nonce, b.sender, b.receiver, b.amount])
  const bytes = new TextEncoder().encode(JSON.stringify(packed))
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeChain(code: string): Block[] | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!Array.isArray(parsed)) return null
    const blocks: Block[] = []
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 7) return null
      const [miner, reward, difficulty, nonce, sender, receiver, amount] = entry as unknown[]
      if (
        typeof miner !== 'string' ||
        typeof reward !== 'number' ||
        typeof difficulty !== 'number' ||
        typeof nonce !== 'string' ||
        typeof sender !== 'string' ||
        typeof receiver !== 'string' ||
        typeof amount !== 'number'
      )
        return null
      blocks.push({ miner, reward, difficulty, nonce, sender, receiver, amount })
    }
    return blocks
  } catch {
    return null
  }
}

/** Shape check for chain state restored from localStorage. */
export function isBlockArray(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (b: unknown) =>
        typeof b === 'object' &&
        b !== null &&
        typeof (b as Block).miner === 'string' &&
        typeof (b as Block).reward === 'number' &&
        typeof (b as Block).difficulty === 'number' &&
        typeof (b as Block).nonce === 'string' &&
        typeof (b as Block).sender === 'string' &&
        typeof (b as Block).receiver === 'string' &&
        typeof (b as Block).amount === 'number',
    )
  )
}
