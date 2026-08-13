const fs = require('fs');
const path = require('path');
const file = path.join('d:', 'Ky9', 'Capstone', 'StockSpace', 'src', 'features', 'inbound', 'pages', 'InboundPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(
  "FileText, Download, Loader2",
  "FileText, Download, Loader2, PlusCircle, Trash2"
);
content = content.replace(
  "import receiptApi from '@/services/wms/receiptApi'",
  "import receiptApi from '@/services/wms/receiptApi'\nimport stockApi from '@/services/wms/stockApi'"
);

// State
content = content.replace(
  /const \[formQuantity, setFormQuantity\] = useState\(1\)[\s\S]*?const \[formNote, setFormNote\] = useState\(''\)/,
  `const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [allocations, setAllocations] = useState([{ id: Date.now(), rackId: '', binId: '', quantity: 1 }])
  const [binCapacities, setBinCapacities] = useState({})
  const [formNote, setFormNote] = useState('')

  useEffect(() => {
    const fetchCapacities = async () => {
      if (!selectedWarehouseId || !layout) return;
      const binIds = [...new Set(allocations.map(a => a.binId).filter(Boolean))];
      const newCapacities = { ...binCapacities };
      let changed = false;
      
      for (const binId of binIds) {
        if (!newCapacities[binId]) {
          try {
            let targetBin = null;
            layout.racks?.forEach(r => {
              const b = r.bins?.find(b => b.id === binId);
              if (b) targetBin = b;
            });
            if (!targetBin) continue;
            
            const stockRes = await stockApi.getStockByBin(selectedWarehouseId, binId);
            const currentStock = stockRes.totalQuantity || 0;
            const maxWeight = targetBin.maxWeight ? Number(targetBin.maxWeight) : Infinity;
            const maxVolume = targetBin.maxVolume ? Number(targetBin.maxVolume) : Infinity;
            const maxCapacity = Math.min(maxWeight, maxVolume);
            
            newCapacities[binId] = {
              max: maxCapacity === Infinity ? 'Unlimited' : maxCapacity,
              current: currentStock,
              available: maxCapacity === Infinity ? 'Unlimited' : Math.max(maxCapacity - currentStock, 0)
            };
            changed = true;
          } catch (e) {
            console.error('Error fetching bin capacity', e);
          }
        }
      }
      if (changed) {
        setBinCapacities(newCapacities);
      }
    };
    fetchCapacities();
  }, [allocations, selectedWarehouseId, layout]);`
);

// Submit
const submitReplacement = `  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId) {
      toast.error("Please select a product")
      return
    }
    if (allocations.length === 0) {
      toast.error("Please add at least one location allocation")
      return
    }
    
    let totalAllocated = 0;
    for (const alloc of allocations) {
      if (!alloc.rackId || !alloc.binId) {
        toast.error("Please complete all Rack and Bin selections in the allocation list")
        return
      }
      const qty = Number(alloc.quantity);
      if (!qty || qty <= 0) {
        toast.error("Allocated quantity must be greater than 0")
        return
      }
      totalAllocated += qty;
      
      const cap = binCapacities[alloc.binId];
      if (cap && cap.available !== 'Unlimited' && qty > cap.available) {
        toast.error(\`Bin \${alloc.binId.substring(0,6)} exceeds capacity! (Available: \${cap.available}, Allocated: \${qty}). Please adjust.\`)
        return
      }
    }
    
    if (totalAllocated !== Number(formTotalQuantity)) {
      toast.error(\`Total allocated (\${totalAllocated}) must equal the total quantity (\${formTotalQuantity})\`);
      return;
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'INBOUND',
        items: allocations.map(a => ({
          skuId: formSkuId,
          quantity: Number(a.quantity),
          rackId: a.rackId,
          binId: a.binId,
          note: formNote
        }))
      }
      await receiptApi.createReceipt(payload)
      toast.success("Created successful entry form")
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations([{ id: Date.now(), rackId: '', binId: '', quantity: 1 }])
      setBinCapacities({})
      setFormNote('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || "Error while creating ticket")
    } finally {
      setIsSubmitting(false)
    }
  }`;

content = content.replace(
  /const handleCreateReceipt = async \(e\) => \{[\s\S]*?finally \{\s*setIsSubmitting\(false\)\s*\}\s*\}/,
  submitReplacement
);

// Modal HTML
const modalHTML = `                <form onSubmit={handleCreateReceipt} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Select Product (SKU)</label>
                      <select
                        required
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        value={formSkuId}
                        onChange={(e) => setFormSkuId(e.target.value)}
                      >
                        <option value="">-- Select product --</option>
                        {skus.map(sku => (
                          <option key={sku.id} value={sku.id}>[{sku.skuCode}] {sku.name}</option>
                        ))}
                      </select>
                    </div>
  
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Total Quantity</label>
                      <InputField
                        type="number"
                        min="1"
                        required
                        value={formTotalQuantity}
                        onChange={(e) => setFormTotalQuantity(e.target.value)}
                      />
                    </div>
                  </div>
  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Location Allocations</label>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                        Total Allocated: {allocations.reduce((acc, a) => acc + (Number(a.quantity) || 0), 0)} / {formTotalQuantity}
                      </span>
                    </div>
                    
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      {allocations.map((alloc, index) => {
                        const selectedRack = layout?.racks?.find(r => r.id === alloc.rackId)
                        const cap = binCapacities[alloc.binId];
                        return (
                          <div key={alloc.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm relative">
                            {allocations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setAllocations(allocs => allocs.filter(a => a.id !== alloc.id))}
                                className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-6">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Rack</label>
                                <select
                                  required
                                  className="w-full rounded-md border border-slate-200 bg-white p-1.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                                  value={alloc.rackId}
                                  onChange={(e) => {
                                    const newAllocs = [...allocations]
                                    newAllocs[index].rackId = e.target.value
                                    newAllocs[index].binId = ''
                                    setAllocations(newAllocs)
                                  }}
                                >
                                  <option value="">Select rack</option>
                                  {layout?.racks?.map(rack => (
                                    <option key={rack.id} value={rack.id}>{rack.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Bin</label>
                                <select
                                  required
                                  disabled={!alloc.rackId}
                                  className="w-full rounded-md border border-slate-200 bg-white p-1.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-slate-100"
                                  value={alloc.binId}
                                  onChange={(e) => {
                                    const newAllocs = [...allocations]
                                    newAllocs[index].binId = e.target.value
                                    setAllocations(newAllocs)
                                  }}
                                >
                                  <option value="">Select bin</option>
                                  {selectedRack?.bins?.map(bin => (
                                    <option key={bin.id} value={bin.id}>{bin.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  className="w-full rounded-md border border-slate-200 bg-white p-1.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                                  value={alloc.quantity}
                                  onChange={(e) => {
                                    const newAllocs = [...allocations]
                                    newAllocs[index].quantity = e.target.value
                                    setAllocations(newAllocs)
                                  }}
                                />
                              </div>
                            </div>
                            {cap && (
                              <div className="mt-3 flex gap-4 text-xs">
                                <span className="text-slate-500">Max Cap: <span className="font-semibold text-slate-700">{cap.max}</span></span>
                                <span className="text-slate-500">Available: <span className="font-semibold text-emerald-600">{cap.available}</span></span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setAllocations(a => [...a, { id: Date.now(), rackId: '', binId: '', quantity: 1 }])}
                        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add Bin Allocation
                      </button>
                    </div>
                  </div>
  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Note (Optional)</label>
                    <InputField
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Enter notes..."
                    />
                  </div>
  
                  <div className="pt-6 flex justify-end gap-3 border-t border-slate-200">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" isLoading={isSubmitting}>Confirm Inbound</Button>
                  </div>
                </form>`;

content = content.replace(
  /<form onSubmit=\{handleCreateReceipt\} className="space-y-4">[\s\S]*?<\/form>/,
  modalHTML
);

fs.writeFileSync(file, content);
