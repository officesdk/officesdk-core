# Overview

Office SDK lets desktop and mobile apps open, edit and save Word, PowerPoint, Excel and PDF files offline, with no network service. It has three parts, called in this order: **editor → runtime → kit**.

## The three parts

| Part | What it is | Where it runs | What it does | How to get it |
| --- | --- | --- | --- | --- |
| **editor** (page package) | npm package `@officesdk/officesdk-core-editor` | A WebView page in your app | Creates the Writer, Presentation, Sheet and PDF editors; turns the user's edits into changes for the host; provides a JS API that AI or app code can use to change the document | `npm install @officesdk/officesdk-core-editor` |
| **runtime** | Local document process `offline-kit-runtime` (`.exe` on Windows; the N-API module `liboffline_kit.so` on HarmonyOS) | A local process shipped with your app (inside the app process on HarmonyOS) | Owns the file: opens, merges edits, saves and exports, and keeps sessions and unsaved changes | `officesdk-core-runtime-<version>-<target>.tar.gz` from GitHub Releases, or `npx offline-kit fetch` |
| **kit** | Document engine | Inside the runtime package for now, called by the runtime | Conversion and rendering: the runtime uses it to convert between Office files and editor content when it opens, saves and exports | Ships inside the runtime package for now; a standalone release will follow, see [kit document engine](./kit.md) |

All three parts are released under **one version number** and must be used together.

## Architecture

<ArchitectureDiagram lang="en" />

- **The host app** is your application, for example an Electron, Wails, native or HarmonyOS ArkTS app. It hosts both the page and the runtime and relays between them.
- **The editor** runs in a WebView. It displays content and produces changes; it never reads or writes files and never talks to the runtime directly.
- **The runtime** is a local process that owns the file and the unsaved changes. The host exchanges command frames with it over standard input and output, and media and font bytes over a separate byte side stream; on HarmonyOS the host sends the same commands through N-API.
- **The kit** lives inside the runtime and handles conversion and rendering. The host does not call it directly.
- The channel between the page and the host is the host's own (a preload script, IPC or a JS bridge). The runtime has no HTTP interface.

## Open, edit and save

<SequenceDiagram flow="save" lang="en" />

1. The host asks the runtime to open the user's file (`open`). The runtime reads and converts it with the kit and returns `documentId`, `suite` and `content`.
2. The host creates the matching editor with `content` and calls `start()`.
3. As the user edits, the editor emits `change` events; the host forwards each change to the runtime in order (`change`).
4. When the user saves, the host calls `editor.prepare()` to finish pending input and waits until the runtime has accepted every change sent so far.
5. The host sends `save`, and the runtime writes the file back with the kit.

The full commands and code are in [Open, edit and save (Chinese)](../../guide/open-edit-save.md).

## AI editing

<SequenceDiagram flow="ai" lang="en" />

1. AI or app code hands a change request to the host.
2. The host calls the editor JS API: `PowerPoint.run` for Presentation, range writes for Sheet, `Word.run` for Writer.
3. The change shows up in the editor at once and reaches the runtime through `change` events, like a manual edit.
4. To roll back, undo through the editor history (Presentation); the undo reaches the runtime through `change` events too.
5. Saving is still the host's `save`.

Calls and examples are in [Edit documents with the JS API](./ai-editing.md).

## One version

- Each release has one version number shared by the npm package and the runtime package of every platform; the kit ships inside the runtime package.
- In the page, `getReleaseInfo().version` gives the editor version; the first frame the runtime writes after start (ready) carries `kitVersion`, so the host can compare the two.
- Upgrade the editor and the runtime together. See [Versioning (Chinese)](../../reference/versioning.md).

## About the names

"Kit" in the runtime package's own notes (`guide/`), the download manifest `kit-manifest.json`, the `offline-kit` command and the `OFFLINE_KIT_*` environment variables means the runtime package. These names are already published and stay as they are.

## Next steps

- [Edit documents with the JS API](./ai-editing.md): let AI change the document the user is editing
- [Runtime reference](../reference/runtime.md): the interfaces the runtime commits to
- [kit document engine](./kit.md): what the kit does and what is available today
- [Quick start (Chinese)](../../guide/quick-start.md): install the editor, get the runtime and create your first editor
