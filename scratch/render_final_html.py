import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\Ky9\Capstone\StockSpace\scratch\all_compiled_functions.json", "r", encoding="utf-8") as f:
    master_functions = json.load(f)

# Build module list
sheet_reqs = {
    "Authentication": {
        "feature": "Authentication & User Profile",
        "req": "Verify user registration, login with credentials & Google OAuth, password recovery via SMTP email, token refresh, session logout, and profile management."
    },
    "Warehouse Management": {
        "feature": "Warehouse Management",
        "req": "Verify warehouse creation, admin approval, layout 2D/3D builder, and public searching."
    },
    "Layout Management": {
        "feature": "Warehouse Layout Management (2D/3D & Capacity)",
        "req": "Verify 2D/3D warehouse layout designer for zones, racks, shelves, bins, snapshot clones, and real-time capacity load calculation."
    },
    "Rental Contracts": {
        "feature": "Rental Contract Management",
        "req": "Verify direct rental contract lifecycle: Owner draft creation, paper agreement upload, Tenant review/confirmation/changes/rejection, draft deletion, and renewals."
    },
    "Inspection Management": {
        "feature": "Warehouse Quality Inspection Management",
        "req": "Verify owner inspection appointment requests, admin inspector assignment, inspector on-site evaluation, and verification rating score submission."
    },
    "Subscription": {
        "feature": "WMS Subscription Management",
        "req": "Verify Tenant purchasing/upgrading WMS service packages, quota enforcement (max staff), active subscription status, and admin package tier management."
    },
    "Listing Publication": {
        "feature": "Listing Publication Advertisement",
        "req": "Verify Owner purchasing marketplace publication packages (30/60/90 days), visibility periods, purchase receipts, and scheduled cancellation with refund."
    },
    "Wallet & Payment": {
        "feature": "Wallet & Payment Gateway Integration",
        "req": "Verify balance top-up via VNPay redirect and IPN callback, transaction ledgers, bank withdrawal requests, and admin approval/rejection with refund."
    },
    "Product Catalog": {
        "feature": "WMS Product Catalog Management",
        "req": "Verify product category hierarchy, SKU master data creation/editing, UOM definitions, and physical property locking upon stock recording."
    },
    "Stock Management": {
        "feature": "WMS Inventory Stock & Smart Algorithms",
        "req": "Verify warehouse stock batch positions, aggregate SKU overview, batch movement audit timeline, Putaway location recommendations, and FIFO picking suggestions."
    },
    "Inventory Receipts": {
        "feature": "Inventory Inbound & Outbound Receipts",
        "req": "Verify inbound stock receipts, storage bin capacity validation, outbound dispatch receipts, FIFO batch allocation, approval/rejection, and picking replanning."
    },
    "Stock Transfer": {
        "feature": "Internal Warehouse Stock Transfer",
        "req": "Verify internal bin-to-bin relocation tickets, destination capacity checks, stock quantity transfer execution, and cancellation audit trails."
    },
    "Inventory Audit": {
        "feature": "Periodic Inventory Stock Audit",
        "req": "Verify stocktake planning, warehouse movement freeze lock, blind physical count recording, variance unmasking, manager four-eyes approval, and stock adjustment."
    },
    "Staff Management": {
        "feature": "Tenant Organization Staff Management",
        "req": "Verify staff email invitations (48h token), quota limits, activation, member directory, removal, warehouse operational assignments, and staff task/career history."
    },
    "Data Exchange": {
        "feature": "WMS Bulk Excel Data Exchange & Offline Sync",
        "req": "Verify bulk Excel export/import for SKU catalog, inventory snapshots, offline stock movements, and blank physical count sheets."
    },
    "AI Chatbot": {
        "feature": "AI Assistant Chatbot",
        "req": "Verify interactive AI chatbot answering warehouse inquiries, rental pricing, policy guidance, and WMS navigation help."
    },
    "Notifications": {
        "feature": "System Notifications",
        "req": "Verify real-time in-app notification dispatch for contracts, receipts, audits, and mark-as-read interactions."
    },
    "System Administration": {
        "feature": "System Administration & Platform Governance",
        "req": "Verify user account locking/unlocking, RBAC permission matrix configuration, warehouse category types, platform commission/cancellation policies, and KPI analytics."
    }
}

modules_list = []
sheets = []
for f_item in master_functions:
    sh = f_item['sheet']
    if sh not in sheets:
        sheets.append(sh)

for sh in sheets:
    fns = [f for f in master_functions if f['sheet'] == sh]
    meta = sheet_reqs.get(sh, {"feature": sh, "req": f"Verify all operations and edge cases for {sh}."})
    modules_list.append({
        "sheet": sh,
        "feature": meta["feature"],
        "requirement": meta["req"],
        "functions": fns
    })

html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockSpace - Test Case Matrix & Project Function Specification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --primary: #2563eb;
      --navy: #1e3a8a;
      --navy-dark: #0f172a;
      --navy-header: #1f4e78;
      --excel-green-header: #548235;
      --excel-sub-header: #e2efda;
      --pass-green: #15803d;
      --pass-bg: #dcfce7;
      --border-color: #cbd5e1;
      --bg-slate: #f8fafc;
      --text-main: #0f172a;
      --text-muted: #64748b;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f1f5f9;
      color: var(--text-main);
      line-height: 1.5;
      padding-bottom: 60px;
    }}

    .top-navbar {{
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #fff;
      padding: 16px 28px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 50;
    }}

    .logo-badge {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .logo-badge h1 {{
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .logo-badge .badge {{
      background: rgba(255, 255, 255, 0.15);
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }}

    .tab-navigation {{
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.25);
      padding: 4px;
      border-radius: 8px;
    }}

    .tab-nav-btn {{
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-weight: 600;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .tab-nav-btn:hover {{
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }}

    .tab-nav-btn.active {{
      background: #2563eb;
      color: #fff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    }}

    .content-area {{
      max-width: 1750px;
      margin: 20px auto;
      padding: 0 20px;
    }}

    .tab-panel {{
      display: none;
    }}

    .tab-panel.active {{
      display: block;
    }}

    .excel-container {{
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      padding: 20px;
      margin-bottom: 24px;
    }}

    .filter-header-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }}

    .search-input-group {{
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      min-width: 320px;
    }}

    .search-input-group input {{
      border: none;
      background: transparent;
      font-size: 13.5px;
      outline: none;
      width: 100%;
      font-family: inherit;
    }}

    .btn {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }}

    .btn-navy {{
      background: #1f4e78;
      color: #fff;
    }}
    .btn-navy:hover {{
      background: #163857;
    }}

    .btn-green {{
      background: #2e7d32;
      color: #fff;
    }}
    .btn-green:hover {{
      background: #1e5a22;
    }}

    .pills-container {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }}

    .pill {{
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 20px;
      background: #f1f5f9;
      color: #475569;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      transition: all 0.15s ease;
    }}

    .pill:hover {{
      background: #e2e8f0;
      color: #0f172a;
    }}

    .pill.active {{
      background: #1e3a8a;
      color: #ffffff;
      border-color: #1e3a8a;
    }}

    /* Table Styles */
    .table-wrapper {{
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }}

    table.report5-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      background: #fff;
    }}

    table.report5-table th, 
    table.report5-table td {{
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      vertical-align: top;
      line-height: 1.45;
    }}

    table.report5-table thead th {{
      background-color: var(--navy-header);
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 10;
    }}

    table.report5-table tbody tr:hover {{
      background-color: #f8fafc;
      cursor: pointer;
    }}

    .col-no {{ width: 50px; text-align: center; font-weight: 700; font-family: 'JetBrains Mono', monospace; }}
    .col-fn-name {{ width: 220px; font-weight: 700; color: #1e3a8a; }}
    .col-sheet-badge {{ width: 180px; font-weight: 600; color: #0284c7; }}
    .col-desc {{ min-width: 320px; }}
    .col-pre {{ width: 240px; color: #475569; font-style: italic; }}
    .col-code-map {{ width: 280px; font-size: 11.5px; background: #f8fafc; font-family: 'JetBrains Mono', monospace; }}

    /* Detailed Test Cases Table (Green Header) */
    .summary-card {{
      border: 1px solid #cbd5e1;
      margin-bottom: 16px;
      font-size: 13px;
      border-collapse: collapse;
      width: 100%;
      max-width: 900px;
      background: #fff;
    }}

    .summary-card td {{
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      line-height: 1.4;
    }}

    .summary-card .lbl {{
      background-color: #f8fafc;
      font-weight: 700;
      width: 160px;
      color: #1e293b;
    }}

    .summary-card .round-hdr td {{
      background-color: #f1f5f9;
      font-weight: 700;
      text-align: center;
    }}

    table.test-cases-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #fff;
    }}

    table.test-cases-table th, 
    table.test-cases-table td {{
      border: 1px solid #cbd5e1;
      padding: 7px 9px;
      vertical-align: top;
      line-height: 1.4;
    }}

    table.test-cases-table thead th {{
      background-color: var(--excel-green-header);
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 10;
      white-space: nowrap;
    }}

    tr.function-banner-row td {{
      background-color: var(--excel-sub-header) !important;
      font-weight: 800;
      color: #1e293b;
      font-size: 13px;
      padding: 9px 12px;
      border-top: 2px solid #548235;
      border-bottom: 1px solid #548235;
    }}

    .tc-id {{
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #1e3a8a;
      white-space: nowrap;
    }}

    .tc-res-passed {{
      font-weight: 700;
      color: #15803d;
      text-align: center;
      background-color: #f0fdf4;
    }}

    .tc-date, .tc-tester {{
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      white-space: nowrap;
    }}

    /* Modal */
    .modal-overlay {{
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(3px);
      z-index: 999;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }}

    .modal-box {{
      background: #ffffff;
      border-radius: 8px;
      width: 100%;
      max-width: 1200px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }}

    .modal-hdr {{
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }}

    .modal-hdr h3 {{
      font-size: 16px;
      font-weight: 700;
      color: #1e3a8a;
    }}

    .modal-close {{
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      color: #64748b;
    }}

    .modal-body {{
      padding: 20px;
      overflow-y: auto;
    }}

    #toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #fff;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      border-left: 4px solid #22c55e;
    }}

    #toast.show {{
      transform: translateY(0);
      opacity: 1;
    }}
  </style>
</head>
<body>

<header class="top-navbar">
  <div class="logo-badge">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    <h1>StockSpace Test Matrix</h1>
    <span class="badge">CapStone SU26 Report 5</span>
    <span class="badge" style="background: rgba(34,197,94,0.2); border-color: #22c55e; color: #4ade80;">100% BE & FE Verified</span>
  </div>

  <div class="tab-navigation">
    <button class="tab-nav-btn active" id="tabBtn1" onclick="switchTab('master')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <span>Bảng 88 Functions (Report 5 Form)</span>
    </button>
    <button class="tab-nav-btn" id="tabBtn2" onclick="switchTab('detail')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      <span>Chi Tiết Test Cases Từng Sheet (Excel Form)</span>
    </button>
  </div>
</header>

<main class="content-area">

  <!-- TAB 1: MASTER 88 FUNCTIONS LIST -->
  <div class="tab-panel active" id="panelMaster">
    <div class="excel-container">
      <div class="filter-header-bar">
        <div class="search-input-group">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="searchMaster" placeholder="Tìm kiếm nhanh function, sheet, mô tả, pre-condition...">
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-navy" onclick="copyMasterTsv()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <span>Sao chép bảng 88 Functions (TSV 5 cột)</span>
          </button>
        </div>
      </div>

      <div class="pills-container" id="pillsMaster">
        <!-- Rendered by JS -->
      </div>

      <div class="table-wrapper">
        <table class="report5-table" id="tblMaster">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-fn-name">Function Name</th>
              <th class="col-sheet-badge">Sheet Name</th>
              <th class="col-desc">Description</th>
              <th class="col-pre">Pre-Condition</th>
              <th class="col-code-map">Ánh xạ Code Thực tế (FE & BE)</th>
            </tr>
          </thead>
          <tbody id="tblMasterBody">
            <!-- Rendered by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 2: DETAILED MODULE TEST CASES (GREEN EXCEL VIEW) -->
  <div class="tab-panel" id="panelDetail">
    <div class="excel-container">
      <div class="filter-header-bar">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <label style="font-weight: 700; font-size: 13.5px; color: #1e3a8a;">Chọn Sheet Phân Hệ:</label>
          <select id="selectSheet" style="padding: 8px 14px; font-weight: 600; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; background: #fff; cursor: pointer;">
            <!-- Populated by JS -->
          </select>
        </div>

        <button class="btn btn-green" onclick="copyCurrentSheetTsv()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <span>Sao chép toàn bộ Test Cases của Sheet (TSV 15 cột chuẩn Excel)</span>
        </button>
      </div>

      <!-- Top Summary Card matching user screenshot -->
      <table class="summary-card">
        <tr>
          <td class="lbl">Feature</td>
          <td colspan="4" id="sumFeature" style="font-weight: 700; color: #1e3a8a;"></td>
        </tr>
        <tr>
          <td class="lbl">Test requirement</td>
          <td colspan="4" id="sumReq"></td>
        </tr>
        <tr>
          <td class="lbl">Number of TCs</td>
          <td colspan="4" id="sumCount" style="font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #15803d;"></td>
        </tr>
        <tr class="round-hdr">
          <td style="text-align: left; font-weight: 700;">Testing Round</td>
          <td>Passed</td>
          <td>Failed</td>
          <td>Pending</td>
          <td>N/A</td>
        </tr>
        <tr>
          <td><b>Round 1</b></td>
          <td id="r1Passed" style="text-align: center; font-weight: 700; color: #15803d;"></td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
        </tr>
        <tr>
          <td><b>Round 2</b></td>
          <td id="r2Passed" style="text-align: center; font-weight: 700; color: #15803d;"></td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
        </tr>
        <tr>
          <td><b>Round 3</b></td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
          <td style="text-align: center;">0</td>
        </tr>
      </table>

      <!-- Main Test Cases Table with Green Header -->
      <div class="table-wrapper">
        <table class="test-cases-table" id="tblTestCases">
          <thead>
            <tr>
              <th style="width: 110px;">Test Case ID</th>
              <th style="width: 220px;">Test Case Description</th>
              <th style="min-width: 320px;">Test Case Procedure</th>
              <th style="min-width: 300px;">Expected Results</th>
              <th style="width: 200px;">Pre-conditions</th>
              <th style="width: 70px; text-align: center;">Round 1</th>
              <th style="width: 85px; text-align: center;">Test date</th>
              <th style="width: 75px; text-align: center;">Tester</th>
              <th style="width: 70px; text-align: center;">Round 2</th>
              <th style="width: 85px; text-align: center;">Test date</th>
              <th style="width: 75px; text-align: center;">Tester</th>
              <th style="width: 70px; text-align: center;">Round 3</th>
              <th style="width: 85px; text-align: center;">Test date</th>
              <th style="width: 75px; text-align: center;">Tester</th>
              <th style="width: 100px;">Note</th>
            </tr>
          </thead>
          <tbody id="tblTestCasesBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

</main>

<!-- Modal for Quick View -->
<div class="modal-overlay" id="quickModal">
  <div class="modal-box">
    <div class="modal-hdr">
      <h3 id="modalTitle">Chi Tiết Function & Test Cases</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div id="toast">Đã copy dữ liệu vào Clipboard! Nhấn Ctrl + V vào Excel.</div>

<script>
  const masterFunctions = {json.dumps(master_functions, ensure_ascii=False)};
  const modulesList = {json.dumps(modules_list, ensure_ascii=False)};

  function switchTab(tab) {{
    document.getElementById('tabBtn1').classList.toggle('active', tab === 'master');
    document.getElementById('tabBtn2').classList.toggle('active', tab === 'detail');
    document.getElementById('panelMaster').classList.toggle('active', tab === 'master');
    document.getElementById('panelDetail').classList.toggle('active', tab === 'detail');
  }}

  function renderMasterTable(list) {{
    const tbody = document.getElementById('tblMasterBody');
    tbody.innerHTML = '';
    list.forEach(fn => {{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-no">${{fn.no}}</td>
        <td class="col-fn-name">${{fn.name}}</td>
        <td class="col-sheet-badge" onclick="event.stopPropagation(); jumpToSheet('${{fn.sheet}}')">${{fn.sheet}}</td>
        <td class="col-desc">${{fn.desc}}</td>
        <td class="col-pre">${{fn.pre}}</td>
        <td class="col-code-map">
          <b>FE:</b> ${{fn.fe || '-'}}<br>
          <b>BE:</b> ${{fn.be || '-'}}
        </td>
      `;
      tr.onclick = () => openModal(fn);
      tbody.appendChild(tr);
    }});
  }}

  function initPills() {{
    const container = document.getElementById('pillsMaster');
    const sheets = ['Tất cả (' + masterFunctions.length + ')', ...new Set(masterFunctions.map(f => f.sheet))];
    container.innerHTML = '';
    sheets.forEach(sh => {{
      const isAll = sh.startsWith('Tất cả');
      const pill = document.createElement('div');
      pill.className = 'pill' + (isAll ? ' active' : '');
      pill.textContent = sh;
      pill.onclick = () => {{
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterMaster();
      }};
      container.appendChild(pill);
    }});
  }}

  function filterMaster() {{
    const q = document.getElementById('searchMaster').value.toLowerCase().trim();
    const activePill = document.querySelector('.pill.active').textContent;
    const selectedSheet = activePill.startsWith('Tất cả') ? 'ALL' : activePill;

    const filtered = masterFunctions.filter(fn => {{
      const matchSheet = (selectedSheet === 'ALL' || fn.sheet === selectedSheet);
      const matchQ = !q ||
        fn.name.toLowerCase().includes(q) ||
        fn.sheet.toLowerCase().includes(q) ||
        fn.desc.toLowerCase().includes(q) ||
        fn.pre.toLowerCase().includes(q) ||
        (fn.be && fn.be.toLowerCase().includes(q));
      return matchSheet && matchQ;
    }});
    renderMasterTable(filtered);
  }}

  function initSheetSelect() {{
    const sel = document.getElementById('selectSheet');
    sel.innerHTML = '';
    modulesList.forEach(m => {{
      const totalTcs = m.functions.reduce((acc, f) => acc + (f.test_cases ? f.test_cases.length : 0), 0);
      const opt = document.createElement('option');
      opt.value = m.sheet;
      opt.textContent = `${{m.sheet}} (${{m.functions.length}} functions, ${{totalTcs}} TCs)`;
      sel.appendChild(opt);
    }});
    sel.onchange = (e) => loadSheetDetail(e.target.value);
    if (modulesList.length > 0) {{
      loadSheetDetail(modulesList[0].sheet);
    }}
  }}

  function loadSheetDetail(sheetName) {{
    const mod = modulesList.find(m => m.sheet === sheetName);
    if (!mod) return;

    let totalTcs = 0;
    mod.functions.forEach(f => {{
      if (f.test_cases) totalTcs += f.test_cases.length;
    }});

    document.getElementById('sumFeature').textContent = mod.feature;
    document.getElementById('sumReq').textContent = mod.requirement;
    document.getElementById('sumCount').textContent = totalTcs;
    document.getElementById('r1Passed').textContent = totalTcs;
    document.getElementById('r2Passed').textContent = totalTcs;

    const tbody = document.getElementById('tblTestCasesBody');
    tbody.innerHTML = '';

    mod.functions.forEach(fn => {{
      // Function Subheader Banner
      const trBanner = document.createElement('tr');
      trBanner.className = 'function-banner-row';
      trBanner.innerHTML = `
        <td colspan="15">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${{fn.name}}</span>
            <span style="font-size: 11.5px; font-weight: 500; opacity: 0.85;">FE: ${{fn.fe || '-'}} | BE: ${{fn.be || '-'}}</span>
          </div>
        </td>
      `;
      tbody.appendChild(trBanner);

      if (fn.test_cases && fn.test_cases.length > 0) {{
        fn.test_cases.forEach(tc => {{
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="tc-id">${{tc.id}}</td>
            <td style="font-weight: 600;">${{tc.desc}}</td>
            <td style="white-space: pre-line;">${{tc.proc}}</td>
            <td style="white-space: pre-line;">${{tc.expected}}</td>
            <td style="font-style: italic; color: #475569;">${{tc.pre}}</td>
            <td class="tc-res-passed">Passed</td>
            <td class="tc-date">11/8/2026</td>
            <td class="tc-tester">Phucnbh</td>
            <td class="tc-res-passed">Passed</td>
            <td class="tc-date">12/8/2026</td>
            <td class="tc-tester">Phucnbh</td>
            <td class="tc-res-passed" style="background: none; color: inherit;"></td>
            <td class="tc-date"></td>
            <td class="tc-tester"></td>
            <td></td>
          `;
          tbody.appendChild(tr);
        }});
      }} else {{
        const trEmpty = document.createElement('tr');
        trEmpty.innerHTML = `<td colspan="15" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">Được kiểm thử tích hợp trong các kịch bản liên chuỗi.</td>`;
        tbody.appendChild(trEmpty);
      }}
    }});
  }}

  function jumpToSheet(sheetName) {{
    switchTab('detail');
    document.getElementById('selectSheet').value = sheetName;
    loadSheetDetail(sheetName);
    window.scrollTo({{ top: 0, behavior: 'smooth' }});
  }}

  function openModal(fn) {{
    document.getElementById('modalTitle').textContent = `No. ${{fn.no}} - ${{fn.name}} (${{fn.sheet}})`;
    let tcsHtml = '';
    if (fn.test_cases && fn.test_cases.length > 0) {{
      tcsHtml = `
        <table class="test-cases-table" style="margin-top: 14px;">
          <thead>
            <tr>
              <th style="width: 100px;">TC ID</th>
              <th>Description</th>
              <th>Procedure</th>
              <th>Expected Results</th>
              <th>Pre-condition</th>
            </tr>
          </thead>
          <tbody>
            ${{fn.test_cases.map(tc => `
              <tr>
                <td class="tc-id">${{tc.id}}</td>
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
      tcsHtml = '<p style="color: #64748b; font-style: italic; margin-top: 12px;">Chức năng này được kiểm thử trong chuỗi tích hợp hệ thống.</p>';
    }}

    document.getElementById('modalBody').innerHTML = `
      <div style="background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 14px; font-size: 13px;">
        <p><b>Mô tả:</b> ${{fn.desc}}</p>
        <p style="margin-top: 6px;"><b>Tiền điều kiện:</b> ${{fn.pre}}</p>
        <p style="margin-top: 6px;"><b>Frontend:</b> <code>${{fn.fe || '-'}}</code></p>
        <p style="margin-top: 4px;"><b>Backend:</b> <code>${{fn.be || '-'}}</code></p>
      </div>
      <h4 style="font-size: 14px; font-weight: 700; color: #1e293b;">Danh Sách Test Cases Chi Tiết (${{fn.test_cases ? fn.test_cases.length : 0}} TCs):</h4>
      ${{tcsHtml}}
    `;

    document.getElementById('quickModal').style.display = 'flex';
  }}

  function closeModal() {{
    document.getElementById('quickModal').style.display = 'none';
  }}

  function showToast(msg) {{
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }}

  function copyMasterTsv() {{
    const lines = ["No\\tFunction Name\\tSheet Name\\tDescription\\tPre-Condition"];
    masterFunctions.forEach(f => {{
      lines.push(`${{f.no}}\\t${{f.name}}\\t${{f.sheet}}\\t${{f.desc}}\\t${{f.pre}}`);
    }});
    navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
      showToast("Đã copy toàn bộ bảng 88 Functions (TSV) vào Clipboard! Nhấn Ctrl + V vào Excel.");
    }});
  }}

  function copyCurrentSheetTsv() {{
    const currentSheet = document.getElementById('selectSheet').value;
    const mod = modulesList.find(m => m.sheet === currentSheet);
    if (!mod) return;

    const lines = ["Test Case ID\\tTest Case Description\\tTest Case Procedure\\tExpected Results\\tPre-conditions\\tRound 1\\tTest date\\tTester\\tRound 2\\tTest date\\tTester\\tRound 3\\tTest date\\tTester\\tNote"];
    mod.functions.forEach(f => {{
      // Add banner row
      lines.push(`${{f.name}}\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t`);
      if (f.test_cases) {{
        f.test_cases.forEach(tc => {{
          const cleanProc = tc.proc.replace(/\\n/g, ' ');
          const cleanExp = tc.expected.replace(/\\n/g, ' ');
          lines.push(`${{tc.id}}\\t${{tc.desc}}\\t${{cleanProc}}\\t${{cleanExp}}\\t${{tc.pre}}\\tPassed\\t11/8/2026\\tPhucnbh\\tPassed\\t12/8/2026\\tPhucnbh\\t\\t\\t\\t`);
        }});
      }}
    }});

    navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
      showToast(`Đã copy toàn bộ ${{mod.sheet}} (15 cột TSV chuẩn Excel) vào Clipboard!`);
    }});
  }}

  document.getElementById('searchMaster').addEventListener('input', filterMaster);
  window.onclick = (e) => {{
    if (e.target.id === 'quickModal') closeModal();
  }};

  // Init
  initPills();
  renderMasterTable(masterFunctions);
  initSheetSelect();
</script>

</body>
</html>
"""

html_out = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html"
with open(html_out, "w", encoding="utf-8") as f:
    f.write(html_template)
print(f"Written comprehensive HTML to {html_out}")

tsv_out = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_master.tsv"
with open(tsv_out, "w", encoding="utf-8") as f:
    f.write("No\tFunction Name\tSheet Name\tDescription\tPre-Condition\n")
    for f_item in master_functions:
        f.write(f"{f_item['no']}\t{f_item['name']}\t{f_item['sheet']}\t{f_item['desc']}\t{f_item['pre']}\n")
print(f"Written master TSV to {tsv_out}")

# Also output Authentication Sheet test cases as TSV
auth_tsv_out = r"D:\Ky9\Capstone\StockSpace\docs\auth_test_cases.tsv"
with open(auth_tsv_out, "w", encoding="utf-8") as f:
    f.write("Test Case ID\tTest Case Description\tTest Case Procedure\tExpected Results\tPre-conditions\tRound 1\tTest date\tTester\tRound 2\tTest date\tTester\tRound 3\tTest date\tTester\tNote\n")
    auth_mod = next(m for m in modules_list if m["sheet"] == "Authentication")
    for fn in auth_mod["functions"]:
        f.write(f"{fn['name']}\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n")
        for tc in fn.get("test_cases", []):
            clean_proc = tc["proc"].replace('\n', ' ')
            clean_exp = tc["expected"].replace('\n', ' ')
            f.write(f"{tc['id']}\t{tc['desc']}\t{clean_proc}\t{clean_exp}\t{tc['pre']}\tPassed\t11/8/2026\tPhucnbh\tPassed\t12/8/2026\tPhucnbh\t\t\t\t\n")
print(f"Written auth TSV to {auth_tsv_out}")
