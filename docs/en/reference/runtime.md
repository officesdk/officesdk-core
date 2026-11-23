# Runtime reference

This page lists every interface the runtime exposes to the host app (the host below): the host can rely on them, and they evolve under the [versioning rules (Chinese)](../../reference/versioning.md) and the [compatibility](#compatibility) notes below. It applies to protocol version `"5"` and work-root index version 3.

The `guide/` folder in the runtime package explains each item, and `guide/host-channel.json` is the machine-readable definition of every command's fields; where they differ from this page, the files in the package win. "Kit" in those notes means the runtime.

## At a glance

| Interface | Purpose |
| --- | --- |
| [Command line](#command-line) | Start the service, query the version |
| [Package files](#package-files) | File layout of the runtime package and the start-up check |
| [Standard streams](#standard-streams) | Layout of stdin, stdout, stderr and the byte side stream |
| [Command frames](#command-frames) | Format and pairing of the JSON frames exchanged with the runtime |
| [ready frame](#ready-frame) | Start-up handshake |
| [Commands](#commands) | 23 commands: document sessions, file passwords, media, fonts, edit restriction |
| [File formats](#file-formats) | What can be opened, saved and exported |
| [Error codes](#error-codes) | Failure `code`s and next steps, and "result unknown" |
| [Side-stream frames](#side-stream-frames) | Chunk format for media and font bytes |
| [Embedded mode](#embedded-mode-harmonyos) | The HarmonyOS N-API interface |
| [Release information](#release-information) | Public fields of `release.json` and `kit-manifest.json` |
| [Compatibility](#compatibility) | What can and cannot change within one protocol version |

The runtime has no HTTP interface. The addresses the page uses to load resources and read media are provided by the host; see [Outside these commitments](#outside-these-commitments).

## Command line

```sh
offline-kit-runtime serve --work <DIR>      # start the service
offline-kit-runtime --version               # one line of version information
offline-kit-runtime --version --json        # full release information (JSON)
```

| Arguments | Description |
| --- | --- |
| `serve --work <DIR>` | Starts the service. `<DIR>` is the writable work root your app gives the runtime; the runtime keeps the records of open documents there |
| `--version` | Prints one line: `offline-kit <version> (protocol <protocol>, index <index version>, <channel>)`, for example `offline-kit 0.3.0 (protocol 5, index 3, stable)`. Needs no work root and starts no service |
| `--version --json` | Prints the release information built into the program, identical to `release.json` in the package; fields in [Release information](#release-information) |

Only these three forms are accepted; anything else (including no `serve`) prints the usage and exits with a non-zero status. Install and cache directories are not arguments: the runtime finds its package files next to its own executable.

`production.json` in the work root is the conversion configuration: when it is missing the runtime writes the default content, when it exists it is used as is. The runtime loads it before writing ready; restart the runtime after changing it. If the file cannot be read or is not a JSON object, start-up fails and the file is not overwritten.

## Package files

The files of the runtime package sit in one directory; the runtime finds them next to its own executable:

| File | Description |
| --- | --- |
| `offline-kit-runtime` | The runtime program (`.exe` on Windows) |
| `compose-worker` | Child process for merging sheet edits (`.exe` on Windows) |
| `modoc.js` | Script loaded by `compose-worker` |
| `mow_wasm.js`, `mow_wasm.d.ts`, `mow_wasm_bg.wasm` | WebAssembly files of the document model |
| `guide/` | Protocol notes shipped with the package; `guide/host-channel.json` defines every command's fields |
| `release.json` | Release information, see [Release information](#release-information) |
| `LICENSE.md` | License notice |

- Keep this layout when you ship it; do not rename or split the files. `serve` checks that `compose-worker` and `modoc.js` exist and fails to start without them. The three WebAssembly files ship in the package but `serve` does not read them.
- The HarmonyOS package has different files; see [Embedded mode](#embedded-mode-harmonyos).

## Standard streams

Prepare four pipes when you spawn the process:

| Stream | Direction | Content |
| --- | --- | --- |
| stdin | host → runtime | Command frames |
| stdout | runtime → host | Response frames (the first one is ready) |
| stderr | runtime → host | Error text, for logs only |
| file descriptor 3 | both | Media and font bytes ([side-stream frames](#side-stream-frames)) |

- File descriptor 3 must be a pipe or a socket; otherwise the runtime has no byte channel and the media and font commands are unavailable. In Node.js: `stdio: ["pipe", "pipe", "pipe", "pipe"]`.
- **Windows**: the byte channel is split into two one-way pipes. Set `OFFLINE_KIT_STREAM_HANDLES=<runtime read end>,<runtime write end>` (decimal values of two inheritable handles); without it the runtime uses the inherited descriptors 3 (read) and 4 (write). In Node.js pass five `"pipe"`s; the host writes to index 3 and reads from index 4.

## Command frames

Each frame is a **4-byte big-endian length followed by a UTF-8 JSON object**. The length excludes the 4 bytes; the maximum is 67108864 bytes.

```text
00 00 00 29   {"id":"1","op":"open","path":"book.xlsx"}
```

- A command object carries a top-level `op` and an `id` generated by the host. `id` is a non-negative integer or a non-empty string of 1 to 128 bytes; the string `"1"` and the number `1` are different ids. The response echoes the `id` unchanged, and the host pairs responses by it.
- A success response carries `"ok": true`; an explicit failure carries `"ok": false`, a stable `code` and an English `error`. Branch on `code`; the `error` sentence may be reworded and must not be compared.
- The runtime accepts up to 8 outstanding commands and runs them one at a time in the order accepted; the 9th stays in the pipe. The host may keep writing but must read stdout at the same time.
- Reusing an `id` whose earlier command has not been answered returns `duplicate-id`; the earlier command still completes.
- Frames without a valid `id`, frames that are not JSON and frames that are not objects get `id-required`, `request-not-json` and `request-not-object`; these three responses carry no `id`.
- There is no JSON-RPC envelope (no `jsonrpc`, `method` or `params`).
- Fields are strings unless stated otherwise; `unsaved`, `hasPassword`, `pending`, `diskChanged` and `overwrite` are booleans, and `length`, `offset` and `totalLength` are numbers. An empty required string counts as missing.
- A field the command does not list returns `unknown-field`; work-directory keys (`workdir`, `cachedir`, `revision` and the like) return `forbidden-field`. Send `overwrite` only when it is `true`.

## ready frame

After its start-up checks, the runtime writes its first frame to stdout, without an `id`:

```json
{"ready":true,"protocolVersion":"5","kitVersion":"0.3.0"}
```

| Field | Description |
| --- | --- |
| `ready` | `true` |
| `protocolVersion` | Protocol version. The host only talks to a runtime with the same protocol version and stops sending otherwise |
| `kitVersion` | Optional: the runtime's release version, for logs and diagnostics only ("Kit" in the field name means the runtime) |

The host must read `ready: true` before sending any command, and must not reject a ready frame that lacks `kitVersion` or carries extra fields.

## Commands

The fields below follow `guide/host-channel.json`. Every success response carries `ok`, and every failure response carries `ok`, `code` and `error`; the tables do not repeat them.

### Document sessions

| op | Required | Optional | Success response |
| --- | --- | --- | --- |
| `open` | `path` | `password` | `documentId`, `suite`, `content`, `unsaved`; may add `diskChanged`, `nextChangeSetRevision` |
| `new` | `suite` (`document`, `sheet`, `presentation`, `pdf`) | — | `documentId`, `suite`, `content`, `unsaved`; may add `nextChangeSetRevision` |
| `content` | `documentId` | — | As `open` (does not read the user file; no `diskChanged`) |
| `import` | `documentId` | `password`, `overwrite` | As `open`: replaces the current record with the file on disk |
| `change` | `documentId`, `body` | — | Nothing else |
| `save` | `documentId` | `target`, `overwrite` | Nothing else |
| `export` | `documentId`, `target` | `overwrite` | Nothing else |
| `discard` | `documentId` | — | Nothing else |

- `documentId` comes from the runtime and is used by every later command; `suite` decides which editor the page creates; pass `content` to the page unchanged.
- `unsaved: true` means the work root holds unsaved changes from last time and `content` already includes them. `diskChanged` means the user file was changed on disk; send `import` only after the user confirms.
- `nextChangeSetRevision` appears for `document` and `presentation` only; pass it to the page in edit mode.
- `change.body` is the `body` of the page's `change` event, unchanged, and must not carry `media`. The host submits one at a time in the order produced; before save, export, import or discard, wait until every submitted `change` has been answered.
- `save` without `target` writes back to the file that was opened; with `target` it saves as a new file and binds to it. `export` writes to `target` without changing the binding.
- `discard` drops the unsaved changes in the work root. Send it only when the user explicitly discards; closing a window does not.

### File passwords

| op | Required | Success response |
| --- | --- | --- |
| `has-password` | `documentId` | `hasPassword` |
| `session-password` | `documentId` | `password` (the session password of this process in plain text; keep it in the host) |
| `set-password` | `documentId`, `password` | Nothing else |
| `clear-password` | `documentId` | Nothing else |

When opening an encrypted file, send no `password` the first time; after `need-password` or `wrong-password`, the host collects the password and resends the same `open` (or `import`) with `password`. The page never sees file passwords.

### Media

| op | Required | Optional | Success response |
| --- | --- | --- | --- |
| `begin-media-write` | `documentId`, `extension` | `kind` | `stream` |
| `finish-media-write` | `documentId`, `stream` | — | `reference` |
| `open-media-read` | `documentId`, `reference`, `purpose` | `range` | `stream`, `contentType`, `length`; with `range` also `offset`, `totalLength` |

- Writing: `begin-media-write` returns a `stream` → write all bytes for that stream number on the side stream → `finish-media-write` returns a `reference`; pass it to the page unchanged. `extension` is up to 8 letters or digits without a dot; `kind` is `image` or `embedding` for document, `media` or `embeddings` for presentation, `embedding` for pdf, and absent for sheet; a mismatch returns `media-kind-rejected`.
- Reading: `purpose` is `display` or `download`; read exactly `length` bytes for `stream` from the side stream. EMF, WMF and TIFF images in sheets read with `display` come back as PNG previews (not in the Windows packages).
- Video and audio are read in parts: put the single range of an HTTP `Range` header (`bytes=a-b`, `bytes=a-`, `bytes=-n`) in `range`, and answer 206 from `offset` and `totalLength`; an unsatisfiable range returns `media-range-unsatisfiable` and the host answers 416. Do not forward multi-range requests; read the whole resource instead.
- Media commands must not carry `bytes` or `path`.

### Fonts

Call after ready, without `documentId`.

| op | Required | Success response |
| --- | --- | --- |
| `font-catalog` | — | `pending`, `schemaVersion`, `catalogVersion`, `fonts` |
| `font-read` | `resourceId` | `resourceId`, `stream`, `contentType`, `length` (bytes on the side stream) |
| `font-prioritize` | `family` | Nothing else |

While the font index is not ready, `font-catalog` returns an empty `fonts` with `pending: true`. Take `resourceId` from a catalog entry; responses never contain local paths.

### Edit restriction (document)

| op | Required | Optional | Success response |
| --- | --- | --- | --- |
| `restriction-update-rules` | `documentId`, `body` | — | Nothing else |
| `restriction-set-password` | `documentId`, `newPassword` | — | Nothing else |
| `restriction-change-password` | `documentId`, `currentPassword`, `newPassword` | — | Nothing else |
| `restriction-remove-password` | `documentId` | `currentPassword` | Nothing else |
| `restriction-verify-password` | `documentId`, `currentPassword` | — | `status` |

These back Writer's edit-restriction services (`createEditRestrictionServices` in the page package). Offline, only the "everyone" scope is supported; passwords are 6 to 15 visible ASCII characters. A write marks the record unsaved, and the restriction is written into the document on save.

## File formats

| Opened extension | `suite` | Save and export targets |
| --- | --- | --- |
| `.docx`, `.doc` | `document` | `.docx` only; save a `.doc` file as `.docx` |
| `.pptx`, `.ppt` | `presentation` | `.pptx` only; save a `.ppt` file as `.pptx` |
| `.xlsx`, `.xls` | `sheet` | Target extension `.xlsx` or `.xls`; `.xlsx` recommended |
| `.pdf` | `pdf` | `.pdf` only |

Save and export write the same kind of file as the original; there is no cross-format conversion (a `.docx` cannot be exported as `.pdf`, for example). For document, presentation and pdf, a target in another format returns `unsupported-format` and no edits are lost; they stay in the record. For sheet, another target extension returns `convert-failed`. `new` can create `document`, `sheet`, `presentation` and `pdf` (one blank A4 page for PDF).

## Error codes

Branch on `code`. The table groups the codes by situation; the failure notes in the package's `guide/` explain each one.

| Situation | `code` |
| --- | --- |
| Frames and fields | `request-not-json`, `request-not-object`, `id-required`, `duplicate-id`, `operation-required`, `unknown-operation`, `unknown-field`, `missing-field`, `forbidden-field`, `response-too-large`, `response-rejected` |
| Required fields | `path-required`, `document-id-required`, `target-required`, `suite-required`, `change-body-required`, `password-required` |
| Opening and content | `need-password`, `wrong-password`, `open-failed`, `content-load-failed`, `document-missing`, `suite-missing`, `blank-template-missing` |
| Editing and saving | `change-body-rejected`, `media-forbidden`, `save-in-progress`, `save-did-not-complete`, `file-changed`, `path-missing`, `target-in-use` (the response carries `holderDocumentId`), `unsupported-format`, `convert-failed`, `compose-no-result`, `copy-failed`, `result-unknown` |
| Media | `unknown-media-reference`, `media-kind-rejected`, `media-stream-unavailable`, `media-stream-too-large`, `media-range-unsatisfiable` |
| Fonts | `font-provider-missing`, `font-request-rejected`, `font-read-rejected`, `font-family-rejected`, `font-stream-unavailable`, `font-stream-too-large`, `not-found` |
| Edit restriction | `restriction-invalid`, `restriction-malformed`, `restriction-password-required`, `restriction-password-incorrect`, `restriction-password-already-set`, `restriction-password-not-set`, `protection-unsupported` |

Codes that need special handling:

- `file-changed`: the bound file changed on disk before writing back. Get the user's choice, then overwrite with `overwrite: true`, save as another file, or `import`.
- `target-in-use`: the target belongs to another record (`holderDocumentId`). Resend with `overwrite: true` after the user confirms.
- `result-unknown`: it is unknown whether this change reached the disk. Do not replay it; the record accepts no more changes until the runtime restarts, then open it again.
- Do not use `discard` to clean up after a failed open or content load.

### Result unknown

When a command frame has been written to stdin but no usable response arrives (stdout closes, the length is over the limit, the response is not JSON, the process exits), the result of that command is **unknown**. It is not a `code`:

- Do not assume success or failure; stop sending save, export, import and discard for that document.
- Do not resend the same frame to find out, and do not clean up with `discard` (the record stays in the work root and can continue after a restart).

A request that exceeds 67108864 bytes before it is written is never sent; that is an explicit failure and may be retried smaller.

## Side-stream frames

Media and font bytes never go into the command JSON; they travel on file descriptor 3 (two one-way pipes on Windows). Each chunk is a 16-byte header plus the body:

| Offset | Length | Meaning |
| --- | --- | --- |
| 0 | 8 | Stream number, big-endian unsigned 64-bit |
| 8 | 8 | Body length, big-endian unsigned 64-bit |
| 16 | body length | File bytes |

- The body is at most 268435456 bytes (256 MiB); above that, the side stream fails. Read large video and audio in parts with `range`.
- `stream` in a command response is the stream number as a decimal string. Bytes may arrive before the matching JSON response; buffer them by stream number and hand them to the page once the response gives `stream` and `length`.

## Embedded mode (HarmonyOS)

HarmonyOS apps cannot run executables, so the runtime runs inside the app process as the N-API module `liboffline_kit.so`. Command frames, side-stream frames, commands and error codes are the same as above. Package files: `liboffline_kit.so` (goes into `libs/arm64-v8a/` of the HAP module), the ArkTS type declarations `index.d.ts`, `modoc.js`, the three WebAssembly files, `guide/`, `release.json` and `LICENSE.md`; there is no `offline-kit-runtime` and no `compose-worker`.

The host puts `modoc.js` in rawfile, copies it into a directory in the app sandbox before start-up, and passes that directory to `start` as `resourceDir`.

```ts
import kit from 'liboffline_kit.so';

const handle = kit.start(resourceDir, workDir, onFrame, onSide, onExit);
handle.send(frameBytes);      // the JSON bytes of one command frame, without the length prefix
kit.version();                // the same line as offline-kit-runtime --version
```

| Member | Description |
| --- | --- |
| `start(resourceDir, workDir, onFrame, onSide, onExit)` | Starts the runtime and returns a handle at once. `resourceDir` is the sandbox directory holding `modoc.js`, `workDir` matches `serve --work`; `onFrame` receives response frames without the length prefix (the first is ready), `onSide` receives raw side-stream bytes, and `onExit` is called when it stops (`null` after a normal close, error text on failure) |
| `handle.send(frame)` | Writes one command frame (no length prefix); more than 67108864 bytes throws at once, an explicit failure |
| `handle.sideWrite(bytes)` | Writes side-stream bytes (inserting media) |
| `handle.close()` | Like closing stdin: stops after the accepted commands are done |
| `version()` | One line of version information, as `--version` |
| `releaseInfo()` | Release information as JSON text, as `--version --json` |

- One app process can run only one runtime at a time; a second `start` ends with an error through `onExit`. After `close()`, `start` again with the same `workDir`; starting with a different `workDir` in the same process fails (the conversion configuration is loaded once per process), so restart the app to switch work roots.
- Keep the handle returned by `start`; if it is garbage-collected, that equals `close()`.
- `production.json` is loaded once per process; restart the app after changing it. The runtime passes the configuration path to its internal converter through the process environment variable `CONFIG_PATH`; other code in the app must not read or write that variable.
- During each conversion the runtime temporarily changes the process environment variable `TMPDIR` and restores it afterwards. In embedded mode that is the app's own process: app code must not rely on `TMPDIR` while the runtime is working.
- There is no stderr; start-up errors come back through `onExit`.

## Release information

### release.json

The runtime package and the page package carry the same release information: `release.json` at the root of the runtime package (also the output of `--version --json`) and `dist/release.json` in the page package (read it in the page with `getReleaseInfo()`).

| Field | Description |
| --- | --- |
| `format` | File format version, currently `1` |
| `version` | Release version `X.Y.Z` or `X.Y.Z-rc.N` |
| `channel` | `stable`, `rc` or `dev` |
| `compat.protocolVersion` | Command-frame protocol version, equal to `protocolVersion` in the ready frame |
| `compat.indexVersion` | Work-root index version |
| `compat.readsIndexVersions` | Older index versions it can still open |
| `compat.catalogFormat` | Format version of the editor resource catalog `catalog.json` |
| `compat.downgradeFloor` | The oldest runtime version that can still open a work root written by this version |
| `editors.<name>.version` | Versions of the bundled Writer, Presentation, Sheet and PDF editors (keys `writer`, `presentation`, `sheet`, `pdf`) |
| `page.package`, `page.version` | Name and version of the page package |

### kit-manifest.json

Every GitHub Release includes `kit-manifest.json` for hosts that download the runtime and the editor resources at run time ("kit" in the file and field names means the runtime package).

| Field | Description |
| --- | --- |
| `v` | Manifest format version, currently `1` |
| `officeKit` | `version`, `protocol`, `indexVersion`, `readsIndexVersions`, `downgradeFloor` |
| `sources` | Download sources of the runtime packages (the `v<version>/` directory of the GitHub Release) |
| `kit.<platform key>` | One entry per platform: `status`, `file`, `size`, `sha256`, `integrity`, the entry point `binary` (executable) or `module` (`liboffline_kit.so` on HarmonyOS), and digests of every file in the package, `files` |
| `editor` | The page package: `file`, `size`, `sha256`, `integrity`, resource root `root`, npm source `npm` and `sources`, resource digests `files`, and `bundle` when the package carries the single-file page bundle |

`sha256` and `integrity` use SRI notation (`sha256-<base64>`, `sha512-<base64>`).

| Platform key | target | Entry point |
| --- | --- | --- |
| `darwin-arm64` | `aarch64-apple-darwin` | `binary`: `offline-kit-runtime` |
| `darwin-x64` | `x86_64-apple-darwin` | `binary`: `offline-kit-runtime` |
| `linux-arm64` | `aarch64-unknown-linux-gnu` | `binary`: `offline-kit-runtime` |
| `linux-x64` | `x86_64-unknown-linux-gnu` | `binary`: `offline-kit-runtime` |
| `win32-arm64` | `aarch64-pc-windows-msvc` | `binary`: `offline-kit-runtime.exe` |
| `win32-x64` | `x86_64-pc-windows-msvc` | `binary`: `offline-kit-runtime.exe` |
| `openharmony-arm64` | `aarch64-unknown-linux-ohos` | `module`: `liboffline_kit.so` |

`status: stable` means the platform has passed run-time acceptance; `test` means it ships with the release and is still being verified. The platforms of each version are those in its Release.

## Compatibility

- A change of the **protocol version** (`protocolVersion` in the ready frame) or of the work-root index version is a MAJOR release; a host and a runtime with different protocol versions cannot be used together.
- Adding optional fields or error codes within a protocol version is a MINOR release. The host should ignore response fields it does not know and treat unknown `code`s as ordinary failures.
- During `0.x`, an incompatible change may be released as MINOR only (for example a change in a suite's content format or in a required field); the Release notes then describe what to do when upgrading. Check the Release notes before upgrading, and treat `guide/` and `guide/host-channel.json` in the new runtime package as authoritative.
- A newer runtime opens work roots of the index versions listed in `readsIndexVersions`; when going back to an older runtime, its version must not be below `downgradeFloor`.
- The editor and the runtime always use the same version; see [Versioning (Chinese)](../../reference/versioning.md).

## Outside these commitments

The following may change in any version; do not rely on them:

- Files and folders inside the work root (open records, the index, temporary conversion folders). The host only hands the work root to the runtime and does not read or write its contents.
- The meaning of the fields in `production.json`. They are interpreted by the bundled converter; the runtime only checks that the file is a JSON object.
- How the helper files in the runtime package (`compose-worker`, `modoc.js`, `mow_wasm*`) are invoked and how they talk to each other. Ship them in the [package layout](#package-files) (on HarmonyOS, also copy `modoc.js` as required for `resourceDir`).
- How the runtime uses process environment variables (`CONFIG_PATH`, `TMPDIR`).
- Text on stderr and the wording of the English `error` in failure responses.
- Method names, page bridges and resource addresses of a host in reference integrations. The runtime only understands the command frames above and runs no HTTP service; the addresses the page uses to load resources and read media (a custom protocol or local HTTP) are the host's own.
