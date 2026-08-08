import { useMemo, useState } from 'react'
import WarehouseLayoutPreview3D from '@/components/WarehouseLayoutPreview3D'

const findSelectedEntity = (layout, selection) => {
  if (!selection) return null
  if (selection.type === 'layout') return layout

  for (const zone of layout.zones) {
    if (selection.type === 'zone' && zone.clientKey === selection.clientKey) return zone

    for (const rack of zone.racks) {
      if (selection.type === 'rack' && rack.clientKey === selection.clientKey) return rack

      for (const bin of rack.bins) {
        if (selection.type === 'bin' && bin.clientKey === selection.clientKey) return bin
      }
    }
  }

  return null
}

export default function WarehouseLayoutShowcase({ layout }) {
  const [selection, setSelection] = useState({ type: 'layout' })

  const selectedEntity = useMemo(() => findSelectedEntity(layout, selection), [layout, selection])

  if (!layout || !Array.isArray(layout.zones) || layout.zones.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2">
          <h3 className="text-xl font-bold text-slate-900">Warehouse Layout</h3>
          <p className="text-sm text-slate-500">Sơ đồ kho chưa được cấu hình cho bài đăng này.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Warehouse Layout</h3>
          <p className="text-sm text-slate-500">
            Người dùng có thể xem sơ đồ 2D và preview 3D ngay trong bài đăng.
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          {selection.type === 'layout'
            ? `Layout ${layout.width} x ${layout.height}`
            : selectedEntity?.name || 'Đang chọn'}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-3">
          <div className="relative mx-auto aspect-square min-h-[280px] w-full max-w-[760px] rounded-[24px] border border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(226,232,240,0.9))] shadow-inner">
            <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-[size:10%_10%]" />

            {layout.zones.map((zone) => (
              <div
                key={zone.clientKey}
                className={`absolute rounded-2xl border-2 transition ${
                  selection.type === 'zone' && selection.clientKey === zone.clientKey
                    ? 'z-10 border-emerald-500 ring-4 ring-emerald-100'
                    : 'border-emerald-300'
                }`}
                style={{
                  left: `${(zone.coordinateX / layout.width) * 100}%`,
                  top: `${(zone.coordinateY / layout.height) * 100}%`,
                  width: `${(zone.width / layout.width) * 100}%`,
                  height: `${(zone.height / layout.height) * 100}%`,
                  background:
                    'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.2))',
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelection({ type: 'zone', clientKey: zone.clientKey })
                }}
              >
                <div className="border-b border-emerald-200 bg-white/70 px-2 py-1 text-[10px] font-bold text-emerald-700 sm:text-xs">
                  {zone.name}
                </div>

                {zone.racks.map((rack) => (
                  <div
                    key={rack.clientKey}
                    className={`absolute rounded-xl border-2 transition ${
                      selection.type === 'rack' && selection.clientKey === rack.clientKey
                        ? 'z-10 border-amber-500 ring-4 ring-amber-100'
                        : 'border-amber-300'
                    }`}
                    style={{
                      left: `${(rack.coordinateX / zone.width) * 100}%`,
                      top: `${(rack.coordinateY / zone.height) * 100}%`,
                      width: `${(rack.width / zone.width) * 100}%`,
                      height: `${(rack.height / zone.height) * 100}%`,
                      background:
                        'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.24))',
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelection({ type: 'rack', clientKey: rack.clientKey })
                    }}
                  >
                    <div className="border-b border-amber-200 bg-white/75 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 sm:text-[10px]">
                      {rack.name}
                    </div>

                    {rack.bins.map((bin) => (
                      <div
                        key={bin.clientKey}
                        className={`absolute rounded-lg border transition ${
                          selection.type === 'bin' && selection.clientKey === bin.clientKey
                            ? 'z-10 border-fuchsia-500 ring-4 ring-fuchsia-100'
                            : 'border-fuchsia-300'
                        }`}
                        style={{
                          left: `${(bin.coordinateX / rack.width) * 100}%`,
                          top: `${(bin.coordinateY / rack.height) * 100}%`,
                          width: `${(bin.width / rack.width) * 100}%`,
                          height: `${(bin.height / rack.height) * 100}%`,
                          background:
                            'linear-gradient(135deg, rgba(217,70,239,0.14), rgba(232,121,249,0.22))',
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelection({ type: 'bin', clientKey: bin.clientKey })
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-sky-50">
          <div className="h-[320px] w-full sm:h-[420px]">
            <WarehouseLayoutPreview3D
              layout={layout}
              selection={selection}
              onSelect={setSelection}
              editable={false}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
