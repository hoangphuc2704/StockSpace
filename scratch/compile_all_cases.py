import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'D:\Ky9\Capstone\StockSpace\scratch')

from build_auth_cases import auth_functions
from build_wh_cases import wh_functions
from build_layout_contract_cases import layout_functions, contract_functions
from build_insp_sub_pub_cases import insp_functions, sub_functions, pub_functions
from build_wallet_catalog_stock_cases import wallet_functions, catalog_functions, stock_functions

receipt_functions = [
    {
        "no": 55, "name": "Create Inbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating inbound stock receipt (specifying supplier, arrival date, product SKUs, batch quantities, and assigned storage bin coordinates).",
        "pre": "User is Tenant or assigned Staff, Tenant has active warehouse lease contract",
        "fe": "InboundPage (/tenant/inbound)", "be": "InventoryReceiptController.createInboundReceipt",
        "test_cases": [
            {
                "id": "TC_RCP_001",
                "desc": "Tenant/Staff creates inbound receipt with valid items and destination bins",
                "proc": "1. Go to /tenant/inbound > 'Tạo phiếu nhập kho'.\n2. Enter Supplier: 'Công ty TNHH Nước Giải Khát ABC', Expected Date: 20/09/2026.\n3. Add Line 1: SKU 'SKU-COCA-330', Quantity: 100, Expiry Date: 20/09/2027, Destination Bin: 'A-01-01'.\n4. Submit receipt.",
                "expected": "Receipt created in PENDING status (HTTP 201 Created); receiptCode (e.g. INB-202609-001) generated; bins reserved.",
                "pre": "User is Tenant or Staff with lease contract"
            },
            {
                "id": "TC_RCP_002",
                "desc": "Create inbound receipt assigned to a bin exceeding weight/volume capacity",
                "proc": "1. Put 10,000 kg into a bin with max capacity 500 kg.\n2. Submit receipt.",
                "expected": "Validation error: 'Trọng lượng hoặc thể tích hàng nhập vượt quá sức chứa tối đa của bin A-01-01'.",
                "pre": "Bin has configured capacity limit"
            }
        ]
    },
    {
        "no": 56, "name": "Approve Inbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify approving inbound receipt: validating storage bin weight and volume physical capacity, increasing stock batch quantities, and recording transaction ledger.",
        "pre": "Receipt status is PENDING, assigned bins have sufficient remaining capacity",
        "fe": "InboundPage (/tenant/inbound)", "be": "InventoryReceiptController.approveInboundReceipt",
        "test_cases": [
            {
                "id": "TC_RCP_003",
                "desc": "Approve pending inbound receipt and record stock into warehouse bins",
                "proc": "1. Open pending inbound receipt.\n2. Verify delivered physical count matches invoice.\n3. Click 'Duyệt nhập kho'.",
                "expected": "Receipt status updates to APPROVED; stock batches created in DB with status AVAILABLE; transaction ledger updated.",
                "pre": "Receipt is in PENDING status"
            }
        ]
    },
    {
        "no": 57, "name": "Create Outbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating outbound dispatch receipt (specifying recipient, delivery date, item quantities, and FIFO batch allocation).",
        "pre": "User is Tenant or assigned Staff, sufficient available stock exists in warehouse",
        "fe": "OutboundPage (/tenant/outbound)", "be": "InventoryReceiptController.createOutboundReceipt",
        "test_cases": [
            {
                "id": "TC_RCP_004",
                "desc": "Create outbound receipt with FIFO batch allocation",
                "proc": "1. Go to /tenant/outbound > 'Tạo phiếu xuất kho'.\n2. Enter Recipient: 'Đại lý Miền Nam', Delivery Date: 22/09/2026.\n3. Select SKU and quantity 50.\n4. System allocates FIFO batch.\n5. Click 'Tạo phiếu'.",
                "expected": "Outbound receipt created with status PENDING; 50 units in batch marked as RESERVED; cannot be picked by other receipts.",
                "pre": "Available stock >= 50 units"
            },
            {
                "id": "TC_RCP_005",
                "desc": "Create outbound receipt exceeding available warehouse stock",
                "proc": "1. Available stock is 20 units.\n2. Request outbound dispatch of 50 units.",
                "expected": "System rejects with HTTP 400 Bad Request: 'Số lượng yêu cầu vượt quá tồn kho khả dụng' (INSUFFICIENT_STOCK).",
                "pre": "Stock < requested quantity"
            }
        ]
    },
    {
        "no": 58, "name": "Approve Outbound Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify approving outbound receipt: picking inventory, deducting stock batch quantities, updating inventory ledger, and releasing reserved quantity.",
        "pre": "Receipt status is PENDING, stock batch available quantity >= requested dispatch quantity",
        "fe": "OutboundPage (/tenant/outbound)", "be": "InventoryReceiptController.approveOutboundReceipt",
        "test_cases": [
            {
                "id": "TC_RCP_006",
                "desc": "Approve outbound receipt, deduct stock batches, and dispatch goods",
                "proc": "1. Open pending outbound receipt.\n2. Confirm picking list complete.\n3. Click 'Xác nhận xuất kho'.",
                "expected": "Receipt status updates to APPROVED; batch quantity deducted; reserved quantity cleared; outbound ledger recorded.",
                "pre": "Receipt is in PENDING status"
            }
        ]
    },
    {
        "no": 59, "name": "Reject Goods Receipt", "sheet": "Inventory Receipts",
        "desc": "Verify rejecting inbound or outbound receipt with mandatory cancellation reason, releasing any reserved stock.",
        "pre": "User is Tenant, target receipt status is PENDING",
        "fe": "InboundPage / OutboundPage", "be": "InventoryReceiptController.rejectReceipt",
        "test_cases": [
            {
                "id": "TC_RCP_007",
                "desc": "Reject pending receipt with cancellation explanation",
                "proc": "1. Click 'Từ chối / Hủy phiếu' on pending receipt.\n2. Enter reason: 'Hàng bị hư hại trong quá trình vận chuyển'.\n3. Confirm rejection.",
                "expected": "Receipt status updates to REJECTED; any reserved stock batches released immediately back to available pool.",
                "pre": "Receipt is in PENDING status"
            }
        ]
    },
    {
        "no": 60, "name": "Replan Outbound FIFO Picking List", "sheet": "Inventory Receipts",
        "desc": "Verify re-allocating FIFO picking batches for an existing pending outbound receipt if stock positions shifted.",
        "pre": "User is Tenant or assigned Staff, outbound receipt status is PENDING",
        "fe": "OutboundPage (/tenant/outbound)", "be": "InventoryReceiptController.replanOutboundPicking",
        "test_cases": [
            {
                "id": "TC_RCP_008",
                "desc": "Replan FIFO picking batches after inventory movement",
                "proc": "1. On a pending outbound receipt, click 'Tái phân bổ FIFO'.\n2. System recalculates oldest batches.",
                "expected": "Reserved quantities re-assigned to newest eligible FIFO batches; picking list updated.",
                "pre": "Outbound receipt is PENDING"
            }
        ]
    }
]

transfer_functions = [
    {
        "no": 61, "name": "Create Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify creating internal stock relocation ticket between different bins, shelves, or zones within the warehouse.",
        "pre": "User is Tenant or assigned Staff, source batch has sufficient quantity",
        "fe": "TransferPage (/tenant/transfers)", "be": "StockTransferController.createTransferTicket",
        "test_cases": [
            {
                "id": "TC_TRF_001",
                "desc": "Create internal stock relocation ticket from Bin A to Bin B",
                "proc": "1. Open /tenant/transfers > 'Tạo phiếu điều chuyển'.\n2. Select Source Batch in Bin A-01-01, Quantity: 20.\n3. Select Destination Bin: B-02-04.\n4. Submit ticket.",
                "expected": "Transfer ticket created in PENDING status; 20 units in source batch marked as RESERVED_FOR_TRANSFER.",
                "pre": "Source batch has >= 20 available units"
            },
            {
                "id": "TC_TRF_002",
                "desc": "Create transfer ticket with destination bin same as source bin",
                "proc": "1. Select Destination Bin identical to Source Bin.\n2. Submit ticket.",
                "expected": "Validation error: 'Vị trí bin đích phải khác với vị trí bin nguồn'.",
                "pre": "None"
            }
        ]
    },
    {
        "no": 62, "name": "Approve Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify executing stock transfer: validating destination bin capacity, moving batch quantity, and writing relocation audit ledger.",
        "pre": "Transfer ticket status is PENDING, destination bin has capacity",
        "fe": "TransferPage (/tenant/transfers)", "be": "StockTransferController.approveTransferTicket",
        "test_cases": [
            {
                "id": "TC_TRF_003",
                "desc": "Approve transfer ticket and relocate physical stock to destination bin",
                "proc": "1. Open pending transfer ticket.\n2. Click 'Xác nhận điều chuyển'.",
                "expected": "Transfer ticket status updates to APPROVED; quantity deducted from Source Bin; quantity added to Destination Bin; ledger recorded.",
                "pre": "Transfer ticket is PENDING, destination bin has capacity"
            }
        ]
    },
    {
        "no": 63, "name": "Reject Stock Transfer Ticket", "sheet": "Stock Transfer",
        "desc": "Verify rejecting or cancelling an internal transfer proposal and unlocking reserved batch quantities.",
        "pre": "Transfer ticket status is PENDING",
        "fe": "TransferPage (/tenant/transfers)", "be": "StockTransferController.rejectTransferTicket",
        "test_cases": [
            {
                "id": "TC_TRF_004",
                "desc": "Reject transfer ticket and unlock reserved batch quantities",
                "proc": "1. Click 'Hủy phiếu điều chuyển'.\n2. Enter reason: 'Khu vực kệ B đang bảo trì'.\n3. Confirm rejection.",
                "expected": "Transfer status updates to REJECTED; reserved quantity in source batch released back to AVAILABLE.",
                "pre": "Transfer ticket is PENDING"
            }
        ]
    }
]

audit_functions = [
    {
        "no": 64, "name": "Create Inventory Audit Plan", "sheet": "Inventory Audit",
        "desc": "Verify Tenant scheduling periodic warehouse stocktake: setting audit scope, assigning counter staff, and preparing ticket.",
        "pre": "User is Tenant, active lease contract exists, no conflicting active audit",
        "fe": "InventoryAuditPage (/tenant/inventory-audits)", "be": "InventoryAuditController.createAuditTicket",
        "test_cases": [
            {
                "id": "TC_AUD_001",
                "desc": "Tenant schedules inventory audit and assigns counting staff",
                "proc": "1. Go to /tenant/inventory-audits > 'Tạo đợt kiểm kê'.\n2. Select Warehouse, Audit Title: 'Kiểm kê định kỳ Q3/2026'.\n3. Select assigned Counter Staff: 'Nguyễn Văn Thủ Kho'.\n4. Save draft audit.",
                "expected": "Audit ticket created in DRAFT status (HTTP 201 Created); counter staff assigned.",
                "pre": "No active IN_PROGRESS audit on warehouse"
            }
        ]
    },
    {
        "no": 65, "name": "Start Audit and Snapshot Stock", "sheet": "Inventory Audit",
        "desc": "Verify starting audit ticket, locking warehouse stock movements, and capturing system book inventory snapshot.",
        "pre": "Audit status is DRAFT",
        "fe": "InventoryAuditPage (/tenant/inventory-audits)", "be": "InventoryAuditController.startAudit",
        "test_cases": [
            {
                "id": "TC_AUD_002",
                "desc": "Start audit, freeze warehouse stock movements, and capture book snapshot",
                "proc": "1. Click 'Bắt đầu kiểm kê'.\n2. Confirm start dialog.",
                "expected": "Audit status transitions to IN_PROGRESS; system captures frozen snapshot of all batch balances; warehouse movement lock activated.",
                "pre": "Audit ticket is in DRAFT status"
            }
        ]
    },
    {
        "no": 66, "name": "Save Physical Count Results (Blind Count)", "sheet": "Inventory Audit",
        "desc": "Verify counter staff recording counted physical quantities for each rack/bin location (blind count hides book quantity).",
        "pre": "Audit status is IN_PROGRESS, user is assigned counter",
        "fe": "InventoryAuditDetailPage", "be": "InventoryAuditController.saveCountResults",
        "test_cases": [
            {
                "id": "TC_AUD_003",
                "desc": "Staff records counted physical quantity (Blind Count)",
                "proc": "1. Log in as assigned counter staff.\n2. Open audit detail.\n3. Input counted quantity for Bin A-01-01: '98'.\n4. Notice system book quantity is hidden.\n5. Click 'Lưu kết quả đếm'.",
                "expected": "Physical count saved in DB; counter cannot see system expected quantity, ensuring unbiased audit.",
                "pre": "User is assigned counter staff"
            }
        ]
    },
    {
        "no": 67, "name": "Submit Inventory Audit", "sheet": "Inventory Audit",
        "desc": "Verify counter staff submitting finalized count results, revealing book quantities and discrepancy variances for management review.",
        "pre": "Audit status is IN_PROGRESS, all items have recorded count",
        "fe": "InventoryAuditDetailPage", "be": "InventoryAuditController.submitAudit",
        "test_cases": [
            {
                "id": "TC_AUD_004",
                "desc": "Submit audit results and reveal variance discrepancies",
                "proc": "1. Complete count for all audit line items.\n2. Click 'Gửi kết quả kiểm kê'.",
                "expected": "Audit status updates to SUBMITTED; system unmasks book quantities; computes variances (e.g. Discrepancy: -2 units); ready for manager approval.",
                "pre": "All audit items counted"
            }
        ]
    },
    {
        "no": 68, "name": "Approve Inventory Audit", "sheet": "Inventory Audit",
        "desc": "Verify manager reviewing physical count vs snapshot, auto-generating adjustment receipts, updating stock, and releasing lock.",
        "pre": "Audit status is SUBMITTED, physical counts completed, approver is not the assigned counter",
        "fe": "InventoryAuditDetailPage", "be": "InventoryAuditController.approveAudit",
        "test_cases": [
            {
                "id": "TC_AUD_005",
                "desc": "Manager approves audit, synchronizes stock variances, and unlocks warehouse",
                "proc": "1. Log in as Tenant manager (different user from counter).\n2. Review discrepancy report.\n3. Click 'Duyệt điều chỉnh tồn kho'.",
                "expected": "Audit status updates to APPROVED; system auto-generates stock adjustment transaction (-2 units); warehouse movement lock released.",
                "pre": "Audit status is SUBMITTED, approver != counter staff"
            },
            {
                "id": "TC_AUD_006",
                "desc": "Assigned counter attempts to approve their own submitted audit",
                "proc": "1. Same staff user who counted submits approval request.",
                "expected": "System rejects with HTTP 403: 'Người trực tiếp kiểm đếm không được phép tự phê duyệt kết quả kiểm kê' (Four-eyes principle).",
                "pre": "Approver is same as counter"
            }
        ]
    },
    {
        "no": 69, "name": "Cancel Inventory Audit Ticket", "sheet": "Inventory Audit",
        "desc": "Verify cancelling an audit ticket in DRAFT or IN_PROGRESS state and releasing warehouse movement lock.",
        "pre": "User is Tenant, audit status is DRAFT or IN_PROGRESS",
        "fe": "InventoryAuditDetailPage", "be": "InventoryAuditController.cancelAuditTicket",
        "test_cases": [
            {
                "id": "TC_AUD_007",
                "desc": "Cancel in-progress audit and release warehouse freeze lock",
                "proc": "1. Click 'Hủy đợt kiểm kê'.\n2. Confirm cancellation dialog.",
                "expected": "Audit status updates to CANCELLED; warehouse stock freeze lock immediately lifted.",
                "pre": "Audit status is DRAFT or IN_PROGRESS"
            }
        ]
    }
]

staff_functions = [
    {
        "no": 70, "name": "Invite Tenant Staff", "sheet": "Staff Management",
        "desc": "Verify Tenant inviting staff via email: checking organization staff quota limit, validating unique email, and generating secure 48h token.",
        "pre": "User is Tenant, active staff count + pending invites < package maxStaff quota",
        "fe": "TenantStaffManagementPage (/tenant/staff)", "be": "TenantStaffController.inviteStaff",
        "test_cases": [
            {
                "id": "TC_STF_001",
                "desc": "Tenant invites new staff member via email",
                "proc": "1. Go to /tenant/staff > 'Mời nhân viên'.\n2. Enter Email: 'new_warehouse_staff@example.com', Full Name: 'Lê Văn Kho'.\n3. Click 'Gửi lời mời'.",
                "expected": "System generates 48h invitation token; sends invitation email with activation link; staff added to pending invites table.",
                "pre": "Staff quota not exceeded"
            },
            {
                "id": "TC_STF_002",
                "desc": "Invite staff when organization staff quota limit is reached",
                "proc": "1. Package allows 5 staff; organization currently has 5 active staff.\n2. Attempt to invite 6th staff.",
                "expected": "System rejects with HTTP 400: 'Số lượng nhân viên đã đạt giới hạn tối đa của gói dịch vụ. Vui lòng nâng cấp gói' (STAFF_LIMIT_REACHED).",
                "pre": "Staff count >= maxStaff quota"
            }
        ]
    },
    {
        "no": 71, "name": "Accept Staff Invitation", "sheet": "Staff Management",
        "desc": "Verify invited staff clicking email activation link, setting up account password, and joining tenant organization.",
        "pre": "Staff holds a valid, unexpired 48h invitation token",
        "fe": "StaffAcceptInvitationPage (/staff/accept)", "be": "AuthController.acceptStaffInvitation",
        "test_cases": [
            {
                "id": "TC_STF_003",
                "desc": "Staff sets password and joins tenant organization",
                "proc": "1. Open activation link /staff/accept?token={valid_token}.\n2. System previews invitation details.\n3. Enter password: 'StaffPassword123@'.\n4. Click 'Xác nhận tham gia'.",
                "expected": "Account created with ROLE_STAFF; tenantId linked; joins organization; redirected to Login.",
                "pre": "Invitation token is valid"
            }
        ]
    },
    {
        "no": 72, "name": "Get Tenant Staff Members List", "sheet": "Staff Management",
        "desc": "Verify retrieving list of all active and pending staff members in tenant organization with warehouse filter.",
        "pre": "User is Tenant",
        "fe": "TenantStaffManagementPage (/tenant/staff)", "be": "TenantStaffController.listStaffs",
        "test_cases": [
            {
                "id": "TC_STF_004",
                "desc": "Retrieve staff directory with status and warehouse assignment tags",
                "proc": "1. Open /tenant/staff.\n2. Inspect staff table.",
                "expected": "Displays all staff profiles, join dates, active/pending status, and assigned warehouses.",
                "pre": "User is Tenant"
            }
        ]
    },
    {
        "no": 73, "name": "Delete Tenant Staff", "sheet": "Staff Management",
        "desc": "Verify soft-deleting staff member, revoking organization access, and automatically terminating all active warehouse assignments.",
        "pre": "User is Tenant, target staff member exists in organization",
        "fe": "TenantStaffManagementPage (/tenant/staff)", "be": "TenantStaffController.removeStaff",
        "test_cases": [
            {
                "id": "TC_STF_005",
                "desc": "Tenant removes staff member and revokes warehouse access",
                "proc": "1. Click 'Xóa nhân viên' on staff row.\n2. Confirm removal.",
                "expected": "Staff deactivated; deletedAt set; all active warehouse assignments revoked; staff can no longer log in to WMS.",
                "pre": "Staff exists in tenant org"
            }
        ]
    },
    {
        "no": 74, "name": "Assign Staff Warehouse", "sheet": "Staff Management",
        "desc": "Verify Tenant assigning an active staff member to a specific leased warehouse, configuring WMS operational roles and custom job titles.",
        "pre": "Staff member is active in Tenant org, Tenant has an active lease contract for target warehouse",
        "fe": "TenantStaffManagementPage (/tenant/staff)", "be": "TenantStaffController.assignWarehouse",
        "test_cases": [
            {
                "id": "TC_STF_006",
                "desc": "Assign staff to manage specific leased warehouse",
                "proc": "1. In staff row, click 'Phân công kho'.\n2. Select Warehouse, Job Title: 'Thủ kho chính', Notes: 'Phụ trách xuất nhập'.\n3. Save assignment.",
                "expected": "Assignment created; staff granted WMS operational access to that warehouse.",
                "pre": "Staff active, warehouse leased by tenant"
            },
            {
                "id": "TC_STF_007",
                "desc": "Assign staff to a warehouse tenant does not lease",
                "proc": "1. Send assignment request for unleased warehouseId.",
                "expected": "System rejects with HTTP 403 Forbidden: 'Tổ chức của bạn không có hợp đồng thuê hoạt động cho kho hàng này'.",
                "pre": "Tenant does not rent warehouse"
            }
        ]
    },
    {
        "no": 75, "name": "Revoke Staff Warehouse Assignment", "sheet": "Staff Management",
        "desc": "Verify Tenant unassigning a staff member from a specific warehouse and revoking operational privileges.",
        "pre": "User is Tenant, target assignment exists and is active",
        "fe": "TenantStaffManagementPage (/tenant/staff)", "be": "TenantStaffController.revokeWarehouseAssignment",
        "test_cases": [
            {
                "id": "TC_STF_008",
                "desc": "Revoke warehouse assignment from staff member",
                "proc": "1. Click 'Thu hồi phân công' on an active assignment.\n2. Confirm revocation.",
                "expected": "Assignment status marked REVOKED; staff operational access to that warehouse terminated immediately.",
                "pre": "Assignment is ACTIVE"
            }
        ]
    },
    {
        "no": 76, "name": "Staff View Tasks and Work History", "sheet": "Staff Management",
        "desc": "Verify staff members checking their assigned WMS operational tasks (receipts, audits) and career tenure history.",
        "pre": "User logged in with Staff role",
        "fe": "StaffTasksPage / StaffCareerHistoryPage", "be": "StaffSelfController.getMyTasks, StaffSelfController.getCareerHistory",
        "test_cases": [
            {
                "id": "TC_STF_009",
                "desc": "Staff checks daily assigned tasks and career history",
                "proc": "1. Log in as Staff.\n2. Open /staff/tasks.\n3. Open /staff/career-history.",
                "expected": "Tasks page lists pending inbound/outbound receipts to process; career history shows tenure and past warehouse assignments.",
                "pre": "User logged in as Staff"
            }
        ]
    }
]

dx_functions = [
    {
        "no": 77, "name": "Export WMS Product Catalog", "sheet": "Data Exchange",
        "desc": "Verify exporting all product categories, UOMs, and SKU master data into a structured Excel workbook (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active subscription exists",
        "fe": "SkuPage (/tenant/products/sku)", "be": "CatalogExportController.exportCatalog",
        "test_cases": [
            {
                "id": "TC_DX_001",
                "desc": "Export product catalog to Excel workbook",
                "proc": "1. On SKU page, click 'Xuất Excel Catalog'.\n2. Download file.",
                "expected": "Downloads .xlsx file containing sheets for Categories, SKUs, and UOM reference with complete attribute columns.",
                "pre": "Active subscription"
            }
        ]
    },
    {
        "no": 78, "name": "Import WMS Product Catalog", "sheet": "Data Exchange",
        "desc": "Verify bulk importing categories and SKUs from Excel (.xlsx) with dry-run validation error report and apply modes.",
        "pre": "User is Tenant, valid Excel file format provided",
        "fe": "SkuPage (/tenant/products/sku)", "be": "CatalogImportController.importCatalog",
        "test_cases": [
            {
                "id": "TC_DX_002",
                "desc": "Import catalog with dry-run validation report",
                "proc": "1. Click 'Nhập Excel Catalog'.\n2. Select file stockspace-catalog.xlsx.\n3. Choose mode 'Kiểm tra trước (Dry-run)'.\n4. Review report (0 errors).\n5. Click 'Áp dụng nhập dữ liệu'.",
                "expected": "New categories and SKUs imported into DB; duplicates handled according to selected mode.",
                "pre": "Valid Excel template provided"
            },
            {
                "id": "TC_DX_003",
                "desc": "Import catalog with invalid negative weights in Excel rows",
                "proc": "1. Upload Excel with negative unit weight.\n2. Run validation.",
                "expected": "Error report lists row numbers and specific validation error: 'Trọng lượng phải lớn hơn 0'. Import blocked.",
                "pre": "Excel file contains invalid data"
            }
        ]
    },
    {
        "no": 79, "name": "Export Inventory Stock Snapshot", "sheet": "Data Exchange",
        "desc": "Verify exporting entire warehouse stock positions, batch expiry dates, and bin allocations into Excel (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active contract exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "InventorySnapshotExportController.exportSnapshot",
        "test_cases": [
            {
                "id": "TC_DX_004",
                "desc": "Export warehouse stock snapshot to Excel",
                "proc": "1. On Inventory page, click 'Xuất báo cáo tồn kho Excel'.",
                "expected": "Downloads formatted .xlsx workbook listing all batches, SKUs, bin coordinates, quantities, and expiry dates.",
                "pre": "Active contract on warehouse"
            }
        ]
    },
    {
        "no": 80, "name": "Import Offline Stock Movements", "sheet": "Data Exchange",
        "desc": "Verify bulk importing offline warehouse stock inbound/outbound movements from Excel workbook with batch balance validation.",
        "pre": "User is Tenant or assigned Staff, valid workbook structure",
        "fe": "InventoryPage (/tenant/inventory)", "be": "OfflineMovementWorkbookController.importOfflineMovements",
        "test_cases": [
            {
                "id": "TC_DX_005",
                "desc": "Import offline stock movements recorded during network outage",
                "proc": "1. Upload offline movements Excel workbook.\n2. System checks sequence.\n3. Reconciles batch balances.",
                "expected": "Stock batch balances updated in DB to match offline records; audit trails recorded.",
                "pre": "Valid offline movement workbook"
            }
        ]
    },
    {
        "no": 81, "name": "Export Audit Physical Count Sheet", "sheet": "Data Exchange",
        "desc": "Verify exporting blank physical counting sheet (SKU list, rack/bin locations) for offline warehouse stocktaking clipboard.",
        "pre": "Audit ticket is created in DRAFT / IN_PROGRESS status",
        "fe": "InventoryAuditDetailPage", "be": "AuditCountSheetExportController.exportCountSheet",
        "test_cases": [
            {
                "id": "TC_DX_006",
                "desc": "Export blank physical count sheet for stocktake clipboard",
                "proc": "1. Open scheduled audit ticket.\n2. Click 'Xuất phiếu kiểm đếm Excel'.",
                "expected": "Downloads formatted printable sheet with SKU codes, names, bin locations, and blank count columns for counters.",
                "pre": "Audit ticket exists"
            }
        ]
    }
]

chatbot_functions = [
    {
        "no": 82, "name": "Chat with StockSpace AI Assistant", "sheet": "AI Chatbot",
        "desc": "Verify interactive AI chatbot answering warehouse inquiries, rental pricing, policy guidance, and WMS navigation help.",
        "pre": "Internet access, AI OpenAI / Gemini API service active",
        "fe": "AIChatWidget (Floating Widget)", "be": "GuestChatController.chat, UserChatController.chat",
        "test_cases": [
            {
                "id": "TC_BOT_001",
                "desc": "Public visitor asks AI assistant for warehouse recommendations",
                "proc": "1. Click AI Chat widget at bottom right.\n2. Type: 'Tôi muốn tìm kho lạnh tại Quận 7 giá dưới 40 triệu'.\n3. Press Enter.",
                "expected": "AI Assistant responds with matching warehouse recommendations, specifications, direct links, and pricing advice.",
                "pre": "Chatbot online"
            },
            {
                "id": "TC_BOT_002",
                "desc": "Tenant asks AI assistant for WMS operational help",
                "proc": "1. Log in as Tenant.\n2. In chat widget, ask: 'Làm thế nào để tạo phiếu xuất kho theo nguyên tắc FIFO?'.",
                "expected": "AI assistant provides accurate, step-by-step guidance on creating outbound receipts and picking suggestions in StockSpace.",
                "pre": "Tenant logged in"
            }
        ]
    }
]

admin_functions = [
    {
        "no": 83, "name": "Manage Notifications", "sheet": "Notifications",
        "desc": "Verify receiving real-time notifications for contract updates, receipts, and audits, marking as read.",
        "pre": "User is authenticated",
        "fe": "NotificationBell (Header Component)", "be": "NotificationController.getMyNotifications, markAsRead",
        "test_cases": [
            {
                "id": "TC_NOTIF_001",
                "desc": "User receives in-app notification when contract status updates",
                "proc": "1. Owner submits contract to Tenant.\n2. Tenant logs in and checks notification bell.",
                "expected": "Notification badge shows unread count (+1); dropdown shows: 'Bạn có một hợp đồng thuê mới cần xác nhận'.",
                "pre": "User is authenticated"
            },
            {
                "id": "TC_NOTIF_002",
                "desc": "Mark notification as read",
                "proc": "1. Click on unread notification item.\n2. System marks notification as read.",
                "expected": "Unread counter decrements; notification card background switches to read style; navigates to relevant detail page.",
                "pre": "Unread notification exists"
            }
        ]
    },
    {
        "no": 84, "name": "Admin Manage User Accounts", "sheet": "System Administration",
        "desc": "Verify Admin viewing users list, filtering by role (Owner, Tenant, Staff, Inspector), locking/unlocking accounts.",
        "pre": "User logged in with Admin role",
        "fe": "UserManagementPage (/admin/users)", "be": "AdminUserController.getUsers, toggleUserStatus",
        "test_cases": [
            {
                "id": "TC_ADM_001",
                "desc": "Admin locks a violating user account",
                "proc": "1. Go to User Management (/admin/users).\n2. Search user by email.\n3. Click 'Khóa tài khoản'.\n4. Confirm lock.",
                "expected": "User isActive set to false; user immediately restricted from authenticating or accessing APIs.",
                "pre": "User logged in as Admin"
            },
            {
                "id": "TC_ADM_002",
                "desc": "Admin unlocks a previously locked user account",
                "proc": "1. Find locked user account.\n2. Click 'Mở khóa tài khoản'.\n3. Confirm unlock.",
                "expected": "User isActive restored to true; user can log in normally.",
                "pre": "User account is locked"
            }
        ]
    },
    {
        "no": 85, "name": "Admin Manage System Roles and Permissions", "sheet": "System Administration",
        "desc": "Verify Admin configuring RBAC role permissions, viewing permission matrix, and updating role grants.",
        "pre": "User logged in with Admin role",
        "fe": "PermissionManagementPage (/admin/permissions)", "be": "AdminRoleController, AdminPermissionController",
        "test_cases": [
            {
                "id": "TC_ADM_003",
                "desc": "Admin updates RBAC permission grants for a system role",
                "proc": "1. Open /admin/permissions.\n2. Select role ROLE_STAFF.\n3. Toggle permission 'INVENTORY_AUDIT_COUNT'.\n4. Save changes.",
                "expected": "Security authority matrix updated in DB and Spring Security context; enforced on subsequent API requests.",
                "pre": "User logged in as Admin"
            }
        ]
    },
    {
        "no": 86, "name": "Admin Manage Warehouse Types", "sheet": "System Administration",
        "desc": "Verify Admin creating and editing warehouse category types (Cold Storage, Bonded, General, Hazardous).",
        "pre": "User logged in with Admin role",
        "fe": "WarehousesTypePage (/admin/warehouse-types)", "be": "AdminWarehouseTypeController.createType, updateType",
        "test_cases": [
            {
                "id": "TC_ADM_004",
                "desc": "Admin creates a new warehouse category type",
                "proc": "1. Open /admin/warehouse-types.\n2. Click 'Thêm loại kho'.\n3. Enter Name: 'Kho ngoại quan (Bonded Warehouse)', Code: 'BONDED'.\n4. Save.",
                "expected": "New category type created; immediately available in Owner warehouse posting dropdown and public search filters.",
                "pre": "User logged in as Admin"
            }
        ]
    },
    {
        "no": 87, "name": "Admin Manage System Policies and Configurations", "sheet": "System Administration",
        "desc": "Verify Admin updating platform policies (terms of service, cancellation policies, deposit rates, Commission percentage).",
        "pre": "User logged in with Admin role",
        "fe": "SystemPolicyPage (/admin/system-policies)", "be": "AdminSystemPolicyController, AdminSystemConfigController",
        "test_cases": [
            {
                "id": "TC_ADM_005",
                "desc": "Admin updates platform policy and terms of service",
                "proc": "1. Open /admin/system-policies.\n2. Update deposit commission percentage and terms text.\n3. Save changes.",
                "expected": "Updated policy published and active across platform; version timestamp bumped.",
                "pre": "User logged in as Admin"
            }
        ]
    },
    {
        "no": 88, "name": "Admin View Operational Analytics", "sheet": "System Administration",
        "desc": "Verify Admin viewing platform KPI analytics: total revenue, active contracts, warehouse occupancy rate, and user growth.",
        "pre": "User logged in with Admin role",
        "fe": "AnalyticsPage (/admin/analytics)", "be": "AdminStatsController.getOverviewStats, OwnerStatsController, TenantDashboardController",
        "test_cases": [
            {
                "id": "TC_ADM_006",
                "desc": "Admin views platform operational KPI analytics and revenue charts",
                "proc": "1. Open Admin Analytics (/admin/analytics).\n2. View Total Platform Revenue, Active Leases, Total Leased Area, and User Growth chart.",
                "expected": "Analytics charts load with accurate real-time aggregates from DB.",
                "pre": "User logged in as Admin"
            }
        ]
    }
]

# Combine all 88 functions
all_functions = (
    auth_functions +
    wh_functions +
    layout_functions +
    contract_functions +
    insp_functions +
    sub_functions +
    pub_functions +
    wallet_functions +
    catalog_functions +
    stock_functions +
    receipt_functions +
    transfer_functions +
    audit_functions +
    staff_functions +
    dx_functions +
    chatbot_functions +
    admin_functions
)

print(f"Total compiled functions: {len(all_functions)}")
total_tcs = sum(len(f.get("test_cases", [])) for f in all_functions)
print(f"Total compiled test cases: {total_tcs}")

with open(r"D:\Ky9\Capstone\StockSpace\scratch\all_compiled_functions.json", "w", encoding="utf-8") as f:
    json.dump(all_functions, f, ensure_ascii=False, indent=2)
print("Saved all_compiled_functions.json successfully!")
