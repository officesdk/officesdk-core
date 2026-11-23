# 打开、编辑、保存

本页用一份表格走完打开、编辑、保存、导出的完整流程。页面、Host、runtime 三方的分工是：

- **runtime** 拥有文件：打开文件、接收变化、保存与导出。
- **页面** 只展示内容并产生变化，不读写文件，也不连接 runtime。
- **Host** 在两者之间转发：把 runtime 给的内容交给页面，把页面的变化按顺序交给 runtime。

## 命令帧格式

Host 与 runtime 之间每一帧是 **4 字节大端长度 + UTF-8 JSON**，长度不含这 4 字节，上限 67108864 字节。

```text
00 00 00 29   {"id":"1","op":"open","path":"book.xlsx"}
```

- 每条命令带 Host 生成的 `id`（非负整数，或 1 到 128 字节的字符串），runtime 在响应里原样回显，Host 按 `id` 配对。
- runtime 按接受顺序一次执行一条。Host 可以连续写入，但必须同时读取 stdout。
- 成功响应带 `"ok":true`；明确失败带 `"ok":false` 和 `code`，例如：

```json
{"id":"1","ok":false,"code":"path-required","error":"path required"}
```

- stdout 在响应到来前关闭，或收到的不是可用 JSON 时，这条命令的结果**未知**：不要假定成功或失败，停止再发命令，记录留在工作根里，不要用 `discard` 清理。

## 1. 打开

```json
{"id":"1","op":"open","path":"book.xlsx"}
```

```json
{"ok":true,"id":"1","documentId":"1","suite":"sheet","content":"{...}","unsaved":false}
```

响应里的 `documentId` 由 Host 保存，后续命令都用它；`suite` 决定页面创建哪种编辑器；`content` 原样交给页面。`unsaved` 为 `true` 表示工作根里有上次未保存的修改，内容已包含它们。文档（`document`）与演示（`presentation`）的响应还带 `nextChangeSetRevision`，编辑模式下要传给页面。

## 2. 在页面中编辑

Host 用 runtime 返回的内容创建编辑器，并在 `start()` 之前注册变化监听：

```ts
const editor = await createOfflineEditor({
  container,
  suite: opened.suite,          // "sheet"
  mode: "edit",
  content: opened.content,
  user: { uid: "u-1", name: "Alice" },   // 表格编辑模式必填
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
});

editor.on("change", (change) => {
  // 必须同步入队，不能返回 Promise
  hostQueue.push({ documentId: opened.documentId, body: change.body, format: change.format });
});
editor.on("saveIntent", () => host.save(opened.documentId));   // 用户在编辑器里按下保存

await editor.start();
```

变化按产生顺序交付。Host 把每个变化转成一条 `change` 命令发给 runtime：

```json
{"id":"2","op":"change","documentId":"1","body":"{...}"}
```

```json
{"ok":true,"id":"2"}
```

| 编辑器 | 变化格式 `format` |
| --- | --- |
| Writer（`document`） | `mow-v1` |
| Presentation（`presentation`） | `mop-v1` |
| Sheet（`sheet`） | `modoc-v1` |
| PDF（`pdf`） | `pdf-snapshot-v1`（整份快照） |

## 3. 保存

保存前先让编辑器收尾正在输入的内容，再等所有变化都被 runtime 接受：

```ts
await editor.prepare();     // 收尾正在编辑的单元格、输入法组合等，产生的变化同样经 change 监听交付
await hostQueue.drain();    // Host 自己的队列：等已入队的 change 都收到 ok
```

然后发送保存：

```json
{"id":"3","op":"save","documentId":"1","target":"saved.xlsx"}
```

```json
{"ok":true,"id":"3"}
```

保存期间用户可以继续编辑，之后的变化留给下一次保存。

## 4. 导出与放弃

```json
{"id":"4","op":"export","documentId":"1","target":"exported.xlsx"}
```

```json
{"id":"5","op":"discard","documentId":"1"}
```

保存与导出只写与原文件同类的文件（表格写 `.xlsx` 或 `.xls`，文档写 `.docx`，演示写 `.pptx`，PDF 写 `.pdf`），各套件可写的格式见 [runtime 接口](../reference/runtime.md#文件格式)。

`discard` 丢弃工作根中未保存的修改，只在用户明确选择「不保存」时发送；关闭窗口本身不发 `discard`。

## 5. 关闭页面

```ts
await editor.destroy();
```

销毁页面不会保存文件，也不通知 runtime。同一个页面不能切换编辑器、语言或资源版本，需要时由 Host 新建页面并重新提供内容。

## 插入图片与附件

编辑模式下，页面通过 `attachment.store` 把用户选择的文件交给 Host，Host 写入 runtime 后返回资源引用；页面通过 `assets.resolveReadUrl` 把文档中的资源引用换成 Host 提供的读取地址。详见[公共配置项](../editors/index.md#assets)。

完整的命令列表、字段与错误码见 [runtime 接口](../reference/runtime.md)，逐条说明在 runtime 包内的 `guide/` 与 `guide/host-channel.json`（包内说明里的「Kit」即 runtime）。让 AI 修改文档见[用 JS API 修改文档](./ai-editing.md)。
