# Office SDK documentation

Source of the Office SDK documentation site (<https://officesdk.github.io/officesdk-core/>), built with [VitePress](https://vitepress.dev/) and published to GitHub Pages.

本目录是门面仓库 `officesdk/officesdk-core` 的 `docs/`，是 Office SDK 文档站的源文件，由 Office SDK 的发版流程按版本同步，请不要直接在这里修改；问题和建议请提交 issue。

## Build locally

```sh
cd docs
npm ci
npm run build      # generates the API reference from api-src/, checks the guide examples and builds the site
npm run preview
```

- `api-src/public.d.ts`: type declarations of `@officesdk/officesdk-core-editor` for this version; `scripts/gen-api.mjs` turns them into `api/*.md`.
- `scripts/check-examples.mjs` type-checks the TypeScript examples of the JS API guide (`guide/ai-editing.md`, `en/guide/ai-editing.md`) against the same declarations; `npm run build` runs it after the API reference, and `npm test` covers it.
- `api-src/release-public.json`: version information shown on the versioning page.

## License

Office SDK Core is closed-source commercial software. See [Office SDK EULA](https://officesdk.com/legal/eula).
