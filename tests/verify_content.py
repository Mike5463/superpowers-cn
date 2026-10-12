"""Verify semantic delivery invariants: full source retention and readable coverage."""
import hashlib
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source/superpowers'
data=json.loads((ROOT/'content/reader_data.json').read_text())
paths={p.relative_to(SOURCE).as_posix():p for p in SOURCE.rglob('*') if p.is_file()}
assert len(paths)==238
assert set(paths)=={f['path'] for f in data['files']}
assert len(data['files'])==data['meta']['fileCount']==238
assert sum(f['kind']!='image' for f in data['files'])==236
assert len([f for f in data['files'] if f['path'].endswith('/SKILL.md')])==15
fail=[]
for file in data['files']:
    original=paths[file['path']].read_bytes()
    assert hashlib.sha256(original).hexdigest()==file['sha256']
    assert file['role'] and file['why'] and file['borrow'],file['path']
    for link in file['related']: assert link in paths,(file['path'],link)
    if file['kind']=='image':
        assert file['image'].startswith('data:image/')
        continue
    assert file['source'].encode()==original,file['path']
    covered=set()
    lines=file['source'].splitlines()
    for block in file['blocks']:
        assert block['source']=='\n'.join(lines[block['start']-1:block['end']])
        covered.update(range(block['start']-1,block['end']))
        assert block['zh'].strip(),(file['path'],block['id'])
        if re.search(r'ZXQCODE\d+QXZ|\[\[CNSEG\d+\]\]',block['zh'],re.I):
            fail.append((file['path'],block['id'],'unresolved translation placeholder'))
    assert all(not line.strip() or i in covered for i,line in enumerate(lines)),file['path']
assert not fail,fail[:20]
html=(ROOT/'index.html').read_text()
assert 'window.SUPERPOWERS_CN=' in html
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)=["\']https?://',html,re.I)
assert (SOURCE/'LICENSE').read_text() in data['files'][[f['path'] for f in data['files']].index('LICENSE')]['source']
print('PASS: 238 files retained, 236 texts, 15 core Skills; all nonblank source lines covered, all Chinese blocks present, related paths valid, inert source, no remote script/style dependency.')
