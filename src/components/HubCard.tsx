import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'

export default function HubCard({
  to,
  icon: Icon,
  accent,
  title,
  description,
  cta,
}: {
  to: string
  icon: LucideIcon
  accent: string
  title: string
  description: string
  cta: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
    >
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <h3 className="font-serif text-xl font-semibold text-stone-900 mb-1.5">{title}</h3>
        <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
      </div>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-cardinal">
        {cta}
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
