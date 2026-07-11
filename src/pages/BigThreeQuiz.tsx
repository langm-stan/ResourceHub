import { useState } from 'react'
import ResourceHubShell from '../components/ResourceHubShell'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

const QUESTIONS = [
  {
    q: 'Suppose you had $100 in a savings account and the interest rate was 2% per year. After 5 years, how much do you think you would have in the account if you left the money to grow?',
    options: ['More than $102', 'Exactly $102', 'Less than $102', "Don't know"],
    answer: 0,
    concept: 'Compound Interest',
  },
  {
    q: 'Imagine that the interest rate on your savings account was 1% per year and inflation was 2% per year. After 1 year, would you be able to buy more, exactly the same, or less than today with the money in this account?',
    options: ['More', 'Exactly the same', 'Less', "Don't know"],
    answer: 2,
    concept: 'Inflation',
  },
  {
    q: '"Buying a single company stock usually provides a safer return than a stock mutual fund." True or false?',
    options: ['True', 'False', "Don't know"],
    answer: 1,
    concept: 'Risk Diversification',
  },
]

/** The quiz card, shared by the Resource Hub page and the teacher training section. */
export function BigThreeQuizContent() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null])
  const done = step >= QUESTIONS.length

  const select = (i: number) => {
    const next = [...answers]
    next[step] = i
    setAnswers(next)
  }

  const score = answers.filter((a, i) => a === QUESTIONS[i].answer).length

  return (
    <div className="max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 shadow-card">
      {!done ? (
        <>
          <div className="flex items-center gap-2 mb-6">
            {QUESTIONS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-cardinal' : 'bg-stone-200'}`} />
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cardinal mb-3">
            Question {step + 1} of {QUESTIONS.length} · {QUESTIONS[step].concept}
          </p>
          <h2 className="font-serif text-xl font-semibold text-stone-900 mb-6 leading-snug">{QUESTIONS[step].q}</h2>
          <div className="flex flex-col gap-3 mb-8">
            {QUESTIONS[step].options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => select(i)}
                className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  answers[step] === i
                    ? 'border-cardinal bg-cardinal/5 text-cardinal'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            disabled={answers[step] === null}
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 bg-cardinal text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 hover:bg-cardinal-dark transition-colors"
          >
            {step === QUESTIONS.length - 1 ? 'See results' : 'Next question'}
            <ArrowRight size={15} />
          </button>
        </>
      ) : (
        <>
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">
            You scored {score} of {QUESTIONS.length}
          </h2>
          <p className="text-stone-600 mb-6 text-sm">
            Head to <span className="font-semibold">The Big Three Explained</span> to see why, or{' '}
            <span className="font-semibold">The Big Three Stories</span> to see these ideas in action.
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {QUESTIONS.map((q, i) => (
              <div key={q.concept} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50">
                {answers[i] === q.answer ? (
                  <CheckCircle2 className="text-palo-green shrink-0 mt-0.5" size={18} />
                ) : (
                  <XCircle className="text-cardinal shrink-0 mt-0.5" size={18} />
                )}
                <div>
                  <p className="font-semibold text-sm text-stone-900">{q.concept}</p>
                  <p className="text-xs text-stone-500">Correct answer: {q.options[q.answer]}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setStep(0)
              setAnswers([null, null, null])
            }}
            className="text-sm font-semibold text-cardinal hover:underline"
          >
            Retake the quiz
          </button>
        </>
      )}
    </div>
  )
}

export default function BigThreeQuiz() {
  return (
    <ResourceHubShell title="Take the Big Three Quiz">
      <BigThreeQuizContent />
    </ResourceHubShell>
  )
}
