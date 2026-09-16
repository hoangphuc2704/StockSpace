# FE handoff — Partial Picking và xử lý ngoại lệ Stock Transfer

> Đây là file handoff duy nhất gửi cho FE/FE agent. Phạm vi gồm cả partial
> picking và hai nhánh sau `Approve Dispatch`: kho đích từ chối nhận trước
> `Mark Arrived`, và kho nguồn thu hồi chuyến đang vận chuyển.

## 1. Mục tiêu

Cải thiện trải nghiệm `Confirm picking` khi Source Staff lấy hàng nhiều đợt.

Contract BE cho partial picking:

- Staff được pick nhiều lần.
- Mỗi lần gửi lên là **số lượng lấy thêm trong lần hiện tại**, không phải tổng lũy kế.
- Transfer chưa pick đủ ở trạng thái `PICKING`.
- Chỉ khi pick đủ toàn bộ mới chuyển sang `READY_TO_DISPATCH`.
- Tenant chỉ được Dispatch theo luồng chuẩn khi Transfer là `READY_TO_DISPATCH`.
- Pick không trừ on-hand. Inventory chỉ giảm khi Tenant Approve Dispatch.

Mục tiêu của FE là giúp Staff luôn thấy:

```text
Cần lấy bao nhiêu
Đã lấy bao nhiêu
Còn phải lấy bao nhiêu
Lần này đang nhập thêm bao nhiêu
```

## 2. Vấn đề hiện tại

Component hiện tại:

```text
src/features/transfer/components/TransferActionModal.jsx
```

Đang hiển thị:

```text
Reserved up to 4 units
[Picked]
```

Sau khi Staff pick `2/4`, mở modal lần hai FE vẫn có thể cho nhập tối đa `4` vì `max` đang lấy từ:

```js
allocation.quantity
```

Nếu Staff nhập lại `4`, API hiểu là **pick thêm 4**, làm tổng lũy kế thành `6/4`; BE sẽ từ chối.

Ngoài ra FE hiện chưa hiển thị rõ:

- Tiến độ tổng `2/4`.
- Số còn phải lấy `2`.
- Input là số lấy thêm trong lần này.
- Tiến độ tại từng Rack/Bin khi có nhiều source allocation.

## 3. Quy tắc tính toán

### 3.1. Ở cấp Transfer item/SKU

FE có thể tính ngay từ response hiện tại:

```js
const requested = Number(item.requestedQuantity || 0)
const picked = Number(item.pickedQuantity || 0)
const remainingToPick = Math.max(requested - picked, 0)
const progressPercent = requested > 0
  ? Math.min(100, Math.round((picked / requested) * 100))
  : 0
```

### 3.2. Ở cấp Transfer

```js
const requestedTotal = items.reduce(
  (sum, item) => sum + Number(item.requestedQuantity || 0),
  0
)

const pickedTotal = items.reduce(
  (sum, item) => sum + Number(item.pickedQuantity || 0),
  0
)

const remainingTotal = Math.max(requestedTotal - pickedTotal, 0)
```

### 3.3. Ở cấp source allocation/Rack/Bin

Công thức đúng:

```js
const allocationRemaining = Math.max(
  allocation.quantity - allocation.pickedQuantity,
  0
)
```

BE đã bổ sung tiến độ thực tế vào mỗi `sourceAllocations[]`. FE không được tự chia `item.pickedQuantity` cho các allocation vì không biết Staff đã pick tại vị trí nào.

Contract response:

```json
{
  "id": "source-allocation-id",
  "sourceRackName": "Rack tiêu chuẩn 1",
  "sourceBinName": "Rack tiêu chuẩn 1 - Bin 2",
  "quantity": 4,
  "pickedQuantity": 2,
  "remainingQuantity": 2
}
```

`pickedQuantity` được BE cộng từ các dòng `stock_transfer_pick_lines` của allocation tương ứng. `remainingQuantity = max(quantity - pickedQuantity, 0)`.

## 4. Thiết kế UI đề xuất

### 4.1. Nút hành động ở danh sách Transfer

File:

```text
src/features/transfer/pages/TransferPage.jsx
```

Trạng thái `ALLOCATED`:

```text
Confirm picking
```

Trạng thái `PICKING`:

```text
Tiếp tục lấy hàng · Còn 2
```

Không hiển thị `Confirm picking` khi `remainingTotal = 0` hoặc status đã là `READY_TO_DISPATCH`.

### 4.2. Phần tổng quan đầu modal

File:

```text
src/features/transfer/components/TransferActionModal.jsx
```

Hiển thị:

```text
Tiến độ lấy hàng
Đã lấy 2/4 thùng
Còn phải lấy: 2 thùng
[██████████----------] 50%
```

Thông báo nghiệp vụ:

```text
Nhập số lượng lấy thêm trong lần này. Số đã lấy được cộng dồn qua
nhiều lần xác nhận. Tồn kho chỉ giảm khi Tenant duyệt xuất kho.
```

### 4.3. Card từng SKU

```text
KETTLE-0904-01 — Ấm siêu tốc
Kế hoạch: 4 | Đã lấy: 2 | Còn lại: 2
```

Nếu SKU đã pick đủ:

```text
[Đã lấy đủ]
```

Các input thuộc SKU này phải disabled.

### 4.4. Card từng Rack/Bin

Khi BE đã trả tiến độ allocation:

```text
Rack tiêu chuẩn 1 · Rack tiêu chuẩn 1 - Bin 2
Kế hoạch: 4
Đã lấy: 2
Còn lại: 2

Số lượng lấy thêm lần này
[ 2 ]
Tối đa: 2
```

Yêu cầu input:

- `min=0`.
- `max=allocation.remainingQuantity`.
- Giá trị ban đầu để trống; không tự điền lại tổng đã pick.
- Có thể thêm nút `Lấy hết phần còn lại` để điền đúng remaining.
- Dòng có remaining bằng `0` phải disabled và có badge `Hoàn tất`.

### 4.5. Footer modal

Hiển thị bản xem trước trước khi submit:

```text
Lần này xác nhận: 2
Sau khi xác nhận: 4/4
Trạng thái dự kiến: Sẵn sàng xuất kho
```

Nếu sau submit vẫn còn thiếu:

```text
Trạng thái dự kiến: Đang lấy hàng
Còn phải lấy sau lần này: 2
```

Nhãn nút:

```text
Xác nhận lấy thêm 2
```

Không dùng nhãn mơ hồ chỉ có `Save` hoặc `Confirm`.

## 5. Payload API

Endpoint không đổi:

```http
POST /api/tenant/inventory/transfers/{transferId}/pick
Idempotency-Key: <uuid>
```

Payload là delta của lần hiện tại:

```json
{
  "lines": [
    {
      "sourceAllocationId": "6fed2355-598b-4ca1-9040-661c23e0974b",
      "quantity": 2
    }
  ]
}
```

Không gửi tổng lũy kế:

```text
Sai: đã pick 2, lần sau gửi quantity=4 để biểu diễn tổng 4.
Đúng: đã pick 2, lần sau gửi quantity=2 để lấy thêm 2.
```

Sau submit thành công, FE phải fetch lại Transfer từ BE. Không tự cộng state cục bộ rồi coi đó là dữ liệu cuối cùng.

## 6. Validation FE

Trước submit:

1. Ít nhất một allocation có quantity lớn hơn `0`.
2. Quantity phải là số nguyên.
3. Quantity không âm.
4. Quantity không vượt `allocation.remainingQuantity`.
5. Tổng lấy thêm của một SKU không vượt `item.remainingToPick`.
6. Không gửi các dòng có quantity bằng `0`.
7. Disable submit trong lúc request đang chạy để tránh double click.
8. Mỗi thao tác mới tạo một `Idempotency-Key`; retry cùng request sau timeout phải dùng lại key cũ nếu infrastructure hỗ trợ.

BE vẫn là nguồn quyết định cuối cùng. Nếu BE trả conflict vì dữ liệu đã thay đổi ở tab hoặc thiết bị khác, FE phải:

- Hiển thị message từ API.
- Fetch lại Transfer.
- Cập nhật remaining mới.
- Không giữ lại input đã vượt remaining mới.

## 7. Trạng thái API và cách triển khai

### Giai đoạn A — FE-only, làm được ngay

Không cần đổi BE để triển khai:

- Tiến độ tổng Transfer.
- Tiến độ từng SKU.
- `Đã lấy X/Y`.
- `Còn phải lấy Z`.
- Đổi nhãn nút thành `Tiếp tục lấy hàng` khi status `PICKING`.
- Giải thích quantity là số lấy thêm lần này.
- Refresh Transfer sau submit.

Không được tuyên bố remaining chính xác ở từng Rack/Bin nếu API chưa trả picked theo allocation.

### Giai đoạn B — BE đã hoàn tất, FE có thể tích hợp

BE hiện trả hai field sau trên từng vị trí nguồn:

```json
sourceAllocations[].pickedQuantity
sourceAllocations[].remainingQuantity
```

Khi có hai field này, FE thay validation hiện tại:

```js
quantity <= allocation.quantity
```

bằng:

```js
quantity <= allocation.remainingQuantity
```

Không lưu hoặc suy đoán tiến độ allocation bằng `localStorage`, state cũ hay timeline. Timeline hiện chỉ cho biết có command `PICK`, không cho biết chính xác allocation và quantity của từng lần pick.

## 8. Các file FE dự kiến thay đổi

```text
src/features/transfer/pages/TransferPage.jsx
```

- Thêm helper tính tổng requested/picked/remaining.
- Đổi nhãn primary action ở trạng thái `PICKING`.
- Có thể hiển thị `Picked 2/4` ngay trên transfer row.

```text
src/features/transfer/components/TransferActionModal.jsx
```

- Thêm progress summary.
- Nhóm allocation theo SKU.
- Đổi label input thành `Số lượng lấy thêm lần này`.
- Giới hạn input theo remaining.
- Disable allocation đã hoàn tất.
- Thêm preview sau khi submit.
- Fetch lại dữ liệu sau thành công.

```text
src/features/transfer/components/TransferDetailModal.jsx
```

- Bổ sung metric `Picked` và `Remaining to pick`.
- Hiển thị tiến độ từng SKU/source allocation.

```text
src/services/wms/transferApi.js
```

- Không cần endpoint mới cho giai đoạn A.
- Giữ nguyên `pickTransfer(id, payload, idempotencyKey)`.
- Chỉ cập nhật mapping/type nếu BE bổ sung field allocation trong giai đoạn B.

## 9. Ví dụ theo dữ liệu test hiện tại

Transfer:

```text
TRF-6922E34685894801ACE0
SKU: KETTLE-0904-01
Requested: 4
Source: Rack tiêu chuẩn 1 - Bin 2
```

### Trước lần pick đầu

```text
Status: ALLOCATED
Picked: 0/4
Remaining: 4
```

Staff nhập `2`:

```text
Status sau submit: PICKING
Picked: 2/4
Remaining: 2
```

Mở modal lần hai phải hiển thị:

```text
Đã lấy: 2
Còn phải lấy: 2
Input tối đa: 2
```

Staff nhập thêm `2`:

```text
Status sau submit: READY_TO_DISPATCH
Picked: 4/4
Remaining: 0
```

Sau đó FE ẩn `Confirm picking` và Tenant thấy `Approve dispatch`.

## 10. Acceptance criteria

### TC-FE-PICK-01 — Pick đủ một lần

1. Transfer `ALLOCATED`, requested `4`, picked `0`.
2. Modal hiển thị remaining `4`.
3. Nhập `4` và submit.
4. Response thành `READY_TO_DISPATCH`.
5. Nút tiếp theo của Tenant là `Approve dispatch`.

### TC-FE-PICK-02 — Pick hai đợt

1. Pick `2/4`.
2. Transfer thành `PICKING`.
3. Danh sách và modal đều hiển thị còn `2`.
4. Mở lại modal, input tối đa là `2`.
5. Pick thêm `2`, Transfer thành `READY_TO_DISPATCH`.

### TC-FE-PICK-03 — Không cho vượt remaining

1. Đã pick `2/4`.
2. Nhập thêm `3`.
3. FE chặn submit và hiển thị:

   ```text
   Chỉ còn 2 đơn vị cần lấy tại vị trí này.
   ```

4. Không gọi API.

### TC-FE-PICK-04 — Nhiều allocation

1. SKU có allocation A=`2`, B=`2`.
2. Pick A=`2`, B=`0`.
3. Mở lại modal: A hoàn tất/disabled, B remaining=`2`.
4. Không được suy remaining của A/B chỉ từ picked tổng của item.

### TC-FE-PICK-05 — Nhiều SKU

1. SKU A đã đủ, SKU B còn thiếu.
2. SKU A hiển thị `Đã lấy đủ` và disabled.
3. SKU B vẫn cho nhập phần còn lại.
4. Transfer chỉ `READY_TO_DISPATCH` khi mọi SKU đều đủ.

### TC-FE-PICK-06 — Refresh trang

1. Pick một phần.
2. Refresh hoặc đăng nhập ở thiết bị khác.
3. Tiến độ vẫn lấy từ API, không mất và không quay về `0`.

### TC-FE-PICK-07 — Dữ liệu thay đổi đồng thời

1. Hai tab cùng mở modal khi remaining=`2`.
2. Tab A pick `2` thành công.
3. Tab B cũng submit `2`.
4. BE từ chối tab B.
5. FE tab B hiển thị lỗi và fetch lại remaining=`0`.

### TC-FE-PICK-08 — Inventory không đổi khi Pick

1. Ghi nhận on-hand/reserved/available trước Pick.
2. Pick một phần hoặc pick đủ.
3. Inventory vẫn giữ nguyên.
4. Chỉ sau `Approve dispatch` on-hand mới giảm và reservation mới được consume.

## 11. Xử lý sau Approve Dispatch: từ chối nhận và thu hồi chuyến

Sau `Approve Dispatch`, source on-hand đã giảm. FE phải tách hai nghiệp vụ sau,
không dùng một nút `Reject` chung cho cả kho nguồn và kho đích.

### 11.1. Kho đích từ chối trước `Mark Arrived`

BE cho phép Tenant hoặc Destination Staff đang được gán gọi:

```http
PATCH /api/tenant/inventory/transfers/{transferId}/reject-receipt
Idempotency-Key: <uuid>
```

```json
{
  "reason": "Kho đích đóng cửa trước khi xe đến"
}
```

Áp dụng khi status là `IN_TRANSIT`, `OVERDUE`, `ARRIVED_AT_DESTINATION` hoặc
`RECEIVING`, với điều kiện chưa ghi nhận bất kỳ quantity nào. Gọi từ
`IN_TRANSIT` là hợp lệ và không cần gọi `Mark Arrived` trước.

FE hiển thị action theo quyền:

```text
Destination Staff được gán  → Từ chối nhận chuyến
Tenant                     → Từ chối nhận chuyến
Source Staff               → Không hiển thị action này
```

Khi submit thành công:

```text
status: RECEIVE_REJECTED
destination on-hand: không đổi
source on-hand: không cộng lại
```

FE phải refresh detail/timeline từ response BE. Nếu cần đưa hàng về nguồn thì
tiếp tục `Request Return → Dispatch Return → Receive Return`; nếu đổi hướng thì
chọn `Create Retry`. Modal bắt buộc nhập lý do và phải nói rõ đây là từ chối
tiếp nhận, không phải hủy xuất kho.

### 11.2. Kho nguồn/Source Staff thu hồi khi đang vận chuyển

BE bổ sung action riêng cho Tenant hoặc Source Staff đang được gán:

```http
POST /api/tenant/inventory/transfers/{transferId}/recall
Idempotency-Key: <uuid>
```

```json
{
  "reason": "Kho đích báo không thể tiếp nhận, thu hồi chuyến"
}
```

Chỉ áp dụng cho `IN_TRANSIT` hoặc `OVERDUE`. FE hiển thị:

```text
Tenant/Source Staff được gán → Thu hồi chuyến về kho nguồn
Destination Staff          → Không hiển thị action này
```

Kết quả:

```text
status: RETURN_REQUESTED
outbound attempt: CANCELLED
return attempt: PLANNED
inventory: không đổi tại thời điểm request
```

Đây không phải `Reject Receipt`. Sau đó Tenant tiếp tục:

```text
Dispatch Return → Receive Return tại kho nguồn
```

Chỉ `Receive Return` mới tạo inbound receipt và cộng lại tồn kho nguồn.

### 11.3. FE action helper và confirmation

Không suy quyền chỉ từ status. FE chỉ dùng status/assignment/role để ẩn hiện;
BE vẫn là nguồn quyết định cuối cùng.

```js
const canRejectReceipt =
  ['IN_TRANSIT', 'OVERDUE', 'ARRIVED_AT_DESTINATION', 'RECEIVING'].includes(status)
  && receivedQuantity === 0
  && (isTenant || isAssignedDestinationStaff)

const canRecallInTransit =
  ['IN_TRANSIT', 'OVERDUE'].includes(status)
  && (isTenant || isAssignedSourceStaff)
```

Mỗi action phải:

- Mở modal nhập `reason` bắt buộc.
- Hiển thị cảnh báo tồn nguồn đã bị trừ sau Dispatch.
- Gửi `Idempotency-Key` mới cho command mới.
- Disable nút trong lúc request chạy.
- Dùng response BE hoặc refetch detail/timeline sau thành công.
- Hiển thị lỗi `409` bằng cách reload lại state, không retry mù.

Nhãn UI nên dùng:

```text
Từ chối nhận chuyến       (kho đích)
Thu hồi chuyến về nguồn   (kho nguồn)
```

Không dùng nhãn chung `Reject` vì người dùng sẽ không biết đây là từ chối nhận
hay thu hồi hàng đang chạy.

### 11.4. Acceptance criteria cho hai nhánh

#### TC-FE-EXCEPTION-01 — Destination reject trước Mark Arrived

1. Transfer ở `IN_TRANSIT`, chưa nhận quantity.
2. Destination Staff được gán thấy `Từ chối nhận chuyến`.
3. Submit reason thành công.
4. Status thành `RECEIVE_REJECTED`.
5. Không tạo inbound receipt/stock batch.
6. FE không tự cộng lại source on-hand.

#### TC-FE-EXCEPTION-02 — Source recall trong transit

1. Transfer ở `IN_TRANSIT`, source staff được gán.
2. Source Staff hoặc Tenant thấy `Thu hồi chuyến về nguồn`.
3. Submit reason thành công.
4. Status thành `RETURN_REQUESTED`.
5. Timeline có `RECALL_IN_TRANSIT`; outbound attempt thành `CANCELLED`.
6. Tiếp tục được `Dispatch Return` và `Receive Return`.

#### TC-FE-EXCEPTION-03 — Không lẫn quyền hai đầu

1. Source Staff không thấy `Từ chối nhận chuyến`.
2. Destination Staff không thấy `Thu hồi chuyến về nguồn`.
3. Nếu gọi API trái quyền, BE trả `403` và FE refetch detail.

## 12. Ngoài phạm vi

Không thay đổi trong task FE này:

- Không cho Dispatch thiếu.
- Không thêm `SHORT_PICKED`.
- Không tự đổi source allocation sang batch khác.
- Không tự giảm requested quantity.
- Không sửa logic reservation hoặc Inventory.
- Không thay đổi API Pick hiện tại.

Nếu thực tế không tìm đủ hàng, quy trình hiện tại vẫn là dừng ở `PICKING`, báo Tenant, hoàn trả hàng staging về vị trí và Cancel Transfer trước khi Audit/tạo phiếu mới.

## 13. Prompt triển khai FE — copy nguyên phần này cho FE agent

Hãy triển khai FE theo toàn bộ contract trong file này. Không chỉ sửa modal
partial picking; phải xử lý thêm action visibility và flow exception sau Dispatch.

### 13.1. Các file FE cần kiểm tra/sửa

```text
src/features/transfer/pages/TransferPage.jsx
src/features/transfer/components/TransferActionModal.jsx
src/features/transfer/components/TransferDetailModal.jsx
src/services/wms/transferApi.js
```

Nếu repository đang dùng tên component khác, tìm component tương đương đang
render Transfer list/detail/action menu rồi áp dụng cùng contract. Không tạo
state machine riêng ở FE; status và response từ BE là nguồn dữ liệu cuối cùng.

### 13.2. API contract bắt buộc

Partial picking:

```http
POST /api/tenant/inventory/transfers/{id}/pick
Idempotency-Key: <uuid>
```

```json
{
  "lines": [
    { "sourceAllocationId": "...", "quantity": 2 }
  ]
}
```

`quantity` là số lấy thêm trong lần hiện tại. Giới hạn input bằng
`sourceAllocations[].remainingQuantity`, không dùng `allocation.quantity`.

Kho đích từ chối nhận:

```http
PATCH /api/tenant/inventory/transfers/{id}/reject-receipt
Idempotency-Key: <uuid>
```

```json
{ "reason": "Kho đích đóng cửa trước khi xe đến" }
```

Cho phép khi status là `IN_TRANSIT`, `OVERDUE`, `ARRIVED_AT_DESTINATION` hoặc
`RECEIVING`, và chưa nhận quantity nào. Destination Staff đang được gán hoặc
Tenant mới được dùng. Kết quả là `RECEIVE_REJECTED`; không tự cộng lại tồn
nguồn.

Kho nguồn thu hồi chuyến:

```http
POST /api/tenant/inventory/transfers/{id}/recall
Idempotency-Key: <uuid>
```

```json
{ "reason": "Kho đích báo không thể tiếp nhận" }
```

Cho phép khi status là `IN_TRANSIT` hoặc `OVERDUE`, bởi Tenant hoặc Source Staff
đang được gán. Kết quả là `RETURN_REQUESTED`; sau đó UI hướng dẫn tiếp tục
`Dispatch Return` rồi `Receive Return`. Request recall không cộng lại tồn kho.

Các endpoint tiếp theo vẫn dùng như hiện tại:

```text
PATCH /api/tenant/inventory/transfers/{id}/return/dispatch
POST  /api/tenant/inventory/transfers/{id}/return/receive
POST  /api/tenant/inventory/transfers/{id}/retry
PATCH /api/tenant/inventory/transfers/{id}/retry/dispatch
PATCH /api/tenant/inventory/transfers/{id}/arrive
POST  /api/tenant/inventory/transfers/{id}/receive
GET   /api/tenant/inventory/transfers/{id}/timeline
```

### 13.3. Action visibility bắt buộc

FE chỉ dùng các điều kiện sau để ẩn/hiện nút; BE vẫn là nơi authorize cuối
cùng. Nếu Staff Operations API trả `allowedActions`, ưu tiên dùng projection
đó và không tự cấp thêm quyền.

```text
Destination Staff được gán + IN_TRANSIT/OVERDUE
  → ARRIVE, RECEIVE, REJECT_RECEIPT

Destination Staff được gán + ARRIVED_AT_DESTINATION/RECEIVING
  + receivedQuantity === 0
  → RECEIVE, REJECT_RECEIPT

Source Staff được gán + IN_TRANSIT/OVERDUE
  → RECALL

Tenant
  → vẫn có thể thực hiện các exception action theo status hợp lệ
```

Không hiển thị `REJECT_RECEIPT` cho Source Staff. Không hiển thị `RECALL` cho
Destination Staff. Không hiển thị `REJECT_RECEIPT` nếu transfer đã nhận một
phần; khi đó dùng `Receive tiếp` hoặc `Close Short`.

Nhãn UI:

```text
REJECT_RECEIPT → Từ chối nhận chuyến
RECALL        → Thu hồi chuyến về nguồn
```

Không dùng nhãn chung `Reject`.

### 13.4. Quy tắc submit và refresh

- Modal của cả hai exception action bắt buộc nhập `reason`.
- Disable nút khi request đang chạy.
- Mỗi command mới sinh một `Idempotency-Key` mới.
- Timeout thì retry cùng key và cùng payload.
- Sau thành công, lấy response BE làm state mới hoặc refetch detail.
- Không tự cộng/trừ `onHand`, `reserved`, `available` ở FE.
- Sau `409`, refetch detail và timeline rồi render lại action.
- Timeline phải hiển thị khác nhau giữa `REJECT_RECEIPT` và
  `RECALL_IN_TRANSIT`.

### 13.5. Luồng UI cần hoàn tất

```text
READY_TO_DISPATCH
  → Approve Dispatch
  → IN_TRANSIT
      ├─ Destination: Từ chối nhận chuyến
      │    → RECEIVE_REJECTED
      │    → Retry hoặc Request Return
      ├─ Source/Tenant: Thu hồi chuyến về nguồn
      │    → RETURN_REQUESTED
      │    → Dispatch Return → Receive Return
      └─ Destination: Mark Arrived → Receive
```

Sau khi action thành công, menu phải cập nhật theo status mới; không giữ lại
nút cũ do state local chưa refresh.
