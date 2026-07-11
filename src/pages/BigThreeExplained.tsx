import ResourceHubShell from '../components/ResourceHubShell'
import { AlertCircle } from 'lucide-react'

/*
 * Response shares are U.S. adults in the FINRA Foundation National Financial
 * Capability Study, 2024 State-by-State wave (n = 25,539, fielded June–Oct
 * 2024), the most recent wave as of July 2026. Per-question integers are the
 * published table in "Financial Capability in the United States" (6th ed.,
 * July 2025), p. 29 — verified July 2026 by recomputing from FINRA's public
 * dataset (NFCS 2024 State Data 250623.csv, weight wgt_n2, items M6/M7/M10:
 * 69.2/13.6/16.4, 58.2/18.5/22.5, 41.3/10.6/47.5; remainder refused).
 * ALL_THREE_CORRECT is not in the report; it is computed from that dataset
 * (M6=1 & M7=3 & M10=2, weighted) and is identical to the 2021 wave's 28.5%
 * (Lusardi & Streeter 2023, J. of Financial Literacy and Wellbeing, Table 1).
 * (The higher figures in Lusardi & Mitchell 2023 JEP come from the 2019 SCF,
 * an interviewer-administered survey with far fewer "don't know" answers —
 * don't mix the two sources.) Refresh when the 2027 wave publishes (~2028).
 */
const ALL_THREE_CORRECT = 28.5

const QUESTIONS = [
  {
    number: 1,
    concept: 'Compound Interest',
    q: 'Suppose you had $100 in a savings account and the interest rate was 2% per year. After 5 years, how much do you think you would have in the account if you left the money to grow?',
    options: ['More than $102', 'Exactly $102', 'Less than $102', "Don't know"],
    answer: 'More than $102',
    explanation:
      "Interest builds on interest over time. This phenomenon is known as compound interest. In the first year, you earn 2% of $100, or $2 in interest. In the second year, you earn 2% of $102 (your balance after the first year), or $2.04. Because each year's interest is calculated on a growing balance, the account is worth more than $102 after 5 years.",
    verified: true,
    responses: { correct: 69, incorrect: 14, dontKnow: 16 },
  },
  {
    number: 2,
    concept: 'Inflation',
    q: 'Imagine that the interest rate on your savings account was 1% per year and inflation was 2% per year. After 1 year, would you be able to buy more, exactly the same, or less than today with the money in this account?',
    options: ['More', 'Exactly the same', 'Less', "Don't know"],
    answer: 'Less',
    explanation: null,
    verified: false,
    responses: { correct: 58, incorrect: 18, dontKnow: 23 },
  },
  {
    number: 3,
    concept: 'Risk Diversification',
    q: '"Buying a single company stock usually provides a safer return than a stock mutual fund." True or false?',
    options: ['True', 'False', "Don't know"],
    answer: 'False',
    explanation: null,
    verified: false,
    responses: { correct: 41, incorrect: 11, dontKnow: 47 },
  },
]

function ResponseBar({ responses: r }: { responses: { correct: number; incorrect: number; dontKnow: number } }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">
        How U.S. adults answer
      </p>
      <div
        className="h-3 rounded-full bg-stone-100 overflow-hidden flex"
        role="img"
        aria-label={`${Math.round(r.correct)} percent answer correctly, ${Math.round(r.incorrect)} percent incorrectly, and ${Math.round(r.dontKnow)} percent say they don't know`}
      >
        <div className="bg-palo-teal" style={{ width: `${r.correct}%` }} />
        <div className="bg-stone-300" style={{ width: `${r.incorrect}%` }} />
        <div className="bg-sand" style={{ width: `${r.dontKnow}%` }} />
      </div>
      <p className="text-xs text-stone-500 mt-1.5">
        <span className="font-semibold text-palo-teal">{Math.round(r.correct)}% correct</span>
        {' · '}
        {Math.round(r.incorrect)}% incorrect
        {' · '}
        {Math.round(r.dontKnow)}% answer &ldquo;Don&rsquo;t know&rdquo;
      </p>
    </div>
  )
}

/** The explained body, shared by the Resource Hub page and the teacher training section. */
export function BigThreeExplainedContent() {
  return (
    <>
      <p className="max-w-3xl text-stone-700 leading-relaxed mb-10">
        The Big Three, a trio of financial literacy questions, evaluate understanding of compound interest,
        inflation, and risk diversification, three fundamental financial concepts that we encourage you to learn
        about, as they are stepping stones to sound financial decision-making. You can gain understanding of these
        concepts by checking out the correct answer to each of the Big Three questions and the explanations for
        those answers.
      </p>

      <div className="flex flex-col gap-6 max-w-3xl">
        {QUESTIONS.map((item) => (
          <div key={item.number} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-cardinal mb-2">
              Question #{item.number}: {item.concept}
            </p>
            <p className="font-serif text-lg font-semibold text-stone-900 mb-3 leading-snug">{item.q}</p>
            <ul className="text-sm text-stone-600 mb-4 flex flex-col gap-1">
              {item.options.map((o) => (
                <li key={o} className={o === item.answer ? 'font-semibold text-palo-teal' : ''}>
                  • {o}
                  {o === item.answer && ' (correct)'}
                </li>
              ))}
            </ul>
            {item.verified ? (
              <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-4 leading-relaxed">{item.explanation}</p>
            ) : (
              <div className="flex items-start gap-2 text-xs text-stone-500 bg-sand/20 border border-sand/40 rounded-lg p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                The full explanation for this question couldn't be pulled from ifdm.stanford.edu (the site blocks
                automated fetches). Paste the source text here to replace this placeholder.
              </div>
            )}
            <ResponseBar responses={item.responses} />
          </div>
        ))}

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-cardinal mb-2">
            All three together
          </p>
          <p className="text-stone-700 leading-relaxed">
            Only <strong>{ALL_THREE_CORRECT}%</strong> of U.S. adults answer all three questions
            correctly. The share of correct answers falls with each question, and on risk
            diversification more people answer &ldquo;Don&rsquo;t know&rdquo; (47%) than answer
            correctly (41%). Knowing where the gaps are is the first step to closing them.
          </p>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Response shares are U.S. adults in the FINRA Foundation National Financial Capability
          Study, 2024 wave (25,539 respondents), the most recent as of 2026. About 1% of
          respondents preferred not to answer each question, so shares total slightly under 100%.
          The share answering all three correctly is computed from the study's public dataset and
          is unchanged from the 2021 wave.
        </p>
      </div>
    </>
  )
}

export default function BigThreeExplained() {
  return (
    <ResourceHubShell title="The Big Three Explained">
      <BigThreeExplainedContent />
    </ResourceHubShell>
  )
}
