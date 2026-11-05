import type { ThemeId } from "../lib/theme";
import { THEMES } from "../lib/theme";

export type GuideRoute =
  | "today"
  | "experiences"
  | "opportunities"
  | "toolbox"
  | "space"
  | "resume";

export type GuideWindow =
  | "timetable"
  | "assignments"
  | "resume"
  | "calendar";

export interface SiteGuide {
  id: string;
  title: string;
  aliases: string[];
  steps: string[];
  route?: GuideRoute;
  window?: GuideWindow;
}

/**
 * 站内功能卡是记录官唯一的知识来源：每条都对应真实存在的按钮与路径。
 * 不用模型自由发挥，查不到就说查不到，避免指错地方。
 */
export const SITE_GUIDE: SiteGuide[] = [
  {
    id: "theme",
    title: "换主题配色",
    aliases: ["换主题", "主题", "配色", "皮肤", "霞光", "夜间", "庄园", "深色", "浅色"],
    steps: [
      "看界面右上角的 <配色> 按钮 按钮上写着当前主题",
      "点一次换下一套 霞光 → 夜间 → 庄园 一直循环",
      "想直接到某一套 说一句 换到庄园 我替你切",
    ],
  },
  {
    id: "cursor",
    title: "开关主题光标",
    aliases: ["光标", "指针", "鼠标样式", "主题光标"],
    steps: [
      "点顶栏中间的存档胶囊",
      "展开面板里找 <主题光标> 开关",
      "关掉后所有指针回到系统样式",
    ],
  },
  {
    id: "model",
    title: "接入自己的模型",
    aliases: ["模型", "Key", "API", "接入", "大模型", "密钥"],
    steps: [
      "点顶栏中间的存档胶囊",
      "在 <模型接入> 里点 <填 Key>",
      "选服务商 填 Base URL 与 Key 后保存",
      "Key 只留在这台浏览器 不进备份也不进导出的 JSON",
    ],
  },
  {
    id: "backup",
    title: "备份与换设备",
    aliases: ["备份", "导出备份", "导入备份", "导出数据", "换设备", "JSON"],
    steps: [
      "点顶栏中间的存档胶囊",
      "展开 <本机数据>",
      "点 <导出备份> 存成 JSON 换设备后再导入",
    ],
  },
  {
    id: "clear",
    title: "清除本机数据",
    aliases: ["清除", "清空", "删除数据", "重置", "退出演示"],
    steps: [
      "点顶栏中间的存档胶囊",
      "展开 <本机数据>",
      "点 <清除本机数据> 连模型 Key 一起删",
    ],
  },
  {
    id: "jobLibrary",
    title: "扩展本机岗位库",
    aliases: ["岗位库", "加岗位", "存岗位", "粘贴 JD", "扩库", "JD"],
    steps: [
      "把整段岗位原文直接粘给记录官 公司 岗位名 任职要求都行",
      "我看到小标题和条目式短句就按 JD 拆要求 不改写原文",
      "确认后存进本机岗位库 征召页和演示卡一起排序",
    ],
  },
  {
    id: "inbox",
    title: "把碎片收进征途",
    aliases: ["碎片", "收件箱", "备注", "想法", "待办"],
    steps: [
      "点左侧栏 <征途>",
      "往下找到 <征途碎片收件箱>",
      "点碎片上的 <转成战绩> 再补四段",
    ],
  },
  {
    id: "experiences",
    title: "记一条战绩",
    aliases: ["征途", "战绩", "经历", "四段", "证据", "品质"],
    steps: [
      "点左侧栏 <征途>",
      "点 <记录一段经历> 按问题 方法 贡献 结果来写",
      "补上证据或数字 第 4 颗星才是简历就绪",
    ],
    route: "experiences",
  },
  {
    id: "opportunities",
    title: "去征召找岗位",
    aliases: ["征召", "岗位", "机会", "实习", "匹配", "投递", "招聘"],
    steps: [
      "点左侧栏 <征召>",
      "先看官方入口 再看岗位卡与匹配分",
      "点 <粘贴 JD 匹配> 把整段岗位原文交给我",
    ],
    route: "opportunities",
  },
  {
    id: "resume",
    title: "打一份 A4 简历",
    aliases: ["简历", "A4", "打印", "PDF", "作品集", "排版"],
    steps: [
      "点 <工具箱> 里的 <简历>",
      "左侧勾选经历 右侧实时排 A4",
      "点 <打印 / 存为 PDF> 交给浏览器打印",
    ],
    window: "resume",
  },
  {
    id: "timetable",
    title: "导入课表",
    aliases: ["导入课表", "课表导入", "课表在哪", "课表", "Excel", "单双周", "教务", "上课"],
    steps: [
      "点 <工具箱> 里的 <课表>",
      "点 <导入 Excel 课表> 选教务导出的文件",
      "左右对照确认 单双周会自动展开",
    ],
    window: "timetable",
  },
  {
    id: "assignments",
    title: "录入作业与 DDL",
    aliases: ["导入作业", "录作业", "粘贴作业", "作业在哪", "作业", "DDL", "截止", "截图", "学习通"],
    steps: [
      "点 <工具箱> 里的 <作业>",
      "点 <粘贴文本> 或 <导入截图>",
      "读不到截止就留空 手动补上",
    ],
    window: "assignments",
  },
  {
    id: "calendar",
    title: "看竞赛与考试日历",
    aliases: ["日历", "竞赛", "考试", "校内", "报名"],
    steps: [
      "点 <工具箱> 里的 <日历>",
      "按竞赛 考试 校内节点切换",
      "点条目看报名时间与原文入口",
    ],
    window: "calendar",
  },
  {
    id: "space",
    title: "看留痕星图",
    aliases: ["学径空间", "星图", "星星", "星空", "点亮"],
    steps: [
      "点左侧栏 <学径空间>",
      "每天第一条留痕点亮一颗星 同一批数据位置不变",
      "点星看当天留痕 前一天后一天都能翻",
    ],
    route: "space",
  },
  {
    id: "today",
    title: "回到今日",
    aliases: ["今日", "简报", "委托", "节奏", "回声", "情报"],
    steps: [
      "宽屏点左侧栏 <今日> 窄屏点顶栏胶囊里的 <今日>",
      "主卡是简报 下面依次是委托 节奏 回声 情报",
      "完成作业或补一条战绩 留痕与绿格都会跟着动",
    ],
    route: "today",
  },
  {
    id: "profile",
    title: "改档案",
    aliases: ["建档", "档案", "年级", "专业", "目标岗位", "个人资料"],
    steps: [
      "点 <帮我建档> 或直接说 大二 人工智能 想找算法实习",
      "草稿里核对年级 专业 方向与技能",
      "确认后写进档案 征召的资格判定都以它为准",
    ],
  },
  {
    id: "command",
    title: "打开命令面板",
    aliases: ["命令面板", "搜索", "快捷跳转"],
    steps: [
      "按 Ctrl K 或 ⌘ K 打开命令面板",
      "输页面 工具或动作名",
      "回车直接跳过去",
    ],
  },
  {
    id: "agent",
    title: "叫出记录官",
    aliases: ["记录官", "助手", "你是什么", "你是谁"],
    steps: [
      "顶栏点 <记录官> 展开面板",
      "窄屏点右下角 <记> 圆形按钮",
      "写入前都会先给草稿 确认后才落库",
    ],
  },
  {
    id: "archive",
    title: "查自己做过什么",
    aliases: ["查战绩", "我做过", "哪些经历", "经历检索", "找经历"],
    steps: [
      "直接问我 例如 我做过哪些数据分析",
      "我只回你亲手写下的原文 并注明来自哪一段",
      "要改就去征途页改",
    ],
  },
  {
    id: "guide",
    title: "站内怎么用",
    aliases: ["怎么用", "怎么开始", "站内", "导航", "功能", "不会用", "介绍"],
    steps: [
      "五个面并列 今日 征途 征召 工具箱 学径空间",
      "查今天点 <今日> 记战绩点 <征途> 找岗位点 <征召>",
      "课表 作业 简历 日历都在 <工具箱> 留痕星图在 <学径空间>",
    ],
  },
];

function scoreGuide(text: string, guide: SiteGuide): number {
  const value = text.toLowerCase();
  let score = 0;
  for (const alias of guide.aliases) {
    if (alias && value.includes(alias.toLowerCase())) {
      score += Math.min(3, alias.length);
    }
  }
  return score;
}

/** 命中度最高的那张功能卡 2 分以下当作没命中 交给后面的意图链 */
export function findSiteGuide(text: string): SiteGuide | null {
  const value = text.trim();
  if (!value) return null;
  // 泛化卡（站内怎么用 / 叫出记录官）只在没有具体功能卡命中时出场
  const generic = new Set(["guide", "agent", "command"]);
  let specificScore = 0;
  for (const guide of SITE_GUIDE) {
    if (generic.has(guide.id)) continue;
    specificScore = Math.max(specificScore, scoreGuide(value, guide));
  }
  let best: SiteGuide | null = null;
  let bestScore = 0;
  for (const guide of SITE_GUIDE) {
    const raw = scoreGuide(value, guide);
    const score =
      generic.has(guide.id) && specificScore >= 2 ? raw - 2 : raw;
    if (score > bestScore) {
      best = guide;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

/** 问句与动作句才走站内引导 免得把「这周做了什么」这类查账抢走 */
export function looksLikeGuideQuestion(text: string): boolean {
  return (
    /(怎么|如何|在哪|哪里|哪个按钮|入口|不会|教我|指引|步骤)/.test(text) ||
    /(换|切|改|开|关|打开|进入|去).{0,6}(主题|配色|光标|模型|备份|数据|简历|课表|作业|日历|星图|岗位|经历|档案)/.test(
      text,
    ) ||
    /(主题|配色|光标|Key|API|备份|简历|课表|作业|日历|星图).{0,6}(在哪|怎么|按钮)/.test(
      text,
    )
  );
}

export function themeName(id: ThemeId): string {
  return THEMES.find((theme) => theme.id === id)?.name ?? "霞光";
}

/** 「换到庄园」「用夜间」这类点名主题的说法 */
export function explicitTheme(text: string): ThemeId | null {
  for (const theme of THEMES) {
    if (text.includes(theme.name)) return theme.id;
  }
  if (/(夜间|夜晚|深色|暗色|黑底)/.test(text)) return "night";
  if (/(浅色|亮色|白底)/.test(text)) return "dawn";
  return null;
}

export function explicitCursor(text: string): boolean | null {
  if (/(关|关闭|不要|去掉|禁用|取消)/.test(text) && /(光标|指针)/.test(text)) {
    return false;
  }
  if (/(开|开启|打开|恢复|启用)/.test(text) && /(光标|指针)/.test(text)) {
    return true;
  }
  return null;
}
