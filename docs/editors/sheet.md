# Sheet（表格）

`suite: "sheet"`，打开 Excel 工作簿（`.xlsx`）。公共配置项见[公共配置项](./index.md)。

## 模式

| 模式 | 额外要求 |
| --- | --- |
| `readonly` | 不接受 `user` 与 `attachment.store` |
| `edit` | 必须传 `user: { uid, name }` |

表格不使用 `nextChangeSetRevision`。

## Sheet 专有约束

| 配置项 | 说明 |
| --- | --- |
| `language` | 目前只支持 `"zh-CN"` |
| `user` | 编辑模式必填，本地用户身份 |
| `ui` | 可选，表格界面设置，只读与编辑模式都接受，见下 |

### `ui`

```ts
ui: { versionSwitch: { disabled: true } }
```

| 字段 | 说明 |
| --- | --- |
| `versionSwitch.disabled` | 省略或为 `true` 时隐藏工具栏里切换到旧版界面的入口（离线页面没有账号级的界面偏好可切换）；传 `false` 时显示。省略即隐藏是 0.3.0-rc.3 起的行为，0.3.0-rc.1、rc.2 省略时显示 |
| `versionSwitch.feedbackUrl` | 可选，入口里的反馈链接，只接受 `http:` / `https:` 地址；省略时没有反馈链接 |

`ui` 只接受上面两个字段，其他字段或其他编辑器传 `ui` 会被拒绝（错误码 `invalid-request`）。

不接受 `productFontCatalog`、`link`、`help`、`onSdkError`。表格只查询 `fontProvider` 的字体目录，不读取字体字节。

## 变化与保存

- 变化格式为 `modoc-v1`。
- 保存前调用 `editor.prepare()`：依次结束正在编辑的单元格、稳定公式缓存、交付剩余变化。
- 含公式内容的完整离线行为仍在验证中，普通文本单元格的编辑、保存和重新打开已验证。

## 图片与附件

编辑模式同时提供 `assets` 与 `attachment.store` 时，才能插入图片和附件。普通附件在选择后先写入 runtime，再插入表格。

## 图标字体

表格里日期提及等图标用到的图标字体（`DateMentionIcons`、`LockIcons`）随页面整合包提供：创建表格编辑器时页面自动注册，Host 不需要另外提供字体文件或样式。

## 页面内接口 `api.sheet`

`api.sheet.workbook` 提供工作簿、工作表、选区、区域、单元格的读取与视图方法，例如：

```ts
if (editor.suite === "sheet") {
  const sheets = editor.api.sheet.workbook.getWorksheets();
}
```

### 写入

完整的调用示例（AI 修改、错误处理、只读模式）见[用 JS API 修改文档](../guide/ai-editing.md#sheet)。

编辑模式下可以经编辑器写入工作簿。写入和界面上的编辑一样，经 `change` 事件交给 Host，由 runtime 保存。

| 对象 | 成员 | 说明 |
| --- | --- | --- |
| 工作簿 `workbook` | `addWorksheet(name?, index?)` | 新增工作表，`index` 省略时加在最后 |
| 工作表 | `getRange(range)` | 按 `{ type: "cells", row, column, rowCount, columnCount }` 等取区域，没有时为 `null` |
| 工作表 | `getUsedRange()` | 从 A1 到最后一个有内容的单元格，空表为 `null` |
| 工作表 | `rename(name)`、`addRows(index, count)`、`addColumns(index, count)`、`deleteRows(index, count)`、`deleteColumns(index, count)`、`setColumnsWidth([{ column, width }])`、`setFrozenRowCount(count)` | 结构操作 |
| 工作表 | `charts.addFromSelection({ range?, chart?: { title?, legendVisible?, position? } })` | 按选区（或给定区域）插入图表，返回 `{ chartId, chartType }` |
| 区域 | `setValue(values)` | 按行写值，例如 `[[{ type: "primitive", value: 1 }, null]]`，`null` 清空 |
| 区域 | `setData(data)` | 逐格写值、公式（`{ formula: "=A1*2" }`）或样式（`bold`、`color`、`background` 等） |
| 区域 | `address`、`select()`、`getBounding()` | A1 地址、设为选区、在窗口中的位置 |
| 单元格 | `setCellFormula(formula)` | 写公式，`null` 清空 |

```ts
if (editor.suite === "sheet") {
  const sheet = editor.api.sheet.activeSheet;
  sheet.getRange({ type: "cells", row: 0, column: 0, rowCount: 1, columnCount: 2 })
    ?.setValue([[{ type: "primitive", value: "数量" }, { type: "primitive", value: 3 }]]);
  sheet.getCell(1, 1)?.setCellFormula("=B1*2");
}
```

只读页面调用写入方法会被拒绝（错误码 `unsupported`）；读取、`select()`、`getBounding()` 照常可用。保存、粘贴、设置文本、整表替换内容等其他入口不开放。页面未就绪或已销毁时，调用会被拒绝。

## 示例

```ts
const editor = await createOfflineEditor({
  container,
  suite: "sheet",
  mode: "edit",
  content: opened.content,
  user: { uid: "u-1", name: "Alice" },
  ui: { versionSwitch: { disabled: true } },
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
  assets: { baseUrl: "app-assets://sheet/", resolveReadUrl },
  attachment: { store: mediaStore },
});
```
