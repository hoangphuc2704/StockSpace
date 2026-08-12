import { useMemo, useState } from 'react'
import { Box, ChevronDown, ChevronUp, Eye, Loader2, Package } from 'lucide-react'
import WarehouseLayoutPreview3D from '@/components/WarehouseLayoutPreview3D'

const GRID_SIZE = 10
const DEFAULT_SIZE = 100
const fullFootprint = () =>
  Array.from({ length: GRID_SIZE ** 2 }, (_, index) =>
    `${Math.floor(index / GRID_SIZE)}:${index % GRID_SIZE}`
  )

const createPreviewLayout = (layout, warehouse) => ({
  id: layout?.id ?? null,
  width: Math.max(Number(layout?.width || warehouse?.width || DEFAULT_SIZE), 20),
  length: Math.max(Number(layout?.length || warehouse?.length || DEFAULT_SIZE), 20),
  height: Math.max(Number(layout?.height || warehouse?.height || DEFAULT_SIZE), 20),
  footprintCells: Array.isArray(layout?.footprintCells)
    ? layout.footprintCells
    : fullFootprint(),
  racks: Array.isArray(layout?.racks) ? layout.racks : [],
})

export default function WarehouseLayoutShowcase({
  layout,
  warehouse,
  isLoading = false,
  isFallback = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const previewLayout = useMemo(() => createPreviewLayout(layout, warehouse), [layout, warehouse])
  const binCount = useMemo(
    () => previewLayout.racks.reduce((total, rack) => total + rack.bins.length, 0),
    [previewLayout.racks]
  )

  return (
    <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">Warehouse Layout 3D</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isFallback
              ? "The warehouse does not have a configured layout. This is a 3D space preview according to warehouse dimensions."
              : "Preview warehouse space and Rack and Bin locations in 3D mode."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {isOpen ? (
            <><ChevronUp className="mr-2 h-4 w-4" />Hide diagram</>
          ) : (
            <><ChevronDown className="mr-2 h-4 w-4" />See 3D diagram</>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5">
          {isLoading ? (
            <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-lg bg-slate-100 px-3 py-2">
                  {previewLayout.width} × {previewLayout.length} × {previewLayout.height}
                </span>
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                  <Package className="mr-1.5 h-3.5 w-3.5" />{previewLayout.racks.length} Rack
                </span>
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  <Box className="mr-1.5 h-3.5 w-3.5" />{binCount} Bin
                </span>
              </div>

              <div className="relative h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-sky-50 sm:h-[560px]">
                <WarehouseLayoutPreview3D layout={previewLayout} editable={false} />
                {!previewLayout.racks.length && (
                  <div className="pointer-events-none absolute right-4 bottom-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3 text-sm shadow-sm backdrop-blur-sm">
                    <p className="font-semibold text-slate-700">Warehouse space is empty</p>
                    <p className="mt-0.5 text-xs text-slate-500">Owner has not set Rack and Bin yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
