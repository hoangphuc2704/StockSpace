import { ChevronRight } from 'lucide-react'

const WarehouseGallery = ({ images }) => {
  return (
    <div className="mb-10 grid h-[500px] grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
      <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 md:col-span-2 md:row-span-2">
        <img
          src={images[0]}
          alt="Main"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
        <img
          src={images[1]}
          alt="Interior 1"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
        <img
          src={images[2]}
          alt="Interior 2"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
        <img
          src={images[3]}
          alt="Exterior"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-100">
        <img
          src={images[4]}
          alt="Loading"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-2 font-bold text-white">
            View All Photos <ChevronRight size={18} />
          </span>
        </div>
      </div>
    </div>
  )
}

export default WarehouseGallery
