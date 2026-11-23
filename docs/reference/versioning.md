# 版本与兼容性

## 一个版本号

每次发行有一个版本号 `X.Y.Z`（遵循 SemVer），同时属于：

- npm 包 `@officesdk/officesdk-core-editor`；
- 各平台的 runtime 压缩包 `officesdk-core-runtime-<版本>-<target>.tar.gz`（0.2.5-rc.7 及以前名为 `offline-kit-<版本>-<target>.tar.gz`）；
- runtime 包内的 `guide/` 说明；
- 文档引擎 kit（目前随 runtime 包提供）。

页面整合包与 runtime 必须使用**相同版本**。预发布版本形如 `X.Y.Z-rc.N`，在 npm 的 `next` 标签下，GitHub Release 标为 Pre-release；稳定版在 `latest` 标签下。

## 升级规则

| 版本位 | 何时升级 |
| --- | --- |
| MAJOR | 协议版本变化、工作根关联表版本升级、页面整合包公开 API 不兼容、编辑器内容模型更换 |
| MINOR | 新编辑器或新能力、协议内追加可选字段或错误码、编辑器的 minor 升级 |
| PATCH | 修复、编辑器的 patch 升级 |

`0.x` 期间，不兼容变化可能只升 MINOR，变更记录中会写明升级须知。

## 当前版本

<!--@include: ../api/_release.md-->

- **协议版本**：Host 与 runtime 之间命令帧的版本，即 ready 帧中的 `protocolVersion`。协议不同的 Host 与 runtime 不能混用。
- **工作根关联表版本**：runtime 在工作根中记录打开文档所用的格式版本；「可读」列出它还能打开的旧格式。
- **降级下限**：用这个版本写过的工作根，最低还能交给哪个版本的 runtime 打开。

## 运行时核对版本

页面整合包内置发行信息：

```ts
import { getReleaseInfo } from "@officesdk/officesdk-core-editor";

const release = getReleaseInfo();   // 深度冻结的对象
release.version;                     // "0.2.5"
release.compat.protocolVersion;      // "5"
```

同样的内容在包内 `dist/release.json`（包导出路径 `@officesdk/officesdk-core-editor/release.json`），也可用 `npx offline-kit info` 查看。

runtime 的 ready 帧带可选的 `kitVersion`（字段名里的 kit 即 runtime）。建议 Host 收到 ready 后对照：

- `kitVersion` 缺失（旧版 runtime）：跳过核对；
- 开发构建中两边不一致：直接报错；
- 生产构建中两边不一致：记录警告。

runtime 可执行文件也能直接查询版本：`offline-kit-runtime --version`，或加 `--json` 得到完整发行信息。

## 升级与回退

- 升级时同时更换 npm 包与 runtime，两者版本一致。
- 已有工作根可以交给新版 runtime 打开；要回退到旧版 runtime 时，目标版本不能低于降级下限。
- 如果曾修改转换配置，升级后首次启动前把自定义内容放在工作根的 `production.json` 中，runtime 不会从旧安装位置搬运配置。

各版本的变化见 [officesdk-core 的 Release 说明](https://github.com/officesdk/officesdk-core/releases)，版本与 runtime、npm 包的对照见[仓库首页的版本表](https://github.com/officesdk/officesdk-core#版本)。
