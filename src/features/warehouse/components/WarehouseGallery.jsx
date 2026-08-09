import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'

const MAX_VISIBLE_IMAGES = 5

const getGalleryClass = (count) => {
  if (count === 1) return 'grid-cols-1 h-[300px] sm:h-[460px]'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2 h-auto sm:h-[460px]'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 h-auto sm:h-[500px]'
  if (count === 4) return 'grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 h-auto sm:h-[500px]'
  return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-rows-2 h-auto md:h-[500px]'
}

const getImageClass = (count, index) => {
  if (count === 3 && index === 0) return 'sm:row-span-2'
  if (count >= 5 && index === 0) return 'sm:col-span-2 md:row-span-2'
  return ''
}

export default function WarehouseGallery({ images = [] }) {
  const validImages = images.filter(Boolean)
  const visibleImages = validImages.slice(0, MAX_VISIBLE_IMAGES)
  const [activeIndex, setActiveIndex] = useState(null)

  useEffect(() => {
    if (activeIndex == null) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length)
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => (current + 1) % validImages.length)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeIndex, validImages.length])

  if (!validImages.length) return null

  const openPrevious = () =>
    setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length)
  const openNext = () => setActiveIndex((current) => (current + 1) % validImages.length)

  return (
    <>
      <div className={`mb-10 grid gap-3 ${getGalleryClass(visibleImages.length)}`}>
        {visibleImages.map((image, index) => {
          const hiddenCount = validImages.length - MAX_VISIBLE_IMAGES
          const showsMore = index === MAX_VISIBLE_IMAGES - 1 && hiddenCount > 0
          return (
            <button
              key={image}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group relative min-h-52 overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 ${getImageClass(visibleImages.length, index)}`}
            >
              <img
                src={image}
                alt={`Warehouse ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {showsMore && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
                  <Images className="mb-2 h-7 w-7" />
                  <span className="text-base font-bold">Xem thêm {hiddenCount} ảnh</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {activeIndex != null && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Thư viện ảnh warehouse"
          onClick={() => setActiveIndex(null)}
        >
          <div className="mb-3 flex items-center justify-between text-white">
            <span className="text-sm font-semibold">{activeIndex + 1} / {validImages.length}</span>
            <button type="button" onClick={() => setActiveIndex(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Đóng thư viện ảnh">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1" onClick={(event) => event.stopPropagation()}>
            <img src={validImages[activeIndex]} alt={`Warehouse ${activeIndex + 1}`} className="h-full w-full object-contain" />
            {validImages.length > 1 && (
              <>
                <button type="button" onClick={openPrevious} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70" aria-label="Ảnh trước">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={openNext} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70" aria-label="Ảnh tiếp theo">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          {validImages.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" onClick={(event) => event.stopPropagation()}>
              {validImages.map((image, index) => (
                <button key={image} type="button" onClick={() => setActiveIndex(index)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeIndex ? 'border-blue-400' : 'border-transparent opacity-60'}`}>
                  <img src={image} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
