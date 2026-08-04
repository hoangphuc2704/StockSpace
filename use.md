Sau khi đọc mã nguồn Backend của hệ thống (cụ thể là InventoryReceiptController, InventoryReceiptService, và TenantContextUtil), đây là lời giải thích chi tiết về cách hoạt động của luồng Inbound/Outbound đối với tài khoản STAFF và những điểm cần phải lưu ý để nối FE cho chuẩn xác:

1. Cơ chế xác thực Tenant của Staff dưới Backend
Khác với lúc đăng nhập bằng tài khoản TENANT (có sẵn ID), khi STAFF tạo hoặc duyệt phiếu Inbound/Outbound, hệ thống Backend sẽ tự động làm một bước ngầm:

Lấy userId của Staff từ JWT Token.
Truy vấn bảng tenant_members để tìm xem Staff này đang thuộc về Tenant nào (tenantMemberRepository.findByUserIdAnd...).
Sau đó, BE lấy tenantId đó để đi kiểm tra Gói dịch vụ (Subscription) và quyền truy cập kho. 👉 Ở phía Frontend: Bạn không cần phải truyền thêm bất kỳ tham số tenantId nào. Bạn cứ dùng Token của Staff gọi API y hệt như Tenant gọi API (dùng chung các file receiptApi.js, stockApi.js mà tôi vừa tạo).
2. Cách nối Inbound/Outbound cho FE
Quy trình thao tác của Staff trên trang Inbound/Outbound sẽ gồm các bước gọi API sau:

Bước 1: Lấy danh sách phiếu Nhập/Xuất Gọi receiptApi.getReceipts(warehouseId, { type: 'IN' }) để lấy danh sách.
Bước 2: Tạo phiếu mới Gọi receiptApi.createReceipt(data) với payload gồm warehouseId, danh sách skuId, zoneId, rackId, binId, và quantity.
Bước 3: Duyệt phiếu (Approve) Gọi receiptApi.approveReceipt(receiptId).
Tất cả các API này đều được BE đặt quyền @PreAuthorize("hasAnyRole('TENANT', 'STAFF')"), tức là Staff gọi vô tư mà không bị cản.

🚨 Vấn đề LỚN hiện tại giữa BE và FE (Cần chú ý)
Trong file InboundPage.jsx và OutboundPage.jsx hiện tại, để có được danh sách các kho (cho Staff chọn ở cục Dropdown), FE đang gọi API: tenantApi.getMyBookings()

Nhưng nếu bạn mở file TenantBookingController.java của BE lên, bạn sẽ thấy nó bị chặn bởi: @PreAuthorize("hasAnyRole('TENANT', 'ADMIN')")

Và file ContractController.java cũng bị chặn: @PreAuthorize("hasAnyRole('OWNER', 'TENANT', 'ADMIN')")

Hậu quả: Khi tài khoản STAFF vào trang Inbound/Outbound, hàm getMyBookings() sẽ trả về lỗi 403 Forbidden. Dropdown chọn kho sẽ trống rỗng, và Staff không có warehouseId để thực hiện các thao tác nhập xuất kho!

Cách giải quyết cho FE để nối cho khớp: Hiện tại BE CHƯA CÓ bất kỳ API nào cho phép STAFF lấy được danh sách kho (Warehouse) mà Tenant của họ đang thuê. 👉 Tạm thời ở FE: Bạn không thể nối trọn vẹn màn hình Inbound/Outbound cho Staff cho đến khi BE bổ sung một API kiểu như GET /api/tenant/my-warehouses với quyền @PreAuthorize("hasAnyRole('TENANT', 'STAFF')"). Bạn hãy báo lại với team Backend để họ bổ sung một API trả về danh sách các kho đã ký hợp đồng (ACTIVE) cho phép cả Tenant và Staff đều gọi được nhé!

