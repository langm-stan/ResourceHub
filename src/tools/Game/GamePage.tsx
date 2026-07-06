import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Callout, Card, Stat, StepHeader } from '../../design-system'
import { formatUSDWhole } from '../../lib/format'
import {
  ROUND_MONTHS,
  START_BALANCE,
  monthReturn,
  pickRound,
  revealRound,
} from './compute'
import { GameChart, type GamePoint } from './components/GameChart'
import styles from './GamePage.module.css'

const TICK_MS = 200

type Phase = 'idle' | 'playing' | 'done'

interface RoundState {
  start: number
  month: number
  points: GamePoint[]
  you: number
  hold: number
  inCash: boolean
  trades: number
}

function freshRound(): RoundState {
  return {
    start: pickRound().start,
    month: 0,
    points: [{ month: 0, level: 100, inCash: false }],
    you: START_BALANCE,
    hold: START_BALANCE,
    inCash: false,
    trades: 0,
  }
}

export function GamePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<RoundState>(() => freshRound())
  const [tally, setTally] = useState({ you: 0, market: 0 })
  // The button flips a ref so a click lands instantly, between ticks.
  const inCashRef = useRef(false)

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      setRound((s) => {
        if (s.month >= ROUND_MONTHS) return s
        const m = s.month + 1
        const r = monthReturn(s.start + m)
        const inCash = inCashRef.current
        const level = s.points[s.points.length - 1]!.level * (1 + r)
        return {
          ...s,
          month: m,
          points: [...s.points, { month: m, level, inCash }],
          you: inCash ? s.you : s.you * (1 + r),
          hold: s.hold * (1 + r),
          inCash,
        }
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [phase, round.start])

  // Round over: settle the tally exactly once.
  useEffect(() => {
    if (phase === 'playing' && round.month >= ROUND_MONTHS) {
      setPhase('done')
      setTally((t) =>
        round.you > round.hold ? { ...t, you: t.you + 1 } : { ...t, market: t.market + 1 }
      )
    }
  }, [phase, round.month, round.you, round.hold])

  const startRound = () => {
    inCashRef.current = false
    setRound(freshRound())
    setPhase('playing')
  }

  const toggle = () => {
    inCashRef.current = !inCashRef.current
    setRound((s) => ({ ...s, inCash: inCashRef.current, trades: s.trades + 1 }))
  }

  const jumpToEnd = () => {
    setRound((s) => {
      let you = s.you
      let hold = s.hold
      let level = s.points[s.points.length - 1]!.level
      const pts = [...s.points]
      const inCash = inCashRef.current
      for (let m = s.month + 1; m <= ROUND_MONTHS; m++) {
        const r = monthReturn(s.start + m)
        level *= 1 + r
        if (!inCash) you *= 1 + r
        hold *= 1 + r
        pts.push({ month: m, level, inCash })
      }
      return { ...s, month: ROUND_MONTHS, points: pts, you, hold, inCash }
    })
  }

  const levels = round.points.map((p) => p.level)
  const maxLevel = Math.max(...levels, 130)
  const minLevel = Math.min(...levels, 80)
  const reveal = useMemo(
    () => (phase === 'done' ? revealRound(round.start) : null),
    [phase, round.start]
  )
  const won = round.you > round.hold

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Game · Beat the market</p>
        <h1 className={styles.h1}>Think you can beat the market?</h1>
        <p className={styles.lead}>
          This is a real ten-year stretch of U.S. stock market history. You just do not know which
          one. You start with {formatUSDWhole(START_BALANCE)} invested, and you have exactly one
          move: sell everything, or buy back in. Your opponent never touches anything. The dates
          are revealed when the round ends.
        </p>
      </header>

      <div className={styles.main}>
        <Card tone="raised" className={styles.panel}>
          <StepHeader
            title={
              phase === 'idle'
                ? 'A decade of market history, twenty-four seconds'
                : phase === 'playing'
                  ? 'The market is moving'
                  : won
                    ? 'You beat the market'
                    : 'The market wins this one'
            }
            hint={
              phase === 'playing'
                ? 'Click the button any time. Grey bands show the months you sat in cash.'
                : 'Buy and hold is the score to beat. Cash earns nothing; returns include dividends.'
            }
          />

          <div className={styles.controlBar}>
            {phase === 'idle' && (
              <Button variant="primary" onClick={startRound}>
                Start a round
              </Button>
            )}
            {phase === 'playing' && (
              <>
                <Button variant="primary" onClick={toggle} className={styles.bigButton}>
                  {round.inCash ? 'Buy back in' : 'Sell everything'}
                </Button>
                <span
                  className={`${styles.position} ${round.inCash ? styles.positionOut : styles.positionIn}`}
                >
                  {round.inCash ? 'You are in cash' : 'You are invested'}
                </span>
                <Button variant="quiet" size="sm" onClick={jumpToEnd}>
                  Jump to the end
                </Button>
              </>
            )}
            {phase === 'done' && (
              <Button variant="primary" onClick={startRound}>
                Play again
              </Button>
            )}
            <span className={styles.tally}>
              Rounds: you <strong>{tally.you}</strong> · the market{' '}
              <strong>{tally.market}</strong>
            </span>
          </div>

          <div className={styles.stats}>
            <Stat
              label="Your balance"
              value={round.you}
              format={formatUSDWhole}
              emphasis
              accentColor={won || phase !== 'done' ? 'var(--c-series-1)' : 'var(--c-accent)'}
              animate={false}
            />
            <Stat
              label="Buy and hold"
              value={round.hold}
              format={formatUSDWhole}
              animate={false}
              accentColor="var(--c-series-3)"
            />
            <Stat
              label="Months gone by"
              value={round.month}
              format={(v) => `${Math.round(v)} of ${ROUND_MONTHS}`}
              animate={false}
            />
            <Stat
              label="Trades made"
              value={round.trades}
              format={(v) => `${Math.round(v)}`}
              animate={false}
            />
          </div>

          <GameChart
            points={round.points}
            totalMonths={ROUND_MONTHS}
            maxLevel={maxLevel}
            minLevel={minLevel}
            caption={
              phase === 'done' && reveal
                ? `The mystery decade was ${reveal.label}.${reveal.events.length ? ` You lived through ${reveal.events.join(', ')}.` : ''}`
                : 'The market, normalized to 100 at the start of the round. No dates until the end.'
            }
          />

          {phase === 'done' && (
            <>
              <Callout tone={won ? 'mark' : 'note'} label={won ? 'Well played. Now ask why.' : 'Do not feel bad'}>
                {won ? (
                  <>
                    You ended with {formatUSDWhole(round.you)} against buy and hold&rsquo;s{' '}
                    {formatUSDWhole(round.hold)}. Before celebrating: would the same moves have
                    worked in a different decade? Play a few more rounds. The traders who win one
                    round rarely stay ahead of the tally, and real trading adds taxes and fees
                    this game leaves out.
                  </>
                ) : (
                  <>
                    You ended with {formatUSDWhole(round.you)} against buy and hold&rsquo;s{' '}
                    {formatUSDWhole(round.hold)}. Professional fund managers lose this game too:
                    over the past decade only about 27% of active funds beat the index they are
                    paid to beat. The hard part is not spotting the crash, it is being invested
                    for the violent rebounds that follow, which tend to arrive on the scariest
                    days.
                  </>
                )}
              </Callout>
            </>
          )}

          {phase === 'idle' && (
            <Callout tone="plain" label="For the classroom">
              Project this and let one student drive while the class shouts advice. After three or
              four rounds, the tally on the right tells the story better than a lecture: the
              Timing the Market lesson next door shows the same result with forty years of data
              and a perfect crystal ball.
            </Callout>
          )}
        </Card>
      </div>
    </div>
  )
}
