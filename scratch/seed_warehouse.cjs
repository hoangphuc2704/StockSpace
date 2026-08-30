const axios = require('axios');

async function seedData() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'owner@stockspace.com',
      password: '12345678'
    });
    
    const token = loginRes.data?.data?.accessToken;
    if (!token) throw new Error("No token received");

    console.log('✅ Logged in successfully');

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    // First, let's fetch a valid type ID
    const typesRes = await axios.get('http://localhost:8080/api/public/warehouses/types');
    const typeId = typesRes.data?.data[0]?.id || "51f2bdbc-68a3-4d05-87fb-659b358aef93";

    // 2. Create Warehouse
    const warehousePayload = {
      typeId: typeId,
      name: "Kho Tiêu Chuẩn Mẫu (Seeded)",
      address: "Khu Công Nghệ Cao, TP. Thủ Đức",
      provinceCode: "79",
      provinceName: "Thành phố Hồ Chí Minh",
      districtCode: "764",
      districtName: "Thành phố Thủ Đức",
      description: "Kho tự động tạo bằng script.",
      capacity: 500.0,
      rentalPrice: 15000000.00,
      rentalPricingType: "FIXED_MONTHLY",
      imageUrls: []
    };

    console.log('⏳ Creating warehouse...');
    const createRes = await axios.post('http://localhost:8080/api/owner/warehouses', warehousePayload, config);
    
    const newWarehouseId = createRes.data?.data?.id;
    console.log('✅ Created Warehouse with ID:', newWarehouseId);

    // 3. Create Layout
    const layoutPayload = {
      width: 20.0,
      length: 25.0,
      height: 6.0,
      racks: [
        {
          name: "Rack A",
          code: "R-A",
          maxWeight: 5000.0,
          maxVolume: 20.0,
          coordinateX: 2.0,
          coordinateY: 2.0,
          positionZ: 0.0,
          rotation: 0,
          width: 2.0,
          length: 10.0,
          height: 4.0,
          bins: [
            {
              shelfLevel: 1,
              name: "Bin A-01",
              code: "B-A01",
              maxWeight: 1000.0,
              maxVolume: 5.0,
              coordinateX: 0.0,
              coordinateY: 0.0,
              positionZ: 0.0,
              width: 2.0,
              length: 2.0,
              height: 2.0
            }
          ]
        }
      ],
      positions: []
    };

    console.log('⏳ Saving layout...');
    await axios.put(`http://localhost:8080/api/owner/warehouses/${newWarehouseId}/layout`, layoutPayload, config);
    console.log('✅ Layout saved successfully!');

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

seedData();
