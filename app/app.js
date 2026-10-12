(() => {
  'use strict';
  const data = window.SUPERPOWERS_CN || {};
  const files = Array.isArray(data.files) ? data.files.filter(file => file && typeof file.path === 'string') : [];
  const folders = Array.isArray(data.folders) ? data.folders.filter(folder => folder && typeof folder.path === 'string') : [];
  const meta = data.meta || {};
  const byPath = new Map(files.map(file => [file.path, file]));
  const byId = new Map(files.map(file => [String(file.id), file]));
  const folderByPath = new Map(folders.map(folder => [String(folder.path || '').replace(/\/$/, ''), folder]));
  const view = document.getElementById('view');
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');
  const tree = document.getElementById('file-tree');
  const treeFilter = document.getElementById('tree-filter');
  const menuToggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('drawer-backdrop');
  let route = {};
  let toastTimer;
  let searchTimer;
  let shownBlocks = 15;
  let readSet = new Set();
  let wizardStep = 0;
  let wizard = {name: '', when: '', steps: '', done: ''};
  let drawerFocus;

  const txt = value => value == null ? '' : String(value);
  const el = (tag, attributes = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = txt(value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else if (key === 'checked') node.checked = Boolean(value);
      else if (key === 'value') node.value = txt(value);
      else if (value != null && value !== false) node.setAttribute(key, value === true ? '' : txt(value));
    });
    const append = child => {
      if (Array.isArray(child)) child.forEach(append);
      else if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(txt(child)));
    };
    children.forEach(append);
    return node;
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const paths = {
      arrow: ['M4 12h16', 'm14 6 6 6-6 6'],
      down: ['M12 3v17', 'm6 14 6 6 6-6'],
      file: ['M6 3h8l4 4v14H6z', 'M14 3v5h4', 'M9 12h6M9 16h5'],
      folder: ['M3 6h7l2 2h9v12H3z'],
      download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 17v4h16v-4'],
      copy: ['M9 9h11v12H9z', 'M15 9V3H4v12h5'],
      search: ['M16 16l5 5'],
      link: ['m10 14 4-4', 'M8 15l-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0', 'm16 9 2-2a3.5 3.5 0 0 0-5-5l-4 4a3.5 3.5 0 0 0 0 5']
    };
    if (name === 'search') {
      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', '10.5'); circle.setAttribute('cy', '10.5'); circle.setAttribute('r', '6.5');
      svg.append(circle);
    }
    (paths[name] || paths.file).forEach(d => {
      const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path);
    });
    return svg;
  };
  const fileHash = (path, block) => '#file=' + encodeURIComponent(path) + (block ? '&block=' + encodeURIComponent(block) : '');
  const folderHash = path => '#folder=' + encodeURIComponent(path);
  const fileLink = (path, label, className = 'file-link') => el('a', {href: fileHash(path), class: className}, label || path);
  const button = (label, handler, className = 'secondary-button') => el('button', {type: 'button', class: className, onclick: handler}, label);
  const go = hash => {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  };
  const notify = message => {
    const toast = document.getElementById('toast');
    clearTimeout(toastTimer); toast.textContent = message; toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  };
  const store = (key, value) => { try { localStorage.setItem('superpowers-cn-' + key, JSON.stringify(value)); } catch (_) {} };
  const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem('superpowers-cn-' + key)) || fallback; } catch (_) { return fallback; } };
  const normalize = value => txt(value).normalize('NFKC').toLocaleLowerCase();
  const sourceURL = path => 'https://github.com/obra/superpowers/blob/' + encodeURIComponent(meta.commit || 'bb92a77741419a4ab5f06e711a283343f1ada0c3') + '/' + path.split('/').map(encodeURIComponent).join('/');
  const blocksOf = file => Array.isArray(file.blocks) ? file.blocks : [];
  const blockId = (block, index) => txt(block.id || 'b' + String(index + 1).padStart(4, '0'));
  const domBlockId = (block, index) => 'block-' + blockId(block, index).replace(/[^a-zA-Z0-9_-]/g, '-');
  const historical = file => Boolean(file.historical) || /docs\/(plans|superpowers\/(plans|specs))\//.test(file.path) || file.path === 'RELEASE-NOTES.md' || /历史|history/i.test(txt(file.category));
  const folderName = path => {
    const entry = folderByPath.get(path);
    return entry ? txt(entry.name || '') : '';
  };
  const restoredRead = readStore('read-' + txt(meta.commit), []);
  readSet = new Set((Array.isArray(restoredRead) ? restoredRead : []).filter(value => typeof value === 'string'));
  const restoredWizard = readStore('wizard', {});
  for (const key of Object.keys(wizard)) wizard[key] = txt(restoredWizard[key]);

  function closeDrawer() {
    sidebar.classList.remove('drawer-open'); backdrop.hidden = true; menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal');
    if (window.innerWidth <= 760) sidebar.setAttribute('inert', '');
    if (drawerFocus) drawerFocus.focus();
  }
  function openDrawer() {
    drawerFocus = document.activeElement; sidebar.removeAttribute('inert'); sidebar.classList.add('drawer-open');
    sidebar.setAttribute('role', 'dialog'); sidebar.setAttribute('aria-modal', 'true'); backdrop.hidden = false;
    menuToggle.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
    document.getElementById('menu-close').focus();
  }
  menuToggle.addEventListener('click', openDrawer);
  document.getElementById('menu-close').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) { sidebar.removeAttribute('inert'); if (sidebar.classList.contains('drawer-open')) closeDrawer(); }
    else if (!sidebar.classList.contains('drawer-open')) sidebar.setAttribute('inert', '');
  });
  if (window.innerWidth <= 760) sidebar.setAttribute('inert', '');
  document.addEventListener('keydown', event => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (event.key === 'Escape' && sidebar.classList.contains('drawer-open')) closeDrawer();
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); go('#view=search'); }
    if (event.key === 'Tab' && sidebar.classList.contains('drawer-open')) {
      const focusable = [...sidebar.querySelectorAll('a, button, input, summary')].filter(node => node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  function renderTree() {
    const query = normalize(treeFilter.value).trim();
    tree.replaceChildren();
    if (query) {
      const matches = files.filter(file => normalize([file.path, file.title, file.role].join(' ')).includes(query));
      if (!matches.length) tree.append(el('p', {class: 'sidebar-caption'}, '没有对应文件。试试「调试」或「SKILL」。'));
      matches.forEach(file => tree.append(treeFile(file, file.path)));
      return;
    }
    const root = {children: new Map(), files: []};
    files.forEach(file => {
      const parts = file.path.split('/'); parts.pop(); let node = root, current = '';
      parts.forEach(part => {
        current = current ? current + '/' + part : part;
        if (!node.children.has(part)) node.children.set(part, {path: current, children: new Map(), files: []});
        node = node.children.get(part);
      });
      node.files.push(file);
    });
    const priority = path => path === 'skills' ? -3 : path === 'hooks' ? -2 : path === 'docs' ? -1 : 0;
    function renderNode(node, container) {
      [...node.children.entries()].sort((a, b) => priority(a[0]) - priority(b[0]) || a[0].localeCompare(b[0])).forEach(([name, child]) => {
        const active = route.file && route.file.startsWith(child.path + '/');
        const open = active || child.path === 'skills';
        const details = el('details', {class: 'tree-folder', open});
        const label = el('span', {class: 'tree-folder-name'}, name);
        const chinese = folderName(child.path);
        if (chinese && chinese !== name) label.append(el('span', {class: 'tree-folder-cn'}, chinese));
        details.append(el('summary', {}, icon('folder'), label));
        const children = el('div', {class: 'tree-children'});
        children.append(el('a', {href: folderHash(child.path), class: 'folder-read'}, '了解这个目录的作用'));
        renderNode(child, children); details.append(children); container.append(details);
      });
      node.files.sort((a, b) => a.path.localeCompare(b.path)).forEach(file => container.append(treeFile(file, file.path.split('/').pop())));
    }
    renderNode(root, tree);
  }
  function treeFile(file, label) {
    const selected = route.file === file.path;
    const link = el('a', {href: fileHash(file.path), class: 'tree-file' + (selected ? ' active' : ''), title: txt(file.title || file.role || file.path)}, icon('file'), el('span', {}, label));
    if (selected) link.setAttribute('aria-current', 'page');
    return link;
  }
  treeFilter.addEventListener('input', renderTree);
  sidebar.addEventListener('click', event => { if (event.target.closest('a') && sidebar.classList.contains('drawer-open')) closeDrawer(); });
  document.getElementById('file-count').textContent = `${files.length || meta.fileCount || 0} 个文件 · 逐段中英对照`;
  document.getElementById('snapshot-label').textContent = 'v' + (meta.version || '7.0.0') + ' · ' + txt(meta.commit || '').slice(0, 7);

  function provenance() {
    return el('div', {class: 'provenance'},
      el('p', {}, '阅读依据：', el('a', {href: 'https://github.com/obra/superpowers/tree/' + (meta.commit || 'bb92a77741419a4ab5f06e711a283343f1ada0c3'), target: '_blank', rel: 'noopener noreferrer'}, 'obra/superpowers 固定提交 ' + txt(meta.commit || 'bb92a77').slice(0, 7)), '。保留原始文件名、字段名与命令，中文释义辅助理解。'),
      el('p', {}, txt(meta.translationMethod || '中文释义与原始源码分开呈现；教学解释用于理解设计，不是可执行源码。')),
      el('p', {}, '独立中文学习项目，与原作者没有官方关联。源码使用 MIT 许可证。', fileLink('LICENSE', '查看许可与版权', ''))
    );
  }
  function pageHeader(title, lead) { view.append(el('h1', {}, title), lead ? el('p', {class: 'page-lead'}, lead) : null); }

  function renderStart() {
    const intro = el('section', {class: 'intro'},
      el('div', {class: 'meta-line'}, el('span', {class: 'tag'}, '中文源码学习手册'), el('span', {}, 'Superpowers v' + (meta.version || '7.0.0')), el('span', {}, (files.length || 238) + ' 个文件')),
      el('h1', {}, '读懂 Superpowers，', el('br'), '写出你的第一个 Skill。'),
      el('p', {class: 'page-lead'}, '先看项目的骨架，再读中文译注。每一段都能展开英文原文，知道它做什么，也知道为什么这样写。'),
      el('a', {href: '#view=map', class: 'primary-button'}, '第一步：看懂项目地图', icon('arrow'))
    );
    view.append(intro, el('h2', {}, '按这条路线，慢慢读'));
    const lessons = [
      ['看全貌：它是一套做事方法', '分清入口、Skills 和辅助资料，先知道它们怎样连起来。', '#view=map'],
      ['读一个 Skill：从「何时用」开始', '入口 Skill 会告诉助手如何发现方法，以及什么时候该读取。', fileHash('skills/using-superpowers/SKILL.md')],
      ['理解协作：把任务交给不同角色', '看任务怎样拆开、怎样检查，再决定自己的 Skill 是否需要这种流程。', fileHash('skills/subagent-driven-development/SKILL.md')],
      ['动手仿写：先做一个最小 Skill', '填写名称、使用时机和规则，预览并下载你的 SKILL.md。', '#view=workshop']
    ];
    const list = el('ol', {class: 'lesson-list'});
    lessons.forEach(([title, description, href], i) => {
      const arrow = icon('arrow'); arrow.classList.add('lesson-arrow');
      list.append(el('li', {}, el('a', {href, class: 'lesson lesson-link'}, el('span', {class: 'lesson-count'}, i + 1), el('div', {}, el('h3', {}, title), el('p', {}, description)), arrow)));
    });
    view.append(list, el('h2', {}, '先认识三个词'));
    const table = el('table', {class: 'concept-table'});
    const tbody = el('tbody');
    [['Skill', '一种可复用的做事方法', '例如：先复现问题，再定位原因，最后验证修复。'], ['SKILL.md', '方法的说明书', '开头告诉 AI 何时使用，正文写具体步骤和完成标准。'], ['Plugin · 插件', '把方法接到助手里的包装', '同一套 Skills 可以用不同平台的配置来接入。']].forEach(([term, plain, meaning]) => tbody.append(el('tr', {}, el('th', {scope: 'row'}, term), el('td', {}, plain, el('br'), meaning))));
    table.append(tbody); view.append(table);
    view.append(el('p', {class: 'quote-rule'}, '先写好一个 Skill，再考虑把多个 Skill 组合成流程。'));
    view.append(provenance());
  }

  const platformInfo = {
    claude: {name: 'Claude Code', path: '.claude-plugin/plugin.json', hook: 'hooks/session-start', summary: '插件配置带来接入信息；SessionStart 钩子读取 using-superpowers，把入口规则放进会话上下文。', entry: '会话启动钩子', edge: '注入入口规则'},
    codex: {name: 'Codex', path: '.codex-plugin/plugin.json', hook: '.codex-plugin/plugin.json', summary: 'Codex 插件声明 skills 目录。这个插件配置里的 hooks 是空对象，因此这里通过 Skills 发现机制读取方法。', entry: '声明 Skills 目录', edge: '发现与读取'},
    opencode: {name: 'OpenCode', path: '.opencode/INSTALL.md', hook: '.opencode/plugins/superpowers.js', summary: 'OpenCode 的插件在会话相关事件中提供入口上下文；具体工具适配要查看对应的安装文档与插件源码。', entry: 'OpenCode 插件', edge: '提供入口上下文'}
  };
  function renderMap() {
    pageHeader('项目地图：规则是怎样用起来的？', '这是按职责画的阅读地图。点击节点打开对应文件；先看一条入口路径，再看各个 Skill 怎样分工。');
    const chooser = el('div', {class: 'map-tools', role: 'group', 'aria-label': '查看平台接入路径'});
    const diagramContainer = el('div');
    let selectedPlatform = 'claude';
    const draw = key => {
      selectedPlatform = key;
      [...chooser.children].forEach(node => { const selected = node.dataset.platform === key; node.classList.toggle('selected', selected); node.setAttribute('aria-pressed', selected); });
      const item = platformInfo[key];
      diagramContainer.replaceChildren(el('p', {class: 'map-platform-description'}, item.summary));
      const outer = el('div', {class: 'diagram-scroll', 'aria-label': item.name + ' 入口和 Skills 的关系图', tabindex: '0'});
      const diagram = el('div', {class: 'diagram'});
      const node = (title, sub, path) => el('button', {class: 'diagram-node', type: 'button', onclick: () => go(fileHash(path)), 'aria-label': title + '，阅读 ' + path}, el('strong', {}, title), el('span', {}, sub), el('code', {}, path));
      const connect = label => el('div', {class: 'diagram-connect'}, icon('down'), el('span', {}, label));
      diagram.append(el('div', {class: 'diagram-row single'}, node(item.name + ' 接入层', '告诉平台：项目在哪里，提供哪些能力', item.path)), connect('平台读取配置'));
      diagram.append(el('div', {class: 'diagram-row single'}, node(item.entry, key === 'codex' ? '由插件声明 ./skills/，按需发现规则' : '把入口说明提供给会话', item.hook)), connect(item.edge));
      diagram.append(el('div', {class: 'diagram-row single'}, node('入口 Skill', '先判断哪些方法适用，再读取它们', 'skills/using-superpowers/SKILL.md')), connect('按当前任务选择'));
      diagram.append(el('div', {class: 'diagram-row'},
        node('需求与规划', '想清楚要做什么，再拆成步骤', 'skills/brainstorming/SKILL.md'),
        node('执行与协作', '逐步执行，或委派子任务', 'skills/subagent-driven-development/SKILL.md'),
        node('测试与验证', '定位问题，验证后再宣布完成', 'skills/verification-before-completion/SKILL.md')
      ));
      diagram.append(connect('方法按需引用'));
      diagram.append(el('div', {class: 'diagram-row'},
        node('规划说明书', '把实施步骤写成可执行的计划', 'skills/writing-plans/SKILL.md'),
        node('角色提示词', '明确实现者的职责和交付方式', 'skills/subagent-driven-development/implementer-prompt.md'),
        node('排错方法', '先找原因，再验证修复', 'skills/systematic-debugging/SKILL.md')
      ));
      outer.append(diagram); diagramContainer.append(outer, el('p', {class: 'map-caption'}, '箭头表示信息和方法的使用关系，具体执行顺序会随任务变化。tests/ 和 scripts/ 主要支持开发维护。'));
    };
    Object.entries(platformInfo).forEach(([key, item]) => { const control = button(item.name, () => draw(key), 'segmented-button'); control.dataset.platform = key; chooser.append(control); });
    view.append(chooser, diagramContainer); draw(selectedPlatform);
    view.append(el('h2', {}, '每个目录为什么存在？'), el('p', {class: 'page-lead'}, '做自己的第一个 Skill 时，不需要照搬整个项目。下面把方法本体、接入配置和开发维护分别讲清楚。'));
    const list = el('div', {class: 'folder-list'});
    const topFolders = folders.filter(folder => { const path = txt(folder.path).replace(/\/$/, ''); return path && !path.includes('/'); });
    topFolders.sort((a, b) => (a.path === 'skills' ? -1 : b.path === 'skills' ? 1 : a.path.localeCompare(b.path))).forEach(folder => {
      const path = txt(folder.path).replace(/\/$/, '');
      list.append(el('div', {class: 'folder-row'},
        el('div', {}, el('h3', {}, el('a', {href: folderHash(path)}, folder.name || path)), el('div', {class: 'folder-path'}, path + '/'), folder.need ? el('span', {class: 'need-label'}, folder.need) : null),
        el('div', {}, el('p', {}, folder.summary || '查看目录下文件的中文用途说明。'), folder.why ? el('p', {class: 'folder-why'}, '为什么分开：' + folder.why) : null)
      ));
    });
    if (!topFolders.length) list.append(el('p', {}, '目录说明正在整理。你仍可以从左侧树打开每个文件。'));
    view.append(list, provenance());
  }

  function renderSourceIndex() {
    pageHeader('中文源码：从一个文件读起', '左侧目录保留原项目结构，包括以点开头的隐藏目录。每个文件先讲用途，再逐段看中文释义。');
    view.append(el('h2', {}, '推荐的第一组文件'));
    const recommended = [
      ['README.md', '项目总说明', '先了解它解决什么问题，以及完整工作流。'],
      ['skills/using-superpowers/SKILL.md', '入口 Skill', '理解 AI 怎样选择和使用其他 Skills。'],
      ['skills/writing-skills/SKILL.md', 'Skill 制作方法', '学习怎样定义触发条件、写规则、验证规则。'],
      ['.codex-plugin/plugin.json', '平台接入配置', '分清方法本体和接入平台需要的包装。']
    ];
    const list = el('ul', {class: 'directory-files'});
    recommended.filter(([path]) => byPath.has(path)).forEach(([path, label, description]) => list.append(el('li', {}, fileLink(path, label + ' · ' + path, ''), el('p', {}, description))));
    view.append(list, el('p', {class: 'notice'}, '不知道文件名时，直接搜索「规划」「调试」「description」等中文或英文词。'), el('a', {href: '#view=search', class: 'secondary-button'}, icon('search'), '搜索全部文件'), provenance());
  }
  function renderFolder(path) {
    const folder = folderByPath.get(path.replace(/\/$/, ''));
    const under = files.filter(file => file.path.startsWith(path.replace(/\/$/, '') + '/'));
    if (!under.length && !folder) return renderError('目录不存在', '这个链接没有对应目录。可以从左侧目录重新选择。');
    view.append(el('div', {class: 'breadcrumbs'}, path + '/'));
    pageHeader(folder && folder.name || '目录说明', folder && folder.summary || '这个目录下的文件都保留原始路径，点击文件阅读对应中文释义。');
    if (folder && folder.why) view.append(el('h2', {}, '为什么这样分开？'), el('p', {}, folder.why));
    if (folder && folder.need) view.append(el('h2', {}, '做自己的 Skill 是否需要？'), el('p', {}, folder.need));
    view.append(el('h2', {}, '这里有哪些文件？'), el('p', {class: 'muted'}, '共 ' + under.length + ' 个文件，包含子目录。'));
    const list = el('ul', {class: 'directory-files'});
    under.forEach(file => list.append(el('li', {}, fileLink(file.path, file.path, ''), el('p', {}, file.title || file.role || '阅读文件的中文释义'))));
    view.append(list);
  }

  function safeHref(href, currentPath) {
    if (/^https?:\/\//i.test(href)) return href;
    if (href.startsWith('#view=') || href.startsWith('#file=') || href.startsWith('#folder=')) return href;
    if (!href || /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) return null;
    const clean = href.split('#')[0].split('?')[0];
    const parts = (currentPath || '').split('/'); parts.pop();
    clean.split('/').forEach(part => { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); });
    const resolved = parts.join('/');
    return byPath.has(resolved) ? fileHash(resolved) : null;
  }
  function inline(text, currentPath) {
    const fragment = document.createDocumentFragment();
    const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\))/g;
    let match, last = 0;
    while ((match = pattern.exec(text))) {
      fragment.append(document.createTextNode(text.slice(last, match.index)));
      const token = match[0];
      if (token.startsWith('`')) fragment.append(el('code', {}, token.slice(1, -1)));
      else if (token.startsWith('**')) fragment.append(el('strong', {}, token.slice(2, -2)));
      else {
        const split = token.lastIndexOf(']('), label = token.slice(1, split), href = safeHref(token.slice(split + 2, -1), currentPath);
        if (href) fragment.append(el('a', {href, ...(href.startsWith('http') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}, label));
        else fragment.append(document.createTextNode(label + '（' + token.slice(split + 2, -1) + '）'));
      }
      last = pattern.lastIndex;
    }
    fragment.append(document.createTextNode(text.slice(last))); return fragment;
  }
  function markdown(text, currentPath) {
    const container = el('div', {class: 'translated'});
    const lines = txt(text).replace(/\r\n/g, '\n').split('\n'); let i = 0;
    const special = line => /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~)/.test(line.trim());
    while (i < lines.length) {
      if (!lines[i].trim()) { i++; continue; }
      const line = lines[i], trim = line.trim();
      if (/^(```|~~~)/.test(trim)) {
        const fence = trim.slice(0, 3), code = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
        i++; container.append(el('pre', {}, el('code', {}, code.join('\n')))); continue;
      }
      const heading = trim.match(/^(#{1,6})\s+(.+)$/);
      if (heading) { container.append(el('h' + Math.min(4, Math.max(2, heading[1].length)), {}, inline(heading[2], currentPath))); i++; continue; }
      if (i + 1 < lines.length && trim.includes('|') && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const splitCells = item => item.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
        const table = el('table'), head = el('tr');
        splitCells(line).forEach(cell => head.append(el('th', {scope: 'col'}, inline(cell, currentPath)))); table.append(el('thead', {}, head)); i += 2;
        const body = el('tbody');
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { const row = el('tr'); splitCells(lines[i++]).forEach(cell => row.append(el('td', {}, inline(cell, currentPath)))); body.append(row); }
        table.append(body); container.append(el('div', {class: 'table-scroll'}, table)); continue;
      }
      if (/^([-*+]\s|\d+[.)]\s)/.test(trim)) {
        const ordered = /^\d/.test(trim), list = el(ordered ? 'ol' : 'ul');
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s/.test(lines[i]) : /^\s*[-*+]\s/.test(lines[i]))) list.append(el('li', {}, inline(lines[i++].trim().replace(/^([-*+]|\d+[.)])\s+/, ''), currentPath)));
        container.append(list); continue;
      }
      if (/^>\s?/.test(trim)) {
        const quotes = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) quotes.push(lines[i++].replace(/^\s*>\s?/, ''));
        container.append(el('blockquote', {}, inline(quotes.join('\n'), currentPath))); continue;
      }
      const paragraph = [line]; i++;
      while (i < lines.length && lines[i].trim() && !special(lines[i]) && !(i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) paragraph.push(lines[i++]);
      container.append(el('p', {}, inline(paragraph.join('\n'), currentPath)));
    }
    return container;
  }

  function download(content, filename, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], {type: mime}); const url = URL.createObjectURL(blob);
    const link = el('a', {href: url, download: filename}); document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function copySource(source, container) {
    try { await navigator.clipboard.writeText(txt(source)); notify('原始源码已复制'); }
    catch (_) {
      const existing = container.querySelector('.copy-fallback'); if (existing) existing.remove();
      const field = el('textarea', {class: 'copy-fallback', readonly: true, 'aria-label': '手动复制原始源码', value: source});
      container.append(field); field.focus(); field.select();
      notify('浏览器限制自动复制，已选中原文，可手动复制');
    }
  }
  const kindLabel = kind => ({markdown: '文档', document: '文档', md: '文档', code: '逻辑块', heading: '标题', paragraph: '段落', list: '列表', table: '表格', image: '图片', config: '配置', text: '文本', json: '配置', yaml: '配置', shell: '脚本'}[kind] || '语段');

  function renderFile(file, blockTarget) {
    const blocks = blocksOf(file);
    const index = blockTarget ? blocks.findIndex((block, i) => blockId(block, i) === blockTarget) : -1;
    shownBlocks = Math.max(15, index + 1);
    view.append(el('div', {class: 'breadcrumbs'}, file.path), el('h1', {class: 'file-title'}, file.title || file.path.split('/').pop()));
    const metaLine = el('div', {class: 'meta-line'}, el('span', {class: 'tag'}, kindLabel(file.kind)), el('span', {}, blocks.length + ' 个语段'), historical(file) ? el('span', {class: 'tag'}, '历史与演进材料') : null);
    view.append(metaLine);
    if (historical(file)) view.append(el('p', {class: 'history-note'}, '这是项目的历史记录或设计过程。它帮助理解演进，不应直接当作当前实现。当前行为请对照对应源码。'));
    const notes = el('dl', {class: 'file-notes'});
    [['做什么', file.role], ['为什么', file.why], ['怎么借鉴', file.borrow]].forEach(([label, value]) => { if (value) notes.append(el('div', {}, el('dt', {}, label), el('dd', {}, value))); });
    if (notes.children.length) view.append(notes);
    if (file.intro) view.append(el('p', {class: 'notice'}, file.intro));
    if (file.takeaway) view.append(el('p', {class: 'quote-rule'}, '先记住：' + file.takeaway));
    const imageURL = typeof file.image === 'string' ? file.image : file.image && (file.image.dataUrl || file.image.src);
    const validImage = imageURL && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(imageURL);
    const actions = el('div', {class: 'file-actions'});
    if (file.source != null && !validImage) actions.append(button([icon('copy'), '复制原文'], () => copySource(file.source, actions)), button([icon('download'), '下载原文'], () => { download(file.source || '', file.path.split('/').pop()); notify('已下载原始文件'); }));
    if (validImage) actions.append(el('a', {href: imageURL, download: file.path.split('/').pop(), class: 'secondary-button'}, icon('download'), '下载原图'));
    actions.append(el('a', {href: sourceURL(file.path), target: '_blank', rel: 'noopener noreferrer', class: 'secondary-button'}, icon('link'), '查看 GitHub 源码'));
    view.append(actions);
    if (validImage) view.append(el('img', {src: imageURL, alt: file.title || file.role || file.path, class: 'image-asset'}));
    const readCheck = el('input', {type: 'checkbox', checked: readSet.has(file.path)});
    readCheck.addEventListener('change', () => { readCheck.checked ? readSet.add(file.path) : readSet.delete(file.path); store('read-' + txt(meta.commit), [...readSet]); notify(readCheck.checked ? '已记下：你读过这个文件' : '已取消阅读标记'); });
    view.append(el('div', {class: 'read-progress'}, el('label', {class: 'read-check'}, readCheck, '标记为已读'), el('span', {}, '阅读标记保存在当前浏览器')));
    if (blocks.length) {
      view.append(el('div', {class: 'reader-heading'}, el('h2', {}, '中文逐段阅读'), el('span', {}, '英文原文按需展开')));
      const reader = el('div', {class: 'reader'}), more = el('div', {class: 'more-blocks'});
      let current = 0;
      const add = count => {
        const until = Math.min(blocks.length, count);
        for (; current < until; current++) reader.append(renderBlock(file, blocks[current], current));
        shownBlocks = current;
        more.replaceChildren();
        if (current < blocks.length) more.append(button('继续看 15 段', () => add(current + 15)), button('查看全部 ' + blocks.length + ' 段', () => add(blocks.length), 'text-button'), el('span', {class: 'muted', style: 'font-size:12px'}, '已显示 ' + current + ' / ' + blocks.length));
        else more.append(el('span', {class: 'muted', style: 'font-size:12px'}, '已读到文件末尾 · 共 ' + blocks.length + ' 段'));
      };
      add(shownBlocks); view.append(reader, more);
    } else if (!imageURL) view.append(el('p', {class: 'notice'}, file.source ? '本文件没有分段释义。可展开完整原文查看。' : '本文件不包含可显示的文本。'));
    if (file.source) view.append(el('details', {class: 'raw-source'}, el('summary', {}, '展开完整英文原文'), el('pre', {}, file.source)));
    const related = (Array.isArray(file.related) ? file.related : []).map(item => typeof item === 'string' ? byPath.get(item) || byId.get(item) : item && byPath.get(item.path)).filter(Boolean);
    if (related.length) view.append(el('h2', {}, '接着读这些文件'), el('div', {class: 'related-files'}, related.map(item => fileLink(item.path, item.title || item.path))));
    view.append(provenance());
    if (blockTarget && index === -1) view.append(el('p', {class: 'notice'}, '这个语段编号不存在，已打开对应文件的开头。'));
    if (index >= 0) requestAnimationFrame(() => { const node = document.getElementById(domBlockId(blocks[index], index)); if (node) { node.classList.add('highlighted'); node.scrollIntoView({block: 'start'}); } });
  }
  function renderBlock(file, block, index) {
    const id = blockId(block, index);
    const section = el('section', {class: 'block', id: domBlockId(block, index), 'aria-label': '第 ' + (index + 1) + ' 段'});
    section.append(el('div', {class: 'block-meta'}, el('span', {class: 'block-kind'}, block.label || kindLabel(block.kind)), el('span', {}, block.start ? '原文 ' + block.start + (block.end && block.end !== block.start ? '–' + block.end : '') + ' 行' : '第 ' + (index + 1) + ' 段'), el('a', {href: fileHash(file.path, id), title: '复制浏览器地址可分享这个语段'}, '定位这一段')));
    if (block.zh) section.append(markdown(block.zh, file.path));
    else section.append(el('p', {class: 'muted'}, '此语段的中文释义暂未提供。请对照下面的原文。'));
    if (block.commentZh) section.append(el('div', {class: 'explanation'}, el('span', {class: 'explanation-label'}, '注释与提示中文'), el('p', {}, block.commentZh)));
    if (block.explanation) section.append(el('div', {class: 'explanation'}, el('span', {class: 'explanation-label'}, '大白话'), el('p', {}, block.explanation)));
    if (block.source) {
      const isCode = /code|shell|javascript|json|yaml|python/.test(txt(block.kind));
      section.append(el('details', {class: 'original'}, el('summary', {}, isCode ? '展开原始代码' : '展开英文原文'), el('pre', {class: isCode ? 'code-block' : ''}, el('code', {}, block.source))));
    }
    return section;
  }

  let searchIndex;
  function getSearchIndex() {
    if (!searchIndex) searchIndex = files.map(file => ({file, title: normalize([file.path, file.title, file.role, file.why, file.borrow].join('\n')), all: normalize([file.path, file.title, file.role, file.source, blocksOf(file).map(block => [block.zh, block.explanation].join('\n')).join('\n')].join('\n')), blocks: null}));
    return searchIndex;
  }
  function markedSnippet(text, terms, length = 220) {
    const lower = normalize(text), indexes = terms.map(term => lower.indexOf(term)).filter(i => i >= 0);
    const start = indexes.length ? Math.max(0, Math.min(...indexes) - 65) : 0;
    const sample = (start > 0 ? '…' : '') + txt(text).slice(start, start + length).replace(/\s+/g, ' ') + (txt(text).length > start + length ? '…' : '');
    const fragment = document.createDocumentFragment();
    const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean);
    if (!escaped.length) { fragment.append(document.createTextNode(sample)); return fragment; }
    const pattern = new RegExp(escaped.join('|'), 'gi'); let match, last = 0;
    while ((match = pattern.exec(sample))) { fragment.append(document.createTextNode(sample.slice(last, match.index)), el('mark', {}, match[0])); last = pattern.lastIndex; }
    fragment.append(document.createTextNode(sample.slice(last))); return fragment;
  }
  function renderSearch(query = '') {
    pageHeader('搜索：用你熟悉的词找方法', '可以搜中文释义、英文原文、文件名，也可以用空格组合两个关键词。');
    const input = el('input', {id: 'global-search', type: 'search', placeholder: '例如：需求规划、description、systematic-debugging', value: query, 'aria-label': '搜索全部中文释义和英文原文', autocomplete: 'off'});
    const box = el('label', {class: 'search-box'}, icon('search'), input), state = el('p', {class: 'search-state', role: 'status', 'aria-live': 'polite'}), results = el('div', {class: 'search-results'});
    view.append(box);
    const popular = el('div', {class: 'popular-searches'});
    ['SKILL.md', 'description', '调试', '规划', 'hooks'].forEach(term => popular.append(button(term, () => { input.value = term; runSearch(term); input.focus(); }, 'file-link')));
    view.append(popular, state, results);
    let resultLimit = 35;
    const runSearch = value => {
      const term = value.trim();
      if (route.view === 'search') {
        const hash = '#view=search' + (term ? '&q=' + encodeURIComponent(term) : '');
        try { history.replaceState(null, '', location.pathname + location.search + hash); } catch (_) {}
      }
      results.replaceChildren();
      if (!term) { state.textContent = '搜索全部 ' + files.length + ' 个文件，中文和英文都可以。'; results.append(el('div', {class: 'empty-state'}, el('h2', {}, '先输入一个词'), el('p', {}, '比如「调试」，看看一套排错方法是怎样组织起来的。'))); return; }
      const terms = normalize(term).split(/\s+/).filter(Boolean), matches = [];
      for (const entry of getSearchIndex()) {
        if (!terms.every(word => entry.all.includes(word))) continue;
        if (terms.every(word => entry.title.includes(word))) {
          matches.push({file: entry.file, block: null, snippet: entry.file.role || entry.file.title || entry.file.path});
          continue;
        }
        if (!entry.blocks) entry.blocks = blocksOf(entry.file).map((block, index) => ({block, index, all: normalize([block.zh, block.explanation, block.source].join('\n'))}));
        const matchingBlocks = entry.blocks.filter(item => terms.every(word => item.all.includes(word)));
        if (!matchingBlocks.length) matches.push({file: entry.file, block: null, snippet: entry.file.source || entry.file.role || ''});
        else matchingBlocks.slice(0, 3).forEach(item => {
          const zhMatch = terms.some(word => normalize(item.block.zh).includes(word));
          matches.push({file: entry.file, block: item.block, index: item.index, snippet: zhMatch ? item.block.zh : item.block.source || item.block.zh || ''});
        });
      }
      state.textContent = '找到 ' + matches.length + ' 条结果' + (matches.length > resultLimit ? '，先显示 ' + resultLimit + ' 条。' : '。点击结果定位到原文件。');
      if (!matches.length) { results.append(el('div', {class: 'empty-state'}, el('h2', {}, '没有找到对应内容'), el('p', {}, '减少关键词，或试试英文文件名。比如把「测试驱动开发规范」改为「测试」。'))); return; }
      matches.slice(0, resultLimit).forEach(match => {
        const file = match.file, block = match.block, href = fileHash(file.path, block ? blockId(block, match.index) : null);
        results.append(el('article', {class: 'search-result'}, el('a', {href}, el('h3', {}, markedSnippet(file.title || file.path.split('/').pop(), terms, 120)), el('span', {class: 'result-path'}, file.path + (block && block.start ? ' · 原文 ' + block.start + ' 行' : '')), el('p', {}, markedSnippet(match.snippet, terms)))));
      });
      if (matches.length > resultLimit) results.append(el('div', {class: 'more-blocks'}, button('再显示 35 条结果', () => { resultLimit += 35; runSearch(input.value); })));
    };
    input.addEventListener('input', () => { clearTimeout(searchTimer); resultLimit = 35; searchTimer = setTimeout(() => runSearch(input.value), 160); });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { clearTimeout(searchTimer); runSearch(input.value); } });
    runSearch(query);
    requestAnimationFrame(() => input.focus({preventScroll: true}));
  }

  function skillContent() {
    const name = wizard.name.trim() || 'my-first-skill';
    const when = wizard.when.trim() || '当用户需要……时使用。';
    const steps = wizard.steps.trim() || '1. 先理解任务和限制。\n2. 按步骤完成工作。\n3. 检查结果是否符合要求。';
    const done = wizard.done.trim() || '- 结果符合用户要求。\n- 用可观察的证据确认完成。';
    const description = JSON.stringify('在以下情形使用：' + when);
    return `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n## 使用时机\n\n${when}\n\n## 操作步骤\n\n${steps}\n\n## 完成标准\n\n${done}\n`;
  }
  function wizardError(step) {
    if (step === 0) {
      if (!wizard.name.trim()) return '填写一个名称，例如 review-my-note。';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wizard.name.trim()) || wizard.name.trim().length > 64) return '名称用小写英文字母、数字和短横线，最多 64 个字符。';
    }
    if (step === 1 && !wizard.when.trim()) return '写清「什么时候需要这个方法」，例如用户要检查一篇学习笔记时。';
    if (step === 2 && (!wizard.steps.trim() || !wizard.done.trim())) return '补齐具体步骤和完成标准，再下载。';
    return '';
  }
  function renderWorkshop() {
    pageHeader('写我的 Skill：先完成一份小说明书', '只需要想清楚三件事：叫什么、什么时候用、按什么规则做。填写后可以预览并下载 SKILL.md。');
    const stepLabels = ['起个名字', '定义使用时机', '写步骤与标准'];
    const stepTabs = el('div', {class: 'workshop-steps', role: 'group', 'aria-label': 'Skill 制作步骤'});
    const form = el('section', {class: 'workshop-form', 'aria-label': '填写 Skill 内容'});
    const preview = el('pre', {id: 'skill-preview'}, skillContent());
    const previewPanel = el('section', {class: 'preview-panel', 'aria-label': 'SKILL.md 实时预览'}, el('header', {}, el('span', {}, 'SKILL.md'), el('span', {}, '实时预览')), preview, el('p', {class: 'preview-description'}, '预览里的占位内容用于示范。下载前需填写全部三步。'));
    const updatePreview = () => { preview.textContent = skillContent(); store('wizard', wizard); };
    const field = (key, label, hint, placeholder, multiline = false) => {
      const control = el(multiline ? 'textarea' : 'input', {id: 'skill-' + key, value: wizard[key], placeholder, ...(multiline ? {rows: '5'} : {type: 'text'}), 'aria-describedby': 'hint-' + key});
      control.addEventListener('input', () => { wizard[key] = control.value; updatePreview(); });
      return el('label', {class: 'field', for: 'skill-' + key}, el('span', {class: 'field-label'}, label), control, el('span', {id: 'hint-' + key, class: 'field-hint'}, hint));
    };
    const drawForm = () => {
      [...stepTabs.children].forEach((tab, index) => { const selected = index === wizardStep; tab.classList.toggle('selected', selected); tab.setAttribute('aria-pressed', selected); });
      form.replaceChildren(el('h2', {}, stepLabels[wizardStep]));
      if (wizardStep === 0) form.append(field('name', '给方法起一个清楚的名字', '使用小写英文和短横线。例：review-my-note，意思是「检查我的笔记」。', 'review-my-note'), el('p', {class: 'field-hint'}, '小白第一版只需要：一个同名文件夹，里面放这份 SKILL.md。辅助脚本和插件配置可以以后再加。'));
      if (wizardStep === 1) form.append(field('when', '什么时候应该使用？', '这是 AI 选择 Skill 的入口线索。描述任务情形，不必把全部执行流程塞进来。', '当用户需要检查一篇学习笔记是否准确、清楚、可复用时。', true));
      if (wizardStep === 2) form.append(field('steps', '具体按哪些步骤做？', '每行写一件事，用 1.、2.、3. 编号；步骤要能观察、能执行。', '1. 阅读笔记，明确主题。\n2. 核对来源，标出无法确认的事实。\n3. 提出最小修改建议。', true), field('done', '怎样算完成？', '把「做好了」换成可以检查的结果。', '- 每条事实都有来源或待核实标记。\n- 读者能知道下一步怎么做。', true));
      const error = el('p', {class: 'field-error', role: 'alert', id: 'wizard-error'}), controls = el('div', {class: 'workshop-buttons'});
      if (wizardStep > 0) controls.append(button('上一步', () => { wizardStep--; drawForm(); }));
      if (wizardStep < 2) controls.append(button('下一步', () => { const message = wizardError(wizardStep); if (message) { error.textContent = message; form.querySelector('input,textarea').focus(); return; } wizardStep++; drawForm(); }, 'primary-button'));
      else controls.append(button([icon('download'), '下载 SKILL.md'], () => {
        const invalid = [0, 1, 2].find(step => wizardError(step));
        if (invalid !== undefined) { wizardStep = invalid; drawForm(); form.querySelector('.field-error').textContent = wizardError(invalid); form.querySelector('input,textarea').focus(); return; }
        download(skillContent(), 'SKILL.md'); notify('SKILL.md 已下载。下一步用同一个任务做前后对比。');
      }, 'primary-button'));
      form.append(error, controls);
    };
    stepLabels.forEach((label, index) => stepTabs.append(button([el('span', {}, index + 1), label], () => { wizardStep = index; drawForm(); }, '')));
    view.append(stepTabs, el('div', {class: 'workshop-layout'}, form, previewPanel)); drawForm();
    view.append(el('section', {class: 'workshop-test-area'}, el('h2', {}, '下载以后，用同一题做两次对比'),
      el('p', {class: 'page-lead'}, '文件写完只是开始。Superpowers 的 writing-skills 强调：先观察没有 Skill 时哪里做不好，再验证加上规则以后是否改善。'),
      el('div', {class: 'test-example'}, el('strong', {}, '第一次：先不加载 Skill'), el('p', {}, '给 AI 一篇笔记，要求检查。保存它的结果，看看有没有跳过来源核实或完成标准。')),
      el('div', {class: 'test-example'}, el('strong', {}, '第二次：加载 Skill 后重复同一任务'), el('p', {}, '比较 AI 是否按你写的步骤做，以及结果是否达到标准。仍然跳步，就修改那一条规则再试。')),
      fileLink('skills/writing-skills/SKILL.md', '阅读项目的 Skill 制作与测试方法', '')
    ));
  }
  function renderError(title, message) { view.append(el('div', {class: 'route-error'}, el('h1', {}, title), el('p', {}, message), el('a', {href: '#view=source', class: 'secondary-button'}, '回到中文源码'))); }
  function renderRoute() {
    clearTimeout(searchTimer);
    const params = new URLSearchParams(location.hash.slice(1));
    route = {view: params.get('view') || 'start', file: params.get('file'), folder: params.get('folder'), block: params.get('block'), query: params.get('q') || ''};
    if (route.file || route.folder) route.view = 'source';
    view.replaceChildren();
    if (!files.length) { renderError('学习内容未载入', '这个 HTML 没有包含源码数据。请使用构建后的完整 index.html。'); return; }
    if (route.file) {
      const file = byPath.get(route.file) || byId.get(route.file);
      if (file) { route.file = file.path; renderFile(file, route.block); }
      else renderError('没有这个文件', '文件路径不属于当前源码快照。请从左侧目录或搜索重新打开。');
    } else if (route.folder) renderFolder(route.folder);
    else if (route.view === 'map') renderMap();
    else if (route.view === 'source') renderSourceIndex();
    else if (route.view === 'workshop') renderWorkshop();
    else if (route.view === 'search') renderSearch(route.query);
    else { route.view = 'start'; renderStart(); }
    document.querySelectorAll('.top-nav a').forEach(link => { const active = link.dataset.view === route.view || (route.view === 'search' && link.dataset.view === 'source'); link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.title = (route.file ? txt(byPath.get(route.file)?.title || route.file) : {start: '从这里开始', map: '项目地图', source: '中文源码', workshop: '写我的 Skill', search: '搜索'}[route.view]) + ' · Superpowers 中文译注本';
    renderTree();
    if (!route.block) window.scrollTo({top: 0, behavior: 'instant'});
    if (route.view !== 'search') requestAnimationFrame(() => { const heading = view.querySelector('h1'); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({preventScroll: true}); } });
  }
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
