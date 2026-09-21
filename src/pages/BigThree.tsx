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
    accent: '#1E756A',
    title: 'The Big Three Explained',
    description:
      'Learn the three fundamental financial concepts by reading the answer and explanation for each of the Big Three questions.',
    cta: 'The Big Three Explained',
  },
  {
    to: '/big-three/stories',
    icon: Library,
    accent: '#6E7630',
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
      <div className="flex flex-col gap-6 max-w-3xl mb-10 text-[18px] leading-relaxed text-stone-700">
        <p>
          For more than 20 years, the Big Three allowed us to gauge whether people understand the basic concepts
          needed to manage money, build wealth, and create a financially secure future. These three questions have
          become the gold standard for measuring financial literacy, and research tells us that people who
          understand principles woven into the Big Three save more for retirement, manage their debt more
          effectively, and make smarter investment decisions.
        </p>
        <p>
          At IFDM we believe that measuring financial literacy is important. It helps us identify the most
          vulnerable populations and find ways to narrow gaps in financial knowledge.
        </p>
        <p>
          Use these resources to learn and apply the key financial concepts: take the Big Three quiz, read the
          explanations, and read stories that show how the concepts behind the Big Three can help you make better
          financial decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={`${base}${c.to}`}
            className="group flex flex-col gap-4 border border-stone-200 bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div
              className="flex h-11 w-11 items-center justify-center"
              style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}
            >
              <c.icon size={22} strokeWidth={2} />
            </div>
            <div>
              {/* The banner's title is the only heading above these, so they are the
                  second level, not the third. The size comes from the class. */}
              <h2 className="mb-1.5 text-[19px] font-bold tracking-[-0.016em] text-stone-900">{c.title}</h2>
              <p className="text-[16px] leading-relaxed text-stone-600">{c.description}</p>
            </div>
            <span className="mt-auto text-[16px] font-semibold text-cardinal">{c.cta} →</span>
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
