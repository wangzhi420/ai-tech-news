# CHANGELOG

## 2026-06-06

### Added
- **公众号文章生成功能**：在 `/ai-tech-news` Skill 新增第七步，逐篇 WebFetch 原文 → 生成 150-300 字中文深度摘要 → 按「8点1氪」风格整合为公众号文章
- 新增 `reports/wechat/` 目录，公众号文章按 `YYYY-MM-DD.md` 格式存档
- 公众号文章通过 `push-to-feishu.js --type text` 同步推送到飞书群

### Fixed
- **修复飞书推送表格解析 bug**：`push-to-feishu.js` 中分隔线 `|---|` 错误地将 `tableHeader` 重置为 `true`，导致所有表格数据行被跳过，卡片中三个栏目（AI 最新技术文章、AI 与测试、AI 最新资讯）均显示「暂无相关文章」。移除分隔线处理中的 `tableHeader = true`，仅保留 `inTable = true`。

### Added
- 初始化 Git 仓库，关联 GitHub 远程仓库
- 新增 `.gitignore`，排除飞书凭证、定时任务运行时状态等敏感文件

## 2026-06-05

### Added
- 首版 AI 技术日报自动生成与飞书推送系统
- `/ai-tech-news` Skill：三类别并行搜索 → 精选 → Markdown 报告 → 飞书卡片推送 → 本地存档
- `scripts/push-to-feishu.js`：飞书 Open API 推送脚本，支持 interactive 卡片和 text 降级方案
- 每日 9:17 AM 定时任务
- `reports/ai-daily/` 目录，日报按 `YYYY-MM-DD.md` 格式存档
