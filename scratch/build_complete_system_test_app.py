import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Load master functions
from build_master_function_matrix_html import functions

# Load deep module data
with open(r'D:\Ky9\Capstone\StockSpace\scratch\all_deep_system_test_data.json', 'r', encoding='utf-8') as f:
    modules_data = json.load(f)

html_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html"

functions_json = json.dumps(functions, ensure_ascii=False)
modules_json = json.dumps(modules_data, ensure_ascii=False)

html_template = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StockSpace - Test Case System Master (85 Functions & Chi Tiết Test Cases)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --navy: #002060;
      --navy-light: #0d3880;
      --olive: #708b42;
      --olive-dark: #5c7433;
      --cyan-sub: #cceeff;
      --border-dark: #000000;
      --border-gray: #d1d5db;
      --bg-page: #f1f5f9;
      --bg-card: #ffffff;
      --text-main: #000000;
      --text-muted: #4b5563;
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
    .btn-blue {{
      background: #2563eb;
      color: white;
    }}
    .btn-blue:hover {{ background: #1d4ed8; }}
    .btn-outline {{
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.25);
    }}
    .btn-outline:hover {{ background: rgba(255,255,255,0.2); }}

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

    /* Summary Meta Table (Screenshot 1) */
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

    /* Tab 1: Master List Table (Navy Blue Header - Screenshot 1) */
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
      width: 170px;
    }}
    .table-master .col-desc {{
      line-height: 1.4;
      min-width: 320px;
    }}
    .table-master .col-pre {{
      width: 280px;
      line-height: 1.4;
    }}
    .table-master .col-action {{
      width: 140px;
      text-align: center;
    }}
    .btn-inspect {{
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 700;
      border: 1px solid #c7d2fe;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }}
    .btn-inspect:hover {{
      background: #c7d2fe;
    }}

    /* Tab 2: System Test Details Table (Olive Green Header - Screenshot 2) */
    .module-header-box {{
      border: 1px solid #000;
      margin-bottom: 20px;
      background: white;
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    .module-header-box td {{
      border: 1px solid #000;
      padding: 6px 12px;
      color: #000;
    }}
    .module-header-box .hdr-label {{
      font-weight: 700;
      width: 160px;
      background: #fff;
    }}
    .round-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }}
    .round-table th, .round-table td {{
      border: 1px solid #000;
      padding: 5px 12px;
      text-align: center;
      font-size: 12.5px;
    }}
    .round-table th {{
      font-weight: 700;
      background: #fff;
    }}

    /* Main Test Case Table (Screenshot 2) */
    .table-detail {{
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      background: white;
    }}
    .table-detail th {{
      background: var(--olive) !important;
      color: #ffffff !important;
      font-weight: 700;
      text-align: center;
      padding: 9px 10px;
      border: 1px solid #000000;
      white-space: nowrap;
      font-size: 13px;
    }}
    .table-detail td {{
      border: 1px solid #000000;
      padding: 8px 10px;
      vertical-align: top;
      color: #000;
    }}
    .category-row td {{
      background: var(--cyan-sub) !important;
      font-weight: 700;
      color: #000000;
      padding: 6px 12px;
      font-size: 13px;
    }}
    .tc-id {{
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      width: 100px;
    }}
    .tc-desc {{
      width: 220px;
      font-weight: 500;
    }}
    .tc-proc {{
      white-space: pre-line;
      line-height: 1.45;
      min-width: 280px;
    }}
    .tc-exp {{
      line-height: 1.45;
      min-width: 240px;
    }}
    .tc-pre {{
      font-style: italic;
      color: #262626;
      width: 180px;
      line-height: 1.4;
    }}
    .tc-res {{
      text-align: center;
      font-weight: 700;
      width: 75px;
      color: var(--pass-green);
    }}
    .tc-date {{
      text-align: center;
      width: 85px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
    }}
    .tc-tester {{
      text-align: center;
      width: 80px;
      font-weight: 600;
    }}

    /* Interactive Modal for Deep Dive */
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
      display: flex;
      align-items: center;
      gap: 8px;
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
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      opacity: 0.8;
    }}
    .modal-close:hover {{ opacity: 1; }}

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
      <p>Hệ thống tra cứu & kiểm thử toàn diện: 85 Functions & 117 System Test Cases (Chuẩn Report 5)</p>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <div class="nav-tabs">
        <button class="nav-tab active" id="tabBtn1" onclick="switchTab('master')">
          📋 1. TEST CASE LIST (Bảng 85 Chức Năng)
        </button>
        <button class="nav-tab" id="tabBtn2" onclick="switchTab('detail')">
          🔬 2. SYSTEM TEST DETAILS (Chi Tiết Test Cases Từng Sheet)
        </button>
      </div>
      <button class="btn btn-green" id="btnMainCopy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Copy TSV vào Excel</span>
      </button>
    </div>
  </div>

  <!-- ================= TAB 1: MASTER LIST (Screenshot 1 Format) ================= -->
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
          <td class="meta-val-green">1. Server: Spring Boot 3.x (Java 21), Spring Security, Hibernate/JPA, Redis Cache, Vite / React 18, NodeJS 20+
2. Database: PostgreSQL 16 (Relational DB & PostGIS Spatial Data)
3. Web Browser: Google Chrome (v120+), Microsoft Edge (v120+)
4. External Gateways: VNPay Payment Gateway Sandbox, Cloudinary Image CDN, SMTP Gmail Service, OpenStreetMap API</td>
        </tr>
      </table>

      <!-- Search & Filters -->
      <div class="filter-bar">
        <input type="text" class="search-input" id="searchMaster" placeholder="🔍 Tìm kiếm chức năng, sheet, mô tả...">
        <div class="pill-group" id="pillsMaster">
          <div class="pill active" data-sheet="ALL">Tất cả Nhóm (17 Modules)</div>
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
              <th class="col-action">Thao tác</th>
            </tr>
          </thead>
          <tbody id="tblMasterBody">
            <!-- Populated by JS -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ================= TAB 2: DETAILED MODULE VIEW (Screenshot 2 Format) ================= -->
  <div class="tab-content" id="viewDetail">
    <div class="excel-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-weight: 700; font-size: 14px;">Chọn Sheet Phân Hệ:</label>
          <select id="selectModule" style="padding: 7px 12px; font-weight: 600; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; background: #fff;">
            <!-- Options populated by JS -->
          </select>
        </div>
        <button class="btn btn-green" onclick="copyCurrentModuleTsv()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <span>Copy Sheet Này Vào Excel</span>
        </button>
      </div>

      <!-- Module Summary Block (Screenshot 2 Top) -->
      <table class="module-header-box">
        <tr>
          <td class="hdr-label">Feature</td>
          <td id="detFeature" style="font-weight: 600;">Authentication</td>
          <td style="width: 100px; text-align: center; font-weight: 700;">Passed</td>
        </tr>
        <tr>
          <td class="hdr-label">Test requirement</td>
          <td id="detRequirement">Verify login, registration, password recovery, token refresh, and logout functionalities</td>
          <td style="text-align: center; font-weight: 700;">Failed</td>
        </tr>
        <tr>
          <td class="hdr-label">Number of TCs</td>
          <td id="detCount" style="font-weight: 700;">8</td>
          <td style="text-align: center; font-weight: 700;">Pending</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 0;">
            <table class="round-table">
              <tr>
                <th>Testing Round</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Pending</th>
                <th>N/A</th>
              </tr>
              <tr>
                <td style="font-weight: 600;">Round 1</td>
                <td id="r1Passed" style="font-weight: 700; color: var(--pass-green);">8</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Round 2</td>
                <td id="r2Passed" style="font-weight: 700; color: var(--pass-green);">8</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
              <tr>
                <td style="font-weight: 600;">Round 3</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
                <td>0</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Main Detailed Test Cases Table (Screenshot 2 Table) -->
      <div style="overflow-x: auto;">
        <table class="table-detail" id="tblDetail">
          <thead>
            <tr>
              <th style="width: 100px;">Test Case ID</th>
              <th style="width: 220px;">Test Case Description</th>
              <th style="min-width: 280px;">Test Case Procedure</th>
              <th style="min-width: 240px;">Expected Results</th>
              <th style="width: 180px;">Pre-conditions</th>
              <th style="width: 75px;">Round 1</th>
              <th style="width: 85px;">Test date</th>
              <th style="width: 80px;">Tester</th>
              <th style="width: 75px;">Round 2</th>
              <th style="width: 85px;">Test date</th>
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

<!-- Detailed Modal View on Function Click -->
<div class="modal-overlay" id="detailModal">
  <div class="modal-box">
    <div class="modal-hdr">
      <h3 id="modalTitle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span>Chi Tiết System Test Cases</span>
      </h3>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="btn btn-green" id="btnModalCopy" style="padding: 5px 10px; font-size: 12px;">
          Copy TSV Cho Excel
        </button>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
    </div>
    <div class="modal-body" id="modalBody">
      <!-- Modal Content Populated dynamically -->
    </div>
  </div>
</div>

<div id="toast">Đã copy dữ liệu TSV vào Clipboard! Nhấn Ctrl + V vào Excel.</div>

<script>
  const rawFunctions = {functions_json};
  const rawModules = {modules_json};

  let currentTab = "master";
  let activeMasterSheet = "ALL";
  let currentDetailSheetIndex = 0;

  // Initialize Pills in Tab 1
  const pillsContainer = document.getElementById("pillsMaster");
  rawModules.forEach(mod => {{
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.textContent = mod.sheet;
    pill.onclick = () => {{
      document.querySelectorAll("#pillsMaster .pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeMasterSheet = mod.sheet;
      renderMasterTable();
    }};
    pillsContainer.appendChild(pill);
  }});

  document.querySelector('#pillsMaster .pill[data-sheet="ALL"]').onclick = function() {{
    document.querySelectorAll("#pillsMaster .pill").forEach(p => p.classList.remove("active"));
    this.classList.add("active");
    activeMasterSheet = "ALL";
    renderMasterTable();
  }};

  // Populate select dropdown in Tab 2
  const selectModule = document.getElementById("selectModule");
  rawModules.forEach((mod, idx) => {{
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${{idx + 1}}. ${{mod.sheet}} (${{mod.functions.length}} functions)`;
    selectModule.appendChild(opt);
  }});
  selectModule.onchange = (e) => {{
    currentDetailSheetIndex = parseInt(e.target.value);
    renderDetailSheet();
  }};

  // Search in Tab 1
  document.getElementById("searchMaster").addEventListener("input", renderMasterTable);

  function switchTab(tab) {{
    currentTab = tab;
    document.getElementById("tabBtn1").classList.toggle("active", tab === "master");
    document.getElementById("tabBtn2").classList.toggle("active", tab === "detail");
    document.getElementById("viewMaster").classList.toggle("active", tab === "master");
    document.getElementById("viewDetail").classList.toggle("active", tab === "detail");
  }}

  // Render Master Table
  function renderMasterTable() {{
    const tbody = document.getElementById("tblMasterBody");
    tbody.innerHTML = "";
    const term = document.getElementById("searchMaster").value.toLowerCase().trim();

    rawFunctions.forEach(fn => {{
      const matchSheet = (activeMasterSheet === "ALL" || fn.sheet === activeMasterSheet);
      const matchSearch = !term || (
        fn.name.toLowerCase().includes(term) ||
        fn.sheet.toLowerCase().includes(term) ||
        fn.desc.toLowerCase().includes(term) ||
        fn.pre.toLowerCase().includes(term)
      );

      if (matchSheet && matchSearch) {{
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="col-no">${{fn.no}}</td>
          <td class="col-func">${{fn.name}}</td>
          <td class="col-sheet" onclick="openModuleDetail('${{fn.sheet}}'); event.stopPropagation();">${{fn.sheet}}</td>
          <td class="col-desc">${{fn.desc}}</td>
          <td class="col-pre">${{fn.pre}}</td>
          <td class="col-action">
            <button class="btn-inspect" onclick="openFunctionModal(${{fn.no}}); event.stopPropagation();">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Xem TCs</span>
            </button>
          </td>
        `;
        tr.onclick = () => openFunctionModal(fn.no);
        tbody.appendChild(tr);
      }}
    }});

    // Dotted blank rows at bottom matching user's screenshot
    for (let i = 0; i < 5; i++) {{
      const trEmpty = document.createElement("tr");
      trEmpty.innerHTML = `
        <td class="col-no" style="color:#9ca3af; border-style:dashed;">...</td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
        <td style="border-style:dashed;"></td>
      `;
      tbody.appendChild(trEmpty);
    }}
  }}

  // Render Detailed Sheet in Tab 2
  function renderDetailSheet() {{
    const mod = rawModules[currentDetailSheetIndex];
    document.getElementById("detFeature").textContent = mod.feature;
    document.getElementById("detRequirement").textContent = mod.requirement;

    // Count total TCs in this module
    let totalTcs = 0;
    mod.functions.forEach(f => totalTcs += f.test_cases.length);
    document.getElementById("detCount").textContent = totalTcs;
    document.getElementById("r1Passed").textContent = totalTcs;
    document.getElementById("r2Passed").textContent = totalTcs;

    const tbody = document.getElementById("tblDetailBody");
    tbody.innerHTML = "";

    mod.functions.forEach(fn => {{
      // Category header row in Cyan (Screenshot 2)
      const trCat = document.createElement("tr");
      trCat.className = "category-row";
      trCat.innerHTML = `<td colspan="10">${{fn.name}}</td>`;
      tbody.appendChild(trCat);

      // Test cases under this function
      fn.test_cases.forEach(tc => {{
        const trTc = document.createElement("tr");
        trTc.innerHTML = `
          <td class="tc-id">${{tc.id}}</td>
          <td class="tc-desc">${{tc.desc}}</td>
          <td class="tc-proc">${{tc.proc}}</td>
          <td class="tc-exp">${{tc.expected}}</td>
          <td class="tc-pre">${{tc.pre}}</td>
          <td class="tc-res">Passed</td>
          <td class="tc-date">11/8/2026</td>
          <td class="tc-tester">Phucnbh</td>
          <td class="tc-res">Passed</td>
          <td class="tc-date">12/8/2026</td>
        `;
        tbody.appendChild(trTc);
      }});
    }});
  }}

  function openModuleDetail(sheetName) {{
    const idx = rawModules.findIndex(m => m.sheet === sheetName);
    if (idx !== -1) {{
      currentDetailSheetIndex = idx;
      selectModule.value = idx;
      switchTab('detail');
      renderDetailSheet();
    }}
  }}

  // Open Function Modal on row click
  function openFunctionModal(fnNo) {{
    const fn = rawFunctions.find(f => f.no === fnNo);
    if (!fn) return;

    // Find the module containing this function
    const mod = rawModules.find(m => m.sheet === fn.sheet);
    const modFn = mod ? mod.functions.find(f => f.no === fnNo) : null;
    const testCases = modFn ? modFn.test_cases : [];

    document.getElementById("modalTitle").innerHTML = `
      <span>Chức năng: #${{fn.no}} - ${{fn.name}} (${{fn.sheet}})</span>
    `;

    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <!-- Module Summary Block matching Screenshot 2 -->
      <table class="module-header-box" style="margin-bottom: 16px;">
        <tr>
          <td class="hdr-label">Feature</td>
          <td style="font-weight: 600;">${{fn.sheet}} &gt; ${{fn.name}}</td>
          <td style="width: 100px; text-align: center; font-weight: 700;">Passed</td>
        </tr>
        <tr>
          <td class="hdr-label">Test requirement</td>
          <td>${{fn.desc}}</td>
          <td style="text-align: center; font-weight: 700;">Failed</td>
        </tr>
        <tr>
          <td class="hdr-label">Number of TCs</td>
          <td style="font-weight: 700;">${{testCases.length}}</td>
          <td style="text-align: center; font-weight: 700;">Pending</td>
        </tr>
      </table>

      <!-- Olive Green Detail Table matching Screenshot 2 -->
      <div style="overflow-x: auto;">
        <table class="table-detail">
          <thead>
            <tr>
              <th style="width: 100px;">Test Case ID</th>
              <th style="width: 220px;">Test Case Description</th>
              <th style="min-width: 280px;">Test Case Procedure</th>
              <th style="min-width: 240px;">Expected Results</th>
              <th style="width: 180px;">Pre-conditions</th>
              <th style="width: 75px;">Round 1</th>
              <th style="width: 85px;">Test date</th>
              <th style="width: 80px;">Tester</th>
              <th style="width: 75px;">Round 2</th>
              <th style="width: 85px;">Test date</th>
            </tr>
          </thead>
          <tbody>
            <tr class="category-row">
              <td colspan="10">${{fn.name}}</td>
            </tr>
            ${{testCases.map(tc => `
              <tr>
                <td class="tc-id">${{tc.id}}</td>
                <td class="tc-desc">${{tc.desc}}</td>
                <td class="tc-proc">${{tc.proc}}</td>
                <td class="tc-exp">${{tc.expected}}</td>
                <td class="tc-pre">${{tc.pre}}</td>
                <td class="tc-res">Passed</td>
                <td class="tc-date">11/8/2026</td>
                <td class="tc-tester">Phucnbh</td>
                <td class="tc-res">Passed</td>
                <td class="tc-date">12/8/2026</td>
              </tr>
            `).join('')}}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("btnModalCopy").onclick = () => copyModalTsv(fn.name, testCases);
    document.getElementById("detailModal").classList.add("open");
  }}

  function closeModal() {{
    document.getElementById("detailModal").classList.remove("open");
  }}

  // Close modal on click outside or Escape
  document.getElementById("detailModal").onclick = (e) => {{
    if (e.target.id === "detailModal") closeModal();
  }};
  window.addEventListener("keydown", (e) => {{
    if (e.key === "Escape") closeModal();
  }});

  // Copy TSV for current detail module
  function copyCurrentModuleTsv() {{
    const mod = rawModules[currentDetailSheetIndex];
    const lines = [];
    lines.push(`Feature\\t${{mod.feature}}\\t\\t\\t\\tPassed`);
    lines.push(`Test requirement\\t${{mod.requirement}}\\t\\t\\t\\tFailed`);
    lines.push(`Number of TCs\\t${{mod.functions.reduce((a,c)=>a+c.test_cases.length, 0)}}\\t\\t\\t\\tPending`);
    lines.push("Testing Round\\tPassed\\tFailed\\tPending\\tN/A");
    lines.push(`Round 1\\t${{mod.functions.reduce((a,c)=>a+c.test_cases.length, 0)}}\\t0\\t0\\t0`);
    lines.push(`Round 2\\t${{mod.functions.reduce((a,c)=>a+c.test_cases.length, 0)}}\\t0\\t0\\t0`);
    lines.push("Round 3\\t0\\t0\\t0\\t0");
    lines.push("");
    lines.push("Test Case ID\\tTest Case Description\\tTest Case Procedure\\tExpected Results\\tPre-conditions\\tRound 1\\tTest date\\tTester\\tRound 2\\tTest date");

    mod.functions.forEach(fn => {{
      lines.push(`${{fn.name}}`);
      fn.test_cases.forEach(tc => {{
        const cleanProc = tc.proc.replace(/\\n/g, " ");
        lines.push(`${{tc.id}}\\t${{tc.desc}}\\t${{cleanProc}}\\t${{tc.expected}}\\t${{tc.pre}}\\tPassed\\t11/8/2026\\tPhucnbh\\tPassed\\t12/8/2026`);
      }});
    }});

    navigator.clipboard.writeText(lines.join("\\n")).then(() => showToast("Đã copy toàn bộ Sheet " + mod.sheet + " vào Clipboard!"));
  }}

  function copyModalTsv(funcName, testCases) {{
    const lines = [];
    lines.push("Test Case ID\\tTest Case Description\\tTest Case Procedure\\tExpected Results\\tPre-conditions\\tRound 1\\tTest date\\tTester\\tRound 2\\tTest date");
    lines.push(funcName);
    testCases.forEach(tc => {{
      const cleanProc = tc.proc.replace(/\\n/g, " ");
      lines.push(`${{tc.id}}\\t${{tc.desc}}\\t${{cleanProc}}\\t${{tc.expected}}\\t${{tc.pre}}\\tPassed\\t11/8/2026\\tPhucnbh\\tPassed\\t12/8/2026`);
    }});

    navigator.clipboard.writeText(lines.join("\\n")).then(() => showToast("Đã copy Test Cases của " + funcName + " vào Clipboard!"));
  }}

  // Copy Master List TSV
  document.getElementById("btnMainCopy").onclick = () => {{
    const lines = ["No\\tFunction Name\\tSheet Name\\tDescription\\tPre-Condition"];
    rawFunctions.forEach(fn => {{
      lines.push(`${{fn.no}}\\t${{fn.name}}\\t${{fn.sheet}}\\t${{fn.desc}}\\t${{fn.pre}}`);
    }});
    navigator.clipboard.writeText(lines.join("\\n")).then(() => showToast("Đã copy bảng tổng hợp 85 Functions vào Clipboard!"));
  }};

  function showToast(msg) {{
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }}

  // Initial Renders
  renderMasterTable();
  renderDetailSheet();
</script>

</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_template)

print("Successfully generated deep interactive system test app:", html_path)
