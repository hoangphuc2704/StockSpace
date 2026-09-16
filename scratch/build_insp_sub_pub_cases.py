import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

from build_auth_cases import auth_functions
from build_wh_cases import wh_functions
from build_layout_contract_cases import layout_functions, contract_functions

# Additional modules with detailed test cases
insp_functions = [
    {
        "no": 26, "name": "Request Warehouse Inspection", "sheet": "Inspection Management",
        "desc": "Verify Owner requesting quality inspection for warehouse verification badge before marketplace publishing.",
        "pre": "User is Owner of warehouse",
        "fe": "OwnerWarehouseDetail (/owner/warehouses/:id)", "be": "OwnerInspectionController.requestInspection",
        "test_cases": [
            {
                "id": "TC_INSP_001",
                "desc": "Owner submits inspection appointment request",
                "proc": "1. Log in as Owner.\n2. Navigate to warehouse details.\n3. Click 'Yêu cầu kiểm định'.\n4. Select preferred inspection date and contact phone.\n5. Click 'Gửi yêu cầu'.",
                "expected": "Inspection request created in PENDING assignment status (HTTP 201 Created); Admin notified to assign inspector.",
                "pre": "Warehouse is owned by caller and status is DRAFT or VERIFIED"
            },
            {
                "id": "TC_INSP_002",
                "desc": "Request inspection when an inspection is already in progress",
                "proc": "1. Owner attempts to request second inspection while previous inspection is still ASSIGNED or IN_PROGRESS.",
                "expected": "System rejects with HTTP 400 Bad Request: 'Kho hàng đang có yêu cầu kiểm định đang được xử lý'.",
                "pre": "Active inspection exists for warehouse"
            }
        ]
    },
    {
        "no": 27, "name": "Admin Assign Inspection Task", "sheet": "Inspection Management",
        "desc": "Verify Admin assigning pending inspection appointment to a qualified staff inspector.",
        "pre": "User is Admin, inspection is in PENDING status",
        "fe": "InspectionsManagementPage (/admin/inspections)", "be": "AdminInspectionController.assignInspector",
        "test_cases": [
            {
                "id": "TC_INSP_003",
                "desc": "Admin assigns inspector to pending warehouse inspection",
                "proc": "1. Log in as Admin.\n2. Open /admin/inspections.\n3. Select pending inspection appointment.\n4. Select qualified Inspector from dropdown list.\n5. Confirm assignment.",
                "expected": "Inspection status changes to ASSIGNED; appointment schedule locked; notification sent to Inspector.",
                "pre": "Inspection is in PENDING status"
            },
            {
                "id": "TC_INSP_004",
                "desc": "Admin assigns inactive or non-inspector user",
                "proc": "1. Send assignment request with an account not having ROLE_INSPECTOR.",
                "expected": "Server rejects with HTTP 400 Bad Request: 'Người dùng được chỉ định không có vai trò Kiểm định viên'.",
                "pre": "User is Admin"
            }
        ]
    },
    {
        "no": 28, "name": "Inspector View Assigned Tasks", "sheet": "Inspection Management",
        "desc": "Verify Inspector viewing list of assigned warehouse inspection appointments with schedule and address.",
        "pre": "User logged in with Inspector role",
        "fe": "InspectorInspectionsPage (/inspector/inspections)", "be": "InspectorController.getMyInspections",
        "test_cases": [
            {
                "id": "TC_INSP_005",
                "desc": "Inspector loads assigned inspections calendar/list",
                "proc": "1. Log in as Inspector.\n2. Navigate to /inspector/inspections.\n3. Inspect appointment cards.",
                "expected": "Displays all inspection appointments assigned to calling inspector with warehouse address, owner contact, and date.",
                "pre": "Inspector has assigned appointments"
            },
            {
                "id": "TC_INSP_006",
                "desc": "Non-inspector user attempts to access /inspector/inspections",
                "proc": "1. Log in as Owner or Tenant.\n2. Navigate directly to URL /inspector/inspections.",
                "expected": "RoleGuard blocks navigation; user redirected to /unauthorized or dashboard.",
                "pre": "User is not Inspector"
            }
        ]
    },
    {
        "no": 29, "name": "Submit Inspection Report", "sheet": "Inspection Management",
        "desc": "Verify Inspector submitting evaluation: fire safety, structure, rating score, and verification decision.",
        "pre": "User is assigned Inspector, inspection is ASSIGNED",
        "fe": "InspectorInspectionsPage (/inspector/inspections)", "be": "InspectorController.submitReport (InspectionService.submitReport)",
        "test_cases": [
            {
                "id": "TC_INSP_007",
                "desc": "Inspector submits evaluation report passing warehouse inspection",
                "proc": "1. Open assigned inspection detail.\n2. Complete safety checklist (PCCC score: 95/100, Structure: 90/100, Hygiene: 95/100).\n3. Overall score: 93/100 (>= 80 threshold).\n4. Set decision: VERIFIED.\n5. Upload on-site inspection photos and submit.",
                "expected": "Inspection status changes to COMPLETED; warehouse verification score set to 93; Verified Badge granted.",
                "pre": "Inspection is ASSIGNED to calling inspector"
            },
            {
                "id": "TC_INSP_008",
                "desc": "Inspector submits evaluation report failing warehouse inspection",
                "proc": "1. Score safety criteria below 50 due to lacking fire exits.\n2. Set decision: REJECTED.\n3. Enter notes explaining issues and submit.",
                "expected": "Inspection status changes to COMPLETED; warehouse isVerified remains false; Owner notified of required rectifications.",
                "pre": "Inspection is ASSIGNED"
            }
        ]
    }
]

sub_functions = [
    {
        "no": 30, "name": "Purchase / Upgrade Subscription", "sheet": "Subscription",
        "desc": "Verify Tenant purchasing or upgrading WMS service tier, deducting wallet balance, updating staff quota, and blocking downgrade.",
        "pre": "User is Tenant, wallet balance >= package price",
        "fe": "SubscriptionPage (/tenant/subscription)", "be": "TenantSubscriptionController.purchasePackage (SubscriptionService.purchasePackage)",
        "test_cases": [
            {
                "id": "TC_SUB_001",
                "desc": "Tenant purchases WMS subscription package successfully",
                "proc": "1. Log in as Tenant with 10,000,000 VND wallet balance.\n2. Go to /tenant/subscription.\n3. Select 'Gói Doanh Nghiệp' (5,000,000 VND, 10 nhân viên, 30 ngày).\n4. Click 'Mua gói ngay'.\n5. Confirm payment.",
                "expected": "Wallet balance deducted 5,000,000 VND; subscription created with ACTIVE status; staff quota updated to 10; expiry date set to +30 days.",
                "pre": "User is Tenant, wallet balance sufficient"
            },
            {
                "id": "TC_SUB_002",
                "desc": "Purchase subscription with insufficient wallet balance",
                "proc": "1. Tenant has 200,000 VND balance.\n2. Attempts to purchase package costing 2,000,000 VND.",
                "expected": "System displays error: 'Số dư ví không đủ để thanh toán gói dịch vụ. Vui lòng nạp thêm tiền' (INSUFFICIENT_BALANCE).",
                "pre": "Wallet balance < package price"
            },
            {
                "id": "TC_SUB_003",
                "desc": "Tenant upgrades subscription to higher tier",
                "proc": "1. Tenant has active Standard package.\n2. Selects Enterprise package.\n3. Confirms upgrade.",
                "expected": "System prorates or upgrades immediately; max staff limit increased to 20; subscription tier updated.",
                "pre": "Active lower-tier subscription exists"
            },
            {
                "id": "TC_SUB_004",
                "desc": "Tenant attempts to downgrade package while current package is active",
                "proc": "1. Tenant holds active Enterprise package (holding 8 active staff).\n2. Attempts to purchase Starter package (max 2 staff).",
                "expected": "System rejects downgrade: 'Không thể hạ xuống gói dịch vụ thấp hơn khi gói hiện tại vẫn đang còn hạn' (DOWNGRADE_NOT_ALLOWED).",
                "pre": "Active higher-tier package"
            }
        ]
    },
    {
        "no": 31, "name": "Get Active Subscription Status", "sheet": "Subscription",
        "desc": "Verify checking active WMS subscription status, quota limits, current staff count, and expiration date.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SubscriptionPage (/tenant/subscription)", "be": "TenantSubscriptionController.getMyActiveSubscription",
        "test_cases": [
            {
                "id": "TC_SUB_005",
                "desc": "Retrieve active subscription details and staff quota usage",
                "proc": "1. Open /tenant/subscription or Tenant Dashboard.\n2. Inspect subscription widget.",
                "expected": "Displays package tier name, start date, expiration date, active staff count vs max allowed quota (e.g. 5/10 staff).",
                "pre": "Active subscription exists"
            },
            {
                "id": "TC_SUB_006",
                "desc": "Retrieve subscription status when user has never subscribed",
                "proc": "1. New tenant opens subscription page.",
                "expected": "System indicates 'Chưa đăng ký gói dịch vụ WMS'; offers package options list for purchase.",
                "pre": "No prior subscription"
            }
        ]
    },
    {
        "no": 32, "name": "Admin Manage Service Packages", "sheet": "Subscription",
        "desc": "Verify Admin creating, updating, pricing, and toggling active status of WMS service tiers.",
        "pre": "User logged in with Admin role",
        "fe": "Packages_SubcriptionsManagementPage (/admin/packages)", "be": "AdminPackageController.createPackage, updatePackage",
        "test_cases": [
            {
                "id": "TC_SUB_007",
                "desc": "Admin creates new WMS service package tier",
                "proc": "1. Log in as Admin.\n2. Go to Packages Management (/admin/package-subcription).\n3. Click 'Thêm gói mới'.\n4. Enter Name: 'Gói Chuyên Nghiệp Pro', Price: 3,500,000 VND, Max Staff: 8, Duration: 30 days.\n5. Click 'Lưu'.",
                "expected": "Package created in DB; immediately visible on public and tenant package selection screens.",
                "pre": "User is Admin"
            },
            {
                "id": "TC_SUB_008",
                "desc": "Admin deactivates package tier",
                "proc": "1. In Admin Packages, toggle isActive to false on a package.",
                "expected": "Package marked inactive; hidden from new purchases; existing subscribed users retain service until expiration.",
                "pre": "User is Admin"
            }
        ]
    }
]

pub_functions = [
    {
        "no": 33, "name": "Purchase Listing Publication", "sheet": "Listing Publication",
        "desc": "Verify Owner purchasing listing advertisement package to publish warehouse publicly on marketplace for 30/60/90 days.",
        "pre": "User is Owner, warehouse is VERIFIED, wallet balance sufficient",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.purchase (ListingOrderService.purchasePublication)",
        "test_cases": [
            {
                "id": "TC_PUB_001",
                "desc": "Owner purchases 30-day publication package for verified warehouse",
                "proc": "1. Log in as Owner.\n2. Open Warehouse list (/owner/listwarehouse).\n3. Click 'Đăng tin hiển thị' on verified warehouse.\n4. Select 'Gói 30 ngày' (1,000,000 VND).\n5. Confirm payment.",
                "expected": "Wallet deducted 1,000,000 VND; ListingOrder created with status PAID; warehouse visibleUntil extended by 30 days; warehouse appears on marketplace.",
                "pre": "Warehouse is VERIFIED, wallet balance >= 1,000,000 VND"
            },
            {
                "id": "TC_PUB_002",
                "desc": "Attempt to purchase publication for unverified or rejected warehouse",
                "proc": "1. Attempt to purchase publication for a warehouse in DRAFT or REJECTED status.",
                "expected": "System blocks purchase: 'Chỉ có kho hàng đã được phê duyệt và kiểm định (VERIFIED) mới có thể mua gói đăng tin'.",
                "pre": "Warehouse is not VERIFIED"
            }
        ]
    },
    {
        "no": 34, "name": "View Publication Purchase History", "sheet": "Listing Publication",
        "desc": "Verify Owner viewing publication order history, active visibility periods, and transaction receipts.",
        "pre": "User is Owner of warehouse",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.getHistory",
        "test_cases": [
            {
                "id": "TC_PUB_003",
                "desc": "Owner views warehouse publication timeline and receipt history",
                "proc": "1. Open Publication History tab on warehouse.\n2. Inspect past orders.",
                "expected": "Displays list of publication orders, purchased package name, start/end visibility dates, and price paid.",
                "pre": "Owner owns warehouse"
            }
        ]
    },
    {
        "no": 35, "name": "Cancel / Stop Active Publication", "sheet": "Listing Publication",
        "desc": "Verify Owner cancelling scheduled publication with refund, or stopping active publication early.",
        "pre": "User is Owner, order is SCHEDULED or ACTIVE",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerListingPublicationController.cancelScheduledPublication, stopActivePublication",
        "test_cases": [
            {
                "id": "TC_PUB_004",
                "desc": "Owner cancels a future SCHEDULED publication order",
                "proc": "1. In publication list, locate order with status SCHEDULED (not yet started).\n2. Click 'Hủy lịch đăng tin'.\n3. Confirm cancellation.",
                "expected": "Order status updated to CANCELLED; 100% publication fee refunded back to Owner wallet.",
                "pre": "Order status is SCHEDULED"
            },
            {
                "id": "TC_PUB_005",
                "desc": "Owner stops an ongoing ACTIVE publication early",
                "proc": "1. Click 'Ngừng hiển thị tin' on an ACTIVE publication.\n2. Confirm stop.",
                "expected": "Warehouse hidden from public marketplace; order marked COMPLETED_EARLY.",
                "pre": "Order is ACTIVE"
            }
        ]
    }
]

print("Inspection, Subscription, Publication defined!")
