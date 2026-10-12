"""Merge annotations and build a self-contained, offline HTML reader."""
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def code_summary(block,file):
    source=block['source']
    descriptions=[]
    if block['kind']=='config' and source.lstrip().startswith('---'):
        return '这是 Skill 的文件头。name 是技能名称，description 说明使用时机；字段名保持英文，具体操作规则放在正文。'
    if source.lstrip().startswith('#!'):
        descriptions.append('指定执行脚本的解释器，并准备运行环境。')
    if re.search(r'^\s*(?:import |from \S+ import |const .*require\(|export )',source,re.M):
        descriptions.append('声明依赖或导出接口，让这段代码能够使用其他模块的能力。')
    names=re.findall(r'(?:function\s+|def\s+|(?:const|let)\s+)([A-Za-z_$][\w$]*)\s*(?:\(|=\s*(?:async\s*)?\()',source)
    names+=re.findall(r'^([A-Za-z_][\w]*)\s*\(\)\s*\{',source,re.M)
    if names: descriptions.append('定义 '+ '、'.join(dict.fromkeys(names))+'，封装后面可以复用的一段操作。')
    commands=[
        (r'git\s+worktree\s+add','创建独立 Git 工作目录。'),
        (r'git\s+push','将本地 Git 内容推送到远程仓库；这是有外部写入效果的操作。'),
        (r'gh\s+pr\s+create','创建 GitHub Pull Request；学习页面不会执行此命令。'),
        (r'git\s+commit','将当前改动记录为一个 Git 提交。'),
        (r'git\s+clone','下载 Git 仓库到本地。'),
        (r'git\s+diff','比较 Git 文件或版本之间的差异。'),
        (r'git\s+status','检查工作目录和暂存区的状态。'),
        (r'git\s+merge','合并 Git 分支的历史和改动。'),
        (r'git\s+worktree\s+remove','移除独立工作目录；执行前需要确认其中的工作是否保留。'),
        (r'\b(?:assert\b|expect\(|assertEqual\(|assertTrue\()','检查实际结果是否符合测试预期。'),
        (r'\b(?:readFileSync|readFile|read_text|open\()','读取文件内容，供后续判断或处理。'),
        (r'\b(?:writeFileSync|writeFile|write_text)','将处理结果写入文件。'),
        (r'JSON\.(?:parse|stringify)|json\.(?:load|dump)','在结构化数据和 JSON 文本之间转换。'),
        (r'\b(?:mktemp|TemporaryDirectory)\b','创建临时工作位置，将测试或处理中间文件隔离。'),
        (r'\b(?:curl|fetch\(|urllib)\b','访问外部地址并获取返回内容。'),
        (r'\b(?:pytest|npm test|node --test|unittest)\b','运行测试，检查行为是否符合预期。'),
        (r'\b(?:tar|zip|ZipFile)\b','打包或处理归档文件。'),
    ]
    for pattern,text in commands:
        if re.search(pattern,source): descriptions.append(text)
    if re.search(r'^\s*(?:if\b|elif\b|else\b|case\b)',source,re.M):
        descriptions.append('根据条件选择不同路径；具体条件保留在对应英文代码中。')
    if re.search(r'^\s*(?:for\b|while\b)|\.forEach\(',source,re.M):
        descriptions.append('重复处理一组数据或等待条件变化。')
    if re.search(r'^\s*(?:return\b|exit\b|raise\b)',source,re.M):
        descriptions.append('返回处理结果，或通过退出/异常报告不能继续的情况。')
    if not descriptions:
        if source.lstrip().startswith(('{','[')) or file['path'].endswith(('.json','.yaml','.yml')):
            descriptions.append('声明配置值，让调用它的平台或工具知道如何识别和使用这个组件。')
        elif all(not l.strip() or re.match(r'^\s*(?:#|//|\*|/\*)',l) for l in source.splitlines()):
            descriptions.append('这一段是注释，用来说明设计背景、注意事项或执行意图。')
        else:
            descriptions.append('这是本文件逻辑的一部分。结合下面的注释译文和完整上下文理解它，原文代码保持不变。')
    return ' '.join(dict.fromkeys(descriptions))


def main():
    data=json.loads((ROOT/'content/translated_corpus.json').read_text())
    inventory=json.loads((ROOT/'content/inventory_notes.json').read_text())
    core=json.loads((ROOT/'content/core_notes.json').read_text())
    data['folders']=inventory['folders']
    data['guide']=core.get('guide',{})
    data['glossary']=core.get('glossary',[])
    fix_path=ROOT/'content/translation_fixes.json'
    fixes=json.loads(fix_path.read_text()).get('fixes',[]) if fix_path.exists() else []
    fix_index={(f['path'],f['blockId']):f['zh'] for f in fixes}
    stats={'translationFixes':len(fixes),'files':len(data['files']),'blocks':0,'prose':0,'code':0,'coreNotes':0,'fileNotes':0}
    matching=[]
    for file in data['files']:
        note=inventory['files'][file['path']]
        for key in ['title','role','why','borrow','related']:
            file[key]=note.get(key,file.get(key))
        if file['path'].startswith(('docs/plans/','docs/superpowers/plans/','docs/superpowers/specs/')):
            file['historical']=True
        if file['path'] in core.get('files',{}):
            file['intro']=core['files'][file['path']].get('intro','')
            file['takeaway']=core['files'][file['path']].get('takeaway','')
        for block in file['blocks']:
            stats['blocks']+=1
            if block['kind'] in {'code','config'}:
                stats['code']+=1
                block['zh']=code_summary(block,file)
                for cn in note.get('codeNotes',[]):
                    if cn['match'] in block['source']:
                        block['explanation']+=' '+cn['explanation']
                        block['label']=cn.get('label',block['label'])
                        stats['fileNotes']+=1
                if block.get('commentZh'):
                    block['zh']+='\n\n注释与提示的对应中文：\n'+block['commentZh']
            else:
                stats['prose']+=1
            for cn in core.get('files',{}).get(file['path'],{}).get('notes',[]):
                if cn.get('blockId',block['id'])==block['id'] and cn['match'] in block['source']:
                    if cn.get('zh') and block['source'].strip()==cn['match'].strip(): block['zh']=cn['zh']
                    block['explanation']+=' '+cn.get('explanation','')
                    block['label']=cn.get('label',block['label'])
                    stats['coreNotes']+=1
                    matching.append(file['path']+':'+cn['match'])
            if (file['path'],block['id']) in fix_index:
                block['zh']=fix_index[(file['path'],block['id'])]
            block['explanation']=block['explanation'].strip()
            if not block['zh'].strip(): raise ValueError('Empty Chinese block: '+file['path']+':'+block['id'])
            for key in ['translateSource','translationKey','commentZh']:
                block.pop(key,None)
    data['meta']['coverage']=stats
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    # All source is inert even when it contains literal script closing tags or HTML.
    payload=payload.replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    template=(ROOT/'app/index.template.html').read_text()
    html=template.replace('<!-- STYLE -->','<style>\n'+(ROOT/'app/style.css').read_text()+'\n</style>')
    html=html.replace('<!-- DATA -->','<script>window.SUPERPOWERS_CN='+payload+';</script>')
    html=html.replace('<!-- APP -->','<script>\n'+(ROOT/'app/app.js').read_text()+'\n</script>')
    if any(token in html for token in ['<!-- STYLE -->','<!-- DATA -->','<!-- APP -->']):
        raise ValueError('Unresolved template slot')
    (ROOT/'content/reader_data.json').write_text(json.dumps(data,ensure_ascii=False))
    (ROOT/'content/build_report.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
    (ROOT/'dist').mkdir(exist_ok=True)
    (ROOT/'dist/index.html').write_text(html)
    (ROOT/'index.html').write_text(html)
    print(json.dumps(stats,ensure_ascii=False))
    print('Offline HTML bytes:',len(html.encode()))


if __name__=='__main__': main()
