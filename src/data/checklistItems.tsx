import { Link } from 'react-router-dom'

export type ChecklistItem = {
  id: number
  question: string
  body: React.ReactNode
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 1,
    question: 'Do you know the basics of money management?',
    body: (
      <>
        <p>
          Learn the basic concepts (compound interest, inflation, and risk diversification), which are the pulse of
          your financial health: <Link to="/big-three/explained" className="text-cardinal font-semibold underline">The Big Three Explained</Link>.
        </p>
        <p>
          You can test your knowledge of these concepts by taking the test:{' '}
          <Link to="/big-three/quiz" className="text-cardinal font-semibold underline">The Big Three Quiz</Link>.
        </p>
        <p>
          Explore the glossary of financial terms if you want to familiarize yourself with other useful concepts. Or
          feel free to return to it as needed.
        </p>
      </>
    ),
  },
  {
    id: 2,
    question: 'Do you have a budget?',
    body: (
      <>
        <p>
          Keep track of your inflows (labor and other income) and your outflows (fixed, variable and other expenses)
          to stay in good financial health.
        </p>
        <p>
          When creating a budget, organize expenses into categories: housing &amp; utilities, groceries,
          transportation, debt payments, savings (retirement savings, investing, building a buffer stock of
          savings), entertainment, dining out, hobbies. Track your spending in a spreadsheet or use an app and
          adjust your budget as needed.
        </p>
        <p>
          A budget is particularly useful to help you build a buffer stock of savings. Here is a good example: Write
          down all of your expenses and sum them up at the end of each week. It will help you understand how easy
          it is to spend, know how much you spend, and find ways to achieve positive cash flow, which will enable
          you to build a buffer stock of savings.
        </p>
        <p>
          Historically, the recommendation has been to have three to six months of expenses saved. However, given
          the uncertainty we observe today, it's better to have one year of expenses saved up.
        </p>
        <p>You can start with small amounts and keep building your buffer (and replenish it, if you have to use it) over time.</p>
      </>
    ),
  },
  {
    id: 3,
    question: 'Do you have control of your debt?',
    body: (
      <>
        <p>
          Try to pay off your credit card in full and on time. Credit cards charge very high interest rates and
          carry a lot of fees. Try to automate credit card payments.
        </p>
        <p>Make sure that you can cover your debt payments.</p>
        <p>
          If you answer "no," look at your budget and try to find room to decrease your debt, for example by
          considering ways to decrease your expenses or augment your income.
        </p>
      </>
    ),
  },
  {
    id: 4,
    question: 'Are you taking care of your credit score?',
    body: (
      <>
        <p>
          Think of your credit score as a grade for your financial practices, particularly your debt management. If
          you have a high credit score, you will have better access to credit and receive more favorable loan
          terms. Alternatively, if you have a low credit score, you might be denied credit and face very high
          interest rates.
        </p>
        <p>
          Keep an eye on your FICO score, the most well-known credit score. It ranges from 300 to 850. A credit
          score of less than 580 is considered poor, 580–669 is fair, 670–739 is good, 740–799 is very good, and
          800–850 is exceptional.
        </p>
        <p>If you answer "no," here are some practices to maximize your credit score:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Pay your credit card balance in full and on time.</li>
          <li>Keep credit utilization low: ideally no more than 30% of your limit on any credit card.</li>
          <li>Don't open several new credit cards at the same time.</li>
          <li>Don't close old credit cards if the card isn't costing you money.</li>
          <li>Have a credit mix: both credit cards and installment loans.</li>
          <li>See the FICO website for other practices that can improve your score.</li>
        </ul>
      </>
    ),
  },
  {
    id: 5,
    question: 'Are you investing to grow your wealth?',
    body: (
      <>
        <p>Keep the following important investing principles in mind:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            There is a relationship between risk and return. Higher returns are normally associated with higher
            risk; there is no free lunch in finance!
          </li>
          <li>
            Do not put all your eggs in one basket. Try to have a portfolio with multiple assets (stocks, bonds,
            and other assets) to reduce your financial risk.
          </li>
          <li>Pay attention to transaction fees. High fees can erode long-term returns.</li>
          <li>
            Take advantage of the opportunities offered by the financial markets. Academic research suggests that
            index mutual funds and exchange-traded funds (ETFs) are a low-cost way to achieve diversification.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 6,
    question: 'Are you taking advantage of tax-favored assets and employer benefits?',
    body: (
      <>
        <p>
          Both the government and employers provide many incentives to grow your wealth, particularly retirement
          savings. Take advantage of your employer pension plan, normally a 401(k). If your employer offers a
          match, try to contribute up to that match. In addition, make contributions to tax-favored assets, such as
          IRAs, Roth IRAs, SEP IRAs, HSAs, and 529 plans, if you are capable.
        </p>
        <p>
          There are also benefits and programs to support you if you are unemployed, sick, or face other hardships.
          The government offers unemployment insurance, Social Security disability insurance, and health insurance
          (via Medicaid), for example. Employers might offer short or long-term disability insurance, paid family
          leave, and severance packages.
        </p>
        <p>Check to see if your employer offers financial advice as part of your pension plan.</p>
      </>
    ),
  },
  {
    id: 7,
    question: 'Are you planning for the future?',
    body: (
      <>
        <p>
          Prepare for life's big events and milestones. Children's education, transitioning to a new job,
          purchasing a new house, and being able to work less can be important milestones in your financial life.
        </p>
        <p>Calculate how much you need to save to achieve your objectives, and make a plan for regular deposits.</p>
        <p>
          Prepare for the unexpected: An important part of a solid financial plan is to have the right amount of
          insurance. Don't let your well-being be derailed by chance! Purchasing insurance will help shield you and
          your loved ones from bad events such as health issues, fires, loss of life, and running out of money when
          you stop working.
        </p>
      </>
    ),
  },
]
