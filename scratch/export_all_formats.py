import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
from build_master_function_matrix_html import functions

docs_dir = r"D:\Ky9\Capstone\StockSpace\docs"
tsv_path = os.path.join(docs_dir, "all_project_functions_matrix.tsv")
md_path = os.path.join(docs_dir, "all_project_functions_matrix.md")

with open(tsv_path, "w", encoding="utf-8") as f:
    f.write("No\tFunction Name\tSheet Name\tDescription\tPre-Condition\n")
    for row in functions:
        f.write(f"{row['no']}\t{row['name']}\t{row['sheet']}\t{row['desc']}\t{row['pre']}\n")
print("Generated TSV:", tsv_path)

with open(md_path, "w", encoding="utf-8") as f:
    f.write("# STOCKSPACE - TOÀN BỘ DANH MỤC CHỨC NĂNG DỰ ÁN (ĐỐI CHIẾU 100% FE & BE)\n\n")
    f.write("> **Project Name**: StockSpace - Website allows posting, searching for warehouse space and managing it after rental(Không gian lưu trữ - Website cho phép đăng tải, tìm kiếm kho bãi và quản lí sau khi thuê)  \n")
    f.write("> **Project Code**: SU26SE015_GSU12  \n")
    f.write(f"> **Tổng số chức năng**: {len(functions)} Functions (Phân bố trên 17 Nhóm Chức năng / Sheet Modules)  \n\n")
    f.write("---\n\n")
    f.write("| No | Function Name | Sheet Name | Description | Pre-Condition | BE Controller & Method | FE Page / Route |\n")
    f.write("| :---: | :--- | :--- | :--- | :--- | :--- | :--- |\n")
    for row in functions:
        f.write(f"| **{row['no']}** | `{row['name']}` | **{row['sheet']}** | {row['desc']} | {row['pre']} | `{row['be']}` | `{row['fe']}` |\n")

print("Generated MD:", md_path)
