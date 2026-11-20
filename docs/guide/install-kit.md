# 安装与启动 Kit

Kit 是随应用分发的本地文档进程。它的版本必须与页面整合包 `@officesdk/officesdk-core-editor` 相同。

## 支持的平台

| 平台 | 目标名（target） | 包内主程序 |
| --- | --- | --- |
| macOS Apple 芯片 | `aarch64-apple-darwin` | `offline-kit-runtime` |
| macOS Intel | `x86_64-apple-darwin` | `offline-kit-runtime` |
| Linux arm64 | `aarch64-unknown-linux-gnu` | `offline-kit-runtime` |
| Linux x64 | `x86_64-unknown-linux-gnu` | `offline-kit-runtime` |
| Windows ARM64 | `aarch64-pc-windows-msvc` | `offline-kit-runtime.exe` |
| Windows x64 | `x86_64-pc-windows-msvc` | `offline-kit-runtime.exe` |
| HarmonyOS arm64 | `aarch64-unknown-linux-ohos` | N-API 模块 `liboffline_kit.so`，运行在应用进程内 |

Windows 包不含 EMF/WMF/TIFF 图片的预览渲染。

## 下载

### 用 offline-kit 命令

安装页面整合包后，在项目里执行：

```sh
npx offline-kit info                                    # 查看本包的发行信息
npx offline-kit fetch --target aarch64-apple-darwin --out vendor/kit
npx offline-kit fetch --target aarch64-apple-darwin,x86_64-pc-windows-msvc --out vendor/kit
npx offline-kit outdated --channel stable               # 检查是否有更新的稳定版
```

`fetch` 从下文的 GitHub Release 下载与本包同版本的 Kit（`https://github.com/officesdk/officesdk-core/releases/download/v<版本>/`），校验 SHA-256 与大小后解压到 `<out>/<target>/`（整体替换）。下载内容缓存在 `~/.cache/offline-kit/`，缓存齐全时可以离线重复执行。网络失败或摘要不符时以非零状态退出。

`outdated` 和 `fetch --channel` 从 npm 上 `@officesdk/officesdk-core-editor` 的 dist-tag 得知各通道的最新版本：`stable` 对应 `latest`；`rc` 对应 `next` 与 `latest` 中较新的一个，所以稳定版发出后，rc 通道也会提示它。

可用环境变量改下载与查询的位置：

| 环境变量 | 作用 |
| --- | --- |
| `OFFLINE_KIT_RELEASE_URL` | 与 GitHub 相同目录结构的镜像，填到 `releases/download/` 为止，命令下载 `<基址>v<版本>/<文件>` |
| `OFFLINE_KIT_NPM_REGISTRY` | 查询通道版本用的 npm registry。不设时用 npm 配置的 registry（`npx` 运行时传入），再缺省为 `https://registry.npmjs.org/`；按 scope 单独配置的 registry 不会读取 |
| `OFFLINE_KIT_DIST_URL` | 企业内部的发行目录（`releases/<版本>/`、`channels/<通道>.json` 结构）。设置后优先于上面两项 |
| `OFFLINE_KIT_CACHE_DIR` | 缓存目录 |

不论从哪里下载，都按 `release.json` 中的 SHA-256 校验，摘要不符即失败。

### 从 GitHub Release 下载

Kit 在 [officesdk/officesdk-core 的 Releases](https://github.com/officesdk/officesdk-core/releases) 发布（tag `v<版本>`），每个版本附带：

- `officesdk-core-runtime-<版本>-<target>.tar.gz`：各平台的 Kit（0.2.5-rc.7 及以前名为 `offline-kit-<版本>-<target>.tar.gz`）；
- `release.json`：版本信息与各文件的摘要；
- `SHA256SUMS`：各文件的 SHA-256（其中列出的页面整合包不在 Release 里，从 npm 安装）；
- `LICENSE.md`：许可声明；
- `kit-manifest.json`：Kit 与编辑器资源的下载清单，按平台列出 Kit 包和包内每个文件的摘要，编辑器资源指向 npm 包
  `@officesdk/officesdk-core-editor`，供需要在运行时下载 Kit 的调用方使用。

各版本的 Release 与 npm 包对照见[门面仓库首页的版本表](https://github.com/officesdk/officesdk-core#版本)。

下载后先校验：

```sh
sha256sum -c SHA256SUMS --ignore-missing      # macOS 用 shasum -a 256 -c SHA256SUMS --ignore-missing
tar -xzf officesdk-core-runtime-<版本>-aarch64-apple-darwin.tar.gz -C vendor/kit/aarch64-apple-darwin
```

## 包内文件

这些文件放在同一目录。Kit 按自身可执行文件所在目录找到它们，启动命令不传这些路径。

| 文件 | 作用 |
| --- | --- |
| `offline-kit-runtime` | 文档进程（Windows 为 `.exe`） |
| `compose-worker` | 表格合并子进程（Windows 为 `.exe`） |
| `modoc.js` | `compose-worker` 加载的脚本 |
| `mow_wasm.js`、`mow_wasm.d.ts`、`mow_wasm_bg.wasm` | 文档模型的 WebAssembly 文件 |
| `guide/` | 随包的协议与调用说明，`guide/host-channel.json` 是各命令字段的权威定义 |
| `release.json` | 本包的发行信息 |
| `LICENSE.md` | 许可声明 |

## 启动

```sh
offline-kit-runtime serve --work <可写目录>
```

- 参数只有 `serve` 和 `--work`。`<可写目录>` 是应用交给 Kit 的工作根，Kit 在里面保存打开中的文档记录。Host 不读取其中的内容。
- 不带 `serve` 启动会失败退出。
- 工作根下的 `production.json` 是转换配置：不存在时 Kit 写入默认内容，已存在时原样使用。修改后需重启 Kit。

查看版本（不需要工作根，也不启动服务）：

```sh
offline-kit-runtime --version          # offline-kit 0.3.0 (protocol 5, index 3, stable)
offline-kit-runtime --version --json   # 完整的发行信息，与包内 release.json 相同
```

## 四条标准流

拉起子进程时准备四条管道：

| 流 | 方向 | 内容 |
| --- | --- | --- |
| stdin | Host → Kit | 命令帧 |
| stdout | Kit → Host | 响应帧 |
| stderr | Kit → Host | 错误文本，只用于日志，不是命令帧 |
| 第 3 号描述符 | 双向 | 媒体与字体的字节 |

第 3 号描述符必须是管道或 socket。Node.js 中写成 `stdio: ["pipe", "pipe", "pipe", "pipe"]`。

Windows 上这条字节通道拆成两条单向管道：Kit 读端与 Kit 写端。可以设置环境变量 `OFFLINE_KIT_STREAM_HANDLES=<读端句柄>,<写端句柄>` 传入两个可继承句柄；不设置时 Kit 使用继承的描述符 3（读）与 4（写），Node.js 中写成五个 `"pipe"`。

## ready 帧

Kit 完成启动检查后，向 stdout 写出第一帧：

```json
{"ready":true,"protocolVersion":"5","kitVersion":"0.2.5"}
```

Host 必须先读到 `ready` 为 `true`，再发送任何命令。`kitVersion` 只用于记录和诊断，可与页面中的 `getReleaseInfo().version` 对照，见[版本与兼容性](../reference/versioning.md)。

## 退出

关闭 stdin 只表示 Host 不再发送命令。打开中的文档记录保留在工作根里，下次可以继续。只有用户明确放弃修改时才发送 `discard`；关窗口不发 `discard`。

## HarmonyOS

HarmonyOS 应用不能执行包内的可执行文件，Kit 以 N-API 模块 `liboffline_kit.so` 运行在应用进程的线程上，没有 `compose-worker`。命令帧、字节通道、命令和错误码与进程模式相同。包内的 `index.d.ts` 描述 ArkTS 接口：

```ts
import kit from 'liboffline_kit.so';

const handle = kit.start(resourceDir, workDir, onFrame, onSide, onExit);
```

`resourceDir` 是放 `modoc.js` 的目录，`workDir` 对应 `serve --work` 的工作根，`onFrame` 每次收到一条去掉长度前缀的命令帧（第一条是 ready）。详见包内 `guide/`。

接入步骤：

1. 下载：`npx offline-kit fetch --target aarch64-unknown-linux-ohos --out vendor/kit`，或按上文从 Release 下载 `officesdk-core-runtime-<版本>-aarch64-unknown-linux-ohos.tar.gz` 并校验。
2. 把 `liboffline_kit.so` 放进 HAP 模块的 `libs/arm64-v8a/`。
3. 把 `index.d.ts` 放到 `src/main/cpp/types/liboffline_kit/index.d.ts`，同目录的 `oh-package.json5` 写 `"name": "liboffline_kit.so", "types": "./index.d.ts"`，模块依赖里引用这个目录。
4. 把 `modoc.js` 放进 rawfile，启动前复制到沙箱目录，把这个目录作为 `resourceDir` 传给 `start`。

`kit-manifest.json` 里鸿蒙的平台键是 `openharmony-arm64`，入口写在 `module` 字段（`liboffline_kit.so`），没有 `binary` 字段。

HarmonyOS 包目前是预览：嵌入入口已在 macOS 上用同一套代码测过，还没有在 HarmonyOS 设备上运行过。
