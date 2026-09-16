import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

data = [
    (1, "Login", "Authentication", "Verify user authentication with valid/invalid email and password, check input validation, inactive account restrictions, and JWT token issuance.", "User has a registered account in the system"),
    (2, "Register", "Authentication", "Verify new account registration for Owner/Tenant roles, duplicate email check, password complexity validation, and account profile initialization.", "User does not have an account in the system with the target email"),
    (3, "Forget Password", "Authentication", "Verify forgot password request, reset password email delivery via SMTP with secure token link, and password reset form submission.", "User has a registered account with a verified email"),
    (4, "Create Warehouse", "Warehouse Management", "Verify warehouse listing creation by Owner with complete details (specifications, dimensions, storage type, rental rates, policies, and photos).", "User logged in with Owner role"),
    (5, "Verify/Reject Warehouse (Admin)", "Warehouse Management", "Verify Admin review workflow for newly submitted warehouses (inspecting documents, quality rating score, approving or rejecting with feedback).", "User logged in as Admin, target warehouse status is PENDING_APPROVAL / INSPECTED"),
    (6, "Save Layout Bulk", "Warehouse Management", "Verify 2D/3D warehouse layout designer allowing Owner to configure storage zones, rack rows, shelves, and storage bin coordinates.", "User is Owner of the warehouse, warehouse exists in system"),
    (7, "Search Warehouses", "Warehouse Management", "Verify public marketplace warehouse search and discovery with multi-criteria filters (location/province, price range, area, storage amenities, keywords).", "System contains active, verified warehouses published on the marketplace"),
    (8, "Create Booking", "Booking Management", "Verify Tenant selecting warehouse space, specifying lease duration, calculating deposit amount, and submitting rental proposal with wallet deduction.", "User is Tenant, warehouse is Available, Tenant wallet balance >= Deposit amount"),
    (9, "Approve Booking", "Booking Management", "Verify Owner reviewing pending booking proposal, attaching paper contract agreement, and approving to transition into a formal rental contract.", "User is Owner, target booking proposal status is PENDING"),
    (10, "Reject Booking", "Booking Management", "Verify Owner rejecting rental proposal with a mandatory reason, automatically unlocking warehouse space and refunding deposit to Tenant wallet.", "User is Owner, target booking proposal status is PENDING"),
    (11, "Purchase Subscription", "Subscription", "Verify Tenant purchasing or renewing WMS service tier (Standard/Pro/Enterprise), validating wallet balance deduction, staff quota, and upgrade rules.", "User is Tenant, Tenant wallet balance >= Subscription package price"),
    (12, "Deposit via VNPay", "Wallet & Payment", "Verify wallet balance top-up workflow: generating secure VNPay payment redirect URL, simulating payment transaction, and processing IPN callback.", "User has an active account in the system (Owner or Tenant)"),
    (13, "Request Withdraw", "Wallet & Payment", "Verify withdrawal request submission: validating bank account information, account holder name, freezing wallet balance, and creating pending payout ticket.", "User has sufficient available wallet balance (Balance >= Withdraw amount)"),
    (14, "Approve Withdraw", "Wallet & Payment", "Verify Admin inspecting and approving user withdrawal request, logging bank transfer reference, or rejecting with balance refund.", "User logged in as Admin, target withdrawal request is in PENDING status"),
    (15, "Create Product SKU", "Inventory Management", "Verify Tenant defining product catalog: creating product categories, unit of measure (UOM), and SKU master data with physical weight and volume attributes.", "User is Tenant, Tenant has an active WMS subscription"),
    (16, "Create Inbound Receipt", "Inventory Management", "Verify Tenant/Staff creating inbound stock receipt (specifying supplier, arrival date, product SKUs, batch quantities, and assigned storage bin coordinates).", "User is Tenant or assigned Staff, Tenant has an active warehouse lease contract"),
    (17, "Approve Inbound Receipt", "Inventory Management", "Verify approving inbound receipt: validating storage bin weight and volume physical capacity, increasing stock batch quantities, and recording transaction ledger.", "Receipt status is PENDING, assigned bins have sufficient remaining capacity"),
    (18, "Create Outbound Receipt", "Inventory Management", "Verify Tenant/Staff creating outbound dispatch receipt (specifying recipient, delivery date, item quantities, and FIFO batch allocation).", "User is Tenant or assigned Staff, sufficient available stock exists in the warehouse"),
    (19, "Approve Outbound Receipt", "Inventory Management", "Verify approving outbound receipt: picking inventory, deducting stock batch quantities, updating inventory ledger, and releasing reserved quantity.", "Receipt status is PENDING, stock batch available quantity >= requested dispatch quantity"),
    (20, "Create Inventory Audit", "Inventory Management", "Verify Tenant scheduling periodic warehouse stocktake: setting audit scope, assigning counter staff, snapshotting book inventory, and locking warehouse movement.", "User is Tenant, Tenant has an active warehouse lease contract, no conflicting active audit"),
    (21, "Approve Inventory Audit", "Inventory Management", "Verify manager reviewing physical count vs system snapshot, calculating discrepancies, generating adjustment receipts, updating stock, and releasing lock.", "Audit status is SUBMITTED, physical counts completed, approver is not the assigned counter"),
    (22, "Invite Tenant Staff", "Staff Management", "Verify Tenant inviting staff via email: checking organization staff quota limit, validating unique email, generating secure 48h token, and sending invitation email.", "User is Tenant, active staff count + pending invites < package maxStaff quota"),
    (23, "Assign Staff Warehouse", "Staff Management", "Verify Tenant assigning an active staff member to a specific leased warehouse, configuring WMS operational roles and custom job titles.", "Staff member is active in Tenant org, Tenant has an active lease contract for target warehouse")
]

docs_dir = r"D:\Ky9\Capstone\StockSpace\docs"
tsv_path = os.path.join(docs_dir, "system_test_case_list.tsv")
md_path = os.path.join(docs_dir, "system_test_case_list.md")

# Write TSV
with open(tsv_path, "w", encoding="utf-8") as f:
    f.write("No\tFunction Name\tSheet Name\tDescription\tPre-Condition\n")
    for row in data:
        f.write(f"{row[0]}\t{row[1]}\t{row[2]}\t{row[3]}\t{row[4]}\n")
print("Saved TSV to:", tsv_path)

# Write Markdown
with open(md_path, "w", encoding="utf-8") as f:
    f.write("# SYSTEM TEST CASE LIST (CHUẨN HÓA DỰ ÁN STOCKSPACE)\n\n")
    f.write("> **Project Name**: StockSpace - Website allows posting, searching for warehouse space and managing it after rental(Không gian lưu trữ - Website cho phép đăng tải, tìm kiếm kho bãi và quản lí sau khi thuê)  \n")
    f.write("> **Project Code**: SU26SE015_GSU12  \n")
    f.write("> **Document Scope**: Bảng thống kê danh sách 23 Function kiểm thử hệ thống (Sheet `Test Cases` trong `SU26SE015_GSU12_HCM_Report5_System_Test.xlsx`)  \n")
    f.write("> **Test Environment Setup Description**:\n")
    f.write("> 1. **Server**: Spring Boot 3.x (Java 21), Spring Security, Hibernate/JPA, Redis, Vite / React 18, NodeJS\n")
    f.write("> 2. **Database**: PostgreSQL 16\n")
    f.write("> 3. **Web Browser**: Google Chrome (v120+), Microsoft Edge\n")
    f.write("> 4. **External Gateways**: VNPay Payment Gateway, Cloudinary Image CDN, SMTP Gmail Service\n\n")
    f.write("---\n\n")
    f.write("### Bảng thống kê 23 Chức năng Hệ thống (Đối chiếu FE & BE)\n\n")
    f.write("| No | Function Name | Sheet Name | Description | Pre-Condition |\n")
    f.write("| :---: | :--- | :--- | :--- | :--- |\n")
    for row in data:
        f.write(f"| **{row[0]}** | `{row[1]}` | **{row[2]}** | {row[3]} | {row[4]} |\n")

print("Saved Markdown to:", md_path)
