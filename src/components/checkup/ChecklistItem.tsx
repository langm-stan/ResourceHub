import { useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import type { ChecklistItem as ChecklistItemType } from '../../data/checklistItems'

export default function ChecklistItem({
  item,
  answer,
  onAnswer,
}: {
  item: ChecklistItemType
  answer: boolean | undefined
  onAnswer: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-4 p-5">
        <span className="h-8 w-8 rounded-full bg-stone-100 text-stone-500 text-sm font-bold flex items-center justify-center shrink-0">
          {item.id}
        </span>
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center justify-between gap-3 text-left">
          <h3 className="font-serif text-lg font-semibold text-stone-900">{item.question}</h3>
          <ChevronDown size={18} className={`text-stone-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onAnswer(true)}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
              answer === true ? 'bg-palo-teal text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
            aria-label="Yes"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => onAnswer(false)}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
              answer === false ? 'bg-cardinal text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
            aria-label="No"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {open && (
        <div className="px-5 pb-6 pl-[68px] -mt-1 flex flex-col gap-3 text-sm text-stone-600 leading-relaxed">
          {item.body}
        </div>
      )}
    </div>
  )
}
