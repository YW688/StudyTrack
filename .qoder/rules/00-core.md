# 学径 StudyTrack · 核心约束（推荐类型：Always Apply）

> 本文件是 Qoder 项目规则的**主干**，每次对话自动生效。只放"不能违反"的约束，不放产品细节（细节见 `docs/spec-v0.1.md`、`10-plan.md` 与 `docs/plan.md`）。
> 若与 `AGENTS.md` 冲突，以本目录规则为准。

## 项目一句话

你在大学做的每件事，都该留下证据。—— 每天 30 秒，把大学四年变成一份可验证的履历。

四个**并列**工作面（共享同一份学生档案，不是线性向导）：`今日 / 账本 / 悬赏 / 工具箱`；`记录官` 是贯穿全局的助手。原六个功能页保留并归入四个面：课表、作业、简历在工具箱，经历在账本，机会在悬赏。详见 `docs/spec-v0.1.md`。

## 一、不可违反的技术约束

1. **纯静态**：React + Vite + TypeScript + Tailwind，`vite build` 出 `dist/` 直接可发布。禁止 SSR、Node 常驻服务、Server Actions、API Route、middleware。
2. **部署到 Qoder Sites**：每次交付都要 Publish 拿公网链接；**发布 ≠ 预览**，改完必须重新发布，权限设为「任何人都可访问」。
3. **无账号、无登录、无支付、无服务端数据库**：数据只存 `IndexedDB`（`idb-keyval`），刷新/重开不丢。
4. **零爬虫（含构建期来源核验例外）**：禁止请求学习通、BOSS 直聘、招聘网站、校招官网的后台接口；禁止模拟登录、保存 Cookie。机会数据只来自：人工整理岗位库 JSON、渠道入口库、用户粘贴的 JD。
   - **唯一例外**：`scripts/verify-sources.mjs` 可在构建期对白名单官方公开页面做限速来源核验。必须遵守 robots.txt；robots 未明确允许的只用 HEAD/Range 做可达性检查，不抓正文；robots 禁止或取不到的直接跳过。只保留 HTTP 状态、最终 URL、页面标题、与条目日期相关的短片段和内容哈希，写入 `data/source-checks.json`；运行时仍不联网。招聘平台、学习通、BOSS 直聘和校招官网后台接口仍不抓取。
5. **模型 Key 不进前端**：调用统一走薄代理（`/api/proxy`，线上阿里云 FC），Key 只在代理环境变量。
6. **PDF 用浏览器打印**：`@page A4` + `window.print()`，禁止服务端无头浏览器。
7. **检索在本地**：岗位检索用 `minisearch`（BM25）前端跑，不引入向量库、不调 embedding 接口。
8. **依赖白名单**：`react react-dom vite typescript tailwindcss pdfjs-dist xlsx idb-keyval zod dayjs minisearch`（MCP 只用 `@modelcontextprotocol/sdk`）。新增其他依赖必须先说明理由。
9. **不使用任何既有项目的代码/文档/图片/字体/视觉资产**。本项目从零开始。

## 二、目录结构（照此实现，不自创）

```
src/pages/        today · experiences(账本) · opportunities(悬赏) · toolbox · calendar · timetable · assignments · resume · portfolio · about
src/components/   TimetableGrid ParseConfirm AssignmentItem ExperienceCard Timeline ResumeSheet MatchMatrix PrintSheet TodayBrief CaptureBox LedgerHeatmap AgentPanel CalendarView
src/parse/        xlsx.ts · heuristics.ts · schedule.ts（周次展开 / 冲突检测）
src/ai/           rules.ts · client.ts · schema.ts · tasks/{timetable,assignment,experience,resume,match,agent}.ts
src/search/       bm25.ts · index.ts
src/store/        idb.ts · profile.ts · ledger.ts · notes.ts · agent.ts · fixtures/
src/styles/       print.css
mcp/server.ts     stdio MCP Server
data/             jobs.json · channels.json · calendar.json
api/proxy/        薄代理
```

**分层铁律**：`pages` 不直接调模型；`ai` 不碰 DOM；`parse` 与 `search` 是纯函数、可单测；`store` 是唯一读写 IndexedDB 的地方。

## 三、数据铁律（六条）

1. `weeks` 必须是**具体周次数组**（如 `[1,3,5,7,9,11,13,15]`）；"单周/双周/1-16周"等字符串在入库前必须展开。渲染只查 `weeks.includes(week)`。
2. `metrics` 没有真实数字就是 `[]`，UI 明确显示「原文未提供量化数据」。
3. 任何 AI 产出必须带 `confidence`（high/low）与 `source`；`low` 必须标黄、用户确认后才能进简历。
4. `Match.hits` 每条必须带 `experienceId` + 原文引用；拿不出来源就不许输出。
5. 任何解析/请求失败都要落到「手动填 / 示例数据 / 上一步结果」，禁止空白页、禁止无限 loading。
6. 留痕/绿格只统计产生结果的动作（完成作业、新增经历、补证据、写 Note、生成简历）；删除、纯打开、纯打卡不计；撤销完成时回滚对应事件。

## 四、AI 调用规范

- 统一入口 `ai/client.ts`：OpenAI 兼容 → 代理 → 百炼（文本 `qwen-plus`，图片 `qwen-vl-max`）。
- 45s 超时；网络/5xx 重试 1 次；4xx 不重试；返回必须 JSON 且过 zod；校验失败重试 1 次，仍失败降级示例并在 UI 标注。
- 共享硬规则（`ai/rules.ts`）：只使用用户材料中明确出现的信息；不得编造课程/奖项/名次/数字/日期/公司/岗位要求；DDL 只读不猜、读不到填 `null`；严格 JSON + schema；不确定填空或 `null`。
- 开发期一律 `MOCK=1`（fixtures 返回）；同输入 hash 缓存；单次输入截断 12k 字符。
- 记录官（Agent）只做建档/写账/查账/解读/记忆，不做开放域聊天；任何写入必须先给草稿、用户确认后落库；命中必须带来源。

## 五、合规红线

1. 不登录学习通、不调其接口；只处理用户**主动上传的截图**或**粘贴的文本**。
2. 不爬 BOSS 直聘/招聘网站/校招官网；不模拟登录、不存 Cookie；机会页只展示渠道入口 + 人工整理岗位库 + 用户粘贴 JD。六家公司（大疆/华为/特斯拉/字节/腾讯/阿里）只做官方入口 + 人工岗位卡，不抓取。构建期来源核验只检查官方入口可达性，不等于抓取岗位内容。
3. 不收集姓名、学号、身份证、手机号；数据只在本机浏览器。
4. About 页必须可见：数据存哪、发给模型的是什么、如何一键清除。
5. 文案不承诺"保过 / 必得 offer / 内推包过"。

## 六、交互与视觉

- **先给再要**：首屏就有「用示例体验」或三步对话；不要求注册、不要求先填课表；每次索取数据都同时给回报。
- **可解释 AI**：解析结果左右对照（原始网格 vs 结构化结果），低置信标黄可改。
- **四个面并列**：今日 / 账本 / 悬赏 / 工具箱，左侧常驻导航，任何页面一步切走；今日页为默认入口；记录官全局可开，不占导航。
- 移动端单栏，桌面 1280 最佳；触控目标 ≥44px；键盘可完成主流程（Tab 顺序、焦点环、Enter 提交）。
- 视觉：学术编辑感——纸白 `#FAFAF8`、深墨蓝 `#16233A`、琥珀 `#C8842A` 仅作强调；1px 细线、等宽数字、圆角 12px；不要大面积渐变/发光/玻璃拟态/emoji 堆砌。
- 文案中文书面语、短句、动词开头；空态给"下一步做什么"，错误态给"怎么修"。

## 七、工作方式（每轮执行）

1. **先声明范围**：本轮只做哪个模块/页面，列出要改的 3–6 个文件。
2. **先 mock 后真实**：先用 fixtures 点通界面，再接代理与模型。
3. **小步交付**：每轮结束 `vite build` 通过 + 主页面可点通 + 无 console error。
4. **不擅自扩范围**：不加登录、数据库、支付、多语言、主题系统；爬虫只允许构建期来源核验（见技术约束 4），不新增运行时爬虫；单次改动 >5 个文件需先说明理由。
5. **每轮结束输出 3 行**：`本轮做了什么 / 改了哪些文件 / 下一步建议`。

## 八、发布前自检

- [ ] `vite build` 通过，产物纯静态
- [ ] 无 Key / 断网时，示例模式仍能走完「建档 → 今日 → 留痕 → 账本 → 悬赏 → 出征」
- [ ] IndexedDB 刷新后数据仍在；「清除本机数据」可用；导出/导入覆盖全部数据
- [ ] 单双周切换正确，同一门课不重复渲染
- [ ] 移动端 390 宽无横向滚动；键盘可完成主流程
- [ ] 打印预览 A4 一页，按钮与导航隐藏
- [ ] MCP Server 至少能被 AI 助手成功调用一次
- [ ] 已在 Sites 发布、权限「任何人都可访问」、手机 + 隐身窗口各验证一次
- [ ] 无前端 Key、无个人信息、无第三方素材、无运行时爬虫；构建期来源核验遵守白名单与 robots，且不抓招聘平台内容

## 九、反模式（看到就停下）

- 用 `localStorage` 存课表/经历等大对象 → 用 IndexedDB。
- 把"单双周"当字符串存下来 → 必须展开成 `weeks[]`。
- 解析失败就空白页或无限 loading → 先给兜底态。
- 为"高级"引入 UI 组件库/动画库/状态库 → 不需要。
- 让模型润色出原文没有的数字或成果 → 一票否决。
- 把 BOSS/学习通登录态、Cookie、接口写进代码 → 违规，直接删。
- 把四个面做成一条向导式流程 → 它们是并列的。
- 把今日做成资讯流或开放域聊天页 → 今日是变化流，记录官是写账助手。
- 为绿格刷无意义操作 → 只统计产生结果的动作。

## 十、事实（不要记错）

截止 2026-11-30 18:00（公网链接 + 论坛作品帖）；初筛 12-01~12-07；决赛 12-15。
评审只看：问题是否真实 / 核心流程是否走得通 / 体验与设计 / **Qoder 使用深度**；技术复杂度不计分。
→ 宁可少做一个功能，也不要让主流程有任何一步走不通。
