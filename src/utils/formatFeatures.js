const INTERNAL_FEATURE_KEYS = new Set(['max_staff', 'max_products', 'maxStaff', 'maxProducts'])

const normalizeFeatureText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const humanizeFeatureKey = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

const formatFeatureValue = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export const parseFeaturesToList = (features) => {
  if (!features) return []

  let parsed = features
  if (typeof features === 'string') {
    try {
      parsed = JSON.parse(features)
    } catch {
      return [features.trim()]
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
      .filter((feature) => feature != null && feature !== '')
      .map((feature) => (typeof feature === 'string' ? feature : formatFeatureValue(feature)))
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed)
      .filter(([key]) => !INTERNAL_FEATURE_KEYS.has(key))
      .map(([key, value]) => {
        if (key === 'wms') return value ? 'WMS access' : 'WMS access: No'
        if (key === 'type' && value === 'POSTING_FEE') return 'Package type: Listing fee'
        return `${humanizeFeatureKey(key)}: ${formatFeatureValue(value)}`
      })
  }

  return [String(parsed)]
}

export const isInternalFeePackage = (pkg = {}) => {
  const name = normalizeFeatureText(pkg.name)
  const featureType = (() => {
    if (typeof pkg.features !== 'string') return normalizeFeatureText(pkg.features?.type)
    try {
      return normalizeFeatureText(JSON.parse(pkg.features)?.type)
    } catch {
      return normalizeFeatureText(pkg.features)
    }
  })()

  return (
    featureType.includes('posting_fee') ||
    featureType.includes('inspection_fee') ||
    name.includes('posting fee') ||
    name.includes('inspection fee') ||
    name.includes('phi dang bai') ||
    name.includes('phi kiem dinh')
  )
}
