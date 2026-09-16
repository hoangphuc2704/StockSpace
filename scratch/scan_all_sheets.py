import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

xlsx_path = r'D:\Ky9\Capstone\Report\File\SU26SE015_GSU12_HCM_Report5_System_Test.xlsx'

with zipfile.ZipFile(xlsx_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for si in ss_root.findall('.//ns:si', ns):
            text_pieces = [t.text for t in si.findall('.//ns:t', ns) if t.text]
            shared_strings.append("".join(text_pieces))

    wb_xml = z.read('xl/workbook.xml')
    wb_root = ET.fromstring(wb_xml)
    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sheets = wb_root.findall('.//ns:sheet', ns)

    wb_rels_xml = z.read('xl/_rels/workbook.xml.rels')
    root_rels = ET.fromstring(wb_rels_xml)
    rel_ns = {'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'}
    rel_map = {}
    for r in root_rels.findall('.//rel:Relationship', rel_ns):
        rel_map[r.attrib.get('Id')] = 'xl/' + r.attrib.get('Target').lstrip('/')

    for s in sheets:
        s_name = s.attrib.get('name')
        r_id = s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        file_path = rel_map.get(r_id)
        if not file_path:
            continue
        sheet_xml = z.read(file_path)
        sheet_root = ET.fromstring(sheet_xml)
        rows = sheet_root.findall('.//ns:row', ns)
        
        # Count non-empty rows and find TC count
        tc_ids = []
        for r in rows:
            cells = r.findall('.//ns:c', ns)
            for c in cells:
                ref = c.attrib.get('r')
                if ref and ref.startswith('A'):
                    t = c.attrib.get('t')
                    v = c.find('ns:v', ns)
                    if v is not None and v.text:
                        val = shared_strings[int(v.text)] if t == 's' else v.text
                        if val.startswith('TC_'):
                            tc_ids.append(val)
        print(f"Sheet: {s_name} | Total rows: {len(rows)} | TC count: {len(tc_ids)} | First 3 TCs: {tc_ids[:3]}")
