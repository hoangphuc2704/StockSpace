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
    if (parsed.wms !== undefined) list.push(`WMS support: ${parsed.wms ? 'Yes' : 'No'}`);
    if (parsed.max_staff !== undefined) list.push(`Maximum staff: ${parsed.max_staff}`);
    if (parsed.max_products !== undefined) list.push(`Maximum products: ${parsed.max_products}`);
    if (parsed.type === 'POSTING_FEE') list.push('Package type: Listing fee');
    
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
