# AI 技术日报 — 飞书自动推送

每日自动搜索 AI 领域最新技术文章、AI+测试文章、AI 资讯，精选后通过**飞书智能体**推送到群聊。

## 项目结构

```
.
├── .claude/
│   ├── settings.json          # 项目配置（飞书应用凭证 + Chat ID）
│   ├── skills/
│   │   └── ai-tech-news.md    # Skill 定义文件
│   └── scheduled_tasks.json   # 定时任务配置
├── scripts/
│   └── push-to-feishu.js      # 飞书推送脚本（Open API 鉴权）
├── reports/
│   └── ai-daily/              # 每日报告存档
│       └── YYYY-MM-DD.md
└── README.md
```

## 快速开始

### 1. 创建飞书应用（智能体）

1. 访问 [飞书开放平台](https://open.feishu.cn/app)，点击「创建自建应用」
2. 填写应用名称（如：AI技术日报），创建后进入应用详情
3. 在「**凭证与基础信息**」页面，复制 **App ID** 和 **App Secret**
4. 在「**应用功能**」→「**机器人**」中，开启机器人能力
5. 在「**权限管理**」中，搜索并添加权限：`im:message`（获取与发送单聊、群组消息）或 `im:message:send_as_bot`（以应用身份发消息）
6. 在「**安全设置**」中，可选配置 IP 白名单等
7. 点击右上角「**创建版本**」→ 填写版本号 →「**保存**」→「**申请发布**」

### 2. 添加机器人到群聊

1. 打开目标飞书群 → 设置 → 添加机器人 → 搜索你的应用名称
2. 添加机器人到群中

### 3. 获取群聊 Chat ID

**方式一（推荐）**：飞书群里 @机器人 发一条消息，然后查看事件回调获取 chat_id。

**方式二**：通过 API 获取群列表（需要 `im:chat:readonly` 权限）：
```bash
curl -X GET "https://open.feishu.cn/open-apis/im/v1/chats" \
  -H "Authorization: Bearer {tenant_access_token}"
```

**方式三**：用飞书开发者后台的 API 调试工具，调用「获取用户或机器人所在的群列表」接口。

### 4. 配置项目

编辑 `.claude/settings.json`，填入你的凭证：

```json
{
  "feishuAppId": "cli_xxxxxxxxxxxxxxxx",
  "feishuAppSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "feishuChatId": "oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 5. 手动触发测试

在 Claude Code 中输入：

```
/ai-tech-news
```

### 6. 自动推送

每日 **9:17 AM**（北京时间）自动执行，结果推送到飞书群。

> ⚠️ 定时任务每 7 天自动过期，过期后需重新设置：在 Claude Code 中说「重新设置每日AI推送」。

## 推送内容

| 类别 | 说明 |
|------|------|
| 📚 AI 最新技术文章 | 深度技术内容：论文解读、架构设计、技术突破 |
| 🧪 AI 与测试 | AI 在测试领域的应用与实践 |
| 📰 AI 最新资讯 | 行业动态、产品发布、政策法规 |

## 搜索来源

优先收录来自以下来源的文章：
- **国际**：ArXiv, MIT, Stanford, Google AI, OpenAI, DeepMind, Meta AI, Anthropic
- **国内**：机器之心、量子位、新智元、AI科技评论

## 推送技术方案

- **鉴权**：飞书 Open API — `app_id` + `app_secret` → `tenant_access_token`（2 小时有效期，脚本自动缓存）
- **消息类型**：`interactive` 卡片（富文本格式，支持 Markdown、链接）
- **降级方案**：纯文本 `text` 消息
- **推送脚本**：`scripts/push-to-feishu.js`
