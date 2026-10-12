# GitHub 上传与 GitHub Pages 检查

检查日期：2026-10-12。结论：本地检查通过，可上传新仓库并配置 GitHub Pages。尚未实际上传或部署到 GitHub，因此不把网站上线写作已验证。

## 已通过的检查

| 项目 | 结果与范围 |
| --- | --- |
| 源码与内容完整性 | 上游快照 238 个文件全部保留；236 个文本、15 个核心 Skill；所有非空源码行都有对应显示块，原文 SHA-256 一致 |
| 中文内容 | 6,405 个文档块、3,190 个代码或配置块均有中文释义；机器翻译辅助，AI 重点校正，不是全量人工审校 |
| 网页入口与发布目录 | 根目录有 `index.html` 和 `.nojekyll`，不需要在线构建或服务端程序 |
| Git 提交模拟 | 在独立临时仓库中模拟收集文件；完整 238 个上游文件都被纳入，翻译缓存与临时预览被排除 |
| 文件大小 | 成品 HTML 7,122,926 字节，约 6.79 MiB；最大的构建输入约 8.25 MiB，低于网页上传单文件 25 MiB 与 Git 单文件 100 MiB 限制 |
| 许可与来源 | 上游 MIT 原文、版权、固定提交和独立学习项目说明均保留 |
| 敏感信息初筛 | 未发现高置信密钥格式、私钥、对话中提供的数据库地址或个人构建路径；初筛仅覆盖本项目交付文件 |
| 网页运行依赖 | CSS、JavaScript、原文、译文与 PNG 均内置；浏览器测试没有外部运行时请求或 JavaScript 错误 |

## 浏览器验证

使用独立临时 Chrome 环境完成 23 项检查：

- 模拟 GitHub Pages 的 `/superpowers-cn/` 仓库子路径；搜索与地址变化保持在该路径。
- 所有 238 个文件链接均可打开，长文继续展开、英文对照和指定语段定位正常。
- 中文和英文全文搜索正常，图片内置数据可以显示。
- 三步 Skill 表单能校验空内容并下载带完整文件头和中文规则的 `SKILL.md`。
- 1440×1000 桌面和 390×844 手机视口检查；手机目录开关正常，阅读页没有横向溢出。
- 断网打开本地 `file://` HTML 后，首页和中文搜索仍可用。

最后只调整了 6 个核心段落的中文译文，随后再次构建并通过内容检查；交互实现未改变。最终成品的桌面和手机阅读截图已另行重新记录。

## 发布方式

只展示学习页面，可上传 `index.html`、`.nojekyll`、`LICENSE`、`THIRD_PARTY_NOTICES.md`。完整项目代码可用 Git 或 GitHub Desktop 提交；`.gitignore` 会排除缓存、截图和本地产物。

仓库 **Settings → Pages**：选择 **Deploy from a branch**，选实际分支和 **/(root)**。网站地址由 GitHub 提供。仓库的普通文件浏览页不会运行交互网页。

依据官方文档：[发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[入口文件与静态发布](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)、[大文件限制](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。

## 已知边界

中文译文仍可能有措辞或专业术语误差，应展开英文对照。轻量 Markdown 展示不完整支持复杂嵌套和文档内部所有标题锚点。全文展开较长文件会占用更多内存，默认按 15 段显示。浏览器检查不能代替真实仓库的 Pages 部署和外网访问验收。

独立收尾审查结论：`ship`。采用通用审查助手和降级审查参考（专用角色不可用），确认最终桌面与手机阅读截图有效，指定范围内无阻止使用或 Pages 发布的缺陷；范围仅限这些截图与发布兼容代码，不代表全站设计或全部译文验收。
