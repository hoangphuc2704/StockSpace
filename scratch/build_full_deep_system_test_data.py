import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# 1. Full database of 17 Module Sheets with detailed System Test Cases for all 85 Functions
modules_data = [
    {
        "sheet": "Authentication",
        "feature": "Authentication",
        "requirement": "Verify login, registration, password recovery, token refresh, and user profile management functionalities",
        "functions": [
            {
                "no": 1,
                "name": "Login",
                "test_cases": [
                    {
                        "id": "TC_LG_001",
                        "desc": "Login with valid credentials",
                        "proc": "1. Go to Login page / open Auth modal.\n2. Enter a valid registered email (e.g. tenant@stockspace.vn).\n3. Enter the correct password.\n4. Click 'Login' button.",
                        "expected": "User is authenticated successfully, JWT tokens stored, and redirected to Dashboard with appropriate role permissions.",
                        "pre": "User already has an active, verified account in the system"
                    },
                    {
                        "id": "TC_LG_002",
                        "desc": "Login with invalid password",
                        "proc": "1. Go to Login page.\n2. Enter a valid registered email.\n3. Enter an incorrect password.\n4. Click 'Login'.",
                        "expected": "Error message is displayed: 'Sai email hoặc mật khẩu'. User remains on login screen.",
                        "pre": "User already has a valid account"
                    },
                    {
                        "id": "TC_LG_003",
                        "desc": "Login with missing fields",
                        "proc": "1. Go to Login page.\n2. Leave email and password fields blank.\n3. Click 'Login'.",
                        "expected": "Client validation errors appear: 'Email không được để trống' and 'Mật khẩu không được để trống'. No HTTP request sent.",
                        "pre": "None"
                    },
                    {
                        "id": "TC_LG_004",
                        "desc": "Login with inactive/banned account",
                        "proc": "1. Enter credentials of an account with isActive = false.\n2. Click 'Login'.",
                        "expected": "System rejects authentication with message: 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt'.",
                        "pre": "Account exists but is locked by Admin"
                    }
                ]
            },
            {
                "no": 2,
                "name": "Register",
                "test_cases": [
                    {
                        "id": "TC_RG_001",
                        "desc": "Register with valid information",
                        "proc": "1. Go to Register page.\n2. Enter valid Full Name, Phone, Email, Password.\n3. Select role (Warehouse Owner or Tenant).\n4. Accept terms and click 'Register'.",
                        "expected": "Account created successfully, verification email sent, user guided to login or onboarding.",
                        "pre": "Email is not previously registered in the system"
                    },
                    {
                        "id": "TC_RG_002",
                        "desc": "Register with existing email",
                        "proc": "1. Go to Register page.\n2. Enter an email that is already registered.\n3. Fill other fields with valid data.\n4. Click 'Register'.",
                        "expected": "System shows error: 'Email này đã được đăng ký trong hệ thống'. Account is not created.",
                        "pre": "User already has an account with the specified email"
                    },
                    {
                        "id": "TC_RG_003",
                        "desc": "Register with invalid password format",
                        "proc": "1. Go to Register page.\n2. Enter password '123' (fewer than 6 characters).\n3. Fill other valid fields.\n4. Click 'Register'.",
                        "expected": "Validation error: 'Mật khẩu phải có tối thiểu 6 ký tự' is displayed under the password field.",
                        "pre": "None"
                    }
                ]
            },
            {
                "no": 3,
                "name": "Forget Password",
                "test_cases": [
                    {
                        "id": "TC_FP_001",
                        "desc": "Request reset link with valid email",
                        "proc": "1. Go to Forgot Password page (/forgot-password).\n2. Enter registered email.\n3. Click 'Gửi yêu cầu'.",
                        "expected": "System sends an email containing a secure 48h password reset link and displays confirmation message.",
                        "pre": "User already has a registered account with a verified email"
                    },
                    {
                        "id": "TC_FP_002",
                        "desc": "Request reset link with unregistered email",
                        "proc": "1. Go to Forgot Password page.\n2. Enter an email not registered in system.\n3. Click 'Gửi yêu cầu'.",
                        "expected": "System displays notification 'Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu' without exposing account existence.",
                        "pre": "Email does not exist in DB"
                    }
                ]
            },
            {
                "no": 4,
                "name": "Reset Password",
                "test_cases": [
                    {
                        "id": "TC_RST_001",
                        "desc": "Reset password with valid token",
                        "proc": "1. Open reset link from email (/reset-password?token=...).\n2. Enter new password and confirm new password.\n3. Click 'Cập nhật mật khẩu'.",
                        "expected": "Password is updated successfully in DB; user can log in with new credentials.",
                        "pre": "Reset token is valid and not expired"
                    },
                    {
                        "id": "TC_RST_002",
                        "desc": "Reset password with expired or tampered token",
                        "proc": "1. Open reset link with invalid/expired token.\n2. Submit new password.",
                        "expected": "Error message shown: 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ'.",
                        "pre": "Token expired (> 48h) or invalid signature"
                    }
                ]
            },
            {
                "no": 5,
                "name": "View and Update Profile",
                "test_cases": [
                    {
                        "id": "TC_PF_001",
                        "desc": "View and update user profile information",
                        "proc": "1. Log in and navigate to Profile page (/profile).\n2. Change Full Name and Phone Number.\n3. Click 'Lưu thay đổi'.",
                        "expected": "Profile information is updated and persistent across reloads; success toast displayed.",
                        "pre": "User is authenticated with valid JWT token"
                    }
                ]
            },
            {
                "no": 6,
                "name": "Change Password",
                "test_cases": [
                    {
                        "id": "TC_CP_001",
                        "desc": "Change password from account settings",
                        "proc": "1. Go to Profile > Security tab.\n2. Enter correct current password, new password, and repeat new password.\n3. Click 'Đổi mật khẩu'.",
                        "expected": "Password is changed successfully; existing sessions remain valid or require re-login.",
                        "pre": "User is authenticated and provides correct current password"
                    },
                    {
                        "id": "TC_CP_002",
                        "desc": "Change password with wrong current password",
                        "proc": "1. Enter wrong current password.\n2. Enter valid new password.\n3. Click 'Đổi mật khẩu'.",
                        "expected": "Error message shown: 'Mật khẩu hiện tại không chính xác'. Password not modified.",
                        "pre": "User is authenticated"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Warehouse Management",
        "feature": "Warehouse Management",
        "requirement": "Verify warehouse creation, admin approval, layout 2D/3D builder, quality inspection requests, and marketplace searching",
        "functions": [
            {
                "no": 7,
                "name": "Create Warehouse",
                "test_cases": [
                    {
                        "id": "TC_WH_001",
                        "desc": "Owner creates a new warehouse with valid info",
                        "proc": "1. Log in as Owner and go to 'Đăng kho mới' (/owner/postwarehouse).\n2. Enter Warehouse Name, Address, Category, Dimensions (width, length, height).\n3. Enter Price/month, Deposit terms, and upload warehouse photos.\n4. Click 'Gửi duyệt'.",
                        "expected": "Warehouse is created in PENDING_APPROVAL status; Owner is prompted to set up 2D/3D layout.",
                        "pre": "User logged in with Owner role"
                    },
                    {
                        "id": "TC_WH_002",
                        "desc": "Create warehouse with missing required fields",
                        "proc": "1. Go to Post Warehouse form.\n2. Leave Name and PricePerMonth blank.\n3. Click submit.",
                        "expected": "Validation errors highlight missing mandatory fields. Form submission prevented.",
                        "pre": "User logged in as Owner"
                    },
                    {
                        "id": "TC_WH_003",
                        "desc": "Create warehouse with invalid negative dimensions",
                        "proc": "1. Fill form with negative width or height (e.g. -10).\n2. Click submit.",
                        "expected": "Error shown: 'Kích thước kho phải lớn hơn 0'. Submission rejected.",
                        "pre": "User logged in as Owner"
                    }
                ]
            },
            {
                "no": 8,
                "name": "Update Warehouse Information",
                "test_cases": [
                    {
                        "id": "TC_WH_004",
                        "desc": "Owner updates warehouse description and amenities",
                        "proc": "1. Go to Owner Warehouse List (/owner/warehouses).\n2. Click Edit on a warehouse.\n3. Modify description, contact phone, and amenities.\n4. Save changes.",
                        "expected": "Warehouse details updated successfully; changes reflected on public detail page.",
                        "pre": "Warehouse belongs to calling Owner"
                    }
                ]
            },
            {
                "no": 9,
                "name": "Search Warehouses",
                "test_cases": [
                    {
                        "id": "TC_WH_005",
                        "desc": "Public user searches warehouses with matching keyword",
                        "proc": "1. Go to Warehouse Listing (/warehouses).\n2. Enter keyword 'Kho lạnh' in search input.\n3. Filter by Province 'Hồ Chí Minh'.\n4. Apply filters.",
                        "expected": "List displays matching published warehouses located in Hồ Chí Minh.",
                        "pre": "System has active published warehouses matching criteria"
                    },
                    {
                        "id": "TC_WH_006",
                        "desc": "Search warehouses with no matching results",
                        "proc": "1. Search for non-existent keyword 'XYZ123999'.",
                        "expected": "System displays empty state: 'Không tìm thấy kho bãi phù hợp'.",
                        "pre": "None"
                    }
                ]
            },
            {
                "no": 10,
                "name": "View Warehouse Details",
                "test_cases": [
                    {
                        "id": "TC_WH_007",
                        "desc": "Public visitor views full warehouse detail and specifications",
                        "proc": "1. Click on a warehouse card from marketplace.\n2. Inspect address, pricing, owner info, specifications, and 3D layout viewer.",
                        "expected": "All specs, photos, amenities, inspection score, and interactive 3D view load seamlessly.",
                        "pre": "Target warehouse is in VERIFIED/PUBLISHED status"
                    }
                ]
            },
            {
                "no": 11,
                "name": "Verify/Reject Warehouse (Admin)",
                "test_cases": [
                    {
                        "id": "TC_WH_008",
                        "desc": "Admin approves a pending warehouse listing",
                        "proc": "1. Log in as Admin and go to Warehouse Approval page (/admin/warehouseapprovals).\n2. Open a pending warehouse.\n3. Review submitted photos, certificate files, and layout.\n4. Click 'Phê duyệt kho'.",
                        "expected": "Warehouse status changes to VERIFIED; notification sent to Owner.",
                        "pre": "User is Admin, target warehouse status is PENDING_APPROVAL"
                    },
                    {
                        "id": "TC_WH_009",
                        "desc": "Admin rejects a warehouse listing with reason",
                        "proc": "1. Admin opens a pending warehouse.\n2. Click 'Từ chối'.\n3. Enter rejection reason: 'Hình ảnh mờ, giấy tờ PCCC chưa đầy đủ'.\n4. Submit rejection.",
                        "expected": "Warehouse status changes to REJECTED; rejection reason logged and emailed to Owner.",
                        "pre": "User is Admin, target warehouse status is PENDING_APPROVAL"
                    }
                ]
            },
            {
                "no": 12,
                "name": "Request Warehouse Inspection",
                "test_cases": [
                    {
                        "id": "TC_WH_010",
                        "desc": "Owner requests on-site quality inspection for warehouse",
                        "proc": "1. Owner navigates to warehouse detail.\n2. Click 'Yêu cầu kiểm định chất lượng'.\n3. Select preferred inspection schedule date.\n4. Submit request.",
                        "expected": "Inspection ticket is created in PENDING assignment state for Admin.",
                        "pre": "Warehouse is owned by caller"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Layout Management",
        "feature": "Layout Management",
        "requirement": "Verify 2D/3D warehouse layout designer, default and snapshot storage configurations, rack/shelf/bin hierarchies, and capacity metrics",
        "functions": [
            {
                "no": 13,
                "name": "Save Layout Bulk",
                "test_cases": [
                    {
                        "id": "TC_LY_001",
                        "desc": "Owner saves 2D/3D layout structure (Racks, Shelves, Bins)",
                        "proc": "1. Open 3D Layout Designer for warehouse.\n2. Place 2 Storage Zones, 4 Racks, and 12 Bins.\n3. Configure width, height, length, and max load per bin.\n4. Click 'Lưu sơ đồ kho'.",
                        "expected": "Layout hierarchy is validated and saved to DB; capacity updated automatically.",
                        "pre": "User is Owner of warehouse"
                    },
                    {
                        "id": "TC_LY_002",
                        "desc": "Owner saves layout with racks exceeding warehouse perimeter",
                        "proc": "1. Place rack at coordinates (X: 150m, Y: 150m) when warehouse is 100m x 100m.\n2. Click Save.",
                        "expected": "System throws validation error: 'Vị trí giá kệ vượt quá ranh giới diện tích kho'.",
                        "pre": "User is Owner of warehouse"
                    }
                ]
            },
            {
                "no": 14,
                "name": "Get Owner Warehouse Layout",
                "test_cases": [
                    {
                        "id": "TC_LY_003",
                        "desc": "Owner retrieves default layout tree of warehouse",
                        "proc": "1. Open Layout page for owned warehouse.\n2. Inspect rendered 3D scene.",
                        "expected": "Warehouse default layout tree returns complete zones, racks, and bins with 3D positions.",
                        "pre": "Warehouse has default layout saved"
                    }
                ]
            },
            {
                "no": 15,
                "name": "Save Tenant Snapshot Layout",
                "test_cases": [
                    {
                        "id": "TC_LY_004",
                        "desc": "Tenant saves customized layout snapshot for leased warehouse",
                        "proc": "1. Tenant opens rented warehouse layout designer.\n2. Adjusts zone names and operational labeling.\n3. Clicks Save.",
                        "expected": "Tenant snapshot layout is saved independently without modifying Owner's default layout template.",
                        "pre": "Tenant has active contract on warehouse"
                    }
                ]
            },
            {
                "no": 16,
                "name": "Get Tenant / Staff Warehouse Layout",
                "test_cases": [
                    {
                        "id": "TC_LY_005",
                        "desc": "Tenant or assigned Staff loads operational 2D/3D layout",
                        "proc": "1. Staff logs in and opens assigned warehouse layout.\n2. Verifies storage bin positions.",
                        "expected": "Snapshot layout loads with read-only permissions for Staff.",
                        "pre": "Staff has active warehouse assignment"
                    }
                ]
            },
            {
                "no": 17,
                "name": "View Storage Load & Capacity",
                "test_cases": [
                    {
                        "id": "TC_LY_006",
                        "desc": "View physical load calculation and bin occupancy",
                        "proc": "1. Open Capacity Dashboard for warehouse.\n2. Inspect total volume (m3), occupied volume, total max weight (kg), and current load.",
                        "expected": "Metrics accurately reflect sum of current stock batches stored in bins.",
                        "pre": "Warehouse has active stock batches"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Contract Management",
        "feature": "Contract Management",
        "requirement": "Verify complete rental contract lifecycle: tenant proposal, owner draft, clause changes, paper contract attachment, approval, rejection, and renewals",
        "functions": [
            {
                "no": 18,
                "name": "Create Booking",
                "test_cases": [
                    {
                        "id": "TC_BK_001",
                        "desc": "Tenant creates booking proposal with valid deposit",
                        "proc": "1. Tenant opens warehouse detail page.\n2. Selects lease period: 6 months.\n3. Agrees to deposit rate (1 month rent = 20,000,000 VND).\n4. Clicks 'Gửi yêu cầu thuê'.",
                        "expected": "Rental proposal created in PENDING status; deposit amount held/deducted from tenant wallet.",
                        "pre": "User is Tenant, warehouse available, tenant wallet balance >= deposit"
                    },
                    {
                        "id": "TC_BK_002",
                        "desc": "Create booking with insufficient wallet balance",
                        "proc": "1. Tenant with balance of 5,000,000 VND attempts to book warehouse requiring 20,000,000 VND deposit.",
                        "expected": "Error message shown: 'Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền'.",
                        "pre": "Tenant wallet balance < deposit amount"
                    },
                    {
                        "id": "TC_BK_003",
                        "desc": "Create booking on already leased warehouse",
                        "proc": "1. Attempt to book a warehouse currently marked as LEASED / OCCUPIED.",
                        "expected": "Error message shown: 'Kho hàng hiện tại không khả dụng để thuê'.",
                        "pre": "Warehouse is already leased"
                    }
                ]
            },
            {
                "no": 19,
                "name": "Submit Rental Contract Draft",
                "test_cases": [
                    {
                        "id": "TC_BK_004",
                        "desc": "Owner submits finalized contract draft with paper agreement",
                        "proc": "1. Owner navigates to Contracts page (/owner/contracts).\n2. Opens pending proposal.\n3. Attaches scanned PDF paper contract.\n4. Sets billing cycle and clauses.\n5. Clicks 'Gửi hợp đồng cho Tenant duyệt'.",
                        "expected": "Contract transitions to PENDING_TENANT_CONFIRM status; Tenant notified.",
                        "pre": "Proposal exists in DRAFT or CHANGES_REQUESTED status"
                    }
                ]
            },
            {
                "no": 20,
                "name": "Tenant Confirm Contract",
                "test_cases": [
                    {
                        "id": "TC_BK_005",
                        "desc": "Tenant confirms and signs submitted contract",
                        "proc": "1. Tenant reviews submitted contract draft and PDF attachment.\n2. Clicks 'Xác nhận & Ký hợp đồng'.",
                        "expected": "Contract status changes to ACTIVE; warehouse clone layout initialized; first month rent processed.",
                        "pre": "Contract is in PENDING_TENANT_CONFIRM status"
                    }
                ]
            },
            {
                "no": 21,
                "name": "Request Contract Changes",
                "test_cases": [
                    {
                        "id": "TC_BK_006",
                        "desc": "Tenant requests clause modifications",
                        "proc": "1. Tenant opens pending contract.\n2. Clicks 'Yêu cầu chỉnh sửa'.\n3. Enters feedback: 'Yêu cầu điều chỉnh thời gian thanh toán tiền điện nước'.\n4. Submits request.",
                        "expected": "Contract status changes to CHANGES_REQUESTED; Owner notified to update draft.",
                        "pre": "Contract is in PENDING_TENANT_CONFIRM status"
                    }
                ]
            },
            {
                "no": 22,
                "name": "Approve Booking",
                "test_cases": [
                    {
                        "id": "TC_BK_007",
                        "desc": "Owner approves tenant booking proposal",
                        "proc": "1. Owner opens pending rental request.\n2. Clicks 'Chấp nhận thuê'.",
                        "expected": "Contract draft is created and ready for contract terms configuration.",
                        "pre": "Booking is in PENDING status, caller is Owner"
                    }
                ]
            },
            {
                "no": 23,
                "name": "Reject Booking",
                "test_cases": [
                    {
                        "id": "TC_BK_008",
                        "desc": "Owner rejects rental proposal and refunds deposit",
                        "proc": "1. Owner opens pending proposal.\n2. Clicks 'Từ chối'.\n3. Enters reason: 'Kho đã có kế hoạch bảo trì trong thời gian này'.\n4. Confirms rejection.",
                        "expected": "Contract status changes to CANCELLED; held deposit is immediately refunded to Tenant wallet.",
                        "pre": "Booking is in PENDING status"
                    }
                ]
            },
            {
                "no": 24,
                "name": "Create Contract Renewal Draft",
                "test_cases": [
                    {
                        "id": "TC_BK_009",
                        "desc": "Owner creates renewal draft for expiring active contract",
                        "proc": "1. Owner opens active contract nearing expiration (30 days left).\n2. Clicks 'Tạo phụ lục gia hạn'.\n3. Specifies new end date and rental rate.\n4. Submits to tenant.",
                        "expected": "Renewal contract draft is generated in PENDING_TENANT_CONFIRM status.",
                        "pre": "Contract is ACTIVE and within renewal period"
                    }
                ]
            },
            {
                "no": 25,
                "name": "Get List Rental Contracts",
                "test_cases": [
                    {
                        "id": "TC_BK_010",
                        "desc": "Retrieve paginated list of contracts with status filter",
                        "proc": "1. Navigate to Contracts list page.\n2. Filter by status 'ACTIVE'.\n3. Switch page size to 20.",
                        "expected": "Table displays only active contracts with tenant name, warehouse, start date, and monthly rate.",
                        "pre": "User has valid Owner/Tenant token"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Inspection Management",
        "feature": "Inspection Management",
        "requirement": "Verify Admin assigning inspections to Inspectors, on-site assessment submissions, grading rubric scores, and verification decisions",
        "functions": [
            {
                "no": 26,
                "name": "Admin Assign Inspection Task",
                "test_cases": [
                    {
                        "id": "TC_IN_001",
                        "desc": "Admin assigns pending warehouse inspection to an Inspector",
                        "proc": "1. Admin opens Inspections Management page (/admin/inspections).\n2. Selects pending warehouse inspection request.\n3. Chooses Inspector 'Nguyen Van B' from staff dropdown.\n4. Sets inspection date and clicks 'Phân công'.",
                        "expected": "Inspection status changes to ASSIGNED; Inspector receives task notification.",
                        "pre": "Inspection request is PENDING"
                    }
                ]
            },
            {
                "no": 27,
                "name": "Inspector View Assigned Tasks",
                "test_cases": [
                    {
                        "id": "TC_IN_002",
                        "desc": "Inspector views scheduled inspection appointments",
                        "proc": "1. Inspector logs in and opens Assigned Inspections page (/inspector/inspections).\n2. Inspects warehouse address, owner phone, and scheduled time.",
                        "expected": "List displays assigned inspections with map directions and inspection checklist.",
                        "pre": "User logged in with ROLE_INSPECTOR"
                    }
                ]
            },
            {
                "no": 28,
                "name": "Submit Inspection Report",
                "test_cases": [
                    {
                        "id": "TC_IN_003",
                        "desc": "Inspector submits quality assessment rating and verification decision",
                        "proc": "1. Inspector opens assigned inspection.\n2. Scores criteria: Fire safety (9/10), Floor load (8/10), Hygiene (9/10), Security (8/10).\n3. Uploads on-site verification photos.\n4. Selects conclusion: 'PASSED - Đạt chuẩn'.\n5. Clicks 'Nộp báo cáo kiểm định'.",
                        "expected": "Report saved; warehouse receives VERIFIED status and quality badge rating on marketplace.",
                        "pre": "Inspection is in ASSIGNED status, caller is assigned inspector"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Subscription",
        "feature": "Subscription Management",
        "requirement": "Verify Tenant purchasing, upgrading, and renewing WMS service packages, quota validations, wallet deductions, and admin package pricing",
        "functions": [
            {
                "no": 29,
                "name": "Purchase Subscription",
                "test_cases": [
                    {
                        "id": "TC_SUB_001",
                        "desc": "Tenant purchases WMS subscription package successfully",
                        "proc": "1. Tenant goes to Subscriptions page (/tenant/subscription).\n2. Selects 'Gói Pro - 500.000 VND / tháng' (Max 5 Staff, Unlimited SKUs).\n3. Clicks 'Mua ngay'.\n4. Confirms wallet payment.",
                        "expected": "Package purchased successfully; 500,000 VND deducted from wallet; WMS quota upgraded to 5 staff.",
                        "pre": "Tenant wallet balance >= 500,000 VND"
                    },
                    {
                        "id": "TC_SUB_002",
                        "desc": "Tenant attempts to downgrade package while current is active",
                        "proc": "1. Tenant with active 'Gói Pro' attempts to buy 'Gói Standard' (lower price and fewer staff limits).",
                        "expected": "System blocks downgrade with message: 'Không thể hạ xuống gói dịch vụ thấp hơn khi gói hiện tại vẫn đang còn hạn'.",
                        "pre": "Tenant has higher-tier active subscription"
                    },
                    {
                        "id": "TC_SUB_003",
                        "desc": "Tenant renews same subscription package",
                        "proc": "1. Tenant buys the same package currently active.\n2. Confirms payment.",
                        "expected": "End date of subscription is extended by package duration days without interrupting active service.",
                        "pre": "Tenant has active subscription of same package"
                    }
                ]
            },
            {
                "no": 30,
                "name": "Get Active Subscription Status",
                "test_cases": [
                    {
                        "id": "TC_SUB_004",
                        "desc": "Check subscription validity and staff quota usage",
                        "proc": "1. Open Subscription status overview.\n2. Inspect active plan name, expiration date, active staff count vs max staff quota.",
                        "expected": "Accurate subscription limits and usage counters are displayed.",
                        "pre": "Tenant has an active subscription"
                    }
                ]
            },
            {
                "no": 31,
                "name": "Admin Manage Service Packages",
                "test_cases": [
                    {
                        "id": "TC_SUB_005",
                        "desc": "Admin creates or modifies WMS service package",
                        "proc": "1. Admin opens Packages Management (/admin/packages).\n2. Edits price and max staff limit of package.\n3. Saves changes.",
                        "expected": "Updated package details reflected immediately on tenant subscription page.",
                        "pre": "User logged in as Admin"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Listing Publication",
        "feature": "Listing Publication",
        "requirement": "Verify Owner purchasing warehouse publication packages for marketplace advertisement, visibility period tracking, and cancellations",
        "functions": [
            {
                "no": 32,
                "name": "Purchase Listing Publication",
                "test_cases": [
                    {
                        "id": "TC_LP_001",
                        "desc": "Owner purchases listing publication package to publish warehouse",
                        "proc": "1. Owner navigates to verified warehouse.\n2. Clicks 'Đăng tải lên sàn marketplace'.\n3. Selects 'Gói 30 ngày - 200.000 VND'.\n4. Sets publication start date.\n5. Confirms payment.",
                        "expected": "Order created in PAID status; fee deducted from owner wallet; warehouse published until periodEnd.",
                        "pre": "Warehouse is VERIFIED, default layout exists, wallet balance >= fee"
                    },
                    {
                        "id": "TC_LP_002",
                        "desc": "Purchase publication with unverified warehouse",
                        "proc": "1. Attempt to purchase publication for a warehouse in DRAFT or REJECTED status.",
                        "expected": "Error shown: 'Kho hàng chưa được kiểm duyệt đạt chuẩn, không thể đăng tải lên sàn'.",
                        "pre": "Warehouse status != VERIFIED"
                    }
                ]
            },
            {
                "no": 33,
                "name": "View Publication Purchase History",
                "test_cases": [
                    {
                        "id": "TC_LP_003",
                        "desc": "Owner views history of listing publication purchases",
                        "proc": "1. Open Publications tab in warehouse detail.\n2. Inspect past orders, start date, end date, and payment status.",
                        "expected": "History table accurately lists all publication transactions and current active banner status.",
                        "pre": "Owner owns target warehouse"
                    }
                ]
            },
            {
                "no": 34,
                "name": "Cancel / Stop Active Publication",
                "test_cases": [
                    {
                        "id": "TC_LP_004",
                        "desc": "Owner cancels scheduled publication with full refund",
                        "proc": "1. Open a publication order scheduled for next week.\n2. Clicks 'Hủy đăng tải'.",
                        "expected": "Order status changed to CANCELLED; listing fee is refunded back to owner wallet.",
                        "pre": "Publication order is SCHEDULED and has not started"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Wallet & Payment",
        "feature": "Wallet & Payment",
        "requirement": "Verify VNPay top-up redirect and callback processing, wallet balance inquiry, withdrawal requests, and admin withdrawal approval",
        "functions": [
            {
                "no": 35,
                "name": "Deposit via VNPay",
                "test_cases": [
                    {
                        "id": "TC_WP_001",
                        "desc": "Top up wallet balance with valid info via VNPay",
                        "proc": "1. Go to Wallet page (/tenant/wallet).\n2. Enter top-up amount: 500,000 VND.\n3. Select payment method 'VNPay'.\n4. Click 'Nạp tiền'.\n5. Redirected to VNPay Sandbox gateway; complete simulation with test card.\n6. Redirected back to /wallet/callback.",
                        "expected": "Transaction marked as SUCCESS; wallet balance credited with 500,000 VND.",
                        "pre": "User has valid authenticated account"
                    },
                    {
                        "id": "TC_WP_002",
                        "desc": "Top up with amount below minimum limit",
                        "proc": "1. Enter top-up amount: 5,000 VND (minimum is 10,000 VND).\n2. Click 'Nạp tiền'.",
                        "expected": "Validation error shown: 'Số tiền nạp tối thiểu là 10.000 VND'.",
                        "pre": "User logged in"
                    }
                ]
            },
            {
                "no": 36,
                "name": "View Wallet Balance & Transactions",
                "test_cases": [
                    {
                        "id": "TC_WP_003",
                        "desc": "Inspect wallet balance and transaction ledger",
                        "proc": "1. Open Wallet page.\n2. View current balance and transaction timeline table with pagination.",
                        "expected": "Ledger displays date, transaction type, amount (+/-), and description accurately.",
                        "pre": "User is authenticated"
                    }
                ]
            },
            {
                "no": 37,
                "name": "Request Withdraw",
                "test_cases": [
                    {
                        "id": "TC_WP_004",
                        "desc": "Request to withdraw money to bank account with valid info",
                        "proc": "1. Click 'Rút tiền' button.\n2. Enter Amount: 1,000,000 VND.\n3. Enter Bank: 'Vietcombank', Account Number: '0123456789', Holder: 'NGUYEN VAN A'.\n4. Confirm withdrawal.",
                        "expected": "Withdrawal ticket created in PENDING status; 1,000,000 VND frozen from available wallet balance.",
                        "pre": "Available wallet balance >= 1,000,000 VND"
                    },
                    {
                        "id": "TC_WP_005",
                        "desc": "Request withdraw exceeding available balance",
                        "proc": "1. Enter withdraw amount: 10,000,000 VND when balance is 2,000,000 VND.\n2. Submit request.",
                        "expected": "Error shown: 'Số dư khả dụng không đủ để thực hiện giao dịch rút tiền'.",
                        "pre": "Withdraw amount > wallet balance"
                    }
                ]
            },
            {
                "no": 38,
                "name": "Approve Withdraw",
                "test_cases": [
                    {
                        "id": "TC_WP_006",
                        "desc": "Admin approves pending withdrawal request",
                        "proc": "1. Admin opens Admin Withdrawals page (/admin/withdrawals).\n2. Inspects pending withdrawal ticket.\n3. Enters bank transfer reference code: 'VCB-TRF-987654'.\n4. Clicks 'Duyệt chuyển tiền'.",
                        "expected": "Withdrawal status changes to APPROVED; frozen balance permanently deducted; user notified.",
                        "pre": "User is Admin, ticket is PENDING"
                    }
                ]
            },
            {
                "no": 39,
                "name": "Reject Withdraw",
                "test_cases": [
                    {
                        "id": "TC_WP_007",
                        "desc": "Admin rejects invalid withdrawal request and refunds balance",
                        "proc": "1. Admin opens pending withdrawal ticket.\n2. Clicks 'Từ chối'.\n3. Enters reason: 'Số tài khoản ngân hàng không trùng khớp với tên chủ tài khoản'.\n4. Submits rejection.",
                        "expected": "Withdrawal status changes to REJECTED; frozen funds immediately unlocked back to user's wallet.",
                        "pre": "User is Admin, ticket is PENDING"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Product Catalog",
        "feature": "Product Catalog",
        "requirement": "Verify product categories, SKU master data creation, physical dimensions validation, active subscription requirement, and UOM management",
        "functions": [
            {
                "no": 40,
                "name": "Create Product Category",
                "test_cases": [
                    {
                        "id": "TC_PR_001",
                        "desc": "Tenant creates product category with valid name",
                        "proc": "1. Navigate to Categories page (/tenant/products/categories).\n2. Click 'Thêm danh mục mới'.\n3. Enter Name: 'Điện tử gia dụng'.\n4. Click Save.",
                        "expected": "Category created successfully and available in SKU creation dropdown.",
                        "pre": "Tenant has active WMS subscription"
                    },
                    {
                        "id": "TC_PR_002",
                        "desc": "Create category without active subscription",
                        "proc": "1. Tenant without active subscription attempts to create category.",
                        "expected": "System rejects with 403 Forbidden: 'Yêu cầu gói dịch vụ WMS còn hiệu lực'.",
                        "pre": "Tenant subscription expired or missing"
                    }
                ]
            },
            {
                "no": 41,
                "name": "Delete Product Category",
                "test_cases": [
                    {
                        "id": "TC_PR_003",
                        "desc": "Delete category that currently has active SKUs linked",
                        "proc": "1. Attempt to delete a category that contains active SKU products.",
                        "expected": "System blocks deletion with error: 'Không thể xóa danh mục đang có sản phẩm SKU liên kết'.",
                        "pre": "Category has linked SKUs"
                    }
                ]
            },
            {
                "no": 42,
                "name": "Get Product Categories List",
                "test_cases": [
                    {
                        "id": "TC_PR_004",
                        "desc": "Retrieve list of product categories",
                        "proc": "1. Open Categories page.",
                        "expected": "List displays tenant custom categories and system suggested categories.",
                        "pre": "User is Tenant or assigned Staff"
                    }
                ]
            },
            {
                "no": 43,
                "name": "Create Product SKU",
                "test_cases": [
                    {
                        "id": "TC_PR_005",
                        "desc": "Tenant creates a new Product SKU with valid info",
                        "proc": "1. Open SKU page (/tenant/products/sku).\n2. Click 'Tạo mã SKU mới'.\n3. Enter SKU Code: 'ELEC-TV-55', Name: 'Smart TV 55 inch'.\n4. Select Category: 'Điện tử', UOM: 'Cái'.\n5. Enter Unit Weight: 15.5 kg, Unit Volume: 0.12 m3.\n6. Click 'Lưu sản phẩm'.",
                        "expected": "SKU created successfully; visible in SKU list and goods receipt forms.",
                        "pre": "Tenant has active WMS subscription"
                    },
                    {
                        "id": "TC_PR_006",
                        "desc": "Create SKU with duplicate skuCode",
                        "proc": "1. Enter an existing SKU Code: 'ELEC-TV-55'.\n2. Submit form.",
                        "expected": "Error message shown: 'Mã SKU này đã tồn tại trong tổ chức của bạn'.",
                        "pre": "SKU code already exists in tenant org"
                    },
                    {
                        "id": "TC_PR_007",
                        "desc": "Create SKU with negative or zero weight/volume",
                        "proc": "1. Enter Unit Weight: 0 kg, Unit Volume: -0.5 m3.\n2. Submit form.",
                        "expected": "Validation error: 'Trọng lượng và thể tích đơn vị phải lớn hơn 0'.",
                        "pre": "None"
                    }
                ]
            },
            {
                "no": 44,
                "name": "Update Product SKU Attributes",
                "test_cases": [
                    {
                        "id": "TC_PR_008",
                        "desc": "Update SKU name and specifications",
                        "proc": "1. Open SKU detail edit modal.\n2. Update product name and barcode.\n3. Save changes.",
                        "expected": "SKU details updated successfully.",
                        "pre": "SKU belongs to tenant"
                    },
                    {
                        "id": "TC_PR_009",
                        "desc": "Attempt to change physical dimensions after stock recorded",
                        "proc": "1. Attempt to change weight/volume of an SKU that already has inventory stock batches.",
                        "expected": "System rejects change: 'Không thể sửa kích thước/khối lượng khi sản phẩm đã phát sinh tồn kho'.",
                        "pre": "SKU has existing stock batches"
                    }
                ]
            },
            {
                "no": 45,
                "name": "Delete Product SKU",
                "test_cases": [
                    {
                        "id": "TC_PR_010",
                        "desc": "Attempt to delete SKU with active stock inventory",
                        "proc": "1. Click Delete on an SKU having on-hand inventory quantity > 0.",
                        "expected": "Error shown: 'Không thể xóa SKU khi đang còn tồn kho trong kho bãi'.",
                        "pre": "SKU has active stock batches"
                    }
                ]
            },
            {
                "no": 46,
                "name": "Get Product SKUs List with Filters",
                "test_cases": [
                    {
                        "id": "TC_PR_011",
                        "desc": "Retrieve SKU list with keyword search and category filter",
                        "proc": "1. Search keyword 'TV' and filter by Category 'Điện tử'.",
                        "expected": "Table displays filtered matching SKUs with UOM and dimensions.",
                        "pre": "User is Tenant or Staff"
                    }
                ]
            },
            {
                "no": 47,
                "name": "Get Units of Measure (UOM) List",
                "test_cases": [
                    {
                        "id": "TC_PR_012",
                        "desc": "Retrieve standard UOM list for dropdown selections",
                        "proc": "1. Query UOM API endpoint /api/tenant/products/uoms.",
                        "expected": "Returns active measurement units (kg, cái, thùng, kiện, bao, hộp).",
                        "pre": "User authenticated"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Stock Management",
        "feature": "Stock Management",
        "requirement": "Verify warehouse stock inquiry, product-level stock overview, batch tracking timeline, putaway recommendations, and FIFO picking suggestions",
        "functions": [
            {
                "no": 48,
                "name": "Get Inventory Stock by Warehouse",
                "test_cases": [
                    {
                        "id": "TC_ST_001",
                        "desc": "View complete stock inventory with bin positions for rented warehouse",
                        "proc": "1. Open Inventory page (/tenant/inventory).\n2. Select target rented warehouse from selector.",
                        "expected": "Table displays all stock batches, batch code, SKU, quantity, bin location (Rack A-1-1), expiry date.",
                        "pre": "Tenant has active contract on warehouse"
                    }
                ]
            },
            {
                "no": 49,
                "name": "Get Warehouse Stock Product Overview",
                "test_cases": [
                    {
                        "id": "TC_ST_002",
                        "desc": "View aggregated product stock overview",
                        "proc": "1. Switch to 'Tổng quan sản phẩm' tab.\n2. Inspect total quantity, reserved quantity, and available picking quantity per SKU.",
                        "expected": "Correct sum of on-hand quantities across all bins for each SKU.",
                        "pre": "Stock batches exist"
                    }
                ]
            },
            {
                "no": 50,
                "name": "Get Stock Summary by SKU",
                "test_cases": [
                    {
                        "id": "TC_ST_003",
                        "desc": "Query stock locations for a specific SKU",
                        "proc": "1. Click on an SKU from inventory overview.\n2. Inspect storage breakdown modal.",
                        "expected": "Lists every specific bin, batch number, and quantity containing this SKU.",
                        "pre": "Target SKU exists in warehouse"
                    }
                ]
            },
            {
                "no": 51,
                "name": "Get Stock Batch Transaction History",
                "test_cases": [
                    {
                        "id": "TC_ST_004",
                        "desc": "View quantity fluctuation history of a specific stock batch",
                        "proc": "1. Click 'Lịch sử biến động' on batch 'BATCH-2026-001'.",
                        "expected": "Timeline displays initial inbound, transfers, picking deductions, and current balance.",
                        "pre": "Batch exists"
                    }
                ]
            },
            {
                "no": 52,
                "name": "Get Inbound Putaway Suggestions",
                "test_cases": [
                    {
                        "id": "TC_ST_005",
                        "desc": "System algorithm suggests optimal putaway bins for incoming goods",
                        "proc": "1. In Inbound Receipt creation, click 'Gợi ý vị trí cất hàng'.\n2. Inspect suggested bins.",
                        "expected": "Algorithm returns bins having sufficient remaining volume and weight capacity closest to receiving dock.",
                        "pre": "Warehouse layout configured with dimensions"
                    }
                ]
            },
            {
                "no": 53,
                "name": "Get Outbound FIFO Picking Suggestions",
                "test_cases": [
                    {
                        "id": "TC_ST_006",
                        "desc": "System algorithm suggests oldest stock batches for picking (FIFO)",
                        "proc": "1. In Outbound Receipt creation, enter required quantity 50.\n2. Click 'Gợi ý chọn hàng FIFO'.",
                        "expected": "System automatically allocates picking quantity starting from earliest expiry / inbound batch.",
                        "pre": "Sufficient available stock batches exist"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Inventory Receipts",
        "feature": "Inventory Receipts",
        "requirement": "Verify Inbound & Outbound goods receipts, bin capacity checks, inventory balance deduction/addition, and picking replenishment",
        "functions": [
            {
                "no": 54,
                "name": "Create Inbound Receipt",
                "test_cases": [
                    {
                        "id": "TC_RC_001",
                        "desc": "Create Inbound Receipt with valid info",
                        "proc": "1. Go to Inbound Receipts page (/tenant/inbound).\n2. Click 'Tạo phiếu nhập kho'.\n3. Select Warehouse, enter Supplier 'Công ty ABC', expected date.\n4. Add item: SKU 'ELEC-TV-55', Quantity: 20, assigned to Bin 'A-01-01'.\n5. Click 'Tạo phiếu'.",
                        "expected": "Receipt created in PENDING status.",
                        "pre": "Tenant has active contract on warehouse"
                    },
                    {
                        "id": "TC_RC_002",
                        "desc": "Create Inbound Receipt exceeding bin volume or weight capacity",
                        "proc": "1. Assign 500 units (total 7,750 kg) to a bin having max load of 500 kg.\n2. Submit receipt.",
                        "expected": "Error shown: 'Vị trí ô chứa A-01-01 bị vượt quá tải trọng hoặc thể tích cho phép'.",
                        "pre": "Total weight/volume > bin capacity"
                    }
                ]
            },
            {
                "no": 55,
                "name": "Approve Inbound Receipt",
                "test_cases": [
                    {
                        "id": "TC_RC_003",
                        "desc": "Tenant approves Inbound Receipt to increase stock",
                        "proc": "1. Open pending inbound receipt.\n2. Click 'Duyệt phiếu nhập'.\n3. Confirm approval.",
                        "expected": "Receipt status changes to APPROVED; stock quantities incremented in specified bins; transactions recorded.",
                        "pre": "Receipt is in PENDING status"
                    }
                ]
            },
            {
                "no": 56,
                "name": "Create Outbound Receipt",
                "test_cases": [
                    {
                        "id": "TC_RC_004",
                        "desc": "Create Outbound Receipt with valid info",
                        "proc": "1. Go to Outbound Receipts page (/tenant/outbound).\n2. Click 'Tạo phiếu xuất kho'.\n3. Enter Recipient 'Cửa hàng Quận 1'.\n4. Select SKU and allocate picking batches.\n5. Click 'Tạo phiếu'.",
                        "expected": "Receipt created in PENDING status; requested stock quantities marked as RESERVED.",
                        "pre": "Sufficient available stock exists"
                    },
                    {
                        "id": "TC_RC_005",
                        "desc": "Create Outbound Receipt with insufficient stock",
                        "proc": "1. Request outbound quantity of 100 units when available on-hand is 20.\n2. Submit receipt.",
                        "expected": "Error shown: 'Số lượng tồn kho khả dụng không đủ để xuất kho'.",
                        "pre": "Requested qty > available stock"
                    }
                ]
            },
            {
                "no": 57,
                "name": "Approve Outbound Receipt",
                "test_cases": [
                    {
                        "id": "TC_RC_006",
                        "desc": "Tenant approves Outbound Receipt to decrease stock",
                        "proc": "1. Open pending outbound receipt.\n2. Click 'Duyệt phiếu xuất'.\n3. Confirm approval.",
                        "expected": "Receipt status changes to APPROVED; picked stock quantities deducted from bins; reserved quantities cleared.",
                        "pre": "Receipt is in PENDING status"
                    }
                ]
            },
            {
                "no": 58,
                "name": "Reject Goods Receipt",
                "test_cases": [
                    {
                        "id": "TC_RC_007",
                        "desc": "Reject pending inbound or outbound receipt",
                        "proc": "1. Open pending receipt.\n2. Click 'Từ chối'.\n3. Enter reason: 'Hàng hóa bị lỗi quy cách đóng gói'.\n4. Confirm rejection.",
                        "expected": "Receipt marked as REJECTED; any reserved inventory released immediately.",
                        "pre": "Receipt is in PENDING status"
                    }
                ]
            },
            {
                "no": 59,
                "name": "Replan Outbound FIFO Picking List",
                "test_cases": [
                    {
                        "id": "TC_RC_008",
                        "desc": "Re-run FIFO picking allocation for pending outbound ticket",
                        "proc": "1. Open pending outbound receipt.\n2. Click 'Tạo lại Pick List'.",
                        "expected": "System recalculates and reassigns freshest optimal FIFO batches.",
                        "pre": "Receipt is PENDING"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Stock Transfer",
        "feature": "Stock Transfer",
        "requirement": "Verify internal stock relocation between bins, destination capacity validation, and transfer ledger tracking",
        "functions": [
            {
                "no": 60,
                "name": "Create Stock Transfer Ticket",
                "test_cases": [
                    {
                        "id": "TC_TR_001",
                        "desc": "Create internal stock transfer ticket between bins",
                        "proc": "1. Go to Transfer page (/tenant/transfer).\n2. Click 'Tạo phiếu chuyển vị trí'.\n3. Select Source Bin: 'A-01-01', Batch: 'BATCH-01', Quantity: 10.\n4. Select Destination Bin: 'B-02-03'.\n5. Submit ticket.",
                        "expected": "Transfer ticket created in PENDING status.",
                        "pre": "Source batch has sufficient available quantity"
                    }
                ]
            },
            {
                "no": 61,
                "name": "Approve Stock Transfer Ticket",
                "test_cases": [
                    {
                        "id": "TC_TR_002",
                        "desc": "Approve and execute stock transfer relocation",
                        "proc": "1. Open pending transfer ticket.\n2. Click 'Duyệt chuyển kho'.",
                        "expected": "Batch quantity deducted from Bin A-01-01 and added to Bin B-02-03; transaction logged.",
                        "pre": "Transfer ticket status is PENDING, destination bin has capacity"
                    }
                ]
            },
            {
                "no": 62,
                "name": "Reject Stock Transfer Ticket",
                "test_cases": [
                    {
                        "id": "TC_TR_003",
                        "desc": "Reject or cancel pending stock transfer",
                        "proc": "1. Open pending transfer.\n2. Click 'Từ chối chuyển'.",
                        "expected": "Transfer marked as CANCELLED; source stock unlocked.",
                        "pre": "Transfer ticket is PENDING"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Inventory Audit",
        "feature": "Inventory Audit",
        "requirement": "Verify inventory stocktake audit planning, movement freezing locks, blind physical counting, variance calculation, and adjustment approvals",
        "functions": [
            {
                "no": 63,
                "name": "Create Inventory Audit",
                "test_cases": [
                    {
                        "id": "TC_AU_001",
                        "desc": "Tenant creates an inventory audit plan",
                        "proc": "1. Go to Audit page (/tenant/inventory/audit).\n2. Click 'Tạo đợt kiểm kê mới'.\n3. Select Warehouse, assign counter Staff 'Le Van C'.\n4. Choose scope: 'Toàn bộ kho'.\n5. Click 'Tạo phiếu'.",
                        "expected": "Audit ticket created in DRAFT status.",
                        "pre": "Tenant has active contract, no conflicting active audit in warehouse"
                    }
                ]
            },
            {
                "no": 64,
                "name": "Start Audit and Snapshot Stock",
                "test_cases": [
                    {
                        "id": "TC_AU_002",
                        "desc": "Start audit and capture book inventory snapshot",
                        "proc": "1. Open draft audit ticket.\n2. Click 'Bắt đầu kiểm kê & Khóa kho'.",
                        "expected": "System snapshots current book inventory quantities; locks inbound/outbound movements in warehouse; status becomes IN_PROGRESS.",
                        "pre": "Audit status is DRAFT"
                    }
                ]
            },
            {
                "no": 65,
                "name": "Save Physical Count Results",
                "test_cases": [
                    {
                        "id": "TC_AU_003",
                        "desc": "Counter staff records counted physical quantities (blind count)",
                        "proc": "1. Counter staff opens assigned audit on mobile/web.\n2. Walks warehouse and enters actual counted quantity for each bin location.\n3. Clicks 'Lưu kết quả đếm'.",
                        "expected": "Actual counted quantities saved; book quantities remain masked from counter staff.",
                        "pre": "Audit is IN_PROGRESS, user is assigned counter"
                    }
                ]
            },
            {
                "no": 66,
                "name": "Submit Inventory Audit",
                "test_cases": [
                    {
                        "id": "TC_AU_004",
                        "desc": "Counter staff finalizes and submits counted audit",
                        "proc": "1. Staff completes counts for all items.\n2. Clicks 'Nộp kết quả kiểm kê'.",
                        "expected": "Audit status changes to SUBMITTED; variance discrepancies calculated and unmasked for Manager review.",
                        "pre": "All audit items have recorded counts"
                    }
                ]
            },
            {
                "no": 67,
                "name": "Approve Inventory Audit",
                "test_cases": [
                    {
                        "id": "TC_AU_005",
                        "desc": "Tenant Manager approves audit and reconciles discrepancies",
                        "proc": "1. Tenant Manager opens submitted audit.\n2. Reviews variances (e.g. SKU A: Book 100, Actual 98, Variance -2).\n3. Clicks 'Duyệt kiểm kê & Điều chỉnh tồn kho'.",
                        "expected": "Audit status changes to APPROVED; adjustment transactions auto-generated; warehouse lock released.",
                        "pre": "Audit status is SUBMITTED, approver is not the counter staff"
                    },
                    {
                        "id": "TC_AU_006",
                        "desc": "Counter staff attempts to approve their own audit count",
                        "proc": "1. Assigned counter staff attempts to click Approve on the audit.",
                        "expected": "System blocks action with 403 Forbidden: 'Người thực hiện kiểm kê không được tự duyệt phiếu'.",
                        "pre": "Caller is assigned counter"
                    }
                ]
            },
            {
                "no": 68,
                "name": "Cancel Inventory Audit Ticket",
                "test_cases": [
                    {
                        "id": "TC_AU_007",
                        "desc": "Cancel audit ticket and release warehouse lock",
                        "proc": "1. Tenant opens audit in DRAFT or IN_PROGRESS state.\n2. Clicks 'Hủy đợt kiểm kê'.\n3. Enters cancellation reason.",
                        "expected": "Audit marked as CANCELLED; warehouse movement lock released immediately.",
                        "pre": "Audit is in DRAFT or IN_PROGRESS state"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Staff Management",
        "feature": "Staff Management",
        "requirement": "Verify staff email invitations, acceptance flow, organization member directory, warehouse assignments, and termination",
        "functions": [
            {
                "no": 69,
                "name": "Invite Tenant Staff",
                "test_cases": [
                    {
                        "id": "TC_SM_001",
                        "desc": "Invite a new staff member with valid info",
                        "proc": "1. Go to Staff Management page (/tenant/staffs).\n2. Click 'Mời nhân viên mới'.\n3. Enter Full Name: 'Tran Thi D', Email: 'staff@example.com', Phone: '0901234567'.\n4. Click 'Gửi lời mời'.",
                        "expected": "Invitation email sent containing secure 48h token link; invitation listed in PENDING tab.",
                        "pre": "Current active staff + pending < subscription max staff quota"
                    },
                    {
                        "id": "TC_SM_002",
                        "desc": "Invite staff when subscription quota is exceeded",
                        "proc": "1. Tenant on 2-staff package with 2 active staff attempts to invite a 3rd staff member.",
                        "expected": "Error shown: 'Số lượng nhân viên đã đạt giới hạn tối đa của gói dịch vụ'.",
                        "pre": "Staff quota limit reached"
                    },
                    {
                        "id": "TC_SM_003",
                        "desc": "Invite email already belonging to another Tenant or Owner",
                        "proc": "1. Enter email of an existing Owner or Tenant user account.",
                        "expected": "Error shown: 'Không thể mời người dùng đã có tài khoản Chủ kho hoặc Khách thuê'.",
                        "pre": "Email belongs to Owner/Tenant"
                    }
                ]
            },
            {
                "no": 70,
                "name": "Accept Staff Invitation",
                "test_cases": [
                    {
                        "id": "TC_SM_004",
                        "desc": "Invited staff accepts invitation and sets password",
                        "proc": "1. Staff clicks invitation link in email (/staff/accept?token=...).\n2. Enters new password and confirms.\n3. Clicks 'Kích hoạt tài khoản & Tham gia'.",
                        "expected": "Staff account created with ROLE_STAFF; joined tenant org successfully.",
                        "pre": "Invitation token is valid and unexpired"
                    }
                ]
            },
            {
                "no": 71,
                "name": "Get Tenant Staff Members List",
                "test_cases": [
                    {
                        "id": "TC_SM_005",
                        "desc": "Retrieve organization staff directory with warehouse filter",
                        "proc": "1. Open Staff Management page.\n2. Filter staff by assigned warehouse.",
                        "expected": "Displays staff member profiles, join dates, status, and assigned warehouses.",
                        "pre": "User is Tenant"
                    }
                ]
            },
            {
                "no": 72,
                "name": "Delete Tenant Staff",
                "test_cases": [
                    {
                        "id": "TC_SM_006",
                        "desc": "Soft-delete staff member and terminate warehouse access",
                        "proc": "1. Click 'Xóa nhân viên' on a member.\n2. Confirms removal.",
                        "expected": "Staff member deactivated and marked as deleted; all active warehouse assignments revoked.",
                        "pre": "Target staff exists in tenant org"
                    }
                ]
            },
            {
                "no": 73,
                "name": "Assign Staff Warehouse",
                "test_cases": [
                    {
                        "id": "TC_SM_007",
                        "desc": "Assign staff to manage a leased warehouse",
                        "proc": "1. Open staff member detail.\n2. Click 'Phân công kho'.\n3. Select Warehouse, Job Title: 'Thủ kho chính', Notes: 'Phụ trách nhập xuất'.\n4. Confirm assignment.",
                        "expected": "Assignment created; staff granted WMS operational access to that warehouse.",
                        "pre": "Staff is active member, warehouse is leased by tenant"
                    },
                    {
                        "id": "TC_SM_008",
                        "desc": "Assign staff to a warehouse tenant does not rent",
                        "proc": "1. Attempt to assign staff to an unleased warehouseId.",
                        "expected": "System throws 403 Forbidden: 'Bạn không có quyền truy cập kho hàng này'.",
                        "pre": "Tenant has no active contract for warehouse"
                    }
                ]
            },
            {
                "no": 74,
                "name": "Revoke Staff Warehouse Assignment",
                "test_cases": [
                    {
                        "id": "TC_SM_009",
                        "desc": "Revoke warehouse assignment from a staff member",
                        "proc": "1. In Staff assignments list, click 'Thu hồi phân công'.",
                        "expected": "Assignment status marked as REVOKED; staff operational access to that warehouse terminated.",
                        "pre": "Assignment exists and is active"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "Data Exchange",
        "feature": "Data Exchange & Offline Operations",
        "requirement": "Verify bulk Excel data import/export for product catalog, inventory snapshot, offline stock movements, and audit count sheets",
        "functions": [
            {
                "no": 75,
                "name": "Export WMS Product Catalog",
                "test_cases": [
                    {
                        "id": "TC_DX_001",
                        "desc": "Export complete SKU catalog to Excel workbook",
                        "proc": "1. Go to SKU page (/tenant/products/sku).\n2. Click 'Xuất Excel Catalog'.",
                        "expected": "Browser downloads .xlsx workbook containing sheets for Categories, SKUs, and UOM reference.",
                        "pre": "Tenant has active subscription"
                    }
                ]
            },
            {
                "no": 76,
                "name": "Import WMS Product Catalog",
                "test_cases": [
                    {
                        "id": "TC_DX_002",
                        "desc": "Bulk import categories and SKUs from Excel with dry-run validation",
                        "proc": "1. Click 'Nhập Excel Catalog'.\n2. Select file stockspace-catalog.xlsx.\n3. Choose mode 'Kiểm tra trước (Dry-run)'.\n4. Review validation report (0 errors).\n5. Click 'Áp dụng nhập dữ liệu'.",
                        "expected": "New categories and SKUs imported into DB; duplicates handled according to mode.",
                        "pre": "Valid Excel template provided"
                    },
                    {
                        "id": "TC_DX_003",
                        "desc": "Import catalog with invalid missing headers or negative weights",
                        "proc": "1. Upload Excel file with negative unit weight.\n2. Run validation.",
                        "expected": "Error report lists row numbers and specific validation error: 'Trọng lượng phải lớn hơn 0'. Import aborted.",
                        "pre": "Excel file contains invalid data"
                    }
                ]
            },
            {
                "no": 77,
                "name": "Export Inventory Stock Snapshot",
                "test_cases": [
                    {
                        "id": "TC_DX_004",
                        "desc": "Export warehouse stock snapshot to Excel",
                        "proc": "1. On Inventory page, click 'Xuất báo cáo tồn kho'.",
                        "expected": "Downloads .xlsx file listing all current batches, quantities, bins, and expiry dates.",
                        "pre": "Active contract on warehouse"
                    }
                ]
            },
            {
                "no": 78,
                "name": "Import Offline Stock Movements",
                "test_cases": [
                    {
                        "id": "TC_DX_005",
                        "desc": "Import offline inbound/outbound movements from Excel",
                        "proc": "1. Upload offline movement workbook recorded during internet outage.\n2. System reconciles sequence of movements.\n3. Applies updates to stock batches.",
                        "expected": "Stock batch balances updated to match offline records; transaction audit trails generated.",
                        "pre": "Valid offline movement workbook"
                    }
                ]
            },
            {
                "no": 79,
                "name": "Export Audit Physical Count Sheet",
                "test_cases": [
                    {
                        "id": "TC_DX_006",
                        "desc": "Export blank physical count sheet for stocktaking clipboard",
                        "proc": "1. Open scheduled audit ticket.\n2. Click 'Xuất phiếu kiểm đếm Excel'.",
                        "expected": "Downloads formatted printable sheet with SKU names, codes, bin locations, and blank count columns.",
                        "pre": "Audit ticket exists"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "AI Chatbot",
        "feature": "AI Assistant Chatbot",
        "requirement": "Verify interactive AI chatbot answering warehouse inquiries, rental pricing, policy guidance, and WMS navigation help",
        "functions": [
            {
                "no": 80,
                "name": "Chat with StockSpace AI Assistant",
                "test_cases": [
                    {
                        "id": "TC_CB_001",
                        "desc": "Public user asks AI assistant for warehouse recommendations",
                        "proc": "1. Click AI Chat widget at bottom right.\n2. Type question: 'Tôi muốn tìm kho lạnh tại Quận 7 giá dưới 30 triệu'.\n3. Press Enter.",
                        "expected": "AI Assistant responds with relevant matching warehouses, direct links, and rental advice.",
                        "pre": "Chatbot service online"
                    },
                    {
                        "id": "TC_CB_002",
                        "desc": "Tenant asks AI assistant for WMS operational help",
                        "proc": "1. Ask: 'Làm thế nào để xuất kho hàng theo FIFO?'.",
                        "expected": "AI assistant provides accurate step-by-step guidance on creating outbound receipts and picking suggestions.",
                        "pre": "User logged in as Tenant"
                    }
                ]
            }
        ]
    },
    {
        "sheet": "System Administration",
        "feature": "System Administration",
        "requirement": "Verify platform user management, RBAC permission matrix, warehouse category types, system policies, and executive analytics",
        "functions": [
            {
                "no": 81,
                "name": "Admin Manage User Accounts",
                "test_cases": [
                    {
                        "id": "TC_ADM_001",
                        "desc": "Admin locks or unlocks a violating user account",
                        "proc": "1. Go to User Management (/admin/users).\n2. Search user by email.\n3. Click 'Khóa tài khoản'.",
                        "expected": "User isActive set to false; user immediately restricted from authenticating.",
                        "pre": "User logged in as Admin"
                    }
                ]
            },
            {
                "no": 82,
                "name": "Admin Manage System Roles and Permissions",
                "test_cases": [
                    {
                        "id": "TC_ADM_002",
                        "desc": "Admin configures RBAC permissions for a role",
                        "proc": "1. Open Permissions page (/admin/permissions).\n2. Toggle permission 'INVENTORY_AUDIT_MANAGE' for ROLE_TENANT.\n3. Save changes.",
                        "expected": "Security authority matrix updated and enforced on subsequent API requests.",
                        "pre": "User logged in as Admin"
                    }
                ]
            },
            {
                "no": 83,
                "name": "Admin Manage Warehouse Types",
                "test_cases": [
                    {
                        "id": "TC_ADM_003",
                        "desc": "Admin creates a new warehouse category type",
                        "proc": "1. Open Warehouse Types page (/admin/warehousetypes).\n2. Add Type: 'Kho ngoại quan (Bonded Warehouse)'.\n3. Save.",
                        "expected": "New type available on Owner posting form and search filter.",
                        "pre": "User logged in as Admin"
                    }
                ]
            },
            {
                "no": 84,
                "name": "Admin Manage System Policies and Configurations",
                "test_cases": [
                    {
                        "id": "TC_ADM_004",
                        "desc": "Admin updates platform commission rate and terms of service",
                        "proc": "1. Open System Policy page (/admin/systempolicy).\n2. Modify deposit commission fee percentage and terms text.\n3. Save.",
                        "expected": "Updated policies published and active across platform.",
                        "pre": "User logged in as Admin"
                    }
                ]
            },
            {
                "no": 85,
                "name": "Admin View Operational Analytics",
                "test_cases": [
                    {
                        "id": "TC_ADM_005",
                        "desc": "Admin views platform KPI analytics and financial revenue",
                        "proc": "1. Open Admin Dashboard (/admin/dashboard).\n2. View total revenue chart, active contracts count, and warehouse occupancy rate.",
                        "expected": "Analytics charts load accurately reflecting real-time database figures.",
                        "pre": "User logged in as Admin"
                    }
                ]
            }
        ]
    }
]

# Calculate total TCs
total_tcs = sum(len(f["test_cases"]) for m in modules_data for f in m["functions"])
print(f"Constructed {len(modules_data)} Modules, with total {total_tcs} System Test Cases across all 85 Functions!")

# Save to JSON for HTML injection
with open(r'D:\Ky9\Capstone\StockSpace\scratch\all_deep_system_test_data.json', 'w', encoding='utf-8') as f:
    json.dump(modules_data, f, ensure_ascii=False, indent=2)

print("Saved all_deep_system_test_data.json successfully!")
