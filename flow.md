StockSpace — Tenant WMS APIs
Tài liệu này mô tả chi tiết các nhóm API WMS dành cho Tenant: quản lý sản phẩm, tồn kho, phiếu nhập/xuất, kiểm kê, subscriptions và staff.

1. Tenant — WMS Tenant Product Management
Các API quản lý Danh mục, SKU và Đơn vị tính (UOM) cho Tenant.

1.1 Danh mục sản phẩm (Categories)
GET /api/tenant/products/categories — Lấy danh sách danh mục sản phẩm (bao gồm danh mục đề xuất).

POST /api/tenant/products/categories — Tạo danh mục sản phẩm mới.

DELETE /api/tenant/products/categories/{id} — Xóa mềm danh mục (chỉ khi không có SKU liên kết).

Luồng sử dụng Categories (gợi ý nghiệp vụ)
Tenant xem danh sách danh mục hiện có để biết cấu trúc phân nhóm hàng.

Nếu cần nhóm mới, gọi POST /categories để tạo danh mục mới cho tổ chức.

Khi danh mục không còn sử dụng (và không gắn SKU nào), Tenant có thể xóa mềm bằng DELETE /categories/{id} để dọn dẹp dữ liệu.

1.2 SKU sản phẩm
GET /api/tenant/products/skus — Lấy danh sách SKU sản phẩm phân trang (bao gồm SKU đề xuất).

POST /api/tenant/products/skus — Tạo SKU sản phẩm mới.

GET /api/tenant/products/skus/{id} — Xem chi tiết SKU sản phẩm.

PUT /api/tenant/products/skus/{id} — Cập nhật SKU sản phẩm.

DELETE /api/tenant/products/skus/{id} — Xóa mềm SKU sản phẩm (chỉ khi không có lô StockBatch liên kết).

Luồng sử dụng SKU
Sau khi thiết lập danh mục, Tenant tạo SKU mới bằng POST /skus (gắn với category, UOM, các thuộc tính mô tả).

Tenant dùng GET /skus để tìm và quản lý SKU, và GET /skus/{id} để xem chi tiết từng SKU.

Khi có thay đổi thông tin (mô tả, mã, barcode…), dùng PUT /skus/{id} để cập nhật.

Nếu SKU không còn dùng và không có tồn kho (không gắn StockBatch), có thể xóa mềm bằng DELETE /skus/{id} để tránh rác dữ liệu.

1.3 Đơn vị tính (UOM)
GET /api/tenant/products/uoms — Lấy danh sách đơn vị tính (UOM).

Luồng sử dụng UOM
Khi tạo/cập nhật SKU, FE thường cần gọi GET /uoms để hiển thị danh sách đơn vị tính cho người dùng lựa chọn (thùng, kiện, pallet, …).

2. Tenant — WMS Stock Batch Management
Các API quản lý tồn kho lô hàng (Stock Batch) — xem tồn theo kho, theo SKU, theo batch và lịch sử giao dịch.

2.1 Endpoint danh sách và chi tiết tồn kho
GET /api/tenant/inventory/stock — Xem toàn bộ tồn kho trong kho đang thuê (phân trang theo warehouseId).

GET /api/tenant/inventory/stock/{batchId}/transactions — Xem lịch sử biến động số lượng của một lô hàng cụ thể.

GET /api/tenant/inventory/stock/sku/{skuId} — Xem tồn kho chi tiết theo SKU, tổng hợp mọi vị trí lưu trữ.

GET /api/tenant/inventory/stock/summary — Tổng hợp tồn kho theo SKU, lấy theo skuId.

2.2 Luồng sử dụng tồn kho (Stock Batch)
Tenant hoặc Staff tạo phiếu nhập/xuất (xem phần Receipt) làm thay đổi trạng thái tồn kho và tạo các StockBatch mới (ví dụ, mỗi lô nhập là một batch).

Để xem tồn hiện tại trong một kho, FE gọi GET /inventory/stock?warehouseId=... để hiển thị danh sách lô hàng, số lượng, vị trí.

Nếu cần xem lịch sử biến động của một batch (nhập, xuất, điều chỉnh), FE dùng GET /inventory/stock/{batchId}/transactions.

Để phân tích tồn theo SKU, dùng GET /inventory/stock/sku/{skuId} để xem chi tiết từng vị trí, và GET /inventory/stock/summary?skuId=... để lấy số tổng hợp.

3. Tenant — WMS Inventory Receipt Management
Các API quản lý phiếu nhập/xuất kho (Inventory Receipts) dành cho Tenant & Staff.

3.1 Endpoint phiếu nhập/xuất
GET /api/tenant/inventory/receipts — Lấy danh sách phiếu nhập/xuất kho, phân trang theo kho.

POST /api/tenant/inventory/receipts — Tạo phiếu nhập/xuất kho mới ở trạng thái PENDING.

GET /api/tenant/inventory/receipts/{id} — Xem chi tiết phiếu nhập/xuất kho.

PATCH /api/tenant/inventory/receipts/{id}/approve — Duyệt phiếu nhập/xuất kho (cập nhật tồn kho và ghi nhật ký giao dịch).

3.2 Luồng nghiệp vụ phiếu nhập/xuất
Khi có hoạt động nhập hàng vào kho hoặc xuất hàng ra khỏi kho, Staff/Tenant tạo phiếu mới bằng POST /inventory/receipts (gửi danh sách dòng hàng, SKU, số lượng, type = IN/OUT…).

Phiếu mới sẽ ở trạng thái PENDING, cho phép kiểm tra, sửa đổi trước khi chính thức áp dụng vào tồn kho.

Người có thẩm quyền (tenant admin/staff được phân quyền) dùng GET /inventory/receipts và GET /inventory/receipts/{id} để xem danh sách và chi tiết phiếu.

Sau khi xác nhận thông tin đúng, gọi PATCH /inventory/receipts/{id}/approve để duyệt phiếu, hệ thống tự động cộng/trừ tồn kho tương ứng và ghi InventoryTransaction lịch sử.

Ví dụ:

Nhập 100 đơn vị SKU A: tạo phiếu nhập (IN), sau khi approve, tồn kho SKU A tăng 100 ở kho tương ứng.

4. Tenant — WMS Inventory Audit
Các API quản lý phiếu kiểm kê (Inventory Audit) giúp đối chiếu giữa số liệu hệ thống và kiểm đếm thực tế.

4.1 Endpoint kiểm kê
GET /api/tenant/inventory/audits — Danh sách phiếu kiểm kê của Tenant (phân trang).

POST /api/tenant/inventory/audits — Tạo phiếu kiểm kê mới, tự động snapshot tồn kho hiện tại.

GET /api/tenant/inventory/audits/{id} — Xem chi tiết phiếu kiểm kê.

POST /api/tenant/inventory/audits/{id}/submit — Nộp kết quả kiểm đếm thực tế (điền actualQuantity cho từng dòng).

PATCH /api/tenant/inventory/audits/{id}/approve — Duyệt phiếu kiểm kê, tự động sinh phiếu điều chỉnh và cập nhật tồn kho.

PATCH /api/tenant/inventory/audits/{id}/reject — Từ chối phiếu kiểm kê.

4.2 Luồng kiểm kê tồn kho
Tenant tạo phiếu kiểm kê bằng POST /inventory/audits khi muốn kiểm tra tồn thực tế (ví dụ cuối tháng). Hệ thống snapshot tồn hiện tại theo StockBatch/SKU.

Nhân viên kho đi kiểm đếm thực tế, rồi nhập kết quả vào hệ thống thông qua POST /inventory/audits/{id}/submit, cho từng dòng audit (actualQuantity).

Người duyệt kiểm kê xem chi tiết bằng GET /inventory/audits/{id}, so sánh giữa snapshot và actual.

Nếu chấp nhận kết quả, gọi PATCH /inventory/audits/{id}/approve. Hệ thống sẽ tự động sinh các phiếu điều chỉnh (adjustment receipts/transactions) để đồng bộ tồn kho về số thực tế.

Nếu phát hiện lỗi hoặc không chấp nhận, dùng PATCH /inventory/audits/{id}/reject để từ chối phiếu (không điều chỉnh tồn).

5. Tenant — Subscriptions
Các API đăng ký và xem gói dịch vụ mà Tenant đang sử dụng.

5.1 Endpoint Subscriptions
POST /api/tenant/subscriptions — Đăng ký mua gói dịch vụ (purchase package).

GET /api/tenant/subscriptions/active — Xem thông tin gói dịch vụ đang hoạt động của Tenant.

5.2 Luồng sử dụng Subscriptions
Tenant chọn một gói dịch vụ từ danh sách public (xem ở nhóm Public — Packages) và gọi POST /tenant/subscriptions để đăng ký.

Hệ thống có thể kết nối với VNPay thông qua luồng thanh toán (VNPay Callback) để hoàn tất thanh toán cho gói dịch vụ.

Sau khi thanh toán thành công và gói có hiệu lực, Tenant dùng GET /tenant/subscriptions/active để hiển thị gói đang hoạt động (tên gói, hạn dùng, giới hạn tính năng, v.v.).

6. Tenant — Staff Management
Các API quản lý và mời nhân viên kho (Staff) cho tổ chức Tenant.

6.1 Endpoint Staff
GET /api/tenant/staffs — Xem danh sách nhân viên kho của tổ chức.

POST /api/tenant/staffs/invite — Mời nhân viên kho mới qua email.

DELETE /api/tenant/staffs/{memberId} — Xóa/sa thải nhân viên kho (soft delete).

6.2 Luồng sử dụng Staff
Tenant admin xem danh sách nhân viên kho bằng GET /tenant/staffs để quản lý ai đang có quyền vào WMS.

Khi cần thêm nhân viên, dùng POST /tenant/staffs/invite để gửi lời mời qua email. Nhân viên sẽ dùng các endpoint Authentication liên quan đến staff để nhận và chấp nhận lời mời.

Nếu nhân viên nghỉ việc hoặc chuyển công việc, Tenant admin gọi DELETE /tenant/staffs/{memberId} để sa thải (soft delete), không cho nhân viên đó truy cập WMS nữa nhưng vẫn giữ lịch sử giao dịch liên quan.

7. Tenant — Booking (liên quan đến thuê kho)
Dù bạn không yêu cầu trực tiếp trong tiêu đề, phần booking là luồng quan trọng kết nối với WMS nên ghi lại ngắn gọn để dễ hiểu luồng tổng thể.

7.1 Endpoint Booking cho Tenant
GET /api/tenant/bookings — Xem lịch sử yêu cầu thuê kho.

POST /api/tenant/bookings — Gửi yêu cầu thuê kho đến Owner.

DELETE /api/tenant/bookings/{id} — Huỷ yêu cầu thuê kho.

7.2 Luồng thuê kho gắn với WMS
Tenant tìm kiếm kho (Public — Warehouse), sau đó gửi yêu cầu thuê kho bằng POST /tenant/bookings.

Owner duyệt hoặc từ chối yêu cầu qua nhóm Owner — Booking. Nếu được duyệt và hợp đồng kích hoạt (Contract), Tenant có thể bắt đầu dùng WMS (sản phẩm, tồn kho, phiếu nhập/xuất, kiểm kê) cho kho đó.

Trước khi Owner xử lý, Tenant có thể huỷ yêu cầu bằng DELETE /tenant/bookings/{id} nếu không còn nhu cầu.

8. Luồng tổng hợp sử dụng Tenant WMS
Để dễ hình dung, dưới đây là một luồng điển hình từ lúc Tenant bắt đầu thuê kho đến khi vận hành WMS.

Tìm và thuê kho

Dùng Public — Warehouse để tìm kho, sau đó Tenant gửi yêu cầu thuê bằng POST /tenant/bookings.

Sau khi Owner duyệt và hợp đồng kích hoạt, Tenant có quyền vận hành WMS cho kho đó.

Thiết lập danh mục & SKU

Lấy UOM (GET /tenant/products/uoms) và tạo danh mục (POST /tenant/products/categories).

Tạo SKU sản phẩm (POST /tenant/products/skus) để chuẩn bị nhập hàng.

Nhập hàng và hình thành tồn kho

Staff/Tenant tạo phiếu nhập bằng POST /tenant/inventory/receipts với type IN.

Sau khi kiểm tra, duyệt phiếu bằng PATCH /tenant/inventory/receipts/{id}/approve để tạo StockBatch và tăng tồn kho.

Xuất hàng và theo dõi giao dịch

Khi xuất hàng, tạo phiếu OUT tương tự, duyệt bằng PATCH /tenant/inventory/receipts/{id}/approve.

Dùng GET /tenant/inventory/stock, GET /tenant/inventory/stock/sku/{skuId} và GET /tenant/inventory/stock/{batchId}/transactions để theo dõi tồn và lịch sử biến động.

Kiểm kê định kỳ và điều chỉnh

Tạo phiếu kiểm kê (POST /tenant/inventory/audits) để snapshot tồn hiện tại.

Nhập kết quả kiểm đếm (POST /tenant/inventory/audits/{id}/submit) và duyệt (PATCH /tenant/inventory/audits/{id}/approve) để tự động điều chỉnh tồn kho cho đúng thực tế.

Quản lý nhân sự và quyền sử dụng WMS

Tenant admin quản lý nhân viên kho bằng GET /tenant/staffs, POST /tenant/staffs/invite, DELETE /tenant/staffs/{memberId}.

Quản lý gói dịch vụ

Tenant đăng ký gói dịch vụ qua POST /tenant/subscriptions và dùng GET /tenant/subscriptions/active để kiểm tra gói đang dùng, ảnh hưởng đến giới hạn WMS.