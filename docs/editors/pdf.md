# PDF

`suite: "pdf"`，打开 PDF 文件。公共配置项见[公共配置项](./index.md)。

## 模式

| 模式 | 额外要求 |
| --- | --- |
| `readonly` | 不接受 `attachment.store` |
| `edit` | 必须传 `attachment.store`：每次变化都是整份 PDF 快照，经它写入 Kit |

PDF 不使用 `nextChangeSetRevision`。

## PDF 专有配置项

| 配置项 | 必填 | 说明 |
| --- | --- | --- |
| `attachment.store` | 编辑模式必填 | 见上 |
| `embeddableFonts` | 否 | Host 有权随文件分发的字体列表（`OfflinePdfEmbeddableFont`：`family`、`weight`、`resourceId` 等）。编辑时写入原文件字体中没有的字符，会嵌入这些字体；提供时优先于 `productFontCatalog` |
| `productFontCatalog` | 否 | 应用自带的字体包，编辑器从中选取可嵌入的字体 |

两者都没有时，修改文字只能使用原文件中已有的字形。不接受 `user`、`link`、`help`、`onSdkError`。

## 变化

变化格式为 `pdf-snapshot-v1`：每次交付整份快照，而不是增量修改。原文件与每份快照都作为 Kit 的媒体保存，通过 `assets.resolveReadUrl` 读取。

## 页面内接口 `api.pdf`

| 成员 | 说明 |
| --- | --- |
| `exportSnapshot()` | 返回页面当前的 PDF 字节（`ArrayBuffer`），可与 Kit 合并后的快照对照 |

## 示例

```ts
const editor = await createOfflineEditor({
  container,
  suite: "pdf",
  mode: "edit",
  content: opened.content,
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
  embeddableFonts,
  assets: { baseUrl: "app-assets://pdf/", resolveReadUrl },
  attachment: { store: snapshotStore },
});
```
