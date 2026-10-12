# Superpowers 中文译注本

面向中文初学者的源码学习页面：看懂 Superpowers 的项目地图，逐段对照原文，练习写出自己的第一个 Skill。

这是独立的中文学习项目，与原作者没有官方关联。

## 先打开页面

双击根目录 `index.html`。目录、译文、搜索和 Skill 生成器均可离线使用。页面内“查看 GitHub 源码”等外部链接需要联网。

内容范围：固定快照的 238 个文件，其中 236 个文本、2 张 PNG；包含 15 个核心 `SKILL.md`。中文释义使用机器翻译辅助，核心规则与文件用途经 AI 校对；不是官方译文或全部人工审校版。代码、命令、字段名与完整英文源码保留。页面只展示源码，不执行这些命令。

## 上传到 GitHub 并展示网页

1. 在 GitHub 新建仓库，例如 `superpowers-cn`。只发布学习页面时，上传 `index.html`、`.nojekyll`、`LICENSE` 和 `THIRD_PARTY_NOTICES.md`，确保 `index.html` 位于仓库根目录。希望同时公开完整项目代码时，用 Git 或 GitHub Desktop 提交本目录（按 `.gitignore` 排除缓存）。
2. 打开仓库 **Settings → Pages**。选择 **Deploy from a branch**、实际上传的分支（通常为 `main`）、目录 **/(root)**，保存。
3. 等待 GitHub 给出网站地址，再打开该地址查看。地址通常类似 `https://你的用户名.github.io/superpowers-cn/`。

`.nojekyll` 用来直接发布静态文件。**GitHub 仓库页面用于浏览代码；GitHub Pages 地址才会运行这个交互学习页面。** 推荐公开仓库，GitHub Free 支持公开仓库的 Pages。

官方说明：[发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[入口文件](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

本项目不需要后端、构建服务器、读者 API Key 或运行时 CDN。学习进度和仿写草稿仅保存在当前浏览器，不会上传。

## 目录怎么分工

| 路径 | 作用 |
| --- | --- |
| `index.html` | 已构建的单文件网页，可直接阅读和发布 |
| `app/` | 网页模板、样式和交互逻辑 |
| `content/translated_corpus.json` | 保留原文、行号和逐块中文译文的构建输入 |
| `content/inventory_notes.json` | 每个目录和文件的用途、设计理由、仿写建议 |
| `content/core_notes.json` | 核心 Skills 的解释、术语和学习路线 |
| `source/superpowers/` | 上游固定提交的原始源码快照，供对照和核验 |
| `scripts/` | 准备内容、辅助翻译和构建页面的工具 |
| `tests/` | 完整性与网页交互检查 |
| `docs/` | 项目设计与检查结果 |

## 修改后重新生成页面

需要 Python 3，常规构建只用标准库，不访问网络：

```sh
python3 scripts/build.py
python3 tests/verify_content.py
```

构建同时生成根目录和 `dist/` 内的 `index.html`。`dist/` 是本地副本，默认不提交，Pages 使用根目录成品即可。

只有更新上游源码或重新生成机器译文时，才需要额外运行：

```sh
python3 scripts/prepare_source.py
python3 scripts/translate_corpus.py
python3 scripts/build.py
```

辅助翻译脚本会向公开在线翻译接口发送 `source/superpowers/` 中的文本，需要联网。该接口不是稳定的官方 API 集成，可能限流或变更；缓存可以续跑。普通阅读和常规构建不调用它。请勿将私有材料放入该源码快照后运行翻译。

浏览器自动检查属于可选开发工具：安装开发依赖及 Playwright Chromium 后运行 `npm run test:browser`。它模拟 GitHub Pages 的 `/superpowers-cn/` 子路径，同时验证离线 HTML、搜索、所有文件链接、图片和 Skill 下载；普通读者无需安装这些工具。

## 来源与许可

- 原项目：[obra/superpowers](https://github.com/obra/superpowers)
- 固定提交：`bb92a77741419a4ab5f06e711a283343f1ada0c3`
- 上游插件版本：`7.0.0`，快照整理日期：`2026-10-12`
- 上游采用 MIT 许可，版权与许可保留于 `source/superpowers/LICENSE` 和 `THIRD_PARTY_NOTICES.md`。本项目新增代码同样采用 MIT 许可。

尚未在真实 GitHub 仓库上传或部署，最终上线成功仍需以 GitHub Pages 的部署结果与网站访问为准。
