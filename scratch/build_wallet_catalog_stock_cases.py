import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

wallet_functions = [
    {
        "no": 36, "name": "Deposit via VNPay", "sheet": "Wallet & Payment",
        "desc": "Verify wallet balance top-up: generating VNPay payment URL, simulating payment gateway redirect, and processing IPN callback.",
        "pre": "User has active account in system",
        "fe": "WalletTenant (/tenant/wallet)", "be": "WalletController.topUp (WalletService.createTopUpRequest), VnPayCallbackController",
        "test_cases": [
            {
                "id": "TC_WAL_001",
                "desc": "Create top-up request with valid amount and generate VNPay payment URL",
                "proc": "1. Log in to system.\n2. Open Wallet page (/tenant/wallet hoặc /owner/dashboard).\n3. Click 'Nạp tiền vào ví'.\n4. Enter Amount: 2,000,000 VND.\n5. Click 'Thanh toán qua VNPay'.",
                "expected": "System generates unique paymentCode; creates transaction with status PENDING; returns VNPay payment gateway redirect URL; browser redirects to VNPay.",
                "pre": "User is authenticated, Amount >= 10,000 VND"
            },
            {
                "id": "TC_WAL_002",
                "desc": "VNPay IPN callback processes successful payment",
                "proc": "1. User completes payment on VNPay sandbox (vnp_ResponseCode = '00').\n2. VNPay sends server-to-server IPN callback to /api/auth/vnpay/callback.",
                "expected": "Server verifies cryptographic checksum (vnp_SecureHash); updates Transaction to SUCCESS; credits 2,000,000 VND to User Wallet balance; returns RspCode '00'.",
                "pre": "Pending top-up transaction exists"
            },
            {
                "id": "TC_WAL_003",
                "desc": "VNPay payment cancelled or failed by user",
                "proc": "1. On VNPay checkout screen, user clicks 'Hủy giao dịch' (vnp_ResponseCode = '24').\n2. Callback received.",
                "expected": "Transaction status updated to FAILED; wallet balance unchanged; user redirected to /wallet/callback with friendly failure notice.",
                "pre": "Pending transaction exists"
            },
            {
                "id": "TC_WAL_004",
                "desc": "Create top-up with amount less than minimum threshold",
                "proc": "1. Enter Amount: 5,000 VND (less than 10,000 VND min).\n2. Click Submit.",
                "expected": "Validation error: 'Số tiền nạp tối thiểu là 10,000 VNĐ'. Request blocked.",
                "pre": "None"
            }
        ]
    },
    {
        "no": 37, "name": "View Wallet Balance & Transactions", "sheet": "Wallet & Payment",
        "desc": "Verify displaying current available wallet balance, transaction ledger, and filtering by transaction type.",
        "pre": "User is authenticated",
        "fe": "WalletTenant / WalletAdmin", "be": "WalletController.getWalletInfo, getMyTransactions",
        "test_cases": [
            {
                "id": "TC_WAL_005",
                "desc": "View wallet balance and recent transaction history",
                "proc": "1. Navigate to Wallet page.\n2. Observe available balance, pending withdrawals, and transactions list.",
                "expected": "Displays current balance (e.g. 15,500,000 VND); transaction history lists date, payment code, type (TOP_UP, SUBSCRIPTION, WITHDRAWAL), and status.",
                "pre": "User has wallet"
            },
            {
                "id": "TC_WAL_006",
                "desc": "Filter wallet transactions by transaction type and date range",
                "proc": "1. On transactions table, select filter Type: 'Nạp tiền (TOP_UP)'.\n2. Select date from 01/08/2026 to 31/08/2026.",
                "expected": "Table displays only matching TOP_UP transactions within selected period.",
                "pre": "Transactions exist"
            }
        ]
    },
    {
        "no": 38, "name": "Request Withdraw", "sheet": "Wallet & Payment",
        "desc": "Verify withdrawal request submission: validating bank account, freezing wallet balance, and creating pending payout ticket.",
        "pre": "User has sufficient balance (Balance >= Withdraw amount)",
        "fe": "WalletTenant / WithdrawsHistory", "be": "WalletController.withdraw (WithdrawService.submitWithdrawRequest)",
        "test_cases": [
            {
                "id": "TC_WAL_007",
                "desc": "Submit withdrawal request with valid bank details",
                "proc": "1. In Wallet, click 'Yêu cầu rút tiền'.\n2. Enter Amount: 5,000,000 VND.\n3. Enter Bank: 'Vietcombank', Account Number: '0123456789', Account Holder: 'NGUYEN VAN A'.\n4. Submit request.",
                "expected": "WithdrawRequest created with status PENDING; 5,000,000 VND frozen/deducted from available balance; appears in withdrawal history.",
                "pre": "Available balance >= 5,000,000 VND"
            },
            {
                "id": "TC_WAL_008",
                "desc": "Request withdrawal exceeding available wallet balance",
                "proc": "1. Available balance is 1,000,000 VND.\n2. User requests withdrawal of 3,000,000 VND.",
                "expected": "System rejects with HTTP 400 Bad Request: 'Số dư khả dụng không đủ để thực hiện yêu cầu rút tiền' (INSUFFICIENT_BALANCE).",
                "pre": "Balance < requested amount"
            },
            {
                "id": "TC_WAL_009",
                "desc": "Submit withdrawal with invalid bank account number",
                "proc": "1. Enter Account Number: 'abc@!#'.\n2. Submit request.",
                "expected": "Validation error: 'Số tài khoản ngân hàng không hợp lệ (chỉ chứa chữ số)'. Request blocked.",
                "pre": "None"
            }
        ]
    },
    {
        "no": 39, "name": "Approve Withdraw (Admin)", "sheet": "Wallet & Payment",
        "desc": "Verify Admin inspecting and approving user withdrawal request, logging bank transfer reference.",
        "pre": "User is Admin, withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)", "be": "AdminWithdrawController.approveWithdraw (WithdrawService.approveWithdraw)",
        "test_cases": [
            {
                "id": "TC_WAL_010",
                "desc": "Admin approves pending withdrawal request",
                "proc": "1. Log in as Admin.\n2. Open Withdrawals Management (/admin/withdrawals).\n3. Find pending withdrawal request.\n4. Enter bank reference code: 'FT2608123456' and notes: 'Đã chuyển khoản thành công'.\n5. Click 'Phê duyệt'.",
                "expected": "Withdrawal status updates to APPROVED; transaction status set to SUCCESS; notification dispatched to user.",
                "pre": "Withdrawal request is in PENDING status"
            }
        ]
    },
    {
        "no": 40, "name": "Reject Withdraw (Admin)", "sheet": "Wallet & Payment",
        "desc": "Verify Admin rejecting withdrawal request with explanation, automatically refunding frozen funds to user wallet.",
        "pre": "User is Admin, withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)", "be": "AdminWithdrawController.rejectWithdraw (WithdrawService.rejectWithdraw)",
        "test_cases": [
            {
                "id": "TC_WAL_011",
                "desc": "Admin rejects withdrawal request and automatically refunds frozen funds",
                "proc": "1. In pending withdrawals, click 'Từ chối'.\n2. Enter rejection reason: 'Tên chủ tài khoản không khớp với tên đăng ký tài khoản'.\n3. Confirm rejection.",
                "expected": "Withdrawal status updates to REJECTED; frozen funds immediately refunded back to user wallet; user notified.",
                "pre": "Withdrawal request is in PENDING status"
            },
            {
                "id": "TC_WAL_012",
                "desc": "Admin rejects withdrawal without entering rejection explanation",
                "proc": "1. Click 'Từ chối'.\n2. Leave explanation note empty.\n3. Click confirm.",
                "expected": "Validation error: 'Vui lòng cung cấp lý do từ chối yêu cầu rút tiền'. Action blocked.",
                "pre": "User is Admin"
            }
        ]
    }
]

catalog_functions = [
    {
        "no": 41, "name": "Create Product Category", "sheet": "Product Catalog",
        "desc": "Verify Tenant creating a product category to classify SKUs, with optional default attribute templates.",
        "pre": "User is Tenant, active WMS subscription exists",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.createCategory (ProductCategoryService.createCategory)",
        "test_cases": [
            {
                "id": "TC_CAT_001",
                "desc": "Tenant creates new product category with valid name",
                "proc": "1. Go to Category Page (/tenant/categories).\n2. Click 'Thêm danh mục'.\n3. Enter Name: 'Hàng tiêu dùng nhanh (FMCG)', Code: 'CAT-FMCG-01'.\n4. Click 'Lưu'.",
                "expected": "Category created in DB (HTTP 200 OK); appears in categories table and SKU category dropdown.",
                "pre": "Tenant has active subscription"
            },
            {
                "id": "TC_CAT_002",
                "desc": "Create category with duplicate category code or name",
                "proc": "1. Enter existing category code.\n2. Click Save.",
                "expected": "System returns HTTP 400 Bad Request: 'Mã hoặc tên danh mục đã tồn tại trong tổ chức'.",
                "pre": "Category code already exists"
            }
        ]
    },
    {
        "no": 42, "name": "Delete Product Category", "sheet": "Product Catalog",
        "desc": "Verify Tenant soft-deleting category, ensuring deletion is blocked if active SKUs are currently assigned to it.",
        "pre": "User is Tenant, category exists, no active SKUs linked",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.deleteCategory (ProductCategoryService.deleteCategory)",
        "test_cases": [
            {
                "id": "TC_CAT_003",
                "desc": "Delete empty category containing no SKUs",
                "proc": "1. Click Delete on category with 0 linked SKUs.\n2. Confirm deletion.",
                "expected": "Category soft-deleted (isDeleted = true); hidden from category list.",
                "pre": "Category has 0 SKUs"
            },
            {
                "id": "TC_CAT_004",
                "desc": "Attempt to delete category currently linked to active SKUs",
                "proc": "1. Click Delete on category holding 5 active SKUs.\n2. Confirm deletion.",
                "expected": "System rejects with HTTP 400 Bad Request: 'Không thể xóa danh mục đang có sản phẩm (SKU) liên kết' (PRODUCT_CATEGORY_IN_USE).",
                "pre": "Category has linked SKUs"
            }
        ]
    },
    {
        "no": 43, "name": "Get Product Categories List", "sheet": "Product Catalog",
        "desc": "Verify retrieving list of tenant categories and system default categories.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "CategoryPage (/tenant/products/categories)", "be": "TenantProductController.getMyCategories",
        "test_cases": [
            {
                "id": "TC_CAT_005",
                "desc": "Retrieve complete categories list for tenant organization",
                "proc": "1. Open Category page.\n2. View category grid.",
                "expected": "Displays list of categories with SKU count badges, created date, and action buttons.",
                "pre": "Authenticated Tenant or Staff"
            }
        ]
    },
    {
        "no": 44, "name": "Create Product SKU", "sheet": "Product Catalog",
        "desc": "Verify Tenant creating SKU master data with skuCode, name, UOM, weight (kg), and volume (m3).",
        "pre": "User is Tenant, active WMS subscription exists",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.createSku (ProductSkuService.createSku)",
        "test_cases": [
            {
                "id": "TC_SKU_001",
                "desc": "Create SKU master record with valid physical attributes",
                "proc": "1. Go to SKU Management (/tenant/skus).\n2. Click 'Tạo SKU mới'.\n3. Enter SKU Code: 'SKU-COCA-330', Name: 'Coca Cola Lon 330ml', UOM: 'Thùng (Carton)'.\n4. Weight: 8.5 kg, Volume: 0.015 m3, Category: 'FMCG'.\n5. Save SKU.",
                "expected": "SKU created in DB; physical properties registered; barcode auto-generated; ready for inbound receipt.",
                "pre": "Tenant has active subscription"
            },
            {
                "id": "TC_SKU_002",
                "desc": "Create SKU with duplicate SKU Code",
                "proc": "1. Enter existing skuCode 'SKU-COCA-330'.\n2. Submit creation.",
                "expected": "System throws HTTP 400 Bad Request: 'Mã SKU này đã tồn tại trong tổ chức' (SKU_CODE_DUPLICATE).",
                "pre": "SKU code exists"
            },
            {
                "id": "TC_SKU_003",
                "desc": "Create SKU with negative or zero weight/volume",
                "proc": "1. Enter Weight: -2 kg or 0 kg.\n2. Submit SKU.",
                "expected": "Validation error: 'Trọng lượng và thể tích của SKU phải lớn hơn 0'.",
                "pre": "None"
            }
        ]
    },
    {
        "no": 45, "name": "Update Product SKU", "sheet": "Product Catalog",
        "desc": "Verify updating SKU attributes; blocking physical weight/volume changes once stock batches exist in warehouse.",
        "pre": "User is Tenant, target SKU exists",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.updateSku (ProductSkuService.updateSku)",
        "test_cases": [
            {
                "id": "TC_SKU_004",
                "desc": "Update SKU name, description, and barcode",
                "proc": "1. Click Edit on SKU.\n2. Update Name and description notes.\n3. Save changes.",
                "expected": "SKU metadata updated successfully in DB.",
                "pre": "Target SKU exists"
            },
            {
                "id": "TC_SKU_005",
                "desc": "Attempt to change weight/volume after inventory stock has been recorded",
                "proc": "1. Select SKU that already has active stock batches in warehouse bins.\n2. Modify unitWeightKg from 8.5 to 12.0.\n3. Save changes.",
                "expected": "System rejects with HTTP 400: 'Không thể thay đổi trọng lượng/thể tích của SKU sau khi đã phát sinh tồn kho' (SKU_DIMENSIONS_LOCKED).",
                "pre": "Stock batch exists for target SKU"
            }
        ]
    },
    {
        "no": 46, "name": "Delete Product SKU", "sheet": "Product Catalog",
        "desc": "Verify soft-deleting SKU; ensuring deletion is blocked if any inventory stock batches currently exist.",
        "pre": "User is Tenant, SKU exists, no linked stock batches",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.deleteSku (ProductSkuService.deleteSku)",
        "test_cases": [
            {
                "id": "TC_SKU_006",
                "desc": "Delete unused SKU with zero stock history",
                "proc": "1. Click Delete on SKU with 0 inventory batches.\n2. Confirm deletion popup.",
                "expected": "SKU soft-deleted; removed from active SKU picker.",
                "pre": "SKU has zero stock records"
            },
            {
                "id": "TC_SKU_007",
                "desc": "Attempt to delete SKU with recorded stock in warehouse",
                "proc": "1. Click Delete on SKU having existing stock batches.\n2. Confirm deletion.",
                "expected": "System rejects with HTTP 400: 'Không thể xóa SKU đang có tồn kho trong hệ thống' (SKU_IN_USE).",
                "pre": "SKU has active or historic stock batches"
            }
        ]
    },
    {
        "no": 47, "name": "Get Product SKUs List with Filters", "sheet": "Product Catalog",
        "desc": "Verify paginated SKU list retrieval supporting keyword search, category filter, and sorting.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.getMySKUs",
        "test_cases": [
            {
                "id": "TC_SKU_008",
                "desc": "Search and filter SKU catalog by keyword and category",
                "proc": "1. In /tenant/skus, type 'Coca' in search box.\n2. Select category 'FMCG'.\n3. Apply filter.",
                "expected": "Table displays matching SKUs with code, name, UOM, weight, volume, and pagination.",
                "pre": "SKUs exist"
            }
        ]
    },
    {
        "no": 48, "name": "Get Units of Measure (UOM) List", "sheet": "Product Catalog",
        "desc": "Verify retrieving standard Units of Measure (kg, carton, pallet, piece, bag, box).",
        "pre": "User is authenticated Tenant or Staff",
        "fe": "SkuPage (/tenant/products/sku)", "be": "TenantProductController.getUoms",
        "test_cases": [
            {
                "id": "TC_SKU_009",
                "desc": "Load active UOM options in dropdown",
                "proc": "1. Open SKU create modal.\n2. Open UOM selector dropdown.",
                "expected": "Displays standard units: Cái (Piece), Thùng (Carton), Pallet, Hộp (Box), Bao (Bag), Kg.",
                "pre": "UOM dictionary configured"
            }
        ]
    }
]

stock_functions = [
    {
        "no": 49, "name": "Get Inventory Stock by Warehouse", "sheet": "Stock Management",
        "desc": "Verify retrieving all stock batches stored across warehouse bins with pagination and SKU filter.",
        "pre": "User is Tenant or assigned Staff, active lease contract exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockByWarehouse (StockBatchService.getStockByWarehouse)",
        "test_cases": [
            {
                "id": "TC_STK_001",
                "desc": "Retrieve stock batches stored across warehouse bins",
                "proc": "1. Open Inventory page (/tenant/inventory).\n2. Select leased warehouse.\n3. View batches table.",
                "expected": "Displays stock batches with Batch Code, SKU Name, Bin Location, Quantity, Expiry Date, and Status (AVAILABLE/RESERVED).",
                "pre": "Active lease contract, stock exists"
            },
            {
                "id": "TC_STK_002",
                "desc": "Filter inventory batches by expiring soon (< 30 days)",
                "proc": "1. Click filter 'Sắp hết hạn'.\n2. Apply filter.",
                "expected": "Only batches with expiry date within next 30 days are displayed with warning tags.",
                "pre": "Expiring batches exist"
            }
        ]
    },
    {
        "no": 50, "name": "Get Warehouse Stock Product Overview", "sheet": "Stock Management",
        "desc": "Verify aggregate product-level overview showing total quantity, reserved quantity, and available quantity per SKU.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockOverviewByWarehouse",
        "test_cases": [
            {
                "id": "TC_STK_003",
                "desc": "View aggregate SKU stock overview",
                "proc": "1. On Inventory page, toggle to 'Tổng quan theo SKU'.\n2. Inspect SKU totals.",
                "expected": "Displays SKU Code, Total Stock, Reserved Quantity (for pending outbounds), and Available Quantity for dispatch.",
                "pre": "Stock batches exist"
            }
        ]
    },
    {
        "no": 51, "name": "Get Stock Summary by SKU", "sheet": "Stock Management",
        "desc": "Verify aggregating detailed stock positions across all rack bins for a specific product SKU.",
        "pre": "User is Tenant or assigned Staff, target SKU exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getStockBySku (StockBatchService.getStockSummaryBySku)",
        "test_cases": [
            {
                "id": "TC_STK_004",
                "desc": "Inspect multi-bin breakdown for single SKU",
                "proc": "1. Click on SKU row in overview.\n2. Open bin distribution drawer.",
                "expected": "Lists all rack bins where this SKU is currently stored, with batch numbers and quantities per bin.",
                "pre": "SKU stored in multiple bins"
            }
        ]
    },
    {
        "no": 52, "name": "Get Stock Batch Transaction History", "sheet": "Stock Management",
        "desc": "Verify viewing quantity fluctuation timeline for a specific stock batch (inbound, outbound, transfers, audit adjustments).",
        "pre": "User is Tenant or assigned Staff, target batch exists",
        "fe": "InventoryPage (/tenant/inventory)", "be": "StockBatchController.getBatchHistory",
        "test_cases": [
            {
                "id": "TC_STK_005",
                "desc": "View audit timeline of stock batch movements",
                "proc": "1. Click 'Lịch sử' on a stock batch.\n2. Inspect movement log.",
                "expected": "Displays chronological ledger: Inbound (+100) -> Internal Transfer (Bin A to B) -> Outbound (-30) -> Current balance (70).",
                "pre": "Batch has transaction history"
            }
        ]
    },
    {
        "no": 53, "name": "Get Inbound Putaway Suggestions", "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm recommending optimal shelf/bin storage locations based on SKU dimensions and available bin volume.",
        "pre": "User is Tenant or assigned Staff, target warehouse has configured layout",
        "fe": "InboundPage (/tenant/inbound)", "be": "PutawaySuggestionController.getPutawaySuggestions",
        "test_cases": [
            {
                "id": "TC_STK_006",
                "desc": "Algorithm suggests optimal empty/compatible bins for inbound items",
                "proc": "1. In Inbound receipt creation, enter 50 boxes of SKU-COCA.\n2. Click 'Gợi ý vị trí xếp hàng (Putaway)'.",
                "expected": "System algorithm calculates required volume (0.75m3) and recommends nearest available bins with sufficient capacity (e.g. Bin A-01-01).",
                "pre": "Warehouse has active layout with available bins"
            },
            {
                "id": "TC_STK_007",
                "desc": "Putaway suggestion when warehouse is 100% full",
                "proc": "1. Request putaway suggestions on a warehouse with no remaining volume capacity.",
                "expected": "System returns notice: 'Kho hàng đã đạt giới hạn dung tích lưu trữ; không tìm thấy vị trí bin trống phù hợp'.",
                "pre": "Warehouse capacity full"
            }
        ]
    },
    {
        "no": 54, "name": "Get Outbound FIFO Picking Suggestions", "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm suggesting oldest inventory batches (First-In, First-Out) for outbound picking.",
        "pre": "User is Tenant or assigned Staff, warehouse has available stock",
        "fe": "OutboundPage (/tenant/outbound)", "be": "OutboundPickingSuggestionController.getPickingSuggestions",
        "test_cases": [
            {
                "id": "TC_STK_008",
                "desc": "Algorithm allocates oldest batches based on FIFO rules",
                "proc": "1. In Outbound receipt creation, request dispatch of 80 units of SKU-A.\n2. Batch 1 (created 01/08/2026, 50 units) and Batch 2 (created 15/08/2026, 50 units) exist.\n3. Request FIFO picking suggestions.",
                "expected": "Algorithm allocates all 50 units from oldest Batch 1, and 30 units from Batch 2 (strictly adhering to FIFO).",
                "pre": "Multiple batches of SKU exist"
            },
            {
                "id": "TC_STK_009",
                "desc": "Picking suggestion when requested quantity exceeds available stock",
                "proc": "1. Request dispatch of 500 units when total available stock is only 100 units.",
                "expected": "System indicates stock deficit: 'Số lượng tồn khả dụng không đủ (Thiếu 400 đơn vị)'.",
                "pre": "Available stock < requested quantity"
            }
        ]
    }
]

print("Wallet, Catalog, and Stock functions defined!")
