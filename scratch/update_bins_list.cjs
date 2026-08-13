const fs = require('fs');
const path = require('path');
const fileIn = path.join('d:', 'Ky9', 'Capstone', 'StockSpace', 'src', 'features', 'inbound', 'pages', 'InboundPage.jsx');
let contentIn = fs.readFileSync(fileIn, 'utf8');

// Replace state and logic for Inbound
contentIn = contentIn.replace(
  /const \[allocations, setAllocations\] = useState\(\[\{ id: Date\.now\(\), rackId: '', binId: '', quantity: 1 \}\]\)/,
  `const [allocations, setAllocations] = useState({}) // { binId: quantity }`
);

contentIn = contentIn.replace(
  /const fetchCapacities = async \(\) => \{[\s\S]*?fetchCapacities\(\);\n  \}, \[allocations, selectedWarehouseId, layout\]\);/,
  `const fetchCapacities = async () => {
      if (!selectedWarehouseId || !layout) return;
      const binIds = layout.racks?.flatMap(r => r.bins?.map(b => b.id)) || [];
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
  }, [selectedWarehouseId, layout]);`
);

// Update submit handler for Inbound
const submitIn = `  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId) {
      toast.error("Please select a product")
      return
    }
    
    // Filter out bins with 0 or empty quantity
    const activeAllocations = Object.entries(allocations).filter(([binId, qty]) => Number(qty) > 0);
    
    if (activeAllocations.length === 0) {
      toast.error("Please allocate quantity to at least one bin")
      return
    }
    
    let totalAllocated = 0;
    const payloadItems = [];

    for (const [binId, qtyStr] of activeAllocations) {
      const qty = Number(qtyStr);
      totalAllocated += qty;
      
      let rackId = null;
      layout?.racks?.forEach(r => {
        if (r.bins?.some(b => b.id === binId)) rackId = r.id;
      });
      
      const cap = binCapacities[binId];
      if (cap && cap.available !== 'Unlimited' && qty > cap.available) {
        toast.error(\`Bin exceeds capacity! (Available: \${cap.available}, Allocated: \${qty}). Please adjust.\`)
        return
      }
      
      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: rackId,
        binId: binId,
        note: formNote
      });
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
        items: payloadItems
      }
      await receiptApi.createReceipt(payload)
      toast.success("Created successful entry form")
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setBinCapacities({})
      setFormNote('')
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || "Error while creating ticket")
    } finally {
      setIsSubmitting(false)
    }
  }`;

contentIn = contentIn.replace(
  /const handleCreateReceipt = async \(e\) => \{[\s\S]*?finally \{\s*setIsSubmitting\(false\)\s*\}\s*\}/,
  submitIn
);

// Update HTML for Inbound
const htmlIn = `                <form onSubmit={handleCreateReceipt} className="space-y-4">
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
                      <label className="text-sm font-medium text-slate-700">Allocate into Bins</label>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                        Total Allocated: {Object.values(allocations).reduce((acc, val) => acc + (Number(val) || 0), 0)} / {formTotalQuantity}
                      </span>
                    </div>
                    
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-[400px] overflow-y-auto">
                      {!layout?.racks?.length ? (
                         <div className="text-center text-sm text-slate-500 py-4">No Racks found in this warehouse.</div>
                      ) : (
                        <div className="space-y-4">
                          {layout.racks.map(rack => (
                            <div key={rack.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                              <h4 className="font-semibold text-slate-800 text-sm mb-2">{rack.name}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {rack.bins?.map(bin => {
                                  const cap = binCapacities[bin.id];
                                  return (
                                    <div key={bin.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                                      <div>
                                        <div className="text-sm font-medium text-slate-700">{bin.name}</div>
                                        {cap && (
                                          <div className="text-[10px] text-slate-500">
                                            Avail: <span className="font-semibold text-emerald-600">{cap.available}</span> / Max: {cap.max}
                                          </div>
                                        )}
                                      </div>
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="w-20 rounded-md border border-slate-200 bg-white p-1 text-sm text-center focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={allocations[bin.id] || ''}
                                        onChange={(e) => {
                                          setAllocations(prev => ({ ...prev, [bin.id]: e.target.value }));
                                        }}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

contentIn = contentIn.replace(
  /<form onSubmit=\{handleCreateReceipt\} className="space-y-4">[\s\S]*?<\/form>/,
  htmlIn
);

fs.writeFileSync(fileIn, contentIn);

// ----------------------------------------------------
// OUTBOUND
// ----------------------------------------------------
const fileOut = path.join('d:', 'Ky9', 'Capstone', 'StockSpace', 'src', 'features', 'outbound', 'pages', 'OutboundPage.jsx');
let contentOut = fs.readFileSync(fileOut, 'utf8');

contentOut = contentOut.replace(
  /const \[allocations, setAllocations\] = useState\(\[\{ id: Date\.now\(\), rackId: '', binId: '', quantity: 1 \}\]\)/,
  `const [allocations, setAllocations] = useState({}) // { binId: quantity }`
);

contentOut = contentOut.replace(
  /setAllocations\(\[\{ id: Date\.now\(\), rackId: '', binId: '', quantity: 1 \}\]\);/g,
  `setAllocations({});`
);

const submitOut = `  const handleCreateReceipt = async (e) => {
    e.preventDefault()
    if (!formSkuId) {
      toast.error("Please select a product")
      return
    }

    const activeAllocations = Object.entries(allocations).filter(([binId, qty]) => Number(qty) > 0);

    if (activeAllocations.length === 0) {
      toast.error("Please allocate quantity to at least one bin")
      return
    }

    let totalAllocated = 0;
    const payloadItems = [];

    for (const [binId, qtyStr] of activeAllocations) {
      const qty = Number(qtyStr);
      
      const loc = skuLocations.find(l => l.binId === binId);
      if (!loc) {
        toast.error(\`Bin \${binId.substring(0,6)} does not contain this SKU.\`);
        return;
      }
      if (qty > loc.quantity) {
        toast.error(\`Bin \${loc.binName} doesn't have enough stock! (Current: \${loc.quantity}, Taken: \${qty}).\`)
        return
      }
      
      totalAllocated += qty;
      payloadItems.push({
        skuId: formSkuId,
        quantity: qty,
        rackId: loc.rackId,
        binId: loc.binId,
        note: formNote
      });
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
        items: payloadItems
      }
      await receiptApi.createReceipt(payload)
      toast.success("Created export ticket successfully")
      setIsModalOpen(false)
      fetchReceipts()

      setFormSkuId('')
      setFormTotalQuantity(1)
      setAllocations({})
      setFormNote('')
      setSkuLocations([])
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error(error.response?.data?.message || "Error while creating ticket")
    } finally {
      setIsSubmitting(false)
    }
  }`;

contentOut = contentOut.replace(
  /const handleCreateReceipt = async \(e\) => \{[\s\S]*?finally \{\s*setIsSubmitting\(false\)\s*\}\s*\}/,
  submitOut
);

const htmlOut = `                <form onSubmit={handleCreateReceipt} className="space-y-4">
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
                      <label className="text-sm font-medium text-slate-700">Pick from Bins</label>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                        Total Picked: {Object.values(allocations).reduce((acc, val) => acc + (Number(val) || 0), 0)} / {formTotalQuantity}
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
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {skuLocations.map(loc => (
                            <div key={loc.binId} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-xs font-medium text-slate-500">{loc.rackName}</div>
                                  <div className="text-sm font-bold text-slate-800">{loc.binName}</div>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="w-20 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm text-center focus:ring-2 focus:ring-primary focus:outline-none"
                                  value={allocations[loc.binId] || ''}
                                  onChange={(e) => {
                                    setAllocations(prev => ({ ...prev, [loc.binId]: e.target.value }));
                                  }}
                                />
                              </div>
                              <div className="text-xs text-slate-500">
                                Current Stock: <span className="font-semibold text-emerald-600">{loc.quantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
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

contentOut = contentOut.replace(
  /<form onSubmit=\{handleCreateReceipt\} className="space-y-4">[\s\S]*?<\/form>/,
  htmlOut
);

fs.writeFileSync(fileOut, contentOut);
