# AI 技术文章每日推送

每日自动搜索并聚合 AI 领域最新技术文章、AI+测试文章、AI 资讯，推送到飞书群。

## 触发方式

- 手动触发：`/ai-tech-news`
- 自动触发：每日定时任务（通过 `/loop` 或 Cron）

## 执行流程

### 第一步：并行搜索

使用 WebSearch 并行搜索以下三个类别的文章。**每个类别使用 3-4 个不同角度的搜索词**，以获取更全面的覆盖：

#### 类别一：AI 最新技术文章
搜索词（英文 + 中文）：
1. `latest AI technology breakthrough research 2026`
2. `AI new techniques architecture design 2026`
3. `最新AI技术突破 2026`

#### 类别二：AI 与测试相关文章
搜索词（英文 + 中文）：
1. `AI software testing automation latest 2026`
2. `AI quality assurance test generation 2026`
3. `人工智能 软件测试 自动化 最新`

#### 类别三：AI 最新资讯
搜索词（英文 + 中文）：
1. `AI industry news announcements June 2026`
2. `artificial intelligence company product launch 2026`
3. `AI regulation policy news 2026`
4. `AI行业动态 最新资讯 2026`

### 第二步：精选与筛选

从搜索结果中，每个类别挑选 **5-8 篇**最有价值的文章，优先选择：
- 知名来源（ArXiv, MIT, Stanford, Google AI, OpenAI, DeepMind, Meta AI, 机器之心, 量子位 等）
- 近 7 天内发布
- 有实质内容（非纯广告/公关稿）

### 第三步：格式化报告

生成如下格式的 Markdown 报告：

```markdown
# 🤖 AI 技术日报 — {YYYY-MM-DD}

---

## 🔥 今日亮点

- 🧠 **亮点标题**：[文章标题](链接) — 一句话说明为什么重要
- ⚠️ **亮点标题**：[文章标题](链接) — 一句话说明为什么重要
- 💉 **亮点标题**：[文章标题](链接) — 一句话说明为什么重要
- 🧪 **亮点标题**：[文章标题](链接) — 一句话说明为什么重要
- 🍎 **亮点标题**：[文章标题](链接) — 一句话说明为什么重要

---

## 📚 AI 最新技术文章
> 深度技术内容：论文解读、架构设计、技术突破

| # | 标题 | 来源 | 摘要 |
|---|------|------|------|
| 1 | [标题](链接) | 来源 | 一句话摘要 |

---

## 🧪 AI 与测试
> AI 在测试领域的应用与实践

| # | 标题 | 来源 | 摘要 |
|---|------|------|------|
| 1 | [标题](链接) | 来源 | 一句话摘要 |

---

## 📰 AI 最新资讯
> 行业动态、产品发布、政策法规

| # | 标题 | 来源 | 摘要 |
|---|------|------|------|
| 1 | [标题](链接) | 来源 | 一句话摘要 |

---

> 🤖 本报告由 Claude 自动生成 | 推送时间：{time}
```

### 第四步：推送到飞书

使用飞书 Open API（应用机器人 / 智能体方式）。从 `.claude/settings.json` 读取 `feishuAppId`、`feishuAppSecret`、`feishuChatId`。

#### 方式一：使用 push-to-feishu.js 脚本（推荐）

先保存 Markdown 报告文件，然后调用脚本：

```bash
node scripts/push-to-feishu.js --type card --file reports/ai-daily/{YYYY-MM-DD}.md
```

脚本会自动完成：
1. 用 `app_id` + `app_secret` 调用 `/open-apis/auth/v3/tenant_access_token/internal` 获取 token
2. 用 token 调用 `/open-apis/im/v1/messages?receive_id_type=chat_id` 发送卡片消息
3. token 自动缓存，2 小时内复用以减少 API 调用

#### 方式二：直接调用飞书 Open API

如果无法使用 Node.js，直接用 Bash curl 两步发送：

**第一步：获取 token**
```bash
TOKEN=$(curl -s -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"app_id":"{feishuAppId}","app_secret":"{feishuAppSecret}"}' | \
  jq -r '.tenant_access_token')
```

**第二步：发送消息**
```bash
curl -s -X POST "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "receive_id": "{feishuChatId}",
    "msg_type": "interactive",
    "content": "{卡片 JSON 字符串（需转义）}"
  }'
```

#### 飞书卡片 content 格式

卡片 JSON 放在 `content` 字段内（作为 JSON 字符串，需要转义双引号）。卡片结构如下：

```json
{
  "config": { "wide_screen_mode": true },
  "header": {
    "title": { "tag": "plain_text", "content": "🤖 AI 技术日报 — {日期}" },
    "template": "blue"
  },
  "elements": [
    {
      "tag": "div",
      "text": {
        "tag": "lark_md",
        "content": "**📚 AI 最新技术文章**\n> 深度技术内容：论文解读、架构设计、技术突破\n\n1. **[文章标题](链接)** | 来源\n   摘要内容\n"
      }
    },
    { "tag": "hr" },
    ...其他分类和底部 note
  ]
}
```

> 完整卡片格式参考 `scripts/push-to-feishu.js` 中的 `buildCardContent()` 函数。
```

#### 飞书消息长度限制

- 飞书卡片内容总长不超过 30KB
- 如果文章数量过多导致超长，每个类别精简到 5 篇
- 摘要控制在 50 字以内

### 第五步：保存日报

将生成的 Markdown 报告保存到 `reports/ai-daily/{YYYY-MM-DD}.md`，方便回顾。

### 第六步：输出确认

向用户展示：
- 本次搜索到了多少篇文章
- 精选后推送了多少篇
- 飞书推送是否成功
- 报告保存路径

## 错误处理

1. **搜索无结果**：标注"今日暂无相关新文章"，仍然推送（告知群友今日无更新）
2. **飞书推送失败**：显示错误信息，将报告内容直接输出到对话中作为降级方案
3. **网络超时**：单次搜索超时 30 秒，超时后跳过该搜索词继续其他搜索

## 配置

在 `.claude/settings.json` 中配置：

```json
{
  "feishuAppId": "cli_xxxxxxxxxxxxxxxx",
  "feishuAppSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "feishuChatId": "oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 如何获取这些凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/app) 创建一个**自建应用**（或使用已有的飞书智能体）
2. 在「凭证与基础信息」页面获取 **App ID** 和 **App Secret**
3. 在「应用功能」中开启 **机器人** 能力
4. 在「权限管理」中添加权限：**获取与发送单聊、群组消息** (`im:message`) 或 **以应用的身份发消息** (`im:message:send_as_bot`)
5. 发布应用（创建版本并发布，让配置生效）
6. 将机器人添加到目标飞书群中
7. 获取群聊的 chat_id：
   - 方式一：在飞书群设置中查看群 ID
   - 方式二：调用[获取群列表 API](https://open.feishu.cn/document/server-docs/im-v1/chat/list)

> ⚠️ 首次使用前必须完成以上配置，否则推送不会生效。
