import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

from build_auth_cases import auth_functions
from build_wh_cases import wh_functions

layout_functions = [
    {
        "no": 12, "name": "Save Owner Warehouse Layout", "sheet": "Layout Management",
        "desc": "Verify Owner designing and bulk saving default 2D/3D layout structure (zones, racks, shelves, and storage bins).",
        "pre": "User is Owner of warehouse, warehouse exists",
        "fe": "LayoutWarehouse (/owner/layoutwarehouses)", "be": "OwnerLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)",
        "test_cases": [
            {
                "id": "TC_LY_001",
                "desc": "Owner saves default 2D/3D layout structure with zones, racks, and bins",
                "proc": "1. Log in as Owner.\n2. Open 3D Layout Designer for warehouse.\n3. Add Zone A (General Storage), 4 Racks, and 16 Bins.\n4. Configure dimensions and load capacities.\n5. Click 'Lưu sơ đồ kho'.",
                "expected": "Success message 'Lưu sơ đồ kho thành công' is shown; layout hierarchy saved in DB; total volume synchronized.",
                "pre": "User is Owner, warehouse exists in system"
            },
            {
                "id": "TC_LY_002",
                "desc": "Owner saves layout with coordinates exceeding warehouse physical boundary",
                "proc": "1. In 3D designer, place a rack at X=45m when warehouse width is only 30m.\n2. Click 'Lưu sơ đồ kho'.",
                "expected": "System rejects with validation error: 'Tọa độ/Kích thước giá kệ vượt quá kích thước vật lý của kho'.",
                "pre": "User is Owner"
            },
            {
                "id": "TC_LY_003",
                "desc": "Owner saves layout with overlapping racks",
                "proc": "1. Place Rack 2 directly overlapping Rack 1 on same coordinates.\n2. Click Save.",
                "expected": "3D visual alert indicates collision/overlap; validation blocks saving until racks are separated.",
                "pre": "User is Owner"
            }
        ]
    },
    {
        "no": 13, "name": "Get Owner Warehouse Layout", "sheet": "Layout Management",
        "desc": "Verify retrieving default 2D/3D layout tree structure configured by warehouse owner.",
        "pre": "User is Owner of warehouse",
        "fe": "LayoutWarehouse (/owner/layoutwarehouses)", "be": "OwnerLayoutController.getLayout (WarehouseLayoutService.getLayoutTree)",
        "test_cases": [
            {
                "id": "TC_LY_004",
                "desc": "Owner loads default warehouse layout tree",
                "proc": "1. Open Layout Warehouse page for owned warehouse.\n2. Observe 3D canvas and zone tree hierarchy.",
                "expected": "System returns WarehouseLayoutResponse; 3D viewport renders all zones, racks, shelves, and bins accurately.",
                "pre": "Warehouse has saved layout"
            },
            {
                "id": "TC_LY_005",
                "desc": "Owner loads layout for warehouse without prior layout",
                "proc": "1. Open Layout page for newly created warehouse.\n2. System detects empty layout.",
                "expected": "3D canvas displays empty floor with perimeter grid; prompts user to generate initial layout or place zones.",
                "pre": "Warehouse has no saved layout"
            }
        ]
    },
    {
        "no": 14, "name": "Save Tenant Snapshot Layout", "sheet": "Layout Management",
        "desc": "Verify Tenant customizing their operational rack and bin layout clone for rented warehouse.",
        "pre": "User is Tenant with active contract for target warehouse",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)", "be": "TenantLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)",
        "test_cases": [
            {
                "id": "TC_LY_006",
                "desc": "Tenant saves customized snapshot layout clone",
                "proc": "1. Log in as Tenant.\n2. Navigate to /tenant/layoutwarehouses.\n3. Customize bin codes and zone labels for operations.\n4. Click 'Lưu sơ đồ thuê'.",
                "expected": "Tenant snapshot layout saved; changes isolated to tenant's contract without modifying Owner's master template.",
                "pre": "Active lease contract exists for warehouse"
            },
            {
                "id": "TC_LY_007",
                "desc": "Tenant attempts to save layout when contract is not ACTIVE",
                "proc": "1. Attempt to save layout modifications for a contract in DRAFT or EXPIRED status.",
                "expected": "Server rejects with HTTP 400 Bad Request: 'Hợp đồng chưa được kích hoạt hoặc đã hết hạn'.",
                "pre": "Contract is not active"
            }
        ]
    },
    {
        "no": 15, "name": "Get Tenant / Staff Layout", "sheet": "Layout Management",
        "desc": "Verify Tenant and assigned Staff loading tenant-specific 2D/3D warehouse layout snapshot.",
        "pre": "User is Tenant or assigned Staff with active contract",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)", "be": "TenantLayoutController.getLayout, StaffWarehouseLayoutController.getLayout",
        "test_cases": [
            {
                "id": "TC_LY_008",
                "desc": "Assigned Staff loads warehouse operational layout",
                "proc": "1. Log in as Staff.\n2. Open /staff/layoutwarehouses.\n3. Select assigned warehouse.",
                "expected": "Staff loads tenant operational layout clone; bins color-coded by stock occupancy; read-only mode enforced.",
                "pre": "Staff has active warehouse assignment"
            },
            {
                "id": "TC_LY_009",
                "desc": "Unassigned Staff attempts to view warehouse layout",
                "proc": "1. Staff attempts to access layout of warehouseId they are not assigned to.",
                "expected": "System returns HTTP 403 Forbidden: 'Bạn không có quyền truy cập sơ đồ kho hàng này'.",
                "pre": "Staff is not assigned to target warehouse"
            }
        ]
    },
    {
        "no": 16, "name": "View Storage Load & Capacity", "sheet": "Layout Management",
        "desc": "Verify calculating and visualizing physical load capacity, occupied volume, and remaining weight per storage bin.",
        "pre": "Target warehouse has active layout with configured rack dimensions",
        "fe": "LayoutWarehouse / InventoryOverview", "be": "WarehouseCapacityController.getCapacityOverview",
        "test_cases": [
            {
                "id": "TC_LY_010",
                "desc": "View real-time storage load metrics per bin",
                "proc": "1. In 3D layout or Inventory overview, click on Bin A-01-02.\n2. Inspect capacity panel.",
                "expected": "Displays Max Weight (kg), Current Weight, Max Volume (m3), Occupied Volume, and percentage bar (e.g. 75% full).",
                "pre": "Stock batches present in bin"
            },
            {
                "id": "TC_LY_011",
                "desc": "Capacity visualization color change on bin overflow/near full",
                "proc": "1. Put stock in bin reaching >= 90% volume capacity.\n2. View 3D layout scene.",
                "expected": "Bin mesh color changes from Green (Available) to Red/Orange (Near Full) to alert warehouse manager.",
                "pre": "Bin capacity >= 90%"
            }
        ]
    }
]

contract_functions = [
    {
        "no": 17, "name": "Create Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner creating a direct rental contract draft for a tenant, specifying lease dates, area, deposit, and rental rate.",
        "pre": "User is Owner of warehouse, tenant email exists in system",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.create (ContractService.createOwnerDraft)",
        "test_cases": [
            {
                "id": "TC_CTR_001",
                "desc": "Owner creates rental contract draft with valid parameters",
                "proc": "1. Log in as Owner.\n2. Go to Owner Contracts > 'Tạo hợp đồng mới'.\n3. Select Warehouse, enter Tenant Email: 'tenant@example.com'.\n4. Set Start Date: 01/10/2026, End Date: 01/10/2027, Monthly Rent: 40,000,000 VND, Deposit: 80,000,000 VND.\n5. Click 'Tạo bản thảo'.",
                "expected": "Contract created in DRAFT status (HTTP 201 Created); appears in Owner contract table; ready for layout review and paper file upload.",
                "pre": "Owner owns warehouse, Tenant email exists in DB"
            },
            {
                "id": "TC_CTR_002",
                "desc": "Create contract draft with non-existent tenant email",
                "proc": "1. Enter non-existent tenant email: 'unknown_tenant_999@test.com'.\n2. Submit contract creation.",
                "expected": "System returns HTTP 404 Not Found: 'Không tìm thấy tài khoản Tenant tương ứng với email này' (TENANT_NOT_FOUND).",
                "pre": "User is Owner"
            },
            {
                "id": "TC_CTR_003",
                "desc": "Create contract draft with End Date before Start Date",
                "proc": "1. Set Start Date: 01/10/2026, End Date: 01/05/2026.\n2. Submit contract creation.",
                "expected": "Validation error: 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu'. Action blocked.",
                "pre": "User is Owner"
            },
            {
                "id": "TC_CTR_004",
                "desc": "Create contract draft overlapping existing active lease on same space",
                "proc": "1. Create contract draft on warehouse area that is already actively rented by another tenant for the same period.\n2. Submit creation.",
                "expected": "System rejects with HTTP 409 Conflict: 'Diện tích kho hoặc khoảng thời gian thuê bị trùng lặp' (CONTRACT_DATE_OVERLAP).",
                "pre": "Overlapping active contract exists"
            }
        ]
    },
    {
        "no": 18, "name": "Update Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner updating pricing, dates, leased dimensions, and terms of an unsubmitted contract draft.",
        "pre": "User is Owner, target contract is in DRAFT or CHANGES_REQUESTED status",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.update (ContractService.updateOwnerDraft)",
        "test_cases": [
            {
                "id": "TC_CTR_005",
                "desc": "Owner updates contract draft terms and rent rate",
                "proc": "1. In Owner Contracts, click 'Chỉnh sửa' on a DRAFT contract.\n2. Update Monthly Rent to 42,000,000 VND and add special term clause.\n3. Click 'Lưu thay đổi'.",
                "expected": "Contract draft updated successfully in DB; updated values displayed in details view.",
                "pre": "Contract is in DRAFT or CHANGES_REQUESTED status"
            },
            {
                "id": "TC_CTR_006",
                "desc": "Attempt to update an already ACTIVE or CONFIRMED contract",
                "proc": "1. Attempt to call PUT /api/owner/contracts/{contractId} on an ACTIVE contract.",
                "expected": "Server rejects with HTTP 400 Bad Request: 'Chỉ có thể chỉnh sửa hợp đồng ở trạng thái DRAFT hoặc CHANGES_REQUESTED'.",
                "pre": "Contract status is ACTIVE"
            }
        ]
    },
    {
        "no": 19, "name": "Submit Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner uploading signed paper contract agreement files and submitting contract to Tenant for confirmation.",
        "pre": "User is Owner, contract is in DRAFT status, paper agreement uploaded",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.submit (ContractService.submitOwnerContract)",
        "test_cases": [
            {
                "id": "TC_CTR_007",
                "desc": "Owner submits contract with valid paper agreement attachment",
                "proc": "1. Upload scanned contract PDF (hop_dong_thue_kho.pdf).\n2. Click 'Gửi hợp đồng cho Tenant'.\n3. Confirm submission.",
                "expected": "Contract status transitions to PENDING_TENANT_CONFIRM; notification dispatched to Tenant via email/in-app.",
                "pre": "Paper contract agreement attached"
            },
            {
                "id": "TC_CTR_008",
                "desc": "Submit contract draft without uploading paper agreement file",
                "proc": "1. In draft contract without uploaded files, click 'Gửi hợp đồng cho Tenant'.",
                "expected": "System returns HTTP 400 Bad Request: 'Cần đính kèm tệp hợp đồng giấy trước khi gửi' (PAPER_CONTRACT_REQUIRED).",
                "pre": "No paper file attached"
            }
        ]
    },
    {
        "no": 20, "name": "Tenant Confirm Rental Contract", "sheet": "Rental Contracts",
        "desc": "Verify Tenant reviewing contract details and paper agreement, confirming acceptance, and activating contract.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.confirmContract (ContractService.confirmDirectContract)",
        "test_cases": [
            {
                "id": "TC_CTR_009",
                "desc": "Tenant confirms submitted rental contract",
                "proc": "1. Log in as Tenant.\n2. Open Contracts page (/tenant/contracts).\n3. View contract details and inspect PDF attachment.\n4. Click 'Xác nhận hợp đồng'.",
                "expected": "Contract status updates to ACTIVE; warehouse leased status active; tenant operational layout snapshot created; notification sent to Owner.",
                "pre": "Contract status is PENDING_TENANT_CONFIRM"
            },
            {
                "id": "TC_CTR_010",
                "desc": "Unauthorized user attempts to confirm tenant contract",
                "proc": "1. User C (not the designated tenant) sends confirmation request to /api/tenant/contracts/{id}/confirm.",
                "expected": "Server rejects with HTTP 403 Forbidden: 'Bạn không phải là người thuê của hợp đồng này'.",
                "pre": "Caller is not contract's tenant"
            }
        ]
    },
    {
        "no": 21, "name": "Tenant Request Contract Changes", "sheet": "Rental Contracts",
        "desc": "Verify Tenant requesting modifications to specific clauses with feedback note sent back to Owner.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.requestChanges (ContractService.requestDirectContractChanges)",
        "test_cases": [
            {
                "id": "TC_CTR_011",
                "desc": "Tenant requests contract clause change with feedback note",
                "proc": "1. In contract detail, click 'Yêu cầu chỉnh sửa'.\n2. Enter reason: 'Đề nghị điều chỉnh ngày bắt đầu hợp đồng sang đầu tháng 11/2026'.\n3. Click 'Gửi yêu cầu'.",
                "expected": "Contract status changes to CHANGES_REQUESTED; feedback note saved; Owner notified to update draft.",
                "pre": "Contract is in PENDING_TENANT_CONFIRM"
            },
            {
                "id": "TC_CTR_012",
                "desc": "Tenant requests changes without entering explanation note",
                "proc": "1. Click 'Yêu cầu chỉnh sửa'.\n2. Leave reason note blank.\n3. Click Submit.",
                "expected": "Validation error: 'Vui lòng nhập lý do/yêu cầu cần chỉnh sửa'. Submission blocked.",
                "pre": "Contract is in PENDING_TENANT_CONFIRM"
            }
        ]
    },
    {
        "no": 22, "name": "Tenant Reject Rental Contract", "sheet": "Rental Contracts",
        "desc": "Verify Tenant rejecting contract proposal with a mandatory explanation reason.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)", "be": "TenantContractController.rejectContract (ContractService.rejectDirectContract)",
        "test_cases": [
            {
                "id": "TC_CTR_013",
                "desc": "Tenant rejects contract proposal with mandatory reason",
                "proc": "1. In contract detail, click 'Từ chối hợp đồng'.\n2. Enter rejection reason: 'Đã tìm được mặt bằng khác phù hợp hơn'.\n3. Confirm rejection.",
                "expected": "Contract status updates to REJECTED; warehouse reservation released; Owner notified.",
                "pre": "Contract is in PENDING_TENANT_CONFIRM"
            }
        ]
    },
    {
        "no": 23, "name": "Delete Rental Contract Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner deleting an unsubmitted contract draft.",
        "pre": "User is Owner, contract is in DRAFT status",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.deleteDraft (ContractService.deleteOwnerDraft)",
        "test_cases": [
            {
                "id": "TC_CTR_014",
                "desc": "Owner deletes unsubmitted contract draft",
                "proc": "1. On a DRAFT contract, click 'Hủy / Xóa bản thảo'.\n2. Confirm deletion popup.",
                "expected": "Contract draft deleted from database (HTTP 200 OK); table row removed.",
                "pre": "Contract is in DRAFT status"
            }
        ]
    },
    {
        "no": 24, "name": "Create Contract Renewal Draft", "sheet": "Rental Contracts",
        "desc": "Verify Owner generating contract renewal draft from an active contract within the eligible renewal window.",
        "pre": "User is Owner, target contract is ACTIVE and eligible for renewal",
        "fe": "OwnerContractsPage (/owner/contracts)", "be": "OwnerContractController.createRenewalDraft (ContractService.createRenewalDraft)",
        "test_cases": [
            {
                "id": "TC_CTR_015",
                "desc": "Owner creates renewal draft for expiring active contract",
                "proc": "1. Find ACTIVE contract near expiration.\n2. Click 'Tạo gia hạn'.\n3. Set new renewal duration (12 months).\n4. Submit renewal draft.",
                "expected": "Renewal draft created in DRAFT status; source contract ID referenced; existing layout clone linked.",
                "pre": "Contract is ACTIVE and within renewal window"
            },
            {
                "id": "TC_CTR_016",
                "desc": "Attempt to create renewal draft when renewal is already in progress",
                "proc": "1. Attempt to create second renewal draft on contract that already has pending renewal.",
                "expected": "System returns HTTP 409 Conflict: 'Hợp đồng này đã có yêu cầu gia hạn đang được xử lý' (CONTRACT_RENEWAL_ALREADY_EXISTS).",
                "pre": "Renewal draft already exists"
            }
        ]
    },
    {
        "no": 25, "name": "Get List Rental Contracts", "sheet": "Rental Contracts",
        "desc": "Verify retrieving paginated list of rental contracts with status filters (DRAFT, PENDING, ACTIVE, EXPIRED).",
        "pre": "User is authenticated Owner or Tenant",
        "fe": "OwnerContractsPage / TenantContractsPage", "be": "ContractController.getMyContracts",
        "test_cases": [
            {
                "id": "TC_CTR_017",
                "desc": "Load user contracts list with pagination and status filter",
                "proc": "1. Open Contracts page.\n2. Filter by status 'ACTIVE'.\n3. Switch pagination page 1 to 2.",
                "expected": "System returns paginated contracts matching filter for authenticated caller.",
                "pre": "Authenticated Owner or Tenant"
            }
        ]
    }
]

print("Layout & Contract functions defined!")
