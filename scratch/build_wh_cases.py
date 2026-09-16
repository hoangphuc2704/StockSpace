import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Import auth functions from build_auth_cases.py
from build_auth_cases import auth_functions

# Now let's define the other 16 modules with rich, multi-scenario test cases
wh_functions = [
    {
        "no": 7, "name": "Create Warehouse", "sheet": "Warehouse Management",
        "desc": "Verify warehouse listing creation by Owner with complete details (specifications, dimensions, storage type, rental rates, policies, and photos).",
        "pre": "User logged in with Owner role",
        "fe": "PostWarehouse (/owner/postwarehouse)", "be": "OwnerWarehouseController.createWarehouse (WarehouseService.createWarehouse)",
        "test_cases": [
            {
                "id": "TC_WH_001",
                "desc": "Owner creates a new warehouse with valid info",
                "proc": "1. Log in as Owner.\n2. Navigate to 'Đăng kho' (/owner/postwarehouse).\n3. Enter Warehouse Name: 'Kho Tiêu Chuẩn Sài Gòn 1', Address: 'Khu công nghiệp Tân Bình, TP.HCM', Category: 'Kho tổng hợp'.\n4. Enter dimensions: Width 30m, Length 50m, Height 8m, Price: 45,000,000 VND/tháng.\n5. Upload warehouse certificates and photos.\n6. Click 'Đăng kho'.",
                "expected": "Warehouse is created successfully; status is PENDING_APPROVAL; system prompts Owner to configure default 2D/3D layout.",
                "pre": "User logged in as Owner"
            },
            {
                "id": "TC_WH_002",
                "desc": "Create warehouse with missing name",
                "proc": "1. Log in as Owner.\n2. Open Post Warehouse form.\n3. Fill all fields but leave Warehouse Name empty.\n4. Click 'Đăng kho'.",
                "expected": "Validation error message shown: 'Tên kho không được để trống'. Form submission blocked.",
                "pre": "User logged in as Owner"
            },
            {
                "id": "TC_WH_003",
                "desc": "Create warehouse with negative price",
                "proc": "1. Enter Price: -5,000,000.\n2. Fill other valid fields.\n3. Click 'Đăng kho'.",
                "expected": "Validation error message shown: 'Giá thuê phải lớn hơn 0' (Price must be positive).",
                "pre": "User logged in as Owner"
            },
            {
                "id": "TC_WH_004",
                "desc": "Create warehouse with missing pricePerMonth",
                "proc": "1. Log in as Owner.\n2. Leave 'Giá thuê theo tháng' field blank.\n3. Click 'Đăng kho'.",
                "expected": "Validation error message shown: 'Giá thuê không được để trống' (Price cannot be empty).",
                "pre": "User logged in as Owner"
            },
            {
                "id": "TC_WH_005",
                "desc": "Create warehouse with invalid dimensions (Width <= 0 or Length <= 0)",
                "proc": "1. Enter Width: 0, Length: -10, Height: 6.\n2. Click 'Đăng kho'.",
                "expected": "Validation error shown: 'Kích thước chiều rộng và chiều dài phải lớn hơn 0'.",
                "pre": "User logged in as Owner"
            }
        ]
    },
    {
        "no": 8, "name": "Update Warehouse Information", "sheet": "Warehouse Management",
        "desc": "Verify Owner modifying warehouse amenities, description, and contact info while preserving verified status.",
        "pre": "User is Owner of the warehouse",
        "fe": "ListWarehouse (/owner/warehouses)", "be": "OwnerWarehouseController.updateWarehouse (WarehouseService.updateWarehouse)",
        "test_cases": [
            {
                "id": "TC_WH_006",
                "desc": "Owner updates warehouse description and amenities",
                "proc": "1. Go to Owner Warehouse list (/owner/listwarehouse).\n2. Click 'Chỉnh sửa' on a warehouse.\n3. Update description and toggle CCTV/Forklift amenities.\n4. Click 'Lưu thay đổi'.",
                "expected": "Warehouse info updated successfully in database; changes immediately visible on warehouse detail page.",
                "pre": "Warehouse belongs to authenticated Owner"
            },
            {
                "id": "TC_WH_007",
                "desc": "Attempt to update a warehouse owned by another owner",
                "proc": "1. Owner A captures warehouseId belonging to Owner B.\n2. Owner A sends PUT /api/owner/warehouses/{id} with modified payload.",
                "expected": "Server rejects with HTTP 403 Forbidden: 'Bạn không có quyền chỉnh sửa kho hàng này' (WAREHOUSE_NOT_OWNED).",
                "pre": "Warehouse is owned by a different user"
            },
            {
                "id": "TC_WH_008",
                "desc": "Update warehouse with empty address",
                "proc": "1. Clear the warehouse address field.\n2. Click 'Lưu thay đổi'.",
                "expected": "Validation error: 'Địa chỉ kho không được để trống'. Update rejected.",
                "pre": "Owner owns warehouse"
            }
        ]
    },
    {
        "no": 9, "name": "Search Warehouses", "sheet": "Warehouse Management",
        "desc": "Verify public warehouse search with multi-criteria filters (province, price range, area, storage type, keyword).",
        "pre": "System contains active, published warehouses",
        "fe": "WarehouseListingPage (/warehouses)", "be": "PublicWarehouseController.searchWarehouses",
        "test_cases": [
            {
                "id": "TC_WH_009",
                "desc": "Public user searches warehouses with matching filter",
                "proc": "1. Go to public Warehouse Marketplace (/warehouses).\n2. Enter keyword 'Kho tiêu chuẩn'.\n3. Select Province 'Hồ Chí Minh' and Price range '30 - 60 triệu'.\n4. Apply filter.",
                "expected": "System returns list of AVAILABLE published warehouses matching criteria with accurate pagination.",
                "pre": "System has at least one published warehouse matching criteria"
            },
            {
                "id": "TC_WH_010",
                "desc": "Public user searches with no matching results",
                "proc": "1. Enter keyword 'NonExistentWarehouseString999'.\n2. Select Province 'Cà Mau'.\n3. Apply filter.",
                "expected": "System returns empty list and displays friendly message: 'Không tìm thấy kho hàng phù hợp với bộ lọc'.",
                "pre": "No matching warehouses in database"
            },
            {
                "id": "TC_WH_011",
                "desc": "Filter warehouses by storage category type",
                "proc": "1. Select Category: 'Kho lạnh (Cold Storage)'.\n2. Apply filter.",
                "expected": "Only warehouses classified under cold storage category are returned.",
                "pre": "Cold storage warehouses exist in system"
            },
            {
                "id": "TC_WH_012",
                "desc": "Sort warehouses by Price Low to High and Area High to Low",
                "proc": "1. Open /warehouses.\n2. Select Sort by: 'Giá tăng dần'.\n3. Change to 'Diện tích giảm dần'.",
                "expected": "Warehouse cards reorder smoothly matching the selected sorting criteria.",
                "pre": "Warehouses exist"
            }
        ]
    },
    {
        "no": 10, "name": "View Warehouse Details", "sheet": "Warehouse Management",
        "desc": "Verify public visitors viewing full warehouse specifications, inspection rating scores, owner info, and 3D layout tour.",
        "pre": "Target warehouse exists and is published",
        "fe": "WarehouseDetailPage (/warehouse/:id)", "be": "PublicWarehouseController.getWarehouseById",
        "test_cases": [
            {
                "id": "TC_WH_013",
                "desc": "View public warehouse detail page with 3D scene",
                "proc": "1. Click on warehouse card from listing.\n2. Inspect specs (Dimensions, Total area, Clear height, Floor load).\n3. Inspect fire safety certificate, inspection badge, and 3D layout viewer.",
                "expected": "Full warehouse specs load; Three.js 3D layout renders interactive zones and racks; Owner contact card displayed.",
                "pre": "Warehouse is published and verified"
            },
            {
                "id": "TC_WH_014",
                "desc": "View non-existent warehouse detail page (Invalid UUID)",
                "proc": "1. Navigate directly to /warehouse/00000000-0000-0000-0000-000000000000.",
                "expected": "System shows 404 Not Found error: 'Kho hàng không tồn tại hoặc đã ngừng hoạt động'; user offered button to return to listing.",
                "pre": "Warehouse ID not in DB"
            },
            {
                "id": "TC_WH_015",
                "desc": "Public user views an unverified / draft warehouse detail",
                "proc": "1. Attempt to view URL of a warehouse in DRAFT or REJECTED status as a public guest.",
                "expected": "System restricts access: only published, verified warehouses are publicly viewable.",
                "pre": "Target warehouse is not verified"
            }
        ]
    },
    {
        "no": 11, "name": "Verify/Reject Warehouse (Admin)", "sheet": "Warehouse Management",
        "desc": "Verify Admin approving or rejecting a submitted warehouse listing after reviewing documents and layout.",
        "pre": "User is Admin, target warehouse is in PENDING_APPROVAL status",
        "fe": "WarehouseApprovalPage (/admin/warehouseapprovals)", "be": "AdminWarehouseController.approveWarehouse, rejectWarehouse",
        "test_cases": [
            {
                "id": "TC_WH_016",
                "desc": "Admin approves (verifies) a pending warehouse",
                "proc": "1. Log in as Admin.\n2. Navigate to Warehouse Approvals (/admin/listings).\n3. Open pending warehouse listing.\n4. Review legal documents and specifications.\n5. Click 'Phê duyệt'.",
                "expected": "Success message 'Duyệt kho thành công' is shown; warehouse status changes to VERIFIED; Owner receives approval notification.",
                "pre": "User is Admin, warehouse status is PENDING_APPROVAL"
            },
            {
                "id": "TC_WH_017",
                "desc": "Admin approves warehouse with invalid or non-existent ID",
                "proc": "1. Manually trigger approval API with non-existent warehouseId.\n2. Submit request.",
                "expected": "System returns HTTP 404 Not Found: 'Kho hàng không tồn tại'. Action blocked.",
                "pre": "User is Admin"
            },
            {
                "id": "TC_WH_018",
                "desc": "Admin rejects pending warehouse with reason",
                "proc": "1. In pending approval list, click 'Từ chối'.\n2. Enter rejection reason: 'Hồ sơ PCCC chưa đủ dấu thẩm duyệt của cơ quan chức năng'.\n3. Confirm rejection.",
                "expected": "Success message 'Từ chối duyệt kho thành công' is shown; warehouse status changes to REJECTED; reason recorded in audit log and sent to Owner.",
                "pre": "User is Admin, warehouse status is PENDING_APPROVAL"
            },
            {
                "id": "TC_WH_019",
                "desc": "Admin rejects warehouse without entering rejection reason",
                "proc": "1. Click 'Từ chối'.\n2. Leave reason box blank.\n3. Click confirm.",
                "expected": "Validation error: 'Vui lòng nhập lý do từ chối để thông báo cho chủ kho'. Action blocked.",
                "pre": "User is Admin"
            }
        ]
    }
]

print("Warehouse functions defined: 5 functions, 19 detailed test cases!")
