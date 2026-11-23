# Edit documents with the JS API (AI editing)

To let AI or app code change the document the user **is editing**, call the editor JS API. The change shows up in the editor at once and travels the same path as a manual edit: the editor emits a `change` event, the host app (the host below) forwards it to the runtime, and the runtime merges and saves it. Presentation can also undo through the editor's own history to take an AI edit back as a whole.

Processing files in the background without an editor is a kit capability that will be released separately later; see [kit document engine](./kit.md).

<SequenceDiagram flow="ai" lang="en" />

1. AI or app code hands a change request to the host.
2. The host calls the editor JS API in the page: `PowerPoint.run` for Presentation, range writes for Sheet, `Word.run` for Writer.
3. The change takes effect in the editor at once and the user sees it.
4. The editor emits `change` events and the host forwards them to the runtime in order (as for manual edits; see [Open, edit and save (Chinese)](../../guide/open-edit-save.md)).
5. To roll back, Presentation undoes through the editing history; the undo reaches the runtime through `change` events too.
6. When the user or the host decides to save, the host sends `save` and the runtime writes the file.

## Before you start

- Create the editor in edit mode (`mode: "edit"`) and register the `change` listener before `start()`, otherwise changes never reach the runtime. In read-only mode you can read but should not write: writes never reach the runtime; see [Read-only mode](#read-only-mode) for how each editor behaves.
- `editor.api` is available once `start()` has finished and the page is ready; reading it earlier throws `invalid-state`.
- The members of `editor.api` depend on the editor type. Check `editor.suite` first and TypeScript narrows to the matching interface.
- After the page is destroyed (`editor.destroy()`), every API object taken from it stops working and further calls are refused.

## What each editor offers

| Editor | Entry | What it does |
| --- | --- | --- |
| Presentation | `editor.api.presentation.getJsApi()` | Office.js-style `PowerPoint.run`: read and change slides, shapes and text |
| Presentation | `editor.api.presentation.editorInternals()` | Editing history: state, `undo()`, `redo()`, `commit` / `state-change` events |
| Presentation | `editor.api.presentation.exportSnapshot()` | Returns a JSON snapshot (string) of the page's current presentation |
| Sheet | `editor.api.sheet` | Read and write workbooks, worksheets, ranges and cells; insert charts |
| Writer | `editor.api.writer.Word` | Office.js-style `Word.run`: read and change the body |
| Writer | `editor.api.writer.bookmarks.list({ limit })`, `exportSnapshot()`, `getProfileIdentity()`, `isDisposed()` | List bookmarks, return a JSON snapshot (string) of the current document, the editor identity, whether the editor handle stopped working (after the page is destroyed, touching the API object throws `disposed`) |
| PDF | `editor.api.pdf.exportSnapshot()` | Read the page's current PDF bytes; there is no write API |

Full types are in the API reference: <a href="../../api/types#offlinepresentationapi">OfflinePresentationApi</a>, <a href="../../api/types#offlinepresentationeditorinternals">OfflinePresentationEditorInternals</a>, <a href="../../api/types#offlinesheetapi">OfflineSheetApi</a>, <a href="../../api/types#offlinesheetworksheet">OfflineSheetWorksheet</a>, <a href="../../api/types#offlinesheetrange">OfflineSheetRange</a>, <a href="../../api/types#offlinewriterapi">OfflineWriterApi</a>, <a href="../../api/types#offlinepdfapi">OfflinePdfApi</a>.

## Presentation

### Read first, then change

`getJsApi()` returns the `PowerPoint`, `Office` and `OfficeExtension` namespaces bound to this editor. It works like an Office add-in: inside a `PowerPoint.run` batch, `load` the properties you need, then read or change them after `context.sync()`.

```ts
if (editor.suite === "presentation") {
  // The page package declares the namespaces as object; use them the Office.js way.
  const { PowerPoint } = editor.api.presentation.getJsApi() as { PowerPoint: any };

  // 1. Look at the shapes on slide 1 and their text before deciding what to change.
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
        // shapes without a text frame (pictures and the like)
      }
      list.push({ id: shape.id, name: shape.name, text });
    }
    return list;
  });

  // 2. Change what you found: give the first shape with text a new title.
  const title = shapes.find((shape) => shape.text?.trim());
  if (title) {
    await PowerPoint.run(async (context: any) => {
      context.presentation.slides.getItemAt(0).shapes.getItem(title.id).textFrame.textRange.text = "Q3 2026 business review";
      await context.sync();
    });
  }
}
```

When the slide to change is not the one the user is looking at, select it first so the user sees what changed:

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

### Roll an AI edit back

`editorInternals()` exposes the editor's own history. Record the presentation state before the edit; to take it back, undo step by step until the state matches the recorded one. Undo produces `change` events like a manual undo, so the runtime returns to the earlier content as well.

::: warning Note
The user and the AI share one editing history. If the user also edits during or after the AI edit, the loop below undoes those edits too. To undo only the AI edit, pause user editing while the AI works, or ask the user before rolling back.
:::

```ts
if (editor.suite === "presentation") {
  const history = editor.api.presentation.editorInternals();
  const baseline = history.getDocument().store.encodeBinary();   // state before the edit

  // ...make the edit through PowerPoint.run here...

  const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, index) => value === b[index]);
  for (let step = 0; step < 2000; step++) {
    if (same(history.getDocument().store.encodeBinary(), baseline)) break;
    if (!history.getDocument().store.canUndo) break;
    history.undo();
  }
}
```

Listen for history changes, for example to update undo buttons in your toolbar:

```ts
if (editor.suite === "presentation") {
  const history = editor.api.presentation.editorInternals();
  const off = history.on("state-change", () => {
    const state = history.getDocument();
    console.log("can undo", state.canUndo, "can redo", state.canRedo);
  });
  // Stop listening when you no longer need it; destroying the page stops it too.
  off();
}
```

- `commit`: a step entered the history; `state-change`: the editor state (including undo and redo availability) changed.
- The object `getJsApi()` returns has no `dispose()`; it stops working with the editor, and `isDisposed()` tells you when.
- On a read-only page, `undo()` and `redo()` are refused (`unsupported`). Other internal editor methods are not exposed.

## Sheet

### Read

```ts
if (editor.suite === "sheet") {
  const sheet = editor.api.sheet.activeSheet;
  const used = sheet.getUsedRange();          // A1 to the last cell with content; null for an empty sheet
  if (used) {
    console.log(used.address, used.getValue());
  }
  const b2 = sheet.getCell(1, 1)?.getCellValue();   // rows and columns start at 0
  console.log(b2);
}
```

Cell values are typed objects: `{ type: "primitive", value }` (text, number, boolean), `{ type: "date", value }` and `{ type: "calcError", value: { error } }`; an empty cell is `null`.

### Write

In edit mode you can write values, formulas and styles, change rows and columns, and insert charts. Writes reach the runtime through `change` events like edits in the UI.

```ts
if (editor.suite === "sheet") {
  const p = (value: string | number) => ({ type: "primitive" as const, value });
  const sheet = editor.api.sheet.activeSheet;

  // Write values row by row from the top left of the range; null clears a cell.
  sheet.getRange({ type: "cells", row: 0, column: 0, rowCount: 3, columnCount: 2 })
    ?.setValue([
      [p("City"), p("Revenue")],
      [p("Beijing"), p(1280)],
      [p("Shanghai"), p(1460)],
    ]);

  // Write formulas and styles cell by cell.
  sheet.getRange({ type: "cells", row: 3, column: 0, rowCount: 1, columnCount: 2 })
    ?.setData([[{ value: "Total", bold: true }, { formula: "=SUM(B2:B3)", bold: true }]]);

  // Write one formula; null clears it.
  sheet.getCell(4, 1)?.setCellFormula("=B4/2");

  // Rows, columns and view.
  sheet.setColumnsWidth([{ column: 0, width: 120 }]);
  sheet.setFrozenRowCount(1);
  sheet.addRows(5, 2);

  // Insert a chart for a range.
  const chart = await sheet.charts.addFromSelection({
    range: { type: "cells", row: 0, column: 0, rowCount: 3, columnCount: 2 },
    chart: { title: "Revenue by city", legendVisible: false },
  });
  console.log(chart?.chartId, chart?.chartType);

  // Add a worksheet.
  editor.api.sheet.workbook.addWorksheet("Summary");
}
```

| Object | Write members |
| --- | --- |
| Workbook `workbook` | `addWorksheet(name?, index?)` |
| Worksheet | `rename(name)`, `addRows(index, count, direction?)`, `addColumns(index, count, direction?)`, `deleteRows(index, count)`, `deleteColumns(index, count)`, `setColumnsWidth([{ column, width }])`, `setFrozenRowCount(count)`, `charts.addFromSelection(params?)` |
| Range (from `getRange`, `getUsedRange`) | `setValue(values)`, `setData(data)`, `select()` |
| Cell (`getCell`) | `setCellFormula(formula, useR1C1?)` |

- `getRange` takes `{ type: "cells", row, column, rowCount, columnCount }`, `{ type: "rows", row, rowCount }`, `{ type: "columns", column, columnCount }` or `{ type: "sheet" }`, and returns `null` when there is no such range.
- Each `setData` cell can carry `value`, `formula`, `text` and style keys the editor understands (`bold`, `italic`, `underline`, `strike`, `color`, `background`, `fontFamily`, `fontSize`, `align`, `vertical`, `wrap`, `format` and so on); unknown keys are ignored.
- Sheet has no editing-history API, so it cannot undo through the API. Saving, pasting, setting text and replacing the whole sheet are not exposed.

### Creation option `ui.versionSwitch`

The Sheet toolbar has an entry for switching to the previous interface. Offline pages have no account-level interface preference to switch, so the entry is **hidden by default**; pass `{ disabled: false }` to show it (type: <a href="../../api/types#offlinesheetuioptions">OfflineSheetUiOptions</a>):

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

| Field | Description |
| --- | --- |
| `versionSwitch.disabled` | Omitted or `true`: the entry is hidden; `false`: it is shown |
| `versionSwitch.feedbackUrl` | Feedback link inside the entry; `http:` / `https:` only; no link when omitted |

`ui` accepts these two fields only, in read-only and edit mode. Other fields, or `ui` on another editor, make creation fail (`invalid-request`). Sheet currently supports the `zh-CN` interface language only.

## Writer

`editor.api.writer.Word` is the Office.js-style `Word` namespace. Reads work in read-only and edit mode; write in edit mode only, where writes are subject to edit restriction just like typing in the UI.

```ts
if (editor.suite === "document") {
  const { Word } = editor.api.writer as { Word: any };

  // Read the body
  const text = await Word.run(async (context: any) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text as string;
  });
  console.log(text.length);

  // Make the text before the first comma of the second paragraph bold, then insert a paragraph after the first one
  await Word.run(async (context: any) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load("items");
    await context.sync();
    // Work on existing paragraphs first: after an insert, paragraph indexes shift within the same batch.
    const parts = paragraphs.items[1].getTextRanges([","], false);
    parts.load("items");
    await context.sync();
    parts.items[0].font.bold = true;
    paragraphs.items[0].insertParagraph("Added by AI.", "After");
    await context.sync();
  });
}
```

For the full `Word` types, import `WriterJsApi` from the sub-entry `@officesdk/officesdk-core-editor/writer-types` (requires `@types/react`); see [Writer (Chinese)](../../editors/writer.md).

## PDF

PDF has no JS write API yet. `exportSnapshot()` returns the page's current PDF bytes, which you can hand to AI for reading or compare with what the runtime saved:

```ts
if (editor.suite === "pdf") {
  const bytes = await editor.api.pdf.exportSnapshot();   // ArrayBuffer
  console.log(bytes.byteLength);
}
```

## Read-only mode

| Editor | In read-only mode |
| --- | --- |
| Presentation | `getJsApi()` works for reading; `undo()` and `redo()` of `editorInternals()` throw `unsupported` |
| Sheet | Reads, `select()` and `getBounding()` work; write members throw `unsupported` |
| Writer | `Word.run` works for reading |
| PDF | `exportSnapshot()` works |

Do not write through `PowerPoint.run` or `Word.run` on a read-only page: a read-only page produces no `change`, so writes never reach the runtime and are not saved. To let AI edit, create the editor in edit mode.

## Errors

Errors thrown by the editor's page APIs carry a `code`. Branch on it, not on the `message` text:

| `code` | When |
| --- | --- |
| `invalid-state` | The page is not ready yet (`start()` has not finished), is preparing, or has failed after a change delivery fault (every later access to `editor.api` and its objects fails this way) |
| `disposed` | The page has been destroyed and the API object no longer works |
| `unsupported` | A Sheet write or a Presentation undo or redo on a read-only page, or a capability this editor does not have |
| `invalid-request` | Invalid arguments, for example an unknown field in `ui` |
| `transfer-fault` | A change was produced before the `change` listener was registered (see [Before you start](#before-you-start)), or delivering an earlier change failed (for example the `change` listener threw and the page emitted `transferFault`), so later `start()`, `prepare()` and save or export intents are refused |

```ts
try {
  if (editor.suite === "sheet") {
    editor.api.sheet.activeSheet.getCell(0, 0)?.setCellFormula("=1+1");
  }
} catch (error) {
  const code = (error as { code?: string }).code;
  if (code === "unsupported") {
    console.warn("The page is read-only; writes are refused");
  } else {
    throw error;
  }
}
```

Errors inside a `PowerPoint.run` or `Word.run` batch follow the Office.js conventions (`OfficeExtension.Error` with `code` and `message`). When a batch fails, changes already synced stay in the document; roll them back as shown above if needed.

## Version differences

- Presentation `getJsApi()` and `editorInternals()`, the Sheet range read and write members (`getRange`, `getUsedRange`, `address`, `select`, `getBounding`, `setValue`, `setData`, `setCellFormula`, rows, columns, charts and so on) and `ui.versionSwitch` are available from 0.3.0-rc.1. Writer `Word` and PDF `exportSnapshot()` were available earlier.
- Hiding the version switch entry when `ui.versionSwitch` is omitted applies from 0.3.0-rc.3; in 0.3.0-rc.1 and 0.3.0-rc.2 the entry is shown when it is omitted.
- Query the versions of the editors bundled in the page package at run time:

```ts
import { getReleaseInfo } from "@officesdk/officesdk-core-editor";

const release = getReleaseInfo();
console.log(release.version, release.editors.presentation?.version, release.editors.sheet?.version);
```

## Related pages

- [Open, edit and save (Chinese)](../../guide/open-edit-save.md): `change` events and saving
- [Editor options (Chinese)](../../editors/index.md): creation options
- <a href="../../api/">API reference</a>: every export and type
