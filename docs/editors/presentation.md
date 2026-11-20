# Presentation（演示）

`suite: "presentation"`，打开 PowerPoint 演示文稿（`.pptx`）。公共配置项见[公共配置项](./index.md)。

## 模式

| 模式 | 额外要求 |
| --- | --- |
| `readonly` | 不接受 `nextChangeSetRevision` 与 `attachment.store` |
| `edit` | 必须传 `nextChangeSetRevision`，取 Kit `open` / `content` 响应中的同名字段 |

## Presentation 专有配置项

| 配置项 | 必填 | 说明 |
| --- | --- | --- |
| `nextChangeSetRevision` | 编辑模式必填 | 见上 |
| `productFontCatalog` | 否 | 应用自带的产品字体目录，与 Writer 相同 |

不接受 `user`、`link`、`help`、`onSdkError`。

## 变化与媒体

- 变化格式为 `mop-v1`。
- 插入的图片经 `attachment.store` 写入 Kit，引用形如 `mop-asset:/media/<SHA-256>.<扩展名>`。

## 页面内接口 `api.presentation`

| 成员 | 说明 |
| --- | --- |
| `exportSnapshot()` | 返回页面当前演示文稿的 JSON 快照，可与 Kit 合并后的内容对照 |
| `getJsApi()` | 编辑器的 Office.js 风格接口，绑定当前编辑器：`PowerPoint`（含 `PowerPoint.run`）、`Office`、`OfficeExtension` 与 `isDisposed()` |
| `editorInternals()` | 编辑器的编辑历史：`getDocument()`（`canUndo`、`canRedo`、`store.encodeBinary()`）、`undo()`、`redo()`、`on("commit" \| "state-change", 监听)` |

- 两个接口在页面就绪（`start()` 完成）后可用；页面销毁后再调用会被拒绝。
- 经 `getJsApi()` 做的修改和界面上的编辑一样，经 `change` 事件交给 Host，由 Kit 保存。
- `getJsApi()` 返回的对象不提供 `dispose()`：句柄随编辑器一起失效，`isDisposed()` 可查询。
- `undo()`、`redo()` 走编辑器自己的历史，撤销产生的变化同样经 `change` 事件交给 Host；只读页面调用会被拒绝（错误码 `unsupported`）。
- `on()` 返回取消监听的函数；页面销毁时全部监听自动取消。编辑器的其他内部方法不开放。

### 示例：AI 编辑与回滚

```ts
if (editor.suite === "presentation") {
  const { PowerPoint } = editor.api.presentation.getJsApi() as { PowerPoint: any };
  const history = editor.api.presentation.editorInternals();
  const baseline = history.getDocument().store.encodeBinary();

  await PowerPoint.run(async (context: any) => {
    const shapes = context.presentation.slides.getItemAt(0).shapes;
    shapes.load("items");
    await context.sync();
    shapes.items[0].textFrame.textRange.text = "新的标题";
    await context.sync();
  });

  // 回滚：沿编辑器历史撤销，直到文稿回到修改前的状态。
  const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
  for (let step = 0; step < 200 && !same(history.getDocument().store.encodeBinary(), baseline); step++) {
    if (!history.getDocument().canUndo) break;
    history.undo();
  }
}
```

## 示例

```ts
const editor = await createOfflineEditor({
  container,
  suite: "presentation",
  mode: "edit",
  content: opened.content,
  nextChangeSetRevision: opened.nextChangeSetRevision,
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
  assets: { baseUrl: "app-assets://presentation/", resolveReadUrl },
  attachment: { store: mediaStore },
});
```
