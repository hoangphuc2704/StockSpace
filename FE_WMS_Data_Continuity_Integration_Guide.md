# FE WMS Data Continuity Integration Guide

## 1. Mục đích và nguồn sự thật

Tài liệu này là hướng dẫn duy nhất để Frontend tích hợp trọn vẹn bốn nhóm chức năng dữ liệu WMS:

1. SKU Catalog import/export.
2. Inventory Snapshot export.
3. Offline Inbound/Outbound Movements import.
4. Inventory Audit Reconciliation bằng Excel.

Nội dung được đối chiếu trực tiếp với backend tại nhánh `dev`, commit `9b65863a`, sau khi merge toàn bộ WMS Data Continuity. Nếu tài liệu khác với suy đoán từ UI cũ, phải theo API contract trong tài liệu này.

Backend đã hoàn thành build và test toàn bộ. Tuy nhiên FE chỉ gọi các API này trên môi trường đã deploy migrations và code tương ứng. Nếu môi trường chưa deploy, endpoint có thể trả `404` hoặc DB chưa có staging tables.

## 2. Phạm vi và ranh giới bắt buộc

### 2.1 Trong phạm vi

- Tải workbook `.xlsx` do backend sinh.
- Chọn file và upload để validate.
- Hiển thị kết quả validate theo từng dòng.
- Tải error workbook khi job lỗi.
- Người có quyền xác nhận Apply.
- Hiển thị kết quả Apply và làm mới dữ liệu liên quan.
- Hỗ trợ người dùng quản lý tồn kho thủ công khi subscription hết hạn bằng snapshot đã export.

### 2.2 Ngoài phạm vi

- FE tự sinh cấu trúc workbook hoặc tự parse workbook để thay backend validate.
- Import trực tiếp Inventory Snapshot để ghi đè tồn kho.
- FEFO, expiry date hoặc đồng bộ ERP.
- Import/export contract, wallet, subscription, staff, layout, inspection hoặc warehouse transfer.
- Tự động Apply ngay sau Validate.
- Ghi trực tiếp vào stock batch, inventory transaction hoặc tự tính lại tồn kho ở FE.

## 3. Quy tắc tích hợp không được thay đổi

1. Luôn tải workbook/template mới từ backend; không dùng file tự tạo hoặc template cũ không rõ nguồn.
2. Không đổi tên sheet, header, `_META`, ID, source hoặc lookup sheet.
3. Chỉ sửa các ô được workbook cho phép sửa.
4. Import luôn là hai bước độc lập: `Validate -> người dùng xác nhận -> Apply`.
5. Validate không thay đổi dữ liệu nghiệp vụ.
6. Có một dòng lỗi thì toàn bộ job là `INVALID` và không được Apply.
7. Apply là atomic: thành công toàn bộ hoặc rollback toàn bộ.
8. Không retry Apply mù quáng. Cùng job hoặc cùng nội dung đã Apply sẽ bị từ chối.
9. Khi nhận `WMS_IMPORT_STALE`, tải workbook/template mới và làm lại từ đầu.
10. FE không tự suy diễn quyền từ role name. Dùng permission hiện có và xử lý `403` từ backend.
11. Mọi thời gian nhập trong workbook dùng múi giờ `Asia/Ho_Chi_Minh`.
12. Chỉ chấp nhận `.xlsx`; không chấp nhận `.xls`, `.xlsm`, CSV hoặc file có formula ở ô editable.

## 4. API contract dùng chung

### 4.1 Authentication

Tất cả endpoint đều yêu cầu session/token đăng nhập theo cơ chế hiện tại của hệ thống. FE phải dùng cùng HTTP client/interceptor đang dùng cho tenant API.

### 4.2 Response JSON chuẩn

Các endpoint JSON trả envelope:

```json
{
  "success": true,
  "message": "Import job loaded",
  "data": {}
}
```

Response lỗi:

```json
{
  "success": false,
  "code": "WMS_IMPORT_STALE",
  "message": "Import job đã cũ và không còn an toàn để áp dụng"
}
```

Không kiểm tra thành công chỉ bằng HTTP status; phải kiểm tra thêm `success`. Khi thất bại, dùng `code` cho logic và `message` cho nội dung thông báo.

### 4.3 Kiểu dữ liệu TypeScript dùng chung

```ts
type WmsImportType =
  | "SKU_CATALOG"
  | "OFFLINE_MOVEMENT"
  | "AUDIT_RECONCILIATION";

type WmsImportJobStatus =
  | "VALIDATED"
  | "INVALID"
  | "APPLIED"
  | "FAILED";

interface ApiResponse<T> {
  success: boolean;
  code?: string;
  message: string;
  data?: T;
}

interface WmsValidationError {
  code: string;
  message: string;
}

interface WmsImportRowError {
  sheetName: string;
  rowNumber: number;
  groupKey: string | null;
  normalizedPayload: Record<string, unknown>;
  validationErrors: WmsValidationError[];
}

interface WmsImportJob {
  jobId: string;
  importType: WmsImportType;
  status: WmsImportJobStatus;
  schemaVersion: string;
  originalFilename: string;
  fileSha256: string;
  contentSha256: string;
  contextMetadata: Record<string, unknown>;
  warehouseId: string | null;
  auditId: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  errors: WmsImportRowError[];
}
```

`errors` chỉ chứa tối đa 200 dòng. Nếu `invalidRows > errors.length`, UI phải báo còn lỗi khác và cho tải error workbook; backend không có field `hasMoreErrors`.

### 4.4 Import job API chung

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/tenant/wms-data/imports/{jobId}` | Tải lại trạng thái và kết quả job |
| `GET` | `/api/tenant/wms-data/imports/{jobId}/errors.xlsx` | Tải workbook lỗi của job `INVALID` hoặc `FAILED` |

Quyền đọc job: `INVENTORY_READ` hoặc `PRODUCT_MANAGE`. Job còn được giới hạn theo tenant và người tạo. Staff không được đọc job của staff khác; tenant principal cùng tenant có thể đọc.

Error workbook gồm sheet `ERRORS` với các cột:

```text
sheet_name, row_number, group_key, normalized_payload, error_codes, error_messages
```

Error workbook chỉ dùng để đọc và tìm lỗi, không upload chính error workbook để Apply. Người dùng phải sửa workbook nguồn rồi Validate lại, tạo một job mới.

### 4.5 Vòng đời job và UI tương ứng

| Status | Ý nghĩa | UI bắt buộc |
|---|---|---|
| `VALIDATED` | Tất cả dòng hợp lệ, chưa ghi dữ liệu | Hiển thị summary và nút Apply nếu actor được quyền |
| `INVALID` | Workbook đọc được nhưng có lỗi dữ liệu | Disable Apply; hiện lỗi; cho tải error workbook và chọn file đã sửa để Validate lại |
| `APPLIED` | Đã ghi dữ liệu thành công | Disable Apply; hiện thời gian Apply; refresh dữ liệu nghiệp vụ |
| `FAILED` | Apply đã bắt đầu nhưng domain check/transaction thất bại | Disable Apply; hiện `failureMessage`; cho tải error workbook nếu endpoint cho phép; yêu cầu tải template mới hoặc Validate lại |

Không có trạng thái processing vì validate/apply hiện chạy đồng bộ. Trong lúc request đang chạy, disable nút tương ứng để ngăn double-click.

### 4.6 Download file

Mọi endpoint export/template/error trả binary XLSX với media type:

```text
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Ví dụ Axios:

```ts
async function downloadXlsx(url: string, fallbackName: string) {
  const response = await api.get(url, { responseType: "blob" });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = encoded
    ? decodeURIComponent(encoded)
    : plain || fallbackName;

  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
```

Nếu HTTP client biến response lỗi thành `Blob`, interceptor phải đọc Blob JSON để lấy `code/message`; không hiển thị `[object Blob]`.

### 4.7 Upload file

```ts
async function uploadWorkbook<T>(url: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.post<ApiResponse<T>>(url, form);
}
```

Không tự set `Content-Type: multipart/form-data` nếu thư viện cần tự thêm boundary. Tên multipart field bắt buộc là `file`.

Giới hạn mặc định backend:

- File tối đa: 10 MiB.
- Tối đa 10.000 data rows/workbook.
- Offline Movement tối đa 1.000 `movement_ref`.
- Text cell tối đa 2.000 ký tự.
- JSON cell tối đa 20.000 ký tự.

FE nên kiểm tra extension và dung lượng để phản hồi sớm, nhưng backend vẫn là nơi quyết định cuối cùng.

## 5. Ma trận endpoint và quyền

| Nhóm | Method | Endpoint | Permission/role chính |
|---|---|---|---|
| Catalog | `GET` | `/api/tenant/wms-data/catalog/export` | `PRODUCT_MANAGE` |
| Catalog | `POST` | `/api/tenant/wms-data/catalog/imports/validate` | `PRODUCT_MANAGE` + `ROLE_TENANT` |
| Catalog | `POST` | `/api/tenant/wms-data/catalog/imports/{jobId}/apply` | `PRODUCT_MANAGE` + `ROLE_TENANT` |
| Snapshot | `GET` | `/api/tenant/wms-data/warehouses/{warehouseId}/inventory-snapshot/export` | `INVENTORY_READ` |
| Offline | `GET` | `/api/tenant/wms-data/warehouses/{warehouseId}/offline-movements/template` | `INVENTORY_READ` |
| Offline | `POST` | `/api/tenant/wms-data/warehouses/{warehouseId}/offline-movements/imports/validate` | Một trong `INBOUND_CREATE`, `OUTBOUND_CREATE`, `INVENTORY_READ` |
| Offline | `POST` | `/api/tenant/wms-data/warehouses/offline-movements/imports/{jobId}/apply` | `INVENTORY_UPDATE` + `ROLE_TENANT` |
| Audit | `GET` | `/api/tenant/wms-data/inventory-audits/{auditId}/count-sheet` | `INVENTORY_AUDIT_MANAGE` |
| Audit | `POST` | `/api/tenant/wms-data/inventory-audits/{auditId}/count-imports/validate` | `INVENTORY_AUDIT_MANAGE` |
| Audit | `POST` | `/api/tenant/wms-data/inventory-audits/count-imports/{jobId}/apply` | `INVENTORY_AUDIT_MANAGE` + audit access |

## 6. SKU Catalog

### 6.1 Mục đích

Cho tenant export catalog hiện tại, chỉnh sửa có kiểm soát trong Excel, Validate và Apply category/SKU hàng loạt.

### 6.2 FE flow bắt buộc

1. Hiện nút `Export catalog` cho tenant có `PRODUCT_MANAGE`.
2. Gọi `GET /api/tenant/wms-data/catalog/export` và lưu file theo `Content-Disposition`.
3. Người dùng chỉ chỉnh workbook vừa tải.
4. Chọn `.xlsx`, gọi Validate.
5. Hiển thị summary và lỗi theo sheet/row.
6. Chỉ khi status `VALIDATED`, hiện confirmation rõ: số dòng sẽ Apply và cảnh báo thao tác atomic.
7. Gọi Apply khi người dùng xác nhận.
8. Khi `APPLIED`, refresh category list, SKU list và đóng/clear file picker.

Không mở import/apply catalog cho staff.

### 6.3 API

#### Export

```http
GET /api/tenant/wms-data/catalog/export
Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Tên file mặc định: `stockspace-catalog-YYYY-MM-DD.xlsx`.

#### Validate

```http
POST /api/tenant/wms-data/catalog/imports/validate
Content-Type: multipart/form-data

file=<xlsx>
```

Response là `ApiResponse<WmsImportJob>` với `importType = SKU_CATALOG`.

#### Apply

```http
POST /api/tenant/wms-data/catalog/imports/{jobId}/apply
```

Không có request body. Response là `ApiResponse<WmsImportJob>` và status thành công phải là `APPLIED`.

### 6.4 Workbook Catalog v1.0

Sheets:

- `_META`: hidden/protected, không sửa.
- `README`: hướng dẫn.
- `CATEGORIES`: category hiện tại và dòng category mới.
- `SKUS`: SKU hiện tại và dòng SKU mới.
- `UOM_LOOKUP`: lookup-only.

`CATEGORIES` headers chính xác:

```text
action, category_key, category_id, source, name, default_attributes_json
```

Quy tắc:

- `action`: chỉ `CREATE` hoặc `SKIP`.
- Dòng export hiện có để `SKIP`, không biến thành `CREATE`.
- `source = SYSTEM` luôn read-only và phải `SKIP`.
- Category mới: `action=CREATE`, `category_id` để trống, `category_key` bắt buộc và không lặp trong file, `name` bắt buộc.
- `default_attributes_json` để trống hoặc là JSON object hợp lệ.
- Không hỗ trợ update/delete category qua workbook.

`SKUS` headers chính xác:

```text
action, sku_id, source_updated_at, source, sku_code, name, category_id, category_key, uom_code, unit_weight_kg, unit_volume_m3, specifications_json
```

Quy tắc:

- `action`: `CREATE`, `UPDATE`, `SKIP`.
- Dòng `SYSTEM` chỉ được `SKIP`.
- `CREATE`: để trống `sku_id` và `source_updated_at`; nhập `sku_code` mới, `name`, category, `uom_code`, weight và volume dương.
- `UPDATE`: giữ nguyên `sku_id`, `source_updated_at`, `source` và `sku_code` của dòng export; chỉ sửa các field editable.
- Chọn category bằng đúng một trong hai field: category cũ dùng `category_id`; category mới trong cùng workbook dùng `category_key`. Không điền cả hai.
- `uom_code` phải lấy từ `UOM_LOOKUP`.
- `unit_weight_kg > 0`, `unit_volume_m3 > 0`.
- `specifications_json` để trống hoặc là JSON object hợp lệ.
- Không hỗ trợ delete SKU.
- SKU đã có stock không được thay đổi weight/volume.

Apply tạo category trước rồi mới xử lý SKU trong cùng transaction. Nếu bất kỳ bước nào lỗi, không có dữ liệu nào được giữ lại.

### 6.5 Điều kiện truy cập

- Export yêu cầu `PRODUCT_MANAGE`.
- Validate/Apply chỉ cho tenant.
- Việc tạo/cập nhật SKU khi Apply vẫn đi qua rule subscription và ownership hiện hữu. Nếu subscription/access thay đổi sau Validate, Apply có thể thất bại.

## 7. Inventory Snapshot

### 7.1 Mục đích

Xuất ảnh chụp tồn kho tại một thời điểm để lưu trữ hoặc tiếp tục quản lý thủ công. Đây là file read-only, không phải file import.

### 7.2 FE flow

1. Người dùng chọn một warehouse cụ thể.
2. Hiện nút `Export inventory snapshot` nếu có `INVENTORY_READ`.
3. Gọi endpoint với đúng `warehouseId` đang xem.
4. Lưu file theo filename backend.
5. Không hiện nút `Import snapshot` ở bất kỳ đâu.

```http
GET /api/tenant/wms-data/warehouses/{warehouseId}/inventory-snapshot/export
Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

Tên file: `stockspace-inventory-snapshot-YYYY-MM-DD.xlsx`.

### 7.3 Quyền và subscription

- Tenant cần active contract với warehouse.
- Staff cần active contract của tenant và active assignment vào warehouse.
- Không yêu cầu active subscription để export. Đây là chủ ý để tenant có thể lấy dữ liệu quản lý thủ công khi subscription hết hạn.
- Contract hết hạn thì không còn quyền export qua tenant API.

### 7.4 Workbook

Sheets:

- `_META`, `README`.
- `STOCK_BY_BATCH`: chi tiết theo batch/location, giữ thông tin FIFO.
- `STOCK_SUMMARY`: tổng hợp theo SKU.

`STOCK_BY_BATCH`:

```text
batch_id, sku_id, sku_code, sku_name, category, uom_code, uom_name,
warehouse_id, warehouse_name, rack_id, rack_code, rack_name,
bin_id, bin_code, bin_name, shelf_level,
batch_quantity, reserved_quantity, available_quantity, arrival_date,
unit_weight_kg, unit_volume_m3,
calculated_batch_weight_kg, calculated_batch_volume_m3, generated_at
```

`STOCK_SUMMARY`:

```text
sku_id, sku_code, sku_name, category, uom_code, uom_name,
total_quantity, reserved_quantity, available_quantity,
total_weight_kg, total_volume_m3, location_count, generated_at
```

Ý nghĩa:

- `reserved_quantity`: lượng đang được giữ bởi warehouse transfer active.
- `available_quantity = max(quantity - reserved_quantity, 0)`.
- Đây là snapshot tại `generated_at`, không phải realtime lock.

## 8. Offline Inbound/Outbound Movements

### 8.1 Mục đích

Cho người dùng tải template, ghi nhiều phiếu nhập/xuất đã xảy ra khi làm việc offline, sau đó đưa toàn bộ movement vào hệ thống theo đúng thứ tự.

### 8.2 FE flow bắt buộc

1. Người dùng chọn warehouse.
2. Gọi Download Template. Không dùng template của warehouse khác.
3. Người dùng điền sheet `MOVEMENTS`.
4. Upload Validate bằng cùng `warehouseId`.
5. Hiển thị summary theo row và lỗi theo `movement_ref`.
6. Staff có thể Validate nếu có quyền nhưng không được thấy/nhấn Apply.
7. Tenant có `INVENTORY_UPDATE` xác nhận Apply.
8. Apply thành công: hiển thị mapping `movementRef -> receiptId`, refresh receipt list, stock và inventory dashboard.

### 8.3 API

#### Download template

```http
GET /api/tenant/wms-data/warehouses/{warehouseId}/offline-movements/template
```

Tên file: `stockspace-offline-movements-YYYY-MM-DD.xlsx`.

#### Validate

```http
POST /api/tenant/wms-data/warehouses/{warehouseId}/offline-movements/imports/validate
Content-Type: multipart/form-data

file=<xlsx>
```

#### Apply

```http
POST /api/tenant/wms-data/warehouses/offline-movements/imports/{jobId}/apply
```

Không truyền `warehouseId` trong URL Apply; backend lấy scope từ job và kiểm tra lại.

Response Apply:

```ts
interface OfflineMovementApplyResult {
  job: WmsImportJob;
  receipts: Array<{
    movementRef: string;
    sequenceNo: number;
    receiptId: string;
  }>;
}
```

Ví dụ:

```json
{
  "success": true,
  "message": "Offline movements applied",
  "data": {
    "job": {
      "jobId": "...",
      "importType": "OFFLINE_MOVEMENT",
      "status": "APPLIED",
      "totalRows": 3,
      "validRows": 3,
      "invalidRows": 0,
      "errors": []
    },
    "receipts": [
      { "movementRef": "OFF-001", "sequenceNo": 1, "receiptId": "..." }
    ]
  }
}
```

Các field job khác vẫn có mặt theo interface dùng chung; ví dụ rút gọn trên không phải schema thay thế.

### 8.4 Workbook

Sheets:

- `_META`, `README`.
- `MOVEMENTS`: sheet duy nhất người dùng nhập.
- `SKU_LOOKUP`: SKU hợp lệ của tenant.
- `LOCATION_LOOKUP`: rack/bin hợp lệ của layout hiện tại.

`MOVEMENTS` headers:

```text
movement_ref, sequence_no, type, occurred_at, sender_name, receiver_name,
sku_code, quantity, rack_code, bin_code, note
```

`SKU_LOOKUP`:

```text
sku_code, sku_name, uom_code, unit_weight_kg, unit_volume_m3, category_name
```

`LOCATION_LOOKUP`:

```text
rack_code, rack_name, shelf_count, max_bin_count,
rack_width, rack_length, rack_height,
bin_code, bin_name, shelf_level,
bin_coordinate_x, bin_coordinate_y, bin_position_z,
bin_width, bin_length, bin_height, bin_max_weight, bin_max_volume
```

### 8.5 Quy tắc movement

- Một `movement_ref` đại diện cho một receipt và có thể chứa nhiều SKU rows.
- `movement_ref` bắt buộc, tối đa 120 ký tự.
- Mỗi movement có `sequence_no` nguyên dương; hai movement khác nhau không được trùng sequence.
- Các dòng cùng `movement_ref` phải có cùng `type`, `occurred_at`, `sequence_no`.
- `type` chỉ là `INBOUND` hoặc `OUTBOUND`.
- `occurred_at` là ISO-8601 date-time, không trước `generated_at` của template và không ở tương lai lúc upload.
- `sku_code` phải có trong lookup/visible với tenant.
- `quantity` là số nguyên dương.
- Không lặp cùng SKU + location trong cùng movement.

Inbound:

- Mọi dòng bắt buộc có cả `rack_code` và `bin_code`.
- Location phải thuộc warehouse/layout hiện tại.
- Actor Validate cần `INBOUND_CREATE`.
- Apply kiểm tra lại sức chứa rack/bin và audit lock.

Outbound có hai mode:

- Auto FIFO: để trống cả `rack_code` và `bin_code`; backend tự chọn batch/location FIFO.
- Location FIFO: điền đủ cả rack và bin; backend lấy FIFO trong location đó.

Không được chỉ điền một trong rack/bin. Không trộn Auto FIFO và Location FIFO trong cùng `movement_ref`. Với Auto FIFO, một SKU chỉ nên có một dòng trong movement; hãy cộng quantity trước khi nhập.

### 8.6 Thứ tự và tính atomic

- Apply xử lý theo `sequence_no`.
- Một inbound trước có thể cung cấp stock cho outbound sau trong cùng workbook.
- Backend tạo receipt qua workflow chuẩn và kết thúc ở `APPROVED`.
- Nếu một movement lỗi, toàn bộ workbook rollback; không có partial receipts/stock.
- Apply recheck stock fingerprint. Nếu stock/reservation thay đổi từ lúc tải template, backend trả `WMS_IMPORT_STALE`.

### 8.7 Access/subscription

- Download template: active contract; staff còn cần active warehouse assignment.
- Validate/Apply mutation: cần active subscription.
- Staff chỉ được Validate theo permission, không được Apply.
- Chỉ tenant có `INVENTORY_UPDATE` được Apply.

## 9. Inventory Audit Reconciliation

### 9.1 Luồng hoàn chỉnh

Excel chỉ thay thế bước nhập count thủ công, không thay thế workflow audit:

1. Tạo audit bằng API audit hiện hữu.
2. Start audit để snapshot và khóa movement trong scope.
3. Tải blind count sheet.
4. Người kiểm kê điền số đếm.
5. Upload Validate.
6. Apply để lưu counts và unexpected items.
7. Submit audit bằng API hiện hữu.
8. Tenant reviewer Approve bằng API hiện hữu để reconcile stock.

Apply workbook tuyệt đối không tự Submit, không tự Approve và không thay đổi stock.

### 9.2 API Excel

#### Export count sheet

```http
GET /api/tenant/wms-data/inventory-audits/{auditId}/count-sheet
```

Chỉ dùng khi audit status là `IN_PROGRESS` hoặc `REOPENED`.

Tên file: `stockspace-audit-count-YYYY-MM-DD.xlsx`.

#### Validate count workbook

```http
POST /api/tenant/wms-data/inventory-audits/{auditId}/count-imports/validate
Content-Type: multipart/form-data

file=<xlsx>
```

#### Apply count workbook

```http
POST /api/tenant/wms-data/inventory-audits/count-imports/{jobId}/apply
```

Response:

```ts
interface AuditReconciliationApplyResult {
  job: WmsImportJob;
  audit: InventoryAuditResponse;
}
```

`audit` là DTO audit hiện hữu gồm tối thiểu: `id`, `warehouseId`, `warehouseName`, `status`, `items`, `countRound`, `scopeType`, `assignedToId`, timestamps và review information.

### 9.3 API workflow hiện hữu cần gọi sau Apply

```http
POST /api/tenant/inventory/audits/{auditId}/submit
POST /api/tenant/inventory/audits/{auditId}/approve
GET  /api/tenant/inventory/audits/{auditId}
```

Submit và Approve là hai hành động riêng. Người thực hiện count không được tự Approve audit của chính mình; backend sẽ kiểm tra reviewer và subscription khi Approve.

### 9.4 Workbook Audit Count v1.0

Sheets:

- `_META`: khóa audit, warehouse, count round, version, status, scope và layout.
- `README`.
- `COUNT_ITEMS`: item của current count round.
- `UNEXPECTED_ITEMS`: item thực tế tìm thấy nhưng snapshot không có.
- `SKU_LOOKUP`, `LOCATION_LOOKUP`: lookup-only và theo đúng audit scope.

`COUNT_ITEMS`:

```text
audit_item_id, sku_code, sku_name, uom_code,
rack_code, rack_name, bin_code, bin_name, shelf_level,
actual_quantity, note, variance_reason
```

Chỉ sửa:

- `actual_quantity`: số nguyên >= 0, bắt buộc cho tất cả current items.
- `note`: tối đa 2.000 ký tự.
- `variance_reason`: tối đa 2.000 ký tự.

Không sửa identifier, SKU hoặc location. `expected_quantity` cố ý không xuất để đảm bảo blind count.

`UNEXPECTED_ITEMS`:

```text
sku_code, rack_code, bin_code, actual_quantity, note
```

Quy tắc:

- Sheet này optional.
- Nếu thêm row, bắt buộc đủ SKU, rack, bin và actual quantity >= 0.
- SKU/location phải nằm trong tenant, warehouse và audit scope.
- Một tuple SKU + rack + bin chỉ xuất hiện một lần.

`SKU_LOOKUP`:

```text
sku_code, sku_name, uom_code, category_name
```

`LOCATION_LOOKUP`:

```text
rack_code, rack_name, bin_code, bin_name, shelf_level
```

### 9.5 Stale handling

Workbook bị stale khi audit round, version, status, warehouse/scope hoặc dữ liệu audit đã đổi. Khi nhận `WMS_IMPORT_STALE`:

1. Bỏ job/file cũ khỏi UI.
2. Reload audit detail.
3. Nếu audit vẫn `IN_PROGRESS`/`REOPENED`, download count sheet mới.
4. Người dùng nhập lại count trên file mới rồi Validate.

Không copy `_META` từ file mới sang file cũ để né stale check.

### 9.6 Access

- Cần `INVENTORY_AUDIT_MANAGE` và active contract.
- Staff phải có active warehouse assignment và là `assignedTo` của audit để count/export/import.
- Tenant reviewer thực hiện bước Approve cuối và cần active subscription tại thời điểm stock được reconcile.

## 10. Error handling chuẩn

| HTTP/code | Ý nghĩa | FE xử lý |
|---|---|---|
| `400 / WMS_IMPORT_FILE_INVALID` | File rỗng, sai loại, hỏng, formula hoặc không đọc được | Giữ dialog mở; yêu cầu chọn workbook `.xlsx` gốc hợp lệ |
| `400 / WMS_IMPORT_SCHEMA_UNSUPPORTED` | Sai version, sheet/header/metadata hoặc sai scope | Yêu cầu tải template mới; không cho Apply |
| `413 / WMS_IMPORT_LIMIT_EXCEEDED` | File/row/group/cell vượt giới hạn | Hiện giới hạn; yêu cầu chia file nhỏ hơn |
| `404 / WMS_IMPORT_JOB_NOT_FOUND` | Job không tồn tại hoặc actor không được đọc | Clear job local và quay về bước chọn file |
| `409 / WMS_IMPORT_JOB_INVALID_STATUS` | Apply sai status hoặc tải error workbook sai status | Reload job; gate nút đúng status |
| `409 / WMS_IMPORT_ALREADY_APPLIED` | Job/nội dung đã được Apply | Không retry; refresh dữ liệu nghiệp vụ |
| `409 / WMS_IMPORT_STALE` | Stock/audit/layout/context đã thay đổi | Tải workbook/template mới và làm lại |
| `403 / FORBIDDEN` | Thiếu role, permission, contract, assignment hoặc ownership | Không retry; refresh permission/session và báo không có quyền |
| `401` | Phiên đăng nhập hết hạn | Theo auth flow hiện hữu |
| `5xx` | Lỗi ngoài dự kiến | Không giả định Apply thành công; GET job bằng `jobId` nếu đã có để xác định trạng thái |

Khi Validate trả HTTP 200 nhưng `data.status = INVALID`, đây là kết quả nghiệp vụ bình thường, không phải lỗi transport.

## 11. UI/UX tối thiểu cần triển khai

### 11.1 Component dùng chung

Tạo/reuse một flow import có các state:

```text
IDLE -> FILE_SELECTED -> VALIDATING -> VALIDATED/INVALID
VALIDATED -> CONFIRMING -> APPLYING -> APPLIED/FAILED
```

Component cần có:

- File picker chỉ nhận `.xlsx`.
- Tên và dung lượng file.
- Summary `totalRows / validRows / invalidRows`.
- Bảng lỗi: sheet, row, group key, error code, message.
- Nút Download Errors cho `INVALID`/`FAILED`.
- Nút Apply chỉ cho `VALIDATED` và actor hợp lệ.
- Confirmation modal trước Apply.
- Chống double submit.
- Clear state khi đổi tenant, warehouse, audit hoặc logout.

Không lưu workbook binary, hash hoặc job data nhạy cảm lâu dài trong localStorage. Nếu cần khôi phục màn hình, chỉ lưu `jobId` ngắn hạn và GET lại; backend vẫn kiểm tra ownership.

### 11.2 Vị trí đề xuất

- Product/SKU Management: `Export catalog`, `Import catalog`.
- Inventory theo warehouse: `Export snapshot`.
- Inbound/Outbound hoặc Inventory theo warehouse: `Offline movements`.
- Audit detail ở `IN_PROGRESS/REOPENED`: `Download count sheet`, `Import count results`.

### 11.3 Nội dung confirmation Apply

Catalog:

> Áp dụng toàn bộ thay đổi Category/SKU hợp lệ trong file. Thao tác không hỗ trợ xóa dữ liệu.

Offline Movement:

> Tạo và duyệt toàn bộ phiếu nhập/xuất theo thứ tự trong file. Tồn kho sẽ thay đổi atomically. Bạn có chắc chắn tiếp tục?

Audit:

> Lưu kết quả kiểm kê từ file. Tồn kho chưa thay đổi cho đến khi audit được Submit và tenant Approve.

## 12. Trình tự FE agent phải thực hiện

Agent nhận tài liệu này phải làm đúng thứ tự:

- [ ] Audit HTTP client hiện có: auth interceptor, envelope, Blob error parsing, filename parsing.
- [ ] Thêm types dùng chung cho import job/error/apply results.
- [ ] Thêm service functions cho toàn bộ endpoint trong ma trận; không tạo URL suy diễn.
- [ ] Xây/reuse download XLSX helper.
- [ ] Xây/reuse validate/apply job UI có status gating.
- [ ] Tích hợp Catalog export/import; tenant-only Apply.
- [ ] Tích hợp Inventory Snapshot export; tuyệt đối không tạo import snapshot.
- [ ] Tích hợp Offline Movement template/validate/apply; staff không có Apply.
- [ ] Tích hợp Audit count sheet/validate/apply và nối lại Submit/Approve hiện hữu.
- [ ] Map đầy đủ các error code ở mục 10.
- [ ] Refresh đúng query/cache sau Apply.
- [ ] Chạy acceptance tests mục 13.
- [ ] Kiểm tra không làm hỏng CSV receipt export cũ hoặc các màn hình WMS hiện hữu.

Nếu code FE hiện tại khác tên folder/component, agent phải tích hợp vào kiến trúc sẵn có; không tạo module song song trùng chức năng và không rewrite toàn bộ UI ngoài phạm vi.

## 13. Acceptance test bắt buộc

### 13.1 Catalog

- [ ] Export tải đúng XLSX và filename.
- [ ] Tạo category + nhiều SKU, Validate `VALIDATED`, Apply `APPLIED`, list được refresh.
- [ ] Workbook có row lỗi trả `INVALID`, Apply bị disable và error workbook tải được.
- [ ] Staff không thấy thao tác import/apply.
- [ ] Double-click/retry không tạo duplicate.

### 13.2 Snapshot

- [ ] Export đúng warehouse, có `STOCK_BY_BATCH` và `STOCK_SUMMARY`.
- [ ] Tenant subscription expired nhưng contract active vẫn export được.
- [ ] Staff không có assignment bị chặn.
- [ ] UI không có Import Snapshot.

### 13.3 Offline Movement

- [ ] Một file có nhiều movement và nhiều SKU.
- [ ] Inbound trước, outbound sau cùng file Apply đúng sequence.
- [ ] Auto outbound để trống cả rack/bin và Location FIFO điền đủ cả hai.
- [ ] Mixed/partial location trả `INVALID` và lỗi được hiển thị.
- [ ] Staff Validate được theo permission nhưng không Apply.
- [ ] Tenant Apply thành công trả receipt IDs và refresh stock.
- [ ] Stock đổi sau Validate làm Apply trả `WMS_IMPORT_STALE`; UI yêu cầu template mới.
- [ ] Một movement lỗi không để lại receipt/stock partial.

### 13.4 Audit

- [ ] Chỉ `IN_PROGRESS`/`REOPENED` tải được count sheet.
- [ ] Workbook không lộ expected quantity.
- [ ] Thiếu một COUNT_ITEM trả `INVALID`.
- [ ] Unexpected item đúng scope Validate/Apply được.
- [ ] Apply chỉ lưu count; audit chưa tự Submit/Approve và stock chưa đổi.
- [ ] Submit rồi tenant Approve mới reconcile stock.
- [ ] Workbook round/version cũ trả stale.

### 13.5 Security và resilience

- [ ] Đổi warehouse/audit/job ID của tenant khác không truy cập được.
- [ ] File quá 10 MiB và sai extension có thông báo rõ.
- [ ] Reload page bằng `jobId` gọi GET và khôi phục đúng status.
- [ ] Response lỗi Blob được parse ra `code/message`.
- [ ] Apply đang chạy disable button; không gửi hai request đồng thời.

## 14. Definition of Done phía FE

Chỉ xem là hoàn thành khi:

- Bốn nhóm trong tài liệu đều được tích hợp.
- Tất cả endpoint, URL, multipart key và response field đúng chính tả/casing.
- Không có business calculation hoặc workbook schema tự phát ở FE.
- Status/role/permission gating đúng, đặc biệt staff không Apply Offline Movement.
- Mọi `INVALID`, `FAILED`, `STALE`, duplicate và permission error đều có UX rõ ràng.
- Không tự Apply sau Validate.
- Không có import snapshot.
- Các acceptance test mục 13 pass trên môi trường đã deploy backend/migration.
- FE có thể đưa workbook lỗi cho người dùng sửa và tiếp tục bằng một job mới mà không cần hỏi BE.

## 15. Ghi chú triển khai môi trường

Backend cần có hai migration mới được migration runner ghi nhận:

- `20260912_01_add_wms_import_jobs.sql`
- `20260912_02_add_inventory_receipt_occurred_at.sql`

Nếu API trả lỗi do schema DB chưa sẵn sàng, không sửa FE để né. Kiểm tra deployment/migration phía backend trước. Sau deploy nên smoke-test lần lượt: catalog export, snapshot export, movement template, audit count sheet, rồi một validate/apply nhỏ bằng test tenant.
