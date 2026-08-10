export const parseFeaturesToList = (features) => {
  if (!features) return [];
  let parsed = features;
  if (typeof features === 'string') {
    try {
      parsed = JSON.parse(features);
    } catch (e) {
      return [features]; // Return raw string in array if not parseable
    }
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const list = [];
    if (parsed.wms !== undefined) list.push(`Hỗ trợ WMS: ${parsed.wms ? 'Có' : 'Không'}`);
    if (parsed.max_staff !== undefined) list.push(`Số nhân viên tối đa: ${parsed.max_staff}`);
    if (parsed.max_products !== undefined) list.push(`Số sản phẩm tối đa: ${parsed.max_products}`);
    if (parsed.type === 'POSTING_FEE') list.push(`Loại gói: Phí đăng bài`);
    
    // Fallback for other keys if there are any we missed
    Object.keys(parsed).forEach(key => {
      if (!['wms', 'max_staff', 'max_products', 'type'].includes(key)) {
         list.push(`${key}: ${parsed[key]}`);
      }
    });
    return list;
  }

  return [String(parsed)];
};
