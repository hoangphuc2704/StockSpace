
> **Hệ quản trị CSDL mục tiêu:** PostgreSQL 16+
> 
> **Cơ chế định danh chính:** Cấu trúc khóa chính sử dụng `UUIDv4` tự động sinh để đảm bảo tính phân tán và bảo mật.

## 📑 Các Kiểu Dữ Liệu Cố Định (Database Enums)

### 1. RoleType

Phân quyền người dùng trong hệ thống (Full RBAC).

- `ADMIN`: Quản trị viên toàn hệ thống.
    
- `OWNER`: Chủ kho bãi.
    
- `TENANT`: Người thuê kho / Chủ hàng hóa.
    
- `STAFF`: Nhân viên vận hành kho bãi (do Tenant thuê hoặc hệ thống cấp).
    
- `INSPECTOR`: Nhân viên kiểm định chất lượng kho bãi.
    

### 2. DocumentType

Phân loại chứng từ luân chuyển hàng hóa.

- `INBOUND`: Phiếu nhập kho hàng hóa.
    
- `OUTBOUND`: Phiếu xuất kho hàng hóa.
    

### 3. ApprovalStatus

Trạng thái phê duyệt các yêu cầu trong hệ thống.

- `PENDING`: Đang chờ duyệt.
    
- `APPROVED`: Đã phê duyệt.
    
- `REJECTED`: Từ chối phê duyệt.
    

### 4. ContractStatus

Trạng thái vòng đời của hợp đồng thuê kho bãi (Phase 1).

- `ACTIVE`: Hợp đồng đang có hiệu lực.
    
- `PENDING_HANDOVER`: Đang chờ bàn giao kho vật lý.
    
- `COMPLETED`: Hợp đồng đã kết thúc suôn sẻ.
    
- `DISPUTED`: Hợp đồng đang xảy ra tranh chấp tiền cọc.


### 5. WarehouseRole

Vai trò phân quyền vận hành WMS của Staff tại từng Kho cụ thể.

- `MANAGER`: Quản lý kho - Full quyền vận hành WMS, duyệt phiếu nhập/xuất & duyệt biên bản kiểm kê tại kho.
    
- `OPERATOR`: Nhân viên vận hành - Tạo & xử lý phiếu nhập/xuất kho.
    
- `INSPECTOR`: Nhân viên kiểm kê - Chuyên trách thực hiện đếm & lập biên bản kiểm kê tồn kho.


### 6. AssignmentStatus

Trạng thái hiệu lực của việc phân công nhân viên tại từng kho.

- `ACTIVE`: Đang được phân công làm việc tại kho.
    
- `REVOKED`: Đã bị thu hồi phân công kho / Staff nghỉ việc.
    
- `EXPIRED`: Đã hết hạn thời gian phân công.


## 🛠️ Chi Tiết Các Bảng Dữ Liệu Theo Phân Hệ

### Cụm 1: Cấu Hình Hệ Thống & Cam Kết (System Config & Policies)

#### Bảng: `System_Config`

_Lưu trữ các tham số cấu hình động toàn hệ thống dưới dạng Key-Value (Tránh hardcode)._

- `id` (UUID, PK): Mã định danh cấu hình.
    
- `config_key` (VARCHAR(100), UNIQUE, NOT NULL): Tên tham số cấu hình. Giới hạn các Key bằng Registry Enum cứng ở tầng BE:
  - `deposit_percentage` (Tỷ lệ cọc, mặc định `10`, giới hạn `[0-100]`)
  - `contract_expiry_days` (Hạn duyệt hợp đồng, mặc định `7`, giới hạn `> 0`)
  - `inspection_fee` (Phí kiểm định kho, mặc định `100000`, giới hạn `>= 0`)
  - `warehouse_publish_package_id` (Gói đăng bài mặc định, FK $\rightarrow$ `Service_Package.id`)
    
- `config_value` (TEXT, NOT NULL): Giá trị cấu hình tương ứng.
    
- `description` (TEXT): Mô tả chức năng của cấu hình.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.
    
*Ghi chú: Ở tầng ứng dụng Backend, các cấu hình `deposit_percentage`, `contract_expiry_days`, và `inspection_fee` được đánh dấu là PUBLIC (công khai) để bất kỳ người dùng nào (bao gồm cả khách vãng lai) đều có thể truy vấn trực tiếp qua API `GET /api/configs` mà không cần token xác thực.*
    

#### Bảng: `System_Policy`

_Lưu trữ nội dung bản cam kết ràng buộc Phase 1 dùng để phân xử tranh chấp cọc._

- `id` (UUID, PK): Mã phiên bản cam kết.
    
- `version` (VARCHAR(50), UNIQUE, NOT NULL): Số hiệu phiên bản (Ví dụ: `v1.0`).
    
- `content` (TEXT, NOT NULL): Toàn bộ nội dung điều khoản cam kết.
    
- `created_at` (TIMESTAMP): Thời gian ban hành.
    
- `is_active` (BOOLEAN): Trạng thái hiệu lực của phiên bản cam kết này.
    

### Cụm 2: Tài Khoản, Ví Tiền & Thông Báo (Identity, Finance & Notification)

#### Bảng: `User`

_Bảng gốc trung tâm chứa thông tin định danh của tất cả các vai trò trong hệ thống._

- `id` (UUID, PK): Mã tài khoản người dùng.
    
- `email` (VARCHAR(255), UNIQUE, NOT NULL): Email đăng nhập hệ thống.
    
- `password` (VARCHAR(255), NOT NULL): Mật khẩu đã được mã hóa (BCrypt).
    
- `full_name` (VARCHAR(100), NOT NULL): Họ và tên người dùng.
    
- `phone` (VARCHAR(20)): Số điện thoại liên hệ.
    
- `provider` (VARCHAR(20), NOT NULL, DEFAULT 'LOCAL'): Phương thức đăng nhập (`LOCAL`, `GOOGLE`).
    
- `avatar_url` (VARCHAR(500), NULL): Đường dẫn ảnh đại diện (lấy từ Google OAuth).
    
- `is_active` (BOOLEAN): Trạng thái hoạt động của tài khoản.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.
    
- **Indexes:** `email` (Tối ưu tốc độ đăng nhập/xác thực JWT).

#### Bảng: `Role`

_Lưu danh sách vai trò hệ thống, hỗ trợ cấu hình động bởi Admin._

- `id` (UUID, PK): Mã vai trò.
- `name` (VARCHAR(100), UNIQUE, NOT NULL): Tên vai trò (Ví dụ: `ROLE_ADMIN`, `ROLE_OWNER`, `ROLE_TENANT`, `ROLE_STAFF`, `ROLE_INSPECTOR`).
- `description` (VARCHAR(255)): Mô tả chức năng vai trò.
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.

#### Bảng: `Permission`

_Lưu trữ danh sách các quyền hạn thao tác chi tiết (Ví dụ: `READ_WAREHOUSE`, `CREATE_CONTRACT`)._

- `id` (UUID, PK): Mã quyền hạn.
- `name` (VARCHAR(100), UNIQUE, NOT NULL): Tên quyền.
- `description` (VARCHAR(255)): Mô tả chi tiết quyền.
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.

#### Bảng: `Tenant_Member` (Membership pattern)

_Liên kết các tài khoản STAFF với Tenant tương ứng. Đảm bảo 1 email chỉ có duy nhất 1 danh tính (User), nhưng có thể chuyển dịch hoặc tham gia làm Staff cho các Tenant khác nhau theo thời gian._

- `id` (UUID, PK): Mã liên kết thành viên.
- `user_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Staff.
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Tenant sở hữu/quản lý.
- `is_active` (BOOLEAN, DEFAULT true): Trạng thái hoạt động (bị khóa khi Tenant hạ gói dịch vụ / hết subscription).
- `is_deleted` (BOOLEAN, DEFAULT false): Trạng thái xóa mềm (giữ lại để đảm bảo tính toàn vẹn của lịch sử các phiếu xuất/nhập kho cũ do Staff này tạo).
- `joined_at` (TIMESTAMP): Thời gian Staff chấp nhận lời mời và chính thức gia nhập tổ chức.
- `resigned_at` (TIMESTAMP, NULLABLE): Thời điểm Staff chính thức nghỉ việc / dừng công tác tại Tenant.
- **Constraints:** UNIQUE(`user_id`, `tenant_id`) - Một Staff chỉ có một quan hệ thành viên với Tenant cụ thể.
- **Indexes:** `tenant_id` (Tải nhanh danh sách Staff của Tenant), `user_id` (Kiểm tra nhanh Staff thuộc Tenant nào khi login).

#### Bảng: `Staff_Warehouse_Assignment` (`staff_warehouse_assignments`)

_Lưu vết phân công công tác chi tiết của Nhân viên (Staff) tại từng Kho bãi cụ thể theo mốc thời gian, vai trò WMS và chức danh tùy chỉnh._

- `id` (UUID, PK): Mã bản ghi phân công kho.
- `staff_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Nhân viên kho được phân công.
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Doanh nghiệp (Tenant) sở hữu hợp đồng thuê kho.
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): ID của Kho bãi được phân công làm việc.
- `role` (VARCHAR(50), NOT NULL): Enum `WarehouseRole` (`MANAGER`, `OPERATOR`, `INSPECTOR`) định nghĩa phân quyền WMS tại kho.
- `custom_title` (VARCHAR(150), NULLABLE): Chức danh hiển thị nội bộ do Tenant tự nhập (vd: "Thủ kho Ca 1", "Quản lý kho lạnh").
- `assigned_by` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Tenant / Quản trị viên thực hiện gán kho.
- `start_date` (TIMESTAMP, NOT NULL): Thời điểm bắt đầu phân công công tác tại kho.
- `end_date` (TIMESTAMP, NULLABLE): Thời điểm kết thúc / thu hồi phân công (null = đang hoạt động vô thời hạn).
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'ACTIVE'): Enum `AssignmentStatus` (`ACTIVE`, `REVOKED`, `EXPIRED`).
- `notes` (VARCHAR(500), NULLABLE): Ghi chú lý do / phạm vi phân công.
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật bản ghi.
- **Indexes:** `staff_id`, `tenant_id`, `warehouse_id`, `status` (Tối ưu tốc độ kiểm tra quyền và truy vấn kho phân công).

#### Bảng: `Staff_Invitation`


_Lưu trữ lời mời nhân viên chưa kích hoạt gửi qua email._

- `id` (UUID, PK): Mã lời mời.
- `email` (VARCHAR(255), NOT NULL): Email của người nhận lời mời.
- `full_name` (VARCHAR(150), NOT NULL): Họ tên đầy đủ (do Tenant nhập khi mời).
- `phone` (VARCHAR(20)): Số điện thoại (tùy chọn).
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID của Tenant gửi lời mời.
- `token` (VARCHAR(255), UNIQUE, NOT NULL): Token ngẫu nhiên (UUID) đính kèm trong link email để xác thực.
- `expires_at` (TIMESTAMP, NOT NULL): Thời hạn hết hạn của lời mời (mặc định 48 giờ kể từ khi tạo).
- `status` (VARCHAR(20), NOT NULL): Trạng thái lời mời (`PENDING`, `ACCEPTED`, `EXPIRED`).
- `created_at` (TIMESTAMP): Thời gian gửi lời mời.
- **Constraints:** UNIQUE(`token`).
- **Indexes:** `token` (Xác thực khi click link), `tenant_id` (Thống kê số lượng lời mời của Tenant).

#### Bảng: `User_Role` (Bảng trung gian Nhiều-Nhiều)

- `user_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): ID người dùng.
- `role_id` (UUID, FK $\rightarrow$ `Role.id`, NOT NULL): ID vai trò.

#### Bảng: `Role_Permission` (Bảng trung gian Nhiều-Nhiều)

- `role_id` (UUID, FK $\rightarrow$ `Role.id`, NOT NULL): ID vai trò.
- `permission_id` (UUID, FK $\rightarrow$ `Permission.id`, NOT NULL): ID quyền hạn.
    

#### Bảng: `Notification`

_Lưu lịch sử thông báo phục vụ luồng thông báo thời gian thực qua WebSockets._

- `id` (UUID, PK): Mã thông báo.
    
- `user_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Người nhận thông báo.
    
- `title` (VARCHAR(255), NOT NULL): Tiêu đề thông báo.
    
- `message` (TEXT, NOT NULL): Nội dung chi tiết thông báo.
    
- `type` (VARCHAR(50), NOT NULL): Phân loại (SYSTEM, RENTAL, PAYMENT, WMS).
    
- `is_read` (BOOLEAN, DEFAULT false): Trạng thái đã đọc hay chưa.
    
- `created_at` (TIMESTAMP): Thời gian gửi thông báo.
    
- **Indexes:** `user_id` (Tối ưu tốc độ tải danh sách thông báo của User).
    

#### Bảng: `Wallet`

_Quản lý số dư tài khoản bằng điểm Credit ảo nội bộ._

- `id` (UUID, PK): Mã ví.
    
- `user_id` (UUID, FK $\rightarrow$ `User.id`, UNIQUE, NOT NULL): Khách hàng sở hữu ví.
    
- `balance` (DECIMAL(15,2), DEFAULT 0.00): Số dư điểm credit hiện tại.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật ví.
    

#### Bảng: `Transaction`

_Sổ cái ghi nhận toàn bộ biến động tiền tệ (Nạp, Rút, Cọc, Hoàn tiền, Mua gói VIP)._

- `id` (UUID, PK): Mã giao dịch.
    
- `wallet_id` (UUID, FK $\rightarrow$ `Wallet.id`, NOT NULL): Ví thực hiện giao dịch.
    
- `subscription_id` (UUID, FK $\rightarrow$ `Subscription.id`, NULL): Liên kết nếu là giao dịch mua gói dịch vụ.
    
- `booking_id` (UUID, FK $\rightarrow$ `Booking_Request.id`, NULL): Liên kết nếu là giao dịch đặt cọc thuê kho.
    
- `amount` (DECIMAL(15,2), NOT NULL): Số tiền biến động (Luôn lưu số dương).
    
- `transaction_type` (VARCHAR(50), NOT NULL): Loại giao dịch (`DEPOSIT`, `HOLD_DEPOSIT`, `RELEASE_DEPOSIT`, `REFUND`, `WITHDRAW`, `UPGRADE_VIP`).
    
- `payment_method` (VARCHAR(50), NOT NULL): Phương thức giao dịch (`CREDIT`, `BANK_TRANSFER`).
    
- `created_at` (TIMESTAMP): Thời gian thực hiện giao dịch.
    
- **Indexes:** `wallet_id` (Tối ưu tốc độ tải lịch sử giao dịch của ví).
    

#### Bảng: `Withdraw_Request`

_Quản lý yêu cầu rút tiền từ ví credit ảo về tài khoản ngân hàng thực tế, đợi Admin duyệt._

- `id` (UUID, PK): Mã yêu cầu rút tiền.
    
- `user_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Người gửi yêu cầu rút tiền.
    
- `transaction_id` (UUID, FK $\rightarrow$ `Transaction.id`, UNIQUE, NULL): Liên kết với dòng transaction trừ tiền ví sau khi được Admin duyệt.
    
- `amount` (DECIMAL(15,2), NOT NULL): Số tiền yêu cầu rút.
    
- `bank_name` (VARCHAR(100), NOT NULL): Tên ngân hàng nhận tiền.
    
- `bank_account_number` (VARCHAR(50), NOT NULL): Số tài khoản ngân hàng.
    
- `bank_account_holder` (VARCHAR(100), NOT NULL): Tên chủ tài khoản ngân hàng.
    
- `status` (ApprovalStatus, DEFAULT 'PENDING'): Trạng thái xử lý yêu cầu.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo yêu cầu và thời gian xử lý.
    

#### Bảng: `Service_Package`

_Định nghĩa các gói dịch vụ do nền tảng cung cấp._

- `id` (UUID, PK): Mã gói dịch vụ.
    
- `name` (VARCHAR(100), NOT NULL): Tên gói (Ví dụ: Gói Standard, Gói VIP).
    
- `features` (TEXT): Lưu cấu hình giới hạn hệ thống dưới dạng JSON hoặc mô tả.
    
- `price` (DECIMAL(15,2), DEFAULT 0.00): Giá gói dịch vụ.
    
- `duration_days` (INT, NOT NULL, DEFAULT 30): Thời hạn sử dụng của gói (tính theo ngày).
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật gói.
    

#### Bảng: `Subscription`

_Quản lý thời hạn và trạng thái sử dụng gói dịch vụ của Tenant._

- `id` (UUID, PK): Mã lượt đăng ký gói.
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Người mua gói dịch vụ.
    
- `package_id` (UUID, FK $\rightarrow$ `Service_Package.id`, NOT NULL): Gói dịch vụ được chọn mua.
    
- `start_date` (TIMESTAMP, NOT NULL): Ngày bắt đầu kích hoạt gói.
    
- `end_date` (TIMESTAMP, NOT NULL): Ngày hết hạn gói dịch vụ.
    
- `status` (VARCHAR(50), DEFAULT 'ACTIVE'): Trạng thái sử dụng (`ACTIVE`, `EXPIRED`).
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian mua và cập nhật gói.
    
- **Indexes:** `tenant_id` (Kiểm tra nhanh xem Tenant hiện tại có gói dịch vụ hợp lệ không).
    

### Cụm 3: Hạ Tầng Không Gian Kho Bãi (Warehouse Infrastructure)

#### Bảng: `Warehouse_Type`

_Danh mục phân loại cấu trúc kho vật lý._

- `id` (SERIAL, PK): Mã loại kho.
    
- `name` (VARCHAR(100), UNIQUE, NOT NULL): Tên loại kho (Ví dụ: Kho lạnh, Kho khô, Kho bãi đất trống).
    
- `description` (TEXT): Mô tả chi tiết đặc thù loại kho.
    

#### Bảng: `Warehouse`

_Thông tin tổng quan của kho bãi do Owner đăng ký và vận hành kinh doanh._

- `id` (UUID, PK): Mã kho bãi.
    
- `owner_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Chủ sở hữu kho bãi (Owner).
    
- `type_id` (INT, FK $\rightarrow$ `Warehouse_Type.id`, NOT NULL): Phân loại kho.
    
- `name` (VARCHAR(255), NOT NULL): Tên kho bãi hiển thị trên bài đăng.
    
- `address` (TEXT, NOT NULL): Địa chỉ vật lý chính xác của kho.
    
- `capacity` (DECIMAL(10,2), NOT NULL): Tổng dung tích hoặc diện tích mặt sàn của kho bãi.
    
- `price_per_month` (DECIMAL(15,2), NOT NULL): Giá thuê kho cố định hàng tháng.
    
- `is_verified` (BOOLEAN, DEFAULT false): Đánh dấu kho bãi đã qua kiểm định thực tế chưa.
    
- `status` (VARCHAR(50), DEFAULT 'AVAILABLE'): Trạng thái kinh doanh (`AVAILABLE`, `PENDING_DEPOSIT`, `RENTED`, `MAINTENANCE`).
    
- `policy_version_id` (UUID, FK $\rightarrow$ `System_Policy.id`, NOT NULL): Phiên bản luật cam kết áp dụng tại thời điểm đăng bài.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo bài và cập nhật thông tin kho.
    
- **Indexes:** `owner_id`, `status` (Tối ưu tìm kiếm bài đăng theo chủ kho và lọc kho trống trên sàn).
    

#### Bảng: `Warehouse_Layout`

_Bản vẽ thiết kế sơ đồ lưới 2D/3D của kho bãi._

- `id` (UUID, PK): Mã sơ đồ layout.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Sơ đồ thuộc về kho vật lý nào.
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NULL): Chủ sở hữu layout. Nhận giá trị `NULL` nếu đây là sơ đồ mặc định (Default) của Owner. Chứa ID nếu là bản sao tinh chỉnh cá nhân (Clone) của Tenant.
    
- `is_default` (BOOLEAN, DEFAULT true): Xác định đây có phải bản sơ đồ gốc hay không.
    
- `width` / `length` / `height` (INT, DEFAULT 100): Kích thước chiều rộng (X-axis), chiều dài (Y-axis), chiều cao (Z-axis) của bản vẽ không gian tổng thể.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian thiết lập sơ đồ.
    

#### Bảng: `Warehouse_Rack`

_Hạ tầng các Kệ hàng đặt trực tiếp trên mặt bằng Layout (Cấp độ 1 trong mô hình 3 tầng)._

- `id` (UUID, PK): Mã kệ hàng.
    
- `layout_id` (UUID, FK $\rightarrow$ `Warehouse_Layout.id`, NOT NULL): Kệ nằm trong bản vẽ layout nào.
    
- `zone_name` (VARCHAR(100), NULL): Tên phân khu chức năng (Ví dụ: Khu Lạnh A, Khu Hàng Khô).
    
- `zone_code` (VARCHAR(50), NULL): Mã định danh phân khu (Ví dụ: `ZONE_COLD_A`).
    
- `name` (VARCHAR(100), NOT NULL): Tên kệ (Ví dụ: Kệ số 01).
    
- `code` (VARCHAR(50), NOT NULL): Mã định danh kệ (Ví dụ: `RACK_A1`).
    
- `max_weight` / `max_volume` (DECIMAL(10,2)): Giới hạn sức chứa chi tiết của riêng kệ hàng này.
    
- `coordinate_x` / `coordinate_y` / `position_z` (INT): Tọa độ không gian 3D ($x, y, z$) trên mặt phẳng kho.
    
- `rotation` (INT, DEFAULT 0): Góc xoay của kệ (`0°`, `90°`, `180°`, `270°`) để xoay ngang/dọc trên 2D & 3D Canvas.
    
- `width` / `length` / `height` (INT): Kích thước 3 chiều của kệ hàng.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.
    

#### Bảng: `Warehouse_Bin`

_Chi tiết các Ô chứa nhỏ/Tầng kệ nằm trên một Rack (Cấp độ 2 - Cấp độ lưu trữ hàng sâu nhất)._

- `id` (UUID, PK): Mã ô chứa.
    
- `rack_id` (UUID, FK $\rightarrow$ `Warehouse_Rack.id`, NOT NULL): Ô chứa thuộc về dãy kệ nào.
    
- `shelf_level` (INT, DEFAULT 1): Thứ tự tầng kệ của ô chứa (Tầng 1, Tầng 2, Tầng 3...).
    
- `name` (VARCHAR(100), NOT NULL): Tên ô chứa (Ví dụ: Ô A1-Tầng 1).
    
- `code` (VARCHAR(50), NOT NULL): Mã định danh ô chứa để dán nhãn (Ví dụ: `BIN_A1_01`).
    
- `max_weight` / `max_volume` (DECIMAL(10,2)): Giới hạn sức chứa chi tiết của riêng ô chứa này.
    
- `coordinate_x` / `coordinate_y` / `position_z` (INT): Tọa độ tương đối ($x, y, z$) trên kệ chứa nó.
    
- `width` / `length` / `height` (INT): Kích thước 3 chiều của ô chứa.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật ô chứa.
    

#### Bảng: `Inspection_Report`

_Biên bản kiểm định chất lượng thực tế do Inspector lập cho kho bãi._

- `id` (UUID, PK): Mã biên bản kiểm định.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Kho bãi được tiến hành kiểm định.
    
- `inspector_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Thanh tra viên thực hiện nhiệm vụ.
    
- `checklist_data` (JSONB, NOT NULL): Lưu cấu trúc danh mục kiểm đếm thực tế (Các tiêu chí đạt/không đạt).
    
- `status` (VARCHAR(50), NOT NULL): Kết quả đánh giá cuối cùng (`PASSED`, `FAILED`).
    
- `notes` (TEXT): Ghi chú bổ sung hoặc lý do nếu kho bị đánh giá không đạt tiêu chí hệ thống.
    
- `inspected_at` (TIMESTAMP, DEFAULT now()): Ngày giờ hoàn tất quá trình thanh tra kho.
    

### Cụm 4: Giao Dịch Thuê Kho & Escrow Tranh Chấp (Leasing Management - Phase 1)

#### Bảng: `Booking_Request`

_Yêu cầu đặt cọc giữ chỗ kho bãi do Tenant khởi tạo._

- `id` (UUID, PK): Mã yêu cầu đặt thuê.
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Người đi thuê kho gửi yêu cầu.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Kho bãi đang được nhắm tới để thuê.
    
- `deposit_amount` (DECIMAL(15,2), NOT NULL): Số tiền cọc 10% bị đóng băng giữ ở ví hệ thống.
    
- `status` (ApprovalStatus, DEFAULT 'PENDING'): Trạng thái phê duyệt yêu cầu đặt chỗ.
    
- `policy_version_id` (UUID, FK $\rightarrow$ `System_Policy.id`, NOT NULL): Bản cam kết Tenant đã ấn chọn đồng ý trước khi xuống tiền cọc.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật yêu cầu.
    

#### Bảng: `Rental_Contract`

_Hợp đồng số chính thức ghi nhận giao dịch thành công giữa hai bên, làm căn cứ kích hoạt Phase 2._

- `id` (UUID, PK): Mã hợp đồng số hệ thống.
    
- `booking_id` (UUID, FK $\rightarrow$ `Booking_Request.id`, UNIQUE, NOT NULL): Tham chiếu duy nhất đến yêu cầu đặt thuê thành công trước đó.
    
- `tenant_confirmation` (VARCHAR(50), DEFAULT 'PENDING'): Trạng thái xác nhận từ Tenant (`PENDING`, `SUCCESS`, `FAILED`).
    
- `owner_confirmation` (VARCHAR(50), DEFAULT 'PENDING'): Trạng thái xác nhận từ Owner (`PENDING`, `SUCCESS`, `FAILED`).
    
- `paper_contract_images` (JSONB, NOT NULL): Mảng chứa danh sách các link hình ảnh chụp lại bản hợp đồng giấy thật được ký kết bên ngoài.
    
- `status` (ContractStatus, DEFAULT 'ACTIVE'): Trạng thái vận hành hiện tại của hợp đồng thuê.
    
- `start_date` (TIMESTAMP, NOT NULL): Ngày hợp đồng bắt đầu tính thời gian thuê.
    
- `end_date` (TIMESTAMP, NOT NULL): Ngày kết thúc thời hạn thuê kho.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian lập hợp đồng online và thời gian cập nhật.
    

#### Bảng: `Dispute_Ticket`

_Vé phạt/Tranh chấp do các bên gửi lên khi giao dịch gặp sự cố lệch cam kết, đợi Inspector phân xử cọc._

- `id` (UUID, PK): Mã sự vụ tranh chấp.
    
- `contract_id` (UUID, FK $\rightarrow$ `Rental_Contract.id`, UNIQUE, NOT NULL): Tranh chấp thuộc hợp đồng thuê nào.
    
- `raised_by` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Người chủ động gửi khiếu nại (Tenant hoặc Owner).
    
- `handled_by` (UUID, FK $\rightarrow$ `User.id`, NULL): ID của Admin hoặc Inspector được phân công đứng ra giải quyết tranh chấp này.
    
- `reason` (TEXT, NOT NULL): Lý do chi tiết xảy ra mâu thuẫn giao dịch.
    
- `evidence_images` (JSONB): Mảng chứa link ảnh bằng chứng vi phạm hợp đồng (Hóa đơn, tin nhắn, ảnh kho sai thực tế...).
    
- `status` (VARCHAR(50), DEFAULT 'OPEN'): Trạng thái xử lý tranh chấp (`OPEN`, `RESOLVED`).
    
- `created_at` (TIMESTAMP, DEFAULT now()): Thời điểm ghi nhận sự vụ khiếu nại lên hệ thống.
    

### Cụm 5: Quản Lý Vận Hành Xuất Nhập Tồn (WMS - Phase 2)

#### Bảng: `Unit_Of_Measure`

_Đơn vị tính toán số lượng tồn kho sản phẩm (Ví dụ: Kilogram, Mét, Thùng, Hộp, Cái, Bao...) phục vụ đặc thù nhiều loại mặt hàng khác nhau._

- `id` (UUID, PK): Mã đơn vị tính.
    
- `name` (VARCHAR(50), NOT NULL): Tên đơn vị tính (Ví dụ: `Kilogram`, `Thùng`, `Cái`, `Bao`).
    
- `code` (VARCHAR(20), UNIQUE, NOT NULL): Kí hiệu mã đơn vị (Ví dụ: `KG`, `CTN`, `PCS`, `BAG`).
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NULL): Tenant sở hữu đơn vị này. Nếu `NULL` thì đây là đơn vị mặc định hệ thống cấp sẵn mà mọi Tenant đều sử dụng được.
    
- `description` (VARCHAR(255)): Mô tả thêm về đơn vị tính.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian tạo và cập nhật.
    

#### Bảng: `Product_Category`

_Danh mục nhóm các mặt hàng hóa lưu trữ, chứa cấu hình form thuộc tính gợi ý._

- `id` (UUID, PK): Mã danh mục sản phẩm.
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NULL): Tenant sở hữu danh mục phân loại này (Để trống `NULL` nếu là danh mục đề xuất chung của hệ thống).
    
- `name` (VARCHAR(255), NOT NULL): Tên danh mục (Ví dụ: Linh kiện điện tử, Đồ gia dụng).
    
- `default_attributes` (JSONB): Mảng các trường thông tin quy chuẩn gợi ý sẵn (Ví dụ: `["voltage", "wattage", "brand"]`).
    
- `created_at` (TIMESTAMP, DEFAULT now()): Thời gian tạo danh mục.
    

#### Bảng: `Product_SKU`

_Mã định danh hàng hóa chi tiết theo thuộc tính kỹ thuật của từng Tenant._

- `id` (UUID, PK): Mã biến thể sản phẩm hệ thống.
    
- `tenant_id` (UUID, FK $\rightarrow$ `User.id`, NULL): Tenant sở hữu mặt hàng này (Để trống `NULL` nếu đây là SKU đề xuất chung của hệ thống).
    
- `category_id` (UUID, FK $\rightarrow$ `Product_Category.id`, NULL): Thu thuộc danh mục gợi ý nào (Có thể Null nếu là hàng vãng lai).
    
- `sku_code` (VARCHAR(100), NOT NULL): Mã SKU thực tế dùng để quét mã định vị hàng hóa (Ví dụ: `ELE-SONY-220V`).
    
- `name` (VARCHAR(255), NOT NULL): Tên thương mại của sản phẩm.
    
- `uom_id` (UUID, FK $\rightarrow$ `Unit_Of_Measure.id`, NOT NULL): Khóa ngoại tham chiếu đến đơn vị tính xác định cho SKU này.
    
- `specifications` (JSONB): Cục dữ liệu lưu giá trị thực tế của các thuộc tính (Ví dụ: `{"voltage": "220V", "wattage": "50W", "brand": "Sony"}`).
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian định nghĩa hàng hóa.
    
- **Indexes & Constraints:**
    - Chỉ mục duy nhất toàn cục khi `tenant_id` trống: `sku_code` (khi `tenant_id IS NULL`).
    - Chỉ mục duy nhất theo Tenant: `tenant_id` + `sku_code` (khi `tenant_id IS NOT NULL`).
    - `tenant_id`, `sku_code` để tìm hàng nhanh khi nhập xuất.
    

#### Bảng: `Stock_Batch`

_Lô hàng tồn kho thực tế lưu trữ tại kho bãi, là hạt nhân tính toán luồng xuất hàng FIFO._

- `id` (UUID, PK): Mã lô hàng tồn kho.
    
- `sku_id` (UUID, FK $\rightarrow$ `Product_SKU.id`, NOT NULL): Lô hàng thuộc mã sản phẩm nào.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Đang lưu giữ tại kho bãi nào.
    
- `rack_id` (UUID, FK $\rightarrow$ `Warehouse_Rack.id`, NULL): Mã định vị Kệ nếu hàng xếp lên kệ chung (Chưa chia ô).
    
- `bin_id` (UUID, FK $\rightarrow$ `Warehouse_Bin.id`, NULL): Mã định vị Ô chứa chi tiết (Cấp độ lưu trữ tối ưu nhất).
    
- `quantity` (INT, NOT NULL, DEFAULT 0): Số lượng hàng hiện tại còn lại trong lô này.
    
- `arrival_date` (TIMESTAMP, NOT NULL): Ngày hàng cập bến vào kho thực tế (Dùng làm điều kiện quét thuật toán xuất hàng FIFO).
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian ghi nhận lô hàng.
    
- **Indexes:** `sku_id`, `warehouse_id`, `arrival_date` (Đặc biệt quan trọng: Sắp xếp chỉ mục `arrival_date` để truy vấn xuất hàng theo thứ tự thời gian cũ nhất cực nhanh).
    

#### Bảng: `Inventory_Receipt`

_Chứng từ tổng ghi nhận giao dịch Nhập kho (Inbound) hoặc Xuất kho (Outbound) (gồm cả phiếu tự động sinh để điều chỉnh chênh lệch sau kiểm kê)._

- `id` (UUID, PK): Mã phiếu xuất nhập kho.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Thực hiện giao dịch tại kho bãi nào.
    
- `created_by` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Nhân viên kho (Staff) chịu trách nhiệm kiểm đếm và lập phiếu tại hiện trường.
    
- `type` (DocumentType, NOT NULL): Bản chất giao dịch chứng từ (`INBOUND` hoặc `OUTBOUND`).
    
- `signature_data` (TEXT): Lưu trữ ảnh chữ ký tay số hóa dạng Base64 của nhân viên để đối soát trách nhiệm pháp lý khi thất thoát.
    
- `status` (ApprovalStatus, DEFAULT 'PENDING'): Trạng thái phê duyệt chứng từ thực thi thành công.
    
- `reference_id` (UUID, FK $\rightarrow$ `Inventory_Audit.id`, NULL): Tham chiếu đến phiếu kiểm kê kho gốc. Cột này có giá trị khi phiếu nhập/xuất này được sinh tự động bởi hệ thống để cân bằng chênh lệch thừa/thiếu phát hiện trong quá trình kiểm kê.
    
- `created_at` (TIMESTAMP, DEFAULT now()): Thời điểm lập phiếu chứng từ kho.
    

#### Bảng: `Inventory_Receipt_Item`

_Chi tiết từng dòng sản phẩm và số lượng tương ứng trong Phiếu xuất nhập kho._

- `id` (UUID, PK): Mã dòng chi tiết phiếu.
    
- `receipt_id` (UUID, FK $\rightarrow$ `Inventory_Receipt.id`, NOT NULL): Thuộc về phiếu xuất nhập kho nào.
    
- `sku_id` (UUID, FK $\rightarrow$ `Product_SKU.id`, NOT NULL): Mã SKU sản phẩm.
    
- `quantity` (INT, NOT NULL): Số lượng yêu cầu xuất/nhập.
    
- `rack_id` (UUID, FK $\rightarrow$ `Warehouse_Rack.id`, NOT NULL): Vị trí kệ chỉ định (bắt buộc chọn khi nhập/xuất).
    
- `bin_id` (UUID, FK $\rightarrow$ `Warehouse_Bin.id`, NOT NULL): Vị trí ô chứa chỉ định (bắt buộc chọn khi nhập/xuất).
    
- `note` (TEXT): Ghi chú cho dòng hàng.
    

#### Bảng: `Inventory_Transaction`

_Sổ cái nhật ký ghi lại toàn bộ lịch sử biến động chi tiết tăng/giảm số lượng của từng Lô hàng (Thẻ kho)._

- `id` (UUID, PK): Mã nhật ký biến động.
    
- `receipt_id` (UUID, FK $\rightarrow$ `Inventory_Receipt.id`, NOT NULL): Phiếu Nhập/Xuất kho (gồm cả phiếu tự động sinh từ kiểm kê) gây ra biến động số lượng này. Trường này bắt buộc NOT NULL để đảm bảo tính minh bạch vết chứng từ.
    
- `batch_id` (UUID, FK $\rightarrow$ `Stock_Batch.id`, NOT NULL): Lô hàng bị tác động biến động số lượng.
    
- `quantity_changed` (INT, NOT NULL): Số lượng thực tế bị cộng thêm hoặc trừ đi trong phiên giao dịch này.
    
- `created_at` (TIMESTAMP, DEFAULT now()): Thời điểm phát sinh hành động thay đổi số lượng.
    
- **Indexes:** `batch_id` (Tối ưu hóa phục vụ tính năng tra cứu "Thẻ kho" - xem toàn bộ lịch sử biến động từ xưa đến nay của một lô hàng cụ thể).
    

#### Bảng: `Inventory_Audit`

_Phiếu kiểm kê kho bãi định kỳ hoặc đột xuất do nhân viên kho lập và Tenant duyệt._

- `id` (UUID, PK): Mã phiếu kiểm kê.
    
- `warehouse_id` (UUID, FK $\rightarrow$ `Warehouse.id`, NOT NULL): Kho bãi được thực hiện kiểm kê.
    
- `audit_code` (VARCHAR(50), UNIQUE, NOT NULL): Mã số phiếu kiểm kê để theo dõi (Ví dụ: `AUD-2026-0001`).
    
- `created_by` (UUID, FK $\rightarrow$ `User.id`, NOT NULL): Staff (Nhân viên kho) lập phiếu và tiến hành kiểm đếm.
    
- `approved_by` (UUID, FK $\rightarrow$ `User.id`, NULL): Tenant (Chủ hàng) chịu trách nhiệm duyệt kết quả kiểm kê.
    
- `status` (VARCHAR(20), NOT NULL, DEFAULT 'PENDING'): Trạng thái của phiếu kiểm kê (`PENDING` - Đang kiểm đếm, `SUBMITTED` - Staff đã nộp kết quả chờ Tenant duyệt, `APPROVED` - Đã duyệt và tự động sinh phiếu điều chỉnh kho tương ứng, `REJECTED` - Từ chối kết quả kiểm kê).
    
- `audit_date` (TIMESTAMP, NOT NULL, DEFAULT now()): Thời gian thực hiện kiểm kê thực tế.
    
- `created_at` / `updated_at` (TIMESTAMP): Thời gian khởi tạo và cập nhật phiếu.
    

#### Bảng: `Inventory_Audit_Item`

_Chi tiết kết quả kiểm đếm thực tế của từng lô hàng tại các vị trí trong phiếu kiểm kê._

- `id` (UUID, PK): Mã dòng chi tiết kiểm kê.
    
- `audit_id` (UUID, FK $\rightarrow$ `Inventory_Audit.id`, NOT NULL): Thuộc về phiếu kiểm kê nào.
    
- `stock_batch_id` (UUID, FK $\rightarrow$ `Stock_Batch.id`, NOT NULL): Lô hàng được đối chiếu kiểm đếm.
    
- `sku_id` (UUID, FK $\rightarrow$ `Product_SKU.id`, NOT NULL): Mã hàng hóa tương ứng.
    
- `zone_id` (UUID, FK $\rightarrow$ `Warehouse_Zone.id`, NOT NULL): Vị trí Zone tại thực địa.
    
- `rack_id` (UUID, FK $\rightarrow$ `Warehouse_Rack.id`, NOT NULL): Vị trí Rack tại thực địa.
    
- `bin_id` (UUID, FK $\rightarrow$ `Warehouse_Bin.id`, NOT NULL): Vị trí Bin (ô chứa) tại thực địa.
    
- `system_quantity` (INT, NOT NULL): Số lượng tồn kho ghi nhận trên hệ thống tại thời điểm kiểm kê.
    
- `actual_quantity` (INT, NOT NULL): Số lượng hàng thực tế nhân viên kiểm đếm được.
    
- `discrepancy` (INT, NOT NULL): Chênh lệch số lượng (`actual_quantity - system_quantity`).
  - Nếu `discrepancy > 0`: Sẽ tự sinh phiếu `INBOUND` (Nhập kho điều chỉnh) để tăng tồn kho khi được duyệt.
  - Nếu `discrepancy < 0`: Sẽ tự sinh phiếu `OUTBOUND` (Xuất kho điều chỉnh) để giảm tồn kho khi được duyệt.
    
- `note` (VARCHAR(255)): Lý do chênh lệch ghi nhận tại thực tế.
    
