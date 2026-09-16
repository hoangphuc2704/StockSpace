import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

xlsx_path = r'D:\Ky9\Capstone\Report\File\SU26SE015_GSU12_HCM_Report5_System_Test.xlsx'

with zipfile.ZipFile(xlsx_path, 'r') as z:
    # Read workbook.xml to get sheet names
    wb_xml = z.read('xl/workbook.xml')
    root = ET.fromstring(wb_xml)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sheets = root.findall('.//ns:sheet', ns)
    print("Sheets in workbook:")
    for s in sheets:
        print(" -", s.attrib.get('name'), "r:id =", s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'))
