Backend Auth APIs đã được cập nhật.

Frontend hiện tại đã có sẵn:

* React
* Redux Toolkit
* Axios
* authApi.js
* authSlice.js
* LoginPage
* RegisterPage
* Header
* Route Guards

KHÔNG được tạo lại project structure.
KHÔNG được refactor toàn bộ Auth module.
KHÔNG được thay đổi UI hiện tại.

Nhiệm vụ của bạn là đọc code hiện có và cập nhật toàn bộ Authentication Flow theo API Backend mới.

===================================
AUTH APIs MỚI
=============

POST /api/auth/register

Mô tả:

* Đăng ký tài khoản mới.
* Chỉ hỗ trợ OWNER và TENANT.
* Backend sẽ tự gửi email chào mừng.

Yêu cầu FE:

* Kết nối API mới.
* Hiển thị thông báo:
  "Đăng ký thành công. Vui lòng kiểm tra email và đăng nhập."
* Tự động chuyển sang Login.

===================================

POST /api/auth/login

Mô tả:

* Đăng nhập bằng email và password.

Yêu cầu:

* Cập nhật authApi nếu request/response đã thay đổi.
* Lưu access token.
* Lưu user info.
* Lưu role.
* Đồng bộ Redux + localStorage.
* Header cập nhật ngay sau login.
* Không cần refresh trang.

===================================

POST /api/auth/refresh

Mô tả:

* Lấy access token mới.
* Refresh token được lưu trong HttpOnly Cookie.

Yêu cầu:

* Axios interceptor tự động gọi refresh khi gặp 401.
* Sau khi refresh thành công:

  * cập nhật access token mới.
  * retry request cũ.
* Không yêu cầu người dùng login lại.
* Không lưu refresh token trong localStorage.

===================================

POST /api/auth/logout

Mô tả:

* Logout khỏi thiết bị hiện tại.

Yêu cầu:

* Gọi API logout.
* Xóa access token.
* Xóa user info.
* Reset auth state.
* Header quay về Guest.
* Redirect Home Page.

===================================

POST /api/auth/logout-all

Mô tả:

* Logout khỏi tất cả thiết bị.

Yêu cầu:

* Thêm action logoutAll.
* Thêm API call.
* Xử lý tương tự logout.

===================================

GET /api/auth/me

Mô tả:

* Lấy thông tin user hiện tại.

Yêu cầu:

* Khi refresh browser:

  * kiểm tra access token.
  * gọi /api/auth/me.
  * khôi phục user state.
  * khôi phục role.
* Không bị logout giả sau F5.

===================================

POST /api/auth/forgot-password

Mô tả:

* Gửi email reset password.

Yêu cầu:

* Tạo ForgotPasswordPage.
* Form:

  * Email

Submit:

* gọi API.
* hiển thị:
  "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn."

===================================

POST /api/auth/reset-password

Mô tả:

* Đặt lại mật khẩu bằng token trong email.

Yêu cầu:

* Tạo ResetPasswordPage.

Form:

* New Password
* Confirm Password

Đọc token từ URL query hoặc params.

Ví dụ:

/reset-password?token=xxxxx

Submit:

* gọi API.
* hiển thị thông báo thành công.
* chuyển về Login.

===================================

POST /api/auth/google

Mô tả:

* Đăng nhập / đăng ký bằng Google OAuth.
* FE gửi authorization code lên Backend.

Yêu cầu:

* Thêm nút:
  "Continue with Google"

Login Page
Register Page

Flow:

Google Login
→ lấy authorization code
→ gửi code lên:

POST /api/auth/google

→ nhận access token
→ nhận user info
→ cập nhật Redux
→ cập nhật Header
→ điều hướng theo role.

===================================
REDUX
=====

Đọc authSlice hiện có.

Nếu thiếu:

Thêm:

* loginThunk
* registerThunk
* refreshThunk
* logoutThunk
* logoutAllThunk
* fetchCurrentUserThunk
* forgotPasswordThunk
* resetPasswordThunk
* googleLoginThunk

Không tạo auth store mới.

Tận dụng authSlice hiện tại.

===================================
AXIOS
=====

Đọc:

* apiConfig.js
* axiosClient.js

Cập nhật interceptor để:

* attach access token.
* xử lý refresh token.
* retry request sau refresh.

===================================
HEADER
======

Guest:

* Login
* Register

Authenticated:

* Avatar/User
* Dashboard theo Role
* Logout

Không hiển thị Login/Register sau khi login.

===================================
ROUTES
======

Thêm:

/forgot-password

/reset-password

Nếu chưa tồn tại.

===================================
DELIVERABLE
===========

1. Phân tích Auth code hiện tại.
2. Liệt kê file cần sửa.
3. Chỉ sửa file cần thiết.
4. Không phá vỡ flow hiện tại.
5. Tích hợp đầy đủ các API Auth mới.
6. Đảm bảo Login → Refresh Token → Me → Logout hoạt động hoàn chỉnh.
7. Đảm bảo Forgot Password và Reset Password hoạt động.
8. Đảm bảo Google Login hoạt động với Backend API.
