# 🚨 Unhappy Test Cases cho Toàn bộ Dự án StockSpace

Tài liệu này liệt kê các kịch bản kiểm thử "Unhappy Path" (các trường hợp lỗi, vi phạm rule nghiệp vụ, phân quyền...) trên toàn hệ thống StockSpace.

---

## 🔐 1. Authentication & Authorization (Xác thực & Phân quyền)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| AUTH-01 | Đăng nhập sai mật khẩu quá 5 lần. | Tài khoản bị tạm khóa (nếu có cơ chế lockout) hoặc trả về `401 Unauthorized` liên tục. |
| AUTH-02 | Truy cập API `/api/admin/...` với token của `ROLE_TENANT` hoặc `ROLE_OWNER`. | Trả về lỗi `403 Forbidden` (Không có quyền truy cập). |
| AUTH-03 | Sử dụng JWT Token đã hết hạn để gọi API bảo mật. | Trả về lỗi `401 Unauthorized` (Token expired). |
| AUTH-04 | Đăng ký tài khoản với Email đã tồn tại trong hệ thống. | Trả về lỗi `400 Bad Request` (Email already exists). |

---

## 🏢 2. Warehouse Management (Quản lý Kho bãi - OWNER)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| WH-01 | Tạo kho mới nhưng bỏ trống các trường bắt buộc (Tên, Địa chỉ, Diện tích). | Lỗi validation `400 Bad Request` yêu cầu nhập đủ trường. |
| WH-02 | Tạo kho với giá tiền hoặc diện tích là số âm. | Lỗi validation `400 Bad Request` (Value must be positive). |
| WH-03 | Owner thiết lập Layout 3D (Racks/Bins) với toạ độ vượt ra ngoài kích thước (Width x Length) của kho. | Lỗi `400 Bad Request` (Layout dimensions exceed warehouse size). |
| WH-04 | Sửa thông tin kho khi kho đang có Hợp đồng thuê `ACTIVE`. | Trả về lỗi `400` không cho phép sửa thông tin trọng yếu (Diện tích, Giá) khi đang có người thuê. |
| WH-05 | Admin từ chối duyệt kho (Reject) nhưng không ghi lý do. | Lỗi `400 Bad Request` (Reason is required when rejecting). |

---

## 🤝 3. Booking & Contract (Thuê kho & Hợp đồng)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| BOOK-01 | Tenant gửi yêu cầu thuê (Booking) cho một kho đang ở trạng thái `INACTIVE` hoặc `RENTED`. | Lỗi `400 Bad Request` (Warehouse is not available for rent). |
| BOOK-02 | Tenant đặt ngày kết thúc thuê (endDate) nhỏ hơn ngày bắt đầu (startDate). | Lỗi validation `400 Bad Request`. |
| BOOK-03 | Owner chấp nhận Booking nhưng kho đã được người khác đặt cọc trước đó. | Lỗi `400` (Warehouse is no longer available). |
| BOOK-04 | Tenant thanh toán cọc (Deposit) nhưng số dư ví (Wallet Balance) không đủ. | Lỗi `400 Bad Request` (Insufficient balance). |
| BOOK-05 | Tenant cố gắng thanh toán cọc cho một Booking đã bị Owner từ chối (REJECTED). | Lỗi `400` (Booking status invalid for deposit). |
| CONT-01 | Chủ kho (Owner) yêu cầu hủy hợp đồng (Cancel Deal) nhưng không upload hình ảnh chứng minh. | Lỗi validation (Proof images required for cancellation). |

---

## 📦 4. Inventory & WMS (Quản lý Tồn kho & Phiếu kho)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| INV-01 | Tạo SKU với `skuCode` đã tồn tại trong cùng một Tenant. | Lỗi `400 Bad Request` (SKU Code already exists for this tenant). |
| INV-02 | Staff tạo Phiếu nhập (Inbound Receipt) vào một Kho mà Staff đó KHÔNG được phân công (assign). | Lỗi `403 Forbidden` (Staff not assigned to this warehouse). |
| INV-03 | Tenant cố gắng xuất kho (Outbound) số lượng lớn hơn số lượng tồn (Quantity) hiện có. | Lỗi `400 Bad Request` (Insufficient stock quantity). |
| INV-04 | Tạo phiếu xuất/nhập nhưng bỏ trống danh sách `items` (sản phẩm). | Lỗi validation `400` (Receipt must contain at least one item). |
| INV-05 | Staff gọi API lấy danh sách Tồn kho (Stock Overview) nhưng kho đó đã hết hạn hợp đồng thuê. | Lỗi `403 Forbidden` hoặc danh sách rỗng (No active contract). |
| INV-06 | Xoá một SKU đã có giao dịch nhập/xuất trong lịch sử. | Lỗi `400` (Cannot delete SKU with existing stock history), yêu cầu Disable thay vì Delete. |

---

## 💳 5. Wallet & Payment (Ví & Thanh toán)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| PAY-01 | Nạp tiền (Deposit) với số tiền <= 0. | Lỗi `400 Bad Request`. |
| PAY-02 | Rút tiền (Withdraw) số tiền lớn hơn số dư khả dụng (Available Balance). | Lỗi `400 Bad Request` (Insufficient balance for withdrawal). |
| PAY-03 | User gọi API rút tiền nhưng Admin cấu hình hệ thống đang bảo trì cổng thanh toán. | Lỗi `503 Service Unavailable`. |
| PAY-04 | User cố gắng thay đổi `amount` bằng cách can thiệp payload sau khi callback từ cổng thanh toán VNPay trả về. | BE kiểm tra chữ ký (Checksum/Hash) không khớp -> Lỗi `400 Bad Request` (Invalid signature), không cộng tiền. |

---

## ⚖️ 6. Dispute Management (Quản lý Tranh chấp)
| ID | Kịch bản (Scenario) | Kết quả mong đợi (Expected Result) |
|---|---|---|
| DISP-01 | Tenant mở tranh chấp (Raise Dispute) sau khi Hợp đồng đã hoàn thành (`COMPLETED`) hoặc huỷ (`CANCELLED`). | Lỗi `400 Bad Request` (Cannot open dispute for contract in current state). |
| DISP-02 | Owner cố mở tranh chấp trên một hợp đồng đã có tranh chấp đang xử lý (`OPEN`). | Lỗi `400 Bad Request` (Dispute already exists for this contract). |
| DISP-03 | Admin giải quyết tranh chấp (Resolve) nhưng không truyền vào `depositResolution` (hướng giải quyết cọc). | Lỗi validation `400`. |
| DISP-04 | Một user không liên quan (không phải Admin, không phải Tenant/Owner của hợp đồng đó) cố gọi API xem chi tiết tranh chấp. | Lỗi `403 Forbidden`. |
