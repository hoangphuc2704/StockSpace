import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

functions = [
    # 1. Authentication & Profile
    {
        "no": 1,
        "name": "Login",
        "sheet": "Authentication",
        "desc": "Verify user authentication with valid/invalid email and password, check input validation, inactive account restrictions, and JWT token issuance.",
        "pre": "User has a registered account in the system",
        "fe": "LoginPage / AuthModal",
        "be": "AuthController.login (AuthService.login)"
    },
    {
        "no": 2,
        "name": "Register",
        "sheet": "Authentication",
        "desc": "Verify new account registration for Owner/Tenant roles, duplicate email check, password complexity validation, and account profile initialization.",
        "pre": "User does not have an account in the system with the target email",
        "fe": "RegisterPage",
        "be": "AuthController.register (AuthService.register)"
    },
    {
        "no": 3,
        "name": "Forget Password",
        "sheet": "Authentication",
        "desc": "Verify forgot password request, reset password email delivery via SMTP with secure token link, and password reset form submission.",
        "pre": "User has a registered account with a verified email",
        "fe": "ForgotPasswordPage (/forgot-password)",
        "be": "AuthController.forgotPassword (AuthService.forgotPassword)"
    },
    {
        "no": 4,
        "name": "Reset Password",
        "sheet": "Authentication",
        "desc": "Verify resetting account password using token received from recovery email, verifying token expiration (48h) and updating credentials.",
        "pre": "User holds a valid non-expired password reset token",
        "fe": "ResetPasswordPage (/reset-password)",
        "be": "AuthController.resetPassword (AuthService.resetPassword)"
    },
    {
        "no": 5,
        "name": "View and Update Profile",
        "sheet": "Authentication",
        "desc": "Verify retrieving and updating user profile information (Full Name, Phone Number, Avatar URL, and Address).",
        "pre": "User is authenticated with valid JWT access token",
        "fe": "Profile (/profile)",
        "be": "AuthController.getMe, updateProfile"
    },
    {
        "no": 6,
        "name": "Change Password",
        "sheet": "Authentication",
        "desc": "Verify changing account password by confirming old password and enforcing new password security constraints.",
        "pre": "User is authenticated with valid JWT access token",
        "fe": "Profile (/profile)",
        "be": "AuthController.changePassword (AuthService.changePassword)"
    },

    # 2. Warehouse Management (Marketplace & Listings)
    {
        "no": 7,
        "name": "Create Warehouse",
        "sheet": "Warehouse Management",
        "desc": "Verify warehouse listing creation by Owner with complete details (specifications, dimensions, storage type, rental rates, policies, and photos).",
        "pre": "User logged in with Owner role",
        "fe": "PostWarehouse (/owner/postwarehouse)",
        "be": "OwnerWarehouseController.createWarehouse (WarehouseService.createWarehouse)"
    },
    {
        "no": 8,
        "name": "Update Warehouse Information",
        "sheet": "Warehouse Management",
        "desc": "Verify Owner updating warehouse specifications, pricing, rental terms, and re-submitting for review if critical specs changed.",
        "pre": "User is Owner of the warehouse, warehouse exists in system",
        "fe": "ListWarehouse (/owner/warehouses)",
        "be": "OwnerWarehouseController.updateWarehouse"
    },
    {
        "no": 9,
        "name": "Search Warehouses",
        "sheet": "Warehouse Management",
        "desc": "Verify public marketplace warehouse search and discovery with multi-criteria filters (location/province, price range, area, storage amenities, keywords).",
        "pre": "System contains active, verified warehouses published on the marketplace",
        "fe": "WarehouseListingPage (/warehouses)",
        "be": "PublicWarehouseController.searchWarehouses"
    },
    {
        "no": 10,
        "name": "View Warehouse Details",
        "sheet": "Warehouse Management",
        "desc": "Verify public visitors and tenants viewing full warehouse specifications, certifications, inspection score, owner profile, and 3D layout tour.",
        "pre": "Target warehouse exists and is published",
        "fe": "WarehouseDetailPage (/warehouse/:id)",
        "be": "PublicWarehouseController.getWarehouseById"
    },
    {
        "no": 11,
        "name": "Verify/Reject Warehouse (Admin)",
        "sheet": "Warehouse Management",
        "desc": "Verify Admin review workflow for newly submitted warehouses (inspecting documents, quality rating score, approving or rejecting with feedback).",
        "pre": "User logged in as Admin, target warehouse status is PENDING_APPROVAL / INSPECTED",
        "fe": "WarehouseApprovalPage (/admin/warehouseapprovals)",
        "be": "AdminWarehouseController.approveWarehouse, rejectWarehouse"
    },
    {
        "no": 12,
        "name": "Request Warehouse Inspection",
        "sheet": "Warehouse Management",
        "desc": "Verify Owner submitting quality inspection request for their warehouse before publication to obtain verification badge.",
        "pre": "User is Owner, warehouse status is DRAFT or VERIFIED",
        "fe": "OwnerWarehouseDetail (/owner/warehouses/:id)",
        "be": "OwnerInspectionController.requestInspection"
    },

    # 3. Warehouse Layout Management (2D/3D & Capacity)
    {
        "no": 13,
        "name": "Save Layout Bulk",
        "sheet": "Layout Management",
        "desc": "Verify 2D/3D warehouse layout designer allowing Owner to configure storage zones, rack rows, shelves, and storage bin coordinates.",
        "pre": "User is Owner of the warehouse, warehouse exists in system",
        "fe": "LayoutWarehouse (3D Designer)",
        "be": "OwnerLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)"
    },
    {
        "no": 14,
        "name": "Get Owner Warehouse Layout",
        "sheet": "Layout Management",
        "desc": "Verify retrieving default 2D/3D layout tree structure configured by warehouse owner.",
        "pre": "User is Owner of the warehouse",
        "fe": "LayoutWarehouse (/owner/layoutwarehouses)",
        "be": "OwnerLayoutController.getLayout (WarehouseLayoutService.getLayoutTree)"
    },
    {
        "no": 15,
        "name": "Save Tenant Snapshot Layout",
        "sheet": "Layout Management",
        "desc": "Verify Tenant customizing their own operational zone and bin layout clone for rented warehouse.",
        "pre": "User is Tenant, active lease contract exists for warehouse",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)",
        "be": "TenantLayoutController.saveLayout (WarehouseLayoutService.saveLayoutBulk)"
    },
    {
        "no": 16,
        "name": "Get Tenant / Staff Warehouse Layout",
        "sheet": "Layout Management",
        "desc": "Verify Tenant and assigned Staff loading tenant-specific 2D/3D warehouse layout snapshot.",
        "pre": "User is Tenant or assigned Staff with active contract",
        "fe": "LayoutWarehouse (/tenant/layoutwarehouses)",
        "be": "TenantLayoutController.getLayout, StaffWarehouseLayoutController.getLayout"
    },
    {
        "no": 17,
        "name": "View Storage Load & Capacity",
        "sheet": "Layout Management",
        "desc": "Verify calculating and visualizing physical load capacity, occupied volume, and remaining weight per storage bin.",
        "pre": "Target warehouse has active layout with configured rack dimensions",
        "fe": "LayoutWarehouse / InventoryOverview",
        "be": "WarehouseCapacityController.getCapacityOverview"
    },

    # 4. Rental Contract Management (Replaced legacy "Booking")
    {
        "no": 18,
        "name": "Create Booking",
        "sheet": "Contract Management",
        "desc": "Verify Tenant selecting warehouse space, specifying lease duration, calculating deposit amount, and submitting rental proposal with wallet deduction.",
        "pre": "User is Tenant, warehouse is Available, Tenant wallet balance >= Deposit amount",
        "fe": "WarehouseDetailPage (Modal Thuê kho)",
        "be": "TenantContractController.createDirectContract (ContractService.createDirectContract)"
    },
    {
        "no": 19,
        "name": "Submit Rental Contract Draft",
        "sheet": "Contract Management",
        "desc": "Verify Owner reviewing tenant booking, configuring legal clauses, price terms, attaching paper contract agreement, and submitting draft.",
        "pre": "User is Owner, target contract proposal status is DRAFT / CHANGES_REQUESTED",
        "fe": "OwnerContractsPage (/owner/contracts)",
        "be": "OwnerContractController.submitContractDraft (ContractService.submitOwnerDraft)"
    },
    {
        "no": 20,
        "name": "Tenant Confirm Contract",
        "sheet": "Contract Management",
        "desc": "Verify Tenant reviewing submitted contract terms and attached paper agreement, confirming and activating rental contract.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)",
        "be": "TenantContractController.confirmContract (ContractService.tenantConfirmContract)"
    },
    {
        "no": 21,
        "name": "Request Contract Changes",
        "sheet": "Contract Management",
        "desc": "Verify Tenant requesting modifications or clarifications on specific contract clauses from the warehouse owner.",
        "pre": "User is Tenant, contract status is PENDING_TENANT_CONFIRM",
        "fe": "TenantContractsPage (/tenant/contracts)",
        "be": "TenantContractController.requestChanges (ContractService.requestContractChanges)"
    },
    {
        "no": 22,
        "name": "Approve Booking",
        "sheet": "Contract Management",
        "desc": "Verify Owner approving pending contract proposal, transitioning into an active formal rental agreement.",
        "pre": "User is Owner, target contract status is PENDING_TENANT_CONFIRM / DRAFT",
        "fe": "OwnerContractsPage (/owner/contracts)",
        "be": "OwnerContractController.approveContract (ContractService.approveContract)"
    },
    {
        "no": 23,
        "name": "Reject Booking",
        "sheet": "Contract Management",
        "desc": "Verify Owner rejecting rental proposal with a mandatory reason, automatically unlocking warehouse space and refunding deposit to Tenant wallet.",
        "pre": "User is Owner, target contract proposal status is PENDING",
        "fe": "OwnerContractsPage (/owner/contracts)",
        "be": "OwnerContractController.rejectContract (ContractService.rejectDirectContract)"
    },
    {
        "no": 24,
        "name": "Create Contract Renewal Draft",
        "sheet": "Contract Management",
        "desc": "Verify Owner generating contract renewal draft based on an active and eligible existing rental contract.",
        "pre": "User is Owner, target contract status is ACTIVE and within renewal window",
        "fe": "OwnerContractsPage (/owner/contracts)",
        "be": "OwnerContractController.createRenewal (ContractService.createRenewalDraft)"
    },
    {
        "no": 25,
        "name": "Get List Rental Contracts",
        "sheet": "Contract Management",
        "desc": "Verify retrieving paginated list of rental contracts with status filters (DRAFT, PENDING, ACTIVE, EXPIRED, TERMINATED).",
        "pre": "User is authenticated Owner or Tenant",
        "fe": "OwnerContractsPage / TenantContractsPage",
        "be": "ContractController.getMyContracts"
    },

    # 5. Warehouse Quality Inspection Management
    {
        "no": 26,
        "name": "Admin Assign Inspection Task",
        "sheet": "Inspection Management",
        "desc": "Verify Admin assigning pending warehouse inspection request to a qualified staff inspector.",
        "pre": "User is Admin, inspection request status is PENDING",
        "fe": "InspectionsManagementPage (/admin/inspections)",
        "be": "AdminInspectionController.assignInspector"
    },
    {
        "no": 27,
        "name": "Inspector View Assigned Tasks",
        "sheet": "Inspection Management",
        "desc": "Verify Inspector viewing list of assigned warehouse inspection appointments with location, schedule, and owner contact details.",
        "pre": "User logged in with Inspector role",
        "fe": "InspectorInspectionsPage (/inspector/inspections)",
        "be": "InspectorController.getMyInspections"
    },
    {
        "no": 28,
        "name": "Submit Inspection Report",
        "sheet": "Inspection Management",
        "desc": "Verify Inspector submitting comprehensive evaluation: fire safety, hygiene, structure condition, rating scores, and verification decision.",
        "pre": "User is assigned Inspector, inspection status is ASSIGNED",
        "fe": "InspectorInspectionsPage (/inspector/inspections)",
        "be": "InspectorController.submitReport (InspectionService.submitReport)"
    },

    # 6. WMS Service Subscription Management
    {
        "no": 29,
        "name": "Purchase Subscription",
        "sheet": "Subscription",
        "desc": "Verify Tenant purchasing or renewing WMS service tier (Standard/Pro/Enterprise), validating wallet balance deduction, staff quota, and upgrade rules.",
        "pre": "User is Tenant, Tenant wallet balance >= Subscription package price",
        "fe": "SubscriptionPage (/tenant/subscription)",
        "be": "TenantSubscriptionController.purchasePackage (SubscriptionService.purchasePackage)"
    },
    {
        "no": 30,
        "name": "Get Active Subscription Status",
        "sheet": "Subscription",
        "desc": "Verify checking active WMS subscription status, quota limits, current staff count, and expiration date.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SubscriptionPage (/tenant/subscription)",
        "be": "TenantSubscriptionController.getMyActiveSubscription"
    },
    {
        "no": 31,
        "name": "Admin Manage Service Packages",
        "sheet": "Subscription",
        "desc": "Verify Admin creating, updating, pricing, and toggling availability of WMS service tiers.",
        "pre": "User logged in as Admin",
        "fe": "Packages_SubcriptionsManagementPage (/admin/packages)",
        "be": "AdminPackageController.createPackage, updatePackage"
    },

    # 7. Marketplace Listing Publication Management
    {
        "no": 32,
        "name": "Purchase Listing Publication",
        "sheet": "Listing Publication",
        "desc": "Verify Owner purchasing a listing advertisement package to publish warehouse publicly on marketplace for 30/60/90 days.",
        "pre": "User is Owner, warehouse status is VERIFIED, wallet balance sufficient",
        "fe": "ListWarehouse (/owner/warehouses)",
        "be": "OwnerListingPublicationController.purchase (ListingOrderService.purchasePublication)"
    },
    {
        "no": 33,
        "name": "View Publication Purchase History",
        "sheet": "Listing Publication",
        "desc": "Verify Owner viewing publication order history, active visibility period, and transaction receipts.",
        "pre": "User is Owner of the warehouse",
        "fe": "ListWarehouse (/owner/warehouses)",
        "be": "OwnerListingPublicationController.getHistory"
    },
    {
        "no": 34,
        "name": "Cancel / Stop Active Publication",
        "sheet": "Listing Publication",
        "desc": "Verify Owner cancelling scheduled publication with refund, or stopping active publication early.",
        "pre": "User is Owner, target publication order is SCHEDULED or ACTIVE",
        "fe": "ListWarehouse (/owner/warehouses)",
        "be": "OwnerListingPublicationController.cancelScheduledPublication, stopActivePublication"
    },

    # 8. Digital Wallet & Payment Management
    {
        "no": 35,
        "name": "Deposit via VNPay",
        "sheet": "Wallet & Payment",
        "desc": "Verify wallet balance top-up workflow: generating secure VNPay payment redirect URL, simulating payment transaction, and processing IPN callback.",
        "pre": "User has an active account in the system (Owner or Tenant)",
        "fe": "WalletTenant (/tenant/wallet)",
        "be": "WalletController.topUp (WalletService.createTopUpRequest)"
    },
    {
        "no": 36,
        "name": "View Wallet Balance & Transactions",
        "sheet": "Wallet & Payment",
        "desc": "Verify displaying current available wallet balance, transaction ledger, and filtering by transaction type (TOP_UP, RENTAL_FEE, PACKAGE_PAYMENT).",
        "pre": "User is authenticated with valid JWT token",
        "fe": "WalletTenant / WalletAdmin",
        "be": "WalletController.getWalletInfo, getMyTransactions"
    },
    {
        "no": 37,
        "name": "Request Withdraw",
        "sheet": "Wallet & Payment",
        "desc": "Verify withdrawal request submission: validating bank account information, account holder name, freezing wallet balance, and creating pending payout ticket.",
        "pre": "User has sufficient available wallet balance (Balance >= Withdraw amount)",
        "fe": "WalletTenant / WithdrawsHistory",
        "be": "WalletController.withdraw (WithdrawService.submitWithdrawRequest)"
    },
    {
        "no": 38,
        "name": "Approve Withdraw",
        "sheet": "Wallet & Payment",
        "desc": "Verify Admin inspecting and approving user withdrawal request, logging bank transfer reference, and updating status to SUCCESS.",
        "pre": "User logged in as Admin, target withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)",
        "be": "AdminWithdrawController.approveWithdraw (WithdrawService.approveWithdraw)"
    },
    {
        "no": 39,
        "name": "Reject Withdraw",
        "sheet": "Wallet & Payment",
        "desc": "Verify Admin rejecting invalid withdrawal request with explanation, automatically refunding held amount back to user's wallet.",
        "pre": "User logged in as Admin, target withdrawal request is in PENDING status",
        "fe": "AdminWithdrawalsPage (/admin/withdrawals)",
        "be": "AdminWithdrawController.rejectWithdraw (WithdrawService.rejectWithdraw)"
    },

    # 9. WMS Product & Master Catalog Management
    {
        "no": 40,
        "name": "Create Product Category",
        "sheet": "Product Catalog",
        "desc": "Verify Tenant creating a product category to classify SKUs, with optional default attribute templates.",
        "pre": "User is Tenant, active WMS subscription exists",
        "fe": "CategoryPage (/tenant/products/categories)",
        "be": "TenantProductController.createCategory (ProductCategoryService.createCategory)"
    },
    {
        "no": 41,
        "name": "Delete Product Category",
        "sheet": "Product Catalog",
        "desc": "Verify Tenant soft-deleting a category, ensuring deletion is blocked if any active SKUs are currently assigned to it.",
        "pre": "User is Tenant, category exists, no active SKUs linked",
        "fe": "CategoryPage (/tenant/products/categories)",
        "be": "TenantProductController.deleteCategory (ProductCategoryService.deleteCategory)"
    },
    {
        "no": 42,
        "name": "Get Product Categories List",
        "sheet": "Product Catalog",
        "desc": "Verify retrieving list of tenant categories and system default categories.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "CategoryPage (/tenant/products/categories)",
        "be": "TenantProductController.getMyCategories (ProductCategoryService.getMyCategories)"
    },
    {
        "no": 43,
        "name": "Create Product SKU",
        "sheet": "Product Catalog",
        "desc": "Verify Tenant defining product catalog: creating product categories, unit of measure (UOM), and SKU master data with physical weight and volume attributes.",
        "pre": "User is Tenant, Tenant has an active WMS subscription",
        "fe": "SkuPage (/tenant/products/sku)",
        "be": "TenantProductController.createSku (ProductSkuService.createSku)"
    },
    {
        "no": 44,
        "name": "Update Product SKU Attributes",
        "sheet": "Product Catalog",
        "desc": "Verify updating SKU name, category, and specifications; blocking physical dimension changes once stock batches exist.",
        "pre": "User is Tenant, target SKU exists and belongs to tenant",
        "fe": "SkuPage (/tenant/products/sku)",
        "be": "TenantProductController.updateSku (ProductSkuService.updateSku)"
    },
    {
        "no": 45,
        "name": "Delete Product SKU",
        "sheet": "Product Catalog",
        "desc": "Verify soft-deleting product SKU, ensuring deletion is blocked if any inventory stock batches currently exist.",
        "pre": "User is Tenant, SKU exists, no linked StockBatch records",
        "fe": "SkuPage (/tenant/products/sku)",
        "be": "TenantProductController.deleteSku (ProductSkuService.deleteSku)"
    },
    {
        "no": 46,
        "name": "Get Product SKUs List with Filters",
        "sheet": "Product Catalog",
        "desc": "Verify paginated SKU list retrieval supporting keyword search, category filter, and sorting.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "SkuPage (/tenant/products/sku)",
        "be": "TenantProductController.getMySKUs (ProductSkuService.getMySKUs)"
    },
    {
        "no": 47,
        "name": "Get Units of Measure (UOM) List",
        "sheet": "Product Catalog",
        "desc": "Verify retrieving standard Units of Measure (kg, carton, pallet, piece, bag, box).",
        "pre": "User is authenticated Tenant or Staff",
        "fe": "SkuPage (/tenant/products/sku)",
        "be": "TenantProductController.getUoms"
    },

    # 10. WMS Inventory Stock & Location Management
    {
        "no": 48,
        "name": "Get Inventory Stock by Warehouse",
        "sheet": "Stock Management",
        "desc": "Verify retrieving all stock batches stored across warehouse bins with pagination and SKU filter.",
        "pre": "User is Tenant or assigned Staff, active warehouse contract exists",
        "fe": "InventoryPage (/tenant/inventory)",
        "be": "StockBatchController.getStockByWarehouse (StockBatchService.getStockByWarehouse)"
    },
    {
        "no": 49,
        "name": "Get Warehouse Stock Product Overview",
        "sheet": "Stock Management",
        "desc": "Verify aggregate product-level overview showing total quantity, reserved quantity, and available quantity per SKU.",
        "pre": "User is Tenant or assigned Staff",
        "fe": "InventoryPage (/tenant/inventory)",
        "be": "StockBatchController.getStockOverviewByWarehouse"
    },
    {
        "no": 50,
        "name": "Get Stock Summary by SKU",
        "sheet": "Stock Management",
        "desc": "Verify aggregating detailed stock positions across all rack bins for a specific product SKU.",
        "pre": "User is Tenant or assigned Staff, target SKU exists",
        "fe": "InventoryPage (/tenant/inventory)",
        "be": "StockBatchController.getStockBySku (StockBatchService.getStockSummaryBySku)"
    },
    {
        "no": 51,
        "name": "Get Stock Batch Transaction History",
        "sheet": "Stock Management",
        "desc": "Verify viewing quantity fluctuation timeline for a specific stock batch (inbound, outbound, transfers, audit adjustments).",
        "pre": "User is Tenant or assigned Staff, target batch exists",
        "fe": "InventoryPage (Modal Lịch sử lô)",
        "be": "StockBatchController.getTransactionsByBatch"
    },
    {
        "no": 52,
        "name": "Get Inbound Putaway Suggestions",
        "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm recommending optimal shelf/bin storage locations based on SKU dimensions and available bin volume.",
        "pre": "User is Tenant or assigned Staff, target warehouse has configured layout",
        "fe": "InboundPage (Gợi ý vị trí cất hàng)",
        "be": "PutawaySuggestionController.suggestPutawayLocations"
    },
    {
        "no": 53,
        "name": "Get Outbound FIFO Picking Suggestions",
        "sheet": "Stock Management",
        "desc": "Verify intelligent algorithm suggesting oldest inventory batches (First-In, First-Out) for outbound picking.",
        "pre": "User is Tenant or assigned Staff, warehouse has available stock",
        "fe": "OutboundPage (Gợi ý chọn hàng FIFO)",
        "be": "OutboundPickingSuggestionController.suggestPickingLocations"
    },

    # 11. WMS Inbound & Outbound Receipt Management
    {
        "no": 54,
        "name": "Create Inbound Receipt",
        "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating inbound stock receipt (specifying supplier, arrival date, product SKUs, batch quantities, and assigned storage bin coordinates).",
        "pre": "User is Tenant or assigned Staff, Tenant has an active warehouse lease contract",
        "fe": "InboundPage (/tenant/inbound)",
        "be": "InventoryReceiptController.createReceipt (InventoryReceiptService.createReceipt)"
    },
    {
        "no": 55,
        "name": "Approve Inbound Receipt",
        "sheet": "Inventory Receipts",
        "desc": "Verify approving inbound receipt: validating storage bin weight and volume physical capacity, increasing stock batch quantities, and recording transaction ledger.",
        "pre": "Receipt status is PENDING, assigned bins have sufficient remaining capacity",
        "fe": "InboundPage (Button Duyệt phiếu nhập)",
        "be": "InventoryReceiptController.approveReceipt (InventoryReceiptService.approveReceipt)"
    },
    {
        "no": 56,
        "name": "Create Outbound Receipt",
        "sheet": "Inventory Receipts",
        "desc": "Verify Tenant/Staff creating outbound dispatch receipt (specifying recipient, delivery date, item quantities, and FIFO batch allocation).",
        "pre": "User is Tenant or assigned Staff, sufficient available stock exists in the warehouse",
        "fe": "OutboundPage (/tenant/outbound)",
        "be": "InventoryReceiptController.createReceipt (InventoryReceiptService.createReceipt)"
    },
    {
        "no": 57,
        "name": "Approve Outbound Receipt",
        "sheet": "Inventory Receipts",
        "desc": "Verify approving outbound receipt: picking inventory, deducting stock batch quantities, updating inventory ledger, and releasing reserved quantity.",
        "pre": "Receipt status is PENDING, stock batch available quantity >= requested dispatch quantity",
        "fe": "OutboundPage (Button Duyệt phiếu xuất)",
        "be": "InventoryReceiptController.approveReceipt (InventoryReceiptService.approveReceipt)"
    },
    {
        "no": 58,
        "name": "Reject Goods Receipt",
        "sheet": "Inventory Receipts",
        "desc": "Verify rejecting inbound or outbound receipt with mandatory cancellation reason, releasing any reserved stock.",
        "pre": "User is Tenant, target receipt status is PENDING",
        "fe": "InboundPage / OutboundPage",
        "be": "InventoryReceiptController.rejectReceipt"
    },
    {
        "no": 59,
        "name": "Replan Outbound FIFO Picking List",
        "sheet": "Inventory Receipts",
        "desc": "Verify re-allocating FIFO picking batches for an existing pending outbound receipt if stock positions shifted.",
        "pre": "User is Tenant or assigned Staff, outbound receipt status is PENDING",
        "fe": "OutboundPage (Tạo lại Pick List)",
        "be": "InventoryReceiptController.replanOutboundReceipt"
    },

    # 12. WMS Internal Stock Transfer Management
    {
        "no": 60,
        "name": "Create Stock Transfer Ticket",
        "sheet": "Stock Transfer",
        "desc": "Verify creating internal stock relocation ticket between different bins, shelves, or zones within the warehouse.",
        "pre": "User is Tenant or assigned Staff, source batch has sufficient quantity",
        "fe": "TransferPage (/tenant/transfer)",
        "be": "StockTransferController.createTransfer"
    },
    {
        "no": 61,
        "name": "Approve Stock Transfer Ticket",
        "sheet": "Stock Transfer",
        "desc": "Verify executing stock transfer: validating destination bin capacity, moving batch quantity, and writing relocation audit ledger.",
        "pre": "Transfer ticket status is PENDING, destination bin has capacity",
        "fe": "TransferPage (/tenant/transfer)",
        "be": "StockTransferController.approveTransfer"
    },
    {
        "no": 62,
        "name": "Reject Stock Transfer Ticket",
        "sheet": "Stock Transfer",
        "desc": "Verify rejecting or cancelling an internal transfer proposal and unlocking reserved batch quantities.",
        "pre": "Transfer ticket status is PENDING",
        "fe": "TransferPage (/tenant/transfer)",
        "be": "StockTransferController.rejectTransfer"
    },

    # 13. WMS Inventory Audit & Discrepancy Reconciliation
    {
        "no": 63,
        "name": "Create Inventory Audit",
        "sheet": "Inventory Audit",
        "desc": "Verify Tenant scheduling periodic warehouse stocktake: setting audit scope, assigning counter staff, snapshotting book inventory, and locking warehouse movement.",
        "pre": "User is Tenant, Tenant has an active warehouse lease contract, no conflicting active audit",
        "fe": "InventoryAuditPage (/tenant/inventory/audit)",
        "be": "InventoryAuditController.create (InventoryAuditService.createAudit)"
    },
    {
        "no": 64,
        "name": "Start Audit and Snapshot Stock",
        "sheet": "Inventory Audit",
        "desc": "Verify starting audit ticket, locking warehouse stock movements, and capturing system book inventory snapshot.",
        "pre": "Audit status is DRAFT",
        "fe": "InventoryAuditDetailPage (/tenant/inventory/audit/:id)",
        "be": "InventoryAuditController.start (InventoryAuditService.startAudit)"
    },
    {
        "no": 65,
        "name": "Save Physical Count Results",
        "sheet": "Inventory Audit",
        "desc": "Verify counter staff recording counted physical quantities for each rack/bin location (blind count hides book quantity).",
        "pre": "Audit status is IN_PROGRESS, user is assigned counter",
        "fe": "InventoryAuditDetailPage (Blind Count View)",
        "be": "InventoryAuditController.saveCounts (InventoryAuditService.saveAuditCounts)"
    },
    {
        "no": 66,
        "name": "Submit Inventory Audit",
        "sheet": "Inventory Audit",
        "desc": "Verify counter staff submitting finalized count results, revealing book quantities and discrepancy variances for management review.",
        "pre": "Audit status is IN_PROGRESS, all items have recorded count",
        "fe": "InventoryAuditDetailPage (Button Nộp kết quả kiểm kê)",
        "be": "InventoryAuditController.submit (InventoryAuditService.submitAudit)"
    },
    {
        "no": 67,
        "name": "Approve Inventory Audit",
        "sheet": "Inventory Audit",
        "desc": "Verify manager reviewing physical count vs system snapshot, calculating discrepancies, generating adjustment receipts, updating stock, and releasing lock.",
        "pre": "Audit status is SUBMITTED, physical counts completed, approver is not the assigned counter",
        "fe": "InventoryAuditDetailPage (Button Duyệt kiểm kê)",
        "be": "InventoryAuditController.approve (InventoryAuditService.approveAudit)"
    },
    {
        "no": 68,
        "name": "Cancel Inventory Audit Ticket",
        "sheet": "Inventory Audit",
        "desc": "Verify cancelling an audit ticket in DRAFT or IN_PROGRESS state and releasing warehouse movement lock.",
        "pre": "User is Tenant, audit status is DRAFT or IN_PROGRESS",
        "fe": "InventoryAuditDetailPage",
        "be": "InventoryAuditController.cancel (InventoryAuditService.cancelAudit)"
    },

    # 14. Tenant Staff & WMS Access Roles Management
    {
        "no": 69,
        "name": "Invite Tenant Staff",
        "sheet": "Staff Management",
        "desc": "Verify Tenant inviting staff via email: checking organization staff quota limit, validating unique email, generating secure 48h token, and sending invitation email.",
        "pre": "User is Tenant, active staff count + pending invites < package maxStaff quota",
        "fe": "TenantStaffManagementPage (/tenant/staffs)",
        "be": "TenantStaffController.inviteStaff (TenantStaffService.sendInvitation)"
    },
    {
        "no": 70,
        "name": "Accept Staff Invitation",
        "sheet": "Staff Management",
        "desc": "Verify invited staff clicking email activation link, setting up account password, and joining tenant organization.",
        "pre": "Staff holds a valid, unexpired 48h invitation token",
        "fe": "StaffAcceptInvitationPage (/staff/accept)",
        "be": "TenantStaffService.acceptInvitation"
    },
    {
        "no": 71,
        "name": "Get Tenant Staff Members List",
        "sheet": "Staff Management",
        "desc": "Verify retrieving list of all active and pending staff members in tenant organization with warehouse filter.",
        "pre": "User is Tenant",
        "fe": "TenantStaffManagementPage (/tenant/staffs)",
        "be": "TenantStaffController.listStaffs (TenantStaffService.listStaffs)"
    },
    {
        "no": 72,
        "name": "Delete Tenant Staff",
        "sheet": "Staff Management",
        "desc": "Verify soft-deleting staff member, revoking organization access, and automatically terminating all active warehouse assignments.",
        "pre": "User is Tenant, target staff member exists in organization",
        "fe": "TenantStaffManagementPage (/tenant/staffs)",
        "be": "TenantStaffController.removeStaff (TenantStaffService.removeStaff)"
    },
    {
        "no": 73,
        "name": "Assign Staff Warehouse",
        "sheet": "Staff Management",
        "desc": "Verify Tenant assigning an active staff member to a specific leased warehouse, configuring WMS operational roles and custom job titles.",
        "pre": "Staff member is active in Tenant org, Tenant has an active lease contract for target warehouse",
        "fe": "TenantStaffManagementPage (/tenant/staffs)",
        "be": "TenantStaffController.assignWarehouse (TenantStaffService.assignWarehouseToStaff)"
    },
    {
        "no": 74,
        "name": "Revoke Staff Warehouse Assignment",
        "sheet": "Staff Management",
        "desc": "Verify Tenant unassigning a staff member from a specific warehouse and revoking operational privileges.",
        "pre": "User is Tenant, target assignment exists and is active",
        "fe": "TenantStaffManagementPage (/tenant/staffs)",
        "be": "TenantStaffController.revokeAssignment (TenantStaffService.revokeWarehouseAssignment)"
    },

    # 15. WMS Excel Data Exchange & Offline Operations
    {
        "no": 75,
        "name": "Export WMS Product Catalog",
        "sheet": "Data Exchange",
        "desc": "Verify exporting all product categories, UOMs, and SKU master data into a structured Excel workbook (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active subscription exists",
        "fe": "SkuPage (Button Xuất Excel Catalog)",
        "be": "CatalogExportController.export (CatalogExportService.exportCatalog)"
    },
    {
        "no": 76,
        "name": "Import WMS Product Catalog",
        "sheet": "Data Exchange",
        "desc": "Verify bulk importing categories and SKUs from Excel (.xlsx) with dry-run validation error report and apply modes.",
        "pre": "User is Tenant, valid Excel file format provided",
        "fe": "SkuPage (Modal Nhập Excel Catalog)",
        "be": "CatalogImportController.importCatalog (CatalogImportService.importCatalog)"
    },
    {
        "no": 77,
        "name": "Export Inventory Stock Snapshot",
        "sheet": "Data Exchange",
        "desc": "Verify exporting entire warehouse stock positions, batch expiry dates, and bin allocations into Excel (.xlsx).",
        "pre": "User is Tenant or assigned Staff, active contract exists",
        "fe": "InventoryPage (Button Xuất Tồn kho)",
        "be": "InventorySnapshotExportController.exportSnapshot"
    },
    {
        "no": 78,
        "name": "Import Offline Stock Movements",
        "sheet": "Data Exchange",
        "desc": "Verify bulk importing offline warehouse stock inbound/outbound movements from Excel workbook with batch balance validation.",
        "pre": "User is Tenant or assigned Staff, valid workbook structure",
        "fe": "InventoryPage (Modal Nhập biến động ngoại tuyến)",
        "be": "OfflineMovementWorkbookController.importMovement"
    },
    {
        "no": 79,
        "name": "Export Audit Physical Count Sheet",
        "sheet": "Data Exchange",
        "desc": "Verify exporting blank physical counting sheet (SKU list, rack/bin locations) for offline warehouse stocktaking clipboard.",
        "pre": "Audit ticket is created in DRAFT / IN_PROGRESS status",
        "fe": "InventoryAuditDetailPage (Xuất phiếu đếm kho)",
        "be": "AuditCountSheetExportController.exportCountSheet"
    },

    # 16. AI Assistant Chatbot
    {
        "no": 80,
        "name": "Chat with StockSpace AI Assistant",
        "sheet": "AI Chatbot",
        "desc": "Verify interactive AI chatbot answering warehouse inquiries, rental pricing, policy guidance, and WMS navigation help.",
        "pre": "Internet access, AI OpenAI / Gemini API service active",
        "fe": "AIChatWidget (Floating Widget)",
        "be": "UserChatController / GuestChatController"
    },

    # 17. System Administration & Master Data
    {
        "no": 81,
        "name": "Admin Manage User Accounts",
        "sheet": "System Administration",
        "desc": "Verify Admin viewing users list, filtering by role (Owner, Tenant, Staff, Inspector), locking/unlocking accounts.",
        "pre": "User logged in with Admin role",
        "fe": "UserManagementPage (/admin/users)",
        "be": "AdminUserController.listUsers, lockUser, unlockUser"
    },
    {
        "no": 82,
        "name": "Admin Manage System Roles and Permissions",
        "sheet": "System Administration",
        "desc": "Verify Admin configuring RBAC role permissions, viewing permission matrix, and updating role grants.",
        "pre": "User logged in with Admin role",
        "fe": "PermissionManagementPage (/admin/permissions)",
        "be": "AdminRoleController, AdminPermissionController"
    },
    {
        "no": 83,
        "name": "Admin Manage Warehouse Types",
        "sheet": "System Administration",
        "desc": "Verify Admin creating and editing warehouse category types (Cold Storage, Bonded, General, Hazardous).",
        "pre": "User logged in with Admin role",
        "fe": "WarehousesTypePage (/admin/warehousetypes)",
        "be": "AdminWarehouseTypeController.createType, updateType"
    },
    {
        "no": 84,
        "name": "Admin Manage System Policies and Configurations",
        "sheet": "System Administration",
        "desc": "Verify Admin updating platform policies (terms of service, cancellation policies, deposit rates, Commission percentage).",
        "pre": "User logged in with Admin role",
        "fe": "SystemPolicyPage (/admin/systempolicy)",
        "be": "AdminSystemPolicyController, AdminSystemConfigController"
    },
    {
        "no": 85,
        "name": "Admin View Operational Analytics",
        "sheet": "System Administration",
        "desc": "Verify Admin viewing platform KPI analytics: total revenue, active contracts, warehouse occupancy rate, and user growth.",
        "pre": "User logged in with Admin role",
        "fe": "AdminDashboard (/admin/dashboard)",
        "be": "AdminStatsController.getOverviewStats"
    }
]

# Write HTML file
html_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html"

# Extract unique sheets for filter tabs
sheets = sorted(list(set(f["sheet"] for f in functions)))

functions_json = json.dumps(functions, ensure_ascii=False)
sheets_json = json.dumps(sheets, ensure_ascii=False)

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockSpace - Toàn bộ Danh mục Chức năng Dự án (Đối chiếu 100% FE & BE)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy: #002060;
      --navy-dark: #001338;
      --navy-light: #0d3880;
      --border: #d1d5db;
      --border-dark: #374151;
      --text-main: #111827;
      --text-muted: #4b5563;
      --sheet-link: #4338ca;
      --bg-alt: #f9fafb;
      --bg-hover: #f0fdf4;
      --primary: #10b981;
      --badge-bg: #e0e7ff;
      --badge-text: #3730a3;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f3f4f6;
      color: var(--text-main);
      padding: 24px;
      line-height: 1.5;
    }}
    .container {{
      max-width: 1440px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }}
    
    /* Top Header Bar */
    .top-toolbar {{
      background: #1e293b;
      color: white;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }}
    .top-title h1 {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .top-title p {{
      font-size: 13px;
      color: #94a3b8;
      margin-top: 2px;
    }}
    .btn-group {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }}
    .btn-primary {{
      background: #10b981;
      color: white;
    }}
    .btn-primary:hover {{ background: #059669; }}
    .btn-outline {{
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
    }}
    .btn-outline:hover {{ background: rgba(255,255,255,0.2); }}

    /* Excel Header Section (Exactly matching Report 5 Form) */
    .excel-metadata {{
      padding: 20px 24px;
      border-bottom: 2px solid #e5e7eb;
      background: #fafafa;
    }}
    .report-heading {{
      text-align: center;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #000;
      margin-bottom: 20px;
      text-transform: uppercase;
    }}
    .meta-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      background: white;
      border: 1px solid #d1d5db;
    }}
    .meta-table td {{
      padding: 8px 14px;
      border: 1px solid #d1d5db;
    }}
    .meta-label {{
      font-weight: 700;
      color: #8b0000;
      width: 260px;
      background: #fffdfa;
    }}
    .meta-value {{
      color: #111827;
      font-weight: 500;
    }}
    .meta-value.green {{
      color: #047857;
      font-style: italic;
    }}

    /* Controls: Search & Tabs */
    .controls-bar {{
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }}
    .search-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }}
    .search-box {{
      position: relative;
      flex: 1;
      max-width: 450px;
    }}
    .search-box input {{
      width: 100%;
      padding: 9px 12px 9px 36px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.15s;
    }}
    .search-box input:focus {{
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }}
    .search-box svg {{
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      width: 16px;
      height: 16px;
    }}
    .toggle-code-btn {{
      font-size: 13px;
      font-weight: 600;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
    }}
    .toggle-code-btn:hover {{ background: #e0e7ff; }}

    /* Category Pill Filter */
    .filter-pills {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }}
    .pill {{
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .pill:hover {{
      background: #e2e8f0;
      color: #0f172a;
    }}
    .pill.active {{
      background: var(--navy);
      color: white;
      border-color: var(--navy);
    }}

    /* Main Table Matching Screenshot */
    .table-responsive {{
      overflow-x: auto;
    }}
    .report-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: white;
    }}
    .report-table th {{
      background-color: var(--navy) !important;
      color: #ffffff !important;
      font-weight: 700;
      text-align: center;
      padding: 10px 12px;
      border: 1px solid #001740;
      font-size: 13.5px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }}
    .report-table td {{
      padding: 8px 12px;
      border: 1px solid #000000;
      vertical-align: middle;
      color: #000000;
    }}
    .report-table tr:hover td {{
      background-color: var(--bg-hover) !important;
    }}
    .col-no {{
      width: 50px;
      text-align: center;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }}
    .col-func {{
      width: 220px;
      font-weight: 600;
    }}
    .col-sheet {{
      width: 180px;
      color: var(--sheet-link);
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }}
    .col-desc {{
      min-width: 320px;
      line-height: 1.45;
    }}
    .col-pre {{
      width: 300px;
      color: #1f2937;
      line-height: 1.45;
    }}
    .col-code {{
      width: 260px;
      background: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: #0f172a;
    }}
    .code-badge {{
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
      margin-bottom: 2px;
    }}

    /* Toast notification */
    #toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #047857;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s ease;
      pointer-events: none;
      z-index: 1000;
    }}
    #toast.show {{
      opacity: 1;
      transform: translateY(0);
    }}
  </style>
</head>
<body>

<div class="container">
  <!-- Top Toolbar -->
  <div class="top-toolbar">
    <div class="top-title">
      <h1>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        StockSpace - Test Case List (Function Master)
      </h1>
      <p>Bảng thống kê toàn bộ 85 Function chức năng hệ thống đối chiếu trực tiếp từ Source Code BE & FE</p>
    </div>
    <div class="btn-group">
      <button class="btn btn-outline" id="btnToggleCode">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        <span>Ẩn / Hiện Cột Code BE & FE</span>
      </button>
      <button class="btn btn-primary" id="btnCopyTsv">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Copy TSV (Dán vào Excel)</span>
      </button>
    </div>
  </div>

  <!-- Excel Form Metadata (Exactly like Report 5) -->
  <div class="excel-metadata">
    <div class="report-heading">TEST CASE LIST</div>
    <table class="meta-table">
      <tr>
        <td class="meta-label">Project Name</td>
        <td class="meta-value">StockSpace - Website allows posting, searching for warehouse space and managing it after rental(Không gian lưu trữ - Website cho phép đăng tải, tìm kiếm kho bãi và quản lí sau khi thuê)</td>
      </tr>
      <tr>
        <td class="meta-label">Project Code</td>
        <td class="meta-value">SU26SE015_GSU12</td>
      </tr>
      <tr>
        <td class="meta-label">Test Environment Setup Description</td>
        <td class="meta-value green" style="white-space: pre-line;">
1. Server: Spring Boot 3.x (Java 21), Spring Security, Hibernate/JPA, Redis Cache, Vite / React 18, NodeJS 20+
2. Database: PostgreSQL 16 (Relational DB & PostGIS Spatial Data)
3. Web Browser: Google Chrome (v120+), Microsoft Edge (v120+)
4. External Gateways: VNPay Payment Gateway Sandbox, Cloudinary Image CDN, SMTP Gmail Service, OpenStreetMap API
        </td>
      </tr>
    </table>
  </div>

  <!-- Search and Category Filters -->
  <div class="controls-bar">
    <div class="search-row">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="searchInput" placeholder="Tìm kiếm theo Tên Function, Nhóm Sheet, Mô tả...">
      </div>
      <div style="font-size: 13px; color: #64748b; font-weight: 600;">
        Hiển thị: <span id="countVisible" style="color: #002060; font-weight: 800;">85</span> / 85 Functions
      </div>
    </div>
    <div class="filter-pills" id="filterPills">
      <div class="pill active" data-sheet="ALL">Tất cả Nhóm (All Modules)</div>
    </div>
  </div>

  <!-- Main Table with Navy Blue Header -->
  <div class="table-responsive">
    <table class="report-table" id="reportTable">
      <thead>
        <tr>
          <th class="col-no">No</th>
          <th class="col-func">Function Name</th>
          <th class="col-sheet">Sheet Name</th>
          <th class="col-desc">Description</th>
          <th class="col-pre">Pre-Condition</th>
          <th class="col-code code-col">Code BE & FE Reference</th>
        </tr>
      </thead>
      <tbody id="tableBody">
        <!-- Rendered by JS -->
      </tbody>
    </table>
  </div>
</div>

<div id="toast">Đã copy dữ liệu bảng TSV vào Clipboard! Hãy nhấn Ctrl + V vào Excel.</div>

<script>
  const functionsData = {functions_json};
  const sheetsList = {sheets_json};
  let currentSheetFilter = "ALL";
  let showCode = true;

  // Render pills
  const pillsContainer = document.getElementById("filterPills");
  sheetsList.forEach(sheet => {{
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.dataset.sheet = sheet;
    pill.textContent = sheet;
    pill.addEventListener("click", () => {{
      document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentSheetFilter = sheet;
      renderTable();
    }});
    pillsContainer.appendChild(pill);
  }});

  document.querySelector('.pill[data-sheet="ALL"]').addEventListener("click", function() {{
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    this.classList.add("active");
    currentSheetFilter = "ALL";
    renderTable();
  }});

  // Toggle code column
  document.getElementById("btnToggleCode").addEventListener("click", () => {{
    showCode = !showCode;
    document.querySelectorAll(".code-col").forEach(el => {{
      el.style.display = showCode ? "" : "none";
    }});
  }});

  // Search input
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", renderTable);

  function renderTable() {{
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    const term = searchInput.value.toLowerCase().trim();

    let visibleCount = 0;

    functionsData.forEach(item => {{
      const matchSheet = (currentSheetFilter === "ALL" || item.sheet === currentSheetFilter);
      const matchSearch = !term || (
        item.name.toLowerCase().includes(term) ||
        item.sheet.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        item.pre.toLowerCase().includes(term) ||
        (item.be && item.be.toLowerCase().includes(term)) ||
        (item.fe && item.fe.toLowerCase().includes(term))
      );

      if (matchSheet && matchSearch) {{
        visibleCount++;
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td class="col-no">${{item.no}}</td>
          <td class="col-func">${{item.name}}</td>
          <td class="col-sheet" onclick="filterBySheet('${{item.sheet}}')">${{item.sheet}}</td>
          <td class="col-desc">${{item.desc}}</td>
          <td class="col-pre">${{item.pre}}</td>
          <td class="col-code code-col" style="${{showCode ? '' : 'display:none;'}}">
            <span class="code-badge">BE</span> ${{item.be}}<br>
            <span class="code-badge" style="background:#dbeafe; color:#1e40af;">FE</span> ${{item.fe}}
          </td>
        `;
        tbody.appendChild(tr);
      }}
    }});

    // Add empty rows at bottom matching user screenshot
    for (let i = 0; i < 6; i++) {{
      const trEmpty = document.createElement("tr");
      trEmpty.innerHTML = `
        <td class="col-no" style="color:#9ca3af; border-style:dashed;">...</td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td class="code-col" style="border-style:dashed; ${{showCode ? '' : 'display:none;'}}"></td>
      `;
      tbody.appendChild(trEmpty);
    }}

    document.getElementById("countVisible").textContent = visibleCount;
  }}

  function filterBySheet(sheetName) {{
    currentSheetFilter = sheetName;
    document.querySelectorAll(".pill").forEach(p => {{
      if (p.dataset.sheet === sheetName) p.classList.add("active");
      else p.classList.remove("active");
    }});
    renderTable();
  }}

  // Copy TSV to clipboard
  document.getElementById("btnCopyTsv").addEventListener("click", () => {{
    const header = "No\\tFunction Name\\tSheet Name\\tDescription\\tPre-Condition";
    const lines = [header];

    functionsData.forEach(item => {{
      if (currentSheetFilter === "ALL" || item.sheet === currentSheetFilter) {{
        lines.push(`${{item.no}}\\t${{item.name}}\\t${{item.sheet}}\\t${{item.desc}}\\t${{item.pre}}`);
      }}
    }});

    const tsvText = lines.join("\\n");
    navigator.clipboard.writeText(tsvText).then(() => {{
      const toast = document.getElementById("toast");
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }}).catch(err => {{
      alert("Không thể tự động copy: " + err);
    }});
  }});

  // Initial render
  renderTable();
</script>

</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Generated HTML at:", html_path)
