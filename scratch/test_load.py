import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

# Import existing master functions
from build_master_function_matrix_html import functions

# Load extracted test cases from Excel as base
with open(r'D:\Ky9\Capstone\StockSpace\scratch\extracted_system_tests.json', 'r', encoding='utf-8') as f:
    excel_tests = json.load(f)

print("Loaded base test cases from Excel")
