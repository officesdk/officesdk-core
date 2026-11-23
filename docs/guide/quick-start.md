# 快速开始

Office SDK 由三部分组成，版本号相同，须配套使用（整体说明见[产品概览](./overview.md)）：

| 组成 | 形式 | 运行位置 | 负责 |
| --- | --- | --- | --- |
| editor（页面整合包 `@officesdk/officesdk-core-editor`） | npm 包 | 应用内的 WebView 页面 | 加载编辑器资源，创建编辑器，把用户的编辑变化交给宿主 |
| runtime | 每个平台一个压缩包 | 应用随附的本地进程 | 打开文件、接收变化、保存和导出文件 |
| kit | 目前在 runtime 包内 | 由 runtime 调用 | 格式转换与渲染，见 [kit 文档引擎](./kit.md) |

页面不直接连接 runtime。宿主应用（下文称 Host）在中间转发：页面 → Host → runtime。

## 1. 安装页面整合包

```sh
npm install @officesdk/officesdk-core-editor
# 预发布版本在 next 标签下
npm install @officesdk/officesdk-core-editor@next
```

要求 Node.js 20.19 或更新版本（只在构建时需要）。

## 2. 取得同版本的 runtime

页面整合包自带 `offline-kit` 命令（命令名里的 kit 即 runtime 包），按包的版本下载对应平台的 runtime：

```sh
npx offline-kit fetch --target aarch64-apple-darwin,x86_64-pc-windows-msvc --out vendor/kit
```

也可以从 GitHub Release 下载，详见[安装与启动 runtime](./install-kit.md)。

## 3. 启动 runtime

Host 拉起 runtime 进程，并传入一个可写的工作目录：

```sh
offline-kit-runtime serve --work <可写目录>
```

runtime 在标准输出写出第一帧 `{"ready":true,...}` 后，Host 才能发送命令。

## 4. 在页面里创建编辑器

页面先加载资源索引 `catalog.json`（随 npm 包发布在 `dist/resources/` 下，由 Host 以受控地址提供给页面），再创建编辑器。下面以只读打开一份文档为例：

```ts
import { createOfflineEditor, parseResourceCatalog } from "@officesdk/officesdk-core-editor";

const baseUrl = "app-resources://officesdk/";          // Host 提供的资源地址
const catalog = parseResourceCatalog(await (await fetch(new URL("catalog.json", baseUrl))).json());

const editor = await createOfflineEditor({
  container: document.getElementById("editor")!,
  suite: "document",            // document | presentation | sheet | pdf
  mode: "readonly",
  content,                      // Host 从 runtime open 响应里拿到的 content
  language: "zh-CN",
  direction: "ltr",
  resources: {
    baseUrl,
    catalog,
    // Writer、Presentation、PDF 共用的运行库，按此顺序加载
    runtimeScripts: ["shared/react.js", "shared/react-dom.js", "shared/react-aliases.js"],
  },
  fontProvider,                 // Host 提供的系统字体目录与字体读取接口
});

editor.on("stateChange", (state) => console.log(state.stage));
await editor.start();
```

编辑模式还需要把页面变化交给 Host，见[打开、编辑、保存](./open-edit-save.md)。各编辑器的配置项见[公共配置项](../editors/index.md)。

### 不经打包器加载：单文件页面包

页面不经打包器、直接在 WebView 里用 `import` 加载时，有两种方式，导出完全相同：

- 单文件：`dist/bundle/offline-editor.js`（包内子路径 `@officesdk/officesdk-core-editor/bundle/offline-editor.js`），一个自包含的 ES 模块。Host 把这一个文件以受控地址提供给页面即可：

  ```ts
  const { createOfflineEditor, parseResourceCatalog } = await import("app-resources://officesdk/editor/offline-editor.js");
  ```

- 目录：`dist/esm/` 整个目录，入口 `dist/esm/index.js`，模块之间是相对路径导入，同样不需要打包器。

两种方式都没有对其他包的导入；编辑器资源仍从 `dist/resources/` 按 `catalog.json` 加载。单文件包的摘要记在每个版本的 `kit-manifest.json` 的 `editor.bundle` 里，自行下载的 Host 可按它校验。

## 下一步

- [产品概览](./overview.md)
- [安装与启动 runtime](./install-kit.md)
- [打开、编辑、保存](./open-edit-save.md)
- [用 JS API 修改文档](./ai-editing.md)
- [runtime 接口](../reference/runtime.md)
- [编辑器配置](../editors/index.md)
- [版本与兼容性](../reference/versioning.md)
