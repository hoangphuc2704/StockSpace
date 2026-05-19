export const MOCK_WAREHOUSES = [
  { 
    id: 1, 
    name: 'Saigon Logistics Hub', 
    location: 'District 9, HCM City', 
    area: 5500, 
    price: 1200, 
    status: 'AVAILABLE', 
    rating: 4.8, 
    type: 'Cold Storage',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 2, 
    name: 'Tan Binh Fulfillment Center', 
    location: 'Tan Binh, HCM City', 
    area: 2200, 
    price: 3500, 
    status: 'AVAILABLE', 
    rating: 4.9, 
    type: 'General',
    thumbnail: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 3, 
    name: 'Song Than Depot', 
    location: 'Di An, Binh Duong', 
    area: 12000, 
    price: 8000, 
    status: 'OCCUPIED', 
    rating: 4.7, 
    type: 'Bonded',
    thumbnail: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 4, 
    name: 'Noi Bai Cargo Terminal', 
    location: 'Soc Son, Ha Noi', 
    area: 8500, 
    price: 5200, 
    status: 'AVAILABLE', 
    rating: 4.6, 
    type: 'Bonded',
    thumbnail: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 5, 
    name: 'Da Nang Smart Hub', 
    location: 'Lien Chieu, Da Nang', 
    area: 1500, 
    price: 900, 
    status: 'AVAILABLE', 
    rating: 4.5, 
    type: 'Last-Mile',
    thumbnail: 'https://images.unsplash.com/photo-1493946740644-2d8a1f1a6afd?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 6, 
    name: 'VSIP II Mega Warehouse', 
    location: 'Thu Dau Mot, Binh Duong', 
    area: 25000, 
    price: 15000, 
    status: 'AVAILABLE', 
    rating: 5.0, 
    type: 'Industrial',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
  },
]

export const CATEGORIES = [
  { id: 'all', label: 'All Spaces', icon: 'Warehouse' },
  { id: 'cold', label: 'Cold Storage', icon: 'ThermometerSnowflake' },
  { id: 'fulfillment', label: 'Fulfillment', icon: 'Box' },
  { id: 'security', label: 'High Security', icon: 'Shield' },
  { id: 'last-mile', label: 'Last Mile', icon: 'Zap' },
]
