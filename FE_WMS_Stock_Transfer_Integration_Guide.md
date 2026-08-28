# FE Integration Guide — WMS Stock Transfer MVP

Tài liệu này mô tả contract backend hiện tại cho use case chuyển tồn kho giữa hai warehouse của cùng một Tenant.

Phạm vi MVP:

```text
PENDING → IN_TRANSIT → COMPLETED
       ↘ REJECTED
       ↘ CANCELLED
```

- Khi tạo `PENDING`: chưa thay đổi tồn kho.
- Khi approve dispatch: trừ tồn kho nguồn và ghi outbound receipt/transaction; transfer thành `IN_TRANSIT`.
- Khi receive: chọn rack/bin đích, kiểm tra capacity, cộng tồn kho đích và ghi inbound receipt/transaction; transfer thành `COMPLETED`.
- Không map rack/bin nguồn sang rack/bin đích theo `code` hoặc `name`.
- `IN_TRANSIT` không có thao tác cancel trong MVP.

## 1. Quyền và điều kiện chung

| Actor | Create/list/detail | Approve dispatch | Receive | Reject/cancel `PENDING` |
|---|---:|---:|---:|---:|
| Tenant | Có | Có | Có | Có |
| Staff | Có nếu được assign cả hai warehouse | Không | Không | Không |

Điều kiện backend kiểm tra lại ở các mutation:

- Tenant có Contract `ACTIVE` với cả warehouse nguồn và đích.
- Tenant có Subscription `ACTIVE`.
- Staff khi create phải có assignment `ACTIVE` tại cả warehouse nguồn và đích.
- SKU phải là SKU do chính Tenant sở hữu, đang active và chưa bị xóa.
- Warehouse nguồn và đích phải khác nhau.
- Quantity phải là số nguyên dương.

FE vẫn phải gửi access token và permission hiện tại:

| API | Permission |
|---|---|
| Create | `INVENTORY_CREATE` |
| List/detail | `INVENTORY_READ` |
| Approve, receive, reject, cancel | `INVENTORY_UPDATE` |

## 2. API endpoints

Base path:

```text
/api/tenant/inventory/transfers
```

### 2.1 Create transfer — tạo `PENDING`

```http
POST /api/tenant/inventory/transfers
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request:

```json
{
  "sourceWarehouseId": "11111111-1111-1111-1111-111111111111",
  "destinationWarehouseId": "22222222-2222-2222-2222-222222222222",
  "note": "Move stock to the second warehouse",
  "items": [
    {
      "skuId": "33333333-3333-3333-3333-333333333333",
      "requestedQuantity": 15,
      "sourceAllocations": [
        {
          "sourceStockBatchId": "44444444-4444-4444-4444-444444444444",
          "sourceRackId": "55555555-5555-5555-5555-555555555555",
          "sourceBinId": "66666666-6666-6666-6666-666666666666",
          "quantity": 15
        }
      ]
    }
  ]
}
```

Rules for `items`:

- Mỗi SKU chỉ xuất hiện một lần trong một transfer.
- `requestedQuantity` phải bằng tổng `sourceAllocations[].quantity` của SKU đó.
- Một source stock batch không được lặp lại trong cùng SKU.
- Source batch phải thực sự thuộc warehouse nguồn, đúng SKU, đúng rack/bin và còn đủ quantity tại thời điểm tạo.
- Việc create chưa trừ stock. Backend sẽ lock và kiểm tra lại source batch khi approve.

Response thành công dùng envelope chung:

```json
{
  "success": true,
  "message": "Tạo yêu cầu chuyển kho thành công",
  "data": {
    "id": "77777777-7777-7777-7777-777777777777",
    "status": "PENDING",
    "sourceWarehouse": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Warehouse A"
    },
    "destinationWarehouse": {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Warehouse B"
    },
    "note": "Move stock to the second warehouse",
    "items": [
      {
        "id": "88888888-8888-8888-8888-888888888888",
        "skuId": "33333333-3333-3333-3333-333333333333",
        "skuCode": "SKU-001",
        "skuName": "Product A",
        "requestedQuantity": 15,
        "sourceAllocations": [
          {
            "id": "99999999-9999-9999-9999-999999999999",
            "sourceStockBatchId": "44444444-4444-4444-4444-444444444444",
            "sourceRackId": "55555555-5555-5555-5555-555555555555",
            "sourceRackName": "Rack A",
            "sourceBinId": "66666666-6666-6666-6666-666666666666",
            "sourceBinName": "Bin A1",
            "quantity": 15
          }
        ],
        "destinationAllocations": []
      }
    ],
    "createdBy": {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "fullName": "Tenant User"
    },
    "approvedBy": null,
    "receivedBy": null,
    "rejectedBy": null,
    "cancelledBy": null,
    "decisionReason": null,
    "createdAt": "2026-08-27T10:00:00",
    "updatedAt": "2026-08-27T10:00:00",
    "approvedAt": null,
    "receivedAt": null,
    "rejectedAt": null,
    "cancelledAt": null,
    "outboundReceiptId": null,
    "inboundReceiptId": null
  }
}
```

### 2.2 List transfers

```http
GET /api/tenant/inventory/transfers
  ?sourceWarehouseId=<uuid>
  &destinationWarehouseId=<uuid>
  &status=PENDING
  &page=0
  &size=10
Authorization: Bearer <access-token>
```

Tất cả query parameters đều optional. `page` bắt đầu từ `0`; default `page=0`, `size=10`.

Response `data` là `PagedResponse<StockTransferResponse>`:

```json
{
  "success": true,
  "message": "Lấy danh sách yêu cầu chuyển kho thành công",
  "data": {
    "content": [],
    "page": 0,
    "size": 10,
    "totalElements": 0,
    "totalPages": 0,
    "last": true
  }
}
```

Giá trị `status` hợp lệ:

```text
PENDING | IN_TRANSIT | COMPLETED | REJECTED | CANCELLED
```

List của Staff chỉ trả transfer mà Staff có assignment `ACTIVE` ở cả warehouse nguồn và đích. Backend luôn giới hạn theo Tenant hiện tại.

### 2.3 Detail transfer

```http
GET /api/tenant/inventory/transfers/{transferId}
Authorization: Bearer <access-token>
```

Response `data` có cùng shape với response create. Sau khi receive thành công, `items[].destinationAllocations` được trả về và `inboundReceiptId` khác `null`.

### 2.4 Approve dispatch — `PENDING` → `IN_TRANSIT`

```http
PATCH /api/tenant/inventory/transfers/{transferId}/approve-dispatch
Authorization: Bearer <access-token>
```

Không có request body.

Backend thực hiện trong một transaction:

1. Lock transfer.
2. Kiểm tra transfer vẫn là `PENDING`.
3. Lock source stock batches theo thứ tự ổn định.
4. Kiểm tra lại warehouse, SKU, rack/bin và quantity.
5. Trừ source stock.
6. Tạo `OUTBOUND` receipt `APPROVED` và các negative inventory transactions, liên kết bằng `referenceId = transferId`.
7. Chuyển status thành `IN_TRANSIT`.

FE không tự trừ quantity và không tự gọi outbound receipt API. Sau success, reload detail/list hoặc cập nhật theo response trả về.

### 2.5 Receive — `IN_TRANSIT` → `COMPLETED`

```http
POST /api/tenant/inventory/transfers/{transferId}/receive
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request:

```json
{
  "destinationAllocations": [
    {
      "itemId": "88888888-8888-8888-8888-888888888888",
      "destinationRackId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "destinationBinId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "quantity": 15
    }
  ]
}
```

Lưu ý:

- `itemId` là ID trong `data.items[].id`, không phải `skuId`.
- Destination rack/bin phải được chọn từ layout snapshot của Tenant tại warehouse đích.
- Tổng quantity phân bổ đích của mỗi item phải đúng bằng `requestedQuantity`.
- Cùng một item không được lặp cùng một rack/bin.
- Rack/bin đích không cần có cùng code/name với vị trí nguồn.
- FE không tự cộng stock và không tự gọi inbound receipt API.

Backend lock destination rack/bin, dùng capacity calculator chung, upsert stock batch theo `(sku, destination warehouse, rack, bin)`, tạo `INBOUND` receipt `APPROVED` và positive inventory transactions, sau đó chuyển status thành `COMPLETED`.

Nếu receive retry sau khi đã `COMPLETED`, API trả `409`; FE chỉ cần reload detail để lấy kết quả đã hoàn tất, không gửi lại các receipt/stock API riêng.

### 2.6 Reject `PENDING`

```http
PATCH /api/tenant/inventory/transfers/{transferId}/reject
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request:

```json
{
  "reason": "Source stock is no longer required"
}
```

Chỉ `PENDING` mới reject được. Backend lưu `decisionReason`, `rejectedBy`, `rejectedAt`, chuyển status thành `REJECTED` và không thay đổi stock/receipt.

### 2.7 Cancel `PENDING`

```http
PATCH /api/tenant/inventory/transfers/{transferId}/cancel
Authorization: Bearer <access-token>
Content-Type: application/json
```

Request có cùng shape với reject:

```json
{
  "reason": "Created in error"
}
```

Chỉ `PENDING` mới cancel được. Backend lưu `decisionReason`, `cancelledBy`, `cancelledAt`, chuyển status thành `CANCELLED` và không thay đổi stock/receipt.

## 3. Response model

### `StockTransferResponse`

| Field | Ý nghĩa |
|---|---|
| `id` | ID của transfer |
| `status` | Trạng thái hiện tại |
| `sourceWarehouse` | `{ id, name }` của kho nguồn |
| `destinationWarehouse` | `{ id, name }` của kho đích |
| `note` | Ghi chú khi tạo |
| `items` | Danh sách SKU cần chuyển |
| `createdBy` | Actor tạo transfer |
| `approvedBy` | Actor approve dispatch, có thể `null` |
| `receivedBy` | Actor receive, có thể `null` |
| `rejectedBy` | Actor reject, có thể `null` |
| `cancelledBy` | Actor cancel, có thể `null` |
| `decisionReason` | Reason reject/cancel, có thể `null` |
| `createdAt`, `updatedAt` | Timestamp record |
| `approvedAt` | Timestamp dispatch, có thể `null` |
| `receivedAt` | Timestamp receive, có thể `null` |
| `rejectedAt` | Timestamp reject, có thể `null` |
| `cancelledAt` | Timestamp cancel, có thể `null` |
| `outboundReceiptId` | Receipt sinh khi dispatch, có thể `null` |
| `inboundReceiptId` | Receipt sinh khi receive, có thể `null` |

### `StockTransferItemResponse`

```json
{
  "id": "transfer-item-uuid",
  "skuId": "sku-uuid",
  "skuCode": "SKU-001",
  "skuName": "Product A",
  "requestedQuantity": 15,
  "sourceAllocations": [],
  "destinationAllocations": []
}
```

Quantity luôn là số lượng theo UOM của SKU. Không tự hiểu quantity là kg; capacity backend dùng metadata vật lý của SKU khi rack/bin có giới hạn.

## 4. Error handling

Envelope lỗi có dạng:

```json
{
  "success": false,
  "code": "STOCK_TRANSFER_INVALID_STATUS",
  "message": "..."
}
```

FE nên xử lý tối thiểu:

| HTTP | Code thường gặp | Cách xử lý |
|---:|---|---|
| `400` | `STOCK_TRANSFER_SOURCE_DESTINATION_SAME`, `STOCK_TRANSFER_INVALID_ALLOCATION`, `STOCK_TRANSFER_DECISION_REASON_REQUIRED` | Hiển thị lỗi input; không tự retry mutation |
| `403` | `FORBIDDEN` | Ẩn/disable action theo role, contract, subscription hoặc staff assignment |
| `404` | `STOCK_TRANSFER_NOT_FOUND`, `WAREHOUSE_NOT_FOUND`, `LAYOUT_NOT_FOUND`, `RACK_NOT_FOUND`, `WAREHOUSE_BIN_NOT_FOUND`, `SKU_NOT_FOUND` | Reload scope hiện tại; báo resource không còn khả dụng |
| `409` | `STOCK_TRANSFER_INVALID_STATUS` | Có request khác đã xử lý; gọi lại detail/list và cập nhật UI |
| `5xx` | — | Hiển thị lỗi hệ thống và cho phép retry an toàn sau khi reload |

Các trường hợp có thể trả `400` ở receive:

- Destination allocation không đủ hoặc vượt requested quantity.
- Rack/bin không thuộc tenant layout của warehouse đích.
- Physical capacity của rack/bin bị vượt.
- SKU thiếu metadata `unitWeightKg` hoặc `unitVolumeM3` trong trường hợp capacity tương ứng đang bị giới hạn.

## 5. FE workflow đề xuất

### Create

1. Load các warehouse mà Tenant đang có quyền thao tác.
2. User chọn source và destination khác nhau.
3. Load stock batches của source warehouse và chọn source allocations.
4. Gửi create request.
5. Hiển thị transfer ở `PENDING`; không cập nhật stock local bằng phép trừ.

### Dispatch

1. Chỉ hiển thị nút cho Tenant khi status là `PENDING`.
2. Gọi approve dispatch không body.
3. Nếu success, dùng response hoặc reload detail; source stock đã được backend trừ.
4. Nếu `409`, reload vì transfer đã có thể được xử lý bởi request khác.

### Receive

1. Chỉ hiển thị nút cho Tenant khi status là `IN_TRANSIT`.
2. Load layout của warehouse đích bằng API layout hiện có trong scope Tenant.
3. Chọn destination rack/bin từ IDs của layout đó.
4. Phân bổ đủ quantity cho từng `itemId`.
5. Gọi receive một lần; không gọi trực tiếp receipt API.
6. Nếu success, reload inventory/capacity của warehouse đích và reload transfer detail.

### Reject/cancel

1. Chỉ hiển thị khi status là `PENDING`.
2. Bắt buộc nhập reason.
3. Gọi đúng endpoint reject hoặc cancel.
4. Sau success, disable toàn bộ mutation action của transfer.

## 6. Không làm ở FE

- Không tự tạo bảng hoặc field `transferId` trong stock batch.
- Không tự map source bin sang destination bin theo code/name.
- Không tự gọi hai receipt API để mô phỏng transfer.
- Không tự cộng/trừ quantity sau khi API đã thành công.
- Không cho Staff approve dispatch/receive/reject/cancel chỉ vì Staff nhìn thấy transfer.
- Không cho retry mutation mù khi nhận `409`; reload trạng thái trước.

## 7. Migration và rollback notes

- Migration backend: `ops/migrations/20260827_01_add_stock_transfer_tables.sql`.
- Migration tạo các bảng transfer/items/source allocations/destination allocations; không thêm field transfer vào `stock_batches`.
- Pipeline phải chạy migration qua migration runner hiện tại trước khi bật FE transfer UI.
- Migration dùng `IF NOT EXISTS` cho extension, tables và indexes để lần chạy lại không tạo trùng cấu trúc.
- Không sửa nội dung migration đã chạy trên môi trường dùng chung. Nếu cần thay đổi schema sau này, tạo migration version mới.
- Không rollback bằng cách xóa bảng sau khi đã có transfer data hoặc receipt/transaction liên kết. Rollback production phải theo quy trình backup và migration riêng do BE/DevOps kiểm soát.
