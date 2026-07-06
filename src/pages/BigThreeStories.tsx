import { useState } from 'react'
import ResourceHubShell from '../components/ResourceHubShell'
import { PiggyBank, Shirt, Egg } from 'lucide-react'

const STORIES = [
  {
    key: 'compound-interest',
    concept: 'Compound Interest',
    title: 'A Wedding Gift and Compound Interest',
    icon: PiggyBank,
    accent: '#8C1515',
    summary: 'Dave and Michelle decide what to do with $5,000 in wedding gifts and discover the Rule of 72.',
    body: [
      'Dave and Michelle, two 25-year-olds who just got married, received $5,000 in cash as wedding presents and needed to decide what to do with it. Dave suggested waiting to invest until they had better jobs and made more money.',
      "Michelle told Dave about the Rule of 72, which approximates how many years it takes for an investment to double at a given annual rate of return. With a 7% return, plausible for a diversified stock portfolio held for the long term, their money would double roughly every 10 years.",
      "At a 7% annual return, their original $5,000 would grow to about $160,000 by the time they turned 75. If they waited until age 55 to invest that same $5,000, it would grow to only about $20,000 by 75, far less than investing right away.",
      'Dave and Michelle decided to invest their $5,000 immediately, giving compound interest as much time as possible to work.',
    ],
  },
  {
    key: 'inflation',
    concept: 'Inflation',
    title: 'Inflation and the Plaid Shirt',
    icon: Shirt,
    accent: '#E5A00D',
    summary: 'A $50 price tag jogs Lisa\'s memory of $30 shirts in the 90s and teaches her about inflation.',
    body: [
      "Lisa was shopping with her friend Beth when Beth spotted a cute plaid shirt. Seeing it gave Lisa a flashback to the 1990s, when plaid shirts were last trendy and she paid around $30 for one. This new shirt cost $50.",
      'That price difference got Lisa thinking about inflation: prices rise over time, so the same $30 that bought a shirt decades ago buys less today. With inflation, the same number of dollars buys less as time passes.',
      "Lisa realized that when planning how much money she'll need in the future, she has to account for how much more everything will cost by then, which inspired her to save more for the future.",
    ],
  },
  {
    key: 'risk-diversification',
    concept: 'Risk Diversification',
    title: "Don't Put All Your Eggs in One Basket",
    icon: Egg,
    accent: '#279989',
    summary: 'Kate helps her husband Sam see why spreading money across companies protects their investments.',
    body: [
      "Sam didn't understand why putting money somewhere safe wasn't good enough. Kate reminded him that investing for the long term means taking on some risk. There is no way to grow money without it, and riskier investments tend to earn higher average returns than safer ones.",
      "Kate explained that the point of spreading money across several different companies is that if something unexpectedly bad happens to one of them, they're cushioned. You shouldn't have your investments, or your job, tied to a single company, and you shouldn't put all your money into one company's stock.",
      'The goal is for the ups and downs of each investment to be as unrelated to each other as possible, so that if some investments do badly, others can offset those losses.',
      "Sam came to understand the saying \"don't put all your eggs in one basket\" and why it matters for his financial future.",
    ],
  },
]

export default function BigThreeStories() {
  const [open, setOpen] = useState<string>(STORIES[0].key)

  return (
    <ResourceHubShell title="The Big Three Stories">
      <p className="max-w-3xl text-stone-700 leading-relaxed mb-8">
        Three stories in which characters apply fundamental financial concepts from the Big Three to make better
        decisions. Research shows that reading stories like these significantly improves understanding of these
        concepts, and revisiting them helps the lessons stick.
      </p>

      <div className="flex flex-col gap-4 max-w-3xl">
        {STORIES.map((s) => {
          const isOpen = open === s.key
          return (
            <div key={s.key} className="rounded-2xl border border-stone-200 bg-white shadow-card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? '' : s.key)}
                className="w-full flex items-center gap-4 p-6 text-left"
              >
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${s.accent}1a`, color: s.accent }}
                >
                  <s.icon size={22} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.accent }}>
                    {s.concept}
                  </p>
                  <h3 className="font-serif text-lg font-semibold text-stone-900">{s.title}</h3>
                  <p className="text-sm text-stone-500 mt-0.5">{s.summary}</p>
                </div>
              </button>
              {isOpen && (
                <div className="px-6 pb-6 flex flex-col gap-3 border-t border-stone-100 pt-4">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-sm text-stone-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ResourceHubShell>
  )
}
