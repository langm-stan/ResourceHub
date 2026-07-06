import { ShieldCheck, Trash2 } from 'lucide-react'

export default function StorageNotice({
  isExampleData,
  onLoadExample,
  onClear,
}: {
  isExampleData: boolean
  onLoadExample: () => void
  onClear: () => void
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2 text-xs text-stone-600">
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
      <button
        onClick={() => {
          if (confirm('This clears all balance sheet, budget, and trend data saved in this browser. Continue?')) {
            onClear()
          }
        }}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-cardinal shrink-0"
      >
        <Trash2 size={13} />
        Clear my data from this browser
      </button>
    </div>
  )
}
