/*
 * The Class of... : real cohorts of famous stocks, what $1,000 invested
 * at the start of the cohort year became by July 2026 with dividends
 * reinvested, next to an S&P 500 index fund over the same window.
 *
 * All figures verified July 2, 2026 against Yahoo Finance dividend-and-
 * split-adjusted series (cross-checked with stockanalysis.com), with
 * corporate-action chains resolved manually from SEC/IR documents:
 * - Index fund: ^SP500TR from the same start dates: Jan 2000 8.36x,
 *   Jan 2010 8.97x, Jan 2021 2.19x (matches the Shiller series used in
 *   the Timing lesson within ~3%).
 * - AOL: Jan 7, 2000 pre-merger-announcement close $73.75; tracked
 *   through AOL Time Warner, the 2009 TWC/AOL spinoffs, and the 2018
 *   AT&T acquisition ($53.75 cash + 1.437 T per TWX). ~0.86x, +/-15%.
 * - GE: three-way 2023-24 breakup tracked holding all three pieces
 *   (Aerospace, Vernova, HealthCare).
 * - GameStop: Jan 4, 2021 close ($17.25, pre-squeeze), NOT the $483
 *   January 28 peak; peak buyers are down ~95%.
 * - AMC: includes the APE preferred units and reverse split (~0.20x);
 *   ignoring APE the figure would be ~0.09x.
 * - Coinbase: April 14, 2021 first-day close $328.28 (direct listing).
 * - Enron: shares cancelled in bankruptcy; class actions later paid
 *   eligible buyers roughly $150 per $1,000, footnoted in the outcome.
 * Figures are approximate (within ~10%); annual update: refresh
 * multiples and the "as of" date each summer.
 */

export const STAKE = 1000

export interface CohortStock {
  ticker: string
  name: string
  /** The pitch as it sounded in January of the cohort year. */
  blurb: string
  /** What actually happened, one sentence. */
  outcome: string
  /** $1 -> multiple by July 2026, dividends reinvested. 0 = wiped out. */
  multiple: number
}

export interface Cohort {
  year: number
  intro: string
  indexMultiple: number
  /** The honest one-paragraph reading of this class, shown at reveal. */
  note: string
  stocks: CohortStock[]
}

export const COHORTS: Cohort[] = [
  {
    year: 2000,
    intro:
      'It is January 2000. The Nasdaq has doubled in fifteen months, your neighbor just quit his job to day-trade, and everyone agrees the internet changes everything. You have $1,000.',
    indexMultiple: 8.36,
    note:
      'The most valuable company on Earth (Cisco), the most admired (GE), and the most innovative (Enron) all trailed a fund anyone could buy with no research at all. The picks that came closest were the two boring ones, Walmart and Exxon. One stock in ten beat the fund, and you had to hold it through sixteen underwater years to collect.',
    stocks: [
      {
        ticker: 'MSFT',
        name: 'Microsoft',
        blurb: 'The most valuable company on Earth. Windows runs nine of every ten computers.',
        outcome: 'Spent 16 years below its 2000 peak, then the cloud era made it the only tech name of this class to beat the index.',
        multiple: 11.0,
      },
      {
        ticker: 'CSCO',
        name: 'Cisco',
        blurb: 'Sells the plumbing of the internet. On pace to be the first trillion-dollar company.',
        outcome: 'Profitable every single year since, and the stock still has not beaten the market from this starting line; most of the gain is dividends.',
        multiple: 3.2,
      },
      {
        ticker: 'INTC',
        name: 'Intel',
        blurb: 'Every computer has Intel inside. The chips powering the whole boom.',
        outcome: 'Two lost decades, then a dramatic 2025-26 comeback rally delivered most of this figure in a single year; ask again next year.',
        multiple: 4.9,
      },
      {
        ticker: 'GE',
        name: 'General Electric',
        blurb: "America's most admired company. Jack Welch has not missed earnings in years.",
        outcome: 'The empire unwound over two decades and was broken into three companies; the pieces recovered, to less than half the index.',
        multiple: 3.25,
      },
      {
        ticker: 'NOK',
        name: 'Nokia',
        blurb: 'Makes one of every three phones sold on the planet.',
        outcome: 'The iPhone arrived in 2007; Nokia sold its phone business six years later. Half the money is still gone.',
        multiple: 0.53,
      },
      {
        ticker: 'AOL',
        name: 'America Online',
        blurb: 'How America gets online, and it just announced the biggest merger in history.',
        outcome: 'The AOL Time Warner merger became the textbook disaster; after 26 years and five corporate reshuffles, roughly your money back, nominally.',
        multiple: 0.86,
      },
      {
        ticker: 'ENE',
        name: 'Enron',
        blurb: "Fortune's most innovative company in America, six years running.",
        outcome: 'The books were fiction; bankrupt by December 2001 and the shares cancelled. Class actions years later returned about $150 of the $1,000.',
        multiple: 0,
      },
      {
        ticker: 'QCOM',
        name: 'Qualcomm',
        blurb: 'The best stock of 1999, up 2,600% in a year. Owns the patents behind 3G.',
        outcome: 'The patents were real and the company thrived; the January 2000 price had already spent decades of that success.',
        multiple: 3.2,
      },
      {
        ticker: 'WMT',
        name: 'Walmart',
        blurb: 'The biggest retailer on Earth, opening a new store nearly every day.',
        outcome: 'Dead money for fifteen years, then a late surge; still just short of the index.',
        multiple: 7.9,
      },
      {
        ticker: 'XOM',
        name: 'ExxonMobil',
        blurb: 'The largest oil company in the world, fresh off a record-setting merger.',
        outcome: 'Boring oil plus reinvested dividends nearly matched the market, beating almost every glamour stock of 2000.',
        multiple: 8.1,
      },
    ],
  },
  {
    year: 2010,
    intro:
      'It is January 2010. The market is limping out of the worst crash since 1929, smartphones are the new obsession, and nobody trusts banks. You have $1,000.',
    indexMultiple: 8.97,
    note:
      'Half this class beat the fund, the best a cohort of famous names ever did, and the reason these ten are remembered at all. The catch: in 2010 the sure thing was BlackBerry, the biggest company in America was Exxon, and Netflix was a DVD mailer trading for pocket change. The winners are only obvious now, and the fund held every one of them the whole time.',
    stocks: [
      {
        ticker: 'AAPL',
        name: 'Apple',
        blurb: 'The iPhone is two years old and the rumored tablet is due any week now.',
        outcome: 'Became the first trillion-dollar company, then kept going.',
        multiple: 48.2,
      },
      {
        ticker: 'MSFT',
        name: 'Microsoft',
        blurb: 'The safe, boring tech giant. Windows 7 just shipped.',
        outcome: 'Bought in its doldrums, paid off in the cloud era.',
        multiple: 17.0,
      },
      {
        ticker: 'GOOGL',
        name: 'Google',
        blurb: 'Owns two of every three searches on the internet.',
        outcome: 'Search, YouTube, Android, then AI kept compounding.',
        multiple: 23.2,
      },
      {
        ticker: 'XOM',
        name: 'ExxonMobil',
        blurb: 'The most valuable company in the world, as it has been for years.',
        outcome: 'A lost decade for oil; the dividend did most of the work.',
        multiple: 3.7,
      },
      {
        ticker: 'GE',
        name: 'General Electric',
        blurb: 'Battered by the crisis, but everyone says the icon is too big to stay down.',
        outcome: 'A penny dividend and a reverse split by 2021; then the three-way breakup staged a stunning recovery that nearly caught the index.',
        multiple: 7.85,
      },
      {
        ticker: 'WMT',
        name: 'Walmart',
        blurb: 'Recession-proof: its sales grew straight through 2008.',
        outcome: 'Survived Amazon better than any retailer and quietly kept pace with the market.',
        multiple: 8.7,
      },
      {
        ticker: 'BB',
        name: 'BlackBerry',
        blurb: "The businessperson's phone. The new President refused to give his up.",
        outcome: 'The iPhone and Android erased it within five years; it never paid a dividend to soften the fall.',
        multiple: 0.18,
      },
      {
        ticker: 'NFLX',
        name: 'Netflix',
        blurb: 'Mails DVDs in red envelopes and insists streaming is the future.',
        outcome: 'It was the future.',
        multiple: 101.6,
      },
      {
        ticker: 'AMZN',
        name: 'Amazon',
        blurb: 'The everything store that still barely turns a profit, on purpose, it says.',
        outcome: 'The profits were hiding in the cloud division all along.',
        multiple: 36.2,
      },
      {
        ticker: 'C',
        name: 'Citigroup',
        blurb: 'A three-dollar bank stock. If it just gets back to 2006 you make twenty times your money.',
        outcome: 'A solid recovery that still trails the index, and never got remotely close to 2006.',
        multiple: 5.6,
      },
    ],
  },
  {
    year: 2021,
    intro:
      'It is January 2021. Everyone is stuck at home, stimulus checks are landing, commissions are zero, and your group chat has never been louder about stocks. You have $1,000.',
    indexMultiple: 2.19,
    note:
      'Seven of the ten favorites lost money while the boring fund more than doubled. The two that won, GameStop bought before the squeeze and Palantir, won huge, which is exactly what keeps the game going: everyone remembers the two, nobody posts about the seven. Buying GameStop at the January peak instead of the start of the month lost 95%.',
    stocks: [
      {
        ticker: 'GME',
        name: 'GameStop',
        blurb: 'The meme of memes. A Reddit army is about to squeeze the hedge funds.',
        outcome: 'Bought at the start of January, before the squeeze, it is the class winner; bought at the January 28 peak, it lost 95%. Timing was everything, which is the problem.',
        multiple: 5.29,
      },
      {
        ticker: 'AMC',
        name: 'AMC Entertainment',
        blurb: "The people's movie theater. Apes together strong.",
        outcome: 'Dilution after dilution, preferred units, a reverse split; counting every piece generously, eighty cents of each dollar gone.',
        multiple: 0.2,
      },
      {
        ticker: 'PTON',
        name: 'Peloton',
        blurb: 'The pandemic bike with a months-long waitlist. Gyms are finished, apparently.',
        outcome: 'Gyms reopened.',
        multiple: 0.04,
      },
      {
        ticker: 'ZM',
        name: 'Zoom',
        blurb: 'The verb for meetings now. Up five-fold in a year.',
        outcome: 'Still the verb, still growing, and the stock had priced in a permanent lockdown.',
        multiple: 0.24,
      },
      {
        ticker: 'MRNA',
        name: 'Moderna',
        blurb: 'Its vaccine is ending the pandemic as we speak.',
        outcome: 'Vaccine revenue collapsed and the stock lost 80% before a sharp 2026 pipeline rally clawed back to a mere 29% loss.',
        multiple: 0.71,
      },
      {
        ticker: 'DOCU',
        name: 'DocuSign',
        blurb: 'Nobody will ever sign paper again.',
        outcome: 'Nobody signs paper, and the stock still lost four fifths of its value.',
        multiple: 0.21,
      },
      {
        ticker: 'PLTR',
        name: 'Palantir',
        blurb: 'The secretive data company that just went public. Its believers are very loud.',
        outcome: 'The believers were right: the AI wave made it one of the great winners of the decade.',
        multiple: 5.53,
      },
      {
        ticker: 'NIO',
        name: 'NIO',
        blurb: 'The Tesla of China, up 1,100% last year.',
        outcome: 'The Chinese EV price war turned brutal and the dilution never stopped; ninety cents of every dollar gone.',
        multiple: 0.09,
      },
      {
        ticker: 'TSLA',
        name: 'Tesla',
        blurb: 'Just joined the S&P 500 after rising 700% in a year.',
        outcome: 'Wild swings in both directions that netted out behind the boring fund.',
        multiple: 1.62,
      },
      {
        ticker: 'COIN',
        name: 'Coinbase',
        blurb: 'The crypto on-ramp, going public this spring. (You buy at the April listing.)',
        outcome: 'Crypto crashed, was declared dead, and came back; the stock is still worth half the listing-day price.',
        multiple: 0.5,
      },
    ],
  },
]

export const FUND = {
  ticker: 'S&P 500',
  name: 'The boring index fund',
  blurb:
    'All five hundred large U.S. companies in one share, including every stock on this list, for a fee of a few hundredths of a percent.',
}
