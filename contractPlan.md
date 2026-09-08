# Kế hoạch triển khai luồng gia hạn hợp đồng

## 1. Mục tiêu

Xây dựng luồng gia hạn hợp đồng cho tenant và owner với hai lựa chọn:

1. Gia hạn và giữ nguyên layout hiện tại.
2. Gia hạn nhưng yêu cầu owner thiết kế layout mới.

Việc triển khai phải đáp ứng các nguyên tắc:

- Không làm gián đoạn quyền truy cập kho/WMS của hợp đồng đang còn hiệu lực.
- Không sửa đè hoặc làm mất dữ liệu của hợp đồng cũ.
- Tái sử dụng tối đa luồng tạo, gửi, xác nhận và yêu cầu chỉnh sửa hợp đồng hiện tại.
- Layout đề xuất cho kỳ tiếp theo không được ảnh hưởng layout đang vận hành.
- Không làm thay đổi hành vi của các luồng hợp đồng hiện có.

## 2. Kết luận kiến trúc

Không thêm trạng thái gia hạn trực tiếp vào `ContractStatus` và không chuyển hợp đồng đang dùng từ `ACTIVE` sang `RENEWAL_REQUESTED`.

Hệ thống hiện có sáu trạng thái hợp đồng:

```text
DRAFT -> PENDING_TENANT_CONFIRM -> ACTIVE -> EXPIRED
             |                         |
             +-> CHANGES_REQUESTED     +-> REJECTED
```

Nhiều logic hiện tại phụ thuộc chính xác vào `ACTIVE`, gồm:

- Quyền truy cập kho và WMS trong `TenantWarehouseAccessService`.
- Truy vấn hợp đồng, thống kê, kiểm tra trùng ngày trong `RentalContractRepository`.
- Luồng hết hạn và dọn dữ liệu trong `ContractExpiryScheduler`.
- Các test đang khóa danh sách trạng thái của `ContractStatus`.

Nếu đổi trạng thái hợp đồng đang vận hành thành trạng thái gia hạn, tenant có thể mất quyền WMS trước ngày hết hạn thực tế.

Giải pháp an toàn là tạo workflow `ContractRenewal` chạy song song. Khi owner chấp nhận xử lý yêu cầu, hệ thống tạo một `RentalContract` kế tiếp và liên kết nó với hợp đồng cũ.

```text
Hợp đồng hiện tại (ACTIVE)
        |
        +-- ContractRenewal
        |      |-- layoutMode
        |      |-- renewalStatus
        |      `-- requestedEndDate
        |
        `-- Hợp đồng kế tiếp
               renewedFromContractId = hợp đồng hiện tại
               startDate = hợp đồng hiện tại.endDate + 1 ngày
```

## 3. Bảo toàn dữ liệu hợp đồng cũ

Dữ liệu hợp đồng cũ không bị mất nếu triển khai theo kiến trúc này.

- Không cập nhật đè `startDate`, `endDate`, giá thuê, kích thước thuê, file hợp đồng hoặc `layoutSnapshot` của hợp đồng cũ.
- Hợp đồng gia hạn là một bản ghi `RentalContract` mới.
- Hợp đồng mới chứa `renewedFromContractId` để liên kết về hợp đồng trước đó.
- Khi hết hiệu lực, hợp đồng cũ chuyển từ `ACTIVE` sang `EXPIRED`, không bị xóa.
- Hợp đồng cũ và mới có giá, thời hạn, giấy tờ và layout snapshot độc lập.
- Lịch sử các lần gia hạn có thể truy ngược theo chuỗi hợp đồng.

Ví dụ:

```text
HĐ-001
01/01/2026 -> 31/12/2026
Giá: 10.000.000/tháng
Status: EXPIRED
        |
        `-- được gia hạn thành HĐ-002

HĐ-002
01/01/2027 -> 31/12/2027
Giá: 12.000.000/tháng
Status: ACTIVE
renewedFromContractId: HĐ-001
```

Đối với dữ liệu vận hành:

- Nếu giữ layout: layout, tồn kho và phân công staff được tiếp tục sử dụng.
- Nếu đổi layout: layout cũ vẫn nằm trong `layoutSnapshot` của hợp đồng cũ; layout mới chỉ áp dụng cho kỳ tiếp theo.
- Không tự động xóa stock khi có hợp đồng kế tiếp hợp lệ.
- BE phải từ chối layout mới nếu thao tác đó xóa rack/bin đang chứa hàng.
- Tuyệt đối không gia hạn bằng cách sửa trực tiếp ngày hết hạn của hợp đồng cũ.

## 4. Domain gia hạn hợp đồng

### 4.1. Entity `ContractRenewal`

Tạo entity riêng để quản lý workflow gia hạn.

Các trường đề xuất:

| Trường | Ý nghĩa |
|---|---|
| `id` | ID yêu cầu gia hạn |
| `sourceContractId` | Hợp đồng hiện tại được yêu cầu gia hạn |
| `renewalContractId` | Hợp đồng kế tiếp, nullable trước khi owner chấp nhận |
| `layoutMode` | Giữ layout hoặc yêu cầu layout mới |
| `status` | Trạng thái workflow gia hạn |
| `requestedEndDate` | Ngày kết thúc tenant mong muốn |
| `tenantNote` | Ghi chú của tenant |
| `rejectionReason` | Lý do từ chối |
| `baseLayoutHash` | Hash snapshot gốc để đối chiếu thay đổi |
| `requestedAt` | Thời điểm tenant gửi yêu cầu |
| `ownerRespondedAt` | Thời điểm owner phản hồi |
| `submittedAt` | Thời điểm owner gửi hợp đồng mới |
| `decidedAt` | Thời điểm tenant đưa ra quyết định cuối |
| `layoutCutoverStatus` | Trạng thái áp dụng layout mới |
| `layoutAppliedAt` | Thời điểm layout mới được áp dụng |
| `layoutCutoverError` | Lỗi gần nhất khi áp dụng layout |
| `isActive` | Cờ hoạt động |
| `isDeleted` | Cờ soft delete |
| `createdAt` | Ngày tạo |
| `updatedAt` | Ngày cập nhật |

### 4.2. `RenewalStatus`

| Trạng thái | Ý nghĩa hiển thị |
|---|---|
| `REQUESTED` | Tenant đã gửi yêu cầu |
| `OWNER_PREPARING` | Owner đang chuẩn bị hợp đồng |
| `PENDING_TENANT_CONFIRM` | Chờ tenant xác nhận hợp đồng mới |
| `CHANGES_REQUESTED` | Tenant yêu cầu chỉnh sửa |
| `APPROVED` | Gia hạn đã được xác nhận |
| `REJECTED` | Owner hoặc tenant từ chối |
| `CANCELLED` | Tenant hủy trước khi owner gửi hợp đồng |
| `LAPSED` | Hợp đồng cũ đã hết hạn nhưng gia hạn chưa hoàn tất |

Trên FE, trạng thái hợp đồng gốc vẫn hiển thị là **Đang hoạt động**. Trạng thái gia hạn được hiển thị bằng badge riêng, ví dụ **Đã gửi yêu cầu gia hạn** hoặc **Owner đang chuẩn bị**.

### 4.3. `RenewalLayoutMode`

```text
KEEP_CURRENT
REQUEST_CHANGE
```

### 4.4. Liên kết hợp đồng kế tiếp

Bổ sung trường nullable vào `rental_contracts`:

```text
renewed_from_contract_id
```

Không bổ sung trạng thái mới vào `ContractStatus`.

### 4.5. Index và kiểm soát đồng thời

Các index đề xuất:

```text
contract_renewals(source_contract_id, status)
contract_renewals(renewal_contract_id)
rental_contracts(renewed_from_contract_id)
```

Khi tạo yêu cầu gia hạn cần dùng pessimistic lock hoặc cơ chế idempotency để tenant double-click không tạo hai yêu cầu đang mở cho cùng một hợp đồng.

## 5. Hai chế độ layout

### 5.1. Giữ nguyên layout hiện tại

`layoutMode = KEEP_CURRENT`

- Copy kích thước thuê từ hợp đồng cũ.
- Owner chỉ được xem, không được chỉnh layout.
- Khi gửi hợp đồng mới, hệ thống chụp snapshot layout hiện tại để lưu lịch sử.
- Khi hợp đồng cũ hết hạn, layout, tồn kho và phân công staff vẫn được giữ.
- Scheduler phải nhận biết hợp đồng kế tiếp hợp lệ để không chạy cleanup dữ liệu vận hành.

### 5.2. Yêu cầu layout mới

`layoutMode = REQUEST_CHANGE`

Hiện mỗi cặp warehouse + tenant chỉ có một layout vận hành. API `saveContractLayout()` đang ghi trực tiếp vào layout tenant, vì vậy không được dùng trực tiếp API này khi owner thiết kế layout gia hạn.

Luồng an toàn:

1. Copy layout hiện tại thành `layoutSnapshot` của hợp đồng kế tiếp.
2. Owner chỉnh trên snapshot đề xuất.
3. Không ghi vào `warehouse_layouts` trong giai đoạn thiết kế và xác nhận.
4. Tenant xem snapshot mới và xác nhận hợp đồng.
5. Chỉ áp dụng snapshot vào layout vận hành tại ngày bắt đầu hợp đồng kế tiếp.
6. Lưu `layoutAppliedAt`, `layoutCutoverStatus` và lỗi gần nhất để scheduler có thể retry.

Giới hạn cho phiên bản đầu:

- Không thay đổi kích thước khu vực thuê.
- Không xóa rack/bin đang chứa hàng.
- Giữ nguyên ID rack/bin hiện có.
- Cho phép di chuyển, thay đổi bố trí hoặc bổ sung rack/bin hợp lệ.
- Việc tăng/giảm diện tích thuê nên được xử lý như hợp đồng mới hoặc amendment nâng cao, không gộp vào phiên bản renewal đầu tiên.

Owner chỉ được submit khi:

- Đã lưu layout đề xuất ít nhất một lần.
- Snapshot mới thực sự khác snapshot gốc.
- Layout vượt qua validation hình học.
- Không xóa rack/bin có tồn kho.
- Có file hợp đồng hoặc phụ lục gia hạn mới.

## 6. Quy tắc nghiệp vụ

- Chỉ hợp đồng `ACTIVE` mới được yêu cầu gia hạn.
- Chỉ được yêu cầu trong khoảng thời gian cấu hình trước ngày hết hạn, mặc định 30 ngày.
- Dùng config mới `contract_renewal_window_days`.
- Không dùng `contract_expiry_days` vì config hiện tại có ý nghĩa khác.
- `startDate` của hợp đồng mới do BE tính bằng `sourceContract.endDate + 1 ngày`.
- Tenant chỉ nhập ngày kết thúc mong muốn, layout mode và ghi chú.
- Owner có thể đề xuất lại ngày kết thúc và giá thuê.
- Không được để hai hợp đồng cùng warehouse + tenant chồng lấn thời gian.
- Tenant phải xác nhận trước hoặc trong ngày hết hạn hợp đồng cũ.
- Nếu chưa xác nhận khi hợp đồng cũ hết hạn, renewal chuyển `LAPSED` và cleanup cũ tiếp tục chạy.
- Chỉ cho phép một yêu cầu renewal đang mở trên một hợp đồng.
- Owner chỉ được xử lý renewal thuộc warehouse của mình.

## 7. API đề xuất

### 7.1. Tenant

#### Kiểm tra điều kiện gia hạn

```http
GET /api/tenant/contracts/{contractId}/renewal-eligibility
```

Ví dụ response:

```json
{
  "eligible": true,
  "availableFrom": "2026-09-01",
  "currentEndDate": "2026-09-30",
  "allowedLayoutModes": ["KEEP_CURRENT", "REQUEST_CHANGE"],
  "layoutChangeBlockedReason": null
}
```

#### Gửi yêu cầu gia hạn

```http
POST /api/tenant/contracts/{contractId}/renewals
```

```json
{
  "requestedEndDate": "2027-09-30",
  "layoutMode": "KEEP_CURRENT",
  "note": "Tôi muốn tiếp tục thuê thêm 12 tháng"
}
```

#### Danh sách và hủy yêu cầu

```http
GET /api/tenant/contract-renewals
POST /api/tenant/contract-renewals/{renewalId}/cancel
```

### 7.2. Owner

```http
GET  /api/owner/contract-renewals
POST /api/owner/contract-renewals/{renewalId}/accept
POST /api/owner/contract-renewals/{renewalId}/reject
```

Khi owner accept, BE tạo hợp đồng kế tiếp ở trạng thái `DRAFT`. Sau đó tái sử dụng các API hiện có:

```http
PUT  /api/owner/contracts/{renewalContractId}
PUT  /api/owner/contracts/{renewalContractId}/layout
POST /api/owner/contracts/{renewalContractId}/submit
```

Tenant tiếp tục dùng luồng confirm, request changes và reject hiện có. `ContractService` cần nhận biết hợp đồng có `renewedFromContractId` để áp dụng validation riêng cho renewal.

## 8. Thay đổi Backend

### 8.1. Schema và domain

- Tạo bảng `contract_renewals`.
- Tạo `ContractRenewal`, `RenewalStatus`, `RenewalLayoutMode`.
- Thêm `renewedFromContractId` vào `RentalContract`.
- Tạo repository và truy vấn lấy renewal đang mở.
- Thêm lock khi tạo/yêu cầu xử lý renewal.
- Bổ sung error code riêng cho renewal.
- Chuẩn bị migration có thể rollback; không phụ thuộc hoàn toàn vào `ddl-auto:update` ở production.

### 8.2. Service

- `ContractRenewalEligibilityService`: tính eligibility và lý do bị chặn.
- `ContractRenewalService`: tạo, accept, reject, cancel, đồng bộ trạng thái.
- `ContractService`: bổ sung nhánh validation cho hợp đồng kế tiếp.
- `WarehouseLayoutService`: thêm cơ chế lưu proposal snapshot, không ghi layout vận hành.
- `ContractExpiryScheduler`: nhận biết successor contract và trạng thái renewal.
- Tạo layout cutover job có lock, retry và bảo đảm idempotent.

### 8.3. Quyền WMS

- Hợp đồng cũ vẫn `ACTIVE` đến hết ngày hiệu lực nên quyền hiện tại không đổi.
- Hợp đồng kế tiếp có thể được tenant xác nhận trước nhưng chưa được cấp WMS trước `startDate`.
- Các cờ như `canManageWms` phải kiểm tra cả `ACTIVE` và khoảng ngày hiệu lực.
- Khi hợp đồng kế tiếp bắt đầu ngay sau hợp đồng cũ, scheduler không được xóa stock, layout hoặc staff assignment.

## 9. Thay đổi Frontend

### 9.1. Tenant contracts

Tại `src/features/tenant/pages/TenantContractsPage.jsx`:

- Thêm action **Gia hạn hợp đồng** khi BE trả `eligible = true`.
- Modal có hai lựa chọn:
  - Giữ nguyên layout hiện tại.
  - Yêu cầu layout mới.
- Thêm ngày hết hạn mong muốn và ghi chú.
- Hiển thị badge renewal riêng, không thay badge `ACTIVE`.
- Nếu không đủ điều kiện đổi layout, disable option và hiển thị lý do.
- Refresh danh sách khi nhận notification renewal.
- Cho phép xem lịch sử các hợp đồng trước và hợp đồng kế tiếp.

### 9.2. Owner contracts

Tại `src/features/owner/pages/OwnerContractsPage.jsx`:

- Thêm tab **Yêu cầu gia hạn**.
- Owner có thể accept hoặc reject kèm lý do.
- Sau khi accept, mở form draft và khóa tenant, warehouse, source contract và start date.
- Với `KEEP_CURRENT`, layout chỉ đọc.
- Với `REQUEST_CHANGE`, hiển thị nút **Thiết kế layout gia hạn**.
- Hiển thị rõ đây là hợp đồng kế tiếp của hợp đồng nào.

### 9.3. Layout editor

Tại `src/features/tenant/pages/LayoutWarehouse.jsx`:

- Dùng flag `canEditLayout` riêng từ BE, không suy ra từ `canEdit`.
- Renewal mode chỉ lưu snapshot đề xuất.
- Hiển thị cảnh báo: **Layout vận hành hiện tại chưa bị thay đổi**.
- Với `KEEP_CURRENT`, toàn bộ editor ở chế độ read-only.
- Với `REQUEST_CHANGE`, hiển thị validation các rack/bin không thể xóa.

### 9.4. API client

Tại `src/services/contractApi.js`:

- Thêm API eligibility.
- Thêm API tạo/hủy yêu cầu tenant.
- Thêm API danh sách/accept/reject cho owner.
- Thêm API lấy trạng thái và lịch sử renewal.

## 10. Notification

Bổ sung các loại notification:

```text
CONTRACT_RENEWAL_REQUESTED
CONTRACT_RENEWAL_SUBMITTED
CONTRACT_RENEWAL_CHANGES_REQUESTED
CONTRACT_RENEWAL_APPROVED
CONTRACT_RENEWAL_REJECTED
CONTRACT_RENEWAL_LAYOUT_APPLIED
CONTRACT_RENEWAL_LAYOUT_FAILED
```

Routing tại `src/components/NotificationDropdown.jsx`:

- Tenant: `/tenant/contracts`.
- Owner: `/owner/contracts`.

Nên bổ sung resource ID hoặc action path vào payload notification để mở đúng renewal/contract thay vì chỉ điều hướng đến trang danh sách.

Thông báo sắp hết hạn có thể đổi thành:

> Hợp đồng sắp hết hạn, bạn có thể gửi yêu cầu gia hạn.

## 11. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 1: Schema và domain renewal

- Tạo migration.
- Tạo entity, enum và repository.
- Liên kết hợp đồng kế tiếp với hợp đồng cũ.
- Thêm lock, duplicate validation và error code.
- Viết unit test cho domain và repository.

### Giai đoạn 2: Luồng `KEEP_CURRENT`

- Xây dựng eligibility.
- Tenant gửi/hủy yêu cầu.
- Owner accept/reject.
- Sinh hợp đồng kế tiếp.
- Owner cập nhật giá, ngày kết thúc, giấy tờ và gửi tenant.
- Tenant confirm/request changes/reject.
- Kiểm tra scheduler không xóa dữ liệu khi chuyển kỳ hợp đồng.

Đây là giai đoạn nên hoàn thiện và ổn định trước khi bật thay đổi layout.

### Giai đoạn 3: Tách layout proposal

- Không gọi `saveContractLayout()` vào layout vận hành đối với renewal.
- Lưu JSON snapshot vào hợp đồng kế tiếp.
- Thêm `canEditLayout`.
- Lưu `baseLayoutHash`.
- Bắt buộc snapshot mới khác snapshot gốc.
- Bổ sung validation stock và hình học.

### Giai đoạn 4: Layout cutover

- Scheduler áp dụng layout mới đúng ngày bắt đầu.
- Lock warehouse/layout khi cutover.
- Giữ ID rack/bin cũ.
- Chặn xóa vị trí đang có hàng.
- Cutover idempotent, có retry và ghi lỗi.
- Gửi notification thành công/thất bại.

### Giai đoạn 5: UI tenant

- Renewal modal.
- Eligibility và lý do bị chặn.
- Badge và lịch sử trạng thái.
- Refresh theo WebSocket notification.

### Giai đoạn 6: UI owner

- Danh sách yêu cầu.
- Accept/reject.
- Form hợp đồng gia hạn.
- Chế độ layout read-only/proposal tương ứng.

### Giai đoạn 7: Config, notification và rollout

- Thêm `contract_renewal_window_days`.
- Bổ sung notification và routing.
- Bật chức năng qua feature flag.
- Triển khai staging trước.
- Chỉ bật `REQUEST_CHANGE` sau khi `KEEP_CURRENT` ổn định.

## 12. Test bắt buộc

### 12.1. Eligibility và phân quyền

- Không thể gia hạn hợp đồng không phải `ACTIVE`.
- Không thể gửi yêu cầu trước thời gian cho phép.
- Không thể tạo hai request đang mở.
- Owner khác không thể xem hoặc xử lý request.
- Tenant khác không thể truy cập renewal.

### 12.2. Ngày và vòng đời hợp đồng

- Hợp đồng mới bắt đầu đúng `old.endDate + 1 ngày`.
- Hai hợp đồng không overlap.
- Reject/cancel renewal không thay đổi hợp đồng hiện tại.
- Renewal chưa hoàn tất khi hợp đồng cũ hết hạn sẽ chuyển `LAPSED`.
- Luồng hết hạn cũ vẫn chạy bình thường khi không có successor hợp lệ.

### 12.3. Dữ liệu lịch sử

- Hợp đồng cũ giữ nguyên ngày, giá, giấy tờ và snapshot.
- Hợp đồng cũ chỉ chuyển `EXPIRED`, không bị xóa.
- Có thể truy xuất chuỗi hợp đồng trước/sau.
- Soft delete không làm mất lịch sử hiển thị hợp đồng.

### 12.4. Layout

- `KEEP_CURRENT` không cho owner sửa layout.
- `REQUEST_CHANGE` không ghi vào layout vận hành khi đang thiết kế.
- Không submit nếu owner chưa lưu layout mới.
- Không submit nếu snapshot không thay đổi.
- Không xóa rack/bin đang có stock.
- Không thay đổi ID rack/bin hiện có.
- Cutover chỉ chạy từ ngày bắt đầu hợp đồng mới.
- Cutover retry không tạo layout/rack/bin trùng.

### 12.5. WMS và scheduler

- Khi hợp đồng cũ hết hạn và hợp đồng mới đã được xác nhận, scheduler không xóa stock, layout hoặc staff assignment.
- Tenant không có quyền WMS trước ngày bắt đầu hợp đồng mới.
- Tenant có quyền liên tục khi hai kỳ hợp đồng nối tiếp nhau.
- Layout cutover lỗi phải được ghi nhận và gửi notification.

### 12.6. Regression

- Luồng tạo hợp đồng mới hiện tại vẫn hoạt động.
- Owner update/submit hợp đồng thường vẫn hoạt động.
- Tenant confirm/request changes/reject vẫn hoạt động.
- Contract expiry hiện tại vẫn hoạt động khi không có renewal.
- Toàn bộ test cũ về sáu trạng thái `ContractStatus` vẫn pass.

## 13. Tiêu chí hoàn thành

- Hợp đồng cũ và toàn bộ dữ liệu lịch sử được giữ nguyên.
- Tenant tạo được yêu cầu renewal trong thời gian cho phép.
- Owner xử lý được yêu cầu và tạo hợp đồng kế tiếp.
- Hai chế độ layout tuân thủ đúng quyền chỉnh sửa.
- Layout proposal không ảnh hưởng layout đang vận hành.
- Scheduler chuyển kỳ an toàn, không làm mất stock/layout/staff assignment.
- Notification điều hướng đúng trang và đúng bản ghi liên quan.
- Test mới và toàn bộ regression test đều pass.

## 14. Khuyến nghị cuối cùng

Ý tưởng hai lựa chọn gia hạn là phù hợp. Điểm quan trọng là trạng thái gia hạn phải thuộc `ContractRenewal`, không thay thế trạng thái `ACTIVE` của hợp đồng hiện tại.

Nên triển khai `KEEP_CURRENT` trước vì có mức ảnh hưởng thấp và tái sử dụng được phần lớn logic hiện có. Sau khi luồng này ổn định mới bật `REQUEST_CHANGE`, vì phần layout cần cơ chế proposal snapshot và cutover riêng để bảo vệ dữ liệu WMS đang vận hành.

Cách tiếp cận này giữ được lịch sử hợp đồng, bảo toàn dữ liệu kho, giảm rủi ro regression và giới hạn thay đổi vào các nhánh renewal thay vì sửa toàn bộ vòng đời hợp đồng hiện tại.
