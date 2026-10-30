# 学径 StudyTrack · A4 打印规范（推荐类型：Specific Files）

> 文件匹配：`src/styles/**`、`src/components/PrintSheet*`、`src/components/ResumeSheet*`
> 触发场景：改简历/作品集排版、加字段、调打印样式时。

## 硬约束

1. **只用浏览器打印**：`window.print()`；禁止服务端无头浏览器、禁止引入 pdf 生成库。
2. **A4 一页**：`@page { size: A4; margin: 16mm; }`；内容溢出时必须自动缩字号或提示"请删减"，不能出现第二页只剩一行。
3. **打印时隐藏一切 UI**：导航、按钮、工具栏、hover 效果、阴影，用 `@media print` 统一处理。
4. **只在打印页出现的元素**加 `.print-only`；只在屏幕出现的加 `.screen-only`。
5. **字体**：正文用系统中文字体栈（`"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`），不加载远程字体。
6. **颜色**：打印用纯黑白灰 + 一条主题色分隔线；避免大面积底色（省墨、专业）。
7. **分页控制**：每段经历 `break-inside: avoid;`；标题不与内容分离（`break-after: avoid`）。
8. **可访问性**：字号不小于 10pt，行高 ≥1.45；链接在打印时显示完整 URL（可选）。
9. **空字段不打印**：没有内容的栏目整块隐藏，不留空标题。
10. **验收**：Chrome 打印预览为 1 页 A4；字段顺序为「基本信息 → 教育 → 经历（倒序）→ 技能 → 作品链接」。

## 反模式

- 用固定像素高度硬撑版面（换字号就崩）→ 用 `rem` + `@page` 尺寸。
- 为了"好看"加背景图/渐变 → 打印出来是黑块。
- 把作品集页做成 PDF 附件下载 → 一律走打印或分享链接。
