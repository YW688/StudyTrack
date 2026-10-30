# 学径 StudyTrack · 项目方案 v4（2026 Qoder 高校创造力大赛 · StudyHack）

> **本文件是本项目唯一的事实来源（single source of truth）**：定位、模块规格、数据模型、技术方案、排期、验收。
> 工程硬约束在 `.qoder/rules/00-core.md`（Always Apply），模块规格在 `.qoder/rules/10-plan.md`（手动挂）。
> 仓库现状：**只有文档，尚无代码**。代码从 `src/` 开始建（见 §14）。
> 约束：从零开始、开源、无付费、无账号、不复用任何旧项目代码与资产。

---

## 0. 仓库文件地图（先看这里）

```
E:\StudyTrack\                     ← 项目根（Qoder 直接打开这一层）
├─ .qoder\rules\
│  ├─ 00-core.md        Always Apply      技术/合规/数据/视觉硬约束
│  ├─ 10-plan.md        Apply Manually    六模块规格摘要（@rule 挂）
│  └─ 20-print.md       Specific Files    A4 打印规范（src/styles/** 等）
├─ docs\
│  ├─ plan.md                          ← 本文件，唯一事实源
│  └─ system-prompt-archive.md         系统提示词原文（已拆进 rules，仅留档）
├─ README.md                           开工说明 + W0 清单
├─ STUDYTRACK_2026_PLAN.md             指针占位（勿编辑，内容已并入 docs/plan.md）
└─ QODER_SYSTEM_PROMPT.md              指针占位（勿编辑，内容已并入 .qoder/rules/）
```

**改文档只改这三处**：产品规则改 `00-core.md` / 模块规格改 `10-plan.md` / 方案本身改 `docs/plan.md`。根目录两个 `.md` 是占位，避免同一份内容出现两个版本。

---

## 1. 一页速览

| 项 | 内容 |
|---|---|
| 作品名 | **学径 StudyTrack**（备选：学迹 / 四年） |
| 一句话 | **你在大学做的每件事，都该留下证据。** |
| 产品定义 | 面向**全年级本科生**的「学习 + 经历」聚合工作台：日常用课表/作业，四年持续沉淀经历，随时导出简历，按经历推荐实习 |
| 赛道 | StudyHack 学习科研 |
| 覆盖官方示例 | **课表与作业管理 + 简历与作品集 + 实习信息聚合**（三条并列，不是先后） |
| 截止 | 报名 + 论坛作品帖 **2026-11-30 18:00**；初筛 12-01~12-07；决赛 12-15 线上路演 |
| 提交 | Qoder Sites 公网链接（公开可访问）+ 天池论坛【StudyHack】作品帖 + Qoder 账号 |
| 技术 | React + Vite 静态站 → Qoder Sites；IndexedDB 本地库；SheetJS 解析课表；本地 BM25 检索；Qwen-VL/plus 走薄代理；附带一个 MCP Server |
| 工期 | 4 周（10/31–11/29），11/28 定稿，留 2 天缓冲 |

**为什么是"聚合"而不是"流程"**：课表是**每天**打开的理由（留存钩子），经历库是**四年**沉淀的资产（护城河），简历/作品集是**导出视图**，机会推荐是**出口**。四件事在页面上**并列**，共享同一份「学生档案」作为数据底座。

---

## 2. 定位与叙事

### 2.1 产品定位
> 一个大学生从大一到大四都能用的工具：**日常管课表作业，长期存经历作品，随时出简历，按经历找实习。**

不是"求职季才打开的简历工具"，而是"**四年经历的总账本 + 每学期的日常工具**"。

### 2.2 年级差异（同一套功能，不同侧重）
| 年级 | 主用模块 | 得到什么 |
|---|---|---|
| 大一 | 课表、作业、今日 | 不再漏交作业；知道每天上什么 |
| 大二 | 课表 + 经历库 | 把课程设计变成"项目经历"，不再是空白 |
| 大三 | 经历库 + 简历 + 机会 | 实习前第一次能拿出简历和作品集 |
| 大四 | 机会 + 简历 | 秋招/春招按经历匹配岗位，缺口一目了然 |

### 2.3 三个判断（作品帖"为什么做"用）
1. **学生的努力没有留痕**：课设、比赛、志愿、实习做完就散了，两年后写简历只能写"参与了"。
2. **现有工具都是单点的**：课表 App 不做简历，简历网站不懂你的课表，招聘 App 不知道你做过什么。**数据从没被打通。**
3. **AI 时代该有的形态是"档案 + 视图"**：一份结构化档案（课表/作业/经历/技能），多种视图（今日、时间线、简历、作品集、机会匹配）；AI 只负责"抽取"与"匹配"，不负责编造。

---

## 3. 信息架构（并列，不是线性）

```
┌──────────────── 学径 StudyTrack（单页应用，左侧常驻导航） ────────────────┐
│ ① 今日 Today        今日课程 · 未完成作业 · 本周 DDL · 最近经历（默认入口） │
│ ② 课表 Timetable    周视图（单/双周、周次切换）· 导入 Excel                 │
│ ③ 作业 Assignments  未完成/已完成 · 截图或粘贴导入 · DDL 分级               │
│ ④ 经历 Experiences  课程设计 / 比赛 / 科研 / 实习 / 作品 · 时间线视图       │
│ ⑤ 简历 Resume       从经历挑选 → 排版 → A4 打印；作品集页可分享            │
│ ⑥ 机会 Opportunities 渠道入口 + 岗位库 · 匹配分 · 缺口建议                  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ 同一份「学生档案」（IndexedDB）
                                ▼
        AI 只做三件事：抽取（课表/作业/经历）· 生成（简历文案）· 匹配（经历×岗位）
```

**首次使用（≤5 分钟必须出结果）**：落地页 →「用示例体验」或「上传课表」→ 解析确认（左原表 / 右结构化）→ 进入「今日」看到今天的课与未完成作业 → 顶部提示「这学期有课程设计吗？记一条经历，简历会自动更新」。

**聚合的产品表现**：导入课表后，经历库自动联想「这学期你上了《数据结构》」；记一条经历后，简历页立刻多一段；简历更新后，机会页的匹配分随之变化。

---

## 4. 模块规格

### M1 今日 / 课表 / 作业（日常工具，留存钩子）

**M1.1 课表导入（全项目最难、最出彩的一段）**
必须覆盖的输入形态：
- 单 sheet：首行"节次 / 星期一…星期日"，首列"1-2 节、3-4 节…"
- **单双周混排在同一张表**：`高数(单) A101`、`英语 双周 2-16`，或仅靠单元格颜色区分
- 合并单元格、多 sheet（每学期一个）、CSV、"周次×节次"矩阵、两列式（`周一3-4节,1-16周`）

三级解析管线（实现文件：`src/parse/xlsx.ts` → `src/parse/heuristics.ts` → `src/ai/tasks/timetable.ts`）：
```
① SheetJS 读网格（保留合并单元格范围与填充色）
② 规则层：找星期表头/节次列 → 合并单元格填充 → 正则抽 [周次|单双周|地点|教师|课程名]
③ 模型兜底：网格序列化成紧凑文本 → Qwen 按 schema 输出 Course[]
④ 人工确认：左原表右结果，低置信标黄可改，支持整门删除
⑤ 冲突检测：单双周冲突只提示不阻断
```
**统一周次模型**：`weeks: number[]`，把 `1-16周`/`单周`/`1-8,10-16` 全部展开（`src/parse/schedule.ts`）；渲染只查 `weeks.includes(本周)`。单双周问题一次性解决。
**验收**：自造 4 份真实风格 Excel（`docs/fixtures/`），课程条数/星期/节次/周次四项准确率 ≥90%；解析失败必须有「手动建课表 / 示例课表」兜底。

**M1.2 作业与待办**
- 三条合法导入路径：学习通**截图**（Qwen-VL）/ **粘贴文本** / 手动添加
- **红线：不登录学习通、不调其接口、不爬取**
- 提醒（不依赖推送）：首页常驻「未完成 N 项」，按 DDL 升序，≤24h 红 / ≤72h 琥珀；每周一顶部「本周 N 门课 M 个 DDL」
- 待办不止作业：比赛报名截止、实习投递截止也可加（为 M4 服务）

**M1.3 今日仪表盘**：今日课程（含地点/周次）→ 未完成作业 → 本周 DDL →「最近 30 天没有新增经历，记一条？」

### M2 经历库（资产护城河，四年沉淀）

**一条经历 = 可复用的简历素材**
```
类型：课程设计 | 比赛 | 科研 | 实习 | 作品 | 志愿
标题 / 组织（课程名·赛事名·公司）/ 时间
四段式：问题 → 方法 → 我的贡献 → 结果
证据：成绩 / 名次 / 截图 / GitHub / Figma / 链接
技能标签：从方法里抽取（Python、建模、排版…）
```
- **录入成本必须低**：粘贴一段文字由 AI 结构化；从课表联想课程名；"一句话 → 追问两个问题 → 成型"
- **时间线视图**：按学期轴展示四年经历，一眼看出"大三下是空的"→ 这就是缺口
- **禁止编造**：AI 只能重组用户写的事实；无数字时展示"原文未提供量化数据"

### M3 简历与作品集（导出视图，不是独立产品）
| 输出 | 用途 | 实现 |
|---|---|---|
| A4 简历（打印） | 投递网申 | 勾选经历 → 排版 → `@page A4` + `window.print()` |
| 作品集页 `/p/:id` | 发导师 / 组会 / 内推 | 内容编码进 URL，无后端可分享，可打印 |
| 简历 JSON | 喂给 MCP / 其他 AI 助手 | 导出结构化档案（见 M5） |

**版本感**：每次导出生成快照（`ResumeSnapshot v1/v2`），大四回看能看到成长——成本极低、情感点很强。

### M4 机会：实习/校招聚合与个性化推荐（出口）

**聚合方式（合规且可持续）**
1. **渠道入口库**（`data/channels.json`，人工维护 20–40 条）：`{渠道, 类型, 入口 URL, 通常开启月份, 适合年级}` —— 统一入口，不抓内容
2. **岗位库**（`data/jobs.json`，人工整理 60–100 条公开 JD）：`{公司, 岗位, 城市, 届别, 技能要求, 来源 URL, 收录日期}`
3. **用户粘贴 JD**：任意渠道看到好岗位，贴进来即可匹配
4. **红线**：不爬 BOSS 直聘/招聘网站、不登录、不代投、不做"实时抓取"承诺

**推荐逻辑（可解释，不吹牛）**
```
经历标签 + 技能 + 课程 + 年级/届别  ⟷  岗位要求
→ 本地 BM25 检索 Top-5 岗位（src/search/）
→ 拼进 prompt → 输出：命中项（每条带"来自你哪段经历"）+ 缺口项 + 下一步建议
```
这就是本项目的 **RAG**：检索（本地岗位库）→ 增强（命中岗位与经历片段进上下文）→ 生成（推荐理由/缺口）。**不依赖向量库、零成本、可解释、离线可跑。**

### M5 MCP Server（加分项，"Agent 时代"叙事）
把"学生档案 + 岗位匹配"暴露成 MCP Server（`mcp/server.ts`，stdio），任何 AI 助手（Qoder / Claude / Cursor）都能调用：
```
tools: search_opportunities(query, grade, city) / match_resume(jobId) / add_experience(text)
resources: studytrack://profile（结构化简历 JSON）、studytrack://timeline（时间线）
```
作品帖一句话：**"学径不只是一个网站，它还是一个可以被 AI 助手直接调用的档案服务。"**

---

## 5. 范围裁剪（防爆炸，写进 rules）

| 优先级 | 内容 |
|---|---|
| **Must（不做完不参赛）** | 课表 Excel 导入（含单双周）+ 周视图 + 作业（粘贴/手动/截图）+ 未完成提醒 + 经历库（录入/时间线）+ 简历 A4 打印 + 作品集页 |
| **Should** | 机会库 40 条 + 粘贴 JD 匹配 + 缺口建议 + MCP Server（本地可调用） |
| **Could** | 简历版本快照、百炼知识库增强检索、投递跟踪看板、学期回顾海报 |
| **Won't** | 登录/账号、云同步、服务端数据库、支付、**任何爬虫**、代投、AI 聊天窗、多端 App、多语言、主题系统 |

---

## 6. 数据模型（唯一事实源，zod 校验，`src/ai/schema.ts`）

```ts
type Profile = { grade: 1|2|3|4; major?: string; school?: string;
  targetRoles: string[]; skills: string[] };

type Course = { id: string; name: string; teacher?: string; location?: string;
  sessions: { day: 1|2|3|4|5|6|7; startPeriod: number; endPeriod: number; weeks: number[] }[];
  color?: string; confidence: 'high'|'low' };

type Assignment = { id: string; courseId?: string; title: string; due?: string;
  status: 'todo'|'doing'|'done'; source: 'ocr'|'paste'|'manual' };

type Experience = { id: string; kind: 'course'|'contest'|'research'|'intern'|'design'|'volunteer';
  title: string; org?: string; start?: string; end?: string;
  problem: string; method: string; contribution: string; result: string;
  metrics: { label: string; value: string }[];      // 无真实数据 → []
  evidence: { label: string; url?: string }[];
  skills: string[]; tags: string[]; confidence: 'high'|'low' };

type JobPosting = { id: string; company: string; title: string; city?: string;
  cohort?: string; requirements: string[]; sourceUrl?: string; collectedAt?: string };

type Channel = { id: string; name: string; type: 'campus'|'platform'|'public';
  entryUrl: string; openMonths: number[]; fitGrade: number[] };

type Match = { jobId: string; score: number;
  hits: { requirement: string; experienceId: string; quote: string }[];
  gaps: { requirement: string; advice: string }[] };

type ResumeSnapshot = { id: string; selectedExperienceIds: string[];
  createdAt: string; version: number };
```

**五条数据铁律**
1. `weeks` 必须是具体周次数组；"单双周"字符串禁止入库。
2. `metrics` 无真实数据 = `[]`，UI 显示「原文未提供量化数据」。
3. 每条 AI 产出必须带 `confidence` 与 `source`，`low` 标黄、用户确认后才进简历。
4. `Match.hits` 每条必须带 `experienceId` + 原文引用；拿不出来源就不许输出。
5. 任何解析/请求失败都必须落到「手动填 / 示例数据 / 上一步结果」，禁止空白页与无限 loading。

---

## 7. 技术方案

```
┌──────────────── Qoder Sites（静态托管，无数据库） ─────────────────────┐
│ React+Vite+TS+Tailwind SPA（src/）                                    │
│  ├ src/parse/     SheetJS 读课表 → 规则层 → 低置信交给模型            │
│  ├ src/ai/        pdf.js / 图片 → 模型多模态（作业截图、作品材料）     │
│  ├ src/store/     IndexedDB：课表 / 作业 / 经历 / 简历快照            │
│  ├ src/search/    BM25 岗位检索 → Top-K 拼上下文（= RAG）             │
│  ├ src/components/PrintSheet  @page A4 + window.print()               │
│  └ src/store/fixtures/  4 份课表 + 6 张作业截图 + 12 条经历 + 40 条岗位│
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ 仅文本片段（无身份信息）
                    ┌──────────▼───────────┐
                    │ api/proxy/（阿里云 FC）│ 鉴权/限流/缓存/日志
                    └──────────┬───────────┘
                    ┌──────────▼───────────┐
                    │ 百炼 qwen-plus / qwen-vl-max │
                    └──────────────────────┘
        ┌───────────────────────────────────────────┐
        │ mcp/server.ts（Node，stdio MCP Server）    │
        │ tools: search_opportunities / match_resume │
        │        / add_experience                    │
        └───────────────────────────────────────────┘
```
**选型理由（写进作品帖）**：全静态 → 评委点开即用、零运维；本地检索 → 零成本、可解释、离线可用；薄代理 → Key 不进前端；MCP → 档案可被任何 AI 助手复用。

**降级**：无 Key → 示例模式全流程可点通；模型超时 → 保留旧结果可重试；解析失败 → 手动/示例；检索为空 → 展示渠道入口库兜底。

---

## 8. AI 与检索设计

| 任务 | 输入 | 输出 | 模型 | 文件 |
|---|---|---|---|---|
| T1 课表解析 | 网格序列化文本 | `Course[]` | qwen-plus | `src/ai/tasks/timetable.ts` |
| T2 作业抽取 | 截图 / 粘贴文本 | `Assignment[]` | qwen-vl-max / qwen-plus | `src/ai/tasks/assignment.ts` |
| T3 经历结构化 | 一段口语化描述 | `Experience` | qwen-plus | `src/ai/tasks/experience.ts` |
| T4 简历/匹配文案 | 经历 + 检索 Top-K | bullet / 推荐理由 / 缺口 | qwen-plus | `src/ai/tasks/resume.ts` `match.ts` |
| R1 岗位检索 | 技能/年级/城市 | Top-5 `JobPosting` | 本地 BM25，**不调模型** | `src/search/` |

**硬规则（`src/ai/rules.ts`）**
```
1. 只使用用户材料中明确出现的信息；不得编造课程、奖项、名次、数字、日期、公司、岗位要求。
2. 课表输出具体周次数组，单双周先展开。
3. 作业 DDL 只读不猜，读不到填 null。
4. 每条输出带 confidence（high/low），low 必须让用户确认。
5. 匹配的每个命中项必须给出"来自哪段经历 + 原文引用"。
6. 严格 JSON + schema；不确定填空/null。
```
**成本纪律**：开发期 `MOCK=1`（fixtures）；同输入 hash 缓存；单次输入截断 12k 字符；代理限流 6 次/分/IP。

---

## 9. 合规与边界（评审必问）

| 风险点 | 做法 |
|---|---|
| 学习通作业 | 不登录、不调接口、不爬；只处理用户主动上传的截图/粘贴文本 |
| BOSS 直聘 / 招聘网站 | **不爬取、不登录、不代投**；只做渠道入口导航 + 公开 JD 人工整理 + 用户粘贴 |
| 校招官网 | 只存入口链接与大致开启月份，全站标注「以企业官网为准」 |
| 个人信息 | 数据只存浏览器本地；不上传服务器；提供"一键清除本机数据" |
| 模型调用 | 只发送文本片段/截图，页面明示；提供纯本地示例模式 |
| 生成内容 | 禁止编造；无证据的量化字段留空并说明 |

> 答辩话术："我们刻意不做爬虫。招聘平台的数据有协议与个人信息风险，抓来的数据三天就失效。我们做的是**统一入口 + 用户主动导入 + 可解释匹配**。"

---

## 10. 排期与 Gate

| 阶段 | 日期 | 交付 | Gate |
|---|---|---|---|
| W0 | 10/31–11/02 | 报名+天池实名+阿里云大学生认证；Qoder 项目；GitHub 空仓库；**Sites 空站发布并改公开** | G0：手机 + 隐身窗口能打开公网站点 |
| W1 | 11/03–11/09 | 课表导入（4 份样例）+ 周视图 + 今日仪表盘 + 作业（手动/粘贴/截图） | G1：4 份样例解析 ≥90%，「导入→今日→未完成作业」3 分钟可演示 |
| W2 | 11/10–11/16 | 经历库（录入/时间线）+ 简历勾选与 A4 打印 + 作品集页 | G2：从 0 条经历录到 6 条 → 导出简历 + 分享作品集，全链路通 |
| W3 | 11/17–11/23 | 岗位库 40 条 + BM25 检索 + 匹配/缺口 + MCP Server + 视觉打磨 | G3：5 位同学盲测走完主流程；MCP 被 AI 助手成功调用一次 |
| W4 | 11/24–11/30 | 90 秒录屏 + 作品帖 + 开源整理 + 提交 | G4：**11/28 提交**，11/29–30 只修 bug |

**每日纪律**：上午写功能 / 下午在 Qoder 里发版并截图存档 / 晚上写 3 行进度（作品帖素材）。

---

## 11. 评审对齐

| 维度 | 做法 | 作品帖位置 |
|---|---|---|
| 问题真实 | 四年经历无处沉淀；课表/简历/招聘三端割裂 | 第 2 段 + 1 个真实案例 |
| 流程走得通 | 首次 5 分钟出结果；无 Key 也能跑；六模块都能点通 | 第 4 段 + 6 张流程图 |
| 体验设计 | 解析左右对照、低置信标黄、A4 打印级排版、移动单栏 | 第 3 段 + 3 张界面 |
| Qoder 深度 | 全流程 Qoder + 3 个自建 Skill + `.qoder/rules` + Sites 发布 | 第 5 段 + 6 张过程图 |

---

## 12. Skills（Qoder 侧）

**内置**：`sites:sites-building`、`sites:sites-hosting`、`sites:sites-management`（不用装；`sites-build-agent-app` 本项目不用）。

**建议安装**：前端设计类（ui-ux-pro-max / design-taste 方向）、`web-accessibility`、`office-xlsx`（仅用于造课表测试样例）。

**自建 3 个（评分点，可开源复用）**
| Skill | 内容 | 目标路径 |
|---|---|---|
| `timetable-xlsx` | SKILL.md + 解析脚本 + 4 份样例 + 单双周/合并单元格/多 sheet 规则 | `.qoder/skills/timetable-xlsx/` |
| `experience-to-resume` | 经历四段式 schema + 禁止编造规则 + 简历/作品集文案模板 | `.qoder/skills/experience-to-resume/` |
| `opportunity-match` | 岗位库结构 + BM25 检索 + 匹配打分与缺口话术 + MCP tool 定义 | `.qoder/skills/opportunity-match/` |

**禁用**：`neon-*`、`hero-visual`、`cost-guard`（旧项目域/旧资产/付费生成）。

---

## 13. 提交清单

**资格**：天池实名 ✓ / 阿里云大学生认证 ✓ / Qoder CN 账号 ✓ / 1–3 人
**作品**：Sites 已 Publish（非预览）✓ / 权限=任何人都可访问（二次确认）✓ / 手机+隐身窗口验证 ✓ / GitHub 开源 MIT ✓ / 无旧项目残留 ✓
**帖子**：`【StudyHack】学径 StudyTrack：你在大学做的每件事，都该留下证据` / 五段齐全 / 截图 ≥8 张（含 Qoder 过程）/ 填写 Qoder 账号 / 可选社媒分享

---

## 14. 目标仓库结构（现状只到 docs 与 rules）

```
StudyTrack/
├─ .qoder/rules/{00-core,10-plan,20-print}.md      ✅ 已有
├─ .qoder/skills/{timetable-xlsx,experience-to-resume,opportunity-match}/   ⬜ 待建（W1–W3）
├─ docs/{plan.md,system-prompt-archive.md}          ✅ 已有
├─ data/{jobs.json,channels.json}                   ⬜ 待建（W3）
├─ src/
│  ├─ pages/        today · timetable · assignments · experiences · resume · portfolio · opportunities · about
│  ├─ components/   TimetableGrid ParseConfirm AssignmentItem ExperienceCard Timeline ResumeSheet MatchMatrix PrintSheet
│  ├─ parse/        xlsx.ts · heuristics.ts · schedule.ts
│  ├─ ai/           rules.ts · client.ts · schema.ts · tasks/
│  ├─ search/       bm25.ts · index.ts
│  ├─ store/        idb.ts · fixtures/
│  └─ styles/       print.css
├─ mcp/server.ts                                    ⬜ 待建（W3）
├─ api/proxy/                                       ⬜ 待建（W2）
├─ package.json · vite.config.ts · tsconfig.json · index.html · .gitignore   ⬜ 待建（W0）
├─ LICENSE (MIT)
└─ README.md                                        ✅ 已有
```

---

## 15. 开工第一步（W0，照顺序做）

1. **补资格**：天池报名 + 实名认证 + 阿里云大学生认证（最容易漏、最致命）。
2. **Qoder 设置规则类型**（Settings → Rules → Add）：`00-core.md`=Always Apply；`10-plan.md`=Apply Manually；`20-print.md`=Specific Files（`src/styles/**, src/components/PrintSheet*, src/components/ResumeSheet*`）。
3. **建空项目**（在 Qoder 里发第一条对话）：React + Vite + TS + Tailwind，只做落地页，`vite build` 通过。
4. **发布验证**：Sites 发布 → 权限改「任何人都可访问」→ 手机 + 隐身窗口各开一次 → 截图存档。这一步不过，不要写任何功能。
5. **建 GitHub 空仓库**（MIT），首提交：文档 + 空项目骨架。

> 一句话结论：**W0 只验证两件事——"能发布且别人能打开"和"规则真的生效"，功能从 W1 再开始。**
