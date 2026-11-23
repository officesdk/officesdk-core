// check-examples.mjs 的单测：代码块抽取、跳过标记、类型错误与空页面都要报出来。
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { checkExamples, extractExamples, SKIP_MARK } from './check-examples.mjs';

/** 最小的页面整合包声明：只有示例要用到的几个名字。 */
const DTS = `
export declare interface OfflineSheetRange { setValue(values: ({ type: "primitive"; value: string | number } | null)[][]): void }
export declare interface OfflineSheetWorksheet { getRange(range: { type: "sheet" }): OfflineSheetRange | null }
export declare type OfflineEditor = { readonly suite: "sheet"; readonly api: { readonly sheet: { readonly activeSheet: OfflineSheetWorksheet } } };
export declare type OfflineEditorResources = { baseUrl: string };
export declare interface OfflineFontProvider { readResource(id: string): Promise<Uint8Array> }
export declare interface OfflineMediaStore { cancel(ref: string): Promise<void> }
export declare function getReleaseInfo(): { readonly version: string };
`;

function withDts(run) {
  const dir = mkdtempSync(join(tmpdir(), 'check-examples-'));
  const dts = resolve(dir, 'public.d.ts');
  writeFileSync(dts, DTS);
  try {
    return run(dts);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const page = (text, file = 'guide/demo.md') => ({ file, text });

test('extractExamples：只取 ts 代码块，记下起始行与跳过标记', () => {
  const markdown = ['# 标题', '', '```ts', 'const a = 1;', '```', '', '```sh', 'npm i', '```', '',
    SKIP_MARK, '', '```ts', 'broken(', '```'].join('\n');
  const blocks = extractExamples(markdown);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], { line: 4, code: 'const a = 1;', skipped: false });
  assert.equal(blocks[1].skipped, true);
});

test('checkExamples：示例与声明一致时通过，可以用顶层 await 与包入口导入', () => withDts(dts => {
  const text = ['```ts', 'import { getReleaseInfo } from "@officesdk/officesdk-core-editor";',
    'if (editor.suite === "sheet") {',
    '  editor.api.sheet.activeSheet.getRange({ type: "sheet" })?.setValue([[{ type: "primitive", value: 1 }]]);',
    '}', 'await Promise.resolve(getReleaseInfo().version);', '```'].join('\n');
  const result = checkExamples({ ts, dts, pages: [page(text)] });
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(result.checked, 1);
}));

test('checkExamples：调用不存在的成员时报出页面与行号', () => withDts(dts => {
  const text = ['说明', '', '```ts', 'if (editor.suite === "sheet") {', '  editor.api.sheet.activeSheet.notAMethod();', '}', '```'].join('\n');
  const result = checkExamples({ ts, dts, pages: [page(text)] });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 1);
  assert.equal(result.problems[0].file, 'guide/demo.md');
  assert.equal(result.problems[0].line, 5);
  assert.match(result.problems[0].message, /notAMethod/);
}));

test('checkExamples：严格模式下的隐式 any 也算错误', () => withDts(dts => {
  const text = ['```ts', 'const list = [1, 2].map((value) => value * 2);', 'function f(x) { return x; }', 'console.log(list, f);', '```'].join('\n');
  const result = checkExamples({ ts, dts, pages: [page(text)] });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some(problem => problem.line === 3));
}));

test('checkExamples：跳过的代码块不编译，计入 skipped', () => withDts(dts => {
  const text = [SKIP_MARK, '```ts', 'this is not typescript', '```', '', '```ts', 'const ok: number = 1;', 'console.log(ok);', '```'].join('\n');
  const result = checkExamples({ ts, dts, pages: [page(text)] });
  assert.equal(result.ok, true);
  assert.equal(result.checked, 1);
  assert.equal(result.skipped, 1);
}));

test('checkExamples：页面里没有 ts 代码块时失败，免得检查空转', () => withDts(dts => {
  const result = checkExamples({ ts, dts, pages: [page('# 只有文字')] });
  assert.equal(result.ok, false);
  assert.match(result.problems[0].message, /没有/);
}));

test('PAGES 里的指南页都存在', async () => {
  const { PAGES } = await import('./check-examples.mjs');
  for (const file of PAGES) assert.ok(existsSync(resolve(import.meta.dirname, '..', file)), file);
});
