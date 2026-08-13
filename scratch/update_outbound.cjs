const fs = require('fs');
const path = require('path');
const file = path.join('d:', 'Ky9', 'Capstone', 'StockSpace', 'src', 'features', 'outbound', 'pages', 'OutboundPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(
  "Share2, Loader2, Download",
  "Share2, Loader2, Download, PlusCircle, Trash2"
);
content = content.replace(
  "import receiptApi from '../../../services/wms/receiptApi'",
  "import receiptApi from '@/services/wms/receiptApi'\nimport stockApi from '@/services/wms/stockApi'"
);
content = content.replace(
  "import productApi from '../../../services/wms/productApi'",
  "import productApi from '@/services/wms/productApi'"
);

// State
content = content.replace(
  /const \[formQuantity, setFormQuantity\] = useState\(1\)[\s\S]*?const \[formNote, setFormNote\] = useState\(''\)/,
  `const [formTotalQuantity, setFormTotalQuantity] = useState(1)
  const [allocations, setAllocations] = useState([{ id: Date.now(), rackId: '', binId: '', quantity: 1 }])
  const [skuLocations, setSkuLocations] = useState([])
  const [formNote, setFormNote] = useState('')

  useEffect(() => {
    const fetchLocations = async () => {
      if (!formSkuId || !selectedWarehouseId || !layout) {
        setSkuLocations([]);
        return;
      }
      try {
        const res = await stockApi.getStockBySku(formSkuId);
        const locations = res.data?.data?.locations || [];
        
        // Match Rack/Bin names with Layout to get IDs
        const matchedLocations = locations
          .filter(loc => loc.warehouseId === selectedWarehouseId)
          .map(loc => {
            const rack = layout.racks?.find(r => r.name === loc.rackName);
            const bin = rack?.bins?.find(b => b.name === loc.binName);
            return {
              ...loc,
              rackId: rack?.id,
              binId: bin?.id
            };
          })
          .filter(loc => loc.rackId && loc.binId);
          
        setSkuLocations(matchedLocations);
        
        // Reset allocations if previous selected bins are no longer valid
        setAllocations([{ id: Date.now(), rackId: '', binId: '', quantity: 1 }]);
      } catch (error) {
        console.error("Failed to fetch SKU stock locations", error);
        setSkuLocations([]);
      }
    };
    fetchLocations();
  }, [formSkuId, selectedWarehouseId, layout]);`
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
      
      const loc = skuLocations.find(l => l.binId === alloc.binId);
      if (!loc) {
        toast.error(\`Bin \${alloc.binId.substring(0,6)} does not contain this SKU.\`);
        return;
      }
      if (qty > loc.quantity) {
        toast.error(\`Bin \${loc.binName} doesn't have enough stock! (Current: \${loc.quantity}, Taken: \${qty}).\`)
        return
      }
      
      totalAllocated += qty;
    }
    
    if (totalAllocated !== Number(formTotalQuantity)) {
      toast.error(\`Total allocated (\${totalAllocated}) must equal the total quantity (\${formTotalQuantity})\`);
      return;
    }

    setIsSubmitting(true)
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        type: 'OUTBOUND',
        items: allocations.map(a => ({
          skuId: formSkuId,
          quantity: Number(a.quantity),
          rackId: a.rackId,
          binId: a.binId,
          note: formNote
        }))
      }
      await receiptApi.createReceipt(payload)
      toast.success("Created export ticket successfully")
      setIsModalOpen(false)
      fetchReceipts()

      // Reset form
      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations([{ id: Date.now(), rackId: '', binId: '', quantity: 1 }])
      setFormNote('')
      setSkuLocations([])
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
                    
                    {!formSkuId ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Please select an SKU first to see available locations.
                      </div>
                    ) : skuLocations.length === 0 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                        This SKU is currently not in stock at this warehouse.
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {allocations.map((alloc, index) => {
                          const currentStockLoc = skuLocations.find(l => l.binId === alloc.binId);
                          // Get unique valid racks for this SKU
                          const validRackIds = [...new Set(skuLocations.map(l => l.rackId))];
                          const validRacks = layout?.racks?.filter(r => validRackIds.includes(r.id)) || [];
                          
                          // Get unique valid bins for selected rack
                          const validBinsForRack = skuLocations.filter(l => l.rackId === alloc.rackId);

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
                                    {validRacks.map(rack => (
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
                                    {validBinsForRack.map(loc => (
                                      <option key={loc.binId} value={loc.binId}>{loc.binName}</option>
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
                              {currentStockLoc && (
                                <div className="mt-3 flex gap-4 text-xs">
                                  <span className="text-slate-500">Current Stock: <span className="font-semibold text-emerald-600">{currentStockLoc.quantity}</span></span>
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
                          Add Pick Location
                        </button>
                      </div>
                    )}
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
                    <Button type="submit" isLoading={isSubmitting} disabled={!formSkuId || skuLocations.length === 0}>Confirm Outbound</Button>
                  </div>
                </form>`;

content = content.replace(
  /<form onSubmit=\{handleCreateReceipt\} className="space-y-4">[\s\S]*?<\/form>/,
  modalHTML
);

fs.writeFileSync(file, content);
