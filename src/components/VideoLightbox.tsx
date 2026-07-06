import { X } from 'lucide-react'

export default function VideoLightbox({
  videoId,
  title,
  onClose,
}: {
  videoId: string
  title: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm"
        >
          <X size={18} />
          Close
        </button>
        <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
