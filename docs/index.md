---
layout: home
title: Office SDK
hero:
  name: Office SDK
  text: 离线文档编辑套件
  tagline: 在你的桌面或移动应用里打开、编辑、保存 Word、PowerPoint、Excel 与 PDF 文件，全程不依赖网络服务。
  actions:
    - theme: brand
      text: 产品概览
      link: /guide/overview
    - theme: alt
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: JS API 指南
      link: /guide/ai-editing
    - theme: alt
      text: API 参考
      link: /api/
features:
  - title: editor（页面整合包）
    details: npm 包 @officesdk/officesdk-core-editor 运行在应用的 WebView 里，创建 Writer、Presentation、Sheet、PDF 四种编辑器，并提供 JS API 让 AI 修改文档。
    link: /guide/ai-editing
  - title: runtime（本地文档进程）
    details: 随应用分发的本地程序，负责打开、合并编辑、保存与导出文件。宿主应用通过标准输入输出与它交换命令帧。
    link: /reference/runtime
  - title: kit（文档引擎）
    details: 格式转换与渲染引擎，目前随 runtime 包提供，由 runtime 调用；独立的命令行与 MCP 服务后续提供。
    link: /guide/kit
---

## 三个部分如何配合

页面里的 editor 只负责展示与编辑，不读写文件；宿主应用把它产生的变化转给本地的 runtime，runtime 用 kit 读写用户文件。三个部分用同一个版本号发布，必须配套使用。

<ArchitectureDiagram lang="zh" compact />

- 想几分钟看懂整体：[产品概览](./guide/overview.md)
- 想让 AI 修改用户正在编辑的文档：[用 JS API 修改文档](./guide/ai-editing.md)
- 想对接 runtime：[安装与启动 runtime](./guide/install-kit.md)、[runtime 接口](./reference/runtime.md)
