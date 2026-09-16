import os
import sys
import zipfile
import shutil
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r"D:\Ky9\Capstone\Report\File\SU26SE015_GSU12_HCM_Report5_System_Test.xlsx"
backup_path = excel_path + ".bak"

if not os.path.exists(backup_path):
    shutil.copyfile(excel_path, backup_path)
    print("Created backup at:", backup_path)

temp_dir = r"D:\Ky9\Capstone\StockSpace\scratch\temp_xlsx"
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir, exist_ok=True)

with zipfile.ZipFile(excel_path, 'r') as z:
    z.extractall(temp_dir)

sheet3_path = os.path.join(temp_dir, "xl", "worksheets", "sheet3.xml")

ET.register_namespace('', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
ET.register_namespace('mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006')
ET.register_namespace('x14ac', 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac')

tree = ET.parse(sheet3_path)
root = tree.getroot()
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

# Fix D3 (Project Name) and D4 (Project Code) and D5 (Test Environment Setup)
for c in root.findall('.//s:c', ns):
    r = c.attrib.get('r')
    if r == 'D3':
        f = c.find('s:f', ns)
        if f is not None:
            f.text = 'Cover!B4'
        v = c.find('s:v', ns)
        if v is not None:
            v.text = 'StockSpace - Website allows posting, searching for warehouse space and managing it after rental(Không gian lưu trữ - Website cho phép đăng tải, tìm kiếm kho bãi và quản lí sau khi thuê)'
        c.attrib['t'] = 'str'
    elif r == 'D4':
        f = c.find('s:f', ns)
        if f is not None:
            f.text = 'Cover!B5'
        v = c.find('s:v', ns)
        if v is not None:
            v.text = 'SU26SE015_GSU12'
        c.attrib['t'] = 'str'
    elif r == 'D5':
        # Remove old value/children and use inline string
        for child in list(c):
            c.remove(child)
        c.attrib['t'] = 'inlineStr'
        is_elem = ET.SubElement(c, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}is')
        t_elem = ET.SubElement(is_elem, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        t_elem.text = """1. Server: Spring Boot 3.x (Java 21), Spring Security, Hibernate/JPA, Redis, Vite / React 18
2. Database: PostgreSQL 16
3. Web Browser: Google Chrome (v120+), Microsoft Edge
4. External Gateways: VNPay Payment Gateway, Cloudinary Image CDN, SMTP Gmail Service"""

tree.write(sheet3_path, encoding='utf-8', xml_declaration=True)

# Repack the zip
new_excel_path = excel_path + ".tmp"
with zipfile.ZipFile(new_excel_path, 'w', zipfile.ZIP_DEFLATED) as z_out:
    for foldername, subfolders, filenames in os.walk(temp_dir):
        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            arcname = os.path.relpath(filepath, temp_dir)
            z_out.write(filepath, arcname)

fixed_excel_path = r"D:\Ky9\Capstone\Report\File\SU26SE015_GSU12_HCM_Report5_System_Test_Fixed.xlsx"
shutil.move(new_excel_path, fixed_excel_path)
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
print("Successfully generated:", fixed_excel_path)
