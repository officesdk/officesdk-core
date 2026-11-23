# kit 文档引擎

kit 是 Office SDK 的文档引擎：不需要 Office、不需要界面、不连网络，读写 Word、Excel、PowerPoint 与 PDF 文件。它的能力有四类：

| 能力 | 说明 |
| --- | --- |
| 格式转换 | 在 Office 文件与编辑器内容之间双向转换，包括旧版二进制格式（`.doc`、`.xls`、`.ppt`）与 OOXML |
| Office.js 原地修改 | 用标准的 Office.js 写法（`PowerPoint.run`、`Word.run`、`Excel.run`）直接修改原文件，没改的部分原样保留 |
| 渲染 | 把页面或幻灯片渲染成预览图 |
| 版面检查 | 找出文字溢出、超出页面、遮挡、字体缺失等问题，给出位置，方便 AI 自己修正 |

kit 可以作为命令行工具运行，也可以作为 MCP 服务接入 AI 客户端。

## 现在怎么用

**kit 目前随 runtime 包一起提供，不需要单独安装，也不单独调用。** runtime 打开、保存、导出文件时，由 kit 完成格式转换。

| 能力 | 现在（经 runtime） | 后续 |
| --- | --- | --- |
| 打开 `.docx`、`.doc`、`.xlsx`、`.xls`、`.pptx`、`.ppt`、`.pdf` | 可用：runtime 的 `open` | — |
| 保存与导出 `.docx`、`.xlsx`、`.pptx`、`.pdf` | 可用：runtime 的 `save`、`export`，只写与原文件同类的文件（各套件可写的格式见 [runtime 接口](../reference/runtime.md#文件格式)） | — |
| 跨格式转换（例如 `.docx` 转 `.pdf`） | 不提供 | 随独立发布的 kit 提供 |
| 表格中 EMF、WMF、TIFF 图片的预览 | 可用（Windows 包不含预览图渲染，图表预览图同样不含） | — |
| 独立的命令行工具与 MCP 服务 | 不提供 | 随独立发布的 kit 提供 |
| 不打开编辑器、在后台用 Office.js 修改文件 | 不提供 | 随独立发布的 kit 提供 |
| 渲染预览图、版面检查 | 不提供 | 随独立发布的 kit 提供 |
| 更多输入与输出格式 | 不提供 | 以独立发布时的说明为准 |

现在要在应用里让 AI 修改文档，请用 editor 的 JS API，见[用 JS API 修改文档](./ai-editing.md)。

## 与 editor JS API 的区别

两者都用 Office.js 风格的接口，适用场景不同：

| | editor 的 JS API | kit（独立发布后） |
| --- | --- | --- |
| 修改的对象 | 用户在编辑器里**正在编辑**的文档 | 磁盘上的文件 |
| 界面 | 修改实时显示，用户可以继续编辑 | 无界面 |
| 回滚 | Presentation 可沿编辑历史撤销 | 由调用方自己保留原文件 |
| 保存 | 经 `change` 由 runtime 合并、保存 | 直接写出文件 |
| 适合 | 应用内的 AI 助手、所见即所得的修改 | 后台批量处理、服务端与 AI Agent 无人值守处理 |

## 平台

目前 kit 随 runtime 包提供，平台与 runtime 相同，见[安装与启动 runtime](./install-kit.md#支持的平台)。独立发布后的平台与下载方式，以届时的 Release 说明为准。

## 了解更多

kit 的完整介绍（能力、格式、Office.js 覆盖范围、检查规则）见 GitHub 上的 [officekit 介绍](https://github.com/officesdk/officesdk-core/tree/main/officekit)。其中尚未随本 SDK 提供的能力，以独立发布时的说明为准。
