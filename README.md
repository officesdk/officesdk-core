# Office SDK Core

Office SDK Core 让桌面与移动应用离线打开、编辑、保存 Word、PowerPoint、Excel 和 PDF 文件，不依赖任何网络服务。

*Office SDK Core lets desktop and mobile apps open, edit and save Word, PowerPoint, Excel and PDF files offline. English documentation is in progress.*

- 文档：<https://officesdk.github.io/officesdk-core/>
- 编辑器（npm）：[`@officesdk/officesdk-core-editor`](https://www.npmjs.com/package/@officesdk/officesdk-core-editor)
- Kit 下载：[officesdk/officesdk-core-runtime Releases](https://github.com/officesdk/officesdk-core-runtime/releases)

本仓库是 Office SDK Core 的首页：说明、文档站源（`docs/`）与版本对照表。二进制在 `officesdk-core-runtime` 的 Release，编辑器资源在 npm。

## 组成

| 组成 | 在哪里 | 作用 |
| --- | --- | --- |
| 页面整合包 `@officesdk/officesdk-core-editor` | npm | 运行在应用的 WebView 里，带四个编辑器的资源，创建 Writer、Presentation、Sheet、PDF 编辑器 |
| Kit | [officesdk-core-runtime](https://github.com/officesdk/officesdk-core-runtime/releases) 的 Release，每个平台一个压缩包 | 随应用分发的本地文档进程，负责打开、保存与导出文件 |
| 文档 | [文档站](https://officesdk.github.io/officesdk-core/)（源在本仓库 `docs/`） | 快速开始、编辑器配置、API 参考、版本与兼容性 |

页面整合包与 Kit 用同一个版本号发布，必须配套使用。

## 安装页面整合包

```sh
npm install @officesdk/officesdk-core-editor          # 稳定版
npm install @officesdk/officesdk-core-editor@next     # 预发布版
```

## 获取 Kit

### 用命令下载

```sh
npx offline-kit fetch --target aarch64-apple-darwin,x86_64-pc-windows-msvc --out vendor/kit
```

`fetch` 下载与已安装的页面整合包同版本的 Kit，并校验 SHA-256。

### 从 Release 下载

[officesdk-core-runtime](https://github.com/officesdk/officesdk-core-runtime/releases) 每个版本（tag `v<版本>`）附带：

| 文件 | 内容 |
| --- | --- |
| `offline-kit-<版本>-<target>.tar.gz` | 各平台的 Kit |
| `release.json` | 版本信息与各文件摘要 |
| `SHA256SUMS` | 各文件的 SHA-256 |
| `LICENSE.md` | 许可声明 |
| `kit-manifest.json` | Kit 与编辑器资源的下载清单（按平台列出 Kit 包与包内文件摘要，编辑器资源指向 npm） |

```sh
sha256sum -c SHA256SUMS --ignore-missing     # macOS：shasum -a 256 -c SHA256SUMS --ignore-missing
```

支持的平台：`aarch64-apple-darwin`、`x86_64-apple-darwin`、`aarch64-unknown-linux-gnu`、`x86_64-unknown-linux-gnu`、`aarch64-pc-windows-msvc`、`x86_64-pc-windows-msvc`、`aarch64-unknown-linux-ohos`（HarmonyOS，N-API 模块）。每个版本实际提供的平台以该版本 Release 为准。

## 最小示例

```sh
offline-kit-runtime serve --work <可写目录>     # Host 拉起 Kit，读到 ready 帧后发送命令
```

```ts
import { createOfflineEditor, parseResourceCatalog } from "@officesdk/officesdk-core-editor";

const editor = await createOfflineEditor({
  container: document.getElementById("editor")!,
  suite: "document",
  mode: "readonly",
  content,                        // Kit open 响应中的 content
  language: "zh-CN",
  direction: "ltr",
  resources: { baseUrl, catalog: parseResourceCatalog(catalogJson) },
  fontProvider,
});
await editor.start();
```

完整流程见[快速开始](https://officesdk.github.io/officesdk-core/guide/quick-start)与[打开、编辑、保存](https://officesdk.github.io/officesdk-core/guide/open-edit-save)。

## 版本

- 页面整合包与 Kit 版本必须一致；Kit 的 ready 帧带 `kitVersion`，页面可用 `getReleaseInfo().version` 对照。
- 预发布版本形如 `X.Y.Z-rc.N`，npm 标签 `next`，Release 标为 Pre-release。
- 兼容性说明见[版本与兼容性](https://officesdk.github.io/officesdk-core/reference/versioning)。

下表由发版流程自动维护：两个标记之间只能放这张表，其他内容会在发版时被覆盖。

<!-- officesdk-core:versions:start -->
| 版本 | Runtime 下载 | 编辑器（npm） | 文档 |
|---|---|---|---|
<!-- officesdk-core:versions:end -->

## License

Office SDK Core 是闭源商用软件，Copyright © 2026 OfficeSDK.com。它不以任何开源许可发布。使用须遵守 [Office SDK EULA](https://officesdk.com/legal/eula)，评估与生产使用都需要许可文件或许可密钥。详见仓库根目录的 `LICENSE.md`。

*Office SDK Core is closed-source commercial software. Use is governed by the [Office SDK EULA](https://officesdk.com/legal/eula). See `LICENSE.md` in this repository.*
