"""Build offline Chinese counterparts from PUBLIC upstream text, with a resumable cache."""
import concurrent.futures
import hashlib
import json
import re
import ssl
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYSTEM_CERT = Path('/etc/ssl/cert.pem')
CONTEXT = ssl.create_default_context(cafile=str(SYSTEM_CERT) if SYSTEM_CERT.exists() else None)
CACHE_PATH = ROOT/'content/translation_cache.json'
LOCK = threading.Lock()
TERMS = ['Superpowers', 'SKILL.md', 'Claude Code', 'Codex', 'OpenCode', 'Gemini',
         'using-superpowers', 'writing-skills', 'brainstorming', 'writing-plans',
         'executing-plans', 'subagent-driven-development', 'systematic-debugging',
         'test-driven-development', 'verification-before-completion', 'using-git-worktrees',
         'requesting-code-review', 'receiving-code-review', 'finishing-a-development-branch',
         'dispatching-parallel-agents', 'diagnosing-superpowers']


def protect(text):
    placeholders = {}
    def save(match):
        token = 'ZXQCODE'+str(len(placeholders)).zfill(4)+'QXZ'
        placeholders[token] = match.group(0)
        return token
    text = re.sub(r'`[^`\n]+`|https?://[^\s)\]>]+|</?[A-Za-z][^>\n]*>', save, text)
    for term in sorted(TERMS, key=len, reverse=True):
        text = re.sub(re.escape(term), save, text)
    for term in ['skills','skill']:
        text = re.sub(r'\b'+term+r'\b', save, text, flags=re.I)
    return text, placeholders


def request(text):
    url = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode(
        {'client':'gtx','sl':'en','tl':'zh-CN','dt':'t','q':text})
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=CONTEXT, timeout=40) as response:
        result = json.load(response)
    translated = ''.join(x[0] for x in result[0] if x and x[0])
    if not translated:
        raise ValueError('empty translation')
    return translated


def pieces(text, limit=1800):
    result = []
    while len(text) > limit:
        cut = max(text.rfind('\n',0,limit), text.rfind('. ',0,limit),text.rfind(' ',0,limit))
        if cut < limit//3:
            cut = limit
        result.append(text[:cut])
        text = text[cut:]
    if text: result.append(text)
    return result


def translate_one(text):
    protected, tokens = protect(text)
    out = '\n'.join(request(s) for s in pieces(protected))
    for key,value in tokens.items():
        # The translation service sometimes inserts whitespace in a protected token.
        out = re.sub(r'\s*'.join(re.escape(ch) for ch in key), lambda m:value, out, flags=re.I)
    return out.replace('您的伴侣','用户（协作伙伴）').replace('人类伙伴','用户（协作伙伴）')


def translate_batch(batch):
    q = ''
    protected = []
    for i,(_,text) in enumerate(batch):
        content,tokens = protect(text)
        protected.append(tokens)
        q += f'[[CNSEG{i:06d}]]\n{content}\n\n'
    raw = request(q)
    pattern = r'\[\[\s*CNSEG\s*(\d{6})\s*\]\]'
    markers = list(re.finditer(pattern, raw, re.I))
    if len(markers) != len(batch):
        return {key:translate_one(text) for key,text in batch}
    output = {}
    for i,m in enumerate(markers):
        if int(m.group(1)) != i:
            raise ValueError('segment order mismatch')
        end = markers[i+1].start() if i+1 < len(markers) else len(raw)
        translated = raw[m.end():end].strip()
        for key,value in protected[i].items():
            translated = re.sub(r'\s*'.join(re.escape(ch) for ch in key),lambda m:value,translated,flags=re.I)
        if not translated:
            raise ValueError('missing segment')
        output[batch[i][0]] = translated
    return output


def main():
    data = json.loads((ROOT/'content/corpus.json').read_text())
    cache = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}
    requests = {}
    for file in data['files']:
        for block in file['blocks']:
            text = block.get('translateSource','').strip()
            if text and re.search(r'[A-Za-z]{3}', text):
                if block['kind']=='prose':
                    text=re.sub(r'(?<![.!?:>])\n(?=[A-Za-z`(*])', ' ', text)
                    text=text.replace('your human partner', '用户（协作伙伴）').replace('human partner', '用户（协作伙伴）')
                key = hashlib.sha256(('v2|'+text).encode()).hexdigest()
                block['translationKey'] = key
                if key not in cache: requests[key] = text
    batches=[]
    current=[]
    count=0
    for item in requests.items():
        if len(item[1]) > 2500:
            if current: batches.append(current); current=[]; count=0
            batches.append([item]); continue
        if current and (count+len(item[1]) > 3000 or len(current)>=12):
            batches.append(current); current=[]; count=0
        current.append(item); count+=len(item[1])+30
    if current: batches.append(current)
    print(f'Unique requests: {len(requests)}, batches: {len(batches)}, cached: {len(cache)}',flush=True)
    failed=[]
    def run(batch):
        for attempt in range(5):
            try:
                if len(batch)==1:
                    return {batch[0][0]:translate_one(batch[0][1])}
                return translate_batch(batch)
            except Exception as exc:
                if attempt==4: return {'error':str(exc),'keys':[x[0] for x in batch]}
                time.sleep(min(2**attempt,8))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures=[pool.submit(run,b) for b in batches]
        for done,future in enumerate(concurrent.futures.as_completed(futures),1):
            result=future.result()
            if 'error' in result: failed.append(result)
            else: cache.update(result)
            if done%15==0 or done==len(batches):
                CACHE_PATH.write_text(json.dumps(cache,ensure_ascii=False))
                print(f'Translated batches {done}/{len(batches)}; failed {len(failed)}',flush=True)
    missing=[]
    for file in data['files']:
        for block in file['blocks']:
            key=block.get('translationKey')
            if key:
                if key not in cache: missing.append(file['path']+':'+block['id']); continue
                if block['kind'] in {'code','config'}:
                    block['commentZh']=cache[key]
                else:
                    block['zh']=cache[key]
            elif block['kind'] not in {'code','config'}:
                block['zh']=block['source']
    CACHE_PATH.write_text(json.dumps(cache,ensure_ascii=False))
    (ROOT/'content/translated_corpus.json').write_text(json.dumps(data,ensure_ascii=False))
    (ROOT/'content/translation_report.json').write_text(json.dumps({'batches':len(batches),'unique':len(cache),'failed':failed,'missing':missing},ensure_ascii=False,indent=2))
    print('Missing translations:',len(missing),flush=True)
    if missing: raise SystemExit(1)


if __name__=='__main__': main()
