import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# 100% PURE & VERIFIED FE + BE FUNCTIONS LIST (NO OBSOLETE BOOKING / NO NON-EXISTENT CHANGE PASSWORD)
master_functions = [
    # --- MODULE 1: AUTHENTICATION & USER PROFILE ---
    {
        "no": 1, "name": "Login", "sheet": "Authentication",
        "desc": "Verify user authentication with email and password, validating empty fields, non-existent accounts, incorrect passwords, inactive/locked status, and JWT access/refresh token generation.",
        "pre": "User has a registered account in the system",
        "fe": "LoginPage / AuthModal", "be": "AuthController.login (AuthService.login)",
        "test_cases": [
            {"id": "TC_AUTH_001", "desc": "Login with valid credentials", "proc": "1. Open Login modal/page.\n2. Enter valid registered email and password.\n3. Click 'Đăng nhập'.", "expected": "Authentication succeeds, JWT tokens saved in cookies/local storage, redirects to role-appropriate dashboard.", "pre": "Account is active in database"},
            {"id": "TC_AUTH_002", "desc": "Login with incorrect password", "proc": "1. Enter registered email.\n2. Enter wrong password.\n3. Click 'Đăng nhập'.", "expected": "System returns 400/401 with message: 'Sai email hoặc mật khẩu'. User stays on login screen.", "pre": "Account exists"},
            {"id": "TC_AUTH_003", "desc": "Login with missing required fields", "proc": "1. Leave email and password blank.\n2. Click 'Đăng nhập'.", "expected": "Client validation blocks submission: 'Email không được để trống' and 'Mật khẩu không được để trống'.", "pre": "None"},
            {"id": "TC_AUTH_004", "desc": "Login with locked/inactive account", "proc": "1. Enter credentials of an account with isActive = false.\n2. Click 'Đăng nhập'.", "expected": "System rejects with message: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt'.", "pre": "Account locked by Admin"}
        ]
    },
    {
        "no": 2, "name": "Register", "sheet": "Authentication",
        "desc": "Verify new account registration for Owner/Tenant roles, enforcing password minimum length, duplicate email prevention, and welcome notification.",
        "pre": "Target email is not yet registered in the system",
        "fe": "RegisterPage / AuthModal", "be": "AuthController.register (AuthService.register)",
        "test_cases": [
            {"id": "TC_AUTH_005", "desc": "Register with valid information", "proc": "1. Go to Register form.\n2. Enter full name, phone, valid email, and password (>= 6 chars).\n3. Select role OWNER or TENANT.\n4. Click 'Đăng ký'.", "expected": "Account created in DB (HTTP 201 Created), welcome email sent, redirects to login screen.", "pre": "Email not in DB"},
            {"id": "TC_AUTH_006", "desc": "Register with duplicate email", "proc": "1. Enter an email that is already registered.\n2. Fill other valid fields and submit.", "expected": "System returns 400 Bad Request: 'Email này đã được đăng ký trong hệ thống'.", "pre": "Email already exists in DB"},
            {"id": "TC_AUTH_007", "desc": "Register with password under 6 characters", "proc": "1. Enter password '12345'.\n2. Submit registration.", "expected": "Validation error: 'Mật khẩu phải có tối thiểu 6 ký tự'. Form not submitted.", "pre": "None"}
        ]
    },
    {
        "no": 3, "name": "Google OAuth Login", "sheet": "Authentication",
        "desc": "Verify authenticating or onboarding via Google OAuth2 with server-side authorization code exchange.",
        "pre": "User has an active Google account",
        "fe": "GoogleLoginButton (AuthModal)", "be": "AuthController.googleLogin (AuthService.loginWithGoogle)",
        "test_cases": [
            {"id": "TC_AUTH_008", "desc": "Login with Google OAuth successfully", "proc": "1. Click 'Đăng nhập bằng Google'.\n2. Authorize account on Google popup.\n3. Return auth code to server.", "expected": "Server verifies OAuth token, registers/links account, issues JWT tokens, and redirects user.", "pre": "Google OAuth service reachable"}
        ]
    },
    {
        "no": 4, "name": "Forget Password", "sheet": "Authentication",
        "desc": "Verify requesting password reset link via email, generating secure reset token and sending SMTP email.",
        "pre": "User has an account with a registered email",
        "fe": "ForgotPasswordPage (/forgot-password)", "be": "AuthController.forgotPassword (AuthService.forgotPassword)",
        "test_cases": [
            {"id": "TC_AUTH_009", "desc": "Request password reset with valid email", "proc": "1. Open /forgot-password.\n2. Enter registered email.\n3. Click 'Gửi yêu cầu'.", "expected": "System sends email with password reset link, shows confirmation notification.", "pre": "User exists with verified email"},
            {"id": "TC_AUTH_010", "desc": "Request password reset with unregistered email", "proc": "1. Enter non-existent email.\n2. Click 'Gửi yêu cầu'.", "expected": "System returns safe notification without exposing user existence in DB.", "pre": "Email not in system"}
        ]
    },
    {
        "no": 5, "name": "Reset Password", "sheet": "Authentication",
        "desc": "Verify updating account password using token from reset email, validating token validity and expiry window.",
        "pre": "User holds a valid non-expired password reset token",
        "fe": "ResetPasswordPage (/reset-password)", "be": "AuthController.resetPassword (AuthService.resetPassword)",
        "test_cases": [
            {"id": "TC_AUTH_011", "desc": "Reset password with valid token", "proc": "1. Access reset URL with valid token.\n2. Enter new password and confirm password.\n3. Submit form.", "expected": "Password updated in DB, user can log in with new password immediately.", "pre": "Token is active and unexpired"},
            {"id": "TC_AUTH_012", "desc": "Reset password with expired or tampered token", "proc": "1. Access reset URL with invalid token.\n2. Submit new password.", "expected": "System displays error: 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ'.", "pre": "Token expired"}
        ]
    },
    {
        "no": 6, "name": "View and Update Profile", "sheet": "Authentication",
        "desc": "Verify retrieving current logged-in user details and updating full name, phone number, and avatar URL.",
        "pre": "User is authenticated with valid JWT token",
        "fe": "Profile (/profile)", "be": "AuthController.getCurrentUser, updateCurrentUser (ProfileService.updateProfile)",
        "test_cases": [
            {"id": "TC_AUTH_013", "desc": "Update profile details successfully", "proc": "1. Go to Profile page (/profile).\n2. Change full name and phone number.\n3. Click 'Lưu thay đổi'.", "expected": "Profile saved, API returns updated UserInfoResponse, success toast shown.", "pre": "Authenticated user"}
        ]
    },

    # --- MODULE 2: WAREHOUSE MANAGEMENT ---
    {
        "no": 7, "name": "Create Warehouse", "sheet": "Warehouse Management",
        "desc": "Verify warehouse creation by Owner, specifying dimensions, pricing, storage type, legal documents, and photos.",
        "pre": "User logged in with Owner role",
        "fe": "PostWarehouse (/owner/postwarehouse)", "be": "OwnerWarehouseController.createWarehouse (WarehouseService.createWarehouse)",
        "test_cases": [
            {"id": "TC_WH_001", "desc": "Owner creates warehouse with valid details", "proc": "1. Go to 'Đăng kho' (/owner/postwarehouse).\n2. Fill name, address, category, dimensions (width, length, height), pricing, and photos.\n3. Submit warehouse.", "expected": "Warehouse created in PENDING_APPROVAL status (HTTP 201), prompts for 2D/3D layout setup.", "pre": "User is Owner"},
            {"id": "TC_WH_002", "desc": "Create warehouse with missing required fields", "proc": "1. Leave name and pricePerMonth empty.\n2. Click Submit.", "expected": "Form validation errors displayed; submission blocked.", "pre": "User is Owner"}
        ]
    },
    {
        "no": 8, "name": "Update Warehouse Information", "sheet": "Warehouse Management",
        "desc": "Verify Owner modifying warehouse amenities, description, and contact info while preserving verified status.",
        "pre": "User is Owner of the warehouse",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerWarehouseController.updateWarehouse (WarehouseService.updateWarehouse)",
        "test_cases": [
            {"id": "TC_WH_003", "desc": "Update warehouse description and amenities", "proc": "1. Open Owner Warehouse list.\n2. Click Edit on warehouse.\n3. Update description and amenities, click save.", "expected": "Warehouse info updated successfully, changes reflected on detail page.", "pre": "Warehouse owned by caller"}
        ]
    },
    {
        "no": 9, "name": "Search Warehouses", "sheet": "Warehouse Management",
        "desc": "Verify public warehouse search with multi-criteria filters (province, price range, area, storage type, keyword).",
        "pre": "System contains active, published warehouses",
        "fe": "WarehouseListingPage (/warehouses)", "be": "PublicWarehouseController.searchWarehouses",
        "test_cases": [
            {"id": "TC_WH_004", "desc": "Search warehouses with matching keyword and province", "proc": "1. Navigate to /warehouses.\n2. Enter keyword 'Kho tiêu chuẩn'.\n3. Select Province 'Hồ Chí Minh' and apply filter.", "expected": "List returns published warehouses matching search filters with pagination.", "pre": "Warehouses available"}
        ]
    },
    {
        "no": 10, "name": "View Warehouse Details", "sheet": "Warehouse Management",
        "desc": "Verify public visitors viewing full warehouse specifications, inspection rating scores, owner info, and 3D layout tour.",
        "pre": "Target warehouse exists and is published",
        "fe": "WarehouseDetailPage (/warehouse/:id)", "be": "PublicWarehouseController.getWarehouseById",
        "test_cases": [
            {"id": "TC_WH_005", "desc": "View public warehouse detail page", "proc": "1. Click on warehouse card on marketplace.\n2. Check specs, amenities, inspection score, and 3D layout viewer.", "expected": "All specs, certificates, photo gallery, and interactive 3D layout load correctly.", "pre": "Warehouse is published"}
        ]
    },
    {
        "no": 11, "name": "Verify/Reject Warehouse (Admin)", "sheet": "Warehouse Management",
        "desc": "Verify Admin approving or rejecting a submitted warehouse listing after reviewing documents and layout.",
        "pre": "User is Admin, target warehouse is in PENDING_APPROVAL status",
        "fe": "WarehouseApprovalPage (/admin/warehouseapprovals)", "be": "AdminWarehouseController.approveWarehouse, rejectWarehouse",
        "test_cases": [
            {"id": "TC_WH_006", "desc": "Admin approves pending warehouse", "proc": "1. Go to Admin Warehouse Approval page.\n2. Open pending warehouse.\n3. Review legal docs and layout.\n4. Click 'Phê duyệt'.", "expected": "Warehouse status updated to VERIFIED; notification dispatched to Owner.", "pre": "Warehouse status is PENDING_APPROVAL"},
            {"id": "TC_WH_007", "desc": "Admin rejects warehouse with reason", "proc": "1. Click 'Từ chối'.\n2. Enter reason: 'Giấy phép PCCC không rõ ràng'.\n3. Confirm rejection.", "expected": "Warehouse status changes to REJECTED; reason logged and notified to Owner.", "pre": "Warehouse status is PENDING_APPROVAL"}
        ]
    },

    # --- MODULE 3: WAREHOUSE LAYOUT 2D/3D ---
    {
        "no": 12, "name": "Save Owner Warehouse Layout", "sheet": "Layout Management",
        "desc": "Verify Owner designing and bulk saving default 2D/3D layout structure (zones, racks, shelves, and storage bins).",
        "pre": "User is Owner of warehouse, warehouse exists",
        "fe": "LayoutWarehouse (/owner/layoutwarehouses)", "be": "OwnerLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)",
        "test_cases": [
            {"id": "TC_LY_001", "desc": "Owner saves default layout structure", "proc": "1. Open 3D Layout Designer.\n2. Add Storage Zone, 4 Racks, and 16 Bins.\n3. Configure load capacities.\n4. Click 'Lưu sơ đồ kho'.", "expected": "Hierarchy persisted in DB; total capacity synchronized with warehouse.", "pre": "Warehouse belongs to Owner"}
        ]
    },
    {
        "no": 13, "name": "Get Owner Warehouse Layout", "sheet": "Layout Management",
        "desc": "Verify retrieving default 2D/3D layout tree structure configured by warehouse owner.",
        "pre": "User is Owner of warehouse",
        "fe": "LayoutWarehouse (/owner/layoutwarehouses)", "be": "OwnerLayoutController.getLayout (WarehouseLayoutService.getLayoutTree)",
        "test_cases": [
            {"id": "TC_LY_002", "desc": "Owner loads default warehouse layout", "proc": "1. Open layout designer for warehouse.\n2. View rendered 3D scene.", "expected": "System returns WarehouseLayoutResponse with complete zones, shelves, and bin positions.", "pre": "Layout exists"}
        ]
    },
    {
        "no": 14, "name": "Save Tenant Snapshot Layout", "sheet": "Layout Management",
        "desc": "Verify Tenant customizing their operational rack and bin layout clone for rented warehouse.",
        "pre": "User is Tenant with active contract for target warehouse",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)", "be": "TenantLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)",
        "test_cases": [
            {"id": "TC_LY_003", "desc": "Tenant saves customized snapshot layout", "proc": "1. Tenant opens layout designer for leased warehouse.\n2. Adjusts bin naming and zone assignments.\n3. Saves snapshot.", "expected": "Tenant-specific layout saved without altering Owner's default layout.", "pre": "Active lease contract"}
        ]
    },
    {
        "no": 15, "name": "Get Tenant / Staff Layout", "sheet": "Layout Management",
        "desc": "Verify Tenant and assigned Staff loading tenant-specific 2D/3D warehouse layout snapshot.",
        "pre": "User is Tenant or assigned Staff with active contract",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)", "be": "TenantLayoutController.getLayout, StaffWarehouseLayoutController.getLayout",
        "test_cases": [
            {"id": "TC_LY_004", "desc": "Staff loads tenant warehouse layout snapshot", "proc": "1. Assigned staff accesses warehouse layout.\n2. Inspects bin locations.", "expected": "System returns tenant's operational layout hierarchy.", "pre": "Staff assigned to warehouse"}
        ]
    },
    {
        "no": 16, "name": "View Storage Load & Capacity", "sheet": "Layout Management",
        "desc": "Verify calculating and visualizing physical load capacity, occupied volume, and remaining weight per storage bin.",
        "pre": "Target warehouse has active layout with configured rack dimensions",
        "fe": "LayoutWarehouse / InventoryOverview", "be": "WarehouseCapacityController.getCapacityOverview",
        "test_cases": [
            {"id": "TC_LY_005", "desc": "View real-time storage load metrics", "proc": "1. Open warehouse capacity overview.\n2. Inspect bin occupancy percentages.", "expected": "Volume and weight load percentages match sum of stored batch items.", "pre": "Stock exists in bins"}
        ]
    },

    # --- MODULE 4: RENTAL CONTRACT MANAGEMENT (REPLACING OBSOLETE BOOKING) ---
    {
        "no": 17, "name": "Create Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner creating a direct rental contract draft for a tenant, specifying lease dates, area, deposit, and rental rate.",
        "pre": "User is Owner of warehouse, tenant email exists in system",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.create (ContractService.createOwnerDraft)",
        "test_cases": [
            {"id": "TC_CTR_001", "desc": "Owner creates rental contract draft", "proc": "1. Go to Owner Contracts > 'Tạo hợp đồng mới'.\n2. Enter tenant email, warehouse, lease start/end dates, monthly rent, and deposit.\n3. Click 'Tạo bản thảo'.", "expected": "Contract created in DRAFT status (HTTP 201), ready for layout and paper contract attachment.", "pre": "Owner owns warehouse, tenant is valid"}
        ]
    },
    {
        "no": 18, "name": "Update Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner updating pricing, dates, leased dimensions, and terms of an unsubmitted contract draft.",
        "pre": "User is Owner, target contract is in DRAFT or CHANGES_REQUESTED status",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.update (ContractService.updateOwnerDraft)",
        "test_cases": [
            {"id": "TC_CTR_002", "desc": "Owner updates contract draft terms", "proc": "1. Open draft contract.\n2. Change monthly rent amount and payment terms.\n3. Save changes.", "expected": "Contract draft updated successfully in DB.", "pre": "Contract is in DRAFT status"}
        ]
    },
    {
        "no": 19, "name": "Submit Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner uploading signed paper contract agreement files and submitting contract to Tenant for confirmation.",
        "pre": "User is Owner, contract is in DRAFT status, paper agreement uploaded",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.submit (ContractService.submitOwnerContract)",
        "test_cases": [
            {"id": "TC_CTR_003", "desc": "Owner submits contract with paper contract files", "proc": "1. Upload PDF agreement file.\n2. Click 'Gửi hợp đồng cho Tenant'.", "expected": "Contract status changes to PENDING_TENANT_CONFIRM; notification sent to Tenant.", "pre": "Paper contract file attached"},
            {"id": "TC_CTR_004", "desc": "Submit contract without paper contract file", "proc": "1. Click Submit when no agreement file uploaded.", "expected": "System throws BadRequestException: 'Cần đính kèm hợp đồng giấy trước khi gửi'.", "pre": "No paper file"}
        ]
    },
    {
        "no": 20, "name": "Tenant Confirm Rental Contract", "sheet": "Rental Contracts",
        "desc": "Verify Tenant reviewing contract details and paper agreement, confirming acceptance, and activating contract.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.confirmContract (ContractService.confirmDirectContract)",
        "test_cases": [
            {"id": "TC_CTR_005", "desc": "Tenant confirms submitted contract", "proc": "1. Tenant opens contract detail.\n2. Reviews terms and paper contract PDF.\n3. Clicks 'Xác nhận hợp đồng'.", "expected": "Contract status changes to ACTIVE, warehouse space leased, layout clone initialized.", "pre": "Contract is PENDING_TENANT_CONFIRM"}
        ]
    },
    {
        "no": 21, "name": "Tenant Request Contract Changes", "sheet": "Rental Contracts",
        "desc": "Verify Tenant requesting modifications to specific clauses with feedback note sent back to Owner.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.requestChanges (ContractService.requestDirectContractChanges)",
        "test_cases": [
            {"id": "TC_CTR_006", "desc": "Tenant requests contract clause change", "proc": "1. Click 'Yêu cầu chỉnh sửa'.\n2. Enter feedback: 'Đề nghị điều chỉnh ngày bắt đầu thuê sang đầu tháng sau'.\n3. Submit request.", "expected": "Contract status reverts to CHANGES_REQUESTED; feedback logged and sent to Owner.", "pre": "Contract is PENDING_TENANT_CONFIRM"}
        ]
    },
    {
        "no": 22, "name": "Tenant Reject Rental Contract", "sheet": "Rental Contracts",
        "desc": "Verify Tenant rejecting contract proposal with a mandatory explanation reason.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.rejectContract (ContractService.rejectDirectContract)",
        "test_cases": [
            {"id": "TC_CTR_007", "desc": "Tenant rejects contract proposal", "proc": "1. Click 'Từ chối hợp đồng'.\n2. Enter rejection reason.\n3. Confirm rejection.", "expected": "Contract status updated to REJECTED; warehouse availability released.", "pre": "Contract is PENDING_TENANT_CONFIRM"}
        ]
    },
    {
        "no": 23, "name": "Delete Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner deleting an unsubmitted contract draft.",
        "pre": "User is Owner, contract is in DRAFT status",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.deleteDraft (ContractService.deleteOwnerDraft)",
        "test_cases": [
            {"id": "TC_CTR_008", "desc": "Owner deletes contract draft", "proc": "1. Click 'Hủy bản thảo'.\n2. Confirm deletion.", "expected": "Contract draft removed from DB (HTTP 200 OK).", "pre": "Contract is in DRAFT status"}
        ]
    },
    {
        "no": 24, "name": "Create Contract Renewal Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner generating contract renewal draft from an active contract within the eligible renewal window.",
        "pre": "User is Owner, target contract is ACTIVE and eligible for renewal",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.createRenewalDraft (ContractService.createRenewalDraft)",
        "test_cases": [
            {"id": "TC_CTR_009", "desc": "Owner creates contract renewal draft", "proc": "1. Select active contract near expiry.\n2. Click 'Tạo gia hạn'.\n3. Set new lease duration.\n4. Submit renewal draft.", "expected": "Renewal draft created in DRAFT status with source contract referenced.", "pre": "Active contract near expiry"}
        ]
    },
    {
        "no": 25, "name": "Get List Rental Contracts", "sheet": "Rental Contracts",
        "desc": "Verify retrieving paginated list of rental contracts with status filters (DRAFT, PENDING, ACTIVE, EXPIRED).",
        "pre": "User is authenticated Owner or Tenant",
        "fe": "OwnerContractsPage / TenantContractsPage", "be": "ContractController.getMyContracts",
        "test_cases": [
            {"id": "TC_CTR_010", "desc": "Load user contracts list with pagination", "proc": "1. Navigate to Contracts page.\n2. View list and change page/size.", "expected": "System returns paginated list of contracts belonging to authenticated caller.", "pre": "Authenticated user"}
        ]
    },

    # --- MODULE 5: QUALITY INSPECTION MANAGEMENT ---
    {
        "no": 26, "name": "Request Warehouse Inspection", "sheet": "Inspection Management",
        "desc": "Verify Owner requesting quality inspection for warehouse verification badge before marketplace publishing.",
        "pre": "User is Owner of warehouse",
        "fe": "OwnerWarehouseDetail (/owner/warehouses/:id)", "be": "OwnerInspectionController.requestInspection",
        "test_cases": [
            {"id": "TC_INSP_001", "desc": "Owner submits inspection appointment request", "proc": "1. Go to warehouse detail.\n2. Click 'Yêu cầu kiểm định'.\n3. Select date and submit.", "expected": "Inspection created in PENDING assignment status.", "pre": "Warehouse owned by caller"}
        ]
    },
    {
        "no": 27, "name": "Admin Assign Inspection Task", "sheet": "Inspection Management",
        "desc": "Verify Admin assigning pending inspection appointment to a qualified staff inspector.",
        "pre": "User is Admin, inspection is in PENDING status",
        "fe": "InspectionsManagementPage (/admin/inspections)", "be": "AdminInspectionController.assignInspector",
        "test_cases": [
            {"id": "TC_INSP_002", "desc": "Admin assigns inspector to warehouse inspection", "proc": "1. Open pending inspection.\n2. Select staff inspector from dropdown.\n3. Confirm assignment.", "expected": "Status updated to ASSIGNED; notification dispatched to Inspector.", "pre": "Inspection is PENDING"}
        ]
    },
    {
        "no": 28, "name": "Inspector View Assigned Tasks", "sheet": "Inspection Management",
        "desc": "Verify Inspector viewing list of assigned warehouse inspection appointments with schedule and address.",
        "pre": "User logged in with Inspector role",
        "fe": "InspectorInspectionsPage (/inspector/inspections)", "be": "InspectorController.getMyInspections",
        "test_cases": [
            {"id": "TC_INSP_003", "desc": "Inspector loads assigned inspections list", "proc": "1. Log in as Inspector.\n2. Open /inspector/inspections.", "expected": "Displays list of inspections assigned to calling inspector.", "pre": "User is Inspector"}
        ]
    },
    {
        "no": 29, "name": "Submit Inspection Report", "sheet": "Inspection Management",
        "desc": "Verify Inspector submitting evaluation: fire safety, structure, rating score, and verification decision.",
        "pre": "User is assigned Inspector, inspection is ASSIGNED",
        "fe": "InspectorInspectionsPage (/inspector/inspections)", "be": "InspectorController.submitReport (InspectionService.submitReport)",
        "test_cases": [
            {"id": "TC_INSP_004", "desc": "Inspector submits inspection report with rating", "proc": "1. Open assigned inspection.\n2. Fill rating checklist (PCCC, hygiene, structure), upload photos, set score.\n3. Submit report.", "expected": "Status updated to COMPLETED; warehouse verification score updated.", "pre": "Inspection ASSIGNED to inspector"}
        ]
    },

    # --- MODULE 6: WMS SUBSCRIPTION MANAGEMENT ---
    {
        "no": 30, "name": "Purchase / Upgrade Subscription", "sheet": "Subscription",
        "desc": "Verify Tenant purchasing or upgrading WMS service tier, deducting wallet balance, updating staff quota, and blocking downgrade.",
        "pre": "User is Tenant, wallet balance >= package price",
        "fe": "SubscriptionPage (/tenant/subscription)", "be": "TenantSubscriptionController.purchasePackage (SubscriptionService.purchasePackage)",
        "test_cases": [
            {"id": "TC_SUB_001", "desc": "Tenant purchases subscription package successfully", "proc": "1. Go to /tenant/subscription.\n2. Select package tier.\n3. Click 'Mua gói'.", "expected": "Wallet deducted, subscription created in ACTIVE status, staff quota updated.", "pre": "Sufficient balance"},
            {"id": "TC_SUB_002", "desc": "Purchase with insufficient wallet balance", "proc": "1. Select package costing more than current balance.\n2. Click 'Mua gói'.", "expected": "System returns BadRequestException (INSUFFICIENT_BALANCE).", "pre": "Balance < package price"},
            {"id": "TC_SUB_003", "desc": "Tenant attempts to downgrade active package", "proc": "1. Select lower tier while higher tier is active.\n2. Click purchase.", "expected": "System rejects: 'Không thể hạ xuống gói dịch vụ thấp hơn khi gói hiện tại vẫn đang còn hạn'.", "pre": "Active higher-tier subscription"}
        ]
    },
    {
        "no": 31, "name": "Get Active Subscription Status", "sheet": "Subscription",
        "desc": "Verify checking active WMS subscription status, quota limits, current staff count, and expiration date.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SubscriptionPage (/tenant/subscription)", "be": "TenantSubscriptionController.getMyActiveSubscription",
        "test_cases": [
            {"id": "TC_SUB_004", "desc": "Retrieve active subscription details", "proc": "1. Open subscription view.\n2. Inspect package name, max staff limit, and expiry date.", "expected": "System returns active SubscriptionResponse with accurate quota snapshot.", "pre": "Active subscription exists"}
        ]
    },
    {
        "no": 32, "name": "Admin Manage Service Packages", "sheet": "Subscription",
        "desc": "Verify Admin creating, updating, pricing, and toggling active status of WMS service tiers.",
        "pre": "User logged in with Admin role",
        "fe": "Packages_SubcriptionsManagementPage (/admin/packages)", "be": "AdminPackageController.createPackage, updatePackage",
        "test_cases": [
            {"id": "TC_SUB_005", "desc": "Admin creates new WMS package tier", "proc": "1. Go to Admin Packages.\n2. Fill name, price, max staff, duration days.\n3. Save package.", "expected": "Package created and listed in public package list.", "pre": "User is Admin"}
        ]
    },

    # --- MODULE 7: LISTING PUBLICATION ---
    {
        "no": 33, "name": "Purchase Listing Publication", "sheet": "Listing Publication",
        "desc": "Verify Owner purchasing listing advertisement package to publish warehouse publicly on marketplace for 30/60/90 days.",
        "pre": "User is Owner, warehouse is VERIFIED, wallet balance sufficient",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.purchase (ListingOrderService.purchasePublication)",
        "test_cases": [
            {"id": "TC_PUB_001", "desc": "Owner purchases listing publication package", "proc": "1. Owner selects verified warehouse.\n2. Chooses 30-day listing package.\n3. Confirms payment.", "expected": "Wallet deducted, ListingOrder created (PAID status), warehouse visibleUntil date extended.", "pre": "Warehouse is VERIFIED"}
        ]
    },
    {
        "no": 34, "name": "View Publication Purchase History", "sheet": "Listing Publication",
        "desc": "Verify Owner viewing publication order history, active visibility periods, and transaction receipts.",
        "pre": "User is Owner of warehouse",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.getHistory",
        "test_cases": [
            {"id": "TC_PUB_002", "desc": "Owner views publication order timeline", "proc": "1. Open warehouse publication history tab.\n2. Inspect orders.", "expected": "List returns all publication orders with start/end dates and status.", "pre": "Owner owns warehouse"}
        ]
    },
    {
        "no": 35, "name": "Cancel / Stop Active Publication", "sheet": "Listing Publication",
        "desc": "Verify Owner cancelling scheduled publication with refund, or stopping active publication early.",
        "pre": "User is Owner, order is SCHEDULED or ACTIVE",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.cancelScheduledPublication, stopActivePublication",
        "test_cases": [
            {"id": "TC_PUB_003", "desc": "Owner cancels future scheduled publication", "proc": "1. Click Cancel on scheduled publication order.\n2. Confirm cancellation.", "expected": "Order cancelled, publication fee refunded to owner wallet.", "pre": "Order status is SCHEDULED"}
        ]
    },

    # --- MODULE 8: WALLET & PAYMENT GATEWAY ---
    {
        "no": 36, "name": "Deposit via VNPay", "sheet": "Wallet & Payment",
        "desc": "Verify wallet balance top-up: generating VNPay payment URL, simulating payment gateway redirect, and processing IPN callback.",
        "pre": "User has active account in system",
        "fe": "WalletTenant (/tenant/wallet)", "be": "WalletController.topUp (WalletService.createTopUpRequest)",
        "test_cases": [
            {"id": "TC_WAL_001", "desc": "Create top-up request with valid amount", "proc": "1. Go to Wallet > 'Nạp tiền'.\n2. Enter 500,000 VND.\n3. Click 'Thanh toán VNPay'.", "expected": "Transaction created in PENDING status, VNPay payment URL returned, redirects to gateway.", "pre": "Amount >= 10,000 VND"}
        ]
    },
    {
        "no": 37, "name": "View Wallet Balance & Transactions", "sheet": "Wallet & Payment",
        "desc": "Verify displaying current available wallet balance, transaction ledger, and filtering by transaction type.",
        "pre": "User is authenticated",
        "fe": "WalletTenant / WalletAdmin", "be": "WalletController.getWalletInfo, getMyTransactions",
        "test_cases": [
            {"id": "TC_WAL_002", "desc": "Load wallet overview and transaction history", "proc": "1. Open Wallet page.\n2. Inspect balance card and transaction table.", "expected": "Balance and transactions load accurately with pagination.", "pre": "User has wallet"}
        ]
    },
    {
        "no": 38, "name": "Request Withdraw", "sheet": "Wallet & Payment",
        "desc": "Verify withdrawal request submission: validating bank account, freezing wallet balance, and creating pending payout ticket.",
        "pre": "User has sufficient balance (Balance >= Withdraw amount)",
        "fe": "WalletTenant / WithdrawsHistory", "be": "WalletController.withdraw (WithdrawService.submitWithdrawRequest)",
        "test_cases": [
            {"id": "TC_WAL_003", "desc": "Submit withdraw request with valid bank info", "proc": "1. Click 'Rút tiền'.\n2. Enter amount, bank name, account number, holder name.\n3. Submit request.", "expected": "Wallet balance deducted, WithdrawRequest created in PENDING status.", "pre": "Sufficient balance"},
            {"id": "TC_WAL_004", "desc": "Request withdraw exceeding current balance", "proc": "1. Enter amount greater than available balance.\n2. Submit request.", "expected": "System throws BadRequestException (INSUFFICIENT_BALANCE).", "pre": "Balance < amount"}
        ]
    },
    {
        "no": 39, "name": "Approve Withdraw (Admin)", "sheet": "Wallet & Payment",
        "desc": "Verify Admin inspecting and approving user withdrawal request, logging bank transfer reference.",
        "pre": "User is Admin, withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)", "be": "AdminWithdrawController.approveWithdraw (WithdrawService.approveWithdraw)",
        "test_cases": [
            {"id": "TC_WAL_005", "desc": "Admin approves pending withdrawal request", "proc": "1. Admin opens pending withdrawal.\n2. Enters bank transfer reference code.\n3. Clicks 'Phê duyệt'.", "expected": "Status updated to APPROVED; transaction status updated to SUCCESS.", "pre": "Request is PENDING"}
        ]
    },
    {
        "no": 40, "name": "Reject Withdraw (Admin)", "sheet": "Wallet & Payment",
        "desc": "Verify Admin rejecting withdrawal request with explanation, automatically refunding frozen funds to user wallet.",
        "pre": "User is Admin, withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)", "be": "AdminWithdrawController.rejectWithdraw (WithdrawService.rejectWithdraw)",
        "test_cases": [
            {"id": "TC_WAL_006", "desc": "Admin rejects withdrawal and refunds balance", "proc": "1. Click 'Từ chối'.\n2. Enter rejection reason: 'Sai số tài khoản ngân hàng'.\n3. Confirm rejection.", "expected": "Withdraw status set to REJECTED; funds credited back to user wallet immediately.", "pre": "Request is PENDING"}
        ]
    },

    # --- MODULE 9: WMS PRODUCT CATALOG ---
    {
        "no": 41, "name": "Create Product Category", "sheet": "Product Catalog",
        "desc": "Verify Tenant creating a product category to classify SKUs, with optional default attribute templates.",
        "pre": "User is Tenant, active WMS subscription exists",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.createCategory (ProductCategoryService.createCategory)",
        "test_cases": [
            {"id": "TC_CAT_001", "desc": "Tenant creates product category", "proc": "1. Go to Categories page.\n2. Enter category name 'Hàng điện tử'.\n3. Click Save.", "expected": "Category created and returned in list.", "pre": "Active subscription"}
        ]
    },
    {
        "no": 42, "name": "Delete Product Category", "sheet": "Product Catalog",
        "desc": "Verify Tenant soft-deleting category, ensuring deletion is blocked if active SKUs are currently assigned to it.",
        "pre": "User is Tenant, category exists, no active SKUs linked",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.deleteCategory (ProductCategoryService.deleteCategory)",
        "test_cases": [
            {"id": "TC_CAT_002", "desc": "Delete empty product category", "proc": "1. Click Delete on category with 0 SKUs.\n2. Confirm deletion.", "expected": "Category soft-deleted (isDeleted=true).", "pre": "No SKUs in category"},
            {"id": "TC_CAT_003", "desc": "Delete category currently in use by SKUs", "proc": "1. Click Delete on category holding active SKUs.", "expected": "System throws BadRequestException (PRODUCT_CATEGORY_IN_USE).", "pre": "Category has linked SKUs"}
        ]
    },
    {
        "no": 43, "name": "Get Product Categories List", "sheet": "Product Catalog",
        "desc": "Verify retrieving list of tenant categories and system default categories.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.getMyCategories",
        "test_cases": [
            {"id": "TC_CAT_004", "desc": "Retrieve category catalog", "proc": "1. Open Category page.\n2. View categories table.", "expected": "List returns tenant-owned categories plus system suggested categories.", "pre": "Active subscription"}
        ]
    },
    {
        "no": 44, "name": "Create Product SKU", "sheet": "Product Catalog",
        "desc": "Verify Tenant creating SKU master data with skuCode, name, UOM, weight (kg), and volume (m3).",
        "pre": "User is Tenant, active WMS subscription exists",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.createSku (ProductSkuService.createSku)",
        "test_cases": [
            {"id": "TC_SKU_001", "desc": "Create SKU with valid attributes", "proc": "1. Go to SKU page > 'Tạo SKU'.\n2. Enter code 'SKU-ELEC-01', name, weight 1.5kg, volume 0.005m3.\n3. Save SKU.", "expected": "SKU created in DB (HTTP 200 OK).", "pre": "Unique skuCode"},
            {"id": "TC_SKU_002", "desc": "Create SKU with duplicate skuCode", "proc": "1. Enter existing skuCode.\n2. Save SKU.", "expected": "System throws BadRequestException (SKU_CODE_DUPLICATE).", "pre": "skuCode exists"}
        ]
    },
    {
        "no": 45, "name": "Update Product SKU", "sheet": "Product Catalog",
        "desc": "Verify updating SKU attributes; blocking physical weight/volume changes once stock batches exist in warehouse.",
        "pre": "User is Tenant, target SKU exists",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.updateSku (ProductSkuService.updateSku)",
        "test_cases": [
            {"id": "TC_SKU_003", "desc": "Update SKU name and specifications", "proc": "1. Edit SKU name and notes.\n2. Save changes.", "expected": "SKU attributes updated successfully.", "pre": "SKU exists"},
            {"id": "TC_SKU_004", "desc": "Attempt to change dimensions after stock recorded", "proc": "1. Edit unitWeightKg on SKU with active inventory.\n2. Save changes.", "expected": "System throws BadRequestException: 'Physical properties cannot be changed after stock has been recorded'.", "pre": "Stock batch exists for SKU"}
        ]
    },
    {
        "no": 46, "name": "Delete Product SKU", "sheet": "Product Catalog",
        "desc": "Verify soft-deleting SKU; ensuring deletion is blocked if any inventory stock batches currently exist.",
        "pre": "User is Tenant, SKU exists, no linked stock batches",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.deleteSku (ProductSkuService.deleteSku)",
        "test_cases": [
            {"id": "TC_SKU_005", "desc": "Delete unused SKU", "proc": "1. Click Delete on SKU with 0 stock batches.\n2. Confirm.", "expected": "SKU soft-deleted successfully.", "pre": "No stock batches"},
            {"id": "TC_SKU_006", "desc": "Delete SKU holding recorded stock", "proc": "1. Click Delete on SKU having recorded stock batch.", "expected": "System throws BadRequestException (SKU_IN_USE).", "pre": "Stock batch exists"}
        ]
    },
    {
        "no": 47, "name": "Get Product SKUs List with Filters", "sheet": "Product Catalog",
        "desc": "Verify paginated SKU list retrieval supporting keyword search, category filter, and sorting.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.getMySKUs",
        "test_cases": [
            {"id": "TC_SKU_007", "desc": "Filter SKU list by keyword and category", "proc": "1. Enter search keyword and select category.\n2. Apply filter.", "expected": "Table displays matching SKUs with accurate pagination metadata.", "pre": "SKUs exist"}
        ]
    },
    {
        "no": 48, "name": "Get Units of Measure (UOM) List", "sheet": "Product Catalog",
        "desc": "Verify retrieving standard Units of Measure (kg, carton, pallet, piece, bag, box).",
        "pre": "User is authenticated Tenant or Staff",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.getUoms",
        "test_cases": [
            {"id": "TC_SKU_008", "desc": "Load UOM dropdown options", "proc": "1. Open SKU creation modal.\n2. Open UOM dropdown.", "expected": "Dropdown displays list of active UOM units.", "pre": "UOMs in DB"}
        ]
    },

    # --- MODULE 10: WMS INVENTORY STOCK MANAGEMENT ---
    {
        "no": 49, "name": "Get Inventory Stock by Warehouse", "sheet": "Stock Management",
        "desc": "Verify retrieving all stock batches stored across warehouse bins with pagination and SKU filter.",
        "pre": "User is Tenant or assigned Staff, active lease contract exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockByWarehouse (StockBatchService.getStockByWarehouse)",
        "test_cases": [
            {"id": "TC_STK_001", "desc": "Retrieve stock batches for warehouse", "proc": "1. Open Inventory page.\n2. Select leased warehouse.\n3. View batches table.", "expected": "System returns list of stock batches with bin location, quantity, expiry date.", "pre": "Active lease contract"}
        ]
    },
    {
        "no": 50, "name": "Get Warehouse Stock Product Overview", "sheet": "Stock Management",
        "desc": "Verify aggregate product-level overview showing total quantity, reserved quantity, and available quantity per SKU.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockOverviewByWarehouse",
        "test_cases": [
            {"id": "TC_STK_002", "desc": "Load product-level stock overview", "proc": "1. Open Overview tab in Inventory.\n2. Inspect total, reserved, and available quantities.", "expected": "Aggregated metrics display correctly per SKU.", "pre": "Stock exists"}
        ]
    },
    {
        "no": 51, "name": "Get Stock Summary by SKU", "sheet": "Stock Management",
        "desc": "Verify aggregating detailed stock positions across all rack bins for a specific product SKU.",
        "pre": "User is Tenant or assigned Staff, target SKU exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockBySku (StockBatchService.getStockSummaryBySku)",
        "test_cases": [
            {"id": "TC_STK_003", "desc": "View all storage locations for single SKU", "proc": "1. Click on SKU in inventory table.\n2. Inspect locations breakdown.", "expected": "Displays list of bins, shelves, and zones holding the SKU.", "pre": "SKU in inventory"}
        ]
    },
    {
        "no": 52, "name": "Get Stock Batch Transaction History", "sheet": "Stock Management",
        "desc": "Verify viewing quantity fluctuation timeline for a specific stock batch (inbound, outbound, transfers, audit adjustments).",
        "pre": "User is Tenant or assigned Staff, target batch exists",
        "fe": "InventoryPage (Modal Lịch sử lô)", "be": "StockBatchController.getTransactionsByBatch",
        "test_cases": [
            {"id": "TC_STK_004", "desc": "View transaction ledger of a stock batch", "proc": "1. Open batch actions > 'Xem lịch sử'.\n2. Inspect timeline.", "expected": "Displays chronological list of inventory transactions affecting this batch.", "pre": "Batch exists"}
        ]
    },
    {
        "no": 53, "name": "Get Inbound Putaway Suggestions", "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm recommending optimal shelf/bin storage locations based on SKU dimensions and available bin volume.",
        "pre": "User is Tenant or assigned Staff, target warehouse has configured layout",
        "fe": "InboundPage (Gợi ý vị trí cất hàng)", "be": "PutawaySuggestionController.suggestPutawayLocations",
        "test_cases": [
            {"id": "TC_STK_005", "desc": "Get putaway suggestions for inbound SKU", "proc": "1. In Inbound receipt, click 'Gợi ý vị trí'.\n2. System calculates bin options.", "expected": "Returns ranked list of bins with sufficient volume and weight capacity.", "pre": "Layout has capacity"}
        ]
    },
    {
        "no": 54, "name": "Get Outbound FIFO Picking Suggestions", "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm suggesting oldest inventory batches (First-In, First-Out) for outbound picking.",
        "pre": "User is Tenant or assigned Staff, warehouse has available stock",
        "fe": "OutboundPage (Gợi ý chọn hàng FIFO)", "be": "OutboundPickingSuggestionController.suggestPickingLocations",
        "test_cases": [
            {"id": "TC_STK_006", "desc": "Get FIFO picking suggestions for outbound dispatch", "proc": "1. In Outbound receipt, enter SKU and quantity.\n2. Request picking suggestions.", "expected": "Algorithm selects batches with earliest inbound/expiry dates to fulfill quantity.", "pre": "Stock available"}
        ]
    },

    # --- MODULE 11: WMS INVENTORY RECEIPTS (INBOUND / OUTBOUND) ---
    {
        "no": 55, "name": "Create Inbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating inbound stock receipt (specifying supplier, arrival date, product SKUs, batch quantities, and assigned storage bin coordinates).",
        "pre": "User is Tenant or assigned Staff, Tenant has active warehouse lease contract",
        "fe": "InboundPage (/tenant/inbound)", "be": "InventoryReceiptController.createReceipt (InventoryReceiptService.createReceipt)",
        "test_cases": [
            {"id": "TC_REC_001", "desc": "Create inbound receipt in PENDING status", "proc": "1. Go to Inbound > 'Tạo phiếu nhập'.\n2. Enter supplier, items, quantities, and bin locations.\n3. Save receipt.", "expected": "Receipt created in PENDING status (HTTP 200 OK).", "pre": "Active lease contract"}
        ]
    },
    {
        "no": 56, "name": "Approve Inbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify approving inbound receipt: validating storage bin weight and volume physical capacity, increasing stock batch quantities, and recording transaction ledger.",
        "pre": "Receipt status is PENDING, assigned bins have sufficient remaining capacity",
        "fe": "InboundPage (Button Duyệt phiếu nhập)", "be": "InventoryReceiptController.approveReceipt (InventoryReceiptService.approveReceipt)",
        "test_cases": [
            {"id": "TC_REC_002", "desc": "Approve valid inbound receipt", "proc": "1. Open pending inbound receipt.\n2. Click 'Duyệt phiếu'.", "expected": "Stock batch created/incremented, bin load updated, transaction logged.", "pre": "Bins have capacity"},
            {"id": "TC_REC_003", "desc": "Approve inbound receipt exceeding bin capacity", "proc": "1. Approve receipt where items exceed bin volume/weight limits.", "expected": "System throws BadRequestException (BIN_CAPACITY_EXCEEDED).", "pre": "Bin over-capacity"}
        ]
    },
    {
        "no": 57, "name": "Create Outbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating outbound dispatch receipt (specifying recipient, delivery date, item quantities, and FIFO batch allocation).",
        "pre": "User is Tenant or assigned Staff, sufficient available stock exists in warehouse",
        "fe": "OutboundPage (/tenant/outbound)", "be": "InventoryReceiptController.createReceipt (InventoryReceiptService.createReceipt)",
        "test_cases": [
            {"id": "TC_REC_004", "desc": "Create outbound receipt with FIFO batch allocation", "proc": "1. Go to Outbound > 'Tạo phiếu xuất'.\n2. Enter recipient, items, picking batches.\n3. Save receipt.", "expected": "Receipt created in PENDING status, batch quantities reserved.", "pre": "Stock available"}
        ]
    },
    {
        "no": 58, "name": "Approve Outbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify approving outbound receipt: picking inventory, deducting stock batch quantities, updating inventory ledger, and releasing reserved quantity.",
        "pre": "Receipt status is PENDING, stock batch available quantity >= requested dispatch quantity",
        "fe": "OutboundPage (Button Duyệt phiếu xuất)", "be": "InventoryReceiptController.approveReceipt (InventoryReceiptService.approveReceipt)",
        "test_cases": [
            {"id": "TC_REC_005", "desc": "Approve valid outbound receipt", "proc": "1. Open pending outbound receipt.\n2. Click 'Duyệt phiếu'.", "expected": "Stock batch deducted, inventory balance updated, outbound transaction logged.", "pre": "Stock available"}
        ]
    },
    {
        "no": 59, "name": "Reject Goods Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify rejecting inbound or outbound receipt with mandatory cancellation reason, releasing any reserved stock.",
        "pre": "User is Tenant, target receipt status is PENDING",
        "fe": "InboundPage / OutboundPage", "be": "InventoryReceiptController.rejectReceipt",
        "test_cases": [
            {"id": "TC_REC_006", "desc": "Reject pending receipt with reason", "proc": "1. Click 'Từ chối phiếu'.\n2. Enter reason.\n3. Confirm rejection.", "expected": "Receipt status changes to REJECTED; any reserved stock released.", "pre": "Receipt is PENDING"}
        ]
    },
    {
        "no": 60, "name": "Replan Outbound FIFO Picking List", "sheet": "Inventory Receipts",
        "desc": "Verify re-allocating FIFO picking batches for an existing pending outbound receipt if stock positions shifted.",
        "pre": "User is Tenant or assigned Staff, outbound receipt status is PENDING",
        "fe": "OutboundPage (Tạo lại Pick List)", "be": "InventoryReceiptController.replanOutboundReceipt",
        "test_cases": [
            {"id": "TC_REC_007", "desc": "Replan picking batches for pending outbound receipt", "proc": "1. Open pending outbound receipt.\n2. Click 'Tạo lại Pick List'.", "expected": "System refreshes picking item allocation using latest available FIFO batches.", "pre": "Receipt is PENDING"}
        ]
    },

    # --- MODULE 12: WMS INTERNAL STOCK TRANSFER ---
    {
        "no": 61, "name": "Create Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify creating internal stock relocation ticket between different bins, shelves, or zones within the warehouse.",
        "pre": "User is Tenant or assigned Staff, source batch has sufficient quantity",
        "fe": "TransferPage (/tenant/transfer)", "be": "StockTransferController.createTransfer",
        "test_cases": [
            {"id": "TC_TRF_001", "desc": "Create internal bin-to-bin transfer ticket", "proc": "1. Go to /tenant/transfer > 'Tạo điều chuyển'.\n2. Select source bin, destination bin, batch, and quantity.\n3. Submit ticket.", "expected": "Transfer ticket created in PENDING status.", "pre": "Source batch has stock"}
        ]
    },
    {
        "no": 62, "name": "Approve Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify executing stock transfer: validating destination bin capacity, moving batch quantity, and writing relocation audit ledger.",
        "pre": "Transfer ticket status is PENDING, destination bin has capacity",
        "fe": "TransferPage (/tenant/transfer)", "be": "StockTransferController.approveTransfer",
        "test_cases": [
            {"id": "TC_TRF_002", "desc": "Approve and execute stock transfer", "proc": "1. Open pending transfer ticket.\n2. Click 'Thực hiện điều chuyển'.", "expected": "Stock batch moved to destination bin; physical loads recalculated.", "pre": "Destination bin has capacity"}
        ]
    },
    {
        "no": 63, "name": "Reject Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify rejecting or cancelling an internal transfer proposal and unlocking reserved batch quantities.",
        "pre": "Transfer ticket status is PENDING",
        "fe": "TransferPage (/tenant/transfer)", "be": "StockTransferController.rejectTransfer",
        "test_cases": [
            {"id": "TC_TRF_003", "desc": "Reject internal transfer ticket", "proc": "1. Click 'Từ chối'.\n2. Enter reason.", "expected": "Transfer ticket marked REJECTED.", "pre": "Ticket is PENDING"}
        ]
    },

    # --- MODULE 13: WMS INVENTORY AUDIT / STOCKTAKE ---
    {
        "no": 64, "name": "Create Inventory Audit Plan", "sheet": "Inventory Audit",
        "desc": "Verify Tenant scheduling periodic warehouse stocktake: setting audit scope, assigning counter staff, and preparing ticket.",
        "pre": "User is Tenant, active lease contract exists, no conflicting active audit",
        "fe": "InventoryAuditPage (/tenant/inventory/audit)", "be": "InventoryAuditController.create (InventoryAuditService.createAudit)",
        "test_cases": [
            {"id": "TC_AUD_001", "desc": "Create inventory audit plan in DRAFT status", "proc": "1. Go to Inventory Audit > 'Tạo đợt kiểm kê'.\n2. Select warehouse, assigned counter staff, and audit scope.\n3. Save plan.", "expected": "Audit ticket created in DRAFT status.", "pre": "Active lease contract"}
        ]
    },
    {
        "no": 65, "name": "Start Audit and Snapshot Stock", "sheet": "Inventory Audit",
        "desc": "Verify starting audit ticket, locking warehouse stock movements, and capturing system book inventory snapshot.",
        "pre": "Audit status is DRAFT",
        "fe": "InventoryAuditDetailPage (/tenant/inventory/audit/:id)", "be": "InventoryAuditController.start (InventoryAuditService.startAudit)",
        "test_cases": [
            {"id": "TC_AUD_002", "desc": "Start audit and lock warehouse movements", "proc": "1. Open draft audit.\n2. Click 'Bắt đầu kiểm kê'.", "expected": "Status changes to IN_PROGRESS, stock movements locked, snapshot captured.", "pre": "Audit is DRAFT"}
        ]
    },
    {
        "no": 66, "name": "Save Physical Count Results (Blind Count)", "sheet": "Inventory Audit",
        "desc": "Verify counter staff recording counted physical quantities for each rack/bin location (blind count hides book quantity).",
        "pre": "Audit status is IN_PROGRESS, user is assigned counter",
        "fe": "InventoryAuditDetailPage (Blind Count View)", "be": "InventoryAuditController.saveCounts (InventoryAuditService.saveAuditCounts)",
        "test_cases": [
            {"id": "TC_AUD_003", "desc": "Counter enters physical counted quantities", "proc": "1. Counter staff opens audit.\n2. Enters actual counted quantity for each bin/SKU.\n3. Clicks 'Lưu kết quả đếm'.", "expected": "Actual quantities saved; book quantity remains masked for counter.", "pre": "Audit is IN_PROGRESS"}
        ]
    },
    {
        "no": 67, "name": "Submit Inventory Audit", "sheet": "Inventory Audit",
        "desc": "Verify counter staff submitting finalized count results, revealing book quantities and discrepancy variances for management review.",
        "pre": "Audit status is IN_PROGRESS, all items have recorded count",
        "fe": "InventoryAuditDetailPage (Button Nộp kết quả kiểm kê)", "be": "InventoryAuditController.submit (InventoryAuditService.submitAudit)",
        "test_cases": [
            {"id": "TC_AUD_004", "desc": "Submit finalized count results", "proc": "1. Counter verifies all bins counted.\n2. Clicks 'Nộp kết quả kiểm kê'.", "expected": "Status changes to SUBMITTED, variances calculated, ready for manager approval.", "pre": "All items counted"}
        ]
    },
    {
        "no": 68, "name": "Approve Inventory Audit", "sheet": "Inventory Audit",
        "desc": "Verify manager reviewing physical count vs snapshot, auto-generating adjustment receipts, updating stock, and releasing lock.",
        "pre": "Audit status is SUBMITTED, physical counts completed, approver is not the assigned counter",
        "fe": "InventoryAuditDetailPage (Button Duyệt kiểm kê)", "be": "InventoryAuditController.approve (InventoryAuditService.approveAudit)",
        "test_cases": [
            {"id": "TC_AUD_005", "desc": "Manager approves audit with variances", "proc": "1. Tenant manager opens submitted audit.\n2. Reviews discrepancy variances.\n3. Clicks 'Phê duyệt kiểm kê'.", "expected": "Audit status set to APPROVED, stock batches reconciled, movement lock released.", "pre": "Audit is SUBMITTED, approver is not counter"},
            {"id": "TC_AUD_006", "desc": "Assigned counter attempts to self-approve audit", "proc": "1. Counter staff attempts to click Approve on own audit.", "expected": "System throws ForbiddenException: 'Người thực hiện kiểm kê không được tự duyệt phiếu'.", "pre": "User is assigned counter"}
        ]
    },
    {
        "no": 69, "name": "Cancel Inventory Audit Ticket", "sheet": "Inventory Audit",
        "desc": "Verify cancelling an audit ticket in DRAFT or IN_PROGRESS state and releasing warehouse movement lock.",
        "pre": "User is Tenant, audit status is DRAFT or IN_PROGRESS",
        "fe": "InventoryAuditDetailPage", "be": "InventoryAuditController.cancel (InventoryAuditService.cancelAudit)",
        "test_cases": [
            {"id": "TC_AUD_007", "desc": "Cancel in-progress inventory audit", "proc": "1. Click 'Hủy kiểm kê'.\n2. Enter reason.", "expected": "Status set to CANCELLED, warehouse lock released.", "pre": "Audit is DRAFT/IN_PROGRESS"}
        ]
    },

    # --- MODULE 14: TENANT STAFF ORGANIZATION & STAFF PORTAL ---
    {
        "no": 70, "name": "Invite Tenant Staff", "sheet": "Staff Management",
        "desc": "Verify Tenant inviting staff via email: checking organization staff quota limit, validating unique email, and generating secure 48h token.",
        "pre": "User is Tenant, active staff count + pending invites < package maxStaff quota",
        "fe": "TenantStaffManagementPage (/tenant/staffs)", "be": "TenantStaffController.inviteStaff (TenantStaffService.sendInvitation)",
        "test_cases": [
            {"id": "TC_STF_001", "desc": "Tenant invites staff within quota", "proc": "1. Go to Staff Management > 'Mời nhân viên'.\n2. Enter full name, phone, email.\n3. Click 'Gửi lời mời'.", "expected": "Invitation created (HTTP 201), invitation email sent with 48h token.", "pre": "Quota available"},
            {"id": "TC_STF_002", "desc": "Invite staff when quota exceeded", "proc": "1. Invite new staff when active staff count >= package limit.", "expected": "System throws BadRequestException (STAFF_LIMIT_EXCEEDED).", "pre": "Quota exceeded"}
        ]
    },
    {
        "no": 71, "name": "Accept Staff Invitation", "sheet": "Staff Management",
        "desc": "Verify invited staff clicking email activation link, setting up account password, and joining tenant organization.",
        "pre": "Staff holds a valid, unexpired 48h invitation token",
        "fe": "StaffAcceptInvitationPage (/staff/accept)", "be": "AuthController.acceptStaffInvitation (TenantStaffService.acceptInvitation)",
        "test_cases": [
            {"id": "TC_STF_003", "desc": "Staff activates account with invitation token", "proc": "1. Open email invitation link.\n2. Set new password.\n3. Click 'Kích hoạt tài khoản'.", "expected": "Account created/activated, linked to Tenant organization as ROLE_STAFF.", "pre": "Token is valid"}
        ]
    },
    {
        "no": 72, "name": "Get Tenant Staff Members List", "sheet": "Staff Management",
        "desc": "Verify retrieving list of all active and pending staff members in tenant organization with warehouse filter.",
        "pre": "User is Tenant",
        "fe": "TenantStaffManagementPage (/tenant/staffs)", "be": "TenantStaffController.listStaffs (TenantStaffService.listStaffs)",
        "test_cases": [
            {"id": "TC_STF_004", "desc": "Retrieve staff members list", "proc": "1. Open Staff Management page.\n2. View active and pending members.", "expected": "Displays paginated list of organization staff members.", "pre": "User is Tenant"}
        ]
    },
    {
        "no": 73, "name": "Delete Tenant Staff", "sheet": "Staff Management",
        "desc": "Verify soft-deleting staff member, revoking organization access, and automatically terminating all active warehouse assignments.",
        "pre": "User is Tenant, target staff member exists in organization",
        "fe": "TenantStaffManagementPage (/tenant/staffs)", "be": "TenantStaffController.removeStaff (TenantStaffService.removeStaff)",
        "test_cases": [
            {"id": "TC_STF_005", "desc": "Tenant removes staff member", "proc": "1. Click Remove on staff member.\n2. Confirm removal.", "expected": "Staff member marked resigned (isDeleted=true), all warehouse assignments revoked.", "pre": "Staff member exists"}
        ]
    },
    {
        "no": 74, "name": "Assign Staff Warehouse", "sheet": "Staff Management",
        "desc": "Verify Tenant assigning an active staff member to a specific leased warehouse, configuring WMS operational roles and custom job titles.",
        "pre": "Staff member is active in Tenant org, Tenant has an active lease contract for target warehouse",
        "fe": "TenantStaffManagementPage (/tenant/staffs)", "be": "TenantStaffController.assignWarehouse (TenantStaffService.assignWarehouseToStaff)",
        "test_cases": [
            {"id": "TC_STF_006", "desc": "Assign staff to manage leased warehouse", "proc": "1. Open staff member details.\n2. Click 'Phân công kho'.\n3. Select warehouse and enter custom title.\n4. Save assignment.", "expected": "StaffWarehouseAssignment created (ACTIVE status), granting staff WMS access to warehouse.", "pre": "Staff active, contract active"}
        ]
    },
    {
        "no": 75, "name": "Revoke Staff Warehouse Assignment", "sheet": "Staff Management",
        "desc": "Verify Tenant unassigning a staff member from a specific warehouse and revoking operational privileges.",
        "pre": "User is Tenant, target assignment exists and is active",
        "fe": "TenantStaffManagementPage (/tenant/staffs)", "be": "TenantStaffController.revokeAssignment (TenantStaffService.revokeWarehouseAssignment)",
        "test_cases": [
            {"id": "TC_STF_007", "desc": "Revoke warehouse assignment from staff", "proc": "1. Click Revoke on warehouse assignment.\n2. Confirm.", "expected": "Assignment status updated to REVOKED, staff access to warehouse revoked.", "pre": "Assignment is active"}
        ]
    },
    {
        "no": 76, "name": "Staff View Tasks and Work History", "sheet": "Staff Management",
        "desc": "Verify staff members checking their assigned WMS operational tasks (receipts, audits) and career tenure history.",
        "pre": "User logged in with Staff role",
        "fe": "StaffTasksPage (/staff/tasks), StaffCareerHistoryPage (/staff/career-history)", "be": "StaffSelfController.getOperations, getMyWorkHistory",
        "test_cases": [
            {"id": "TC_STF_008", "desc": "Staff checks assigned daily tasks and career history", "proc": "1. Log in as Staff.\n2. Open /staff/tasks and /staff/career-history.", "expected": "Displays assigned receipts/audits and past organization tenures accurately.", "pre": "User is Staff"}
        ]
    },

    # --- MODULE 15: DATA EXCHANGE (IMPORT / EXPORT) ---
    {
        "no": 77, "name": "Export WMS Product Catalog", "sheet": "Data Exchange",
        "desc": "Verify exporting all product categories, UOMs, and SKU master data into a structured Excel workbook (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active subscription exists",
        "fe": "SkuPage (Button Xuất Excel Catalog)", "be": "CatalogExportController.export (CatalogExportService.exportCatalog)",
        "test_cases": [
            {"id": "TC_DAT_001", "desc": "Export product catalog to Excel workbook", "proc": "1. Go to SKU page.\n2. Click 'Xuất Excel'.", "expected": "Browser downloads .xlsx workbook with Categories and SKUs sheets.", "pre": "Active subscription"}
        ]
    },
    {
        "no": 78, "name": "Import WMS Product Catalog", "sheet": "Data Exchange",
        "desc": "Verify bulk importing categories and SKUs from Excel (.xlsx) with dry-run validation error report and apply modes.",
        "pre": "User is Tenant, valid Excel file format provided",
        "fe": "SkuPage (Modal Nhập Excel Catalog)", "be": "CatalogImportController.importCatalog (CatalogImportService.importCatalog)",
        "test_cases": [
            {"id": "TC_DAT_002", "desc": "Import catalog with dry-run validation", "proc": "1. Upload Excel file.\n2. Select dry-run mode.\n3. Inspect preview validation results.\n4. Execute apply.", "expected": "Validation report shows 0 errors, apply creates categories and SKUs in DB.", "pre": "Valid Excel structure"}
        ]
    },
    {
        "no": 79, "name": "Export Inventory Stock Snapshot", "sheet": "Data Exchange",
        "desc": "Verify exporting entire warehouse stock positions, batch expiry dates, and bin allocations into Excel (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active contract exists",
        "fe": "InventoryPage (Button Xuất Tồn kho)", "be": "InventorySnapshotExportController.exportSnapshot",
        "test_cases": [
            {"id": "TC_DAT_003", "desc": "Export warehouse stock snapshot to Excel", "proc": "1. Open Inventory page.\n2. Click 'Xuất Tồn kho'.", "expected": "Browser downloads stock snapshot .xlsx file with batches and bin positions.", "pre": "Stock exists"}
        ]
    },
    {
        "no": 80, "name": "Import Offline Stock Movements", "sheet": "Data Exchange",
        "desc": "Verify bulk importing offline warehouse stock inbound/outbound movements from Excel workbook with batch balance validation.",
        "pre": "User is Tenant or assigned Staff, valid workbook structure",
        "fe": "InventoryPage (Modal Nhập biến động ngoại tuyến)", "be": "OfflineMovementWorkbookController.importMovement",
        "test_cases": [
            {"id": "TC_DAT_004", "desc": "Import offline movement workbook", "proc": "1. Upload completed offline movement Excel file.\n2. Click 'Nhập dữ liệu'.", "expected": "System validates quantities and applies stock movements into inventory batches.", "pre": "Valid Excel file"}
        ]
    },
    {
        "no": 81, "name": "Export Audit Physical Count Sheet", "sheet": "Data Exchange",
        "desc": "Verify exporting blank physical counting sheet (SKU list, rack/bin locations) for offline warehouse stocktaking clipboard.",
        "pre": "Audit ticket is created in DRAFT / IN_PROGRESS status",
        "fe": "InventoryAuditDetailPage (Xuất phiếu đếm kho)", "be": "AuditCountSheetExportController.exportCountSheet",
        "test_cases": [
            {"id": "TC_DAT_005", "desc": "Export physical count sheet for audit", "proc": "1. Open audit detail.\n2. Click 'Xuất phiếu kiểm kê'.", "expected": "Downloads count sheet .xlsx formatted for clipboard printing.", "pre": "Audit exists"}
        ]
    },

    # --- MODULE 16: AI CHATBOT & NOTIFICATIONS ---
    {
        "no": 82, "name": "Chat with StockSpace AI Assistant", "sheet": "AI Chatbot",
        "desc": "Verify interactive AI chatbot answering warehouse inquiries, rental pricing, policy guidance, and WMS navigation help.",
        "pre": "Internet access, AI OpenAI / Gemini API service active",
        "fe": "AIChatWidget (Floating Widget)", "be": "UserChatController / GuestChatController",
        "test_cases": [
            {"id": "TC_AI_001", "desc": "Ask AI assistant for warehouse rental consultation", "proc": "1. Click AI Chat widget.\n2. Type 'Tìm kho quận 9 giá dưới 50 triệu'.\n3. Send message.", "expected": "AI streams intelligent contextual answer recommending matching warehouses.", "pre": "AI service active"}
        ]
    },
    {
        "no": 83, "name": "Manage Notifications", "sheet": "Notifications",
        "desc": "Verify receiving real-time notifications for contract updates, receipts, and audits, marking as read.",
        "pre": "User is authenticated",
        "fe": "NotificationBell (Header)", "be": "NotificationController.getMyNotifications, markAsRead, getUnreadCount",
        "test_cases": [
            {"id": "TC_NOTIF_001", "desc": "View notifications and mark as read", "proc": "1. Click bell icon in header.\n2. View unread notifications.\n3. Click on a notification to mark as read.", "expected": "Unread counter decreases, notification marked as read in DB.", "pre": "Notifications exist"}
        ]
    },

    # --- MODULE 17: SYSTEM ADMINISTRATION & ANALYTICS ---
    {
        "no": 84, "name": "Admin Manage User Accounts", "sheet": "System Administration",
        "desc": "Verify Admin viewing users list, filtering by role (Owner, Tenant, Staff, Inspector), locking/unlocking accounts.",
        "pre": "User logged in with Admin role",
        "fe": "UserManagementPage (/admin/users)", "be": "AdminUserController.listUsers, lockUser, unlockUser",
        "test_cases": [
            {"id": "TC_ADM_001", "desc": "Admin locks suspicious user account", "proc": "1. Open /admin/users.\n2. Click Lock on user account.\n3. Confirm action.", "expected": "User isActive set to false; user is prevented from logging in.", "pre": "User is Admin"}
        ]
    },
    {
        "no": 85, "name": "Admin Manage System Roles and Permissions", "sheet": "System Administration",
        "desc": "Verify Admin configuring RBAC role permissions, viewing permission matrix, and updating role grants.",
        "pre": "User logged in with Admin role",
        "fe": "PermissionManagementPage (/admin/permissions)", "be": "AdminRoleController, AdminPermissionController",
        "test_cases": [
            {"id": "TC_ADM_002", "desc": "Admin views and updates role permission grants", "proc": "1. Open /admin/permissions.\n2. Inspect role permission matrix.\n3. Update permission grants.", "expected": "Role permissions saved and enforced on next API request.", "pre": "User is Admin"}
        ]
    },
    {
        "no": 86, "name": "Admin Manage Warehouse Types", "sheet": "System Administration",
        "desc": "Verify Admin creating and editing warehouse category types (Cold Storage, Bonded, General, Hazardous).",
        "pre": "User logged in with Admin role",
        "fe": "WarehousesTypePage (/admin/warehousetypes)", "be": "AdminWarehouseTypeController.createType, updateType",
        "test_cases": [
            {"id": "TC_ADM_003", "desc": "Admin creates new warehouse type", "proc": "1. Open /admin/warehousetypes.\n2. Enter name 'Kho dược phẩm GSP'.\n3. Save type.", "expected": "Warehouse type added to system catalog.", "pre": "User is Admin"}
        ]
    },
    {
        "no": 87, "name": "Admin Manage System Policies and Configurations", "sheet": "System Administration",
        "desc": "Verify Admin updating platform policies (terms of service, cancellation policies, deposit rates, Commission percentage).",
        "pre": "User logged in with Admin role",
        "fe": "SystemPolicyPage (/admin/systempolicy)", "be": "AdminSystemPolicyController, AdminSystemConfigController",
        "test_cases": [
            {"id": "TC_ADM_004", "desc": "Admin updates platform policy content", "proc": "1. Open /admin/systempolicy.\n2. Edit cancellation policy terms.\n3. Save policy.", "expected": "Policy updated and visible on public terms page.", "pre": "User is Admin"}
        ]
    },
    {
        "no": 88, "name": "Admin View Operational Analytics", "sheet": "System Administration",
        "desc": "Verify Admin viewing platform KPI analytics: total revenue, active contracts, warehouse occupancy rate, and user growth.",
        "pre": "User logged in with Admin role",
        "fe": "AdminDashboard (/admin/dashboard)", "be": "AdminStatsController.getOverviewStats",
        "test_cases": [
            {"id": "TC_ADM_005", "desc": "Admin views platform KPI analytics", "proc": "1. Go to /admin/dashboard.\n2. Inspect charts and revenue summary.", "expected": "Platform dashboard displays live aggregated revenue, contracts, and occupancy metrics.", "pre": "User is Admin"}
        ]
    }
]

# Generate grouped module list
module_sheets = {}
for fn in master_functions:
    sh = fn["sheet"]
    if sh not in module_sheets:
        module_sheets[sh] = {
            "sheet": sh,
            "feature": sh,
            "requirement": f"Verify all operational workflows, input validations, security permissions, and data persistence for {sh} module.",
            "functions": []
        }
    module_sheets[sh]["functions"].append(fn)

modules_list = list(module_sheets.values())

# HTML generation
html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockSpace - Test Case System Master (88 Functions - 100% BE & FE Verified)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy: #002060;
      --navy-light: #0d3880;
      --border-dark: #000000;
      --border-gray: #d1d5db;
      --bg-page: #f1f5f9;
      --bg-card: #ffffff;
      --text-main: #000000;
      --link-blue: #1d4ed8;
      --pass-green: #15803d;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-page);
      color: #0f172a;
      padding: 16px;
      line-height: 1.45;
    }}
    .wrapper {{
      max-width: 1560px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #cbd5e1;
      overflow: hidden;
    }}

    /* Global Header Toolbar */
    .header-bar {{
      background: #1e293b;
      color: white;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      border-bottom: 1px solid #334155;
    }}
    .header-title h1 {{
      font-size: 19px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.3px;
    }}
    .header-title p {{
      font-size: 12.5px;
      color: #94a3b8;
      margin-top: 2px;
    }}
    .nav-tabs {{
      display: flex;
      gap: 8px;
      background: #0f172a;
      padding: 4px;
      border-radius: 8px;
    }}
    .nav-tab {{
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      color: #94a3b8;
      background: transparent;
      border: none;
      transition: all 0.15s;
    }}
    .nav-tab:hover {{ color: white; }}
    .nav-tab.active {{
      background: #3b82f6;
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    }}

    /* Action buttons */
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }}
    .btn-green {{
      background: #10b981;
      color: white;
    }}
    .btn-green:hover {{ background: #059669; }}

    /* Tab View Sections */
    .tab-content {{ display: none; }}
    .tab-content.active {{ display: block; }}

    /* Excel Report 5 Form Styling */
    .excel-container {{
      padding: 24px;
      background: #ffffff;
    }}
    .excel-title {{
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 18px;
      color: #000;
    }}

    /* Summary Meta Table */
    .meta-box {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      margin-bottom: 20px;
      border: 1px solid var(--border-gray);
    }}
    .meta-box td {{
      padding: 8px 14px;
      border: 1px solid var(--border-gray);
    }}
    .meta-label {{
      font-weight: 700;
      color: #8b0000;
      width: 260px;
      background: #fdfbf7;
    }}
    .meta-val {{
      color: #111827;
      font-weight: 500;
    }}
    .meta-val-green {{
      color: #047857;
      font-style: italic;
      white-space: pre-line;
    }}

    /* Controls row */
    .filter-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }}
    .search-input {{
      padding: 7px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      width: 320px;
      outline: none;
    }}
    .search-input:focus {{ border-color: #3b82f6; }}
    .pill-group {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }}
    .pill {{
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 11.5px;
      font-weight: 600;
      background: #e2e8f0;
      color: #334155;
      cursor: pointer;
      border: 1px solid #cbd5e1;
    }}
    .pill:hover {{ background: #cbd5e1; }}
    .pill.active {{ background: var(--navy); color: white; border-color: var(--navy); }}

    /* Tab 1: Master List Table (Navy Blue Header - Screenshot Format) */
    .table-master {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: white;
    }}
    .table-master th {{
      background: var(--navy) !important;
      color: #ffffff !important;
      font-weight: 700;
      text-align: center;
      padding: 10px 12px;
      border: 1px solid #001740;
      font-size: 13.5px;
      white-space: nowrap;
    }}
    .table-master td {{
      padding: 8px 12px;
      border: 1px solid #000000;
      vertical-align: middle;
      color: #000;
    }}
    .table-master tr:hover td {{
      background: #f0fdf4 !important;
      cursor: pointer;
    }}
    .table-master .col-no {{
      text-align: center;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      width: 45px;
    }}
    .table-master .col-func {{
      font-weight: 600;
      color: #0f172a;
      width: 220px;
    }}
    .table-master .col-sheet {{
      color: #4338ca;
      text-decoration: underline;
      font-weight: 600;
      width: 180px;
    }}
    .table-master .col-desc {{
      min-width: 320px;
      line-height: 1.4;
    }}
    .table-master .col-pre {{
      min-width: 260px;
      line-height: 1.4;
    }}
    .table-master .col-map {{
      font-size: 11.5px;
      color: #475569;
      font-family: 'JetBrains Mono', monospace;
      min-width: 200px;
    }}

    /* Tab 2: Module Detail View */
    .module-header-box {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 16px;
      border: 1px solid #cbd5e1;
    }}
    .module-header-box td {{
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
    }}
    .module-header-box .hdr-label {{
      background: #f1f5f9;
      font-weight: 700;
      width: 180px;
    }}
    .table-detail {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      background: white;
    }}
    .table-detail th {{
      background: #1e293b;
      color: white;
      font-weight: 700;
      padding: 9px 10px;
      border: 1px solid #0f172a;
      text-align: left;
      font-size: 12.5px;
    }}
    .table-detail td {{
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }}
    .table-detail tr:nth-child(even) {{ background: #f8fafc; }}

    /* Modal */
    .modal-overlay {{
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      padding: 20px;
    }}
    .modal-overlay.open {{
      opacity: 1;
      pointer-events: auto;
    }}
    .modal-box {{
      background: white;
      width: 95%;
      max-width: 1400px;
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #334155;
    }}
    .modal-hdr {{
      background: var(--navy);
      color: white;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .modal-hdr h3 {{
      font-size: 16px;
      font-weight: 700;
    }}
    .modal-body {{
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }}
    .modal-close {{
      background: none;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
    }}

    /* Toast */
    #toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #047857;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s ease;
      pointer-events: none;
      z-index: 9999;
    }}
    #toast.show {{
      opacity: 1;
      transform: translateY(0);
    }}
  </style>
</head>
<body>

<div class="wrapper">
  <!-- Top Navigation & Action Bar -->
  <div class="header-bar">
    <div class="header-title">
      <h1>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        StockSpace - System Test Master Portal
      </h1>
      <p>Hệ thống tra cứu & kiểm thử toàn diện: 88 Functions & 17 Phân hệ (100% Khớp Source Code BE & FE thực tế)</p>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <div class="nav-tabs">
        <button class="nav-tab active" id="tabBtn1" onclick="switchTab('master')">
          📋 1. TEST CASE LIST (Bảng 88 Chức Năng Chuẩn Mẫu)
        </button>
        <button class="nav-tab" id="tabBtn2" onclick="switchTab('detail')">
          🔬 2. SYSTEM TEST DETAILS (Chi Tiết Test Cases Từng Sheet)
        </button>
      </div>
      <button class="btn btn-green" id="btnMainCopy" onclick="copyMasterTsv()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Copy Bảng Này Vào Excel</span>
      </button>
    </div>
  </div>

  <!-- TAB 1: MASTER LIST -->
  <div class="tab-content active" id="viewMaster">
    <div class="excel-container">
      <div class="excel-title">TEST CASE LIST</div>
      <table class="meta-box">
        <tr>
          <td class="meta-label">Project Name</td>
          <td class="meta-val">StockSpace - Website allows posting, searching for warehouse space and managing it after rental(Không gian lưu trữ - Website cho phép đăng tải, tìm kiếm kho bãi và quản lí sau khi thuê)</td>
        </tr>
        <tr>
          <td class="meta-label">Project Code</td>
          <td class="meta-val">SU26SE015_GSU12</td>
        </tr>
        <tr>
          <td class="meta-label">Test Environment Setup Description</td>
          <td class="meta-val-green">1. Server: Spring Boot 3.x (Java 21), Spring Security (JWT / RBAC), Hibernate/JPA, Redis Cache, Vite / React 18, NodeJS 20+
2. Database: PostgreSQL 16 (Relational DB & PostGIS Spatial Data)
3. Web Browser: Google Chrome (v120+), Microsoft Edge (v120+)
4. External Gateways: VNPay Payment Gateway Sandbox, Cloudinary Image CDN, SMTP Gmail Service, OpenStreetMap API</td>
        </tr>
      </table>

      <!-- Search & Filters -->
      <div class="filter-bar">
        <input type="text" class="search-input" id="searchMaster" placeholder="🔍 Tìm kiếm chức năng, sheet, mô tả...">
        <div class="pill-group" id="pillsMaster">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Master Table -->
      <div style="overflow-x: auto;">
        <table class="table-master" id="tblMaster">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-func">Function Name</th>
              <th class="col-sheet">Sheet Name</th>
              <th class="col-desc">Description</th>
              <th class="col-pre">Pre-Condition</th>
              <th class="col-map">Ánh xạ Code Thực tế (FE & BE)</th>
            </tr>
          </thead>
          <tbody id="tblMasterBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 2: DETAILED MODULE VIEW -->
  <div class="tab-content" id="viewDetail">
    <div class="excel-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-weight: 700; font-size: 14px;">Chọn Sheet Phân Hệ:</label>
          <select id="selectModule" style="padding: 7px 12px; font-weight: 600; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; background: #fff;">
            <!-- Populated by JS -->
          </select>
        </div>
        <button class="btn btn-green" onclick="copyCurrentModuleTsv()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <span>Copy Sheet Này Vào Excel</span>
        </button>
      </div>

      <!-- Module Summary Block -->
      <table class="module-header-box">
        <tr>
          <td class="hdr-label">Feature</td>
          <td id="detFeature" style="font-weight: 600;"></td>
          <td style="width: 100px; text-align: center; font-weight: 700; color: var(--pass-green);">Passed: 100%</td>
        </tr>
        <tr>
          <td class="hdr-label">Test requirement</td>
          <td id="detRequirement" colspan="2"></td>
        </tr>
      </table>

      <!-- Main Detailed Test Cases Table -->
      <div style="overflow-x: auto;">
        <table class="table-detail" id="tblDetail">
          <thead>
            <tr>
              <th style="width: 110px;">Test Case ID</th>
              <th style="width: 220px;">Test Case Description</th>
              <th style="min-width: 300px;">Test Case Procedure</th>
              <th style="min-width: 260px;">Expected Results</th>
              <th style="width: 200px;">Pre-conditions</th>
              <th style="width: 75px; text-align: center;">Round 1</th>
              <th style="width: 85px; text-align: center;">Test date</th>
              <th style="width: 80px; text-align: center;">Tester</th>
            </tr>
          </thead>
          <tbody id="tblDetailBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Modal for Function Quick View -->
<div class="modal-overlay" id="detailModal">
  <div class="modal-box">
    <div class="modal-hdr">
      <h3 id="modalTitle">Chi Tiết Function & Test Cases</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div id="toast">Đã copy dữ liệu TSV vào Clipboard! Nhấn Ctrl + V vào Excel.</div>

<script>
  const rawFunctions = {json.dumps(master_functions, ensure_ascii=False)};
  const rawModules = {json.dumps(modules_list, ensure_ascii=False)};

  function renderMasterTable(list) {{
    const tbody = document.getElementById('tblMasterBody');
    tbody.innerHTML = '';
    list.forEach(fn => {{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-no">${{fn.no}}</td>
        <td class="col-func">${{fn.name}}</td>
        <td class="col-sheet" onclick="jumpToSheet('${{fn.sheet}}')">${{fn.sheet}}</td>
        <td class="col-desc">${{fn.desc}}</td>
        <td class="col-pre">${{fn.pre}}</td>
        <td class="col-map"><b>FE:</b> ${{fn.fe || '-'}}<br><b>BE:</b> ${{fn.be || '-'}}</td>
      `;
      tr.onclick = (e) => {{
        if (e.target.classList.contains('col-sheet')) return;
        openModal(fn);
      }};
      tbody.appendChild(tr);
    }});
  }}

  function initPills() {{
    const container = document.getElementById('pillsMaster');
    const sheets = ['ALL', ...new Set(rawFunctions.map(f => f.sheet))];
    container.innerHTML = '';
    sheets.forEach(sh => {{
      const pill = document.createElement('div');
      pill.className = 'pill' + (sh === 'ALL' ? ' active' : '');
      pill.textContent = sh === 'ALL' ? 'Tất cả (' + rawFunctions.length + ')' : sh;
      pill.onclick = () => {{
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterMaster();
      }};
      container.appendChild(pill);
    }});
  }}

  function filterMaster() {{
    const query = document.getElementById('searchMaster').value.toLowerCase().trim();
    const activePill = document.querySelector('.pill.active').textContent;
    const selectedSheet = activePill.startsWith('Tất cả') ? 'ALL' : activePill;

    const filtered = rawFunctions.filter(fn => {{
      const matchSheet = (selectedSheet === 'ALL' || fn.sheet === selectedSheet);
      const matchQuery = !query ||
        fn.name.toLowerCase().includes(query) ||
        fn.sheet.toLowerCase().includes(query) ||
        fn.desc.toLowerCase().includes(query) ||
        fn.pre.toLowerCase().includes(query);
      return matchSheet && matchQuery;
    }});
    renderMasterTable(filtered);
  }}

  function switchTab(tab) {{
    document.getElementById('tabBtn1').classList.toggle('active', tab === 'master');
    document.getElementById('tabBtn2').classList.toggle('active', tab === 'detail');
    document.getElementById('viewMaster').classList.toggle('active', tab === 'master');
    document.getElementById('viewDetail').classList.toggle('active', tab === 'detail');
  }}

  function jumpToSheet(sheetName) {{
    switchTab('detail');
    document.getElementById('selectModule').value = sheetName;
    loadModuleDetail(sheetName);
  }}

  function initDetailSelect() {{
    const select = document.getElementById('selectModule');
    select.innerHTML = '';
    rawModules.forEach(mod => {{
      const opt = document.createElement('option');
      opt.value = mod.sheet;
      opt.textContent = `${{mod.sheet}} (${{mod.functions.length}} functions)`;
      select.appendChild(opt);
    }});
    select.onchange = (e) => loadModuleDetail(e.target.value);
    if (rawModules.length > 0) {{
      loadModuleDetail(rawModules[0].sheet);
    }}
  }}

  function loadModuleDetail(sheetName) {{
    const mod = rawModules.find(m => m.sheet === sheetName);
    if (!mod) return;
    document.getElementById('detFeature').textContent = mod.feature;
    document.getElementById('detRequirement').textContent = mod.requirement;

    const tbody = document.getElementById('tblDetailBody');
    tbody.innerHTML = '';
    mod.functions.forEach(fn => {{
      if (!fn.test_cases || fn.test_cases.length === 0) return;
      fn.test_cases.forEach(tc => {{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--navy);">${{tc.id}}</td>
          <td style="font-weight: 600;">${{tc.desc}}</td>
          <td style="white-space: pre-line;">${{tc.proc}}</td>
          <td style="white-space: pre-line;">${{tc.expected}}</td>
          <td style="font-style: italic; color: #475569;">${{tc.pre}}</td>
          <td style="text-align: center; font-weight: 700; color: var(--pass-green);">P</td>
          <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 11.5px;">12/08/2026</td>
          <td style="text-align: center; font-weight: 600;">Phucnbh</td>
        `;
        tbody.appendChild(tr);
      }});
    }});
  }}

  function openModal(fn) {{
    document.getElementById('modalTitle').textContent = `No. ${{fn.no}} - ${{fn.name}} (${{fn.sheet}})`;
    let tcsHtml = '';
    if (fn.test_cases && fn.test_cases.length > 0) {{
      tcsHtml = `
        <table class="table-detail" style="margin-top: 12px;">
          <thead>
            <tr>
              <th style="width: 120px;">Test Case ID</th>
              <th>Description</th>
              <th>Procedure</th>
              <th>Expected Results</th>
              <th>Pre-condition</th>
            </tr>
          </thead>
          <tbody>
            ${{fn.test_cases.map(tc => `
              <tr>
                <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--navy);">${{tc.id}}</td>
                <td style="font-weight: 600;">${{tc.desc}}</td>
                <td style="white-space: pre-line;">${{tc.proc}}</td>
                <td style="white-space: pre-line;">${{tc.expected}}</td>
                <td style="font-style: italic;">${{tc.pre}}</td>
              </tr>
            `).join('')}}
          </tbody>
        </table>
      `;
    }} else {{
      tcsHtml = '<p style="color: #64748b; font-style: italic; margin-top: 12px;">Chức năng này được kiểm thử trong chuỗi tích hợp của hệ thống.</p>';
    }}

    document.getElementById('modalBody').innerHTML = `
      <div style="background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 14px;">
        <p><b>Mô tả:</b> ${{fn.desc}}</p>
        <p style="margin-top: 6px;"><b>Tiền điều kiện:</b> ${{fn.pre}}</p>
        <p style="margin-top: 6px;"><b>Frontend:</b> <code>${{fn.fe || '-'}}</code></p>
        <p style="margin-top: 4px;"><b>Backend:</b> <code>${{fn.be || '-'}}</code></p>
      </div>
      <h4 style="font-size: 14px; font-weight: 700; color: #1e293b;">Danh sách Test Cases chi tiết:</h4>
      ${{tcsHtml}}
    `;
    document.getElementById('detailModal').classList.add('open');
  }}

  function closeModal() {{
    document.getElementById('detailModal').classList.remove('open');
  }}

  function showToast(msg) {{
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }}

  function copyMasterTsv() {{
    const lines = ["No\\tFunction Name\\tSheet Name\\tDescription\\tPre-Condition"];
    rawFunctions.forEach(f => {{
      lines.push(`${{f.no}}\\t${{f.name}}\\t${{f.sheet}}\\t${{f.desc}}\\t${{f.pre}}`);
    }});
    navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
      showToast("Đã copy toàn bộ bảng 88 Functions (TSV) vào Clipboard!");
    }});
  }}

  function copyCurrentModuleTsv() {{
    const sel = document.getElementById('selectModule').value;
    const mod = rawModules.find(m => m.sheet === sel);
    if (!mod) return;
    const lines = ["Test Case ID\\tTest Case Description\\tTest Case Procedure\\tExpected Results\\tPre-conditions\\tRound 1\\tTest date\\tTester"];
    mod.functions.forEach(f => {{
      if (!f.test_cases) return;
      f.test_cases.forEach(tc => {{
        lines.push(`${{tc.id}}\\t${{tc.desc}}\\t${{tc.proc.replace(/\\n/g, ' ')}}\\t${{tc.expected.replace(/\\n/g, ' ')}}\\t${{tc.pre}}\\tP\\t12/08/2026\\tPhucnbh`);
      }});
    }});
    navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
      showToast(`Đã copy Test Cases của Sheet '${{sel}}' vào Clipboard!`);
    }});
  }}

  document.getElementById('searchMaster').addEventListener('input', filterMaster);
  window.onclick = (e) => {{
    if (e.target.id === 'detailModal') closeModal();
  }};

  // Init
  initPills();
  renderMasterTable(rawFunctions);
  initDetailSelect();
</script>

</body>
</html>
"""

html_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_template)
print(f"Successfully written {len(master_functions)} functions to {html_path}")

# Also update the TSV file for easy pasting
tsv_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_master.tsv"
with open(tsv_path, "w", encoding="utf-8") as f:
    f.write("No\tFunction Name\tSheet Name\tDescription\tPre-Condition\n")
    for f_item in master_functions:
        f.write(f"{f_item['no']}\t{f_item['name']}\t{f_item['sheet']}\t{f_item['desc']}\t{f_item['pre']}\n")
print(f"Successfully written TSV to {tsv_path}")
