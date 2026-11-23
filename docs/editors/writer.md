# Writer（文档）

`suite: "document"`，打开 Word 文档（`.docx`）。公共配置项见[公共配置项](./index.md)。

## 模式

| 模式 | 额外要求 |
| --- | --- |
| `readonly` | 不接受 `nextChangeSetRevision` 与 `attachment.store` |
| `edit` | 必须传 `nextChangeSetRevision`：取 runtime `open` / `content` 响应中的同名字段。页面的变化从这个编号接着编，runtime 才能把它们接在未保存的修改之后 |

## Writer 专有配置项

| 配置项 | 必填 | 说明 |
| --- | --- | --- |
| `nextChangeSetRevision` | 编辑模式必填 | 见上 |
| `productFontCatalog` | 否 | 应用自带的产品字体目录。提供时优先使用；省略时只使用系统字体，并选择实际存在的兜底字体。省略且系统字体不可用时创建失败 |
| `user` | 否 | `{ uid, name }`，评论等需要作者身份的功能使用；请传稳定的用户标识 |
| `editRestriction` | 否 | 限制编辑服务。用 `createEditRestrictionServices(host)` 基于 runtime 的限制编辑命令创建 |
| `link` | 否 | `{ generate(params) }`，由 Host 生成文件链接 |
| `help` | 否 | `{ helpCenter?, helpConsult? }`，帮助入口的处理动作；不提供时入口隐藏 |
| `onSdkError` | 否 | `(error: OfflineWriterError) => void`，接收编辑器报告的错误，含 `code`、`severity`（`info`/`warning`/`error`/`fatal`）、`retriable`、`message` |

## 语言

当前发行收录 `zh-CN` 与 `en-US`，方向只支持 `ltr`。

## 页面内接口 `api.writer`

| 成员 | 说明 |
| --- | --- |
| `Word`、`Office`、`OfficeExtension` | 当前文档的脚本接口（只读与编辑模式都可用）。只读模式下只用于读取，写入不会交给 runtime；编辑模式的写入与界面输入一样受限制编辑约束 |
| `bookmarks.list({ limit })` | 列出书签的展示字段 |
| `exportSnapshot()` | 返回页面当前文档的 JSON 快照，可与 runtime 合并后的内容对照 |
| `getProfileIdentity()`、`isDisposed()` | 编辑器标识与编辑器句柄是否已失效（页面销毁后再访问接口对象会抛出 `disposed`） |

完整的 `Word` 接口类型从子入口导入（需要安装 `@types/react`）：

```ts
import type { WriterJsApi } from "@officesdk/officesdk-core-editor/writer-types";

if (editor.suite === "document") {
  const word = editor.api.writer.Word as Omit<WriterJsApi["Word"], "History" | "Public">;
  const text = await word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text;
  });
}
```

页面销毁后，已取出的接口对象都会失效。让 AI 经 `Word.run` 修改文档的示例见[用 JS API 修改文档](../guide/ai-editing.md#writer)。

## 内容安全策略

Writer 通过 `data:` 地址加载内置模型，页面的 CSP 须允许 `connect-src 'self' data:`。其他资源来源仍应限制为 Host 的受控地址。

## 示例

```ts
const editor = await createOfflineEditor({
  container,
  suite: "document",
  mode: "edit",
  content: opened.content,
  nextChangeSetRevision: opened.nextChangeSetRevision,
  file: { name: "合同.docx" },
  language: "zh-CN",
  direction: "ltr",
  resources,
  fontProvider,
  productFontCatalog,
  user: { uid: "u-1", name: "Alice" },
  assets: { baseUrl: "app-assets://document/", resolveReadUrl },
  attachment: { store: mediaStore },
  onSdkError: (error) => console.warn(error.code, error.message),
});
```
