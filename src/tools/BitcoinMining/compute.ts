/*
 * Bitcoin Mining: the chain math. A block stores only what a student typed
 * (miner, reward, difficulty, nonce, optional transaction); every hash is
 * recomputed from that, so a chain serialized into a QR code is re-derived
 * and re-verified on whatever device scans it. Nothing here is async: the
 * SHA-256 below is a plain synchronous implementation so the calculated
 * hash can update on every keystroke.
 */

export interface Tx {
  from: string
  to: string
  amount: number
}

export interface Block {
  miner: string
  reward: number
  /** Leading zeros required of this block's hash, recorded so old blocks stay verifiable after the instructor changes the dial. */
  difficulty: number
  nonce: string
  tx?: Tx
}

export interface MinedBlock {
  block: Block
  prevHash: string
  data: string
  hash: string
  /** Whether the derived hash still meets the block's difficulty. Tampering anywhere upstream breaks this. */
  valid: boolean
}

export const GENESIS_HASH = '0'
export const MAX_DIFFICULTY = 4
export const INITIAL_REWARD = 50
/** Blocks between reward halvings. Real Bitcoin waits 210,000 blocks; a class period gets two. */
export const HALVING_INTERVAL = 2
/**
 * The most BTC the classroom coin can ever have: the halving schedule is a
 * geometric series that sums to interval x initial x 2, the same arithmetic
 * that caps real Bitcoin at 21 million.
 */
export const MAX_SUPPLY = INITIAL_REWARD * HALVING_INTERVAL * 2

export function leadingZeros(hash: string): number {
  let n = 0
  while (n < hash.length && hash[n] === '0') n++
  return n
}

/** How many of the 64 hash characters differ between two hashes (the avalanche effect made countable). */
export function countChanged(a: string, b: string): number {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

/**
 * A stable identity color for a hash, so the eye can follow one hash into the
 * next block's "previous hash" slot. Derived from the LAST six characters:
 * the leading ones are all zeros on any mined hash, which would give every
 * block the same color.
 */
export function hashHue(hash: string): number {
  return (parseInt(hash.slice(-6), 16) / 0xffffff) * 360
}

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

/**
 * The exact string that gets hashed, in the classroom's original format:
 * previousHash|miner-reward|sender-receiver-amount|nonce (the transaction
 * segment only when the block carries one).
 */
export function blockData(prevHash: string, b: Block): string {
  const tx = b.tx ? `|${b.tx.from}-${b.tx.to}-${b.tx.amount}` : ''
  return `${prevHash}|${b.miner}-${b.reward}${tx}|${b.nonce}`
}

export function meetsDifficulty(hash: string, difficulty: number): boolean {
  return hash.startsWith('0'.repeat(difficulty))
}

/** Derive every block's data string and hash, chaining each hash into the next block. */
export function computeChain(blocks: Block[]): MinedBlock[] {
  let prev = GENESIS_HASH
  return blocks.map((block) => {
    const data = blockData(prev, block)
    const hash = sha256Hex(data)
    const mined: MinedBlock = { block, prevHash: prev, data, hash, valid: meetsDifficulty(hash, block.difficulty) }
    prev = hash
    return mined
  })
}

/* ------------------------------ the ledger ------------------------------ */

export interface LedgerRow {
  name: string
  balance: number
}

/** Every balance follows from the chain: rewards in, transactions across. */
export function buildLedger(blocks: Block[]): LedgerRow[] {
  const balances = new Map<string, number>()
  const add = (name: string, amount: number) => balances.set(name, (balances.get(name) ?? 0) + amount)
  for (const b of blocks) {
    add(b.miner, b.reward)
    if (b.tx) {
      add(b.tx.from, -b.tx.amount)
      add(b.tx.to, b.tx.amount)
    }
  }
  return [...balances.entries()]
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name))
}

/**
 * The classroom spreadsheet, derived: one column per block, one row per
 * participant, each cell the participant's balance after that block (blank
 * before they first appear, exactly like the hand-kept Excel grid).
 */
export interface BalanceGrid {
  /** Participants in order of first appearance on the chain. */
  names: string[]
  /** balances[round][i] = names[i]'s balance after that block, undefined before they appear. */
  balances: (number | undefined)[][]
  /** The reward paid out in each round. */
  rewards: number[]
  /** Circulating supply after each round. */
  supply: number[]
}

export function buildBalanceGrid(blocks: Block[]): BalanceGrid {
  const current = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  const rounds: Map<string, number>[] = []
  blocks.forEach((b, r) => {
    const touch = (name: string) => {
      if (!firstSeen.has(name)) firstSeen.set(name, r)
      if (!current.has(name)) current.set(name, 0)
    }
    touch(b.miner)
    current.set(b.miner, current.get(b.miner)! + b.reward)
    if (b.tx) {
      touch(b.tx.from)
      touch(b.tx.to)
      current.set(b.tx.from, current.get(b.tx.from)! - b.tx.amount)
      current.set(b.tx.to, current.get(b.tx.to)! + b.tx.amount)
    }
    rounds.push(new Map(current))
  })
  const names = [...firstSeen.keys()].sort((a, b) => firstSeen.get(a)! - firstSeen.get(b)!)
  return {
    names,
    balances: rounds.map((snap) => names.map((n) => snap.get(n))),
    rewards: blocks.map((b) => b.reward),
    supply: rounds.map((snap) => [...snap.values()].reduce((s, v) => s + v, 0)),
  }
}

export function circulatingSupply(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.reward, 0)
}

/** The reward the schedule suggests for the next block, halving every HALVING_INTERVAL blocks. */
export function suggestedReward(blocksMined: number): number {
  return INITIAL_REWARD / 2 ** Math.floor(blocksMined / HALVING_INTERVAL)
}

/* ---------------------- QR / URL serialization ---------------------- */

/*
 * Only the typed inputs travel; hashes are re-derived on arrival. A block is
 * [miner, reward, difficulty, nonce] or, with a transaction,
 * [miner, reward, difficulty, nonce, from, to, amount]. The array is JSON
 * encoded then base64url encoded for the ?chain= param.
 */
type Packed = [string, number, number, string] | [string, number, number, string, string, string, number]

export function encodeChain(blocks: Block[]): string {
  const packed: Packed[] = blocks.map((b) =>
    b.tx ? [b.miner, b.reward, b.difficulty, b.nonce, b.tx.from, b.tx.to, b.tx.amount] : [b.miner, b.reward, b.difficulty, b.nonce],
  )
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
      if (!Array.isArray(entry) || (entry.length !== 4 && entry.length !== 7)) return null
      const [miner, reward, difficulty, nonce, from, to, amount] = entry as unknown[]
      if (typeof miner !== 'string' || typeof reward !== 'number' || typeof difficulty !== 'number' || typeof nonce !== 'string') return null
      const block: Block = { miner, reward, difficulty, nonce }
      if (entry.length === 7) {
        if (typeof from !== 'string' || typeof to !== 'string' || typeof amount !== 'number') return null
        block.tx = { from, to, amount }
      }
      blocks.push(block)
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
        typeof (b as Block).nonce === 'string',
    )
  )
}
