import { Eraser, ShieldCheck, Trash2 } from 'lucide-react'

export default function StorageNotice({
  isExampleData,
  onLoadExample,
  sheetName,
  onClearSheet,
  onClear,
}: {
  isExampleData: boolean
  onLoadExample: () => void
  /** The statement on screen, e.g. "balance sheet", for its own clear button. */
  sheetName: string
  onClearSheet: () => void
  onClear: () => void
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2 text-[13px] text-stone-600">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-palo-teal" />
        <p>
          {isExampleData ? (
            <>
              <span className="font-semibold text-stone-800">You're looking at example numbers.</span>{' '}
              Edit any field to make it yours. You can{' '}
              <button onClick={onLoadExample} className="underline hover:text-cardinal">
                reload the example
              </button>{' '}
              at any time.
            </>
          ) : (
            <>Your numbers save automatically in this browser.</>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0">
        {/* Every amount on this statement to $0, rows kept, so someone can
            type their own numbers without deleting the example's first. */}
        <button
          type="button"
          onClick={() => {
            if (isExampleData || confirm(`This sets every amount on the ${sheetName} to $0. Continue?`)) {
              onClearSheet()
            }
          }}
          className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-stone-700 hover:border-cardinal hover:text-cardinal"
        >
          <Eraser size={13} />
          Clear the {sheetName}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('This clears all balance sheet, budget, and trend data saved in this browser. Continue?')) {
              onClear()
            }
          }}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-500 hover:text-cardinal"
        >
          <Trash2 size={13} />
          Clear my data from this browser
        </button>
      </div>
    </div>
  )
}
