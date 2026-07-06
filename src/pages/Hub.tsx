import { HelpCircle, BarChart3, ListChecks, ClipboardCheck, Calculator, BookOpen, TrendingUp, GraduationCap } from 'lucide-react'
import HubCard from '../components/HubCard'

const CARDS = [
  {
    to: '/big-three',
    icon: HelpCircle,
    accent: '#8C1515',
    title: 'The Big Three',
    description: 'Take the Big Three quiz and read stories showing how these concepts can guide your financial decisions.',
    cta: 'Take the quiz',
  },
  {
    to: '/literacy-data',
    icon: BarChart3,
    accent: '#279989',
    title: 'Financial Literacy Data',
    description: 'Explore key data insights about financial literacy from responses to the Big Three questions, drilled down by state and demographic.',
    cta: 'Explore the data',
  },
  {
    to: '/checklist',
    icon: ListChecks,
    accent: '#B26F16',
    title: 'Financial Checklist',
    description: 'Assess yourself against the Seven Elements of Good Financial Health, seven questions covering the habits that build financial security.',
    cta: 'Take the checklist',
  },
  {
    to: '/budget',
    icon: ClipboardCheck,
    accent: '#E5A00D',
    title: 'Financial Budget',
    description: 'Build your net worth and budget in an interactive balance sheet, then see what your monthly surplus could grow into. Download your numbers as Excel, right in your browser.',
    cta: 'Start your budget',
  },
  {
    to: '/calculators',
    icon: Calculator,
    accent: '#8F993E',
    title: 'Calculators',
    description:
      'The five-key TVM calculator, compound interest, and guided borrow-and-save scenarios, with the math shown and charts you can project or embed in a course page.',
    cta: 'Open the calculators',
  },
  {
    to: '/lessons',
    icon: BookOpen,
    accent: '#007C92',
    title: 'Interactive Lessons',
    description:
      'Research-grounded lessons you can explore: the life-cycle model behind retirement planning, and how federal and state taxes shape a paycheck.',
    cta: 'Start a lesson',
  },
  {
    to: '/investing',
    icon: TrendingUp,
    accent: '#175E54',
    title: 'Investing',
    description:
      'Two lessons: what really happened to the most famous stocks of 2000, 2010, and 2021 next to a boring index fund, and the same weekly dollars gambled versus put into SPY on actual market history.',
    cta: 'Start exploring',
  },
  {
    to: '/faculty-insights',
    icon: GraduationCap,
    accent: '#5A4FCF',
    title: 'Faculty Insights',
    description: 'Short personal finance lessons straight from the classroom, drawn from Professor Annamaria Lusardi\'s Mastering Financial Decision-Making course.',
    cta: 'Read the lessons',
  },
]

export default function Hub() {
  return (
    <div>
      <div className="bg-gradient-to-b from-white to-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-16">
          <p className="text-xs font-semibold tracking-widest text-cardinal uppercase mb-3">Resource Hub</p>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-stone-900 mb-6 max-w-3xl">
            Resources for financial decision-making
          </h1>
          <p className="text-stone-600 max-w-2xl text-lg leading-relaxed">
            Take the Big Three quiz, check your financial health, build a budget, or see how
            taxes, investing, and retirement planning work.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((c) => (
            <HubCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    </div>
  )
}
