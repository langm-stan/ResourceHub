import { useState } from 'react'
import { Eraser, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'

type Pending = 'reload' | 'clear' | 'wipe'

const QUESTIONS: Record<Pending, (sheet: string) => string> = {
  reload: (sheet) => `Replace every amount on the ${sheet} with the example's?`,
  clear: (sheet) => `Set every amount on the ${sheet} to $0?`,
  wipe: () => 'Clear all balance sheet, budget, and trend data saved in this browser?',
}

const CONFIRM_LABELS: Record<Pending, string> = {
  reload: 'Replace',
  clear: 'Clear',
  wipe: 'Clear everything',
}

export default function StorageNotice({
  isExampleData,
  sheetName,
  onReloadSheet,
  onClearSheet,
  onClear,
}: {
  isExampleData: boolean
  /** The statement on screen, e.g. "balance sheet", for its own clear button. */
  sheetName: string
  /** This statement back to the example's numbers. */
  onReloadSheet: () => void
  onClearSheet: () => void
  onClear: () => void
}) {
  const [pending, setPending] = useState<Pending | null>(null)

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2 text-[13px] text-stone-600">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-palo-teal" />
        <p>
          {isExampleData ? (
            <>
              <span className="font-semibold text-stone-800">You're looking at example numbers.</span>{' '}
              Edit any field to make it yours.
            </>
          ) : (
            <>Your numbers save automatically in this browser.</>
          )}
        </p>
      </div>
      {/*
        Each action asks in the page rather than through the browser's own
        confirm(). That dialog pulls a filled screen out of fullscreen (Safari
        leaves it blank white with no way back), and Chrome refuses it outright
        inside another site's iframe, so the button would do nothing there.
      */}
      {pending ? (
        <div
          role="group"
          aria-label="Confirm"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0 text-[13px]"
        >
          <span className="font-semibold text-stone-800">{QUESTIONS[pending](sheetName)}</span>
          <button
            type="button"
            ref={(el) => el?.focus()}
            onClick={() => {
              const run = { reload: onReloadSheet, clear: onClearSheet, wipe: onClear }[pending]
              setPending(null)
              run()
            }}
            className="rounded-md bg-cardinal px-3 py-1.5 font-semibold text-white hover:bg-cardinal-dark"
          >
            {CONFIRM_LABELS[pending]}
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-700 hover:border-stone-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0">
          {/* Back to the example's numbers: the default, for a class that has
              wandered off it. */}
          <button
            type="button"
            onClick={() => (isExampleData ? onReloadSheet() : setPending('reload'))}
            className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-stone-700 hover:border-cardinal hover:text-cardinal"
          >
            <RotateCcw size={13} />
            Reload the example
          </button>
          {/* Every amount on this statement to $0, rows kept, so someone can
              type their own numbers without deleting the example's first. */}
          <button
            type="button"
            onClick={() => (isExampleData ? onClearSheet() : setPending('clear'))}
            className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-stone-700 hover:border-cardinal hover:text-cardinal"
          >
            <Eraser size={13} />
            Clear the {sheetName}
          </button>
          <button
            type="button"
            onClick={() => setPending('wipe')}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-500 hover:text-cardinal"
          >
            <Trash2 size={13} />
            Clear my data from this browser
          </button>
        </div>
      )}
    </div>
  )
}
