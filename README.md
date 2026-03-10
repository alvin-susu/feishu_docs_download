# 飞书知识库智能助手

OpenClaw × 飞书机器人智能联动插件，实现企业飞书知识库和对话的智能化管理。支持智能文档查询、历史对话分析、自动归档、会议协作等功能。

## 📚 完整文档

所有详细文档已移至 [**docs/** 文档目录](https://github.com/alvin-susu/feishu_docs_download/tree/main/docs)，包括：

- 📖 [用户配置指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USER-GUIDE.md) - 完整的安装配置教程
- 💬 [使用说明](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USAGE.md) - 功能使用指南
- 🔧 [调试指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/DEBUG-GUIDE.md) - 开发调试和问题排查
- 🔒 [安全指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/security/SECURITY-GUIDE.md) - 安全配置和最佳实践
- 📋 [更新日志](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/about/CHANGELOG.md) - 版本更新记录

👉 **查看 [文档中心索引](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/INDEX.md)** 获取完整文档列表

## 🎯 核心功能

| 功能 | 描述 | 使用场景 |
|------|------|----------|
| **智能文档定位** | 快速在知识库中查找文档，返回精准链接 | 员工询问目标文档位置 |
| **高效内容检索** | 智能搜索知识库内容，返回摘要与链接 | 咨询相关工作内容 |
| **历史对话分析** | 分析聊天记录，提取摘要、待办、决策 | 回顾会议内容、搜索历史消息 |
| **自动智能归档** | 创建文档并自动分类归档到指定位置 | 新建文档时自动分类 |
| **多账号管理** | 支持多个飞书机器人账号，数据隔离 | 管理多个部门知识库 |

## 🚀 快速开始

### 环境要求

- **OpenClaw**: 2026.3.8+ (最低兼容版本)
- **飞书开放平台权限**: 需申请相关接口权限
- **Node.js**: 16+ (本地调试需要)

### 安装方式

**通过 ClawHub 安装（推荐）**
```bash
# 安装插件
clawhub install feishu-docs-assistant

# 重启 OpenClaw
openclaw
```

**本地运行（调试模式）**
```bash
# 克隆项目
git clone https://github.com/alvin-susu/feishu_docs_download.git
cd feishu_docs_download

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入飞书机器人配置

# 启动调试模式
DEBUG=true npm start
```

### 配置说明

创建 `.env` 文件或设置环境变量：

```bash
# 必需配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxx
ENCRYPTION_KEY=your_generated_encryption_key
```

生成加密密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 飞书权限配置

访问 [飞书开放平台](https://open.feishu.cn/) 配置以下权限：

| 权限 Scope | 用途 |
|------------|------|
| `im:message:readonly` | 接收消息 |
| `im:message:send_as_bot` | 发送消息 |
| `im:chat:readonly` | 获取聊天信息 |
| `wiki:wiki:readonly` | 读取知识库 |
| `docx:document:readonly` | 读取文档 |
| `docx:document:create` | 创建文档 |
| `wiki:node:write` | 写入知识库 |

## 📖 使用指南

### 基本命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `/help` | 显示帮助信息 | `/help` |
| `/find <关键词>` | 查找文档 | `/find 入职指南` |
| `/search <关键词>` | 搜索内容 | `/search 年假政策` |
| `/create <标题>:<内容>` | 创建文档 | `/create 会议记录:讨论了...` |
| `/summary [数量]` | 分析对话 | `/summary 200` |
| `/meeting [数量]` | 会议记录 | `/meeting` |
| `/decision [数量]` | 决策提取 | `/decision 50` |
| `/history <关键词>` | 搜索历史 | `/history 项目` |
| `/stats [数量]` | 对话统计 | `/stats` |
| `/indexstats` | 索引统计 | `/indexstats` |

### 历史对话分析

**对话摘要**
```
/summary              # 分析最近100条消息
/summary 200          # 分析最近200条消息
```

**会议记录**
```
/meeting              # 提取会议相关内容
/decision             # 提取决策内容
```

**历史搜索**
```
/history 项目         # 搜索包含"项目"的消息
/stats                # 对话统计信息
```

### 自然语言交互

除了命令格式，也支持自然语言交互：

**文档查找**
```
"入职文档在哪里"
"查找年假政策文档"
```

**内容搜索**
```
"搜索关于报销流程的内容"
"关于考勤制度有什么信息"
```

**创建文档**
```
"新建会议记录：讨论了Q1计划"
"创建需求文档：用户反馈的功能需求"
```

### 使用示例

**场景一：快速查询文档**
```
用户: 入职指南在哪里？
助手: 📄 已为您找到入职指南文档
📗 文档位置：行政文档/新人培训/入职指南
🔗 文档链接：https://xxx.feishu.cn/doc/xxx
```

**场景二：内容搜索**
```
用户: 年假政策是什么？
助手: 📚 关于年假政策的核心内容：
• 工作满1年：享受5天年假
• 工作满3年：享受10天年假
• 工作满5年：享受15天年假
📖 详细文档：人事制度/假期管理/年假制度
```

**场景三：历史对话分析**
```
用户: /summary
助手: 📊 对话分析摘要
• 参与人数: 5人
• 讨论话题: 项目进度、技术方案、时间安排
• 主要待办: 3项
• 决策事项: 2项
```

## 🔧 开发指南

### 项目结构

```
feishu_docs_download/
├── src/
│   ├── bot/
│   │   └── FeishuBot.js              # 飞书机器人核心类
│   ├── handlers/
│   │   └── MessageHandler.js          # 消息处理器
│   ├── features/
│   │   ├── DocumentLocator.js         # 文档定位
│   │   ├── ContentSearcher.js         # 内容搜索
│   │   ├── AutoArchiver.js            # 自动归档
│   │   ├── MeetingAssistant.js        # 会议助手
│   │   └── ConversationSummarizer.js  # 对话分析
│   ├── core/
│   │   ├── BotAccountManager.js       # 多账号管理
│   │   ├── MultiAccountIndexer.js     # 多账号索引
│   │   ├── PermissionChecker.js       # 权限检查
│   │   └── WikiIndexer.js             # 知识库索引
│   ├── services/
│   │   └── DocumentService.js         # 文档服务
│   ├── api/
│   │   └── plugin-api.js              # 插件API
│   └── index.js                        # 主入口
├── scripts/
│   ├── account-cli.js                 # 账号管理CLI
│   ├── batch-download-fixed.js        # 批量下载
│   └── ...                            # 其他工具脚本
├── docs/                              # 文档目录
└── README.md
```

### 核心技术要点

**1. 多账号隔离**
- 不同机器人账号索引完全隔离
- 切换账号时仅加载对应索引
- AES-256加密存储账号信息

**2. 轻量化索引**
- 仅缓存文档标题、目录、关键词
- 避免全文缓存，降低存储消耗
- 支持7天自动增量更新

**3. 按需读取**
- 根据用户指令精准定位目标
- 仅读取必要的文档内容
- 大幅降低响应时间

## 🛠️ 故障排除

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 机器人绑定失败 | AppID/AppSecret 错误 | 核对飞书开放平台配置 |
| 权限不足提示 | 缺少必需的飞书权限 | 参考权限配置清单申请权限 |
| 文档检索无结果 | 索引未构建 | 执行 `/index` 重建索引 |
| 历史消息读取失败 | 缺少聊天权限 | 申请 `im:chat:readonly` 权限 |

## 📊 性能优化

- **响应时长**: ≤ 3 秒 (符合 ClawHub 规范)
- **内存占用**: 符合 OpenClaw 插件标准
- **索引策略**: 轻量化索引 + 增量更新
- **数据隔离**: 多账号完全独立，避免混淆

## 🔒 安全与合规

### 数据安全

- ✅ **本地加密存储**: AES-256加密保护敏感信息
- ✅ **权限最小化**: 仅申请必要的飞书权限
- ✅ **数据隔离**: 不同账号数据完全隔离
- ✅ **不远程收集**: 不收集、不上传用户数据

### 合规要求

- ✅ **目录结构规范**: 遵循 OpenClaw Skill 标准
- ✅ **配置文件规范**: skill.json 完整填写
- ✅ **安全合规**: 无恶意代码，本地化处理
- ✅ **性能规范**: 符合 OpenClaw 标准

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/alvin-susu/feishu_docs_download.git

# 安装依赖
cd feishu_docs_download
npm install

# 配置环境变量
cp .env.example .env

# 启动调试模式
DEBUG=true npm start
```

### 代码规范

- 使用 CommonJS 模块系统 (`require` / `module.exports`)
- 遵循 ESLint 配置规范
- 添加详细的 JSDoc 注释

## 📝 更新日志

### v2.1.3 (2026-03-10)
- 🔄 集成 OpenClaw 内置权限管理
- 🔒 改用管理者权限(full)
- 🧹 优化代码结构

### v2.1.1 (2026-03-08)
- ✨ 历史对话分析功能
- 👥 多账号管理优化
- 🐛 数据格式兼容性修复

### v2.0.0 (2026-03-08)
- ✨ 多账号管理功能
- 🔒 安全审计和加固
- 📚 文档结构优化

## 📄 许可证

MIT License

## 🔗 相关链接

- [OpenClaw 文档](https://docs.openclaw.ai)
- [飞书开放平台](https://open.feishu.cn/)
- [项目源码](https://github.com/alvin-susu/feishu_docs_download)

---

> **注**: 本项目作为 OpenClaw Skill 运行，所有数据处理均在企业内部环境完成，不上传至第三方服务器，确保企业数据安全。
