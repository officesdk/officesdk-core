<script setup lang="ts">
// Office SDK 三部分架构图：宿主应用里的 editor（WebView）与 runtime 进程，kit 在 runtime 包内。
// 颜色只用 VitePress 主题变量（见下方 style），站点切换亮/暗时跟着变。
import { computed, useId } from 'vue';

const props = withDefaults(defineProps<{ lang?: 'zh' | 'en'; compact?: boolean }>(), { lang: 'zh', compact: false });

const TEXT = {
  zh: {
    title: 'Office SDK 架构：editor、runtime、kit',
    desc: '宿主应用里，WebView 中的 editor 产生编辑变化，由宿主转发给本地 runtime 进程；runtime 用 kit 文档引擎读写用户文件。AI 或业务代码通过 editor 的 JS API 修改文档。',
    host: '宿主应用（Host）',
    hostKinds: 'Electron · Wails · 原生应用 · 鸿蒙 ArkTS …',
    caller: 'AI / 业务代码',
    callJs: '调用 JS API',
    webview: 'WebView 页面',
    editorPkg: 'npm 包',
    jsApi: 'JS API',
    change: '变化 change',
    content: '内容 content',
    relay: 'Host 转发',
    bridge: '页面 ⇄ Host：宿主自己的桥（preload、IPC 或 JS 桥）',
    channel: 'Host ⇄ runtime：stdio 命令帧 + 字节侧流（鸿蒙：N-API）',
    runtime: '本地进程',
    runtimeJobs: '打开 · 合并编辑 · 保存 · 导出',
    kitTitle: 'kit 文档引擎',
    kitJobs: '格式转换 · 渲染',
    kitNote: '目前随 runtime 包提供',
    kitNoteShort: '目前随 runtime 包提供',
    files: '用户文件',
    workTitle: '工作根',
    workNote: 'runtime 私有记录',
    rw: '读写',
    compactRelay: '经 Host 转发',
  },
  en: {
    title: 'Office SDK architecture: editor, runtime and kit',
    desc: 'Inside the host app, the editor in a WebView produces edits that the host forwards to the local runtime process; the runtime reads and writes the user file with the kit document engine. AI or app code changes the document through the editor JS API.',
    host: 'Host app',
    hostKinds: 'Electron · Wails · native app · HarmonyOS ArkTS …',
    caller: 'AI / app code',
    callJs: 'calls the JS API',
    webview: 'WebView page',
    editorPkg: 'npm package',
    jsApi: 'JS API',
    change: 'change',
    content: 'content',
    relay: 'relayed by the host',
    bridge: 'page ⇄ host: your own bridge (preload, IPC or JS bridge)',
    channel: 'host ⇄ runtime: stdio frames + byte side stream (HarmonyOS: N-API)',
    runtime: 'local process',
    runtimeJobs: 'open · merge edits · save · export',
    kitTitle: 'kit document engine',
    kitJobs: 'conversion · rendering',
    kitNote: 'in the runtime package for now',
    kitNoteShort: 'in the runtime package',
    files: 'User files',
    workTitle: 'Work root',
    workNote: 'runtime-private records',
    rw: 'read / write',
    compactRelay: 'relayed by the host',
  },
} as const;

const t = computed(() => TEXT[props.lang]);
// useId() 在服务端渲染与客户端一致；SVG 里 id 只用字母、数字与连字符。
const uid = `osdk-arch-${useId().replace(/[^A-Za-z0-9_-]/g, '-')}`;
</script>

<template>
  <figure class="osdk-diagram">
    <svg v-if="!compact" viewBox="0 0 800 496" role="img" :aria-labelledby="`${uid}-t ${uid}-d`" xmlns="http://www.w3.org/2000/svg">
      <title :id="`${uid}-t`">{{ t.title }}</title>
      <desc :id="`${uid}-d`">{{ t.desc }}</desc>
      <defs>
        <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
        </marker>
      </defs>

      <!-- 宿主应用 -->
      <rect x="16" y="14" width="768" height="384" rx="14" class="frame" />
      <text x="36" y="42" class="label strong">{{ t.host }}</text>
      <text x="36" y="62" class="label small muted">{{ t.hostKinds }}</text>

      <!-- AI / 业务代码 -->
      <rect x="48" y="78" width="270" height="40" rx="20" class="pill" />
      <text x="183" y="104" class="label center">{{ t.caller }}</text>
      <line x1="183" y1="118" x2="183" y2="146" class="flow" :marker-end="`url(#${uid}-arrow)`" />
      <text x="192" y="138" class="label small muted">{{ t.callJs }}</text>

      <!-- WebView：editor -->
      <rect x="40" y="150" width="286" height="196" rx="12" class="box" />
      <text x="58" y="174" class="label small muted">{{ t.webview }}</text>
      <text x="58" y="203" class="label title brand">editor</text>
      <text x="58" y="223" class="label tiny mono muted">@officesdk/officesdk-core-editor</text>
      <rect x="58" y="236" width="118" height="28" rx="6" class="chip" /><text x="117" y="255" class="label small center">Writer</text>
      <rect x="190" y="236" width="118" height="28" rx="6" class="chip" /><text x="249" y="255" class="label small center">Presentation</text>
      <rect x="58" y="272" width="118" height="28" rx="6" class="chip" /><text x="117" y="291" class="label small center">Sheet</text>
      <rect x="190" y="272" width="118" height="28" rx="6" class="chip" /><text x="249" y="291" class="label small center">PDF</text>
      <rect x="58" y="308" width="250" height="26" rx="6" class="chip accent" /><text x="183" y="326" class="label small center brand">{{ t.jsApi }}</text>

      <!-- Host 转发 -->
      <line x1="330" y1="214" x2="470" y2="214" class="flow" :marker-end="`url(#${uid}-arrow)`" />
      <text x="400" y="205" class="label small center">{{ t.change }}</text>
      <text x="400" y="242" class="label small center muted">{{ t.relay }}</text>
      <line x1="470" y1="270" x2="330" y2="270" class="flow" :marker-end="`url(#${uid}-arrow)`" />
      <text x="400" y="261" class="label small center">{{ t.content }}</text>

      <!-- 通道说明 -->
      <text x="36" y="370" class="label tiny muted">{{ t.bridge }}</text>
      <text x="36" y="388" class="label tiny muted">{{ t.channel }}</text>

      <!-- runtime 与 kit -->
      <rect x="474" y="78" width="290" height="268" rx="12" class="box" />
      <text x="492" y="107" class="label title brand">runtime</text>
      <text x="596" y="106" class="label small muted">{{ t.runtime }}</text>
      <text x="492" y="129" class="label tiny mono muted">offline-kit-runtime</text>
      <text x="492" y="156" class="label small">{{ t.runtimeJobs }}</text>
      <rect x="492" y="190" width="254" height="132" rx="10" class="kit" />
      <text x="510" y="219" class="label strong">{{ t.kitTitle }}</text>
      <text x="510" y="244" class="label small">{{ t.kitJobs }}</text>
      <text x="510" y="306" class="label tiny muted">{{ t.kitNote }}</text>

      <!-- 文件与工作根 -->
      <line x1="540" y1="346" x2="540" y2="418" class="flow" :marker-start="`url(#${uid}-arrow)`" :marker-end="`url(#${uid}-arrow)`" />
      <text x="548" y="410" class="label tiny muted">{{ t.rw }}</text>
      <line x1="700" y1="346" x2="700" y2="418" class="flow faint" :marker-end="`url(#${uid}-arrow)`" />
      <rect x="400" y="420" width="200" height="64" rx="10" class="box" />
      <text x="416" y="446" class="label strong">{{ t.files }}</text>
      <text x="416" y="468" class="label tiny mono muted">.docx .xlsx .pptx .pdf</text>
      <rect x="616" y="420" width="168" height="64" rx="10" class="box dashed" />
      <text x="632" y="446" class="label strong">{{ t.workTitle }}</text>
      <text x="632" y="468" class="label tiny muted">{{ t.workNote }}</text>
    </svg>

    <svg v-else viewBox="0 0 800 200" role="img" :aria-labelledby="`${uid}-t ${uid}-d`" xmlns="http://www.w3.org/2000/svg">
      <title :id="`${uid}-t`">{{ t.title }}</title>
      <desc :id="`${uid}-d`">{{ t.desc }}</desc>
      <defs>
        <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
        </marker>
      </defs>
      <rect x="10" y="10" width="560" height="180" rx="14" class="frame" />
      <text x="28" y="36" class="label small muted">{{ t.host }}</text>

      <rect x="28" y="52" width="210" height="120" rx="12" class="box" />
      <text x="46" y="84" class="label title brand">editor</text>
      <text x="46" y="108" class="label small muted">{{ t.webview }}</text>
      <text x="46" y="132" class="label small">Writer · Presentation</text>
      <text x="46" y="152" class="label small">Sheet · PDF · {{ t.jsApi }}</text>

      <line x1="242" y1="112" x2="326" y2="112" class="flow" :marker-end="`url(#${uid}-arrow)`" />
      <text x="284" y="102" class="label tiny center muted">{{ t.compactRelay }}</text>

      <rect x="330" y="52" width="224" height="120" rx="12" class="box" />
      <text x="348" y="84" class="label title brand">runtime</text>
      <rect x="348" y="100" width="190" height="56" rx="8" class="kit" />
      <text x="362" y="124" class="label strong">kit</text>
      <text x="362" y="144" class="label tiny muted">{{ t.kitNoteShort }}</text>

      <line x1="570" y1="112" x2="626" y2="112" class="flow both" :marker-start="`url(#${uid}-arrow)`" :marker-end="`url(#${uid}-arrow)`" />
      <rect x="630" y="64" width="160" height="96" rx="12" class="box" />
      <text x="648" y="98" class="label strong">{{ t.files }}</text>
      <text x="648" y="122" class="label tiny mono muted">.docx .xlsx</text>
      <text x="648" y="140" class="label tiny mono muted">.pptx .pdf</text>
    </svg>
  </figure>
</template>

<style scoped>
.osdk-diagram {
  margin: 20px 0;
}
.osdk-diagram svg {
  display: block;
  width: 100%;
  max-width: 800px;
  height: auto;
  margin: 0 auto;
}
.frame {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
}
.box {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-border);
  stroke-width: 1.5;
}
.box.dashed {
  stroke-dasharray: 6 4;
}
.pill,
.chip {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}
.chip.accent,
.kit {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.2;
}
.kit {
  stroke-dasharray: 6 4;
}
.flow {
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  fill: none;
}
.flow.faint {
  stroke: var(--vp-c-divider);
  stroke-dasharray: 3 3;
}
.arrow-head {
  fill: var(--vp-c-brand-1);
}
.label {
  fill: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  font-size: 15px;
}
.label.center {
  text-anchor: middle;
}
.label.strong {
  font-weight: 600;
}
.label.title {
  font-size: 22px;
  font-weight: 700;
}
.label.small {
  font-size: 14px;
}
.label.tiny {
  font-size: 13px;
}
.label.muted {
  fill: var(--vp-c-text-2);
}
.label.brand {
  fill: var(--vp-c-brand-1);
}
.label.mono {
  font-family: var(--vp-font-family-mono);
}
</style>
