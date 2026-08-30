# 5 Data Mẫu Cho Owner: Tạo Kho & Layout Kho

Dưới đây là 5 bộ dữ liệu mẫu (Sample Data) tuân thủ chặt chẽ cấu trúc JSON của Backend (`CreateWarehouseRequest` và `BulkLayoutSaveRequest`) dùng cho Owner tạo kho và cấu hình sơ đồ (Layout).

---

## 1. Kho Tiêu Chuẩn (Standard Storage Warehouse)
Kho hàng thông thường, diện tích vừa phải, tính giá cố định hàng tháng (FIXED_MONTHLY).

### API Create Warehouse (`POST /api/owner/warehouses`)
```json
{
  "typeId": "11111111-1111-1111-1111-111111111111", 
  "name": "Kho Tiêu Chuẩn Quận 9",
  "address": "123 Đường D1, Khu Công Nghệ Cao",
  "provinceCode": "79",
  "provinceName": "Thành phố Hồ Chí Minh",
  "districtCode": "764",
  "districtName": "Thành phố Thủ Đức",
  "description": "Kho lưu trữ hàng hóa khô tiêu chuẩn, xe tải lớn vào được tận nơi.",
  "capacity": 500.0,
  "rentalPrice": 15000000.00,
  "rentalPricingType": "FIXED_MONTHLY",
  "imageUrls": [
    "https://example.com/images/kho-q9-1.jpg"
  ]
}
```

### API Save Layout (`PUT /api/owner/warehouses/{id}/layout`)
```json
{
  "width": 20.0,
  "length": 25.0,
  "height": 6.0,
  "racks": [
    {
      "name": "Rack A",
      "code": "R-A",
      "maxWeight": 5000.0,
      "maxVolume": 20.0,
      "coordinateX": 2.0,
      "coordinateY": 2.0,
      "positionZ": 0.0,
      "rotation": 0,
      "width": 2.0,
      "length": 10.0,
      "height": 4.0,
      "bins": [
        {
          "shelfLevel": 1,
          "name": "Bin A-01",
          "code": "B-A01",
          "maxWeight": 1000.0,
          "maxVolume": 5.0,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.0,
          "width": 2.0,
          "length": 2.0,
          "height": 2.0
        },
        {
          "shelfLevel": 2,
          "name": "Bin A-02",
          "code": "B-A02",
          "maxWeight": 1000.0,
          "maxVolume": 5.0,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 2.0,
          "width": 2.0,
          "length": 2.0,
          "height": 2.0
        }
      ]
    }
  ],
  "positions": []
}
```

---

## 2. Kho Lạnh (Cold Storage)
Kho chuyên dụng cho hàng đông lạnh, tính giá theo mét vuông (PER_SQUARE_METER_MONTHLY).

### API Create Warehouse
```json
{
  "typeId": "22222222-2222-2222-2222-222222222222", 
  "name": "Kho Lạnh Tân Bình",
  "address": "45 Trường Chinh, Phường 15",
  "provinceCode": "79",
  "provinceName": "Thành phố Hồ Chí Minh",
  "districtCode": "766",
  "districtName": "Quận Tân Bình",
  "description": "Nhiệt độ âm 18 độ C, phù hợp bảo quản thủy hải sản và thịt.",
  "capacity": 300.0,
  "rentalPrice": 500000.00,
  "rentalPricingType": "PER_SQUARE_METER_MONTHLY",
  "imageUrls": [
    "https://example.com/images/kho-lanh-tb.jpg"
  ]
}
```

### API Save Layout
```json
{
  "width": 15.0,
  "length": 20.0,
  "height": 5.0,
  "racks": [
    {
      "name": "Cold Rack 1",
      "code": "CR-1",
      "maxWeight": 3000.0,
      "maxVolume": 10.0,
      "coordinateX": 1.0,
      "coordinateY": 1.0,
      "positionZ": 0.0,
      "rotation": 90,
      "width": 1.5,
      "length": 5.0,
      "height": 3.0,
      "bins": [
        {
          "shelfLevel": 1,
          "name": "Thùng lạnh 1",
          "code": "CB-1",
          "maxWeight": 500.0,
          "maxVolume": 2.0,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.0,
          "width": 1.5,
          "length": 1.5,
          "height": 1.5
        }
      ]
    }
  ],
  "positions": []
}
```

---

## 3. Trung Tâm Phân Phối Lớn (Large Distribution Center)
Kho lớn, tính giá thương lượng (NEGOTIATED), nên `rentalPrice` sẽ truyền `null` lúc tạo.

### API Create Warehouse
```json
{
  "typeId": "33333333-3333-3333-3333-333333333333", 
  "name": "Trung Tâm Phân Phối Sóng Thần",
  "address": "Lô 5, KCN Sóng Thần",
  "provinceCode": "74",
  "provinceName": "Tỉnh Bình Dương",
  "districtCode": "723",
  "districtName": "Thành phố Dĩ An",
  "description": "Kho siêu rộng dành cho các nhà phân phối lớn, hệ thống dock cont hiện đại.",
  "capacity": 5000.0,
  "rentalPrice": null,
  "rentalPricingType": "NEGOTIATED",
  "imageUrls": []
}
```

### API Save Layout
```json
{
  "width": 100.0,
  "length": 50.0,
  "height": 12.0,
  "racks": [
    {
      "name": "Heavy Duty Rack X",
      "code": "HDR-X",
      "maxWeight": 20000.0,
      "maxVolume": 100.0,
      "coordinateX": 5.0,
      "coordinateY": 10.0,
      "positionZ": 0.0,
      "rotation": 0,
      "width": 3.0,
      "length": 20.0,
      "height": 10.0,
      "bins": [
        {
          "shelfLevel": 1,
          "name": "Pallet L1",
          "code": "PAL-L1",
          "maxWeight": 2000.0,
          "maxVolume": 10.0,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.0,
          "width": 3.0,
          "length": 3.0,
          "height": 2.5
        }
      ]
    }
  ],
  "positions": []
}
```

---

## 4. Kho Chuyên Đồ Điện Tử (Electronics Warehouse)
Tính giá cố định (FIXED_MONTHLY), yêu cầu môi trường khô ráo, bảo vệ nghiêm ngặt.

### API Create Warehouse
```json
{
  "typeId": "44444444-4444-4444-4444-444444444444", 
  "name": "Kho Linh Kiện Điện Tử Q7",
  "address": "Khu Chế Xuất Tân Thuận",
  "provinceCode": "79",
  "provinceName": "Thành phố Hồ Chí Minh",
  "districtCode": "778",
  "districtName": "Quận 7",
  "description": "Kho có hệ thống kiểm soát độ ẩm, chống tĩnh điện ESD, an ninh 24/7.",
  "capacity": 800.0,
  "rentalPrice": 22000000.00,
  "rentalPricingType": "FIXED_MONTHLY",
  "imageUrls": [
    "https://example.com/images/kho-dientu.png"
  ]
}
```

### API Save Layout
```json
{
  "width": 25.0,
  "length": 32.0,
  "height": 8.0,
  "racks": [
    {
      "name": "ESD Rack 01",
      "code": "ESD-01",
      "maxWeight": 1500.0,
      "maxVolume": 5.0,
      "coordinateX": 10.0,
      "coordinateY": 5.0,
      "positionZ": 0.0,
      "rotation": 0,
      "width": 1.0,
      "length": 5.0,
      "height": 2.5,
      "bins": [
        {
          "shelfLevel": 1,
          "name": "ESD Bin A",
          "code": "ESD-B-A",
          "maxWeight": 100.0,
          "maxVolume": 0.5,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.0,
          "width": 1.0,
          "length": 1.0,
          "height": 0.5
        }
      ]
    }
  ],
  "positions": []
}
```

---

## 5. Kho Bán Lẻ Nhỏ (Small Retail Storage)
Kho nhỏ phù hợp cho cá nhân kinh doanh online, tính phí theo mét vuông (PER_SQUARE_METER_MONTHLY).

### API Create Warehouse
```json
{
  "typeId": "55555555-5555-5555-5555-555555555555", 
  "name": "Kho Chứa Hàng Shopee/Tiktok",
  "address": "22 Lê Văn Sỹ, Phường 13",
  "provinceCode": "79",
  "provinceName": "Thành phố Hồ Chí Minh",
  "districtCode": "768",
  "districtName": "Quận Phú Nhuận",
  "description": "Mini kho cho nhà bán hàng nhỏ lẻ, tích hợp khu vực đóng gói.",
  "capacity": 50.0,
  "rentalPrice": 300000.00,
  "rentalPricingType": "PER_SQUARE_METER_MONTHLY",
  "imageUrls": []
}
```

### API Save Layout
```json
{
  "width": 5.0,
  "length": 10.0,
  "height": 3.0,
  "racks": [
    {
      "name": "Kệ siêu thị 1",
      "code": "KS-1",
      "maxWeight": 200.0,
      "maxVolume": 2.0,
      "coordinateX": 0.5,
      "coordinateY": 0.5,
      "positionZ": 0.0,
      "rotation": 0,
      "width": 0.6,
      "length": 2.0,
      "height": 2.0,
      "bins": [
        {
          "shelfLevel": 1,
          "name": "Ngăn dưới",
          "code": "KS-1-1",
          "maxWeight": 50.0,
          "maxVolume": 0.5,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.0,
          "width": 0.6,
          "length": 1.0,
          "height": 0.5
        },
        {
          "shelfLevel": 2,
          "name": "Ngăn giữa",
          "code": "KS-1-2",
          "maxWeight": 50.0,
          "maxVolume": 0.5,
          "coordinateX": 0.0,
          "coordinateY": 0.0,
          "positionZ": 0.5,
          "width": 0.6,
          "length": 1.0,
          "height": 0.5
        }
      ]
    }
  ],
  "positions": []
}
```
