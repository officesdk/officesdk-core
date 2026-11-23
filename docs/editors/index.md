# 公共配置项

`createOfflineEditor(options)` 创建一个编辑器，返回 Promise。`suite` 选择编辑器，`mode` 选择只读或编辑。四种编辑器共用本页的配置项，各自的差异见：

- [Writer（文档）](./writer.md)：`suite: "document"`
- [Presentation（演示）](./presentation.md)：`suite: "presentation"`
- [Sheet（表格）](./sheet.md)：`suite: "sheet"`
- [PDF](./pdf.md)：`suite: "pdf"`

未知的配置项会被拒绝，而不是静默忽略。未提供的可选能力保持关闭。

## 配置项一览

| 配置项 | 必填 | 说明 |
| --- | --- | --- |
| `container` | 是 | 编辑器挂载的 DOM 元素 |
| `suite` | 是 | `"document"`、`"presentation"`、`"sheet"` 或 `"pdf"`，与 runtime `open` 响应的 `suite` 一致 |
| `mode` | 是 | `"readonly"` 或 `"edit"` |
| `content` | 是 | runtime `open` / `content` 响应中的 `content`，原样传入 |
| `language` | 是 | 界面语言，如 `"zh-CN"`、`"en-US"`（各编辑器支持的语言见各自页面） |
| `direction` | 是 | 目前只支持 `"ltr"` |
| `resources` | 是 | 编辑器的静态资源，见 [resources](#resources) |
| `fontProvider` | 是 | 字体目录与字体读取，见 [fontProvider](#fontprovider) |
| `file` | 否 | `{ id?, name? }`：`name` 是展示用的文件名（不能是路径）；`id` 是编辑器内部使用的文件标识，缺省时自动生成，与 runtime 的 `documentId` 无关 |
| `assets` | 否 | 文档内图片等资源的读取，见 [assets](#assets) |
| `attachment` | 否 | 插入与预览附件，见 [attachment](#attachment) |

## resources

编辑器脚本、样式和语言文件。它们随 npm 包发布在 `dist/resources/`，由 Host 用受控地址提供给页面。

| 字段 | 说明 |
| --- | --- |
| `baseUrl` | 资源目录的地址，以 `/` 结尾 |
| `catalog` | `catalog.json` 的内容，先用 `parseResourceCatalog()` 校验 |
| `runtimeScripts` | 共享运行库的相对路径，按顺序加载。Writer、Presentation、PDF 需要 `["shared/react.js", "shared/react-dom.js", "shared/react-aliases.js"]` |
| `sharedLocaleScripts`、`sharedLocaleNamespaces` | 额外的共享语言脚本，一般不需要 |
| `signal` | `AbortSignal`，取消资源加载 |
| `timeoutMs` | 资源加载超时 |

每个脚本和样式都按 `catalog.json` 中的 SHA-256 校验完整性，加载失败、校验不符或缺少语言都会让创建失败。

## fontProvider

Host 提供系统字体目录和按资源号读取字体字节的接口：

```ts
interface OfflineFontProvider {
  getSystemCatalog(options?: { signal?: AbortSignal }): Promise<OfflineSystemFontCatalogResult>;
  readResource(resourceId: string, options?: { signal?: AbortSignal }): Promise<Uint8Array>;
}
```

- 字体目录在页面创建时确定；之后系统字体有变化，需要重新创建页面才能采用。
- 单次目录查询的期限为 2 秒。
- Writer、Presentation、PDF 还可以传 `productFontCatalog`，见各自页面。

## assets

把文档中的资源引用（图片、附件等）换成 Host 提供的读取地址：

```ts
assets: {
  baseUrl: "app-assets://document/",
  resolveReadUrl: (resourceRef) => hostAssetUrl(resourceRef),
}
```

`resources` 和 `assets` 不能混用：前者在创建编辑器前加载编辑器自身的文件，后者在文档打开后读取文档内容中的资源。

## attachment

| 字段 | 模式 | 说明 |
| --- | --- | --- |
| `picker` | 只读、编辑 | 自定义文件选择器；缺省时编辑器在页面里用 `<input type="file">`，也可用 `createBrowserAttachmentPicker(document)` |
| `preview` | 只读、编辑 | `(resourceRef) => void`，用户打开已有附件时由 Host 处理 |
| `store` | 仅编辑 | Host 的写入端口 `OfflineMediaStore`，见下 |

```ts
interface OfflineMediaStore {
  store(input: {
    bucket: "images" | "attachments";
    name: string;
    mime: string;
    file: File;
    signal: AbortSignal;
  }): Promise<{ resourceRef: string }>;
  cancel(resourceRef: string): Promise<void>;
}
```

- `store` 先把文件字节交给 runtime，再返回 runtime 给出的资源引用。
- `cancel` 取消尚未完成的插入，重复调用应成功；它不删除正文已经引用的资源。
- 插入图片与附件需要同时提供 `store` 和 `assets`，缺一项时插入不可用。
- 只读模式不接受 `store`。

## 返回的编辑器对象

| 成员 | 说明 |
| --- | --- |
| `suite` | 编辑器类型 |
| `api` | 各编辑器的页面内接口：`api.writer`、`api.presentation`、`api.sheet`、`api.pdf` |
| `start()` | 启动编辑器；启动失败由它的 Promise 报告 |
| `on(event, listener)` | 注册监听，返回取消函数。事件见下表 |
| `state()` | 当前状态：`stage`、`mode`、`contentReady`、`transferFault` 等 |
| `prepare()` | 收尾正在进行的输入，保存前调用 |
| `request(input)` | 执行页面方法，如 `freeze` / `unfreeze` |
| `destroy()` | 销毁页面并清理监听 |

| 事件 | 回调参数 | 说明 |
| --- | --- | --- |
| `change` | `{ origin, format, body, mediaIds? }` | 编辑变化，须在 `start()` 前注册，并同步交给 Host 的队列 |
| `stateChange` | 页面状态 | 注册后立即收到当前状态 |
| `transferFault` | 页面状态 | 变化交付出错 |
| `saveIntent`、`saveAsIntent`、`exportIntent`、`closeIntent`、`retryIntent` | 页面状态 | 用户在编辑器中触发的文件操作；每种只能注册一个处理者，未注册时对应操作被拒绝 |

监听函数必须同步执行：返回 Promise 或抛出错误都会让当前操作失败。

完整类型见 API 参考中的 `OfflineEditorOptions` 与 `OfflineEditor`。
