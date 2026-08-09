# Tổng hợp State Machine Dự án StockSpace

Tài liệu này tổng hợp các vòng đời trạng thái (State Machine) cốt lõi của các Entity quan trọng trong dự án StockSpace.

## 1. Trạng thái của Kho (Warehouse)
Vòng đời trạng thái của chính Kho hàng (Warehouse), chịu ảnh hưởng bởi quá trình Kiểm định (Inspection) và quá trình Thuê mướn (Contract).
**Enum:** `WarehouseStatus`

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL : Owner tạo Kho mới
    
    PENDING_APPROVAL --> AVAILABLE : Admin duyệt (Kiểm định đạt)
    PENDING_APPROVAL --> INACTIVE : Admin từ chối (Kiểm định trượt)
    
    AVAILABLE --> RENTED : Có Hợp đồng chuyển sang ACTIVE
    RENTED --> AVAILABLE : Hợp đồng kết thúc (COMPLETED)
    
    AVAILABLE --> INACTIVE : Owner chủ động ẩn kho
    INACTIVE --> AVAILABLE : Owner mở lại kho
```

---

## 2. Trạng thái Yêu cầu Đặt thuê (Booking Request)
Vòng đời của yêu cầu đặt thuê kho từ Tenant. Luồng này độc lập và diễn ra trước khi Hợp đồng được tạo.
**Enum:** `ApprovalStatus`

```mermaid
stateDiagram-v2
    [*] --> PENDING : Tenant tạo yêu cầu thuê
    
    PENDING --> REJECTED : Owner từ chối hoặc Tenant tự hủy
    PENDING --> APPROVED : Owner duyệt yêu cầu (Trừ tiền cọc)
    
    REJECTED --> [*]
    APPROVED --> [*] : Sang giai đoạn tạo Hợp đồng
```

---

## 3. Trạng thái Hợp đồng Thuê kho (Rental Contract)
Vòng đời của Hợp đồng thuê. Hợp đồng này được sinh ra tự động ngay khi `BookingRequest` chuyển sang `APPROVED`.
**Enum:** `ContractStatus`

```mermaid
stateDiagram-v2
    [*] --> UNDER_NEGOTIATION : Tự động sinh ra khi Booking được duyệt
    
    UNDER_NEGOTIATION --> PENDING_TENANT_CONFIRM : Owner tải ảnh hợp đồng lên hệ thống
    PENDING_TENANT_CONFIRM --> ACTIVE : Tenant bấm xác nhận đồng ý
    
    ACTIVE --> PENDING_HANDOVER : Yêu cầu kết thúc hợp đồng
    PENDING_HANDOVER --> COMPLETED : Cả 2 bên xác nhận đã bàn giao kho
    
    UNDER_NEGOTIATION --> CANCELLED : Đàm phán thất bại
    PENDING_TENANT_CONFIRM --> PENDING_CANCEL : Owner đề xuất hủy
    PENDING_CANCEL --> CANCELLED : Tenant đồng ý hủy
    
    ACTIVE --> DISPUTED : Xảy ra tranh chấp trong quá trình thuê
    PENDING_HANDOVER --> DISPUTED : Xảy ra tranh chấp khi bàn giao
    
    CANCELLED --> [*]
    COMPLETED --> [*]
```

---

## 4. Luồng Kiểm kê Tồn kho WMS (Inventory Audit)
Quản lý vòng đời của một phiếu kiểm kê kho hàng do Thủ kho tạo.
**Enum:** `AuditStatus`

```mermaid
stateDiagram-v2
    [*] --> PENDING : Khởi tạo phiếu\n(Chưa có kết quả)
    
    PENDING --> SUBMITTED : Nhập số liệu\nvà Nộp kết quả
    
    SUBMITTED --> REJECTED : Quản lý từ chối
    SUBMITTED --> APPROVED : Quản lý duyệt\n(Điều chỉnh Tồn kho)

    REJECTED --> [*]
    APPROVED --> [*]
```

---

## 5. Luồng Giao dịch Ví (Wallet Transaction)
Quản lý trạng thái các giao dịch nạp/rút/thanh toán trên ví điện tử của user.
**Enum:** `TransactionStatus`

```mermaid
stateDiagram-v2
    [*] --> PENDING : Khởi tạo giao dịch
    
    PENDING --> FAILED : Lỗi thanh toán /\nBị hủy
    PENDING --> SUCCESS : Hoàn tất\n(Cập nhật số dư)

    FAILED --> [*]
    SUCCESS --> [*]
```

---

## 6. Luồng Gói Đăng ký Dịch vụ (Subscription)
Quản lý việc mua gói dịch vụ gia hạn (Sub) của Owner.
**Enum:** `SubscriptionStatus`

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : Thanh toán thành công\nGói bắt đầu tính ngày
    
    ACTIVE --> EXPIRED : Hết thời hạn gói\n(Không gia hạn)
    ACTIVE --> CANCELLED : Chủ động hủy gói\ntrước hạn
    
    EXPIRED --> [*]
    CANCELLED --> [*]
```
