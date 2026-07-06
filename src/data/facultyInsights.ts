export type FacultyVideo = {
  videoId: string
  title: string
  thumbnail: string
}

// 1900x950 branded title cards ("… with Professor Annamaria Lusardi") downloaded
// from ifdm.stanford.edu/resourcehub/faculty-insights and self-hosted in
// public/faculty/ — the same artwork the live site shows on its video cards.
const card = (name: string) => `${import.meta.env.BASE_URL}faculty/${name}.jpg`

// Titles and card order match the real page on ifdm.stanford.edu.
export const FACULTY_VIDEOS: FacultyVideo[] = [
  { videoId: 'wTe4Ja0fbGw', title: 'Personal Finance', thumbnail: card('personal-finance') },
  { videoId: 'uElaQvKP89I', title: 'Compound Interest', thumbnail: card('compound-interest') },
  { videoId: 'FUUzTETTeLk', title: 'Budgeting', thumbnail: card('budgeting') },
  { videoId: '4XqMJS_ZtN0', title: 'A case study on the life-cycle model', thumbnail: card('life-cycle-model') },
  { videoId: 'Q8efcgTanAg', title: 'Debt Management', thumbnail: card('debt-management') },
  { videoId: 'TWcydOuqXPA', title: 'Mortgages', thumbnail: card('mortgages') },
  { videoId: '9lTYzKE2yUs', title: 'Investing', thumbnail: card('investing') },
  {
    videoId: 'lilYnb5kWzE',
    title: 'Tax-advantaged savings and employer matches',
    thumbnail: card('tax-advantaged-savings'),
  },
  { videoId: 'NpI6aVrlsvo', title: 'Retirement Planning', thumbnail: card('retirement-planning') },
]
