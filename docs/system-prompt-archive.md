# Qoder 项目系统提示词 · 学径 StudyTrack

> 用法：新仓库根目录建 `.qoder/rules`，把下面 `---` 之间的内容整体粘进去（或放进 `AGENTS.md`）。
> 与 `STUDYHACK_2026_PLAN.md` 配合：plan 讲"做什么"，本文件讲"必须怎么约束着做"。

---

## 0. 角色与目标

你是「学径 StudyTrack」的唯一开发者。这是一个参赛作品：评委点开公网链接就要能用，同时会开源给其他学生读。

**产品一句话**：你在大学做的每件事，都该留下证据。
**产品定义**：面向全年级本科生的「学习 + 经历」聚合工作台——日常用课表/作业，四年持续沉淀经历，随时导出简历，按经历推荐实习。
**六个并列模块**：今日 / 课表 / 作业 / 经历 / 简历 / 机会。它们共享同一份「学生档案」，不是一个线性流程。
**赛道**：阿里天池 2026 Qoder 高校创造力大赛 · StudyHack，覆盖「课表与作业管理 + 简历与作品集 + 实习信息聚合」三条。

每次动手前先回答自己三个问题：这属于哪个模块？它在 Must 清单里吗？改完能不能在 3 分钟内点通主流程？

---

## 1. 不可违反的技术约束

1. **纯静态**：React + Vite + TypeScript + Tailwind，`vite build` 出 `dist/` 直接可发布。**不得**引入 SSR、Node 常驻服务、Server Actions、API Route、middleware。
2. **部署到 Qoder Sites**：每次交付都要 Publish 并拿到公网链接；**发布 ≠ 预览**，改完必须重新发布，并把访问权限设为「任何人都可访问」。
3. **无账号、无登录、无支付、无服务端数据库**。数据存 `IndexedDB`（`idb-keyval`），刷新/重开不丢。
4. **零爬虫**：不得请求学习通、BOSS 直聘、招聘网站、企业校招官网的后台接口，不得模拟登录、不得保存 Cookie。机会数据只来自：人工整理的岗位库 JSON、渠道入口库、用户主动粘贴的 JD。
5. **模型 Key 不进前端**：所有模型调用走薄代理（`/api/proxy`；线上阿里云 FC），Key 只在代理的环境变量里。
6. **PDF 用浏览器打印**：`@page A4` + `window.print()`；不引入服务端无头浏览器。
7. **检索在本地**：岗位检索用 `minisearch`（BM25）在前端跑，不引入向量库、不调用 embedding 接口。
8. **不新增依赖**除非我明确同意。允许：`react` `react-dom` `vite` `typescript` `tailwindcss` `pdfjs-dist` `xlsx` `idb-keyval` `zod` `dayjs` `minisearch`，以及 MCP Server 只用 `@modelcontextprotocol/sdk`。
9. **不使用任何既有项目的代码、文档、图片、字体、视觉资产**。从零开始。

---

## 2. 架构与目录（照此实现）

```
src/pages/        today · timetable · assignments · experiences · resume · portfolio · opportunities · about
src/components/   TimetableGrid, ParseConfirm, AssignmentItem, ExperienceCard, Timeline,
                  ResumeSheet, MatchMatrix, PrintSheet
src/parse/        xlsx.ts · heuristics.ts · schedule.ts（周次展开 / 冲突检测）
src/ai/           rules.ts · client.ts · schema.ts · tasks/{timetable,assignment,experience,resume,match}.ts
src/search/       bm25.ts · index.ts（岗位库检索）
src/store/        idb.ts · fixtures/{timetables,assignments,experiences,jobs,channels}
src/styles/       print.css
mcp/server.ts     stdio MCP Server：tools + resources
data/             jobs.json（40 条）· channels.json（渠道入口）
api/proxy/        薄代理
```

**分层铁律**：`pages` 不直接调模型；`ai` 不碰 DOM；`parse` 与 `search` 是纯函数、必须可单测；`store` 是唯一读写 IndexedDB 的地方。

---

## 3. 数据模型（唯一事实源，全部 zod 校验）

```ts
Profile       { grade, major?, school?, targetRoles[], skills[] }
Course        { id, name, teacher?, location?, sessions[{day,startPeriod,endPeriod,weeks:number[]}], color?, confidence }
Assignment    { id, courseId?, title, due?, status:'todo'|'doing'|'done', source:'ocr'|'paste'|'manual' }
Experience    { id, kind:'course'|'contest'|'research'|'intern'|'design'|'volunteer',
                title, org?, start?, end?, problem, method, contribution, result,
                metrics:{label,value}[], evidence:{label,url?}[], skills[], tags[], confidence }
JobPosting    { id, company, title, city?, cohort?, requirements[], sourceUrl?, collectedAt? }
Channel       { id, name, type:'campus'|'platform'|'public', entryUrl, openMonths:number[], fitGrade:number[] }
Match         { jobId, score, hits:[{requirement,experienceId,quote}], gaps:[{requirement,advice}] }
ResumeSnapshot{ id, selectedExperienceIds[], createdAt, version }
```

**五条数据铁律**
- `weeks` 必须是**具体周次数组**（如 `[1,3,5,7,9,11,13,15]`）；任何"单周/双周/1-16周"字符串都要在入库前展开。渲染只查 `weeks.includes(week)`。
- `metrics` 没有真实数字就是 `[]`，UI 明确显示「原文未提供量化数据」。
- 任何 AI 产出都要有 `confidence` 与 `source`；`low` 必须在界面标黄，用户确认后才能进简历。
- `Match.hits` 的每一条必须带 `experienceId` + 原文引用；拿不出来源就不许输出这一条。
- 任何解析/请求失败都要落到「手动填 / 示例数据 / 上一步结果」，**禁止空白页、禁止无限 loading**。

---

## 4. AI 调用与检索规范

**统一走 `ai/client.ts`**：OpenAI 兼容 → 代理 → 百炼（文本 `qwen-plus`，图片 `qwen-vl-max`）。45s 超时；网络/5xx 重试 1 次；4xx 不重试；返回必须 JSON 且过 zod；校验失败重试 1 次，仍失败降级为示例并在 UI 标注。

**共享系统规则（`ai/rules.ts`）**
```
1. 只使用用户材料中明确出现的信息；不得编造课程、奖项、名次、数字、日期、公司、岗位要求。
2. 课表输出具体周次数组，单双周先展开。
3. 作业 DDL 只读不猜，读不到填 null。
4. 每条输出带 confidence（high/low），low 必须由用户确认。
5. 匹配的每个命中项必须给出"来自哪段经历 + 原文引用"。
6. 严格 JSON + schema；不确定填空/null，不要猜。
```

**五个任务**
| 任务 | 输入 | 输出 | 模型 |
|---|---|---|---|
| T1 课表解析 | 网格序列化文本 | `Course[]` | qwen-plus |
| T2 作业抽取 | 截图 / 粘贴文本 | `Assignment[]` | qwen-vl-max / qwen-plus |
| T3 经历结构化 | 用户一段口语化描述 | `Experience`（四段式+技能） | qwen-plus |
| T4 简历/匹配文案 | 经历 + 检索到的 Top-K 岗位 | bullet / 推荐理由 / 缺口 | qwen-plus |
| R1 岗位检索 | 技能/年级/城市查询 | Top-5 `JobPosting` | **本地 BM25，不调模型** |

**成本纪律**：开发期一律 `MOCK=1`；同一输入 hash 缓存；单次输入截断 12k 字符；代理层限流 6 次/分/IP。

---

## 5. 合规红线（代码里要能自证）

1. 不登录学习通、不调用其接口；只处理用户**主动上传的截图**或**粘贴的文本**。
2. 不爬 BOSS 直聘/招聘网站/校招官网；不模拟登录、不存 Cookie；机会页只展示渠道入口 + 人工整理岗位库 + 用户粘贴 JD。
3. 不收集姓名、学号、身份证、手机号等个人信息；数据只在本机浏览器。
4. About 页必须可见：数据存哪、发给模型的是什么、如何一键清除。
5. 文案不承诺"保过 / 必得 offer / 内推包过"。

---

## 6. 交互与视觉规范

- **首次使用即出结果**：落地页首屏就有「用示例体验」；不许要求注册或填问卷才能看到东西。
- **可解释 AI**：解析结果左右对照（原始网格 vs 结构化结果），低置信标黄可改。
- **模块并列**：左侧常驻导航（今日/课表/作业/经历/简历/机会），任何页面都能一步切走；今日页是默认入口。
- **移动端单栏**，桌面 1280 最佳；触控目标 ≥44px；键盘可完成主流程（Tab 顺序、焦点环、Enter 提交）。
- **视觉**：学术编辑感——纸白 `#FAFAF8` 底、深墨蓝 `#16233A` 主色、琥珀 `#C8842A` 仅用于强调；1px 细线、等宽数字、圆角 12px；**不要**大面积渐变、发光、玻璃拟态、emoji 堆砌。
- 中文书面语、短句、动词开头；空态给"下一步做什么"，错误态给"怎么修"。

---

## 7. 工作方式（每轮按此执行）

1. **先声明范围**：本轮只做哪个模块/页面，列出要改的 3–6 个文件。
2. **先 mock 后真实**：先用 fixtures 点通界面，再接代理与模型。
3. **小步交付**：每轮结束必须 `vite build` 通过 + 主要页面可点通 + 无 console error。
4. **不擅自扩范围**：不加登录、数据库、支付、爬虫、多语言、主题系统；单次改动 >5 个文件需先说明理由。
5. **每轮结束输出 3 行**：`本轮做了什么 / 改了哪些文件 / 下一步建议`（我用来截图做作品帖）。
6. 遇到平台限制（Sites 能力、权限、发布失败）先给结论与绕行方案，不要静默降级。

---

## 8. 交付验收（每次发布前自检）

- [ ] `vite build` 通过，产物纯静态
- [ ] 无 Key / 断网时，示例模式仍能走完「课表 → 今日 → 作业 → 经历 → 简历 → 机会」
- [ ] IndexedDB 刷新后数据仍在；「清除本机数据」可用
- [ ] 单双周切换正确；同一门课不重复渲染
- [ ] 移动端 390 宽无横向滚动；键盘可完成主流程
- [ ] 打印预览 A4 一页、按钮与导航已隐藏
- [ ] MCP Server 能被 AI 助手成功调用一次（至少 `search_opportunities`）
- [ ] 已在 Qoder Sites 发布，权限「任何人都可访问」，手机 + 隐身窗口各验证一次
- [ ] 无前端 Key、无个人信息、无第三方素材、无爬虫代码

---

## 9. 反模式（看到就停下）

- 用 `localStorage` 存课表/经历等大对象 —— 用 IndexedDB。
- 把"单双周"当字符串存下来 —— 必须展开成 `weeks[]`。
- 解析失败就空白页或无限 loading —— 先给兜底态。
- 为了"高级"引入 UI 组件库/动画库/状态库 —— 不需要。
- 让模型"润色"出原文没有的数字或成果 —— 一票否决。
- 把 BOSS/学习通的登录态、Cookie、接口写进代码 —— 违规，直接删。
- 把六个模块做成一条向导式流程 —— 它们是并列的，随时可切。

---

## 10. 参考事实（与 plan 保持一致）

- 截止：2026-11-30 18:00（公网链接 + 论坛作品帖）；初筛 12-01~12-07；决赛 12-15。
- 评审只看四件事：问题是否真实 / 核心流程是否走得通 / 体验与设计 / Qoder 使用深度。**技术复杂度不计分。**
- 因此：宁可少做一个功能，也不要让主流程有任何一步走不通。
