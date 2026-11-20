---
layout: home
title: Office SDK
hero:
  name: Office SDK
  text: 离线文档编辑套件
  tagline: 在你的桌面或移动应用里打开、编辑、保存 Word、PowerPoint、Excel 与 PDF 文件，全程不依赖网络服务。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: 下载 Kit
      link: /guide/install-kit
features:
  - title: 页面整合包
    details: npm 包 @officesdk/officesdk-core-editor 运行在应用的 WebView 里，用 createOfflineEditor 创建 Writer、Presentation、Sheet、PDF 四种编辑器。
    link: /editors/
  - title: Kit 文档进程
    details: Kit 是随应用分发的本地程序，负责打开、合并变化、保存与导出文件。宿主应用通过标准输入输出与它交换命令帧。
    link: /guide/install-kit
  - title: 版本一一对应
    details: npm 包与 Kit 用同一个版本号发布，宿主可以在运行时核对两边版本。
    link: /reference/versioning
---
