# StockSpace — Frontend Integration Guide for the Review 3 Rental Refactor

> Tài liệu bàn giao dành cho Frontend. Mục tiêu là để developer hoặc AI agent có thể tích hợp đúng backend hiện tại mà không phải suy đoán nghiệp vụ.

## 1. Phạm vi và nguồn sự thật

- Backend đã đối chiếu: nhánh `dev`, commit hiện tại `20d598a`.
- Mốc hoàn tất code và kiểm thử API: `59c201c`.
- Kết quả quality gate backend: **347 tests, 0 failures, 0 errors, 2 skipped**.
- Swagger JSON: `GET /v3/api-docs`.
- Swagger UI: `/swagger-ui/index.html`.
- Mọi endpoint trong tài liệu đều tính từ base URL đã cấu hình trong `src/services/apiConfig.js`; không nối thêm `/api` nếu `baseURL` hiện tại đã chứa `/api`.
- Khi tài liệu, Swagger của môi trường deploy và response thực tế khác nhau, ưu tiên Swagger/response của đúng backend đang deploy và báo lại BE.

## 2. Những thay đổi bắt buộc FE phải hiểu

### 2.1 Luồng thuê mới

```text
Guest xem bài đăng kho
→ đăng nhập để xem số điện thoại Owner
→ hai bên trao đổi và ký hợp đồng giấy ngoài hệ thống
→ Owner upload hợp đồng giấy
→ Owner preview và tạo digital contract DRAFT
→ Owner thiết lập layout phần diện tích thuê
→ Owner submit
→ Tenant xem hợp đồng + layout
→ Tenant confirm / request changes / reject
→ confirm thành công: Contract ACTIVE
```

Không còn Booking, tiền cọc thuê kho, handover, cancellation hay Dispute trong luồng mới.

### 2.2 Ba loại tiền/gói hoàn toàn khác nhau

| Khái niệm | Người trả | Mục đích |
|---|---|---|
| Listing package | Owner | Mua thời gian hiển thị bài đăng kho công khai |
| Rental price | Hai bên thỏa thuận | Giá thuê cuối cùng được đóng băng trong Contract; hệ thống không thu tiền thuê |
| Service subscription | Tenant | Mở quyền thao tác WMS sau khi Contract đã `ACTIVE` |

Không dùng service package để đăng bài, không dùng listing package để mở WMS, và không tạo giao dịch thanh toán tiền thuê/cọc.

### 2.3 Quyền sau khi hợp đồng ACTIVE

- `ACTIVE Contract`: Tenant được quan sát kho, layout và tồn kho thuộc hợp đồng.
- `ACTIVE Contract` + `ACTIVE Subscription`: Tenant mới được thay đổi layout/WMS, tạo SKU, receipt, audit và gán staff.
- FE phải dùng các cờ `can*` do Contract API trả về; không tự tái tạo toàn bộ rule từ `status`.

## 3. Chuẩn request/response chung

### 3.1 Authentication

- API public không cần access token.
- API xem contact, Contract, Owner, Tenant, WMS và upload cần `Authorization: Bearer <accessToken>` theo interceptor hiện tại.
- Nếu `401`, chuyển sang login hoặc thực hiện refresh-token theo cơ chế hiện có.
- Nếu `403`, không giả định là lỗi đăng nhập; có thể thiếu role, permission, active contract hoặc active subscription.

### 3.2 Success envelope

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Danh sách phân trang nằm trong `data`:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 0,
  "last": true
}
```

### 3.3 Error envelope

```json
{
  "success": false,
  "code": "CONTRACT_DATE_OVERLAP",
  "message": "The tenant already has an overlapping contract for this warehouse"
}
```

Một số lỗi validation cũ chỉ có `message`, không có `code`. FE xử lý theo thứ tự:

1. Dùng `code` để map UX nếu có.
2. Hiển thị `message` từ BE.
3. Nếu cả hai không có, dùng fallback message của FE.

### 3.4 Kiểu dữ liệu

- UUID là chuỗi.
- Ngày hợp đồng là `YYYY-MM-DD`; `endDate` có tính cả ngày kết thúc.
- Timestamp là ISO-8601 từ server.
- Tiền và kích thước là decimal. Không làm tròn trước khi gửi; khi hiển thị tiền dùng định dạng VND.
- Kích thước layout/hợp đồng dùng **mét**, diện tích dùng **m²**, thể tích dùng **m³**, khối lượng dùng **kg**.

## 4. Warehouse discovery và contact Owner

### 4.1 Danh sách kho công khai

`GET /warehouses`

Query được hỗ trợ:

| Query | Ý nghĩa |
|---|---|
| `keyword` | Tìm theo nội dung kho; tối đa 200 ký tự |
| `minRentalPrice`, `maxRentalPrice` | Khoảng giá thuê |
| `minCapacity` | Sức chứa tối thiểu |
| `page`, `size` | Mặc định `0`, `10`; size tối đa 100 |
| `sortBy`, `sortDir` | Mặc định `createdAt`, `desc` |

`minPrice` và `maxPrice` còn được BE nhận để tương thích nhưng đã deprecated. FE phải chuyển sang `minRentalPrice` và `maxRentalPrice`. Không gửi `status`, `isVerified`: public API tự chỉ trả kho đã duyệt, `AVAILABLE`, đang active và còn thời hạn đăng.

### 4.2 Chi tiết và layout public

- `GET /warehouses/{warehouseId}`
- `GET /warehouses/{warehouseId}/layout`
- `GET /warehouses/types`

`WarehouseResponse` có các field chính:

```json
{
  "id": "uuid",
  "name": "Kho Thủ Đức",
  "address": "...",
  "description": "...",
  "capacity": 1000,
  "rentalPrice": 200000,
  "rentalPricingType": "PER_SQUARE_METER_MONTHLY",
  "status": "AVAILABLE",
  "verified": true,
  "ownerId": "uuid",
  "ownerName": "Owner name",
  "publishedAt": "2026-08-01T00:00:00",
  "visibleUntil": "2026-08-31T00:00:00",
  "publicationStatus": "PUBLISHED",
  "canPublish": false,
  "canRenew": true
}
```

Giá trị hợp lệ:

- `rentalPricingType`: `FIXED_MONTHLY`, `PER_SQUARE_METER_MONTHLY`, `NEGOTIATED`.
- `status`: `AVAILABLE`, `PENDING_APPROVAL`, `INACTIVE`. **Không còn `RENTED`.**
- `publicationStatus`: `DRAFT`, `PUBLISHED`, `EXPIRED`.

Lưu ý: với DTO boolean có tiền tố `is...`, key JSON do Jackson/OpenAPI của môi trường có thể hiển thị là `verified`/`active`. FE phải kiểm tra `/v3/api-docs`, không hardcode dựa vào tên field Java `isVerified`/`isActive`.

### 4.3 Xem số điện thoại Owner

`GET /warehouses/{warehouseId}/owner-contact` — yêu cầu đăng nhập.

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "warehouseId": "uuid",
    "ownerId": "uuid",
    "ownerName": "Nguyen Van A",
    "phone": "0901234567"
  }
}
```

UX đề xuất:

- Guest bấm “Liên hệ Owner” → mở login.
- User đã đăng nhập → gọi contact API, hiển thị tên và số điện thoại.
- Không đưa số điện thoại vào response public hoặc cache công khai.
- Thay toàn bộ CTA “Book now/Instant booking/Đặt cọc” bằng “Liên hệ Owner”.

## 5. Owner warehouse và đăng bài

### 5.1 Tạo/cập nhật kho

- `POST /owner/warehouses` — `multipart/form-data`.
- `GET /owner/warehouses?page=0&size=10&sortBy=createdAt&sortDir=desc`.
- `PUT /owner/warehouses/{id}` — JSON cập nhật thông tin kho.
- `PATCH /owner/warehouses/{id}/status?status=AVAILABLE`.
- `DELETE /owner/warehouses/{id}`.
- `POST /owner/warehouses/{id}/images` — thêm ảnh, multipart.
- `PUT /owner/warehouses/{id}/images` — thay toàn bộ ảnh, multipart.

Tạo kho gửi part `request` là JSON và part `files` là danh sách file:

```js
const form = new FormData()
form.append('request', JSON.stringify({
  typeId,
  name,
  address,
  description,
  capacity,
  rentalPricingType: 'PER_SQUARE_METER_MONTHLY',
  rentalPrice: 200000
}))
files.forEach((file) => form.append('files', file))
await api.post('/owner/warehouses', form)
```

Rule giá:

- `FIXED_MONTHLY` và `PER_SQUARE_METER_MONTHLY`: `rentalPrice > 0`.
- `NEGOTIATED`: không gửi hoặc gửi `rentalPrice: null`.
- Tạo kho không còn trừ phí đăng bài.

Sửa service FE hiện tại:

```js
updateWarehouseInfo: (id, data) => api.put(`/owner/warehouses/${id}`, data),
updateWarehouseStatus: (id, status) =>
  api.patch(`/owner/warehouses/${id}/status`, null, { params: { status } }),
```

### 5.2 Listing package public

- `GET /listing-packages`.
- `GET /listing-packages/{packageId}`.

Chỉ package active được trả về. Response item:

```json
{
  "id": "uuid",
  "name": "30-day listing",
  "durationDays": 30,
  "price": 120000,
  "active": true
}
```

Không hardcode giá hoặc duration ở FE vì Admin có thể chỉnh package.

### 5.3 Owner mua/gia hạn đăng bài

`POST /owner/warehouses/{warehouseId}/publications`

```json
{
  "listingPackageId": "uuid"
}
```

Success `201`:

```json
{
  "success": true,
  "message": "Warehouse publication purchased successfully",
  "data": {
    "id": "uuid",
    "warehouseId": "uuid",
    "listingPackageId": "uuid",
    "listingPackageName": "30-day listing",
    "transactionId": "uuid",
    "durationDays": 30,
    "price": 120000,
    "periodStart": "2026-08-26T10:00:00",
    "periodEnd": "2026-09-25T10:00:00",
    "createdAt": "2026-08-26T10:00:00"
  }
}
```

`GET /owner/warehouses/{warehouseId}/publications` trả lịch sử mua.

Rule:

- Kho phải thuộc Owner, đã duyệt, active và không `INACTIVE`.
- Package phải active.
- BE trừ ví và ghi transaction `LISTING_FEE` atomically.
- Mua khi bài còn hạn sẽ nối tiếp từ `visibleUntil`; hết hạn/chưa đăng sẽ tính từ thời điểm mua.
- FE reload WarehouseResponse sau khi mua để cập nhật `publicationStatus`, `visibleUntil`, `canPublish`, `canRenew`.

### 5.4 Admin quản lý listing package

| Method | Endpoint | Body |
|---|---|---|
| GET | `/admin/listing-packages` | — |
| GET | `/admin/listing-packages/{id}` | — |
| POST | `/admin/listing-packages` | `{name,durationDays,price}` |
| PUT | `/admin/listing-packages/{id}` | Partial `{name,durationDays,price}` |
| DELETE | `/admin/listing-packages/{id}` | — |
| PATCH | `/admin/listing-packages/{id}/activate` | — |
| PATCH | `/admin/listing-packages/{id}/deactivate` | — |

Duration hợp lệ hiện tại chỉ là `10`, `15`, `30` ngày và không được trùng. Đây là màn quản lý riêng, không trộn với service subscription của Tenant.

## 6. Direct Rental Contract API

### 6.1 Contract status

```text
DRAFT
  └─ Owner submits → PENDING_TENANT_CONFIRM
       ├─ Tenant confirms → ACTIVE
       ├─ Tenant requests changes → CHANGES_REQUESTED
       │    └─ Owner edits and resubmits → PENDING_TENANT_CONFIRM
       └─ Tenant rejects → REJECTED

ACTIVE ─ contract reaches end date → EXPIRED
```

Chỉ dùng đúng sáu state:

`DRAFT`, `PENDING_TENANT_CONFIRM`, `CHANGES_REQUESTED`, `ACTIVE`, `REJECTED`, `EXPIRED`.

### 6.2 API dùng chung

- `GET /contracts?page=0&size=10` — danh sách hợp đồng của current Owner/Tenant.
- `GET /contracts/{contractId}` — chi tiết; chỉ participant được xem.

### 6.3 Request tạo/preview hợp đồng

```json
{
  "warehouseId": "uuid",
  "tenantEmail": "tenant@example.com",
  "startDate": "2026-09-01",
  "endDate": "2027-08-31",
  "leasedWidth": 10,
  "leasedLength": 8,
  "leasedHeight": 4,
  "negotiatedMonthlyRent": null,
  "ownerNote": "Điều khoản đã thống nhất ngoài hệ thống",
  "paperContractFiles": [
    "https://res.cloudinary.com/.../paper-contract-page-1.jpg"
  ]
}
```

Rule:

- `tenantEmail` phải là account active có role Tenant.
- Thời hạn tối thiểu 7 ngày, `endDate` tính inclusive.
- Kích thước > 0 và dùng mét.
- `negotiatedMonthlyRent` chỉ dùng khi kho là `NEGOTIATED`.
- File giấy có thể thiếu lúc mới lưu draft nhưng phải có ít nhất một URL hợp lệ trước khi submit.
- Không gửi `finalMonthlyRent`, `leasedAreaM2`, pricing snapshot, status hoặc action flags; BE tự tính.

### 6.4 Upload hợp đồng giấy

- `POST /upload/image`, multipart field `file` → `data` là một URL.
- `POST /upload/images`, multipart fields `files` → `data` là mảng URL.

FE upload trước, sau đó đưa URL vào `paperContractFiles`. Service `src/services/uploadApi.js` hiện tại có thể reuse.

### 6.5 API của Owner

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/owner/contracts/preview` | Tính giá/dimension/layout dự kiến, không ghi DB |
| POST | `/owner/contracts` | Tạo contract `DRAFT`; trả `201` |
| PUT | `/owner/contracts/{id}` | Sửa `DRAFT` hoặc `CHANGES_REQUESTED` |
| POST | `/owner/contracts/{id}/submit` | Gửi Tenant xác nhận |
| DELETE | `/owner/contracts/{id}` | Xóa mềm, chỉ `DRAFT` |
| GET | `/owner/contracts/{id}/layout` | Xem contract layout |
| PUT | `/owner/contracts/{id}/layout` | Sửa layout khi `DRAFT`/`CHANGES_REQUESTED` |

Request update giống create nhưng không có `warehouseId` và `tenantEmail`. Hai participant và warehouse không thể đổi sau khi tạo draft. Khi update gửi `paperContractFiles: null` thì giữ danh sách cũ; gửi mảng thì thay thế.

Quy tắc tính giá:

| Pricing type | Kích thước | Giá cuối |
|---|---|---|
| `FIXED_MONTHLY` | Phải bằng toàn bộ default layout | `rentalPriceSnapshot` |
| `PER_SQUARE_METER_MONTHLY` | Phần diện tích thuê hợp lệ | `rentalPriceSnapshot × leasedWidth × leasedLength` |
| `NEGOTIATED` | Phần diện tích thuê hợp lệ | `negotiatedMonthlyRent` Owner nhập |

BE đóng băng `pricingType`, `rentalPriceSnapshot` và `finalMonthlyRent` trong Contract. Thay giá bài đăng sau đó không làm đổi hợp đồng.

### 6.6 API của Tenant

| Method | Endpoint | Body |
|---|---|---|
| GET | `/tenant/contracts/{id}/layout` | — |
| POST | `/tenant/contracts/{id}/confirm` | — |
| POST | `/tenant/contracts/{id}/request-changes` | `{"reason":"..."}` |
| POST | `/tenant/contracts/{id}/reject` | `{"reason":"..."}` |

`reason` bắt buộc, không blank, tối đa 2000 ký tự. Ba action chỉ hợp lệ khi status là `PENDING_TENANT_CONFIRM`.

### 6.7 RentalContractResponse

```json
{
  "id": "uuid",
  "status": "PENDING_TENANT_CONFIRM",
  "startDate": "2026-09-01",
  "endDate": "2027-08-31",
  "paperContractFiles": ["https://..."],
  "tenantId": "uuid",
  "tenantName": "Tenant Company",
  "tenantEmail": "tenant@example.com",
  "warehouseId": "uuid",
  "warehouseName": "Kho Thủ Đức",
  "warehouseAddress": "...",
  "ownerId": "uuid",
  "ownerName": "Owner Name",
  "canEdit": false,
  "canDelete": false,
  "canSubmit": false,
  "canConfirm": true,
  "canRequestChanges": true,
  "canReject": true,
  "canViewLayout": true,
  "canManageWms": false,
  "pricingType": "PER_SQUARE_METER_MONTHLY",
  "rentalPriceSnapshot": 200000,
  "finalMonthlyRent": 16000000,
  "leasedWidth": 10,
  "leasedLength": 8,
  "leasedHeight": 4,
  "leasedAreaM2": 80,
  "ownerNote": "...",
  "layoutSnapshot": "{...}",
  "changeRequestReason": null,
  "rejectionReason": null,
  "confirmedAt": null,
  "createdAt": "2026-08-26T10:00:00",
  "updatedAt": "2026-08-26T10:00:00",
  "submittedAt": "2026-08-26T10:00:00"
}
```

`paperContractFiles` đã là mảng, không parse lần hai. `layoutSnapshot` là JSON string phục vụ snapshot/audit; để render layout nên gọi layout endpoint.

### 6.8 Render action đúng cách

```jsx
{contract.canEdit && <Button>Edit</Button>}
{contract.canDelete && <Button>Delete draft</Button>}
{contract.canSubmit && <Button>Send to tenant</Button>}
{contract.canConfirm && <Button>Confirm</Button>}
{contract.canRequestChanges && <Button>Request changes</Button>}
{contract.canReject && <Button danger>Reject</Button>}
{contract.canViewLayout && <Button>View layout</Button>}
{contract.canManageWms && <Button>Open WMS</Button>}
```

Sau mọi action, invalidate/refetch cả contract detail và contract list. Không tự sửa status optimistic nếu chưa nhận success từ BE.

### 6.9 Contract service FE đề xuất

```js
const contractApi = {
  getMyContracts: (params = {}) => api.get('/contracts', { params }),
  getById: (id) => api.get(`/contracts/${id}`),

  preview: (payload) => api.post('/owner/contracts/preview', payload),
  createDraft: (payload) => api.post('/owner/contracts', payload),
  updateDraft: (id, payload) => api.put(`/owner/contracts/${id}`, payload),
  submit: (id) => api.post(`/owner/contracts/${id}/submit`),
  deleteDraft: (id) => api.delete(`/owner/contracts/${id}`),
  getOwnerLayout: (id) => api.get(`/owner/contracts/${id}/layout`),
  saveOwnerLayout: (id, payload) => api.put(`/owner/contracts/${id}/layout`, payload),

  getTenantLayout: (id) => api.get(`/tenant/contracts/${id}/layout`),
  confirm: (id) => api.post(`/tenant/contracts/${id}/confirm`),
  requestChanges: (id, reason) =>
    api.post(`/tenant/contracts/${id}/request-changes`, { reason }),
  reject: (id, reason) => api.post(`/tenant/contracts/${id}/reject`, { reason }),
}
```

## 7. Contract layout

Payload `BulkLayoutSaveRequest`:

```json
{
  "width": 10,
  "length": 8,
  "height": 4,
  "racks": [
    {
      "id": null,
      "name": "Rack A",
      "code": "R-A",
      "maxWeight": 1000,
      "maxVolume": 20,
      "coordinateX": 0,
      "coordinateY": 0,
      "positionZ": 0,
      "rotation": 0,
      "width": 2,
      "length": 1,
      "height": 3,
      "bins": []
    }
  ],
  "positions": []
}
```

Quy tắc FE cần tuân thủ:

- Contract layout phải giữ chính xác `width`, `length`, `height` đã snapshot trong hợp đồng.
- Với full warehouse, draft clone default layout gồm rack/bin.
- Với partial area, tạo layout Tenant rỗng trong kích thước thuê.
- Owner hoàn thiện rack/bin trước khi submit.
- Tenant hiện không được thêm/xóa rack hoặc bin khỏi tenant layout; chỉ thao tác trong giới hạn BE cho phép. Không thiết kế UI vượt quá capability hiện tại.
- BE kiểm tra dimension, tọa độ, bounds, overlap, max weight/volume và bin còn hàng.
- Khi tạo rack/bin mới, `id` phải `null` hoặc bỏ field; update phải dùng UUID thật.

## 8. Hết hạn hợp đồng

Scheduler BE chạy hằng ngày theo thời gian **server**:

- Gửi email và in-app notification một lần khi còn đúng 30 ngày tới `endDate` cho Owner và Tenant.
- Vì `endDate` inclusive, contract chuyển `ACTIVE → EXPIRED` vào lần scheduler chạy sau khi ngày kết thúc đã qua.
- Xóa mềm stock vận hành, archive tenant layout và revoke staff assignment của kho.
- Giữ category, SKU và lịch sử nhập/xuất/audit.
- Nếu cùng Tenant và warehouse còn một contract `ACTIVE` khác hợp lệ, BE không cleanup tài nguyên dùng chung.

FE cần:

- Hiển thị `EXPIRED` theo response BE.
- Refetch contract khi mở trang và sau khi nhận notification.
- Không suy ra status bằng đồng hồ laptop; đổi giờ máy người dùng không làm scheduler server chạy.
- Không tự xóa dữ liệu UI vĩnh viễn; reload từ API sau expiry.
- Chưa có API renew/cancel contract. Không hiển thị nút này.

## 9. Tenant warehouse, subscription và WMS

### 9.1 Kho Tenant được quyền truy cập

`GET /tenant/warehouses/my-warehouses`

Chỉ dùng danh sách này cho selector kho hậu thuê; không dùng toàn bộ public warehouse list.

### 9.2 Inventory theo từng kho

- `GET /tenant/inventory/stock?warehouseId={id}&page=0&size=20`.
- `GET /tenant/inventory/stock/overview?warehouseId={id}&page=0&size=20`.
- `GET /tenant/inventory/stock/sku/{skuId}`.
- `GET /tenant/inventory/stock/summary?skuId={skuId}`.
- `GET /tenant/inventory/stock/{batchId}/transactions?page=0&size=20`.

Trang Inventory Management phải bắt buộc chọn một warehouse và gọi `overview` với `warehouseId`; không cộng SKU của tất cả kho. Khi cần popup “SKU này nằm ở đâu”, dùng `summary` để nhận `locations[]` gồm `warehouseId`, `warehouseName`, `rackName`, `binName`, `quantity`.

### 9.3 Catalog/SKU

- Category: `GET/POST /tenant/products/categories`, `DELETE /tenant/products/categories/{id}`.
- SKU: `GET/POST /tenant/products/skus`, `GET/PUT/DELETE /tenant/products/skus/{id}`.
- UOM: `GET /tenant/products/uoms?page=0&size=50`.

Create SKU:

```json
{
  "categoryId": "uuid",
  "skuCode": "SKU-001",
  "name": "Tủ lạnh 300L",
  "uomId": "uuid",
  "unitWeightKg": 55,
  "unitVolumeM3": 0.75,
  "specifications": {}
}
```

`unitWeightKg` và `unitVolumeM3` là tải vật lý cho **một đơn vị SKU**, bắt buộc > 0 để BE kiểm tra sức chứa rack/bin. UOM (`cái`, `thùng`, `kg`...) không thay thế hai trường vật lý này.

### 9.4 Receipt

- `POST /tenant/inventory/receipts`.
- `PATCH /tenant/inventory/receipts/{id}/approve`.
- `PATCH /tenant/inventory/receipts/{id}/reject`, body `{ "reason": "..." }`.
- `GET /tenant/inventory/receipts?warehouseId={id}&type=INBOUND&page=0&size=20`.
- `GET /tenant/inventory/receipts/{id}`.
- `GET /tenant/inventory/receipts/export?warehouseId={id}&type=INBOUND` trả file CSV trực tiếp, không phải ApiResponse JSON.

Create:

```json
{
  "warehouseId": "uuid",
  "type": "INBOUND",
  "signatureData": "...",
  "items": [
    {
      "skuId": "uuid",
      "quantity": 5,
      "rackId": "uuid",
      "binId": "uuid",
      "note": ""
    }
  ]
}
```

BE kiểm tra vị trí thuộc đúng warehouse và capacity theo `quantity × unitWeightKg/unitVolumeM3`.

### 9.5 Audit

- `POST /tenant/inventory/audits` với `{ "warehouseId": "uuid", "note": "..." }`.
- `GET /tenant/inventory/audits?warehouseId={id}&page=0&size=20`.
- `GET /tenant/inventory/audits/{id}`.
- `POST /tenant/inventory/audits/{id}/submit`.
- `PATCH /tenant/inventory/audits/{id}/approve`.
- `PATCH /tenant/inventory/audits/{id}/reject` với optional `{ "reason": "..." }`.

Audit state: `PENDING`, `SUBMITTED`, `APPROVED`, `REJECTED`.

### 9.6 Staff assignment

- `POST /tenant/staffs/invite`.
- `GET /tenant/staffs`.
- `DELETE /tenant/staffs/{memberId}`.
- `POST /tenant/staffs/{staffUserId}/warehouses`.
- `GET /tenant/staffs/{staffUserId}/warehouses`.
- `DELETE /tenant/staffs/assignments/{assignmentId}`.

Assign request:

```json
{
  "warehouseId": "uuid",
  "customTitle": "Warehouse operator",
  "notes": "Ca sáng"
}
```

Gán/revoke kho yêu cầu contract và subscription đang active. `maxStaff` của subscription vẫn được enforce khi invite/join; FE không coi `0` là unlimited nếu response package thực tế quy định giá trị khác.

## 10. API và UI đã bị loại bỏ

Xóa mọi call tới:

- `/tenant/bookings/**`, `/owner/bookings/**`.
- `/disputes/**`, `/admin/disputes/**`.
- `/contracts/{id}/confirm-handover`.
- `/contracts/{id}/submit-online`.
- `/contracts/{id}/tenant-confirm`.
- `/contracts/{id}/tenant-report-failed`.
- `/contracts/{id}/owner-cancel`.
- `/contracts/{id}/tenant-respond-cancel`.

Không dùng các state cũ: `UNDER_NEGOTIATION`, `PENDING_HANDOVER`, `PENDING_CANCEL`, `DISPUTED`, `CANCELLED`.

Không xóa nhầm:

- Wallet top-up/deposit là luồng nạp ví hợp lệ và vẫn dùng để Owner mua listing package hoặc Tenant mua subscription.
- Transaction type lịch sử liên quan deposit có thể còn trong database để đọc; chỉ không tạo rental deposit mới.

## 11. Audit trực tiếp FE hiện tại và danh sách file cần sửa

Đã đối chiếu FE `main` tại commit `cda9324`.

### 11.1 Ưu tiên P0 — build/integration phải sửa trước

- `src/services/contractApi.js`: thay toàn bộ action legacy bằng service ở mục 6.9.
- `src/services/warehouse/warehouseApi.js`:
  - `updateWarehouseInfo` phải gọi `/owner/warehouses/{id}`, không gọi layout.
  - status phải dùng `PATCH` + query param.
  - filter chuyển sang `minRentalPrice/maxRentalPrice`.
  - thêm owner-contact và listing publication APIs.
  - xóa booking methods.
- `src/features/warehouse/pages/WarehouseDetailPage.jsx`: bỏ booking/deposit; thay bằng CTA contact Owner.
- `src/features/owner/pages/OwnerContractsPage.jsx`: thay status/actions/form bằng direct contract flow.
- `src/features/tenant/pages/TenantContractsPage.jsx`: chỉ render confirm/request changes/reject/layout theo `can*`.
- `src/features/owner/pages/PostWarehouse.jsx`: thay `pricePerMonth` bằng `rentalPricingType` + `rentalPrice`; tách create warehouse khỏi mua listing.
- `src/App.jsx`, `src/config/navigation.js`, `src/components/SideBar.jsx`: bỏ route/menu Booking và Dispute; thêm/giữ Contract đúng role.

### 11.2 Ưu tiên P1 — xóa UI/state/service lỗi thời

- `src/features/tenant/pages/MyBookingsPage.jsx`.
- `src/features/warehouse/components/WarehouseBookingCard.jsx`.
- `src/features/warehouse/components/ConfirmDepositModal.jsx`.
- `src/store/tenantBookingSlice.js` và registration trong `src/store/index.js`.
- `src/services/disputeApi.js`.
- `src/features/dispute/**`.
- `src/store/adminDisputeManagement.js`.
- `src/features/admin/pages/DisputeManagementPage.jsx`.
- Booking approve/reject và `rented` widgets trong `src/features/owner/pages/OwnerDashboard.jsx`.
- `deposit_percentage` dành cho rental flow trong `src/features/admin/pages/SystemConfigueManagementPage.jsx`.

### 11.3 P2 — copy, dashboard và consistency

- `WarehouseCard.jsx`: đổi “Instant Booking” thành “Contact Owner”.
- `WarehouseListingPage.jsx` và landing pages: thay `pricePerMonth` bằng pricing type mới.
- `src/i18n/LanguageContext.jsx` và prompt/copy chatbot: bỏ nội dung booking, rental deposit, dispute.
- Notification components: map thêm `CONTRACT_SUBMITTED`, `CONTRACT_CONFIRMED`, `CONTRACT_CHANGES_REQUESTED`, `CONTRACT_REJECTED`, `CONTRACT_EXPIRY_REMINDER`, `CONTRACT_EXPIRED` nếu UI có deep-link.

Dashboard Owner không dùng `rentedWarehousesCount`. `GET /owner/stats/occupancy` trả DTO trực tiếp:

```json
{
  "totalWarehouses": 4,
  "warehousesWithActiveContracts": 2,
  "activeContractCount": 3,
  "activeTenantCount": 3,
  "occupancyRatePercentage": 50.0,
  "occupiedWarehouseNames": ["Warehouse A", "Warehouse B"]
}
```

Revenue DTO gồm `year`, `totalRevenue`, `listingFeeRevenue`, `servicePackageRevenue`, `monthlyRevenue`. Admin summary gồm `totalUsers`, `totalWarehouses`, `totalContracts`, `contractCountsByStatus`.

## 12. Error UX map

| Code/HTTP | FE nên làm gì |
|---|---|
| `400 INVALID_CONTRACT_STATUS` | Refetch contract, đóng action modal và thông báo trạng thái đã đổi |
| `409 CONTRACT_DATE_OVERLAP` | Đánh dấu `startDate/endDate`; yêu cầu Owner chọn kỳ khác |
| `400 INVALID_LEASE_DIMENSIONS` | Đánh dấu dimension; không tự clamp âm thầm |
| `404 CONTRACT_NOT_FOUND` | Về danh sách hoặc màn Not Found |
| `403 WAREHOUSE_NOT_OWNED` | Chặn action, không retry |
| `400 LISTING_PACKAGE_INACTIVE` | Reload package list và yêu cầu chọn package khác |
| `400 SUBSCRIPTION_REQUIRED` | Hiển thị CTA mua/gia hạn service subscription |
| `400 STAFF_LIMIT_EXCEEDED` | Hiển thị giới hạn staff hiện tại, không hiểu là unlimited |
| `400 WAREHOUSE_BIN_NOT_EMPTY` | Không cho xóa bin, hướng dẫn chuyển tồn trước |
| `401 UNAUTHENTICATED` | Login/refresh token |
| `403 FORBIDDEN` | Hiển thị không đủ quyền; không đổi thành lỗi hệ thống |

Không dựa duy nhất vào HTTP status; ưu tiên `response.data.code` và `response.data.message`.

## 13. Thứ tự triển khai FE đề xuất

- [ ] Tạo/update TypeScript types hoặc schema cho Warehouse, ListingPackage, ListingOrder và RentalContractResponse.
- [ ] Refactor `contractApi.js` và viết unit test URL/method/body.
- [ ] Sửa `warehouseApi.js`, thêm contact + publication API.
- [ ] Làm detail warehouse với contact Owner; xóa booking/deposit CTA.
- [ ] Làm Owner contract wizard: preview → draft → layout → submit.
- [ ] Làm Tenant contract review theo `can*` flags.
- [ ] Làm listing package purchase/renew sau bước tạo và duyệt kho.
- [ ] Chuyển selector Inventory sang `/tenant/warehouses/my-warehouses` và mọi overview theo `warehouseId`.
- [ ] Xóa route/component/store Booking và Dispute.
- [ ] Cập nhật dashboard, i18n, notification deep-link và copy.
- [ ] Chạy regression wallet top-up/subscription để bảo đảm không xóa nhầm “deposit” hợp lệ.

## 14. Checklist kiểm thử tích hợp

### 14.1 Happy path chính

- [ ] Guest xem được kho còn thời gian đăng; kho hết hạn không xuất hiện.
- [ ] Guest bấm contact được yêu cầu login; user đăng nhập xem đúng contact Owner.
- [ ] Owner tạo kho không bị trừ ví.
- [ ] Kho sau duyệt vẫn chưa public nếu chưa mua listing package.
- [ ] Owner mua listing package, ví bị trừ và kho public tới đúng `visibleUntil`.
- [ ] Owner preview giá đúng cả ba pricing type.
- [ ] Owner tạo draft, upload hợp đồng giấy, chỉnh layout và submit.
- [ ] Tenant xem đúng giấy, giá, diện tích, layout và action flags.
- [ ] Tenant request changes; Owner sửa và resubmit.
- [ ] Tenant confirm; contract thành `ACTIVE`.
- [ ] Tenant có contract nhưng chưa subscription: xem được, không mutate WMS.
- [ ] Tenant mua subscription: `canManageWms=true`, thao tác WMS được.
- [ ] Inventory của từng warehouse không bị cộng chung.

### 14.2 Negative/edge cases bắt buộc

- [ ] Submit draft không có paper file bị từ chối.
- [ ] Fixed pricing nhưng dimension không full layout bị từ chối.
- [ ] Hai contract cùng Tenant + warehouse bị overlap ngày bị từ chối.
- [ ] Tenant khác vẫn có thể có contract cùng warehouse theo nghiệp vụ multi-tenant.
- [ ] Tenant không phải participant không đọc được contract/layout.
- [ ] Package listing inactive không mua được.
- [ ] Ví Owner không đủ tiền thì publication không được tạo dở dang.
- [ ] Double-click confirm/submit không tạo transition sai; nút disable khi request pending.
- [ ] Đổi giờ laptop không được coi là test expiry; test bằng dữ liệu/server job trong môi trường kiểm thử.
- [ ] Sau expiry, UI reload thấy `EXPIRED`, WMS mutation bị chặn, lịch sử vẫn còn.

## 15. Definition of Done phía FE

FE chỉ được coi là hoàn tất refactor khi:

- Không còn network call tới Booking, rental Deposit, Dispute hoặc legacy Contract endpoints.
- Không còn logic UI phụ thuộc state contract cũ hoặc `WarehouseStatus.RENTED`.
- Mọi Contract action được render theo `can*` flags.
- Public listing, rental price và service subscription được tách thành ba module/khái niệm rõ ràng.
- Inventory luôn có warehouse context.
- Upload giấy, preview, draft, layout, submit, review, confirm hoạt động xuyên suốt.
- Regression wallet top-up, subscription, SKU, receipt, audit và staff assignment pass.
- FE đã test trực tiếp với đúng Swagger/backend deploy chứa mốc code `59c201c` hoặc mới hơn.

---

Nếu agent FE cần kiểm tra một field chưa có trong tài liệu, không tự đặt tên request/response. Hãy đọc `/v3/api-docs`, response Network thực tế và báo BE nếu vẫn chưa rõ.
