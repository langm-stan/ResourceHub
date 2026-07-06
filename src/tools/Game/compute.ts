/*
 * Beat the Market: a mystery ten-year stretch of the real monthly
 * S&P 500 series (see ../Timing/spxData.ts) replays in real time. The
 * player starts fully invested with one control, sell everything /
 * buy back in; the benchmark simply holds. Cash earns nothing, and
 * returns include dividends, both disclosed on the page.
 */
import { SPX } from '../Timing/spxData'
import { BOTTOMS, monthName } from '../Timing/compute'

export const ROUND_MONTHS = 120
export const START_BALANCE = 10_000

export interface RoundSetup {
  /** Index into SPX of the round's first month. */
  start: number
}

export function pickRound(): RoundSetup {
  const max = SPX.length - ROUND_MONTHS - 1
  return { start: 1 + Math.floor(Math.random() * max) }
}

/** Total return of month at absolute index i (needs i >= 1). */
export function monthReturn(i: number): number {
  const cur = SPX[i]!
  const prev = SPX[i - 1]!
  return (cur.p + cur.d / 12) / prev.p - 1
}

export interface Reveal {
  label: string
  events: string[]
}

const EVENTS: { y: number; m: number; text: string }[] = [
  { y: 1987, m: 10, text: 'the October 1987 crash, down 20% in a day' },
  { y: 2000, m: 3, text: 'the peak of the dot-com bubble' },
  { y: 2002, m: 10, text: 'the bottom of the dot-com bust' },
  { y: 2008, m: 9, text: 'the 2008 financial crisis' },
  { y: 2009, m: 3, text: 'the March 2009 bottom' },
  { y: 2020, m: 3, text: 'the COVID crash and rebound' },
  { y: 2022, m: 10, text: 'the 2022 inflation bear market' },
]

export function revealRound(start: number): Reveal {
  const first = SPX[start]!
  const last = SPX[start + ROUND_MONTHS - 1]!
  const inWindow = (y: number, m: number) => {
    const a = first.y * 12 + first.m
    const b = last.y * 12 + last.m
    const v = y * 12 + m
    return v >= a && v <= b
  }
  return {
    label: `${monthName(first.m)} ${first.y} to ${monthName(last.m)} ${last.y}`,
    events: EVENTS.filter((e) => inWindow(e.y, e.m)).map((e) => e.text),
  }
}

/** Bear bottoms are marked on the reveal chart, like the Timing lesson. */
export function bottomsInWindow(start: number): number[] {
  return BOTTOMS.filter((b) => b.index > start && b.index < start + ROUND_MONTHS).map(
    (b) => b.index - start
  )
}
