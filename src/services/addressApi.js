const ADDRESS_API_BASE_URL =
  import.meta.env.VITE_ADDRESS_API_URL || 'https://provinces.open-api.vn/api/v2'
const GEOCODING_API_URL =
  import.meta.env.VITE_GEOCODING_API_URL || 'https://nominatim.openstreetmap.org/search'
const geocodingCache = new Map()

const HO_CHI_MINH_CITY_CODE = 79

const addressApi = {
  async getHoChiMinhCityWards() {
    const response = await fetch(`${ADDRESS_API_BASE_URL}/p/${HO_CHI_MINH_CITY_CODE}?depth=2`, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Address API returned ${response.status}`)
    }

    const payload = await response.json()
    const wards = payload?.wards ?? payload?.data?.wards ?? []

    if (!Array.isArray(wards) || wards.length === 0) {
      throw new Error('No Ho Chi Minh City wards were returned')
    }

    return wards
      .filter((ward) => ward?.code != null && ward?.name)
      .map((ward) => ({
        code: String(ward.code),
        name: ward.name,
        divisionType: ward.division_type || '',
      }))
      .sort((first, second) => first.name.localeCompare(second.name, 'vi'))
  },

  async searchAddress({ addressDetail, wardName }, options = {}) {
    const query = [addressDetail, wardName, 'Thành phố Hồ Chí Minh', 'Việt Nam']
      .filter(Boolean)
      .join(', ')
    const cacheKey = query.toLocaleLowerCase('vi')
    if (geocodingCache.has(cacheKey)) return geocodingCache.get(cacheKey)

    const url = new URL(GEOCODING_API_URL)
    url.search = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'vn',
      limit: '5',
      'accept-language': 'vi,en',
    }).toString()

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    })

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`)
    }

    const results = await response.json()
    if (!Array.isArray(results)) return []

    const mappedResults = results.map((result) => {
      const address = result.address || {}
      const streetName =
        address.road || address.pedestrian || address.street || address.highway || ''
      const addressDetailValue = [
        address.house_number,
        streetName,
        address.neighbourhood || address.quarter || address.industrial,
      ]
        .filter(Boolean)
        .join(', ')

      return {
        displayName: result.display_name || '',
        addressDetail: addressDetailValue,
        streetName,
        address,
        latitude: result.lat || '',
        longitude: result.lon || '',
      }
    })
    geocodingCache.set(cacheKey, mappedResults)
    return mappedResults
  },
}

export default addressApi
