const ADDRESS_API_BASE_URL =
  import.meta.env.VITE_ADDRESS_API_URL || 'https://provinces.open-api.vn/api/v2'

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
}

export default addressApi
