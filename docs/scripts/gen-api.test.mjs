import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { main, parseDts, renderPages, renderRelease } from './gen-api.mjs';

const DTS = `/** Creates an editor. */
export declare function createThing(options: ThingOptions): Promise<Thing>;

/** Options. */
declare interface ThingOptions {
    name: string;
}
export { ThingOptions }
export { ThingOptions as LegacyThingOptions }

declare interface Hidden {
    id: string;
}

export declare type Thing = { hidden: Hidden };

export declare const KINDS: readonly ["a", "b"];

export declare class ThingError extends Error {
}
`;

test('收集导出、别名与未导出的辅助类型', () => {
  const parsed = parseDts(DTS);
  assert.deepEqual([...parsed.exported.keys()].sort(), ['KINDS', 'LegacyThingOptions', 'Thing', 'ThingError', 'ThingOptions', 'createThing']);
  assert.equal(parsed.exported.get('LegacyThingOptions'), 'ThingOptions');
  assert.equal(parsed.declarations.get('Hidden').kind, 'interface');
  const pages = renderPages(parsed, null);
  assert.deepEqual([...pages.documented].sort(), [...parsed.exported.keys()].sort());
  assert.match(pages.index, /### createThing\n\nCreates an editor\./);
  assert.match(pages.index, /## 类\n\n### ThingError/);
  assert.match(pages.types, /### ThingOptions\n\n别名：`LegacyThingOptions`/);
  assert.match(pages.types, /## 辅助类型[\s\S]*### Hidden/);
  assert.doesNotMatch(pages.index, /declare /);
  // frontmatter 在第一行，VitePress 才会解析它而不是当正文渲染
  assert.match(pages.index, /^---\ntitle: API 参考\n/);
  assert.match(pages.types, /^---\ntitle: 类型\n/);
});

test('导出找不到声明时失败', () => {
  assert.throws(() => parseDts('export { Missing }\n'), /找不到声明/);
});

test('版本片段：有发行信息时列出版本与编辑器版本，没有时说明本地构建', () => {
  const text = renderRelease({ version: '1.2.3', channel: 'stable',
    compat: { protocolVersion: '5', indexVersion: 3, readsIndexVersions: [1, 2, 3], downgradeFloor: '0.1.0' },
    editors: { writer: { version: '0.1.3' }, pdf: { version: '0.2.1' } } });
  assert.match(text, /\| 版本 \| `1\.2\.3` \|/);
  assert.match(text, /可读：1、2、3/);
  assert.match(text, /Writer（文档） 编辑器 \| `0\.1\.3`/);
  assert.doesNotMatch(text, /Sheet/);
  assert.match(renderRelease(null), /本地构建/);
});

test('命令行：写出三份页面', async () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'gen-api-'));
  try {
    writeFileSync(resolve(dir, 'public.d.ts'), DTS);
    writeFileSync(resolve(dir, 'release.json'), JSON.stringify({ version: '1.2.3' }));
    await main(['--dts', resolve(dir, 'public.d.ts'), '--release', resolve(dir, 'release.json'), '--out', resolve(dir, 'api')]);
    assert.match(readFileSync(resolve(dir, 'api/index.md'), 'utf8'), /@officesdk\/officesdk-core-editor@1\.2\.3/);
    assert.match(readFileSync(resolve(dir, 'api/types.md'), 'utf8'), /### Thing\b/);
    assert.match(readFileSync(resolve(dir, 'api/_release.md'), 'utf8'), /1\.2\.3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
