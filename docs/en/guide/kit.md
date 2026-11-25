# kit document engine

The kit is the document engine of Office SDK. It reads and writes Word, Excel, PowerPoint and PDF files with no Office installation, no UI and no network. Its capabilities fall into four groups:

| Capability | Description |
| --- | --- |
| Conversion | Converts between Office files and editor content in both directions, including the legacy binary formats (`.doc`, `.xls`, `.ppt`) and OOXML |
| In-place Office.js editing | Changes the original file with standard Office.js code (`PowerPoint.run`, `Word.run`, `Excel.run`); untouched parts stay as they were |
| Rendering | Renders pages or slides to preview images |
| Layout checks | Finds problems such as overflowing text, shapes off the page, overlaps and missing fonts, with their locations, so AI can fix them itself |

The kit can run as a command-line tool or as an MCP server for AI clients.

## How to use it today

**For now the kit ships inside the runtime package: you do not install it or call it separately.** The runtime uses it for conversion whenever it opens, saves or exports a file.

| Capability | Today (through the runtime) | Later |
| --- | --- | --- |
| Open `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.pdf` | Available: the runtime's `open` | — |
| Save and export `.docx`, `.xlsx`, `.pptx`, `.pdf` | Available: the runtime's `save` and `export`, writing the same kind of file as the original (formats per suite in the [runtime reference](../reference/runtime.md#file-formats)) | — |
| Cross-format conversion (for example `.docx` to `.pdf`) | Not provided | With the standalone kit release |
| Previews of EMF, WMF and TIFF images in sheets | Available (the Windows packages have no preview rendering, chart previews included) | — |
| Standalone command-line tool and MCP server | Not provided | With the standalone kit release |
| Office.js editing in the background, without an editor | Not provided | With the standalone kit release |
| Rendering previews and layout checks | Not provided | With the standalone kit release |
| More input and output formats | Not provided | As described at the standalone release |

To let AI change documents inside your app today, use the editor JS API; see [Edit documents with the JS API](./ai-editing.md).

## How it differs from the editor JS API

Both use Office.js-style APIs; they suit different jobs:

| | Editor JS API | kit (once released standalone) |
| --- | --- | --- |
| What it changes | The document the user **is editing** in the editor | Files on disk |
| UI | Changes show up live and the user keeps editing | None |
| Rollback | Presentation can undo through the editing history | The caller keeps the original file |
| Saving | The runtime merges and saves through `change` | Writes files directly |
| Good for | In-app AI assistants, what-you-see edits | Background batch work, servers and unattended AI agents |

## Platforms

While the kit ships inside the runtime package, it runs on the runtime's platforms; see [Install and start the runtime (Chinese)](../../guide/install-kit.md). Platforms and downloads of the standalone kit will be described in its release notes.

## Learn more

A full introduction to the kit (capabilities, formats, Office.js coverage, check rules) is on GitHub: [officekit](https://github.com/officesdk/OfficeAPI). Capabilities it describes that this SDK does not ship yet follow the notes of the standalone release.
