# FE Integration Guide — Tenant Layout Customization

## Mục tiêu

Tenant có thể tùy chỉnh rack/bin trong layout snapshot riêng của mình sau khi
có đủ quyền WMS. Kích thước tổng layout (`width`, `length`, `height`) là bất
biến với Tenant.

Backend endpoint hiện tại là bulk replacement; không tạo CRUD endpoint riêng
cho rack/bin.

## Quyền truy cập

| Actor | GET tenant layout | PUT tenant layout |
|---|---:|---:|
| Tenant có Contract ACTIVE, chưa có Subscription ACTIVE | Có | Không |
| Tenant có Contract ACTIVE + Subscription ACTIVE | Có | Có |
| Staff assignment ACTIVE | Không dùng Tenant endpoint | Không đổi layout trong scope này |
| Tenant hết Contract hoặc Subscription | Bị từ chối theo access policy | Bị từ chối |

GET chỉ đọc cần Contract ACTIVE. PUT cần thêm Subscription ACTIVE. Frontend
không nên tự suy luận quyền chỉ từ role; xử lý `403` từ backend là nguồn
chính xác.

## API

### Get layout

```http
GET /api/tenant/warehouses/{warehouseId}/layout
```

Response nằm trong wrapper `ApiResponse<WarehouseLayoutResponse>`. Layout tree
gồm `id`, `warehouseId`, `tenantId`, `isDefault`, `width`, `length`, `height`,
`racks`, `positions` và các summary count. Mỗi rack/bin có geometry, code,
capacity và occupied information theo DTO hiện tại.

### Save layout

```http
PUT /api/tenant/warehouses/{warehouseId}/layout
Content-Type: application/json
```

Request phải gửi dimensions đúng bằng giá trị GET được từ tenant snapshot:

```json
{
  "width": 100.0,
  "length": 80.0,
  "height": 10.0,
  "positions": ["0:0", "1:0"],
  "racks": [
    {
      "id": "existing-rack-uuid",
      "name": "Rack A1",
      "code": "R-A1",
      "maxWeight": 500,
      "maxVolume": 200,
      "coordinateX": 0,
      "coordinateY": 0,
      "positionZ": 0,
      "rotation": 0,
      "width": 10,
      "length": 5,
      "height": 4,
      "bins": [
        {
          "id": "existing-bin-uuid",
          "shelfLevel": 1,
          "name": "Bin A1-1",
          "code": "B-A1-1",
          "maxWeight": 50,
          "maxVolume": 20,
          "coordinateX": 0,
          "coordinateY": 0,
          "positionZ": 0,
          "width": 2,
          "length": 2,
          "height": 1
        }
      ]
    },
    {
      "name": "New Rack",
      "code": "R-NEW",
      "maxWeight": 500,
      "maxVolume": 200,
      "coordinateX": 20,
      "coordinateY": 0,
      "positionZ": 0,
      "rotation": 0,
      "width": 10,
      "length": 5,
      "height": 4,
      "bins": []
    }
  ]
}
```

## Bulk replacement rules

- Existing rack/bin giữ lại khi request gửi đúng `id` trong layout snapshot.
- Rack/bin không có `id` là phần tử mới.
- Rack/bin cũ bị bỏ khỏi request sẽ bị xóa khỏi layout nếu không còn stock
  dương.
- Không gửi ID thuộc default layout, Tenant khác hoặc rack khác; backend trả
  lỗi scope.
- Bin hiện có phải nằm đúng rack cha trong request khi Tenant cập nhật.
- `code` rack unique trong cùng layout; `code` bin unique trong cùng rack.
- Có thể đổi name/code/capacity/geometry nội thất trong snapshot; vẫn phải
  qua validation geometry, rotation, overlap và capacity.

## Validation cần xử lý ở UI

- Dimensions tổng: giữ read-only và gửi lại đúng số đã GET.
- `coordinateX`, `coordinateY`, `positionZ` không âm.
- width/length/height của rack/bin phải dương.
- rotation chỉ nhận `0`, `90`, `180`, `270`.
- Rack phải nằm trong layout; bin phải nằm trong rack cha sau rotation.
- Không để rack overlap rack khác hoặc bin overlap bin khác.
- `maxWeight` và `maxVolume` không âm; `maxVolume` không vượt geometric
  volume khi lớn hơn 0.

Backend vẫn validate lại toàn bộ; UI validation chỉ giúp phản hồi sớm, không
được coi là cơ chế bảo mật.

## Error handling

- `400`: payload/geometry/code/dimensions/stock rule không hợp lệ.
- `403`: thiếu quyền Contract/Subscription/actor.
- `404`: warehouse hoặc layout không tồn tại trong scope.
- `409`: chỉ xử lý nếu backend trả conflict do concurrent update ở version sau.

Khi save lỗi, giữ dữ liệu form local để người dùng sửa; không tự retry PUT
nhiều lần với cùng payload nếu lỗi là validation hoặc permission. Sau save
thành công, dùng response trả về hoặc gọi GET lại để đồng bộ tree.

## Flow đề nghị cho FE

1. Chọn warehouse.
2. GET tenant layout.
3. Nếu chỉ quan sát, render read-only.
4. Nếu được phép WMS, cho chỉnh rack/bin và khóa dimensions tổng.
5. Gửi toàn bộ tree hiện tại bằng PUT.
6. Hiển thị lỗi tại node tương ứng nếu có thể; không nuốt message backend.
7. Save thành công thì cập nhật từ response/GET, sau đó refresh capacity nếu
   màn hình capacity đã tích hợp.

## Không được làm

- Không gọi Owner layout endpoint để chỉnh layout Tenant.
- Không tự đổi dimensions tổng để “fit” rack/bin.
- Không map bin theo code nếu đã có `id`.
- Không giả lập quyền edit chỉ vì user có role Tenant.
- Không coi layout mặc định của Owner là layout vận hành của Tenant.
