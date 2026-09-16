import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Let's define the comprehensive dataset for all 17 modules and 88 functions
# with rich, rigorous, and exhaustive test cases matching the user's Excel format.

auth_functions = [
    {
        "no": 1, "name": "Login", "sheet": "Authentication",
        "desc": "Verify user authentication with valid/invalid email and password, check input validation, inactive account restrictions, and JWT token issuance.",
        "pre": "User has a registered account in the system",
        "fe": "LoginPage / AuthModal", "be": "AuthController.login (AuthService.login)",
        "test_cases": [
            {
                "id": "TC_AUTH_001",
                "desc": "Login successfully with valid Owner account credentials",
                "proc": "1. Go to Login page (/login) or click 'Đăng nhập'.\n2. Enter valid registered Owner email.\n3. Enter valid password.\n4. Click 'Đăng nhập'.",
                "expected": "Authentication succeeds; JWT access token saved, HttpOnly refresh cookie set; user is redirected to Owner Dashboard (/owner/dashboard).",
                "pre": "Owner account exists and is active (isActive = true)"
            },
            {
                "id": "TC_AUTH_002",
                "desc": "Login successfully with valid Tenant account credentials",
                "proc": "1. Open Login modal.\n2. Enter valid registered Tenant email and password.\n3. Click 'Đăng nhập'.",
                "expected": "Authentication succeeds; user redirected to Tenant Dashboard (/tenant/dashboard); tenant session initialized.",
                "pre": "Tenant account exists and is active"
            },
            {
                "id": "TC_AUTH_003",
                "desc": "Login successfully with valid Staff account credentials",
                "proc": "1. Open Login form.\n2. Enter valid Staff email and password.\n3. Click 'Đăng nhập'.",
                "expected": "Authentication succeeds; user redirected to Staff Dashboard (/staff/dashboard) with warehouse operator permissions.",
                "pre": "Staff account exists and accepted invitation"
            },
            {
                "id": "TC_AUTH_004",
                "desc": "Login successfully with valid Admin account credentials",
                "proc": "1. Open Login form.\n2. Enter valid Admin credentials.\n3. Click 'Đăng nhập'.",
                "expected": "Authentication succeeds; user redirected to Admin Dashboard (/admin/dashboard) with full administrative rights.",
                "pre": "Admin account exists in system"
            },
            {
                "id": "TC_AUTH_005",
                "desc": "Login with incorrect password",
                "proc": "1. Enter registered email.\n2. Enter wrong password.\n3. Click 'Đăng nhập'.",
                "expected": "System returns HTTP 400/401 with error message: 'Sai email hoặc mật khẩu'. User remains on login screen.",
                "pre": "Account exists in database"
            },
            {
                "id": "TC_AUTH_006",
                "desc": "Login with non-existent email",
                "proc": "1. Enter unregistered email (e.g. unknown_user_999@example.com).\n2. Enter any password.\n3. Click 'Đăng nhập'.",
                "expected": "System returns HTTP 400/401 with generic error: 'Sai email hoặc mật khẩu' (prevents account enumeration attacks).",
                "pre": "Email is not registered in system"
            },
            {
                "id": "TC_AUTH_007",
                "desc": "Login with invalid email format",
                "proc": "1. Enter email format 'user_email_without_at.com' or 'test@'.\n2. Enter password.\n3. Click 'Đăng nhập'.",
                "expected": "Client-side validation error shown: 'Email không đúng định dạng'. Form submission is blocked.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_008",
                "desc": "Login with empty email and password fields",
                "proc": "1. Leave email and password blank.\n2. Click 'Đăng nhập'.",
                "expected": "Validation errors displayed: 'Email không được để trống' and 'Mật khẩu không được để trống'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_009",
                "desc": "Login with locked / inactive account",
                "proc": "1. Enter credentials of an account where isActive = false.\n2. Click 'Đăng nhập'.",
                "expected": "Server rejects request with message: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt'. Access denied.",
                "pre": "Account isActive is false"
            },
            {
                "id": "TC_AUTH_010",
                "desc": "Login with leading/trailing whitespaces in email input",
                "proc": "1. Enter email '  valid_owner@example.com  ' with extra spaces.\n2. Enter correct password.\n3. Click 'Đăng nhập'.",
                "expected": "System auto-trims whitespace, successfully authenticates and redirects to dashboard.",
                "pre": "Valid account exists"
            }
        ]
    },
    {
        "no": 2, "name": "Register", "sheet": "Authentication",
        "desc": "Verify new account registration for Owner/Tenant roles, duplicate email check, password complexity validation, and account profile initialization.",
        "pre": "User does not have an account in the system with the target email",
        "fe": "RegisterPage / AuthModal", "be": "AuthController.register (AuthService.register)",
        "test_cases": [
            {
                "id": "TC_AUTH_011",
                "desc": "Register new Owner account with valid details",
                "proc": "1. Navigate to Register page (/register) or click 'Đăng ký'.\n2. Select role 'Chủ kho (Owner)'.\n3. Enter Full Name: 'Trần Văn Chủ Kho', Phone: '0912345678', Email: 'new_owner@example.com', Password: 'Password123@'.\n4. Click 'Đăng ký'.",
                "expected": "Account created successfully in DB (HTTP 201 Created); welcome email dispatched via SMTP; user redirected to login with success toast.",
                "pre": "Email is not registered in DB"
            },
            {
                "id": "TC_AUTH_012",
                "desc": "Register new Tenant account with valid details",
                "proc": "1. Open Register modal.\n2. Select role 'Người thuê (Tenant)'.\n3. Fill valid Name, Phone, Email, and Password.\n4. Click 'Đăng ký'.",
                "expected": "Tenant account created in DB; welcome notification triggered; user can log in with new credentials immediately.",
                "pre": "Email is not registered in DB"
            },
            {
                "id": "TC_AUTH_013",
                "desc": "Register with email that already exists in database",
                "proc": "1. Enter an email that is already registered.\n2. Fill all other fields with valid data.\n3. Click 'Đăng ký'.",
                "expected": "System returns HTTP 400 Bad Request with error: 'Email này đã được đăng ký trong hệ thống'.",
                "pre": "Email already exists in system"
            },
            {
                "id": "TC_AUTH_014",
                "desc": "Register with password shorter than 6 characters",
                "proc": "1. Enter password '12345' (5 characters).\n2. Fill other fields.\n3. Click 'Đăng ký'.",
                "expected": "Validation error shown: 'Mật khẩu phải có tối thiểu 6 ký tự'. Form submission blocked.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_015",
                "desc": "Register with invalid Vietnamese phone number format",
                "proc": "1. Enter phone number '12345' or 'abcdef' or '012345678901'.\n2. Click 'Đăng ký'.",
                "expected": "Validation error shown: 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10 chữ số)'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_016",
                "desc": "Register with password confirmation mismatch",
                "proc": "1. Enter Password: 'Password123@'.\n2. Enter Confirm Password: 'Password456@'.\n3. Click 'Đăng ký'.",
                "expected": "Client validation error shown: 'Mật khẩu xác nhận không khớp'. Form submission blocked.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_017",
                "desc": "Register with all required fields left blank",
                "proc": "1. Open Register form.\n2. Leave Name, Phone, Email, Password empty.\n3. Click 'Đăng ký'.",
                "expected": "All mandatory field errors displayed: 'Họ và tên không được để trống', 'Email không được để trống', 'Mật khẩu không được để trống'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_018",
                "desc": "Register attempting unauthorized role injection (ROLE_ADMIN)",
                "proc": "1. Intercept registration API request.\n2. Modify role payload parameter from 'TENANT' to 'ADMIN'.\n3. Send request to /api/auth/register.",
                "expected": "Server DTO validation rejects with HTTP 400 Bad Request: only OWNER and TENANT roles are allowed for public registration.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_019",
                "desc": "Register with special characters or XSS script in Full Name",
                "proc": "1. Enter Full Name: '<script>alert(\"xss\")</script> Nguyễn Văn A'.\n2. Submit registration.",
                "expected": "Server/Client sanitizes input safely; user created with escaped name string, preventing script execution.",
                "pre": "Email is not registered"
            }
        ]
    },
    {
        "no": 3, "name": "Google OAuth Login", "sheet": "Authentication",
        "desc": "Verify authenticating or onboarding via Google OAuth2 with server-side authorization code exchange.",
        "pre": "User has an active Google account",
        "fe": "GoogleLoginButton (AuthModal)", "be": "AuthController.googleLogin (AuthService.loginWithGoogle)",
        "test_cases": [
            {
                "id": "TC_AUTH_020",
                "desc": "Sign in with Google account (First-time user onboarding)",
                "proc": "1. Click 'Đăng nhập bằng Google' button.\n2. Select Google account and authorize permissions.\n3. Google returns authorization code to frontend callback.\n4. FE calls /api/auth/google with code and role.",
                "expected": "Backend verifies token with Google OAuth API; creates new user in DB with provider GOOGLE; issues JWT tokens and redirects to dashboard.",
                "pre": "Google account not previously registered in StockSpace"
            },
            {
                "id": "TC_AUTH_021",
                "desc": "Sign in with Google account (Returning existing user)",
                "proc": "1. Click 'Đăng nhập bằng Google'.\n2. Authorize with previously registered Google account.",
                "expected": "System matches existing user record; issues JWT access/refresh tokens; redirects to role dashboard without duplicate account creation.",
                "pre": "User has existing account with provider GOOGLE"
            },
            {
                "id": "TC_AUTH_022",
                "desc": "Google OAuth popup cancelled by user",
                "proc": "1. Click 'Đăng nhập bằng Google'.\n2. Close or dismiss the Google OAuth consent popup window.",
                "expected": "Popup closes gracefully; login modal remains active; no uncaught exceptions in console; user can choose alternate login method.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_023",
                "desc": "Google OAuth with invalid or expired authorization code",
                "proc": "1. Send manipulated or expired authorization code to /api/auth/google.",
                "expected": "Server rejects with HTTP 400 Bad Request: 'Mã xác thực Google không hợp lệ hoặc đã hết hạn'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_024",
                "desc": "Google OAuth when corresponding local account is locked",
                "proc": "1. User previously registered via Google, but account isActive was set to false by Admin.\n2. User attempts Google sign in.",
                "expected": "System returns HTTP 403 Forbidden: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt'.",
                "pre": "Account exists with isActive = false"
            }
        ]
    },
    {
        "no": 4, "name": "Forget Password", "sheet": "Authentication",
        "desc": "Verify requesting password reset link via email, generating secure reset token and sending SMTP email.",
        "pre": "User has an account with a registered email",
        "fe": "ForgotPasswordPage (/forgot-password)", "be": "AuthController.forgotPassword (AuthService.forgotPassword)",
        "test_cases": [
            {
                "id": "TC_AUTH_025",
                "desc": "Request password reset with valid registered email",
                "proc": "1. Navigate to /forgot-password.\n2. Enter registered email address.\n3. Click 'Gửi yêu cầu'.",
                "expected": "System returns HTTP 200 OK; generates secure 48h reset token; dispatches reset email via SMTP; displays success message.",
                "pre": "User account exists with verified email"
            },
            {
                "id": "TC_AUTH_026",
                "desc": "Request password reset with unregistered email",
                "proc": "1. Open /forgot-password.\n2. Enter non-existent email address (e.g. not_found_99@gmail.com).\n3. Click 'Gửi yêu cầu'.",
                "expected": "System displays safe generic message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi đường dẫn...'; no email dispatched; prevents account probing.",
                "pre": "Email does not exist in DB"
            },
            {
                "id": "TC_AUTH_027",
                "desc": "Request password reset with invalid email format",
                "proc": "1. Enter 'invalid-email-string' in email field.\n2. Click 'Gửi yêu cầu'.",
                "expected": "Validation error shown: 'Email không đúng định dạng'. Request blocked.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_028",
                "desc": "Request password reset with empty email field",
                "proc": "1. Leave email field empty.\n2. Click 'Gửi yêu cầu'.",
                "expected": "Validation error shown: 'Vui lòng nhập địa chỉ email'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_029",
                "desc": "Spam multiple consecutive reset password requests",
                "proc": "1. Enter valid email.\n2. Click 'Gửi yêu cầu' repeatedly 5 times in 10 seconds.",
                "expected": "System handles rate limiting / updates token safely; only the most recently generated reset token remains valid.",
                "pre": "User account exists"
            }
        ]
    },
    {
        "no": 5, "name": "Reset Password", "sheet": "Authentication",
        "desc": "Verify updating account password using token from reset email, validating token validity and expiry window.",
        "pre": "User holds a valid non-expired password reset token",
        "fe": "ResetPasswordPage (/reset-password)", "be": "AuthController.resetPassword (AuthService.resetPassword)",
        "test_cases": [
            {
                "id": "TC_AUTH_030",
                "desc": "Reset password successfully with valid token and strong new password",
                "proc": "1. Open link /reset-password?token={valid_token}.\n2. Enter new password: 'NewSecurePassword123@'.\n3. Enter confirm password: 'NewSecurePassword123@'.\n4. Click 'Đặt lại mật khẩu'.",
                "expected": "Password updated in DB with BCrypt hash; old password invalidated; reset token revoked; user redirected to login with success notification.",
                "pre": "Reset token is valid and within 48h expiration window"
            },
            {
                "id": "TC_AUTH_031",
                "desc": "Reset password with expired token (> 48 hours)",
                "proc": "1. Access reset URL with a token created more than 48 hours ago.\n2. Enter valid new password.\n3. Click 'Đặt lại mật khẩu'.",
                "expected": "System displays error: 'Đường dẫn đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại'. Password unchanged.",
                "pre": "Reset token is expired"
            },
            {
                "id": "TC_AUTH_032",
                "desc": "Reset password with invalid or tampered token string",
                "proc": "1. Access /reset-password?token=invalid_fake_token_123.\n2. Enter new password and submit.",
                "expected": "System returns HTTP 400 Bad Request with error: 'Mã token không hợp lệ'.",
                "pre": "None"
            },
            {
                "id": "TC_AUTH_033",
                "desc": "Reset password with new password shorter than 6 characters",
                "proc": "1. Access valid reset URL.\n2. Enter password '123' (3 chars).\n3. Submit form.",
                "expected": "Validation error: 'Mật khẩu phải có tối thiểu 6 ký tự'. Form submission blocked.",
                "pre": "Valid token provided"
            },
            {
                "id": "TC_AUTH_034",
                "desc": "Reset password with mismatched password confirmation",
                "proc": "1. Enter New Password: 'PasswordA@123'.\n2. Enter Confirm Password: 'PasswordB@456'.\n3. Submit form.",
                "expected": "Validation error: 'Mật khẩu xác nhận không khớp'. Form submission blocked.",
                "pre": "Valid token provided"
            },
            {
                "id": "TC_AUTH_035",
                "desc": "Attempt to reuse an already-used reset token",
                "proc": "1. Successfully reset password using token once.\n2. Try to reuse the exact same token URL again to change password a second time.",
                "expected": "Server rejects request: token is already marked as consumed/invalid. Password cannot be reset again with same token.",
                "pre": "Token was already used"
            }
        ]
    },
    {
        "no": 6, "name": "View and Update Profile", "sheet": "Authentication",
        "desc": "Verify retrieving current logged-in user details and updating full name, phone number, and avatar URL.",
        "pre": "User is authenticated with valid JWT token",
        "fe": "Profile (/profile)", "be": "AuthController.getCurrentUser, updateCurrentUser (ProfileService.updateProfile)",
        "test_cases": [
            {
                "id": "TC_AUTH_036",
                "desc": "View authenticated user profile details",
                "proc": "1. Log in to system.\n2. Navigate to Profile page (/profile).\n3. Inspect displayed fields.",
                "expected": "System calls GET /api/auth/me; displays Full Name, Email, Phone, Role badge, Provider (LOCAL/GOOGLE), and Avatar.",
                "pre": "User is logged in"
            },
            {
                "id": "TC_AUTH_037",
                "desc": "Update profile details with valid new information",
                "proc": "1. Open Profile page.\n2. Change Full Name to 'Nguyễn Văn Đạt'.\n3. Change Phone to '0987654321'.\n4. Change Avatar URL to valid image link.\n5. Click 'Lưu thay đổi'.",
                "expected": "System calls PUT /api/auth/me; DB record updated; success toast: 'Cập nhật thông tin thành công'; UI header updates new avatar/name.",
                "pre": "User is logged in"
            },
            {
                "id": "TC_AUTH_038",
                "desc": "Update profile with invalid phone number format",
                "proc": "1. Enter phone number '123' or 'abcd' or special chars.\n2. Click 'Lưu thay đổi'.",
                "expected": "Validation error shown: 'Số điện thoại không hợp lệ'. API call blocked.",
                "pre": "User is logged in"
            },
            {
                "id": "TC_AUTH_039",
                "desc": "Update profile with empty Full Name",
                "proc": "1. Clear the Full Name field.\n2. Click 'Lưu thay đổi'.",
                "expected": "Validation error shown: 'Họ và tên không được để trống'. Form submission blocked.",
                "pre": "User is logged in"
            },
            {
                "id": "TC_AUTH_040",
                "desc": "Attempt to modify non-editable fields (Email, Role, Balance)",
                "proc": "1. Inspect profile form.\n2. Verify Email and Role fields are disabled / read-only.\n3. Intercept PUT /api/auth/me and inject modified 'email' or 'role' in JSON.",
                "expected": "Backend DTO ignores injected email/role; only allowed profile fields (fullName, phone, avatarUrl) are updated.",
                "pre": "User is logged in"
            },
            {
                "id": "TC_AUTH_041",
                "desc": "Access profile page when unauthenticated (Expired or missing JWT)",
                "proc": "1. Clear auth cookies/token.\n2. Directly navigate to URL /profile.",
                "expected": "RoleGuard intercepts request; redirects user to Login page or displays Unauthorized error.",
                "pre": "User is not authenticated"
            }
        ]
    }
]

print("Auth functions defined: 6 functions, 41 detailed test cases!")
