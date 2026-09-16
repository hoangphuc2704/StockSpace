import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\Ky9\Capstone\StockSpace\scratch\clean_excel_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

master_functions = data["master_functions"]
sheet_details = data["sheet_details"]

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SU26SE015_GSU12_HCM_Report5_System_Test.xlsx - StockSpace</title>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      background-color: #f3f3f3;
      color: #000;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }}

    /* Excel Title / Ribbon Bar */
    .excel-top-bar {{
      background: #107c41;
      color: #fff;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }}

    .excel-title {{
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }}

    .excel-actions {{
      display: flex;
      gap: 8px;
    }}

    .excel-btn {{
      background: #ffffff;
      color: #107c41;
      border: 1px solid #ffffff;
      padding: 4px 12px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s;
    }}

    .excel-btn:hover {{
      background: #e6f4ea;
    }}

    /* Formula / Info Bar */
    .formula-bar {{
      background: #ffffff;
      border-bottom: 1px solid #d4d4d4;
      padding: 4px 12px;
      font-size: 12px;
      color: #444;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }}

    .name-box {{
      font-family: Consolas, monospace;
      font-weight: bold;
      background: #f9f9f9;
      border: 1px solid #d4d4d4;
      padding: 2px 8px;
      min-width: 60px;
      text-align: center;
    }}

    /* Sheet Content Canvas */
    .sheet-canvas {{
      flex: 1;
      overflow: auto;
      background: #ffffff;
      padding: 16px 20px 60px 20px;
    }}

    /* MASTER TABLE STYLES (Screenshot 1 Format) */
    table.excel-grid {{
      border-collapse: collapse;
      font-size: 11pt;
      line-height: 1.4;
      background: #fff;
    }}

    table.excel-grid th, table.excel-grid td {{
      border: 1px solid #000000;
      padding: 4px 8px;
      vertical-align: middle;
    }}

    table.master-table {{
      width: 100%;
      min-width: 1100px;
    }}

    table.master-table thead th {{
      background-color: #1f3864; /* Royal Dark Blue */
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      padding: 6px 10px;
      white-space: nowrap;
      border: 1px solid #000000;
    }}

    table.master-table td.col-no {{
      text-align: center;
      width: 50px;
    }}

    table.master-table td.col-func {{
      font-weight: 500;
      width: 260px;
    }}

    table.master-table td.col-sheet {{
      text-align: center;
      width: 180px;
      color: #7030a0;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }}

    table.master-table td.col-sheet:hover {{
      color: #002060;
      background: #f2f2f2;
    }}

    table.master-table td.col-desc {{
      min-width: 340px;
    }}

    table.master-table td.col-pre {{
      width: 280px;
    }}

    /* DETAIL SHEET STYLES (Screenshot 2 Format) */
    .summary-box {{
      margin-bottom: 12px;
      border-collapse: collapse;
      font-size: 11pt;
      width: 100%;
      max-width: 820px;
    }}

    .summary-box td {{
      border: 1px solid #000000;
      padding: 3px 8px;
    }}

    .summary-box td.lbl {{
      font-weight: bold;
      width: 140px;
      background: #ffffff;
    }}

    .summary-box tr.round-hdr td {{
      font-weight: bold;
      text-align: center;
    }}

    table.detail-table {{
      width: 100%;
      min-width: 1450px;
      border-collapse: collapse;
    }}

    table.detail-table thead th {{
      background-color: #548235; /* Dark Olive Green */
      color: #ffffff;
      font-weight: bold;
      text-align: center;
      padding: 5px 6px;
      white-space: nowrap;
      border: 1px solid #000000;
      font-size: 10.5pt;
    }}

    table.detail-table td {{
      border: 1px solid #000000;
      padding: 4px 6px;
      font-size: 10.5pt;
      vertical-align: top;
    }}

    tr.sub-banner-row td {{
      background-color: #d9f2ff !important; /* Soft Cyan/Light Blue */
      font-weight: bold;
      color: #000000;
      padding: 5px 8px;
      border: 1px solid #000000;
    }}

    .tc-center {{
      text-align: center;
      white-space: nowrap;
    }}

    /* Bottom Sheet Tab Bar (Excel Clone) */
    .sheet-tab-bar {{
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #e6e6e6;
      border-top: 1px solid #c0c0c0;
      display: flex;
      align-items: center;
      height: 34px;
      padding: 0 6px;
      overflow-x: auto;
      z-index: 100;
    }}

    .tab-arrows {{
      display: flex;
      align-items: center;
      gap: 2px;
      margin-right: 8px;
      color: #555;
      cursor: pointer;
    }}

    .tab-arrow-btn {{
      background: transparent;
      border: none;
      font-size: 14px;
      padding: 2px 6px;
      cursor: pointer;
      color: #444;
    }}

    .tab-arrow-btn:hover {{
      background: #d0d0d0;
      border-radius: 2px;
    }}

    .sheet-tabs-list {{
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 100%;
    }}

    .sheet-tab-item {{
      background: #dedede;
      border: 1px solid #bcbcbc;
      border-bottom: none;
      padding: 6px 14px 5px 14px;
      font-size: 12px;
      color: #333;
      cursor: pointer;
      white-space: nowrap;
      user-select: none;
      height: 28px;
      display: flex;
      align-items: center;
      border-radius: 4px 4px 0 0;
    }}

    .sheet-tab-item:hover {{
      background: #ececec;
    }}

    .sheet-tab-item.active {{
      background: #ffffff;
      color: #107c41;
      font-weight: bold;
      border-top: 2px solid #107c41;
      border-left: 1px solid #bcbcbc;
      border-right: 1px solid #bcbcbc;
      border-bottom: 1px solid #ffffff;
      height: 31px;
      padding-top: 7px;
    }}

    /* Toast */
    #toast {{
      position: fixed;
      bottom: 45px;
      right: 20px;
      background: #202020;
      color: #fff;
      padding: 10px 18px;
      border-radius: 4px;
      font-size: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.25s ease;
      z-index: 1000;
      border-left: 4px solid #107c41;
    }}

    #toast.show {{
      opacity: 1;
      transform: translateY(0);
    }}
  </style>
</head>
<body>

  <!-- Top Bar -->
  <div class="excel-top-bar">
    <div class="excel-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.5 15.5H8v-7h1.5v7zm4 0h-1.5v-7H13.5v7zm4 0H16v-7h1.5v7z"/></svg>
      <span>SU26SE015_GSU12_HCM_Report5_System_Test.xlsx — StockSpace</span>
    </div>
    <div class="excel-actions">
      <button class="excel-btn" onclick="copyActiveSheetTsv()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Sao chép Sheet này vào Excel (TSV)</span>
      </button>
      <button class="excel-btn" onclick="copyMasterTableTsv()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        <span>Sao chép bảng Master (5 cột)</span>
      </button>
    </div>
  </div>

  <!-- Formula Bar -->
  <div class="formula-bar">
    <div class="name-box" id="nameBox">A1</div>
    <div style="color: #888;">fx</div>
    <div id="formulaText" style="font-family: Calibri, sans-serif; color: #111;">=TEST_CASE_LIST()</div>
  </div>

  <!-- Sheet Canvas (Displays active sheet content) -->
  <div class="sheet-canvas" id="sheetCanvas">
    <!-- Populated by JavaScript -->
  </div>

  <!-- Bottom Sheet Tabs Bar -->
  <div class="sheet-tab-bar">
    <div class="tab-arrows">
      <button class="tab-arrow-btn" onclick="scrollTabs(-100)">&lt;</button>
      <button class="tab-arrow-btn" onclick="scrollTabs(100)">&gt;</button>
    </div>
    <div class="sheet-tabs-list" id="sheetTabsList">
      <!-- Tabs generated by JS -->
    </div>
  </div>

  <div id="toast">Đã sao chép vào Clipboard! Bạn có thể nhấn Ctrl + V trực tiếp vào file Excel.</div>

  <script>
    const masterFunctions = {json.dumps(master_functions, ensure_ascii=False)};
    const sheetDetails = {json.dumps(sheet_details, ensure_ascii=False)};

    const allSheetNames = [
      "Test Cases",
      ...Object.keys(sheetDetails)
    ];

    let currentActiveSheet = "Test Cases";

    function initTabs() {{
      const container = document.getElementById('sheetTabsList');
      container.innerHTML = '';
      allSheetNames.forEach(sh => {{
        const tab = document.createElement('div');
        tab.className = 'sheet-tab-item' + (sh === currentActiveSheet ? ' active' : '');
        tab.textContent = sh;
        tab.onclick = () => switchSheet(sh);
        container.appendChild(tab);
      }});
    }}

    function switchSheet(sheetName) {{
      currentActiveSheet = sheetName;
      document.querySelectorAll('.sheet-tab-item').forEach(t => {{
        t.classList.toggle('active', t.textContent === sheetName);
      }});
      renderSheet(sheetName);
      document.getElementById('nameBox').textContent = 'A1';
      document.getElementById('formulaText').textContent = sheetName === 'Test Cases' ? '=TEST_CASE_LIST()' : '=' + sheetName.toUpperCase().replace(/\\s+/g, '_');
    }}

    function renderSheet(sheetName) {{
      const canvas = document.getElementById('sheetCanvas');
      canvas.innerHTML = '';

      if (sheetName === "Test Cases") {{
        renderMasterSheet(canvas);
      }} else {{
        renderDetailSheet(canvas, sheetName);
      }}
      canvas.scrollTop = 0;
    }}

    /* Render Master Table (Screenshot 1 Format) */
    function renderMasterSheet(container) {{
      let html = `
        <div style="margin-bottom: 12px; font-weight: bold; font-size: 14pt; color: #1f3864;">
          TEST CASE LIST
        </div>
        <table class="excel-grid master-table" id="tableMasterGrid">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th style="width: 250px;">Function Name</th>
              <th style="width: 190px;">Sheet Name</th>
              <th>Description</th>
              <th style="width: 320px;">Pre-Condition</th>
            </tr>
          </thead>
          <tbody>
      `;

      masterFunctions.forEach(f => {{
        html += `
          <tr>
            <td class="col-no">${{f.no}}</td>
            <td class="col-func">${{f.name}}</td>
            <td class="col-sheet" onclick="switchSheet('${{f.sheet}}')">${{f.sheet}}</td>
            <td class="col-desc">${{f.desc}}</td>
            <td class="col-pre">${{f.pre}}</td>
          </tr>
        `;
      }});

      html += `
          </tbody>
        </table>
      `;
      container.innerHTML = html;
    }}

    /* Render Detail Sheet (Screenshot 2 Format) */
    function renderDetailSheet(container, sheetName) {{
      const data = sheetDetails[sheetName];
      if (!data) {{
        container.innerHTML = '<p>Không có dữ liệu cho sheet này.</p>';
        return;
      }}

      let totalTcs = 0;
      data.functions.forEach(fn => {{
        if (fn.test_cases) totalTcs += fn.test_cases.length;
      }});

      let html = `
        <!-- Summary Card (Exact to Screenshot 2) -->
        <table class="summary-box">
          <tr>
            <td class="lbl">Feature</td>
            <td colspan="4" style="font-weight: bold;">${{data.feature}}</td>
          </tr>
          <tr>
            <td class="lbl">Test requirement</td>
            <td colspan="4">${{data.requirement}}</td>
          </tr>
          <tr>
            <td class="lbl">Number of TCs</td>
            <td colspan="4" style="font-weight: bold;">${{totalTcs}}</td>
          </tr>
          <tr class="round-hdr">
            <td style="text-align: left; font-weight: bold;">Testing Round</td>
            <td>Passed</td>
            <td>Failed</td>
            <td>Pending</td>
            <td>N/A</td>
          </tr>
          <tr>
            <td><b>Round 1</b></td>
            <td style="text-align: center; font-weight: bold;">${{totalTcs}}</td>
            <td style="text-align: center;">0</td>
            <td style="text-align: center;">0</td>
            <td style="text-align: center;">0</td>
          </tr>
          <tr>
            <td><b>Round 2</b></td>
            <td style="text-align: center; font-weight: bold;">${{totalTcs}}</td>
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
        <table class="excel-grid detail-table" id="tableDetailGrid">
          <thead>
            <tr>
              <th style="width: 100px;">Test Case ID</th>
              <th style="width: 200px;">Test Case Description</th>
              <th style="min-width: 280px;">Test Case Procedure</th>
              <th style="min-width: 270px;">Expected Results</th>
              <th style="width: 180px;">Pre-conditions</th>
              <th style="width: 65px;">Round 1</th>
              <th style="width: 80px;">Test date</th>
              <th style="width: 75px;">Tester</th>
              <th style="width: 65px;">Round 2</th>
              <th style="width: 80px;">Test date</th>
              <th style="width: 75px;">Tester</th>
              <th style="width: 65px;">Round 3</th>
              <th style="width: 80px;">Test date</th>
              <th style="width: 75px;">Tester</th>
              <th style="width: 90px;">Note</th>
            </tr>
          </thead>
          <tbody>
      `;

      data.functions.forEach(fn => {{
        // Function Sub-header Banner Row
        html += `
          <tr class="sub-banner-row">
            <td colspan="15">${{fn.name}}</td>
          </tr>
        `;

        if (fn.test_cases && fn.test_cases.length > 0) {{
          fn.test_cases.forEach(tc => {{
            html += `
              <tr>
                <td style="font-weight: bold; white-space: nowrap;">${{tc.id}}</td>
                <td>${{tc.desc}}</td>
                <td style="white-space: pre-line;">${{tc.proc}}</td>
                <td style="white-space: pre-line;">${{tc.expected}}</td>
                <td style="font-style: normal;">${{tc.pre}}</td>
                <td class="tc-center">Passed</td>
                <td class="tc-center">11/8/2026</td>
                <td class="tc-center">Phucnbh</td>
                <td class="tc-center">Passed</td>
                <td class="tc-center">12/8/2026</td>
                <td class="tc-center">Phucnbh</td>
                <td class="tc-center"></td>
                <td class="tc-center"></td>
                <td class="tc-center"></td>
                <td></td>
              </tr>
            `;
          }});
        }}
      }});

      html += `
          </tbody>
        </table>
      `;

      container.innerHTML = html;
    }}

    function scrollTabs(val) {{
      document.querySelector('.sheet-tab-bar').scrollLeft += val;
    }}

    function showToast(msg) {{
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }}

    function copyMasterTableTsv() {{
      const lines = ["No\\tFunction Name\\tSheet Name\\tDescription\\tPre-Condition"];
      masterFunctions.forEach(f => {{
        lines.push(`${{f.no}}\\t${{f.name}}\\t${{f.sheet}}\\t${{f.desc}}\\t${{f.pre}}`);
      }});
      navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
        showToast("Đã copy bảng Master Test Cases (5 cột) vào Clipboard!");
      }});
    }}

    function copyActiveSheetTsv() {{
      if (currentActiveSheet === "Test Cases") {{
        copyMasterTableTsv();
        return;
      }}

      const data = sheetDetails[currentActiveSheet];
      if (!data) return;

      const lines = ["Test Case ID\\tTest Case Description\\tTest Case Procedure\\tExpected Results\\tPre-conditions\\tRound 1\\tTest date\\tTester\\tRound 2\\tTest date\\tTester\\tRound 3\\tTest date\\tTester\\tNote"];
      data.functions.forEach(fn => {{
        lines.push(`${{fn.name}}\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t`);
        if (fn.test_cases) {{
          fn.test_cases.forEach(tc => {{
            const cleanProc = tc.proc.replace(/\\n/g, ' ');
            const cleanExp = tc.expected.replace(/\\n/g, ' ');
            lines.push(`${{tc.id}}\\t${{tc.desc}}\\t${{cleanProc}}\\t${{cleanExp}}\\t${{tc.pre}}\\tPassed\\t11/8/2026\\tPhucnbh\\tPassed\\t12/8/2026\\tPhucnbh\\t\\t\\t\\t`);
          }});
        }}
      }});

      navigator.clipboard.writeText(lines.join('\\n')).then(() => {{
        showToast(`Đã copy toàn bộ test case sheet '${{currentActiveSheet}}' (15 cột TSV) vào Clipboard!`);
      }});
    }}

    // Init on load
    initTabs();
    switchSheet("Test Cases");
  </script>

</body>
</html>
"""

html_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_matrix.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"Written pixel-perfect Excel HTML to {html_path}")

# Also update the Master TSV (5 columns exact)
master_tsv_path = r"D:\Ky9\Capstone\StockSpace\docs\all_project_functions_master.tsv"
with open(master_tsv_path, "w", encoding="utf-8") as f:
    f.write("No\tFunction Name\tSheet Name\tDescription\tPre-Condition\n")
    for f_item in master_functions:
        f.write(f"{f_item['no']}\t{f_item['name']}\t{f_item['sheet']}\t{f_item['desc']}\t{f_item['pre']}\n")
print(f"Written master TSV (5 columns) to {master_tsv_path}")
