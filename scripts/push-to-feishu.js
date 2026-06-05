#!/usr/bin/env node
/**
 * 飞书消息推送脚本（智能体/应用机器人方式）
 * 通过飞书 Open API 将 AI 技术日报推送到指定群聊
 *
 * 鉴权方式：app_id + app_secret → tenant_access_token → 调用消息 API
 *
 * 使用方式:
 *   node scripts/push-to-feishu.js --type card --file reports/ai-daily/2026-06-05.md
 *   或通过管道传入内容:
 *   cat report.md | node scripts/push-to-feishu.js --type text
 *
 * 配置 (.claude/settings.json):
 *   - feishuAppId     飞书应用的 App ID
 *   - feishuAppSecret 飞书应用的 App Secret
 *   - feishuChatId    目标群聊的 chat_id（或用户 open_id）
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ===== Token 缓存 =====
let cachedToken = null;
let tokenExpireAt = 0;

// ===== 读取配置 =====
function loadConfig() {
  const settingsPath = path.join(__dirname, "..", ".claude", "settings.json");
  if (!fs.existsSync(settingsPath)) {
    console.error("❌ 未找到 .claude/settings.json，请先配置飞书应用凭证");
    process.exit(1);
  }
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

  const { feishuAppId, feishuAppSecret, feishuChatId } = settings;

  // 校验必填字段
  const missing = [];
  if (!feishuAppId || feishuAppId.includes("xxx")) missing.push("feishuAppId");
  if (!feishuAppSecret || feishuAppSecret.includes("xxx")) missing.push("feishuAppSecret");
  if (!feishuChatId || feishuChatId.includes("xxx")) missing.push("feishuChatId");

  if (missing.length > 0) {
    console.error(`❌ 缺少有效配置: ${missing.join(", ")}`);
    console.error("   请在 .claude/settings.json 中填入飞书应用的 App ID、App Secret 和目标 Chat ID");
    console.error("   获取方式: 飞书开放平台 https://open.feishu.cn → 创建自建应用 → 开启机器人能力");
    process.exit(1);
  }

  return { appId: feishuAppId, appSecret: feishuAppSecret, chatId: feishuChatId };
}

// ===== 获取 tenant_access_token =====
function getTenantAccessToken(appId, appSecret) {
  return new Promise((resolve, reject) => {
    // 检查缓存（提前 5 分钟过期，安全余量）
    if (cachedToken && Date.now() < tokenExpireAt - 300000) {
      console.log("♻️  使用缓存的 tenant_access_token");
      return resolve(cachedToken);
    }

    console.log("🔑 正在获取 tenant_access_token...");
    const body = JSON.stringify({ app_id: appId, app_secret: appSecret });
    const options = {
      hostname: "open.feishu.cn",
      path: "/open-apis/auth/v3/tenant_access_token/internal",
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 && result.tenant_access_token) {
            cachedToken = result.tenant_access_token;
            // expire 单位是秒，转为毫秒
            tokenExpireAt = Date.now() + (result.expire || 7200) * 1000;
            console.log("✅ 获取 tenant_access_token 成功");
            resolve(cachedToken);
          } else {
            reject(new Error(`获取 token 失败: ${data}`));
          }
        } catch (e) {
          reject(new Error(`解析 token 响应失败: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ===== 发送消息到飞书 =====
function sendMessage(token, chatId, msgType, content) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      receive_id: chatId,
      msg_type: msgType,
      content: typeof content === "string" ? content : JSON.stringify(content),
    });

    const options = {
      hostname: "open.feishu.cn",
      path: `/open-apis/im/v1/messages?receive_id_type=chat_id`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            console.log(`✅ 消息发送成功，message_id: ${result.data?.message_id || "N/A"}`);
            resolve(result);
          } else {
            reject(new Error(`飞书 API 返回错误 (code=${result.code}): ${result.msg}`));
          }
        } catch (e) {
          reject(new Error(`解析消息响应失败: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ===== 解析命令行参数 =====
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { type: "card", file: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && args[i + 1]) opts.type = args[++i];
    else if (args[i] === "--file" && args[i + 1]) opts.file = args[++i];
    else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
飞书消息推送脚本（智能体/应用机器人）

用法: node push-to-feishu.js [选项]

选项:
  --type <card|text>   消息类型，默认 card（富文本卡片）
  --file <path>        要推送的 Markdown 文件路径
  --help, -h           显示帮助

从文件推送:
  node push-to-feishu.js --type card --file reports/ai-daily/2026-06-05.md

通过管道推送:
  cat report.md | node push-to-feishu.js --type text

前置配置 (.claude/settings.json):
  {
    "feishuAppId": "cli_xxx",        // 飞书应用 App ID
    "feishuAppSecret": "xxx",        // 飞书应用 App Secret
    "feishuChatId": "oc_xxx"         // 目标群聊 chat_id
  }
`);
      process.exit(0);
    }
  }
  return opts;
}

// ===== 读取内容 =====
function readContent(opts) {
  if (opts.file) {
    if (!fs.existsSync(opts.file)) {
      console.error(`❌ 文件不存在: ${opts.file}`);
      process.exit(1);
    }
    return fs.readFileSync(opts.file, "utf-8");
  }
  // 从 stdin 读取
  return fs.readFileSync(0, "utf-8");
}

// ===== Markdown 解析为飞书卡片 =====
function parseMarkdownToCard(md) {
  const lines = md.split("\n");
  const sections = [];
  let currentSection = { title: "", articles: [], highlights: [] };
  let inTable = false;
  let tableHeader = false;

  for (const line of lines) {
    const h1Match = line.match(/^# 🤖 (.+)/);
    if (h1Match) {
      sections.push({ type: "title", content: h1Match[1] });
      continue;
    }

    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      if (currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: h2Match[1], articles: [], highlights: [] };
      inTable = false;
      continue;
    }

    const quoteMatch = line.match(/^> (.+)/);
    if (quoteMatch && currentSection.title && currentSection.articles.length === 0 && currentSection.highlights.length === 0) {
      currentSection.subtitle = quoteMatch[1];
      continue;
    }

    // 解析列表项（用于今日亮点等板块）
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch && !inTable) {
      const content = bulletMatch[1];
      // 尝试提取 markdown 链接 [text](url) — 描述
      const linkMatch = content.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      const desc = linkMatch ? linkMatch[2] : "";
      const textPart = linkMatch ? linkMatch[1] : content;
      // 从文本中提取链接
      const mdLinkMatch = textPart.match(/\[(.+?)\]\((.+?)\)/);
      currentSection.highlights.push({
        title: mdLinkMatch ? mdLinkMatch[1] : textPart.replace(/\*\*/g, ""),
        url: mdLinkMatch ? mdLinkMatch[2] : "",
        description: desc,
        rawText: content,
      });
      continue;
    }

    if (line.startsWith("|---")) {
      inTable = true;
      continue;
    }
    if (line.startsWith("| # |")) {
      inTable = true;
      tableHeader = false;
      continue;
    }

    if (inTable && !tableHeader) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 4) {
        const titleMatch = cells[1].match(/\[(.+)\]\((.+)\)/);
        currentSection.articles.push({
          title: titleMatch ? titleMatch[1] : cells[1],
          url: titleMatch ? titleMatch[2] : "",
          source: cells[2] || "",
          summary: cells[3] || "",
        });
      }
    }

    if (line.trim() === "" && inTable) {
      inTable = false;
    }
  }

  if (currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

// ===== 构建飞书卡片内容（仅 content 部分，不含外层消息封装） =====
function buildCardContent(sections) {
  const headerTitle = sections.find((s) => s.type === "title");
  const title = headerTitle ? headerTitle.content : "AI 技术日报";
  const contentSections = sections.filter((s) => s.type !== "title");
  const elements = [];

  for (let i = 0; i < contentSections.length; i++) {
    const sec = contentSections[i];

    if (i > 0) {
      elements.push({ tag: "hr" });
    }

    // 根据标题选择图标
    let emoji = "📄";
    if (sec.title.includes("亮点")) emoji = "🔥";
    else if (sec.title.includes("技术文章")) emoji = "📚";
    else if (sec.title.includes("测试")) emoji = "🧪";
    else if (sec.title.includes("资讯")) emoji = "📰";

    let mdContent = `**${emoji} ${sec.title}**\n`;
    if (sec.subtitle) {
      mdContent += `> ${sec.subtitle}\n`;
    }
    mdContent += "\n";

    // 渲染亮点列表（bullet 格式）
    if (sec.highlights.length > 0) {
      for (let j = 0; j < sec.highlights.length; j++) {
        const h = sec.highlights[j];
        if (h.url) {
          mdContent += `• **[${h.title}](${h.url})**`;
        } else {
          mdContent += `• **${h.title}**`;
        }
        if (h.description) {
          mdContent += ` — ${h.description}`;
        }
        mdContent += "\n";
      }
    }
    // 渲染表格文章列表（编号格式）
    else if (sec.articles.length > 0) {
      for (let j = 0; j < sec.articles.length; j++) {
        const a = sec.articles[j];
        const link = a.url ? `**[${a.title}](${a.url})**` : `**${a.title}**`;
        mdContent += `${j + 1}. ${link} | ${a.source}\n`;
        if (a.summary) {
          mdContent += `   ${a.summary}\n`;
        }
      }
    } else {
      mdContent += "暂无相关文章\n";
    }

    elements.push({
      tag: "div",
      text: { tag: "lark_md", content: mdContent },
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: `🤖 ${title}` },
      template: "blue",
    },
    elements: [
      ...elements,
      { tag: "hr" },
      {
        tag: "note",
        elements: [
          {
            tag: "plain_text",
            content: `🤖 本报告由 Claude 自动生成 | 推送时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          },
        ],
      },
    ],
  };
}

// ===== 构建纯文本内容（降级方案） =====
function buildTextContent(md) {
  let text = md
    .replace(/^# /gm, "")
    .replace(/^## /gm, "【")
    .replace(/\n> /g, "\n")
    .replace(/\|/g, " ")
    .replace(/---/g, "——————————————");

  text = text.replace(/^【(.+)$/gm, "【$1】");

  return { text: text.substring(0, 15000) };
}

// ===== 主流程 =====
async function main() {
  const config = loadConfig();
  const opts = parseArgs();
  const content = readContent(opts);

  console.log(`📤 准备推送${opts.file ? `文件: ${opts.file}` : "管道内容"} 到飞书...`);

  // 构建消息内容
  let msgType, msgContent;
  if (opts.type === "card") {
    const sections = parseMarkdownToCard(content);
    msgType = "interactive";
    msgContent = buildCardContent(sections);
  } else {
    msgType = "text";
    msgContent = buildTextContent(content);
  }

  try {
    // 1. 获取 token
    const token = await getTenantAccessToken(config.appId, config.appSecret);

    // 2. 发送消息
    await sendMessage(token, config.chatId, msgType, msgContent);

    console.log("✅ 飞书推送成功！");
  } catch (err) {
    console.error(`❌ 飞书推送失败: ${err.message}`);
    process.exit(1);
  }
}

main();
