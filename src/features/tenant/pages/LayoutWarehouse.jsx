import React, { useState } from 'react'
import {
  HiBars3,
  HiOutlineSquaresPlus,
  HiOutlineCube,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import Sidebar from '../../../components/SideBar'
import logoDaidien from '../../../assets/logoDaidien.png'
import Button from '../../../components/atoms/Button'

// Import component 3D Canvas
import WarehouseCanvas from '../../../components/WarehouseCanvas'

function LayoutWarehouse() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Quản lý màu nền của không gian 3D (Mặc định là xám đen tối)
  const [bgColor, setBgColor] = useState('#0f172a')

  // Quản lý danh sách kệ
  const [racks, setRacks] = useState([
    {
      id: 'rack-1',
      position: [-2, 0, 0],
      levels: 3,
      width: 3.5,
      cargo: [
        { id: 'box-1', level: 1, positionIdx: 0, color: '#c29b70' },
        { id: 'box-2', level: 1, positionIdx: 1, color: '#a1887f' },
      ],
    },
    {
      id: 'rack-2',
      position: [2, 0, 0],
      levels: 4,
      width: 3.0,
      cargo: [{ id: 'box-4', level: 1, positionIdx: 0, color: '#e11d48' }],
    },
  ])

  const [selectedRackId, setSelectedRackId] = useState('rack-1')
  const [selectedBoxId, setSelectedBoxId] = useState('')

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsSidebarExpanded(!isSidebarExpanded)
    }
  }

  const handleAddRack = () => {
    const newId = `rack-${Date.now()}`
    setRacks([
      ...racks,
      { id: newId, position: [0, 0, (racks.length * 1.5) % 5], levels: 3, width: 3.0, cargo: [] },
    ])
    setSelectedRackId(newId)
    setSelectedBoxId('')
  }

  const handleDeleteRack = () => {
    if (racks.length <= 1) return alert('Hệ thống layout cần giữ lại ít nhất 1 chiếc kệ!')
    const remainingRacks = racks.filter((r) => r.id !== selectedRackId)
    setRacks(remainingRacks)
    setSelectedRackId(remainingRacks[0].id)
    setSelectedBoxId('')
  }

  const updateSelectedRack = (field, value) => {
    setRacks(racks.map((rack) => (rack.id === selectedRackId ? { ...rack, [field]: value } : rack)))
  }

  const handleAddCargo = (levelNum) => {
    const newBoxId = `box-${Date.now()}`
    const boxesOnLevel = activeRack.cargo.filter((b) => b.level === levelNum)
    const nextIdx = boxesOnLevel.length
    const newBox = { id: newBoxId, level: levelNum, positionIdx: nextIdx, color: '#c29b70' }

    setRacks(
      racks.map((rack) => {
        if (rack.id === selectedRackId) return { ...rack, cargo: [...rack.cargo, newBox] }
        return rack
      })
    )
    setSelectedBoxId(newBoxId)
  }

  const handleDeleteCargo = () => {
    if (!selectedBoxId) return
    setRacks(
      racks.map((rack) => {
        if (rack.id === selectedRackId)
          return { ...rack, cargo: rack.cargo.filter((b) => b.id !== selectedBoxId) }
        return rack
      })
    )
    setSelectedBoxId('')
  }

  const handleUpdateBoxColor = (colorHex) => {
    if (!selectedBoxId) return
    setRacks(
      racks.map((rack) => {
        if (rack.id === selectedRackId) {
          return {
            ...rack,
            cargo: rack.cargo.map((b) => (b.id === selectedBoxId ? { ...b, color: colorHex } : b)),
          }
        }
        return rack
      })
    )
  }

  const activeRack = racks.find((r) => r.id === selectedRackId) || racks[0]
  const activeBox = activeRack.cargo.find((b) => b.id === selectedBoxId)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-full p-2 text-slate-700 hover:bg-slate-100"
          >
            <HiBars3 className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logoDaidien} alt="Logo" className="h-10 w-17" />
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">
              StockSpace Tenant
            </span>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className="md:hidden">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </div>

      <div className="flex pt-14">
        {/* SIDEBAR */}
        <Sidebar
          isSidebarExpanded={isSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          currentRole="TENANT"
        />

        {/* MAIN CONTENT CONTAINER */}
        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'}`}
        >
          <main className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                  <HiOutlineSquaresPlus className="text-primary h-7 w-7" /> Warehouse Layout
                  Designer
                </h1>
                <p className="text-sm text-slate-500">
                  Thiết kế sơ đồ kho hàng 3D, tùy biến kệ, thùng hàng và môi trường giả lập.
                </p>
              </div>
            </div>

            {/* Grid Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Left Panel: Controls */}
              <div className="flex max-h-[80vh] flex-col justify-between space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-900">
                    <HiOutlineCube className="h-5 w-5 text-slate-500" /> Bảng Điều Khiển
                  </h3>

                  {/* 1. CHỈNH BACKGROUND XUNG QUANH */}
                  <div className="space-y-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3">
                    <label className="flex items-center gap-1 text-xs font-bold tracking-wider text-slate-500 uppercase">
                      <HiOutlineSparkles className="text-amber-500" /> Màu nền không gian
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { name: 'Tối', hex: '#0f172a' },
                        { name: 'Xám', hex: '#52525b' },
                        { name: 'Sáng', hex: '#f8fafc' },
                        { name: 'Kho', hex: '#1e3a8a' },
                      ].map((item) => (
                        <button
                          key={item.hex}
                          onClick={() => setBgColor(item.hex)}
                          className={`rounded-lg border px-1 py-1.5 text-[10px] font-medium transition-all ${
                            bgColor === item.hex
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. QUẢN LÝ KỆ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Cấu hình Kệ
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleAddRack}
                        className="flex flex-1 items-center justify-center gap-0.5 rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        + Thêm kệ
                      </button>
                      <button
                        onClick={handleDeleteRack}
                        className="flex items-center justify-center gap-0.5 rounded-xl bg-red-50 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                    <select
                      value={selectedRackId}
                      onChange={(e) => {
                        setSelectedRackId(e.target.value)
                        setSelectedBoxId('')
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800"
                    >
                      {racks.map((rack, idx) => (
                        <option key={rack.id} value={rack.id}>
                          Kệ #{idx + 1} ({rack.width}m - {rack.levels} tầng)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Co giãn kệ */}
                  <div className="flex items-center gap-2">
                    <div className="w-1/2 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Số tầng
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={activeRack?.levels || 3}
                        onChange={(e) =>
                          updateSelectedRack('levels', parseInt(e.target.value) || 1)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-center text-xs font-bold"
                      />
                    </div>
                    <div className="w-1/2 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Chiều rộng
                      </span>
                      <input
                        type="range"
                        min="2.0"
                        max="5.0"
                        step="0.1"
                        value={activeRack?.width || 3.0}
                        onChange={(e) => updateSelectedRack('width', parseFloat(e.target.value))}
                        className="h-1 w-full accent-blue-600"
                      />
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* 3. QUẢN LÝ THÙNG HÀNG */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Thành phần hàng hóa
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: activeRack?.levels || 3 }, (_, i) => i + 1).map(
                        (lvl) => (
                          <button
                            key={lvl}
                            onClick={() => handleAddCargo(lvl)}
                            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-200"
                          >
                            + Tầng {lvl}
                          </button>
                        )
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                      {activeBox ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">
                              📦 Mã: {activeBox.id.substring(0, 6)}
                            </span>
                            <button
                              onClick={handleDeleteCargo}
                              className="font-bold text-red-500 hover:underline"
                            >
                              Gỡ hàng
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Đổi màu:</span>
                            {['#c29b70', '#e11d48', '#16a34a', '#2563eb', '#ca8a04'].map((c) => (
                              <button
                                key={c}
                                onClick={() => handleUpdateBoxColor(c)}
                                className={`h-4 w-4 rounded-full ${activeBox.color === c ? 'scale-110 ring-2 ring-blue-500' : ''}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-[11px] text-slate-400 italic">
                          Click chọn một thùng hàng 3D để chỉnh màu hoặc xóa.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: 3D Preview */}
              <div className="relative flex min-h-[550px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:col-span-3 lg:min-h-[650px]">
                <div className="relative w-full flex-1 overflow-hidden rounded-xl">
                  {/* Truyền biến bgColor vào Canvas */}
                  <WarehouseCanvas
                    racks={racks}
                    setRacks={setRacks}
                    selectedRackId={selectedRackId}
                    onSelectRack={setSelectedRackId}
                    selectedBoxId={selectedBoxId}
                    onSelectBox={setSelectedBoxId}
                    bgColor={bgColor} // <-- Nhận màu nền động ở đây
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LayoutWarehouse
