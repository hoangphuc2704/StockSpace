import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

xlsx_path = r'D:\Ky9\Capstone\Report\File\SU26SE015_GSU12_HCM_Report5_System_Test.xlsx'

with zipfile.ZipFile(xlsx_path, 'r') as z:
    # 1. Read shared strings
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in ss_root.findall('.//ns:si', ns):
            text_pieces = [t.text for t in si.findall('.//ns:t', ns) if t.text]
            shared_strings.append("".join(text_pieces))

    # 2. Read workbook relationships to map rId4 to sheet filename
    wb_rels_xml = z.read('xl/_rels/workbook.xml.rels')
    root_rels = ET.fromstring(wb_rels_xml)
    rel_ns = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    target_sheet_file = None
    for r in root_rels.findall('.//rel:Relationship', rel_ns):
        if r.attrib.get('Id') == 'rId4':
            target_sheet_file = 'xl/' + r.attrib.get('Target').lstrip('/')
            break
    print(f"Authentication sheet file: {target_sheet_file}")

    # 3. Read the sheet XML
    sheet_xml = z.read(target_sheet_file)
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    rows = sheet_root.findall('.//ns:row', ns)
    print(f"Total rows in Authentication: {len(rows)}")

    for row in rows:
        row_num = row.attrib.get('r')
        cells = row.findall('.//ns:c', ns)
        row_data = []
        for c in cells:
            cell_ref = c.attrib.get('r')
            cell_type = c.attrib.get('t')
            v = c.find('ns:v', ns)
            val = ""
            if v is not None and v.text is not None:
                if cell_type == 's':
                    idx = int(v.text)
                    val = shared_strings[idx] if idx < len(shared_strings) else v.text
                else:
                    val = v.text
            row_data.append(f"{cell_ref}: {val.strip()}")
        print(f"Row {row_num}: {' | '.join(row_data[:8])}")
