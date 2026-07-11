import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import TeacherTrainingShell from '../components/TeacherTrainingShell'
import InstructorBar from '../components/InstructorBar'
import { isFoundationSlug, sessionForSlug, toolDescription } from '../data/teacherTraining'
import { BigThreeContent } from './BigThree'
import { BigThreeQuizContent } from './BigThreeQuiz'
import { BigThreeExplainedContent } from './BigThreeExplained'
import { BigThreeStoriesContent } from './BigThreeStories'
import { LITERACY_DATA_INTRO, LiteracyDataContent } from './LiteracyData'
import { CHECKLIST_INTRO, ChecklistContent } from './Checklist'
import FinancialStatements from './FinancialStatements'
import { CompoundInterestPage } from '../tools/CompoundInterest/CompoundInterestPage'
import { TvmPage } from '../tools/Tvm/TvmPage'
import { LifeCyclePage } from '../tools/LifeCycle/LifeCyclePage'
import { CreditScorePage } from '../tools/CreditScore/CreditScorePage'
import { TaxPage } from '../tools/Taxes/TaxPage'
import { HousingPage } from '../tools/Housing/HousingPage'
import { ChanceOwnershipPage } from '../tools/ChanceOwnership/ChanceOwnershipPage'
import { RetirementSimPage } from '../tools/RetirementSim/RetirementSimPage'
import { FreedomPage } from '../tools/Freedom/FreedomPage'
import { UsedVsNewPage } from '../tools/UsedVsNew/UsedVsNewPage'
import { RentOrOwnPage } from '../tools/RentOrOwn/RentOrOwnPage'

const BASE = '/teacher-training'

interface SectionConfig {
  title: string
  intro?: string
  /**
   * Toolkit tools need the wide column + type scope. They render with
   * intro={false} so the shell's title is the only one on the page (the
   * schedule's one-line description becomes the intro), matching the
   * Financial Budget page's format.
   */
  toolkit?: boolean
  /** Embed pointers for the instructor bar. Omitted for pages that are not embeddable tools. */
  instructor?: { label: string; route?: string; toolKey?: string; path?: string }
  content: ReactNode
}

/*
 * Each section reuses the exact component behind the corresponding Resource
 * Hub page (never a copy), wrapped in the teacher training shell so all
 * navigation leads back to the training schedule. Toolkit tools keep their
 * instructor bar pointing at their canonical embeddable route.
 */
const SECTIONS: Record<string, SectionConfig> = {
  'big-three': { title: 'The Big Three', content: <BigThreeContent base={BASE} /> },
  'big-three/quiz': { title: 'Take the Big Three Quiz', content: <BigThreeQuizContent /> },
  'big-three/explained': { title: 'The Big Three Explained', content: <BigThreeExplainedContent /> },
  'big-three/stories': { title: 'The Big Three Stories', content: <BigThreeStoriesContent /> },
  'literacy-data': { title: 'Financial Literacy Data', intro: LITERACY_DATA_INTRO, content: <LiteracyDataContent /> },
  checklist: { title: 'Financial Checklist', intro: CHECKLIST_INTRO, content: <ChecklistContent base={BASE} /> },
  budget: {
    title: 'Financial Budget',
    intro:
      'An interactive balance sheet, budget, and savings goal. These are the same tools as our downloadable templates, in live form, with your numbers saved in your browser.',
    content: <FinancialStatements standalone={false} />,
  },
  'compound-interest': {
    title: 'Compound Interest Scenario',
    toolkit: true,
    instructor: { label: 'Compound Interest', route: 'calculators', toolKey: 'compound' },
    content: <CompoundInterestPage intro={false} />,
  },
  'borrow-save': {
    title: 'Borrow & Save',
    toolkit: true,
    instructor: { label: 'Borrow & Save', route: 'calculators', toolKey: 'tvm' },
    content: <TvmPage intro={false} />,
  },
  lifecycle: {
    title: 'The Life-Cycle Model',
    toolkit: true,
    instructor: { label: 'The Life-Cycle Model', route: 'lessons', toolKey: 'lifecycle' },
    content: <LifeCyclePage intro={false} />,
  },
  'credit-score': {
    title: 'Your FICO Score',
    toolkit: true,
    instructor: { label: 'Your FICO Score', path: 'teacher-training/credit-score' },
    content: <CreditScorePage intro={false} />,
  },
  'gambling-investing': {
    title: 'Gambling vs. Investing',
    toolkit: true,
    instructor: { label: 'Chance & Ownership', path: 'teacher-training/gambling-investing' },
    content: <ChanceOwnershipPage intro={false} />,
  },
  'retirement-simulator': {
    title: 'Retirement Planning Simulator',
    toolkit: true,
    instructor: { label: 'Retirement Planning Simulator', path: 'teacher-training/retirement-simulator' },
    content: <RetirementSimPage intro={false} />,
  },
  freedom: {
    title: 'When Can You Stop Working?',
    toolkit: true,
    instructor: { label: 'When Can You Stop Working?', route: 'lessons', toolKey: 'freedom' },
    content: <FreedomPage intro={false} />,
  },
  taxes: {
    title: 'Understanding Taxes',
    toolkit: true,
    instructor: { label: 'Understanding Taxes', route: 'lessons', toolKey: 'taxes' },
    content: <TaxPage intro={false} />,
  },
  housing: {
    title: 'Buying a Home',
    toolkit: true,
    instructor: { label: 'Buying a Home', route: 'lessons', toolKey: 'housing' },
    content: <HousingPage intro={false} />,
  },
  'used-vs-new': {
    title: 'Used vs. New',
    toolkit: true,
    instructor: { label: 'Used vs. New', path: 'teacher-training/used-vs-new' },
    content: <UsedVsNewPage intro={false} />,
  },
  'rent-or-own': {
    title: 'Rent or Own',
    toolkit: true,
    instructor: { label: 'Rent or Own', path: 'teacher-training/rent-or-own' },
    content: <RentOrOwnPage intro={false} />,
  },
}

export default function TeacherTrainingSection({ slug }: { slug: keyof typeof SECTIONS }) {
  const [params] = useSearchParams()
  const embed = params.get('embed') === '1'
  const section = SECTIONS[slug]!
  const session = sessionForSlug(slug)

  // Embedded in a slide or another page: the tool alone, at full width.
  if (embed && section.toolkit) {
    return <div className="toolkitScope max-w-[1680px] mx-auto px-6 pb-10">{section.content}</div>
  }

  return (
    <TeacherTrainingShell
      title={section.title}
      intro={section.intro ?? (section.toolkit ? toolDescription(slug) : undefined)}
      eyebrow={
        session
          ? `Teacher Training · ${session.day} ${session.period}`
          : isFoundationSlug(slug)
            ? 'Teacher Training · Foundations'
            : 'Teacher Training Institute'
      }
      wide={section.toolkit}
    >
      {section.toolkit ? <div className="toolkitScope">{section.content}</div> : section.content}
      {section.instructor && (
        <InstructorBar
          route={section.instructor.route}
          toolKey={section.instructor.toolKey}
          path={section.instructor.path}
          toolLabel={section.instructor.label}
        />
      )}
    </TeacherTrainingShell>
  )
}
