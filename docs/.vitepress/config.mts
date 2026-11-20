import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

// 文档站是门面仓库 officesdk/officesdk-core 的项目页 https://officesdk.github.io/officesdk-core/（源在该仓库的 docs/）：
// base 必须与仓库名一致。仓库改名时同步改这里的默认值，配自定义域名时把 DOCS_BASE 设成 "/"（可在 deploy.yml 的 build 步骤加 env）。
const base = process.env.DOCS_BASE || '/officesdk-core/';
const releaseFile = fileURLToPath(new URL('../api-src/release-public.json', import.meta.url));
const version: string | undefined = existsSync(releaseFile)
  ? JSON.parse(readFileSync(releaseFile, 'utf8')).version
  : undefined;

const zhSidebar = [
  {
    text: '开始',
    items: [
      { text: '快速开始', link: '/guide/quick-start' },
      { text: '安装与启动 Kit', link: '/guide/install-kit' },
      { text: '打开、编辑、保存', link: '/guide/open-edit-save' },
    ],
  },
  {
    text: '编辑器配置',
    items: [
      { text: '公共配置项', link: '/editors/' },
      { text: 'Writer（文档）', link: '/editors/writer' },
      { text: 'Presentation（演示）', link: '/editors/presentation' },
      { text: 'Sheet（表格）', link: '/editors/sheet' },
      { text: 'PDF', link: '/editors/pdf' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: 'API 参考', link: '/api/' },
      { text: '类型', link: '/api/types' },
      { text: '版本与兼容性', link: '/reference/versioning' },
      { text: '许可', link: '/license' },
    ],
  },
];

export default defineConfig({
  base,
  title: 'Office SDK',
  cleanUrls: true,
  lastUpdated: false,
  srcExclude: ['**/_*.md', 'README.md'],
  head: [['meta', { name: 'theme-color', content: '#3c6df0' }]],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      description: 'Office SDK 离线编辑套件文档：页面整合包与 Kit',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/quick-start' },
          { text: '编辑器配置', link: '/editors/' },
          { text: 'API', link: '/api/' },
          { text: '版本', link: '/reference/versioning' },
          ...(version ? [{ text: `v${version}`, link: '/reference/versioning' }] : []),
        ],
        sidebar: zhSidebar,
        outline: { level: [2, 3], label: '本页内容' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        langMenuLabel: '切换语言',
        notFound: { title: '页面不存在', quote: '这个地址没有对应的页面，可能已移动或输入有误。', linkText: '回到首页' },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'Office SDK offline editing kit documentation',
      themeConfig: {
        nav: [
          { text: 'Guide (中文)', link: '/guide/quick-start' },
          { text: 'API', link: '/api/' },
        ],
        sidebar: [],
      },
    },
  },
  themeConfig: {
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/officesdk/officesdk-core' }],
    footer: {
      message: 'Office SDK Core 为闭源商用软件，使用须遵守 <a href="https://officesdk.com/legal/eula">Office SDK EULA</a>。',
      copyright: 'Copyright © 2026 OfficeSDK.com',
    },
  },
});
