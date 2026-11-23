#!/usr/bin/env node
// 指南页里的 TypeScript 示例按 @officesdk/officesdk-core-editor 的 public.d.ts 做类型检查（构建步骤，`npm run build` 在 gen-api 之后跑它）。
//
//   node scripts/check-examples.mjs [--dts <public.d.ts>]
//
// d.ts 输入顺序同 gen-api：--dts → api-src/public.d.ts → ../packages/editor/dist/esm/public.d.ts。
// 被检查的页面是 PAGES；每个 ```ts 代码块单独作为一个模块编译（块尾补 `export {}`，可以用顶层 await），
// 示例里用到的宿主变量（editor、opened、resources……）由 ENV 声明，类型都取自页面整合包。
// 代码块前一行写 <!-- example: skip --> 时跳过这一块（输出里计数）。没有找到页面、页面里没有 ts 代码块都算失败，免得检查空转。
// typescript 先从本站依赖取；没有安装本站依赖时，从相邻的 ../packages/editor 取。
// 退出码：0 全部通过，1 有类型错误或输入缺失。
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = '@officesdk/officesdk-core-editor';
export const PAGES = ['guide/ai-editing.md', 'en/guide/ai-editing.md'];
export const SKIP_MARK = '<!-- example: skip -->';

/** 示例里出现的宿主变量。只声明类型，不提供实现。 */
export const ENV = `
type OfficeSdk = typeof import("${PACKAGE}");
type Editor = import("${PACKAGE}").OfflineEditor;
declare const editor: Editor;
declare const container: HTMLElement;
declare const resources: import("${PACKAGE}").OfflineEditorResources;
declare const fontProvider: import("${PACKAGE}").OfflineFontProvider;
declare const mediaStore: import("${PACKAGE}").OfflineMediaStore;
declare const resolveReadUrl: (resourceRef: string) => string;
declare const opened: { documentId: string; suite: "document" | "sheet" | "presentation" | "pdf"; content: unknown; nextChangeSetRevision: number };
declare const host: { queue(change: { documentId: string; body: string; format: string }): void; drain(): Promise<void>; save(documentId: string): Promise<void> };
`;

/** 从 Markdown 取出 ```ts 代码块：[{ line, code, skipped }]，line 是代码第一行在文件里的行号。 */
export function extractExamples(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const open = /^(\s*)(`{3,}|~{3,})\s*ts\b(.*)$/.exec(lines[index]);
    if (!open) continue;
    const fence = open[2];
    const body = [];
    let end = index + 1;
    while (end < lines.length && !lines[end].trimStart().startsWith(fence)) body.push(lines[end++]);
    let previous = index - 1;
    while (previous >= 0 && lines[previous].trim() === '') previous -= 1;
    const skipped = previous >= 0 && lines[previous].trim() === SKIP_MARK;
    blocks.push({ line: index + 2, code: body.join('\n'), skipped });
    index = end;
  }
  return blocks;
}

/**
 * 检查若干页面的示例。返回 { ok, checked, skipped, problems: [{ file, line, message }] }。
 * ts 是 typescript 模块；pages 是 [{ file, text }]（file 只用于报告）。
 */
export function checkExamples({ ts, dts, pages }) {
  const problems = [];
  const files = new Map();
  const origins = new Map();
  let skipped = 0;
  const envFile = resolve(SITE, '__examples__/env.d.ts');
  files.set(envFile, ENV);
  for (const page of pages) {
    const blocks = extractExamples(page.text);
    if (!blocks.length) problems.push({ file: page.file, line: 0, message: '页面里没有 ```ts 代码块' });
    blocks.forEach((block, index) => {
      if (block.skipped) { skipped += 1; return; }
      const name = resolve(SITE, `__examples__/${page.file.replace(/[^\w.-]+/g, '_')}.${index}.ts`);
      files.set(name, `${block.code}\nexport {};\n`);
      origins.set(name, { file: page.file, line: block.line });
    });
  }
  const options = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
    skipLibCheck: true,
    paths: { [PACKAGE]: [dts] },
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = file => files.get(resolve(file)) ?? readFile(file);
  host.fileExists = file => files.has(resolve(file)) || fileExists(file);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, language, onError) => {
    const text = files.get(resolve(file));
    return text === undefined ? getSourceFile(file, language, onError) : ts.createSourceFile(file, text, language, true);
  };
  const program = ts.createProgram([envFile, ...origins.keys()], options, host);
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const name = diagnostic.file ? resolve(diagnostic.file.fileName) : null;
    const origin = name ? origins.get(name) : null;
    if (origin && diagnostic.start !== undefined) {
      const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      problems.push({ file: origin.file, line: origin.line + line, message });
    } else {
      problems.push({ file: name ? relative(SITE, name) : '(全局)', line: 0, message });
    }
  }
  return { ok: problems.length === 0, checked: origins.size, skipped, problems };
}

async function loadTypeScript() {
  try {
    return (await import('typescript')).default;
  } catch {
    const editor = resolve(SITE, '../packages/editor/package.json');
    if (!existsSync(editor)) throw new Error('找不到 typescript：先在 website/ 运行 npm ci');
    return createRequire(editor)('typescript');
  }
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function main(args = process.argv.slice(2)) {
  const candidates = [argValue(args, '--dts'), resolve(SITE, 'api-src/public.d.ts'), resolve(SITE, '../packages/editor/dist/esm/public.d.ts')];
  const dts = candidates.find(path => path && existsSync(path));
  if (!dts) throw new Error('找不到 public.d.ts：用 --dts 指定，或放到 api-src/public.d.ts（在源码仓库里先运行 pnpm build:editor）');
  const pages = PAGES.map(file => {
    const path = resolve(SITE, file);
    if (!existsSync(path)) throw new Error(`找不到要检查的页面：${file}`);
    return { file, text: readFileSync(path, 'utf8') };
  });
  const ts = await loadTypeScript();
  const result = checkExamples({ ts, dts: resolve(dts), pages });
  if (!result.ok) {
    const lines = result.problems.slice(0, 30).map(p => `  ✗ ${p.file}${p.line ? `:${p.line}` : ''} ${p.message.split('\n')[0]}`);
    throw new Error(`示例类型检查不通过（${result.problems.length} 处）：\n${lines.join('\n')}`);
  }
  console.log(`示例类型检查通过：${result.checked} 个代码块${result.skipped ? `，跳过 ${result.skipped} 个` : ''}（来源 ${relative(process.cwd(), dts) || dts}）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
