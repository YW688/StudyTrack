# 学径 StudyTrack · 产品与模块规格（推荐类型：Apply Manually，用 `@rule` 手动挂）

> 何时挂这条规则：做具体模块（课表解析、经历库、简历、机会匹配）之前，或需要判断"这个需求在不在范围内"时。
> 完整版产品事实见 `docs/spec-v0.1.md`；本文件是"开发时必须对齐的规格摘要"。
> **2026-10-31 更新**：信息架构与今日页以 `docs/spec-v0.1.md` 为准。旧的「六个模块」已改为「四个面 + 记录官」；课表解析、打印、数据铁律等模块细节仍然有效。

## 一、定位

**每天 30 秒，把大学四年变成一份可验证的履历。**
面向**全年级**本科生的四年经历账本：日常管课表作业，长期存经历证据，随时出简历，按经历找实习。
不是"求职季才打开的简历工具"，而是"四年经历的总账本 + 每学期的节奏工具"。

| 年级 | 主用模块 | 得到什么 |
|---|---|---|
| 大一 | 今日、工具箱 | 不漏交作业，知道每天上什么 |
| 大二 | 今日 + 账本 | 把课程设计变成"战绩" |
| 大三 | 账本 + 悬赏 | 实习前第一次能拿出简历和作品集 |
| 大四 | 悬赏 + 账本 | 按经历匹配岗位，缺口一目了然 |

## 二、四个面 + 记录官（并列，共享同一份档案）

| 面 | 必须做到的 | 不做 |
|---|---|---|
| **今日** | 判词、昨日结算、今日委托、留痕、今日情报（竞赛/考试/校内）、回声、本周绿格 | 资讯流、开放域聊天 |
| **账本** | 战绩四段式、证据、技能标签、时间线、热力图、碎片收件箱、简历就绪度、出征 | 自动生成虚假奖项 |
| **悬赏** | 6 个官方入口 + 人工岗位卡 + 粘贴 JD；BM25 检索 + 匹配分 + 命中/缺口 | 爬取招聘平台、代投 |
| **工具箱** | 课表 Excel 导入（单双周）、作业（截图/粘贴/手动）、简历 A4、日历、存档、关于 | 对接教务系统、登录学习通 |
| **记录官** | 建档、写账、查账、解读、记忆；写入前确认 | 开放域聊天、7×24 主动推送 |

## 三、课表解析（全项目最难，按此实现）

输入形态必须覆盖：单 sheet 星期表头 / **单双周混排在同一张表**（`高数(单)`、`英语 双周 2-16`、颜色区分）/ 合并单元格 / 多 sheet / CSV / 周次×节次矩阵 / 两列式（`周一3-4节,1-16周`）。

三级管线：
1. `SheetJS` 读网格（保留合并单元格范围与填充色）；
2. 规则层：定位星期表头与节次列 → 合并单元格填充 → 正则抽 `[周次|单双周|地点|教师|课程名]`；
3. 模型兜底：网格序列化为紧凑文本 → `Course[]`；
4. 人工确认：左原表 / 右结果，低置信标黄可改，支持整门删除；
5. 冲突检测：单双周冲突只提示不阻断。

**验收**：自造 4 份真实风格 Excel（单双周混排 / 合并单元格 / 双 sheet / 两列式），课程条数·星期·节次·周次准确率 ≥90%；解析失败必须有「手动建课表 / 示例课表」兜底。

## 四、数据模型（zod 校验；完整字段见 spec §7）

```ts
Profile        { id, grade, major?, school?, goal, targetRoles[], skills[], interests[], onboardedAt?, updatedAt }
Course         { id, name, teacher?, location?, sessions[{day,startPeriod,endPeriod,weeks:number[]}], color?, confidence }
Assignment     { id, courseId?, title, due?, status:'todo'|'doing'|'done', source:'ocr'|'paste'|'manual' }
Experience     { id, kind:'course'|'contest'|'research'|'intern'|'design'|'volunteer',
                 title, org?, start?, end?, problem, method, contribution, result,
                 metrics:{label,value}[], evidence:{label,url?}[], skills[], tags[], confidence }
JobPosting     { id, company, title, city?, cohort?, requirements[], sourceUrl?, collectedAt? }
Channel        { id, name, type:'campus'|'platform'|'public', entryUrl, openMonths:number[], fitGrade:number[] }
Match          { jobId, score, hits:[{requirement,experienceId,quote}], gaps:[{requirement,advice}] }
ResumeSnapshot { id, selectedExperienceIds[], createdAt, version }
LedgerEvent    { id, date, type, refId?, title, detail?, createdAt, revokedAt? }
Note           { id, text, createdAt, source, status, linkedExperienceId?, tags[], confidence }
CalendarItem   { id, title, category, fitGrades[], fitMajors?, start?, deadline?, sourceName, sourceUrl?, sourceType, verifiedAt?, note? }
AgentMessage   { id, role, text, createdAt, actions?, linkedRecordIds[] }
```

> 完整字段与日志规则见 `docs/spec-v0.1.md` §7；`LedgerEvent` 只统计产生结果的动作，删除/纯打开/纯打卡不计。

## 五、范围（判断需求该不该做）

**Must**：三步建档 + 今日页（判词/昨日结算/今日委托/留痕/情报/回声/绿格）+ 留痕到账本 + 日历 15 条 + 课表/作业基础 + 经历时间线 + 简历 A4 打印 + 悬赏 6 个入口/3 张演示卡 + 数据导出/导入。
**Should**：记录官完整写账/解读 + 粘贴 JD 匹配 + 缺口建议 + 演示模式 + MCP Server（本地可调用）。
**Could**：周报/学期战报、投递跟踪、简历版本快照、真实新闻 RSS。
**Won't**：登录/账号、云同步、服务端数据库、支付、**任何爬虫**、代投、开放域聊天机器人、通用资讯流、推送、多端 App、多语言、主题系统。

## 六、排期与 Gate

| 阶段 | 日期 | Gate |
|---|---|---|
| W0 | 10/31–11/02 | G0：规则同步 + 规格定稿 + Sites 空站发布 + 手机/隐身窗口能开 |
| W1 | 11/03–11/09 | G1：数据层 + 今日页骨架 + 留痕/绿格闭环，3 分钟可演示 |
| W2 | 11/10–11/16 | G2：日历 15 条 + 账本页 + 热力图 + 导出/导入 |
| W3 | 11/17–11/23 | G3：记录官建档/写账 + 悬赏入口/3 张卡 + 匹配闭环 |
| W4 | 11/24–11/30 | G4：演示模式 + 移动端/打印/空态 + 发布；**11/28 提交** |

## 七、AI 任务表

| 任务 | 输入 | 输出 | 模型 |
|---|---|---|---|
| T1 课表解析 | 网格序列化文本 | `Course[]` | qwen-plus |
| T2 作业抽取 | 截图 / 粘贴文本 | `Assignment[]` | qwen-vl-max / qwen-plus |
| T3 经历结构化 | 一段口语化描述 | `Experience` | qwen-plus |
| T4 简历/匹配文案 | 经历 + 检索 Top-K 岗位 | bullet / 推荐理由 / 缺口 | qwen-plus |
| T5 记录官建档/写账 | 对话 / 截图 / 粘贴文本 | Profile / Note / Experience 草稿 | qwen-plus / qwen-vl-max |
| T6 日结/判词 | LedgerEvent + Profile + 课表/DDL | 3 行摘要 + 一句判词 | 模板优先，qwen-plus 补一句 |
| R1 岗位检索 | 技能/年级/城市 | Top-5 `JobPosting` | **本地 BM25，不调模型** |
