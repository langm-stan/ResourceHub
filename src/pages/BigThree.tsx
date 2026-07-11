import { Link } from 'react-router-dom'
import ResourceHubShell from '../components/ResourceHubShell'
import { HelpCircle, BookOpen, Library } from 'lucide-react'

const CARDS = [
  {
    to: '/big-three/quiz',
    icon: HelpCircle,
    accent: '#8C1515',
    title: 'The Big Three Quiz',
    description:
      'The Big Three financial literacy questions are the gold standard for assessing understanding of the basic concepts needed for financial security.',
    cta: 'The Big Three Quiz',
  },
  {
    to: '/big-three/explained',
    icon: BookOpen,
    accent: '#279989',
    title: 'The Big Three Explained',
    description:
      'Gain understanding of the three fundamental financial concepts by exploring the answers and explanations to each of the Big Three questions.',
    cta: 'The Big Three Explained',
  },
  {
    to: '/big-three/stories',
    icon: Library,
    accent: '#8F993E',
    title: 'The Big Three Stories',
    description:
      'Three stories in which characters apply fundamental financial concepts from the Big Three to make better decisions.',
    cta: 'The Big Three Stories',
  },
]

/**
 * The overview body, shared by the Resource Hub page and the teacher training
 * section. `base` prefixes the card links so each context keeps its own
 * navigation (e.g. '/teacher-training').
 */
export function BigThreeContent({ base = '' }: { base?: string }) {
  return (
    <>
      <div className="flex flex-col gap-6 max-w-3xl mb-10 text-stone-700 leading-relaxed">
        <p>
          For more than 20 years, the Big Three allowed us to gauge whether people understand the basic concepts
          needed to manage money, build wealth, and create a financially secure future. These three questions have
          become the gold standard for measuring financial literacy, and research tells us that people who
          understand principles woven into the Big Three save more for retirement, manage their debt more
          effectively, and make smarter investment decisions.
        </p>
        <p>
          At IFDM we believe that measuring financial literacy is crucial. It helps us identify the most vulnerable
          populations and understand opportunities to narrow gaps in financial knowledge.
        </p>
        <p>
          We invite you to explore resources designed to help you learn and apply key financial concepts, take the
          Big Three quiz, and read stories that show how the concepts that underpin the Big Three can help you make
          better financial decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={`${base}${c.to}`}
            className="group flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
          >
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}
            >
              <c.icon size={22} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900 mb-1.5">{c.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{c.description}</p>
            </div>
            <span className="mt-auto text-sm font-semibold text-cardinal">{c.cta} →</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export default function BigThree() {
  return (
    <ResourceHubShell title="The Big Three">
      <BigThreeContent />
    </ResourceHubShell>
  )
}
