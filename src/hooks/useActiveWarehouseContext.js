import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { clearActiveWarehouse, setActiveWarehouse } from '@/store/warehouseContextSlice'

/**
 * Keeps the warehouse selected by a warehouse-scoped page available to the
 * global chatbot. The chat session intentionally remains untouched when this
 * value changes.
 */
const useActiveWarehouseContext = (warehouseId) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const scope = location.pathname
  const queryWarehouseId = new URLSearchParams(location.search).get('warehouseId')
  const previousWarehouseIdRef = useRef(warehouseId || null)

  useEffect(() => {
    dispatch(setActiveWarehouse({ warehouseId: warehouseId || null, scope }))

    // Keep an existing ?warehouseId=... query parameter aligned with a
    // dropdown change so the URL remains the highest-priority source.
    const previousWarehouseId = previousWarehouseIdRef.current
    const nextWarehouseId = warehouseId || null
    if (
      previousWarehouseId !== nextWarehouseId &&
      queryWarehouseId !== (nextWarehouseId ? String(nextWarehouseId) : null)
    ) {
      const nextParams = new URLSearchParams(location.search)
      if (nextWarehouseId) nextParams.set('warehouseId', String(nextWarehouseId))
      else nextParams.delete('warehouseId')
      const nextSearch = nextParams.toString()
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true }
      )
    }
    previousWarehouseIdRef.current = nextWarehouseId

    return () => dispatch(clearActiveWarehouse(scope))
  }, [
    dispatch,
    location.pathname,
    location.search,
    navigate,
    queryWarehouseId,
    scope,
    warehouseId,
  ])
}

export default useActiveWarehouseContext
