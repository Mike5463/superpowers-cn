"""Prepare a pinned, inert source corpus. Never execute the studied repository."""
import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'source/superpowers'
if not SOURCE.exists():
    raise SystemExit('Missing source/superpowers snapshot')
COMMIT = 'bb92a77741419a4ab5f06e711a283343f1ada0c3'


def split_document(text):
    lines = text.splitlines()
    blocks = []
    i = 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        start = i
        fence = re.match(r'^\s*(`{3,}|~{3,})', lines[i])
        if fence:
            token = fence.group(1)
            i += 1
            while i < len(lines):
                if re.match(r'^\s*' + re.escape(token), lines[i]):
                    i += 1
                    break
                i += 1
            kind = 'code'
        elif i == 0 and lines[i].strip() == '---':
            i += 1
            while i < len(lines):
                if lines[i].strip() == '---':
                    i += 1
                    break
                i += 1
            kind = 'config'
        elif re.match(r'^#{1,6}\s', lines[i]):
            i += 1
            kind = 'heading'
        elif lines[i].lstrip().startswith('|'):
            i += 1
            while i < len(lines) and lines[i].lstrip().startswith('|') and i-start < 8:
                i += 1
            kind = 'table'
        else:
            i += 1
            while i < len(lines) and lines[i].strip():
                if re.match(r'^\s*(`{3,}|~{3,})|^#{1,6}\s', lines[i]):
                    break
                if sum(len(x) for x in lines[start:i+1]) > 2300:
                    break
                i += 1
            kind = 'prose'
        blocks.append({'id': f'b{len(blocks)+1:04d}', 'start': start+1,
                       'end': i, 'kind': kind, 'source': '\n'.join(lines[start:i]),
                       'zh': '', 'explanation': '', 'label': ''})
    return blocks


def split_code(text):
    lines = text.splitlines()
    blocks = []
    start = 0
    while start < len(lines):
        while start < len(lines) and not lines[start].strip():
            start += 1
        if start >= len(lines):
            break
        end = start+1
        while end < len(lines) and lines[end].strip() and end-start < 65:
            end += 1
        blocks.append({'id': f'b{len(blocks)+1:04d}', 'start': start+1, 'end': end,
                       'kind': 'code', 'source': '\n'.join(lines[start:end]),
                       'zh': '', 'explanation': '', 'label': ''})
        start = end
    return blocks


def comments_and_strings(source):
    parts = []
    for line in source.splitlines():
        m = re.match(r'^\s*(?:#(?![!#])|//|/\*|\*(?!/))\s*(.+)', line)
        if m and re.search(r'[A-Za-z]{3}', m.group(1)):
            parts.append(m.group(1))
    # Natural-language descriptions/messages remain separate from executable identifiers.
    for m in re.finditer(r'[\"\']([^\"\'\n]{8,700})[\"\']', source):
        s = m.group(1)
        if len(re.findall(r'\b[A-Za-z]{2,}\b', s)) >= 4 and ' ' in s:
            if not re.search(r'[{};]|^https?://', s):
                parts.append(s)
    return '\n'.join(dict.fromkeys(parts))[:9000]


def main():
    files = []
    for path in sorted(SOURCE.rglob('*')):
        if not path.is_file() or '.git' in path.relative_to(SOURCE).parts:
            continue
        relative = path.relative_to(SOURCE).as_posix()
        raw = path.read_bytes()
        item = {'id': relative, 'path': relative, 'category': relative.split('/')[0]
                if '/' in relative else '根目录', 'title': relative, 'role': '',
                'why': '', 'borrow': '', 'related': [], 'sha256': hashlib.sha256(raw).hexdigest()}
        try:
            text = raw.decode('utf-8')
            if '\x00' in text:
                raise UnicodeDecodeError('utf8', raw, 0, 1, 'binary')
            item['source'] = text
            is_document = path.suffix in {'.md', '.txt'} or path.name == 'LICENSE'
            item['kind'] = 'document' if is_document else 'code'
            item['blocks'] = split_document(text) if is_document else split_code(text)
            for block in item['blocks']:
                if block['kind'] in {'code', 'config'}:
                    block['translateSource'] = comments_and_strings(block['source'])
                else:
                    block['translateSource'] = block['source']
        except UnicodeDecodeError:
            item.update(kind='image', source='', blocks=[])
        if path.suffix in {'.png', '.svg'}:
            mime = 'image/png' if path.suffix == '.png' else 'image/svg+xml'
            item['image'] = 'data:'+mime+';base64,'+base64.b64encode(raw).decode()
        files.append(item)
    data = {'meta': {'commit': COMMIT, 'version': '7.0.0', 'fileCount': len(files),
                    'textCount': sum(f['kind'] != 'image' for f in files),
                    'date': '2026-10-12', 'translationMethod': '机器翻译辅助；AI 补充文件用途和核心规则解读，重点段落额外校对。不是官方译文或全部人工审校版，原文完整保留。'},
            'folders': [], 'files': files, 'guide': {}, 'glossary': []}
    output = ROOT/'content/corpus.json'
    output.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(f"Prepared {len(files)} files, {sum(len(f['blocks']) for f in files)} blocks")


if __name__ == '__main__':
    main()
