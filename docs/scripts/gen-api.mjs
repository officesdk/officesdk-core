#!/usr/bin/env node
// 由 @officesdk/officesdk-core-editor 的 public.d.ts 生成 API 参考页（构建步骤，`npm run build` 先跑它）。
//
//   node scripts/gen-api.mjs [--dts <public.d.ts>] [--release <release-public.json>] [--out <目录>]
//
// d.ts 输入顺序：--dts → api-src/public.d.ts → ../packages/editor/dist/esm/public.d.ts。
// 发行信息输入顺序：--release → api-src/release-public.json → 无（版本片段写「本地构建」）。
// 输出到 api/：index.md（函数、类、常量）、types.md（接口与类型别名）、_release.md（版本片段，由版本页 include）。
// 自检：d.ts 导出的名字必须全部出现在输出里。在源码仓库里构建时（存在 ../scripts/release/docs-check.mjs），
// 生成页还要过一遍对外文档检查，命中即失败；同步出去的仓库没有这个脚本，那里的内容在同步前已检查过。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = '@officesdk/officesdk-core-editor';
const EDITOR_LABELS = { writer: 'Writer（文档）', presentation: 'Presentation（演示）', sheet: 'Sheet（表格）', pdf: 'PDF' };
const DOCS_CHECK = resolve(SITE, '../scripts/release/docs-check.mjs');

const KIND_TITLE = { function: '函数', class: '类', const: '常量', interface: '接口', type: '类型别名' };

function hasModifier(node, kind) {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === kind));
}

function kindOf(node) {
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isVariableStatement(node)) return 'const';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'type';
  return null;
}

function namesOf(node) {
  if (ts.isVariableStatement(node)) return node.declarationList.declarations.map(d => d.name.getText());
  return node.name ? [node.name.getText()] : [];
}

function docOf(node) {
  const parts = [];
  for (const doc of node.jsDoc ?? []) {
    const text = ts.getTextOfJSDocComment(doc.comment);
    if (text) parts.push(text.trim());
    for (const tag of doc.tags ?? []) {
      const comment = ts.getTextOfJSDocComment(tag.comment);
      parts.push(`- \`@${tag.tagName.getText()}\`${comment ? ` ${comment.trim()}` : ''}`);
    }
  }
  return parts.join('\n\n');
}

function declarationText(node) {
  return node.getText().replace(/^export\s+/, '').replace(/^declare\s+/, '');
}

/** 解析 d.ts：返回声明（按名字，重载合并）与导出名到声明名的映射。 */
export function parseDts(source, fileName = 'public.d.ts') {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = new Map();
  const exported = new Map();
  for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.moduleSpecifier) throw new Error(`不支持再导出外部模块：${statement.getText()}`);
      for (const element of statement.exportClause?.elements ?? []) {
        exported.set(element.name.getText(), (element.propertyName ?? element.name).getText());
      }
      continue;
    }
    const kind = kindOf(statement);
    if (!kind) continue;
    for (const name of namesOf(statement)) {
      const entry = declarations.get(name) ?? { name, kind, doc: '', code: [] };
      const doc = docOf(statement);
      if (doc && !entry.doc) entry.doc = doc;
      entry.code.push(declarationText(statement));
      declarations.set(name, entry);
      if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) exported.set(name, name);
    }
  }
  for (const [name, target] of exported) {
    if (!declarations.has(target)) throw new Error(`导出 ${name} 找不到声明 ${target}`);
  }
  return { declarations, exported };
}

function section(entry, aliases) {
  const lines = [`### ${entry.name}`, ''];
  if (aliases.length) lines.push(`别名：${aliases.map(a => `\`${a}\``).join('、')}`, '');
  if (entry.doc) lines.push(entry.doc, '');
  lines.push('```ts', entry.code.join('\n\n'), '```', '');
  return lines.join('\n');
}

/** 生成三份页面文本；同时返回已写出的导出名，供自检。 */
export function renderPages({ declarations, exported }, release) {
  const version = release?.version ?? null;
  const aliasesOf = new Map();
  const exportedTargets = new Set();
  for (const [name, target] of exported) {
    exportedTargets.add(target);
    if (name !== target) aliasesOf.set(target, [...(aliasesOf.get(target) ?? []), name]);
  }
  const groups = { public: {}, helper: [] };
  for (const entry of [...declarations.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    if (exportedTargets.has(entry.name)) (groups.public[entry.kind] ??= []).push(entry);
    else groups.helper.push(entry);
  }
  const documented = new Set();
  const render = (entry) => {
    for (const [name, target] of exported) if (target === entry.name) documented.add(name);
    const aliases = aliasesOf.get(entry.name) ?? [];
    return section(entry, aliases);
  };
  const source = version ? `${PACKAGE}@${version}` : `${PACKAGE}（本地构建）`;
  const banner = `<!-- 本页由 scripts/gen-api.mjs 自动生成，不要手改。 -->`;
  const intro = `> 根据 \`${source}\` 的类型声明 \`public.d.ts\` 自动生成。全部名称都从包入口导入：\`import { … } from "${PACKAGE}"\`。`;

  // frontmatter 必须在文件第一行，生成说明放在它之后。
  const index = ['---', 'title: API 参考', 'outline: [2, 3]', '---', '', banner, '', '# API 参考', '', intro, '',
    '接口与类型别名见 [类型](./types.md)。', ''];
  for (const kind of ['function', 'class', 'const']) {
    const list = groups.public[kind] ?? [];
    if (!list.length) continue;
    index.push(`## ${KIND_TITLE[kind]}`, '');
    for (const entry of list) index.push(render(entry));
  }
  const types = ['---', 'title: 类型', 'outline: [2, 3]', '---', '', banner, '', '# 类型', '', intro, ''];
  for (const kind of ['interface', 'type']) {
    const list = groups.public[kind] ?? [];
    if (!list.length) continue;
    types.push(`## ${KIND_TITLE[kind]}`, '');
    for (const entry of list) types.push(render(entry));
  }
  if (groups.helper.length) {
    types.push('## 辅助类型', '', '以下类型不从包入口导出，只在上面的声明中被引用，列出以便查阅字段。', '');
    for (const entry of groups.helper) types.push(section(entry, []));
  }
  return { index: index.join('\n'), types: types.join('\n'), release: renderRelease(release), documented };
}

export function renderRelease(release) {
  if (!release) {
    return ['::: info 本地构建', '这份站点不是从发行包构建的，没有发行版本信息。正式站点在发版时由对应版本的发行信息生成。', ':::', ''].join('\n');
  }
  const compat = release.compat ?? {};
  const rows = [
    `| 版本 | \`${release.version}\` |`,
    `| 渠道 | \`${release.channel ?? '-'}\` |`,
    `| 协议版本 | \`${compat.protocolVersion ?? '-'}\` |`,
    `| 工作根关联表版本 | \`${compat.indexVersion ?? '-'}\`（可读：${(compat.readsIndexVersions ?? []).join('、') || '-'}） |`,
    `| 降级下限 | \`${compat.downgradeFloor ?? '-'}\` |`,
  ];
  for (const [key, label] of Object.entries(EDITOR_LABELS)) {
    const version = release.editors?.[key]?.version;
    if (version) rows.push(`| ${label} 编辑器 | \`${version}\` |`);
  }
  return ['| 项目 | 值 |', '| --- | --- |', ...rows, ''].join('\n');
}

/** 源码仓库里的对外文档检查；不存在时返回 null。 */
async function loadDocsCheck() {
  if (!existsSync(DOCS_CHECK)) return null;
  const { buildRules, scanText } = await import(pathToFileURL(DOCS_CHECK).href);
  const rules = buildRules();
  return text => scanText(text, rules).map(hit => `第 ${hit.line} 行 [${hit.rule}] ${hit.match}`);
}

function pick(...candidates) {
  return candidates.find(path => path && existsSync(path)) ?? null;
}

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

export async function main(args = process.argv.slice(2)) {
  const dts = pick(argValue(args, '--dts'), resolve(SITE, 'api-src/public.d.ts'), resolve(SITE, '../packages/editor/dist/esm/public.d.ts'));
  if (!dts) throw new Error('找不到 public.d.ts：用 --dts 指定，或放到 api-src/public.d.ts（在源码仓库里先运行 pnpm build:editor）');
  const releasePath = pick(argValue(args, '--release'), resolve(SITE, 'api-src/release-public.json'));
  const release = releasePath ? JSON.parse(readFileSync(releasePath, 'utf8')) : null;
  const parsed = parseDts(readFileSync(dts, 'utf8'), dts);
  const pages = renderPages(parsed, release);
  const missing = [...parsed.exported.keys()].filter(name => !pages.documented.has(name));
  if (missing.length) throw new Error(`API 参考漏了导出：${missing.join('、')}`);
  const check = await loadDocsCheck();
  for (const [name, text] of Object.entries({ 'index.md': pages.index, 'types.md': pages.types, '_release.md': pages.release })) {
    const hits = check ? check(text) : [];
    if (hits.length) throw new Error(`api/${name} 含不应公开的内容（${hits.slice(0, 5).join('；')}）：先修正 public.d.ts 的来源注释`);
  }
  const out = resolve(argValue(args, '--out') ?? resolve(SITE, 'api'));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'index.md'), pages.index);
  writeFileSync(resolve(out, 'types.md'), pages.types);
  writeFileSync(resolve(out, '_release.md'), pages.release);
  console.log(`API 参考已生成：${parsed.exported.size} 个导出，${parsed.declarations.size} 个声明（来源 ${relative(SITE, dts)}${release ? `，版本 ${release.version}` : '，无发行信息'}${check ? '，已过对外检查' : ''}）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
