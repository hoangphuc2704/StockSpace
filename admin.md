Tôi đã có sẵn Frontend React hoàn chỉnh gồm:

* Routes
* Layouts
* Pages
* Components
* Dashboard
* Redux Store
* Redux Toolkit setup

KHÔNG được tạo lại project structure.
KHÔNG được refactor toàn bộ dự án.
KHÔNG được tạo kiến trúc mới.

Nhiệm vụ của bạn là đọc code hiện tại và tích hợp Backend APIs vào hệ thống đang có.

Backend đã hoàn thành và tài liệu API được cung cấp trong file Markdown.

=========================
YÊU CẦU CHUNG
=============

* Sử dụng Redux Toolkit hiện có.
* Tận dụng store hiện tại.
* Tận dụng slices hiện có nếu đã tồn tại.
* Nếu thiếu slice thì mới tạo thêm.
* Không tạo Context API mới.
* Không thay đổi UI hiện có.
* Không thay đổi routing hiện có.
* Không thay đổi cấu trúc thư mục hiện có.

=========================
API INTEGRATION
===============

Đọc tài liệu API Admin và tích hợp tất cả endpoint vào Frontend hiện tại.

Tạo hoặc cập nhật:

* services/adminApi.js
* redux slices hiện có
* async thunks
* selectors

Sử dụng:

createAsyncThunk
dispatch
useSelector
useDispatch

=========================
AUTHORIZATION
=============

Tất cả API Admin yêu cầu:

Authorization: Bearer JWT

Yêu cầu:

* Lấy token từ Redux Store hiện tại.
* Axios interceptor tự động đính kèm token.
* Không hardcode token.
* Xử lý 401.
* Xử lý 403.

=========================
STATE MANAGEMENT
================

Mỗi module phải quản lý:

* data
* loading
* error
* pagination
* filters

trong Redux.

Ví dụ:

{
data: [],
loading: false,
error: null,
page: 1,
totalPages: 0,
filters: {}
}

=========================
USER MANAGEMENT
===============

Kết nối các màn hình User hiện có với:

GET /api/admin/users
POST /api/admin/users
GET /api/admin/users/{id}
PUT /api/admin/users/{id}
DELETE /api/admin/users/{id}

PATCH /api/admin/users/{id}/activate
PATCH /api/admin/users/{id}/deactivate
PATCH /api/admin/users/{id}/reset-password

Nếu màn hình đã có:

* Chỉ thay dữ liệu mock bằng API thật.
* Chỉ thay state local bằng Redux.

=========================
ROLE MANAGEMENT
===============

Kết nối:

GET /api/admin/roles
POST /api/admin/roles
PUT /api/admin/roles/{id}
DELETE /api/admin/roles/{id}

POST /api/admin/users/{userId}/roles
DELETE /api/admin/users/{userId}/roles/{roleId}

Sử dụng Redux.

=========================
PERMISSION MANAGEMENT
=====================

Kết nối:

GET /api/admin/permissions
POST /api/admin/permissions

POST /api/admin/roles/{id}/permissions
DELETE /api/admin/roles/{id}/permissions/{permId}

=========================
WAREHOUSE MANAGEMENT
====================

Kết nối:

GET /api/admin/warehouses
POST /api/admin/warehouses/{id}/verify
POST /api/admin/warehouses/{id}/reject

Thay toàn bộ dữ liệu giả bằng API thật.

=========================
WAREHOUSE TYPE MANAGEMENT
=========================

Kết nối:

GET /api/admin/warehouse-types
POST /api/admin/warehouse-types
GET /api/admin/warehouse-types/{id}
PUT /api/admin/warehouse-types/{id}
DELETE /api/admin/warehouse-types/{id}

=========================
SYSTEM POLICIES
===============

Kết nối:

GET /api/admin/system-policies
POST /api/admin/system-policies

=========================
PACKAGES
========

Kết nối:

POST /api/admin/packages
PUT /api/admin/packages/{id}
DELETE /api/admin/packages/{id}

GET /api/admin/subscriptions

=========================
INSPECTIONS
===========

Kết nối:

GET /api/admin/inspections
POST /api/admin/inspections/{id}/assign

=========================
DISPUTES
========

Kết nối:

GET /api/admin/disputes
POST /api/admin/disputes/{id}/resolve

=========================
WITHDRAWALS
===========

Kết nối:

GET /api/admin/withdrawals

PATCH /api/admin/withdrawals/{id}/approve
PATCH /api/admin/withdrawals/{id}/reject

=========================
TRANSACTIONS
============

Kết nối:

GET /api/admin/transactions

=========================
OUTPUT
======

Khi thực hiện:

1. Phân tích cấu trúc hiện tại.
2. Xác định file cần sửa.
3. Liệt kê danh sách file sẽ thay đổi.
4. Chỉ sửa những file cần thiết.
5. Tích hợp Redux và API vào code hiện có.
6. Không tạo lại giao diện.
7. Không thay đổi UX hiện tại.
8. Không tạo mock data.
9. Toàn bộ dữ liệu phải lấy từ Backend API.
10. Giải thích ngắn gọn mỗi thay đổi trước khi áp dụng.




# StockSpace - Admin APIs

Tài liệu liệt kê các API dành cho Admin trong hệ thống quản lý kho StockSpace. [page:1]

---

## 1. Admin — System Policies Management

Các API quản lý chính sách / cam kết ràng buộc hệ thống. [page:1]

- `GET /api/admin/system-policies`  
  - Mô tả: Xem lịch sử tất cả các phiên bản cam kết ràng buộc. [page:1]

- `POST /api/admin/system-policies`  
  - Mô tả: Tạo phiên bản cam kết ràng buộc mới. [page:1]

---

## 2. Admin — Packages & Subscriptions

Các API quản lý gói dịch vụ và theo dõi lịch sử đăng ký. [page:1]

- `POST /api/admin/packages`  
  - Mô tả: Tạo mới một gói dịch vụ thành viên. [page:1]

- `PUT /api/admin/packages/{id}`  
  - Mô tả: Cập nhật thông tin một gói dịch vụ. [page:1]

- `DELETE /api/admin/packages/{id}`  
  - Mô tả: Xóa (ngừng cung cấp) một gói dịch vụ. [page:1]

- `GET /api/admin/subscriptions`  
  - Mô tả: Xem lịch sử mua gói của tất cả Tenant (phân trang). [page:1]

---

## 3. Admin Role Management

Các API quản lý Vai trò và gán quyền. [page:1]

- `GET /api/admin/roles`  
  - Mô tả: Xem danh sách tất cả các vai trò (roles) hiện có. [page:1]

- `POST /api/admin/roles`  
  - Mô tả: Tạo mới một vai trò (role). [page:1]

- `PUT /api/admin/roles/{id}`  
  - Mô tả: Chỉnh sửa thông tin vai trò. [page:1]

- `DELETE /api/admin/roles/{id}`  
  - Mô tả: Xóa một vai trò khỏi hệ thống. [page:1]

- `POST /api/admin/users/{userId}/roles`  
  - Mô tả: Gán thêm vai trò cho người dùng. [page:1]

- `DELETE /api/admin/users/{userId}/roles/{roleId}`  
  - Mô tả: Xóa vai trò khỏi người dùng. [page:1]

- `POST /api/admin/roles/{id}/permissions`  
  - Mô tả: Gán thêm một quyền hạn (permission) vào vai trò. [page:1]

- `DELETE /api/admin/roles/{id}/permissions/{permId}`  
  - Mô tả: Gỡ bỏ quyền hạn khỏi vai trò. [page:1]

---

## 4. Admin Permission Management

Các API quản lý quyền hạn của hệ thống. [page:1]

- `GET /api/admin/permissions`  
  - Mô tả: Xem danh sách tất cả các quyền hạn (permissions) hiện có. [page:1]

- `POST /api/admin/permissions`  
  - Mô tả: Tạo mới một quyền hạn. [page:1]

---

## 5. Admin — Warehouse Management

Các API duyệt và quản lý Kho của Admin/Inspector. [page:1]

- `GET /api/admin/warehouses`  
  - Mô tả: Lấy danh sách tất cả các kho (phân trang, tìm kiếm, lọc). [page:1]

- `POST /api/admin/warehouses/{id}/verify`  
  - Mô tả: Duyệt kho (xác minh thành công). [page:1]

- `POST /api/admin/warehouses/{id}/reject`  
  - Mô tả: Từ chối duyệt kho. [page:1]

---

## 6. Admin — Warehouse Type Management

Các API quản lý Loại kho. [page:1]

- `GET /api/admin/warehouse-types`  
  - Mô tả: Lấy danh sách loại kho (phân trang, tìm kiếm). [page:1]

- `POST /api/admin/warehouse-types`  
  - Mô tả: Tạo mới một loại kho. [page:1]

- `GET /api/admin/warehouse-types/{id}`  
  - Mô tả: Xem chi tiết loại kho theo ID. [page:1]

- `PUT /api/admin/warehouse-types/{id}`  
  - Mô tả: Cập nhật loại kho. [page:1]

- `DELETE /api/admin/warehouse-types/{id}`  
  - Mô tả: Xóa loại kho. [page:1]

---

## 7. Admin — Inspections Management

Các API phân công và quản lý kiểm định kho bãi. [page:1]

- `GET /api/admin/inspections`  
  - Mô tả: Xem tất cả danh sách yêu cầu kiểm định. [page:1]

- `POST /api/admin/inspections/{id}/assign`  
  - Mô tả: Phân công Inspector kiểm định kho bãi. [page:1]

---

## 8. Admin — Dispute Management

Các API giải quyết tranh chấp hợp đồng và phân xử tiền cọc. [page:1]

- `GET /api/admin/disputes`  
  - Mô tả: Xem danh sách các tranh chấp (phân trang, lọc trạng thái). [page:1]

- `POST /api/admin/disputes/{id}/resolve`  
  - Mô tả: Giải quyết tranh chấp và phân xử tiền đặt cọc. [page:1]

---

## 9. Admin — Withdrawals

Các API phê duyệt yêu cầu rút tiền. [page:1]

- `GET /api/admin/withdrawals`  
  - Mô tả: Xem danh sách tất cả yêu cầu rút tiền (lọc theo status, phân trang). [page:1]

- `PATCH /api/admin/withdrawals/{id}/approve`  
  - Mô tả: Duyệt yêu cầu rút tiền. [page:1]

- `PATCH /api/admin/withdrawals/{id}/reject`  
  - Mô tả: Từ chối yêu cầu rút tiền. [page:1]

---

## 10. Admin — Transactions

Các API thống kê và quản lý giao dịch hệ thống. [page:1]

- `GET /api/admin/transactions`  
  - Mô tả: Xem lịch sử toàn bộ giao dịch của hệ thống (phân trang). [page:1]

---

## 11. Admin User Management

Các API quản lý người dùng của Admin. [page:1]

- `GET /api/admin/users`  
  - Mô tả: Lấy danh sách người dùng (phân trang, tìm kiếm, lọc). [page:1]

- `POST /api/admin/users`  
  - Mô tả: Admin tạo mới tài khoản người dùng. [page:1]

- `GET /api/admin/users/{id}`  
  - Mô tả: Xem chi tiết thông tin người dùng theo ID. [page:1]

- `PUT /api/admin/users/{id}`  
  - Mô tả: Cập nhật thông tin người dùng (fullName, phone). [page:1]

- `DELETE /api/admin/users/{id}`  
  - Mô tả: Xóa vĩnh viễn người dùng khỏi hệ thống. [page:1]

- `PATCH /api/admin/users/{id}/reset-password`  
  - Mô tả: Admin đặt lại mật khẩu cho người dùng. [page:1]

- `PATCH /api/admin/users/{id}/deactivate`  
  - Mô tả: Khóa tài khoản người dùng. [page:1]

- `PATCH /api/admin/users/{id}/activate`  
  - Mô tả: Kích hoạt (mở khóa) tài khoản người dùng. [page:1]

---

## 12. Ghi chú

- Tất cả các endpoint trên đều yêu cầu xác thực (Bearer JWT) với quyền Admin phù hợp. [page:1]
- Tham khảo phần Schemas trong Swagger UI để biết cấu trúc body request/response như: `CreateUserRequest`, `UpdateUserRequest`, `CreateWarehouseTypeRequest`, `CreatePackageRequest`, `CreateSystemPolicyRequest`, `ResolveDisputeRequest`, `WithdrawRequestDto`, v.v. [page:1]