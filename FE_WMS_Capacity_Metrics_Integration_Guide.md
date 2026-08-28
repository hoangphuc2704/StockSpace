# FE Integration Guide — WMS Capacity Metrics

Tài liệu này mô tả API đọc tải thực tế của rack/bin sau Plan 03. API chỉ cung cấp số liệu để FE hiển thị; không thay đổi API layout hiện có và không tự động chọn bin.

## 1. API

```http
GET /api/tenant/warehouses/{warehouseId}/layout/capacity
Authorization: Bearer <access-token>
```

`warehouseId` là kho đang được chọn trên màn hình. Không dùng một warehouse cố định hoặc cộng dữ liệu của tất cả kho.

### Quyền truy cập

| Người dùng | Điều kiện |
|---|---|
| Tenant | Contract của tenant với warehouse có trạng thái `ACTIVE` |
| Staff | Contract `ACTIVE` và staff có assignment `ACTIVE` vào đúng warehouse |
| Tenant/Staff hết contract hoặc không còn assignment | API trả `403` |

API đọc capacity không yêu cầu subscription. Các API ghi dữ liệu WMS vẫn áp dụng subscription/permission theo rule hiện tại.

## 2. Response envelope

API dùng envelope chung của backend:

```json
{
  "success": true,
  "message": "Capacity metrics loaded successfully",
  "data": {
    "warehouseId": "warehouse-uuid",
    "warehouseName": "Main Warehouse",
    "layoutId": "layout-uuid",
    "racks": []
  }
}
```

## 3. Cấu trúc dữ liệu

`racks` chứa các rack của layout đang được áp dụng cho tenant. Mỗi rack chứa danh sách `bins` tương ứng.

```json
{
  "success": true,
  "message": "Capacity metrics loaded successfully",
  "data": {
    "warehouseId": "11111111-1111-1111-1111-111111111111",
    "warehouseName": "Main Warehouse",
    "layoutId": "22222222-2222-2222-2222-222222222222",
    "racks": [
      {
        "rackId": "33333333-3333-3333-3333-333333333333",
        "rackName": "Rack A",
        "currentWeightKg": 125.50,
        "currentVolumeM3": 3.250,
        "maxWeightKg": 500.00,
        "maxVolumeM3": 10.000,
        "remainingWeightKg": 374.50,
        "remainingVolumeM3": 6.750,
        "weightUtilizationPercent": 25.10,
        "volumeUtilizationPercent": 32.50,
        "capacityStatus": "AVAILABLE",
        "storedSkus": [
          {
            "skuId": "44444444-4444-4444-4444-444444444444",
            "skuCode": "SKU-001",
            "skuName": "Product A",
            "quantity": 10,
            "weightKg": 125.50,
            "volumeM3": 3.250
          }
        ],
        "bins": [
          {
            "binId": "55555555-5555-5555-5555-555555555555",
            "binName": "Bin A1",
            "currentWeightKg": 125.50,
            "currentVolumeM3": 3.250,
            "maxWeightKg": 200.00,
            "maxVolumeM3": 5.000,
            "remainingWeightKg": 74.50,
            "remainingVolumeM3": 1.750,
            "weightUtilizationPercent": 62.75,
            "volumeUtilizationPercent": 65.00,
            "capacityStatus": "AVAILABLE",
            "storedSkus": []
          }
        ]
      }
    ]
  }
}
```

### Trường của rack/bin

| Field | Ý nghĩa |
|---|---|
| `currentWeightKg` | Tổng khối lượng hiện tại, tính bằng kg |
| `currentVolumeM3` | Tổng thể tích hiện tại, tính bằng m³ |
| `maxWeightKg` | Giới hạn khối lượng cấu hình; `null` hoặc `<= 0` là không giới hạn |
| `maxVolumeM3` | Giới hạn thể tích cấu hình; `null` hoặc `<= 0` là không giới hạn |
| `remainingWeightKg` | `maxWeightKg - currentWeightKg`; `null` khi không giới hạn |
| `remainingVolumeM3` | `maxVolumeM3 - currentVolumeM3`; `null` khi không giới hạn |
| `weightUtilizationPercent` | `(currentWeightKg / maxWeightKg) × 100`, làm tròn 2 chữ số; `null` khi không giới hạn |
| `volumeUtilizationPercent` | `(currentVolumeM3 / maxVolumeM3) × 100`, làm tròn 2 chữ số; `null` khi không giới hạn |
| `capacityStatus` | Một trong `EMPTY`, `AVAILABLE`, `FULL`, `OVER_CAPACITY` |
| `storedSkus` | Danh sách SKU đã được gộp theo `skuId` trong rack/bin đó |

### Trường của `storedSkus`

- `quantity`: số lượng theo UOM của SKU; đây không phải kg.
- `weightKg`: `quantity × unitWeightKg` của SKU.
- `volumeM3`: `quantity × unitVolumeM3` của SKU.
- `weightKg` và `volumeM3` là số liệu backend đã tính; FE không tự suy ra từ tên UOM hoặc tự nhân lại.

## 4. Ý nghĩa trạng thái

| Status | Ý nghĩa hiển thị |
|---|---|
| `EMPTY` | Không có tải hợp lệ trong rack/bin |
| `AVAILABLE` | Có tải và chưa chạm giới hạn hữu hạn nào |
| `FULL` | Đã đạt 100% ít nhất một giới hạn hữu hạn |
| `OVER_CAPACITY` | Đã vượt ít nhất một giới hạn; nên hiển thị cảnh báo dữ liệu cần kiểm tra |

Với giới hạn không tồn tại (`null` hoặc `<= 0`), FE hiển thị `Unlimited`. Không chuyển `null` thành `0`, `Infinity` hoặc `NaN`.

## 5. Cách ghép với màn hình 3D

1. Khi người dùng chọn warehouse, gọi API capacity với đúng `warehouseId` đó.
2. Dùng `rackId` để ghép metric vào rack và `binId` để ghép metric vào bin.
3. Không ghép theo `name` hoặc `code` vì các giá trị này không phải khóa định danh ổn định.
4. Layout/3D geometry vẫn lấy từ API layout hiện có; API capacity chỉ bổ sung metric và `storedSkus`.
5. Nếu layout có phần tử chưa có metric, hiển thị trạng thái mặc định phù hợp của FE, không tự tạo số liệu.

## 6. Khi nào cần gọi lại API

- Gọi lại khi đổi warehouse.
- Gọi lại sau khi một inbound receipt được approve thành công.
- Gọi lại sau thao tác stock làm thay đổi quantity hoặc vị trí.
- Receipt bị reject không làm thay đổi stock/capacity; FE không cần cộng trừ thủ công.
- Khi người dùng chỉnh layout, reload layout tree theo flow hiện tại; capacity metrics chỉ thay đổi khi stock thực tế thay đổi.

Không cache lâu hơn vòng đời của màn hình nếu màn hình có thao tác inbound/outbound/stock adjustment. Không cập nhật optimistic `currentWeightKg` hoặc `currentVolumeM3` ở FE.

## 7. Lỗi cần xử lý

| HTTP | Cách xử lý đề xuất |
|---|---|
| `401` | Token hết hạn/chưa đăng nhập; xử lý theo auth flow hiện tại |
| `403` | Contract không `ACTIVE`, staff không được assign vào warehouse, hoặc thiếu permission |
| `404` | Warehouse/layout không tồn tại hoặc không còn active |
| `5xx` | Hiển thị lỗi tải dữ liệu và cho phép retry |

Error response vẫn theo envelope `ApiResponse`, có thể gồm `success: false`, `code` và `message`.

## 8. Phạm vi không có trong API này

- Không có API mutation riêng cho capacity.
- Không tự động chọn bin hoặc mô phỏng cách xếp hàng 3D.
- Không thay đổi UOM của product SKU.
- Không có field persisted `currentWeight`/`currentVolume`; metric được tính từ stock batch đang active.
- Không giới hạn `quantity` theo UOM chỉ vì FE đang hiển thị kg/m³; giới hạn vật lý dùng metadata `unitWeightKg` và `unitVolumeM3` của SKU.

