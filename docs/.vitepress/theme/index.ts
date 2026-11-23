// 文档站主题：沿用 VitePress 默认主题，全局注册概览页与指南里用到的两个图组件。
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import ArchitectureDiagram from './components/ArchitectureDiagram.vue';
import SequenceDiagram from './components/SequenceDiagram.vue';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ArchitectureDiagram', ArchitectureDiagram);
    app.component('SequenceDiagram', SequenceDiagram);
  },
};

export default theme;
