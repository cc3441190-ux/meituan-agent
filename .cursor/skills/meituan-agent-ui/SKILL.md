---
name: meituan-agent-ui
description: "优化本仓库 V4 出行 Agent 界面时使用。用户说「优化 UI」「改界面」「统一视觉」「设计规范」「/meituan-agent-ui」或调整 v4 样式/组件时触发。先读本 skill，大改版可配合 /hue。"
---

# 美团本地出行 Agent · UI 规范

本 skill 约束 **本仓库** 的 Web Demo 视觉与交互，避免与 Job Copilot 等其它设计系统混用。

## 何时用哪个 skill

| 场景 | 使用 |
|------|------|
| 改按钮间距、卡片层次、颜色对比、移动端可读性 | **本 skill**（`meituan-agent-ui`） |
| 从 0 生成全新设计系统、从 URL/截图提取品牌语言 | **`hue`**（`~/.cursor/skills/hue` 或项目内 `.cursor/skills/hue`） |
| 求职插件侧栏风格 | **不要用** `job-copilot-design` |

## 设计基调

- **产品气质**：温暖、可信赖的本地生活助理（协商行程，不是冷冰冰的列表）
- **画布**：手机框 `393×852`，`v4-phone` 内滚动；勿改成桌面宽屏布局
- **主色**：鼠尾草绿 `--v4-sage` / `--v4-sage-dim` 表示确认与正向；琥珀 `--v4-amber` 用于分享/邀请；蓝 `--v4-blue` 仅信息提示
- **排版**：系统字体栈；标题 16–18px 加粗，辅助 10–12px `--v4-sub`
- **圆角**：卡片 `--v4-radius`（16px），药丸按钮 999px
- **深度**：优先 1px `--v4-border` + 浅底，避免重阴影（与 v4 现有卡片一致）

## 文件地图（改 UI 先读这些）

| 区域 | 文件 |
|------|------|
| 全局 token + 组件样式 | `src/styles/v4.css` |
| 意图输入 / AI 理解预览 | `src/components/v4/IntentInputScreen.tsx` |
| 方案卡片 | `src/components/v4/ProposalCard.tsx` |
| 主流程 | `src/components/v4/PlannerAppV4.tsx` |
| 分享卡片 | `src/components/ShareTripCardVisual.tsx`, `ShareInviteSheet.tsx` |
| 旧版共用 | `src/styles/planner.css` |

## 必守规则

1. **只改与需求相关的 UI**，不顺手重构业务逻辑
2. **复用现有 class 前缀** `v4-*`，新样式写在 `v4.css` 末尾并成组注释
3. **中文文案**：按钮/提示用口语化中文，勿暴露「Mock」「LLM」等实现词给用户
4. **关键信息可见**：路程分钟、等位分钟、时段范围须在方案卡或时间轴上可见，勿藏进仅开发者可见的日志
5. **勿向用户展示** Agent 内部日志面板或调试 JSON
6. **触摸目标**：主按钮最小高度约 44px，底部安全区 `env(safe-area-inset-bottom)`

## 组件检查清单（优化时逐项扫）

- [ ] 意图屏：预算区 + 理解预览字段对齐，无 NaN/英文枚举
- [ ] 方案卡：阶段时间、路程/等位 badge、确认/调时间操作不挤版
- [ ] 地图与卡片：焦点态 `v4-proposal-card--focus` 清晰
- [ ] Sheet：分享/调节时间/交付追踪 z-index 高于地图，有 handle 与关闭
- [ ] 反馈：用顶部 `PlanDiffBanner` 类 toast，不用 `alert()`

## 与 hue 协作

若用户要求「整体换一套视觉」或「像某某 App」：

1. 先说明将用 **hue** 生成设计语言 skill
2. 用 hue 产出 token/组件约定后，**映射回** `v4.css` 的 `--v4-*` 变量，而不是引入第二套 CSS 框架
3. 保留现有信息架构：意图 → 地图+卡片 → 确认 → 代办 → 分享

触发 hue：用户输入 `/hue` 或「用 hue 从当前界面提炼设计规范」。
