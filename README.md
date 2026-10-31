# StudyTrack · 开工说明（Start Here）

> 「学径 StudyTrack」参赛项目。本项目**从零开始**，旧仓库 `旧仓库` 一行代码、一张素材都不复用。
> 产品规格：`docs/spec-v0.1.md`（当前）→ `docs/plan.md`（历史基线）；工程硬约束：`.qoder/rules/00-core.md`。

## 目录（✅ 已有 / ⬜ 待建）

```
E:\StudyTrack\                     ← Qoder 直接打开这一层
├─ .qoder\rules\
│  ├─ 00-core.md        ✅  Always Apply      技术/合规/数据/视觉硬约束
│  ├─ 10-plan.md        ✅  Apply Manually    四个面规格摘要（@rule 挂）
│  └─ 20-print.md       ✅  Specific Files    A4 打印规范（src/styles/** 等）
├─ docs\
│  ├─ spec-v0.1.md      ✅  当前产品规格（四个面 + 记录官）
│  ├─ plan.md           ✅  历史基线（v4，部分已被 spec 取代）
│  └─ system-prompt-archive.md ✅  系统提示词原文，仅留档
├─ src\                 ⬜  W0 建空项目后出现
├─ data\                ⬜  W3 岗位库/渠道库
├─ mcp\server.ts        ⬜  W3 MCP Server
├─ api\proxy\           ⬜  W2 薄代理
├─ package.json / vite.config.ts / index.html   ⬜  W0
├─ LICENSE (MIT)        ⬜  W0
├─ README.md            ✅  本文件
└─ STUDYTRACK_2026_PLAN.md / QODER_SYSTEM_PROMPT.md  ✅ 占位，勿编辑
```

**只改这三处**：产品规则 → `00-core.md`；模块规格 → `10-plan.md`；方案本身 → `docs/spec-v0.1.md`。

## 一、先在 Qoder 里做 3 个设置

1. 用 Qoder 打开 `E:\StudyTrack`（工程根就是这一层，不要打开上级目录）。
2. Settings → Rules → Add，按文件设类型：
   | 规则文件 | 类型 | 补充 |
   |---|---|---|
   | `00-core.md` | Always Apply | — |
   | `10-plan.md` | Apply Manually | 做具体模块前 `@rule` 挂 |
   | `20-print.md` | Specific Files | `src/styles/**, src/components/PrintSheet*, src/components/ResumeSheet*` |
3. 确认 `.qoder/rules` **不要**写进 `.gitignore`（规则要随仓库开源）。

## 二、第一条对话（W0：只验证平台，不写功能）

把下面整段直接发给 Qoder：

```
按 .qoder/rules/00-core.md 执行。本轮只做一件事，不要做其他功能：

1) 在本仓库根目录初始化 React + Vite + TypeScript + Tailwind 空项目
   （package.json / vite.config.ts / tsconfig.json / index.html / src/main.tsx / src/App.tsx）；
2) 只实现一个落地页 /：
   - 一句话主标题「你在大学做的每件事，都该留下证据」
   - 一句副标题：管课表、记作业、存经历、随时出简历
   - 一个主按钮「用示例体验」（暂时点击弹提示即可，先不接后面的页面）
   - 页脚：开源说明占位 + "数据只存在你的浏览器"
3) 不新增依赖，不加登录，不做任何后端、数据库、爬虫；
4) 跑通 vite build；
5) 完成后告诉我：构建是否通过、要发布到 Qoder Sites 的哪个命令/入口。

发布到 Qoder Sites 后，把访问权限改为「任何人都可访问」，并把公网链接发我。
```

## 三、发布后必须做的验收（G0）

- [ ] 公网链接在**隐身窗口**能打开（不需要登录）
- [ ] 手机流量下能打开，无横向滚动
- [ ] 截图存档（作品帖素材）
- [ ] 记录发布用时，评估后续迭代节奏

## 四、W0 清单（10/31–11/02）

- [ ] 天池报名 + 实名认证（所有队员）
- [ ] 阿里云大学生认证（截止前必须完成，否则取消获奖资格）
- [ ] Qoder CN 账号可用、能看到 Sites 入口
- [ ] 三条规则已设类型并生效（改一行规则试一次，确认模型确实遵守）
- [ ] 空站已发布 + 改公开 + 手机/隐身窗口可打开（**G0**）
- [ ] GitHub 空仓库（MIT）建好，首次提交：文档 + 空项目骨架

## 五、铁律速记

静态站 · 无登录 · 无数据库 · 零爬虫 · Key 不进前端 · 打印出 PDF · 单双周展开成 `weeks[]` · 不编造数字 · 四个面并列不是向导 · 记录官只记账不闲聊。
