# 产品概览

Office SDK 让桌面与移动应用离线打开、编辑、保存 Word、PowerPoint、Excel 与 PDF 文件，全程不依赖网络服务。它由三个部分组成，调用顺序是 **editor → runtime → kit**。

## 三个部分

| 部分 | 是什么 | 运行在哪里 | 负责 | 怎么获取 |
| --- | --- | --- | --- | --- |
| **editor**（页面整合包） | npm 包 `@officesdk/officesdk-core-editor` | 应用里的 WebView 页面 | 创建 Writer、Presentation、Sheet、PDF 四种编辑器；把用户的编辑变成变化交给宿主；提供 JS API，让 AI 或业务代码修改文档 | `npm install @officesdk/officesdk-core-editor` |
| **runtime** | 本地文档进程 `offline-kit-runtime`（Windows 为 `.exe`；HarmonyOS 为 N-API 模块 `liboffline_kit.so`） | 应用随附的本地进程（HarmonyOS 上运行在应用进程内） | 持有文件：打开、合并编辑、保存、导出，管理会话与未保存的修改 | GitHub Release 的 `officesdk-core-runtime-<版本>-<target>.tar.gz`，或 `npx offline-kit fetch` |
| **kit** | 文档引擎 | 目前在 runtime 包里，由 runtime 调用 | 格式转换与渲染：runtime 打开、保存、导出文件时用它在 Office 格式与编辑器内容之间转换 | 目前随 runtime 包提供；独立发布后续提供，见 [kit 文档引擎](./kit.md) |

三个部分用**同一个版本号**发布，必须配套使用。

## 架构

<ArchitectureDiagram lang="zh" />

- **宿主应用（Host）** 是你的应用，例如 Electron、Wails、原生应用或 HarmonyOS ArkTS 应用。它同时承载页面和 runtime，并在两者之间转发。
- **editor** 运行在 WebView 里，只展示内容、产生变化，不读写文件，也不连接 runtime。
- **runtime** 是本地进程，持有文件和未保存的修改。Host 通过标准输入输出交换命令帧，媒体与字体字节走另一条字节侧流；HarmonyOS 上 Host 通过 N-API 调用同样的命令。
- **kit** 在 runtime 内部，负责格式转换与渲染，Host 不直接调用它。
- 页面和 Host 之间的通道由 Host 自己实现（例如 preload、IPC 或 JS 桥），runtime 不提供 HTTP 接口。

## 打开、编辑、保存

<SequenceDiagram flow="save" lang="zh" />

1. Host 让 runtime 打开用户文件（`open`），runtime 用 kit 读取并转换，返回 `documentId`、`suite` 与 `content`。
2. Host 用 `content` 创建对应的编辑器并 `start()`。
3. 用户编辑时，editor 发出 `change` 事件；Host 按顺序把每个变化转给 runtime（`change`）。
4. 用户保存时，Host 先调用 `editor.prepare()` 收尾正在进行的输入，等已发出的变化都被 runtime 接受。
5. Host 发 `save`，runtime 用 kit 把内容写回文件。

完整的命令与代码见[打开、编辑、保存](./open-edit-save.md)。

## AI 修改

<SequenceDiagram flow="ai" lang="zh" />

1. AI 或业务代码把修改要求交给 Host。
2. Host 调用 editor 的 JS API：Presentation 的 `PowerPoint.run`、Sheet 的区域写入、Writer 的 `Word.run`。
3. 修改立即显示在编辑器里，并像手工编辑一样经 `change` 事件交给 runtime。
4. 需要回滚时，Presentation 沿编辑器历史撤销，撤销同样经 `change` 交给 runtime。
5. 保存仍由 Host 发 `save`。

调用方法与示例见[用 JS API 修改文档](./ai-editing.md)。

## 版本一致

- 每次发行一个版本号，同时属于 npm 包与各平台的 runtime 包，kit 随 runtime 包。
- 页面里用 `getReleaseInfo().version` 取 editor 的版本，runtime 启动后第一帧（ready）带 `kitVersion`，Host 可以对照两者。
- 升级时 editor 与 runtime 一起换。详见[版本与兼容性](../reference/versioning.md)。

## 名称说明

runtime 包内的说明（`guide/`）、下载清单 `kit-manifest.json`、`offline-kit` 命令与环境变量 `OFFLINE_KIT_*` 里的「Kit」，指的都是 runtime 包。这些名称已经发布，保持不变。

## 下一步

- [快速开始](./quick-start.md)：安装 editor、取得 runtime、创建第一个编辑器
- [用 JS API 修改文档](./ai-editing.md)：让 AI 修改用户正在编辑的文档
- [runtime 接口](../reference/runtime.md)：runtime 对 Host 承诺的接口
- [kit 文档引擎](./kit.md)：kit 的能力与现状
