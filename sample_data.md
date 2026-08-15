# 📝 Tài liệu Sample Data cho Role: OWNER và TENANT

Dưới đây là các payload JSON mẫu mà bạn có thể dùng để test qua Postman hoặc nạp vào Database/Frontend cho 2 role chính trong hệ thống **StockSpace**.

---

## 🏢 1. Dữ liệu mẫu cho Role: OWNER

### 1.1. Đăng ký tài khoản Owner (Register)
```json
{
  "email": "owner.test@stockspace.vn",
  "password": "Password123!",
  "fullName": "Nguyen Van Owner",
  "phone": "0987654321",
  "role": "OWNER"
}
```

### 1.2. Tạo mới một Kho bãi (Create Warehouse)
```json
{
  "name": "Kho Binh Duong - Khu Công Nghiệp VSIP",
  "location": "Thành phố Dĩ An, Tỉnh Bình Dương",
  "address": "Lô số 9, KCN VSIP 1, Phường Bình Hòa, TP Dĩ An",
  "area": 1200,
  "capacity": 2500,
  "price": 25000000,
  "typeId": "uuid-cua-type-kho-mat",
  "description": "Kho lạnh chuyên bảo quản thực phẩm, hệ thống PCCC tự động, camera an ninh 24/7."
}
```

### 1.3. Cập nhật Layout Kho 3D (Setup Layout)
```json
{
  "width": 40,
  "length": 30,
  "height": 10,
  "racks": [
    {
      "name": "Rack A1",
      "coordinateX": 5,
      "coordinateY": 10,
      "positionZ": 0,
      "rotation": 90,
      "width": 10,
      "length": 2,
      "height": 6,
      "maxWeight": 4000,
      "maxVolume": 24,
      "bins": [
        {
          "name": "A1-Bin1",
          "coordinateX": 0,
          "coordinateY": 0,
          "positionZ": 1,
          "width": 2,
          "length": 2,
          "height": 2,
          "maxWeight": 1000,
          "maxVolume": 7.5
        },
        {
          "name": "A1-Bin2",
          "coordinateX": 2,
          "coordinateY": 0,
          "positionZ": 1,
          "width": 2,
          "length": 2,
          "height": 2,
          "maxWeight": 1000,
          "maxVolume": 7.5
        }
      ]
    },
    {
      "name": "Rack A2",
      "coordinateX": 5,
      "coordinateY": 15,
      "positionZ": 0,
      "rotation": 90,
      "width": 10,
      "length": 2,
      "height": 6,
      "maxWeight": 4000,
      "maxVolume": 24,
      "bins": [
        {
          "name": "A2-Bin1",
          "coordinateX": 0,
          "coordinateY": 0,
          "positionZ": 1,
          "width": 2,
          "length": 2,
          "height": 2,
          "maxWeight": 1000,
          "maxVolume": 7.5
        },
        {
          "name": "A2-Bin2",
          "coordinateX": 2,
          "coordinateY": 0,
          "positionZ": 1,
          "width": 2,
          "length": 2,
          "height": 2,
          "maxWeight": 1000,
          "maxVolume": 7.5
        }
      ]
    }
  ]
}
```

### 1.4. Owner xử lý yêu cầu thuê kho (Approve Booking)
*(API chỉ cần nhận ID của booking trên URL hoặc body tuỳ endpoint)*
```json
// Reject Booking
{
  "reason": "Xin lỗi, kho vừa có khách hàng khác đặt cọc."
}
```

---

## 🧑‍💼 2. Dữ liệu mẫu cho Role: TENANT

### 2.1. Đăng ký tài khoản Tenant (Register)
```json
{
  "email": "tenant.test@stockspace.vn",
  "password": "Password123!",
  "fullName": "Công ty TNHH Bán Lẻ Tenant",
  "phone": "0123456789",
  "role": "TENANT"
}
```

### 2.2. Gửi yêu cầu Thuê kho (Create Booking Request)
```json
{
  "warehouseId": "uuid-cua-warehouse",
  "startDate": "2026-09-01",
  "endDate": "2027-09-01",
  "note": "Chúng tôi cần thuê kho này để lưu trữ hàng điện máy trong 1 năm."
}
```

### 2.3. Tạo danh mục sản phẩm (Create SKU)
```json
{
  "skuCode": "SKU-ELEC-001",
  "name": "Tủ lạnh Samsung Inverter 236L",
  "categoryId": "uuid-cua-category-dien-may",
  "uomId": "uuid-cua-don-vi-cai",
  "description": "Tủ lạnh tiết kiệm điện, hàng dễ vỡ cần nhẹ tay",
  "weight": 45.5,
  "volume": 0.6
}
```

### 2.4. Khởi tạo Phiếu nhập kho (Create Inbound Receipt)
*(Do Tenant hoặc Staff thực hiện)*
```json
{
  "warehouseId": "uuid-cua-warehouse",
  "expectedDate": "2026-08-20T08:00:00Z",
  "note": "Nhập lô hàng điện máy đợt 1 tháng 8",
  "items": [
    {
      "skuId": "uuid-cua-SKU-ELEC-001",
      "expectedQuantity": 50,
      "note": "Hàng nguyên seal"
    }
  ]
}
```

### 2.5. Tạo Ticket Tranh chấp (Raise Dispute)
```json
{
  "contractId": "uuid-cua-hop-dong",
  "reason": "Chủ kho không bàn giao đúng diện tích như cam kết trên hợp đồng.",
  "evidenceImages": [
    "https://storage.stockspace.vn/disputes/img1.jpg",
    "https://storage.stockspace.vn/disputes/img2.jpg"
  ]
}
```
