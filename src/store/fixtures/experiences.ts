import type { Experience, ExperienceData } from "../../types";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function sample(experience: Omit<Experience, "createdAt" | "updatedAt">, days: number): Experience {
  const createdAt = daysAgo(days);
  return { ...experience, createdAt, updatedAt: createdAt };
}

export function createSampleExperiences(): ExperienceData {
  const experiences: Experience[] = [
    sample(
      {
        id: "sample-exp-course-db",
        kind: "course",
        title: "数据库课程设计：校园选课系统",
        org: "《数据库原理》课程 · 计算机学院",
        start: "2026-03",
        end: "2026-06",
        problem:
          "原有选课流程依赖人工登记，高峰期同一门课容易被超额选中，退改选后数据也对不上。",
        method:
          "用 E-R 模型重新拆分为学生、课程、教学班、选课记录四类实体；MySQL 建表并用事务处理选课与退课；Java Swing 实现学生端与教务端。",
        contribution:
          "负责数据库设计与选课事务，写了 12 张表的建表脚本，和另一位同学完成 6 个核心页面联调。",
        result:
          "课程设计验收通过，200 人并发模拟选课无超选；报告被老师选为课堂示例。",
        metrics: [
          { label: "数据表", value: "12 张" },
          { label: "并发模拟", value: "200 人" },
        ],
        evidence: [
          { label: "课程设计报告" },
          { label: "系统演示", url: "https://example.com/db-course-demo" },
        ],
        skills: ["MySQL", "Java", "数据库设计", "事务"],
        tags: ["课程设计", "团队协作"],
        confidence: "high",
        source: "sample",
      },
      38,
    ),
    sample(
      {
        id: "sample-exp-contest-mcm",
        kind: "contest",
        title: "全国大学生数学建模竞赛 · 校赛",
        org: "教务处 · 数学建模协会",
        start: "2026-09",
        end: "2026-09",
        problem:
          "A 题要求在有限观测数据下估计城市共享单车的调度需求，并给出各站点的调度方案。",
        method:
          "先做数据清洗和时段聚类，用 ARIMA 做基线预测，再用线性规划求解各站点调度量；用 Python 完成全部计算与图表。",
        contribution:
          "负责数据清洗、预测模型和论文中的模型检验部分，72 小时内完成 3 轮参数调整。",
        result: "完成 22 页论文并按时提交，获校赛二等奖。",
        metrics: [
          { label: "参赛队伍", value: "3 人" },
          { label: "论文", value: "22 页" },
        ],
        evidence: [
          { label: "校赛获奖公示", url: "https://example.com/mcm-award" },
        ],
        skills: ["Python", "数理建模", "论文写作"],
        tags: ["竞赛", "团队协作"],
        confidence: "high",
        source: "sample",
      },
      2,
    ),
    sample(
      {
        id: "sample-exp-intern-frontend",
        kind: "intern",
        title: "前端开发实习生",
        org: "杭州知路教育科技有限公司",
        start: "2026-07",
        end: "2026-08",
        problem:
          "课程详情页在低端安卓机上首屏加载超过 5 秒，用户流失明显。",
        method:
          "用 Chrome Performance 定位瓶颈，拆分长列表、图片懒加载、把首屏接口从串行改成并行；补充关键路径的加载占位。",
        contribution:
          "独立完成课程详情页改版，交付 6 个页面和 23 个缺陷修复，参与每周代码评审。",
        result: "首屏时间从 5.2 秒降到 1.8 秒，页面跳出率下降约 18%。",
        metrics: [
          { label: "首屏时间", value: "5.2s → 1.8s" },
          { label: "交付页面", value: "6 个" },
          { label: "修复缺陷", value: "23 个" },
        ],
        evidence: [
          { label: "实习证明" },
          { label: "代码仓库", url: "https://example.com/intern-repo" },
        ],
        skills: ["React", "TypeScript", "性能优化", "Git"],
        tags: ["实习", "前端"],
        confidence: "high",
        source: "sample",
      },
      61,
    ),
    sample(
      {
        id: "sample-exp-design-map",
        kind: "design",
        title: "校园地图小程序视觉改版",
        org: "校学生会 · 新媒体中心",
        start: "2026-04",
        end: "2026-05",
        problem:
          "旧版校园地图信息层级混乱，新生找不到教学楼和食堂，问路消息占后台咨询的一半。",
        method:
          "访谈 8 位新生，重排信息层级；用 Figma 建立颜色、字号和图标规范，按场景拆成上课、吃饭、办事三条路线。",
        contribution:
          "负责整体视觉与 8 个页面的高保真设计，输出组件规范并和开发同学对接标注。",
        result:
          "新版上线后地图页停留时长提升，后台问路类消息减少约三成。",
        metrics: [
          { label: "改版页面", value: "8 个" },
          { label: "访谈新生", value: "8 位" },
        ],
        evidence: [
          { label: "Figma 设计稿", url: "https://example.com/campus-map" },
        ],
        skills: ["Figma", "视觉设计", "组件规范", "用户访谈"],
        tags: ["作品", "校园服务"],
        confidence: "high",
        source: "sample",
      },
      96,
    ),
    sample(
      {
        id: "sample-exp-research-book",
        kind: "research",
        title: "大创项目：校园二手书循环平台",
        org: "创新创业学院 · 校级立项",
        start: "2025-10",
        end: "2026-06",
        problem:
          "每学期末大量教材被当废纸卖掉，新学期又要重新买，缺少可信的校内流转渠道。",
        method:
          "先做 18 位同学的访谈和问卷，确定「同校认证 + 面交」的核心流程；用 Figma 做可点击原型，再和队友实现小程序 MVP。",
        contribution:
          "负责需求调研、信息架构和原型设计，主持 3 次可用性测试，并根据反馈改了 9 个页面。",
        result:
          "项目通过中期检查，原型在 2 个班级试用，累计发布 46 本教材。",
        metrics: [
          { label: "访谈用户", value: "18 人" },
          { label: "原型页面", value: "9 个" },
          { label: "试用发布", value: "46 本" },
        ],
        evidence: [
          { label: "立项书" },
          { label: "可点击原型", url: "https://example.com/book-prototype" },
        ],
        skills: ["用户访谈", "Figma", "需求分析", "可用性测试"],
        tags: ["科研", "大创", "校园服务"],
        confidence: "high",
        source: "sample",
      },
      180,
    ),
    sample(
      {
        id: "sample-exp-volunteer-phone",
        kind: "volunteer",
        title: "社区老年人智能手机课堂",
        org: "青年志愿者协会 · 紫阳社区",
        start: "2024-11",
        end: "2024-12",
        problem:
          "社区老人不会用手机挂号、乘车码和视频通话，遇到问题只能等子女周末回来。",
        method:
          "把常用操作拆成 4 节课，每节课配一张大字步骤卡；采用「一人讲、一人陪练」的方式，课后留电话答疑。",
        contribution:
          "负责课程设计和 2 节课主讲，编写 4 张步骤卡，和 6 位志愿者一起完成陪练。",
        result:
          "4 场课堂共有 36 人次参加，课后回访中 8 位老人能独立完成挂号。",
        metrics: [
          { label: "授课场次", value: "4 场" },
          { label: "参与", value: "36 人次" },
        ],
        evidence: [{ label: "活动记录" }],
        skills: ["沟通", "活动组织", "课程设计"],
        tags: ["志愿", "社会实践"],
        confidence: "high",
        source: "sample",
      },
      300,
    ),
  ];

  return {
    experiences,
    updatedAt: new Date().toISOString(),
    sourceLabel: "示例经历",
  };
}
