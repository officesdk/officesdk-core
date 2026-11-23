# runtime 接口

本页列出 runtime 对宿主应用（Host）公开的全部接口：Host 可以依赖它们，它们按[版本规则](./versioning.md)与下文[兼容性](#兼容性)演进。适用于协议版本 `"5"`、工作根关联表版本 3。

runtime 包里的 `guide/` 是逐条说明，`guide/host-channel.json` 是每条命令字段的机器可读定义；两者与本页不一致时以包内文件为准。包内说明里的「Kit」指的就是 runtime。

## 接口一览

| 接口 | 用途 |
| --- | --- |
| [命令行](#命令行) | 启动服务、查询版本 |
| [包内文件](#包内文件) | runtime 包的文件布局与启动检查 |
| [标准流](#标准流) | stdin、stdout、stderr 与字节侧流的布局 |
| [命令帧](#命令帧) | Host 与 runtime 交换的 JSON 帧格式与配对规则 |
| [ready 帧](#ready-帧) | 启动完成的握手 |
| [命令](#命令) | 23 条命令：文档会话、文件密码、媒体、字体、限制编辑 |
| [文件格式](#文件格式) | 能打开、保存、导出的文件 |
| [错误码](#错误码) | 失败响应的 `code` 与下一步，以及「结果未知」 |
| [侧流帧](#侧流帧) | 媒体与字体字节的分块格式 |
| [嵌入模式](#嵌入模式-harmonyos) | HarmonyOS 的 N-API 接口 |
| [发行信息](#发行信息) | `release.json` 与 `kit-manifest.json` 的公开字段 |
| [兼容性](#兼容性) | 哪些变化会、哪些不会出现在同一协议版本里 |

runtime 不提供 HTTP 接口。页面加载资源、读取媒体用的地址由 Host 自己提供，见[不在承诺范围内](#不在承诺范围内)。

## 命令行

```sh
offline-kit-runtime serve --work <DIR>      # 启动服务
offline-kit-runtime --version               # 一行版本信息
offline-kit-runtime --version --json        # 完整发行信息（JSON）
```

| 参数 | 说明 |
| --- | --- |
| `serve --work <DIR>` | 启动服务。`<DIR>` 是应用交给 runtime 的可写工作根，runtime 在里面保存打开中的文档记录 |
| `--version` | 输出一行：`offline-kit <版本> (protocol <协议>, index <关联表版本>, <渠道>)`，例如 `offline-kit 0.3.0 (protocol 5, index 3, stable)`。不需要工作根，不启动服务 |
| `--version --json` | 输出编进程序的发行信息，与包内 `release.json` 相同，字段见[发行信息](#发行信息) |

只接受这三种形式；其他参数（包括不带 `serve`）报告用法并以非零状态退出。安装目录、缓存目录不是启动参数，runtime 按自身可执行文件所在目录找到包内文件。

工作根下的 `production.json` 是转换配置：不存在时 runtime 写入默认内容，已存在时原样使用；runtime 在发出 ready 之前加载它，修改后需重启 runtime 才生效。文件不可读或不是 JSON 对象时启动失败，原文件不被覆盖。

## 包内文件

runtime 包里的文件放在同一目录，runtime 按自身可执行文件所在目录找到它们：

| 文件 | 说明 |
| --- | --- |
| `offline-kit-runtime` | runtime 主程序（Windows 为 `.exe`） |
| `compose-worker` | 表格合并用的子进程（Windows 为 `.exe`） |
| `modoc.js` | `compose-worker` 加载的脚本 |
| `mow_wasm.js`、`mow_wasm.d.ts`、`mow_wasm_bg.wasm` | 文档模型的 WebAssembly 文件 |
| `guide/` | 随包的协议说明，`guide/host-channel.json` 是各命令字段的定义 |
| `release.json` | 发行信息，见[发行信息](#发行信息) |
| `LICENSE.md` | 许可声明 |

- 分发时保持这个布局，不要改名或拆开。`serve` 启动时检查 `compose-worker` 与 `modoc.js` 是否存在，缺少时启动失败。三个 WebAssembly 文件随包提供，`serve` 不读取它们。
- HarmonyOS 包的文件不同，见[嵌入模式](#嵌入模式-harmonyos)。

## 标准流

拉起进程时准备四条管道：

| 流 | 方向 | 内容 |
| --- | --- | --- |
| stdin | Host → runtime | 命令帧 |
| stdout | runtime → Host | 响应帧（第一帧是 ready） |
| stderr | runtime → Host | 错误文本，只用于日志 |
| 第 3 号描述符 | 双向 | 媒体与字体字节（[侧流帧](#侧流帧)） |

- 第 3 号描述符必须是管道或 socket，否则 runtime 没有字节通道，媒体与字体命令不可用。Node.js 写成 `stdio: ["pipe", "pipe", "pipe", "pipe"]`。
- **Windows**：字节通道拆成两条单向管道。设置环境变量 `OFFLINE_KIT_STREAM_HANDLES=<runtime 读端>,<runtime 写端>`（两个可继承句柄的十进制值）；不设置时 runtime 使用继承的描述符 3（读）与 4（写），Node.js 写成五个 `"pipe"`，Host 向下标 3 写、从下标 4 读。

## 命令帧

每一帧是 **4 字节大端长度 + UTF-8 JSON 对象**，长度不含这 4 字节，上限 67108864 字节。

```text
00 00 00 29   {"id":"1","op":"open","path":"book.xlsx"}
```

- 命令对象带顶层 `op` 与 Host 生成的 `id`。`id` 是非负整数，或 1 到 128 字节的非空字符串；字符串 `"1"` 与数字 `1` 是不同的 id。响应原样回显 `id`，Host 按它配对。
- 成功响应带 `"ok": true`；明确失败带 `"ok": false`、稳定的 `code` 与英文 `error`。按 `code` 分支，`error` 的句子会改写，不能用来比较。
- runtime 最多接受 8 条未完成的命令，按接受顺序一次执行一条；第 9 条留在管道里。Host 可以连续写入，但必须同时读取 stdout。
- 同一 `id` 的上一条还没有响应时再次使用，返回 `duplicate-id`，先接受的那条照常完成。
- 缺少合法 `id`、不是 JSON、不是对象的帧分别返回 `id-required`、`request-not-json`、`request-not-object`，这三种响应不带 `id`。
- 不使用 jsonrpc 信封（没有 `jsonrpc`、`method`、`params`）。
- 字段除特别说明外都是字符串；`unsaved`、`hasPassword`、`pending`、`diskChanged`、`overwrite` 是布尔，`length`、`offset`、`totalLength` 是数字。空的必填字符串按缺少处理。
- 请求带未列出的字段返回 `unknown-field`；带工作目录类键（`workdir`、`cachedir`、`revision` 等）返回 `forbidden-field`。`overwrite` 只在值为 `true` 时发送。

## ready 帧

runtime 完成启动检查后，向 stdout 写出第一帧，不带 `id`：

```json
{"ready":true,"protocolVersion":"5","kitVersion":"0.3.0"}
```

| 字段 | 说明 |
| --- | --- |
| `ready` | `true` |
| `protocolVersion` | 协议版本。Host 只与相同协议版本的 runtime 通信，不同时停止发送 |
| `kitVersion` | 可选，runtime 的发行版本号，只用于记录与诊断（字段名里的 Kit 即 runtime） |

Host 必须先读到 `ready` 为 `true` 再发送命令，并且不能因为 ready 帧缺少 `kitVersion` 或多出字段而拒绝它。

## 命令

下表的字段以 `guide/host-channel.json` 为准。所有成功响应都带 `ok`，失败响应带 `ok`、`code`、`error`，表中不再重复。

### 文档会话

| op | 必填 | 可选 | 成功响应 |
| --- | --- | --- | --- |
| `open` | `path` | `password` | `documentId`、`suite`、`content`、`unsaved`；可带 `diskChanged`、`nextChangeSetRevision` |
| `new` | `suite`（`document`、`sheet`、`presentation`、`pdf`） | — | `documentId`、`suite`、`content`、`unsaved`；可带 `nextChangeSetRevision` |
| `content` | `documentId` | — | 同 `open`（不读用户文件，不带 `diskChanged`） |
| `import` | `documentId` | `password`、`overwrite` | 同 `open`：用磁盘上的文件替换当前记录 |
| `change` | `documentId`、`body` | — | 无其他字段 |
| `save` | `documentId` | `target`、`overwrite` | 无其他字段 |
| `export` | `documentId`、`target` | `overwrite` | 无其他字段 |
| `discard` | `documentId` | — | 无其他字段 |

- `documentId` 由 runtime 给出，后续命令都用它；`suite` 决定页面创建哪种编辑器；`content` 原样交给页面。
- `unsaved` 为 `true` 表示工作根里有上次未保存的修改，`content` 已包含它们。`diskChanged` 表示用户文件在磁盘上被改过；用户确认后才发 `import`。
- `nextChangeSetRevision` 只在 `document` 与 `presentation` 出现，编辑模式下传给页面。
- `change.body` 是页面 `change` 事件里的 `body` 原文，不能带 `media`。Host 按产生顺序一次提交一条；保存、导出、导入、放弃之前，先等已提交的 `change` 都有响应。
- `save` 不带 `target` 时写回打开时的文件；带 `target` 时另存并改为绑定新路径。`export` 写到 `target`，不改变绑定。
- `discard` 丢弃工作根里未保存的修改，只在用户明确放弃时发送；关闭窗口不发。

### 文件密码

| op | 必填 | 成功响应 |
| --- | --- | --- |
| `has-password` | `documentId` | `hasPassword` |
| `session-password` | `documentId` | `password`（本次进程里的会话密码明文，只留在 Host） |
| `set-password` | `documentId`、`password` | 无其他字段 |
| `clear-password` | `documentId` | 无其他字段 |

打开加密文件时，第一次不带 `password`；返回 `need-password` 或 `wrong-password` 后，由 Host 收集密码再带 `password` 重发同一 `open`（或 `import`）。页面不接触文件密码。

### 媒体

| op | 必填 | 可选 | 成功响应 |
| --- | --- | --- | --- |
| `begin-media-write` | `documentId`、`extension` | `kind` | `stream` |
| `finish-media-write` | `documentId`、`stream` | — | `reference` |
| `open-media-read` | `documentId`、`reference`、`purpose` | `range` | `stream`、`contentType`、`length`；带 `range` 时另有 `offset`、`totalLength` |

- 写入：`begin-media-write` 取得 `stream` → 在字节侧流上写入这一流编号的全部字节 → `finish-media-write` 取得 `reference`，原样交给页面。`extension` 是最多 8 位字母数字、不带点；`kind`：document 为 `image` 或 `embedding`，presentation 为 `media` 或 `embeddings`，pdf 为 `embedding`，sheet 不带；不符时返回 `media-kind-rejected`。
- 读取：`purpose` 为 `display` 或 `download`；按 `stream` 从侧流读满 `length` 字节。表格里的 EMF、WMF、TIFF 图片以 `display` 读取时返回 PNG 预览（Windows 包不含此预览）。
- 视频与音频按段读取：把 HTTP `Range` 的单段范围（`bytes=a-b`、`bytes=a-`、`bytes=-n`）放进 `range`，Host 按 `offset`、`totalLength` 回 206；范围不成立返回 `media-range-unsatisfiable`，Host 回 416。多段范围不要转给 runtime，按整份读取。
- 媒体命令不能带 `bytes` 或 `path`。

### 字体

在 ready 之后调用，不带 `documentId`。

| op | 必填 | 成功响应 |
| --- | --- | --- |
| `font-catalog` | — | `pending`、`schemaVersion`、`catalogVersion`、`fonts` |
| `font-read` | `resourceId` | `resourceId`、`stream`、`contentType`、`length`（字节在侧流） |
| `font-prioritize` | `family` | 无其他字段 |

字体索引还没准备好时，`font-catalog` 返回空的 `fonts` 与 `pending: true`。`resourceId` 取自目录条目，响应里不出现本机路径。

### 限制编辑（document）

| op | 必填 | 可选 | 成功响应 |
| --- | --- | --- | --- |
| `restriction-update-rules` | `documentId`、`body` | — | 无其他字段 |
| `restriction-set-password` | `documentId`、`newPassword` | — | 无其他字段 |
| `restriction-change-password` | `documentId`、`currentPassword`、`newPassword` | — | 无其他字段 |
| `restriction-remove-password` | `documentId` | `currentPassword` | 无其他字段 |
| `restriction-verify-password` | `documentId`、`currentPassword` | — | `status` |

对应 Writer 的限制编辑服务（页面整合包的 `createEditRestrictionServices`）。离线只支持「所有人」范围；口令为 6 到 15 个可见 ASCII 字符。写入后记录变为未保存，保存时随文档写回。

## 文件格式

| 打开的扩展名 | `suite` | 保存与导出的目标 |
| --- | --- | --- |
| `.docx`、`.doc` | `document` | 只写 `.docx`；`.doc` 文件需另存为 `.docx` |
| `.pptx`、`.ppt` | `presentation` | 只写 `.pptx`；`.ppt` 文件需另存为 `.pptx` |
| `.xlsx`、`.xls` | `sheet` | 目标扩展名为 `.xlsx` 或 `.xls`，建议 `.xlsx` |
| `.pdf` | `pdf` | 只写 `.pdf` |

保存与导出只写与原文件同类的文件，不做跨格式转换（例如 `.docx` 不能导出为 `.pdf`）。document、presentation、pdf 的目标格式不符时返回 `unsupported-format`，编辑不会丢失，仍在记录里；sheet 的目标扩展名不符时返回 `convert-failed`。`new` 可以新建 `document`、`sheet`、`presentation` 与 `pdf`（PDF 为一页空白 A4）。

## 错误码

按 `code` 分支。下表按场景分组，每个 `code` 的完整说明在包内 `guide/` 的失败说明里。

| 场景 | `code` |
| --- | --- |
| 帧与字段 | `request-not-json`、`request-not-object`、`id-required`、`duplicate-id`、`operation-required`、`unknown-operation`、`unknown-field`、`missing-field`、`forbidden-field`、`response-too-large`、`response-rejected` |
| 必填字段 | `path-required`、`document-id-required`、`target-required`、`suite-required`、`change-body-required`、`password-required` |
| 打开与内容 | `need-password`、`wrong-password`、`open-failed`、`content-load-failed`、`document-missing`、`suite-missing`、`blank-template-missing` |
| 编辑与保存 | `change-body-rejected`、`media-forbidden`、`save-in-progress`、`save-did-not-complete`、`file-changed`、`path-missing`、`target-in-use`（响应带 `holderDocumentId`）、`unsupported-format`、`convert-failed`、`compose-no-result`、`copy-failed`、`result-unknown` |
| 媒体 | `unknown-media-reference`、`media-kind-rejected`、`media-stream-unavailable`、`media-stream-too-large`、`media-range-unsatisfiable` |
| 字体 | `font-provider-missing`、`font-request-rejected`、`font-read-rejected`、`font-family-rejected`、`font-stream-unavailable`、`font-stream-too-large`、`not-found` |
| 限制编辑 | `restriction-invalid`、`restriction-malformed`、`restriction-password-required`、`restriction-password-incorrect`、`restriction-password-already-set`、`restriction-password-not-set`、`protection-unsupported` |

几条需要特别处理：

- `file-changed`：写回绑定文件时磁盘上的文件已被改动。取得用户选择后再带 `overwrite: true` 覆盖、另存，或 `import`。
- `target-in-use`：目标文件属于另一份记录（`holderDocumentId`）。用户确认后再带 `overwrite: true`。
- `result-unknown`：这次修改是否已落盘未知。不要重放；这份记录在 runtime 重启前不再接受修改，重启后重新打开。
- 打开或内容加载失败时不要用 `discard` 清理记录。

### 结果未知

命令帧已经写入 stdin，但没有收到可用的响应（stdout 关闭、长度超限、响应不是 JSON、进程退出）时，这条命令的结果**未知**。它不是一个 `code`：

- 不要假定成功或失败，停止向这份文档发送保存、导出、导入与放弃；
- 不要重发同一帧确认，也不要用 `discard` 清理记录（记录留在工作根里，重启后可以继续）。

请求在写入前就超过 67108864 字节时，帧没有写出，属于明确失败，缩小后可以重试。

## 侧流帧

媒体与字体字节不进命令 JSON，走第 3 号描述符（Windows 上为两条单向管道）。每一块是 16 字节头加正文：

| 偏移 | 长度 | 含义 |
| --- | --- | --- |
| 0 | 8 | 大端无符号 64 位流编号 |
| 8 | 8 | 大端无符号 64 位正文长度 |
| 16 | 正文长度 | 文件字节 |

- 正文上限 268435456 字节（256 MiB），超过时这条侧流失败；大的视频、音频用 `range` 分段读取。
- 命令响应里的 `stream` 是流编号的十进制字符串。字节可能早于对应的 JSON 响应到达，Host 按流编号缓存，等响应给出 `stream` 与 `length` 后再交给页面。

## 嵌入模式（HarmonyOS）

HarmonyOS 应用不能执行可执行文件，runtime 以 N-API 模块 `liboffline_kit.so` 运行在应用进程里。命令帧、侧流帧、命令与错误码同上。包内文件：`liboffline_kit.so`（放进 HAP 模块的 `libs/arm64-v8a/`）、ArkTS 类型声明 `index.d.ts`、`modoc.js`、三个 WebAssembly 文件、`guide/`、`release.json`、`LICENSE.md`；没有 `offline-kit-runtime` 与 `compose-worker`。

Host 把 `modoc.js` 放进 rawfile，启动前复制到应用沙箱里的一个目录，把这个目录作为 `resourceDir` 传给 `start`。

```ts
import kit from 'liboffline_kit.so';

const handle = kit.start(resourceDir, workDir, onFrame, onSide, onExit);
handle.send(frameBytes);      // 一条命令帧的 JSON 字节，不带长度前缀
kit.version();                // 与 offline-kit-runtime --version 相同的一行
```

| 成员 | 说明 |
| --- | --- |
| `start(resourceDir, workDir, onFrame, onSide, onExit)` | 启动并立即返回 runtime 句柄。`resourceDir` 是放 `modoc.js` 的沙箱目录，`workDir` 对应 `serve --work`；`onFrame` 收到去掉长度前缀的响应帧（第一条是 ready），`onSide` 收到侧流原始字节，`onExit` 在停止时调用（正常关闭为 `null`，失败为错误文本） |
| `handle.send(frame)` | 写一条命令帧（不带长度前缀）；超过 67108864 字节直接抛错，属于明确失败 |
| `handle.sideWrite(bytes)` | 写侧流字节（插入媒体） |
| `handle.close()` | 等同结束 stdin，处理完已接受的命令后停止 |
| `version()` | 一行版本信息，与 `--version` 相同 |
| `releaseInfo()` | 发行信息 JSON 文本，与 `--version --json` 相同 |

- 一个应用进程同时只能有一个 runtime；第二次 `start` 以 `onExit` 报错结束。`close()` 之后可以用同一个 `workDir` 再次 `start`；同一个进程里换另一个 `workDir` 再 `start` 会启动失败（转换配置一个进程只加载一次），要换工作根需重启应用。
- Host 要一直持有 `start` 返回的句柄，它被回收时等同 `close()`。
- `production.json` 一个进程只加载一次，修改后要重启应用。runtime 通过进程环境变量 `CONFIG_PATH` 向内部转换器传递配置路径，应用的其他代码不要读写这个变量。
- 每次格式转换期间，runtime 会临时改写进程环境变量 `TMPDIR`，转换结束后恢复。嵌入模式下这就是应用自己的进程：应用代码不要在 runtime 工作时依赖 `TMPDIR`。
- 目前没有 stderr，启动错误经 `onExit` 交回。

## 发行信息

### release.json

runtime 包与页面整合包都带同一份发行信息：runtime 包根目录的 `release.json`（也是 `--version --json` 的输出），页面整合包的 `dist/release.json`（页面里用 `getReleaseInfo()` 读取）。

| 字段 | 说明 |
| --- | --- |
| `format` | 文件格式版本，目前为 `1` |
| `version` | 发行版本号 `X.Y.Z` 或 `X.Y.Z-rc.N` |
| `channel` | `stable`、`rc` 或 `dev` |
| `compat.protocolVersion` | 命令帧协议版本，等于 ready 帧的 `protocolVersion` |
| `compat.indexVersion` | 工作根关联表版本 |
| `compat.readsIndexVersions` | 还能打开的旧关联表版本 |
| `compat.catalogFormat` | 编辑器资源目录 `catalog.json` 的格式版本 |
| `compat.downgradeFloor` | 用这个版本写过的工作根，最低还能交给哪个版本的 runtime 打开 |
| `editors.<名>.version` | 内置的 Writer、Presentation、Sheet、PDF 编辑器版本（键为 `writer`、`presentation`、`sheet`、`pdf`） |
| `page.package`、`page.version` | 页面整合包的包名与版本 |

### kit-manifest.json

每个版本的 GitHub Release 附带 `kit-manifest.json`，供需要在运行时下载 runtime 与编辑器资源的 Host 使用（文件名与字段里的「kit」即 runtime 包）。

| 字段 | 说明 |
| --- | --- |
| `v` | 清单格式版本，目前为 `1` |
| `officeKit` | `version`、`protocol`、`indexVersion`、`readsIndexVersions`、`downgradeFloor` |
| `sources` | runtime 包的下载源列表（GitHub Release 的 `v<版本>/` 目录） |
| `kit.<平台键>` | 每个平台一项：`status`、`file`、`size`、`sha256`、`integrity`、入口 `binary`（可执行文件）或 `module`（HarmonyOS 的 `liboffline_kit.so`），以及包内每个文件的摘要 `files` |
| `editor` | 页面整合包：`file`、`size`、`sha256`、`integrity`、资源根 `root`、npm 来源 `npm` 与 `sources`、资源文件摘要 `files`；带单文件页面包时另有 `bundle` |

`sha256`、`integrity` 用 SRI 写法（`sha256-<base64>`、`sha512-<base64>`）。

| 平台键 | target | 入口 |
| --- | --- | --- |
| `darwin-arm64` | `aarch64-apple-darwin` | `binary`：`offline-kit-runtime` |
| `darwin-x64` | `x86_64-apple-darwin` | `binary`：`offline-kit-runtime` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `binary`：`offline-kit-runtime` |
| `linux-x64` | `x86_64-unknown-linux-gnu` | `binary`：`offline-kit-runtime` |
| `win32-arm64` | `aarch64-pc-windows-msvc` | `binary`：`offline-kit-runtime.exe` |
| `win32-x64` | `x86_64-pc-windows-msvc` | `binary`：`offline-kit-runtime.exe` |
| `openharmony-arm64` | `aarch64-unknown-linux-ohos` | `module`：`liboffline_kit.so` |

`status` 为 `stable` 表示已在该平台完成运行验收，`test` 表示随版本发布、仍在验证中。每个版本实际提供的平台以该版本的 Release 为准。

## 兼容性

- **协议版本**（ready 帧的 `protocolVersion`）变化或工作根关联表版本升级时，发行版本升 MAJOR；协议版本不同的 Host 与 runtime 不能混用。
- 协议内追加可选字段或错误码时，发行版本升 MINOR。Host 应忽略不认识的响应字段，对不认识的 `code` 按一般失败处理。
- `0.x` 期间，不兼容的变化可能只升 MINOR（例如某个套件的内容格式或必带字段变化），这时 Release 说明会写明升级须知。升级前对照 Release 说明，并以新版本 runtime 包内的 `guide/` 与 `guide/host-channel.json` 为准。
- 新 runtime 能打开 `readsIndexVersions` 列出的旧版本工作根；回退到旧 runtime 时，目标版本不能低于 `downgradeFloor`。
- editor 与 runtime 始终使用同一版本，见[版本与兼容性](./versioning.md)。

## 不在承诺范围内

下面这些可能在任何版本改变，Host 不要依赖：

- 工作根里的文件与目录结构（打开中的记录、关联表、转换临时目录）。Host 只把工作根交给 runtime，不读写其中内容。
- `production.json` 的字段含义。它由随包的转换器解释，runtime 只检查它是 JSON 对象。
- runtime 包里辅助文件（`compose-worker`、`modoc.js`、`mow_wasm*`）的调用方式与它们之间的协议。按[包内文件](#包内文件)的布局随 runtime 分发即可（HarmonyOS 另按 `resourceDir` 的要求复制 `modoc.js`）。
- runtime 对进程环境变量（`CONFIG_PATH`、`TMPDIR`）的具体用法。
- stderr 上的文本，以及失败响应里英文 `error` 的措辞。
- 参考集成里 Host 自己的方法名、页面桥接方式与资源地址。runtime 只认上面的命令帧，不提供 HTTP 服务；页面加载资源、读取媒体所用的地址（自定义协议或本地 HTTP）由 Host 实现。
