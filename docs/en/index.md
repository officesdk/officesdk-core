---
layout: home
title: Office SDK
hero:
  name: Office SDK
  text: Offline document editing kit
  tagline: Open, edit and save Word, PowerPoint, Excel and PDF files inside your desktop or mobile app, with no network service.
  actions:
    - theme: brand
      text: Overview
      link: /en/guide/overview
    - theme: alt
      text: JS API guide
      link: /en/guide/ai-editing
    - theme: alt
      text: Runtime reference
      link: /en/reference/runtime
    - theme: alt
      text: API reference
      link: /api/
features:
  - title: editor (page package)
    details: The npm package @officesdk/officesdk-core-editor runs in your app's WebView, creates the Writer, Presentation, Sheet and PDF editors, and provides a JS API for AI editing.
    link: /en/guide/ai-editing
  - title: runtime (local document process)
    details: A local program shipped with your app that opens, merges edits, saves and exports files. The host app exchanges command frames with it over standard input and output.
    link: /en/reference/runtime
  - title: kit (document engine)
    details: The conversion and rendering engine. It ships inside the runtime package for now and is called by the runtime; a standalone command-line tool and MCP server will follow.
    link: /en/guide/kit
---

## How the three parts work together

The editor in the page only displays and edits; it never reads or writes files. The host app forwards its changes to the local runtime, and the runtime reads and writes the user file with the kit. All three parts share one version number and must be used together.

<ArchitectureDiagram lang="en" compact />

- The big picture in a few minutes: [Overview](./guide/overview.md)
- Let AI change the document the user is editing: [Edit documents with the JS API](./guide/ai-editing.md)
- Integrate the runtime: [Runtime reference](./reference/runtime.md)
- What the kit does today and later: [kit document engine](./guide/kit.md)

The other pages (quick start, installation, editor options, versioning) are in Chinese for now; code samples and the API reference apply to both languages. Office SDK Core is closed-source commercial software governed by the [Office SDK EULA](https://officesdk.com/legal/eula).
