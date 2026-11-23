# 用 JS API 修改文档（AI 修改）

要让 AI 或业务代码修改用户**正在编辑**的文档，调用 editor 的 JS API。修改立即显示在编辑器里，和用户手工编辑走同一条路：editor 产生 `change` 事件，宿主应用（下文称 Host）转给 runtime，由 runtime 合并并保存。Presentation 还能沿编辑器自己的历史撤销，把 AI 的修改整体退回。

不打开界面、在后台批量处理文件属于 kit 的能力，后续独立提供，见 [kit 文档引擎](./kit.md)。

<SequenceDiagram flow="ai" lang="zh" />

1. AI 或业务代码把修改要求交给 Host。
2. Host 在页面里调用 editor 的 JS API：Presentation 用 `PowerPoint.run`，Sheet 用区域写入，Writer 用 `Word.run`。
3. 修改在编辑器里立即生效，用户实时看到。
4. editor 发出 `change` 事件，Host 按顺序转给 runtime（与手工编辑相同，见[打开、编辑、保存](./open-edit-save.md)）。
5. 需要回滚时，Presentation 沿编辑历史撤销，撤销同样经 `change` 交给 runtime。
6. 用户或 Host 决定保存时，Host 发 `save`，runtime 写回文件。

## 前提

- 用编辑模式（`mode: "edit"`）创建编辑器，并在 `start()` 之前注册 `change` 监听，否则修改到不了 runtime。只读模式下可以读取，但不要写入：写入不会交给 runtime，各编辑器的具体表现见[只读模式](#只读模式)。
- `start()` 完成、页面就绪后才能取 `editor.api`；之前访问会抛出 `invalid-state`。
- `editor.api` 的成员按编辑器类型区分。先用 `editor.suite` 判断，TypeScript 会收窄到对应的接口。
- 页面销毁（`editor.destroy()`）后，已取出的接口对象都会失效，再调用会被拒绝。

## 各编辑器的接口

| 编辑器 | 入口 | 能做什么 |
| --- | --- | --- |
| Presentation | `editor.api.presentation.getJsApi()` | Office.js 风格的 `PowerPoint.run`：读取与修改幻灯片、形状、文字 |
| Presentation | `editor.api.presentation.editorInternals()` | 编辑历史：状态、`undo()`、`redo()`、`commit` / `state-change` 事件 |
| Presentation | `editor.api.presentation.exportSnapshot()` | 返回页面当前演示文稿的 JSON 快照（字符串） |
| Sheet | `editor.api.sheet` | 工作簿、工作表、区域、单元格的读取与写入，插入图表 |
| Writer | `editor.api.writer.Word` | Office.js 风格的 `Word.run`：读取与修改正文 |
| Writer | `editor.api.writer.bookmarks.list({ limit })`、`exportSnapshot()`、`getProfileIdentity()`、`isDisposed()` | 列出书签、返回当前文档的 JSON 快照（字符串）、编辑器标识、编辑器句柄是否已失效（页面销毁后再访问接口对象会直接抛出 `disposed`） |
| PDF | `editor.api.pdf.exportSnapshot()` | 读取页面当前的 PDF 字节；没有写入接口 |

完整类型见 API 参考：<a href="../api/types#offlinepresentationapi">OfflinePresentationApi</a>、<a href="../api/types#offlinepresentationeditorinternals">OfflinePresentationEditorInternals</a>、<a href="../api/types#offlinesheetapi">OfflineSheetApi</a>、<a href="../api/types#offlinesheetworksheet">OfflineSheetWorksheet</a>、<a href="../api/types#offlinesheetrange">OfflineSheetRange</a>、<a href="../api/types#offlinewriterapi">OfflineWriterApi</a>、<a href="../api/types#offlinepdfapi">OfflinePdfApi</a>。

## Presentation

### 先读再改

`getJsApi()` 返回绑定到当前编辑器的 `PowerPoint`、`Office`、`OfficeExtension` 三个命名空间。写法与 Office 加载项相同：在 `PowerPoint.run` 的批处理里 `load` 需要的属性，`context.sync()` 之后读取或修改。

```ts
if (editor.suite === "presentation") {
  // 页面整合包把命名空间声明为 object，按 Office.js 的写法使用。
  const { PowerPoint } = editor.api.presentation.getJsApi() as { PowerPoint: any };

  // 1. 先看第一页有哪些形状、各自的文字，再决定改哪里。
  type ShapeInfo = { id: string; name: string; text: string | null };
  const shapes: ShapeInfo[] = await PowerPoint.run(async (context: any) => {
    const items = context.presentation.slides.getItemAt(0).shapes;
    items.load("items/id,items/name,items/left,items/top,items/width,items/height");
    await context.sync();
    const list: ShapeInfo[] = [];
    for (const shape of items.items) {
      let text: string | null = null;
      try {
        const range = shape.textFrame.textRange;
        range.load("text");
        await context.sync();
        text = range.text;
      } catch {
        // 没有文本框的形状（图片等）
      }
      list.push({ id: shape.id, name: shape.name, text });
    }
    return list;
  });

  // 2. 按读到的结果修改：把第一个有文字的形状改成新标题。
  const title = shapes.find((shape) => shape.text?.trim());
  if (title) {
    await PowerPoint.run(async (context: any) => {
      context.presentation.slides.getItemAt(0).shapes.getItem(title.id).textFrame.textRange.text = "2026 年第三季度经营回顾";
      await context.sync();
    });
  }
}
```

要修改的幻灯片不是用户正在看的那一页时，可以先把它设为选中页，让用户看到改了哪里：

```ts
if (editor.suite === "presentation") {
  const { PowerPoint } = editor.api.presentation.getJsApi() as { PowerPoint: any };
  await PowerPoint.run(async (context: any) => {
    const slides = context.presentation.slides;
    slides.load("items/id");
    await context.sync();
    context.presentation.setSelectedSlides([slides.items[1].id]);
    await context.sync();
  });
}
```

### 回滚 AI 的修改

`editorInternals()` 提供编辑器自己的历史。修改前记下文稿状态，需要退回时一步步撤销，直到状态与修改前相同。撤销与手工撤销一样产生 `change`，runtime 随之回到修改前的内容。

::: warning 注意
编辑历史是用户与 AI 共用的。AI 修改期间或之后用户如果也编辑了文稿，下面的循环会把这些编辑一起撤掉。需要只撤 AI 的修改时，在 AI 修改期间暂停用户编辑，或在回滚前提示用户。
:::

```ts
if (editor.suite === "presentation") {
  const history = editor.api.presentation.editorInternals();
  const baseline = history.getDocument().store.encodeBinary();   // 修改前的状态

  // ……在这里经 PowerPoint.run 做修改……

  const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, index) => value === b[index]);
  for (let step = 0; step < 2000; step++) {
    if (same(history.getDocument().store.encodeBinary(), baseline)) break;
    if (!history.getDocument().store.canUndo) break;
    history.undo();
  }
}
```

监听历史变化，例如在工具栏上更新撤销按钮：

```ts
if (editor.suite === "presentation") {
  const history = editor.api.presentation.editorInternals();
  const off = history.on("state-change", () => {
    const state = history.getDocument();
    console.log("可撤销", state.canUndo, "可重做", state.canRedo);
  });
  // 不再需要时取消；页面销毁时也会自动取消。
  off();
}
```

- `commit`：一步编辑进入历史；`state-change`：编辑器状态（含能否撤销、重做）变化。
- `getJsApi()` 返回的对象没有 `dispose()`，随编辑器一起失效；`isDisposed()` 可以查询。
- 只读页面调用 `undo()`、`redo()` 会被拒绝（`unsupported`）。编辑器的其他内部方法不开放。

## Sheet

### 读取

```ts
if (editor.suite === "sheet") {
  const sheet = editor.api.sheet.activeSheet;
  const used = sheet.getUsedRange();          // 从 A1 到最后一个有内容的单元格；空表为 null
  if (used) {
    console.log(used.address, used.getValue());
  }
  const b2 = sheet.getCell(1, 1)?.getCellValue();   // 行、列从 0 开始
  console.log(b2);
}
```

单元格的值是带类型的对象：`{ type: "primitive", value }`（文本、数字、布尔）、`{ type: "date", value }`、`{ type: "calcError", value: { error } }`；空单元格为 `null`。

### 写入

编辑模式下可以写值、公式和样式，调整行列，插入图表。写入和界面上的编辑一样经 `change` 交给 runtime。

```ts
if (editor.suite === "sheet") {
  const p = (value: string | number) => ({ type: "primitive" as const, value });
  const sheet = editor.api.sheet.activeSheet;

  // 按行写值：从区域左上角开始，null 清空单元格。
  sheet.getRange({ type: "cells", row: 0, column: 0, rowCount: 3, columnCount: 2 })
    ?.setValue([
      [p("城市"), p("收入")],
      [p("北京"), p(1280)],
      [p("上海"), p(1460)],
    ]);

  // 逐格写公式与样式。
  sheet.getRange({ type: "cells", row: 3, column: 0, rowCount: 1, columnCount: 2 })
    ?.setData([[{ value: "合计", bold: true }, { formula: "=SUM(B2:B3)", bold: true }]]);

  // 单格写公式；null 清空。
  sheet.getCell(4, 1)?.setCellFormula("=B4/2");

  // 行列与视图。
  sheet.setColumnsWidth([{ column: 0, width: 120 }]);
  sheet.setFrozenRowCount(1);
  sheet.addRows(5, 2);

  // 按区域插入图表。
  const chart = await sheet.charts.addFromSelection({
    range: { type: "cells", row: 0, column: 0, rowCount: 3, columnCount: 2 },
    chart: { title: "各城市收入", legendVisible: false },
  });
  console.log(chart?.chartId, chart?.chartType);

  // 新增一张工作表。
  editor.api.sheet.workbook.addWorksheet("汇总");
}
```

| 对象 | 写入成员 |
| --- | --- |
| 工作簿 `workbook` | `addWorksheet(name?, index?)` |
| 工作表 | `rename(name)`、`addRows(index, count, direction?)`、`addColumns(index, count, direction?)`、`deleteRows(index, count)`、`deleteColumns(index, count)`、`setColumnsWidth([{ column, width }])`、`setFrozenRowCount(count)`、`charts.addFromSelection(params?)` |
| 区域（`getRange`、`getUsedRange` 的结果） | `setValue(values)`、`setData(data)`、`select()` |
| 单元格（`getCell`） | `setCellFormula(formula, useR1C1?)` |

- `getRange` 的参数：`{ type: "cells", row, column, rowCount, columnCount }`、`{ type: "rows", row, rowCount }`、`{ type: "columns", column, columnCount }` 或 `{ type: "sheet" }`；没有对应区域时返回 `null`。
- `setData` 每格可以带 `value`、`formula`、`text`，以及编辑器认识的样式键（`bold`、`italic`、`underline`、`strike`、`color`、`background`、`fontFamily`、`fontSize`、`align`、`vertical`、`wrap`、`format` 等），不认识的键被忽略。
- Sheet 没有开放编辑历史接口，不能经 API 撤销。保存、粘贴、设置文本、整表替换内容等其他入口不开放。

### 创建参数 `ui.versionSwitch`

表格工具栏里有切换到旧版界面的入口。离线页面没有账号级的界面偏好可切换，所以入口**默认隐藏**；需要显示时传 `{ disabled: false }`（类型见 <a href="../api/types#offlinesheetuioptions">OfflineSheetUiOptions</a>）：

```ts
import { createOfflineEditor } from "@officesdk/officesdk-core-editor";

const sheetEditor = await createOfflineEditor({
  container,
  suite: "sheet",
  mode: "edit",
  content: opened.content,
  user: { uid: "u-1", name: "Alice" },
  ui: { versionSwitch: { disabled: false, feedbackUrl: "https://example.com/feedback" } },
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
});
```

| 字段 | 说明 |
| --- | --- |
| `versionSwitch.disabled` | 省略或为 `true` 时隐藏入口；`false` 时显示 |
| `versionSwitch.feedbackUrl` | 入口里的反馈链接，只接受 `http:` / `https:` 地址；省略时没有反馈链接 |

`ui` 只接受这两个字段，只读与编辑模式都接受；其他字段，或给其他编辑器传 `ui`，创建会失败（`invalid-request`）。表格界面目前只支持 `zh-CN`。

## Writer

`editor.api.writer.Word` 是 Office.js 风格的 `Word` 命名空间，只读与编辑模式都可以读取；写入只在编辑模式下进行，并与界面输入一样受限制编辑约束。

```ts
if (editor.suite === "document") {
  const { Word } = editor.api.writer as { Word: any };

  // 读取正文
  const text = await Word.run(async (context: any) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text as string;
  });
  console.log(text.length);

  // 把第二段里第一个逗号前的文字加粗，再在第一段后插入一段
  await Word.run(async (context: any) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items");
    await context.sync();
    // 先处理已有段落：插入段落之后，同一批处理里的段落下标会跟着移动。
    const parts = paragraphs.items[1].getTextRanges(["，"], false);
    parts.load("items");
    await context.sync();
    parts.items[0].font.bold = true;
    paragraphs.items[0].insertParagraph("由 AI 补充的说明。", "After");
    await context.sync();
  });
}
```

需要完整的 `Word` 类型时，从子入口 `@officesdk/officesdk-core-editor/writer-types` 导入 `WriterJsApi`（需要安装 `@types/react`），见 [Writer](../editors/writer.md#页面内接口-api-writer)。

## PDF

PDF 目前没有 JS 写入接口。`exportSnapshot()` 返回页面当前的 PDF 字节，可以交给 AI 读取，或与 runtime 保存的结果对照：

```ts
if (editor.suite === "pdf") {
  const bytes = await editor.api.pdf.exportSnapshot();   // ArrayBuffer
  console.log(bytes.byteLength);
}
```

## 只读模式

| 编辑器 | 只读模式下 |
| --- | --- |
| Presentation | `getJsApi()` 可用于读取；`editorInternals()` 的 `undo()`、`redo()` 抛出 `unsupported` |
| Sheet | 读取、`select()`、`getBounding()` 可用；写入成员抛出 `unsupported` |
| Writer | `Word.run` 可用于读取 |
| PDF | `exportSnapshot()` 可用 |

不要在只读页面上经 `PowerPoint.run`、`Word.run` 写入：只读页面不产生 `change`，写入不会交给 runtime，也不会被保存。要让 AI 修改，请用编辑模式创建编辑器。

## 错误

editor 的页面接口抛出的错误带 `code`，按它分支，不要比较 `message` 文字：

| `code` | 何时出现 |
| --- | --- |
| `invalid-state` | 页面还没就绪（`start()` 未完成）、正在准备，或已经因为变化交付故障而失败（之后再访问 `editor.api` 与接口对象都会如此） |
| `disposed` | 页面已销毁，接口对象已失效 |
| `unsupported` | Sheet 只读页面写入、Presentation 只读页面撤销或重做；该编辑器没有这项能力 |
| `invalid-request` | 参数不合法，例如 `ui` 带了未知字段 |
| `transfer-fault` | 注册 `change` 监听之前就产生了变化（见[前提](#前提)）；或之前的变化交付出过错（例如 `change` 监听抛出错误，页面已发出 `transferFault` 事件），之后的 `start()`、`prepare()` 与保存、导出意图被拒绝 |

```ts
try {
  if (editor.suite === "sheet") {
    editor.api.sheet.activeSheet.getCell(0, 0)?.setCellFormula("=1+1");
  }
} catch (error) {
  const code = (error as { code?: string }).code;
  if (code === "unsupported") {
    console.warn("当前是只读页面，不能写入");
  } else {
    throw error;
  }
}
```

`PowerPoint.run`、`Word.run` 批处理里的错误按 Office.js 的约定处理（`OfficeExtension.Error`，带 `code` 与 `message`）。批处理失败时，已经 `sync` 过的修改留在文档里，需要时用上面的方法回滚。

## 版本差异

- Presentation 的 `getJsApi()` 与 `editorInternals()`、Sheet 的区域读取与写入成员（`getRange`、`getUsedRange`、`address`、`select`、`getBounding`、`setValue`、`setData`、`setCellFormula`、行列与图表等）与 `ui.versionSwitch` 从 0.3.0-rc.1 起提供。Writer 的 `Word`、PDF 的 `exportSnapshot()` 在更早的版本就有。
- `ui.versionSwitch` 省略时隐藏切换入口，是 0.3.0-rc.3 起的行为；0.3.0-rc.1、0.3.0-rc.2 省略时显示入口。
- 页面整合包里各编辑器的版本可以在运行时查询：

```ts
import { getReleaseInfo } from "@officesdk/officesdk-core-editor";

const release = getReleaseInfo();
console.log(release.version, release.editors.presentation?.version, release.editors.sheet?.version);
```

## 相关页面

- [打开、编辑、保存](./open-edit-save.md)：`change` 事件与保存流程
- [编辑器配置](../editors/index.md)：创建参数
- <a href="../api/">API 参考</a>：全部导出与类型
