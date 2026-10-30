# 学径 StudyTrack · 产品与模块规格（推荐类型：Apply Manually，用 `@rule` 手动挂）

> 何时挂这条规则：做具体模块（课表解析、经历库、简历、机会匹配）之前，或需要判断"这个需求在不在范围内"时。
> 完整版产品事实见 `docs/plan.md`；本文件是"开发时必须对齐的规格摘要"。

## 一、定位

面向**全年级**本科生的「学习 + 经历」聚合工作台：日常管课表作业，长期存经历作品，随时出简历，按经历找实习。
不是"求职季才打开的简历工具"，而是"四年经历的总账本 + 每学期的日常工具"。

| 年级 | 主用模块 | 得到什么 |
|---|---|---|
| 大一 | 课表、作业 | 不漏交作业，知道每天上什么 |
| 大二 | 课表 + 经历库 | 把课程设计变成"项目经历" |
| 大三 | 经历库 + 简历 + 机会 | 实习前第一次能拿出简历和作品集 |
| 大四 | 机会 + 简历 | 按经历匹配岗位，缺口一目了然 |

## 二、六个模块（并列，共享同一份档案）

| 模块 | 必须做到的 | 不做 |
|---|---|---|
| **今日** | 今日课程（含地点/周次）→ 未完成作业 → 本周 DDL → 「最近没记经历」提示 | 做一个聊天机器人 |
| **课表** | Excel 导入（单/双周、合并单元格、多 sheet）、周视图、周次切换、手动修正、冲突提示 | 对接教务系统 |
| **作业** | 截图（Qwen-VL）/ 粘贴 / 手动三种导入；DDL 分级（≤24h 红、≤72h 琥珀）；完成勾选 | 登录学习通 |
| **经历** | 课程设计/比赛/科研/实习/作品/志愿；四段式（问题-方法-贡献-结果）；证据与技能标签；时间线视图 | 自动生成虚假奖项 |
| **简历** | 从经历勾选 → 排版 → A4 打印；版本快照；作品集页（URL 编码内容，可分享） | 多模板商城、AI 全自动投递 |
| **机会** | 渠道入口库 + 岗位库（人工整理）+ 粘贴 JD；BM25 检索 + 匹配分 + 命中/缺口 | 爬取招聘平台、代投 |

## 三、课表解析（全项目最难，按此实现）

输入形态必须覆盖：单 sheet 星期表头 / **单双周混排在同一张表**（`高数(单)`、`英语 双周 2-16`、颜色区分）/ 合并单元格 / 多 sheet / CSV / 周次×节次矩阵 / 两列式（`周一3-4节,1-16周`）。

三级管线：
1. `SheetJS` 读网格（保留合并单元格范围与填充色）；
2. 规则层：定位星期表头与节次列 → 合并单元格填充 → 正则抽 `[周次|单双周|地点|教师|课程名]`；
3. 模型兜底：网格序列化为紧凑文本 → `Course[]`；
4. 人工确认：左原表 / 右结果，低置信标黄可改，支持整门删除；
5. 冲突检测：单双周冲突只提示不阻断。

**验收**：自造 4 份真实风格 Excel（单双周混排 / 合并单元格 / 双 sheet / 两列式），课程条数·星期·节次·周次准确率 ≥90%；解析失败必须有「手动建课表 / 示例课表」兜底。

## 四、数据模型（唯一事实源，zod 校验）

```ts
Profile        { grade, major?, school?, targetRoles[], skills[] }
Course         { id, name, teacher?, location?, sessions[{day,startPeriod,endPeriod,weeks:number[]}], color?, confidence }
Assignment     { id, courseId?, title, due?, status:'todo'|'doing'|'done', source:'ocr'|'paste'|'manual' }
Experience     { id, kind:'course'|'contest'|'research'|'intern'|'design'|'volunteer',
                 title, org?, start?, end?, problem, method, contribution, result,
                 metrics:{label,value}[], evidence:{label,url?}[], skills[], tags[], confidence }
JobPosting     { id, company, title, city?, cohort?, requirements[], sourceUrl?, collectedAt? }
Channel        { id, name, type:'campus'|'platform'|'public', entryUrl, openMonths:number[], fitGrade:number[] }
Match          { jobId, score, hits:[{requirement,experienceId,quote}], gaps:[{requirement,advice}] }
ResumeSnapshot { id, selectedExperienceIds[], createdAt, version }
```

## 五、范围（判断需求该不该做）

**Must**：课表 Excel 导入（含单双周）+ 周视图 + 作业（粘贴/手动/截图）+ 未完成提醒 + 经历库（录入/时间线）+ 简历 A4 打印 + 作品集页。
**Should**：机会库 40 条 + 粘贴 JD 匹配 + 缺口建议 + MCP Server（本地可调用）。
**Could**：简历版本快照、百炼知识库增强、投递跟踪、学期回顾海报。
**Won't**：登录/账号、云同步、服务端数据库、支付、**任何爬虫**、代投、AI 聊天窗、多端 App、多语言、主题系统。

## 六、排期与 Gate

| 阶段 | 日期 | Gate |
|---|---|---|
| W0 | 10/31–11/02 | G0：Sites 空站发布 + 改公开 + 手机/隐身窗口能开 |
| W1 | 11/03–11/09 | G1：4 份样例解析 ≥90%，「导入→今日→未完成作业」3 分钟可演示 |
| W2 | 11/10–11/16 | G2：0 条经历 → 6 条 → 导出简历 + 分享作品集，全链路通 |
| W3 | 11/17–11/23 | G3：5 人盲测走完主流程；MCP 被 AI 助手成功调用一次 |
| W4 | 11/24–11/30 | G4：**11/28 提交**，之后只修 bug |

## 七、AI 任务表

| 任务 | 输入 | 输出 | 模型 |
|---|---|---|---|
| T1 课表解析 | 网格序列化文本 | `Course[]` | qwen-plus |
| T2 作业抽取 | 截图 / 粘贴文本 | `Assignment[]` | qwen-vl-max / qwen-plus |
| T3 经历结构化 | 一段口语化描述 | `Experience` | qwen-plus |
| T4 简历/匹配文案 | 经历 + 检索 Top-K 岗位 | bullet / 推荐理由 / 缺口 | qwen-plus |
| R1 岗位检索 | 技能/年级/城市 | Top-5 `JobPosting` | **本地 BM25，不调模型** |
