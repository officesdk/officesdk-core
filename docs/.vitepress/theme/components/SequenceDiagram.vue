<script setup lang="ts">
// Office SDK 时序图：flow="save"（打开 → 编辑 → 保存）与 flow="ai"（AI 经 editor 的 JS API 修改）。
// 参与者与步骤写在下面的 FLOWS 里，按 lang 取中文或英文；颜色只用 VitePress 主题变量。
import { computed, useId } from 'vue';

type Lang = 'zh' | 'en';
interface Participant { id: string; name: string; sub?: string }
interface Step { from: string; to: string; label: string; optional?: boolean }
interface Flow { title: string; desc: string; participants: Participant[]; steps: Step[]; note?: string }

const props = withDefaults(defineProps<{ flow: 'save' | 'ai'; lang?: Lang }>(), { lang: 'zh' });

const FLOWS: Record<'save' | 'ai', Record<Lang, Flow>> = {
  save: {
    zh: {
      title: '打开、编辑、保存的时序',
      desc: '宿主让 runtime 打开文件并取得内容，用内容创建 editor；用户的编辑经 change 事件交给宿主，宿主按顺序转给 runtime；保存时宿主先让 editor 收尾并排空变化，再让 runtime 写回文件。',
      participants: [
        { id: 'user', name: '用户' },
        { id: 'editor', name: 'editor', sub: 'WebView 页面' },
        { id: 'host', name: 'Host', sub: '宿主应用' },
        { id: 'runtime', name: 'runtime', sub: '含 kit' },
        { id: 'file', name: '文件', sub: '.docx .xlsx …' },
      ],
      steps: [
        { from: 'host', to: 'runtime', label: 'open { path }' },
        { from: 'runtime', to: 'file', label: '读取，kit 转换' },
        { from: 'runtime', to: 'host', label: 'documentId · suite · content' },
        { from: 'host', to: 'editor', label: 'createOfflineEditor · start()' },
        { from: 'user', to: 'editor', label: '编辑' },
        { from: 'editor', to: 'host', label: 'change 事件' },
        { from: 'host', to: 'runtime', label: 'change { documentId, body }' },
        { from: 'user', to: 'editor', label: '保存' },
        { from: 'editor', to: 'host', label: 'saveIntent' },
        { from: 'host', to: 'editor', label: 'prepare()，等变化排空' },
        { from: 'host', to: 'runtime', label: 'save { documentId }' },
        { from: 'runtime', to: 'file', label: 'kit 转换，写回' },
      ],
    },
    en: {
      title: 'Open, edit and save sequence',
      desc: 'The host asks the runtime to open the file and creates the editor with the returned content; edits reach the host as change events and the host forwards them to the runtime in order; on save the host lets the editor finish pending input, drains the changes and asks the runtime to write the file.',
      participants: [
        { id: 'user', name: 'User' },
        { id: 'editor', name: 'editor', sub: 'WebView page' },
        { id: 'host', name: 'Host', sub: 'host app' },
        { id: 'runtime', name: 'runtime', sub: 'with kit' },
        { id: 'file', name: 'File', sub: '.docx .xlsx …' },
      ],
      steps: [
        { from: 'host', to: 'runtime', label: 'open { path }' },
        { from: 'runtime', to: 'file', label: 'read, convert with kit' },
        { from: 'runtime', to: 'host', label: 'documentId · suite · content' },
        { from: 'host', to: 'editor', label: 'createOfflineEditor · start()' },
        { from: 'user', to: 'editor', label: 'edits' },
        { from: 'editor', to: 'host', label: 'change event' },
        { from: 'host', to: 'runtime', label: 'change { documentId, body }' },
        { from: 'user', to: 'editor', label: 'Save' },
        { from: 'editor', to: 'host', label: 'saveIntent' },
        { from: 'host', to: 'editor', label: 'prepare(), drain changes' },
        { from: 'host', to: 'runtime', label: 'save { documentId }' },
        { from: 'runtime', to: 'file', label: 'convert with kit, write back' },
      ],
    },
  },
  ai: {
    zh: {
      title: 'AI 经 editor 的 JS API 修改文档的时序',
      desc: 'AI 或业务代码把修改要求交给宿主，宿主调用 editor 的 JS API；修改在编辑器里立即生效，并像手工编辑一样经 change 事件由宿主转给 runtime；需要回滚时沿编辑历史撤销，撤销同样产生 change；最后由 runtime 保存。',
      participants: [
        { id: 'ai', name: 'AI / 业务代码' },
        { id: 'host', name: 'Host', sub: '宿主应用' },
        { id: 'editor', name: 'editor', sub: 'JS API' },
        { id: 'runtime', name: 'runtime', sub: '含 kit' },
      ],
      steps: [
        { from: 'ai', to: 'host', label: '修改要求' },
        { from: 'host', to: 'editor', label: 'PowerPoint.run / setValue / Word.run' },
        { from: 'editor', to: 'editor', label: '编辑器内生效，用户实时看到' },
        { from: 'editor', to: 'host', label: 'change 事件' },
        { from: 'host', to: 'runtime', label: 'change { documentId, body }' },
        { from: 'host', to: 'ai', label: '结果（可再读回核对）' },
        { from: 'ai', to: 'host', label: '需要时回滚', optional: true },
        { from: 'host', to: 'editor', label: 'editorInternals().undo()', optional: true },
        { from: 'editor', to: 'host', label: '撤销产生的 change 事件', optional: true },
        { from: 'host', to: 'runtime', label: 'save { documentId }' },
      ],
      note: '虚线为可选步骤；编辑历史目前只在 Presentation 开放。',
    },
    en: {
      title: 'AI editing through the editor JS API',
      desc: 'AI or app code hands a change request to the host, which calls the editor JS API; the change takes effect in the editor at once and, like a manual edit, reaches the runtime through change events relayed by the host; to roll back, undo through the editor history, which produces change events too; finally the runtime saves.',
      participants: [
        { id: 'ai', name: 'AI / app code' },
        { id: 'host', name: 'Host', sub: 'host app' },
        { id: 'editor', name: 'editor', sub: 'JS API' },
        { id: 'runtime', name: 'runtime', sub: 'with kit' },
      ],
      steps: [
        { from: 'ai', to: 'host', label: 'change request' },
        { from: 'host', to: 'editor', label: 'PowerPoint.run / setValue / Word.run' },
        { from: 'editor', to: 'editor', label: 'applied in the editor, visible at once' },
        { from: 'editor', to: 'host', label: 'change event' },
        { from: 'host', to: 'runtime', label: 'change { documentId, body }' },
        { from: 'host', to: 'ai', label: 'result (read back to verify)' },
        { from: 'ai', to: 'host', label: 'roll back if needed', optional: true },
        { from: 'host', to: 'editor', label: 'editorInternals().undo()', optional: true },
        { from: 'editor', to: 'host', label: 'change events for the undo', optional: true },
        { from: 'host', to: 'runtime', label: 'save { documentId }' },
      ],
      note: 'Dashed steps are optional; the editing history is open for Presentation only.',
    },
  },
};

const WIDTH = 800;
const MARGIN = 16;
const HEAD_Y = 12;
const HEAD_H = 48;
const FIRST_Y = HEAD_Y + HEAD_H + 34;
const STEP_H = 40;

const data = computed(() => FLOWS[props.flow][props.lang]);
const column = computed(() => (WIDTH - MARGIN * 2) / data.value.participants.length);
const xOf = (id: string) => {
  const index = data.value.participants.findIndex(p => p.id === id);
  return MARGIN + column.value * (index + 0.5);
};
const lifeEnd = computed(() => FIRST_Y + (data.value.steps.length - 1) * STEP_H + 22);
const height = computed(() => lifeEnd.value + (data.value.note ? 34 : 14));
const rows = computed(() => data.value.steps.map((step, index) => {
  const y = FIRST_Y + index * STEP_H;
  const x1 = xOf(step.from);
  const x2 = xOf(step.to);
  const self = step.from === step.to;
  // 箭头停在生命线前 4 个单位，避免压住对面的线。
  const end = x2 > x1 ? x2 - 4 : x2 + 4;
  return { ...step, n: index + 1, y, x1, x2: end, self, mid: (x1 + x2) / 2 };
}));
// 自身步骤的说明框按文字估算宽度，以生命线为中心放置，并收在画布内。
const NOTE_FONT = 14;
const textWidth = (text: string) => [...text].reduce((sum, char) => sum + (char.codePointAt(0)! > 0x2e80 ? 1 : 0.58), 0) * NOTE_FONT;
const noteBox = (x: number, label: string) => {
  const width = Math.min(textWidth(label) + 24, WIDTH - MARGIN * 2);
  const left = Math.max(MARGIN, Math.min(x - width / 2, WIDTH - MARGIN - width));
  return { left, width, center: left + width / 2 };
};
const uid = `osdk-seq-${useId().replace(/[^A-Za-z0-9_-]/g, '-')}`;
</script>

<template>
  <figure class="osdk-diagram">
    <svg :viewBox="`0 0 ${WIDTH} ${height}`" role="img" :aria-labelledby="`${uid}-t ${uid}-d`" xmlns="http://www.w3.org/2000/svg">
      <title :id="`${uid}-t`">{{ data.title }}</title>
      <desc :id="`${uid}-d`">{{ data.desc }}</desc>
      <defs>
        <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" class="arrow-head" />
        </marker>
      </defs>

      <g v-for="p in data.participants" :key="p.id">
        <line :x1="xOf(p.id)" :y1="HEAD_Y + HEAD_H" :x2="xOf(p.id)" :y2="lifeEnd" class="lifeline" />
        <rect :x="xOf(p.id) - Math.min(column - 14, 140) / 2" :y="HEAD_Y" :width="Math.min(column - 14, 140)" :height="HEAD_H" rx="10" class="head" />
        <text :x="xOf(p.id)" :y="p.sub ? HEAD_Y + 20 : HEAD_Y + 28" class="label strong center">{{ p.name }}</text>
        <text v-if="p.sub" :x="xOf(p.id)" :y="HEAD_Y + 37" class="label tiny center muted">{{ p.sub }}</text>
      </g>

      <g v-for="row in rows" :key="row.n">
        <template v-if="row.self">
          <rect :x="noteBox(row.x1, `${row.n}. ${row.label}`).left" :y="row.y - 16" :width="noteBox(row.x1, `${row.n}. ${row.label}`).width" height="26" rx="6" class="note" />
          <text :x="noteBox(row.x1, `${row.n}. ${row.label}`).center" :y="row.y + 2" class="label small center">{{ row.n }}. {{ row.label }}</text>
        </template>
        <template v-else>
          <line :x1="row.x1" :y1="row.y" :x2="row.x2" :y2="row.y" :class="['flow', { optional: row.optional }]" :marker-end="`url(#${uid}-arrow)`" />
          <text :x="row.mid" :y="row.y - 7" class="label small center halo">{{ row.n }}. {{ row.label }}</text>
        </template>
      </g>

      <text v-if="data.note" :x="MARGIN" :y="height - 12" class="label tiny muted">{{ data.note }}</text>
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
.head {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-border);
  stroke-width: 1.5;
}
.lifeline {
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}
.note {
  fill: var(--vp-c-brand-soft);
  stroke: var(--vp-c-brand-1);
  stroke-width: 1;
}
.flow {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.8;
  fill: none;
}
.flow.optional {
  stroke-dasharray: 6 4;
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
.label.small {
  font-size: 14px;
}
.label.tiny {
  font-size: 13px;
}
.label.muted {
  fill: var(--vp-c-text-2);
}
/* 箭头上方的文字压在生命线上时，用背景色描边隔开。 */
.label.halo {
  paint-order: stroke fill;
  stroke: var(--vp-c-bg);
  stroke-width: 4px;
  stroke-linejoin: round;
}
</style>
