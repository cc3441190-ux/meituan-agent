# 本地场景短时活动规划与执行 Agent

接受**一句自然语言目标**，自动规划一条「下午 4–6 小时」的综合出行方案（去哪玩 → 去哪吃 → 额外活动），核对餐厅是否有位/排队，并在用户确认后**一键完成订位/预约/送蛋糕鲜花/叫车**等关键动作，最后生成可直接转发的分享话术。

> 这不是「搜索推荐」，而是「帮你把事情做完」。全程基于 Mock API，可离线运行。

## 技术栈

- React 19 + TypeScript + Vite（WebUI Demo）
- 规划/工具/执行全部为本地 Mock 实现，零外部依赖、可断网运行
- 工具层通过 `core/ports` 接口抽象，预留真实 API（美团开放平台 / LLM）替换点

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址（默认 http://localhost:5173 ），在输入框输入一句目标即可。

其他脚本：

```bash
npm run build     # 类型检查 + 生产构建
npm run preview   # 预览构建产物
npm run lint      # ESLint 检查
```

## 切换到 Live API（真调用）

1. 复制 `.env.example` 为 `.env` 并填写：
```bash
VITE_PLANNER_MODE=live
VITE_API_BASE_URL=https://your-backend-api
VITE_LLM_API_KEY=sk-...
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_MODEL=gpt-4o-mini
```
2. 后端按 [`LIVE_API_CONTRACT.md`](./LIVE_API_CONTRACT.md) 提供接口。
3. 重启 `npm run dev`，右上角模式应显示 `Live API`。

### Live 语音输入说明

- `live` 模式下麦克风使用浏览器原生 `Web Speech API`（`SpeechRecognition / webkitSpeechRecognition`）。
- 首次点击麦克风会请求麦克风权限，请允许。
- 建议使用 Chrome/Edge 最新版；若浏览器不支持会自动不可用（仍可文本输入）。

## 示范 Prompt（一句话目标）

- 家庭场景：`今天下午有空，想带老婆孩子出去玩 4 小时，孩子 5 岁，老婆在减肥，别离家太远`
- 朋友场景：`下午约了朋友，4 个人 2 男 2 女，想找地方玩玩再吃顿好的`
- 庆祝场景：`下午带家人出去玩，今天是孩子生日，开车去`（会自动加蛋糕/鲜花/停车券）

## 体验路径

1. 输入一句话 → Agent 解析意图、生成方案骨架并填充 POI（含库存/通勤校验）。
2. 在方案卡片上「换一个 / 替代 / 调时间 / 确认」逐站微调与锁定。
3. 处理库存异常（满座给同价位备选，可用备选 / 等位改时）。
4. 确认后授权交付清单 → 自动执行订位/蛋糕/鲜花/用车等（支持降级、重试、5 分钟内撤销）。
5. 全部完成 → 自动生成分享卡片，一键复制发给家人/朋友。

## 目录结构（核心）

```
src/
├─ agent/                     # Agent 核心（与 UI 解耦）
│  ├─ LocalPlannerAgent.ts    # 意图解析 / 骨架规划 / 冲突检测 / 局部重规划
│  ├─ mockApi.ts              # 全部 Mock 工具：searchPOI/checkInventory/getRoute/book*
│  ├─ inferAddOns.ts          # 从方案+约束推断交付清单（蛋糕/鲜花/用车…）
│  ├─ taskRunner.ts           # 交付执行引擎（拓扑分层并发 + 降级/重试/撤销）
│  └─ deliverables.ts         # 交付项类型与状态机
├─ core/
│  ├─ ports/                  # 工具接口抽象（Planning/POI/Booking/Share）
│  └─ adapters/mock/          # Mock 适配器（可替换为 Http 实现）
├─ hooks/useAgentPlanner.ts   # 串联规划→确认→交付→分享的状态编排
└─ components/v4/             # WebUI（PlannerAppV4 为入口）
```

## 交付物对照

- [x] 完整 Tool 实现代码（含 Mock API）：`src/agent/mockApi.ts` + `core/ports` 抽象
- [x] 可运行 Demo（WebUI）：`npm run dev`
- [x] 设计文档（≤2 页）：见 [`设计文档.md`](./设计文档.md)
