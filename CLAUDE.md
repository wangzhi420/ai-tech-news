# CLAUDE.md — AI 技术日报项目

本项目是一个 AI 技术文章每日聚合推送系统，通过 Claude Code Skill + 飞书智能体（应用机器人）实现。

## 核心文件

- [.claude/skills/ai-tech-news.md](.claude/skills/ai-tech-news.md) — Skill 定义，包含完整的搜索→精选→格式化→推送流程
- [.claude/settings.json](.claude/settings.json) — 项目配置，存储 feishuAppId / feishuAppSecret / feishuChatId
- [scripts/push-to-feishu.js](scripts/push-to-feishu.js) — 飞书推送脚本，使用 Open API 鉴权（app_id → tenant_access_token → 发消息）
- [reports/ai-daily/](reports/ai-daily/) — 每日报告存档目录

## 如何工作

1. 用户输入 `/ai-tech-news` 或定时任务触发
2. Claude 按照 Skill 定义并行搜索三个类别的文章（AI技术文章 / AI+测试 / AI资讯）
3. 精选 5-8 篇/类别，生成 Markdown 报告
4. 通过飞书 Open API 推送 interactive 卡片消息到群（app_id + app_secret 获取 token）
5. 报告存档到 reports/ai-daily/YYYY-MM-DD.md

## 推送鉴权流程

1. `app_id` + `app_secret` → POST `/open-apis/auth/v3/tenant_access_token/internal` → 获取 `tenant_access_token`（2h 有效）
2. `tenant_access_token` → POST `/open-apis/im/v1/messages?receive_id_type=chat_id` → 发送消息到群
3. token 由 push-to-feishu.js 脚本自动缓存，过期前复用以减少 API 调用

## 定时任务

- Cron: `17 9 * * *` (每日北京时间 9:17 AM)
- 7 天自动过期，需定期续期（对 Claude 说「重新设置每日AI推送」）

## 飞书推送方式

- 主方案：飞书 interactive 卡片（通过 Open API `msg_type: "interactive"`）
- 降级方案：飞书 text 纯文本消息（通过 Open API `msg_type: "text"`）
- 凭证配置在 [.claude/settings.json](.claude/settings.json)
