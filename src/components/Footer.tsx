export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="font-serif text-lg text-cardinal font-semibold">
          Stanford <span className="text-stone-400 font-sans font-normal text-sm ml-1">Initiative for Financial Decision-Making</span>
        </div>
        <button className="bg-cardinal text-white text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2 hover:bg-cardinal-dark transition-colors">
          Web Login
        </button>
      </div>
    </footer>
  )
}
