---
name: feishu-docs-assistant
description: OpenClaw × 飞书机器人智能联动插件，实现知识库智能查询、历史对话分析、自动归档、会议协作。支持多账号管理，本地加密存储。
homepage: https://github.com/alvin-susu/feishu_docs_download
metadata:
  clawdbot:
    emoji: "📚"
    requires:
      bins: ["node"]
      env: ["FEISHU_APP_ID", "FEISHU_APP_SECRET", "ENCRYPTION_KEY"]
    primaryEnv: "FEISHU_APP_ID"
---

# 飞书知识库智能助手

OpenClaw × 飞书机器人联动工具，通过智能命令和自然语言处理，实现企业飞书知识库和对话的智能化管理。

---

## 🌟 核心功能

### 📚 知识库管理
- **智能文档定位**: 快速在知识库中查找所需文档
- **高效内容检索**: 基于关键词和语义的智能搜索
- **自动智能归档**: 创建文档并自动分类归档

### 💬 历史对话分析
- **对话摘要**: 分析聊天内容，生成摘要信息
- **会议记录**: 提取会议相关内容（待办、决策等）
- **决策提取**: 识别并整理讨论中的决策点
- **关键词搜索**: 在历史消息中搜索特定内容
- **对话统计**: 分析活跃用户、热门话题等

### 👥 多账号管理
- **多机器人支持**: 管理多个飞书机器人账号
- **独立索引**: 每个账号拥有独立的知识库索引
- **快速切换**: 在不同账号间快速切换
- **数据隔离**: 账号间数据完全隔离

---

## 🚀 快速开始

### 1. 安装插件

```bash
# 通过ClawHub安装
clawhub install feishu-docs-assistant

# 重启OpenClaw生效
openclaw
```

### 2. 配置环境变量

在 OpenClaw 环境变量中配置：

```env
# 飞书机器人 AppID
FEISHU_APP_ID=cli_xxxxxxxxxxxxx

# 飞书机器人 AppSecret
FEISHU_APP_SECRET=xxxxxxxxxxxxx

# 数据加密密钥（使用下方命令生成）
ENCRYPTION_KEY=your_generated_encryption_key
```

生成加密密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 飞书权限配置

访问 [飞书开放平台](https://open.feishu.cn/) 配置以下权限：

**基础权限**:
- `im:message:readonly` - 接收消息
- `im:message:send_as_bot` - 发送消息
- `im:chat:readonly` - 获取聊天信息

**文档权限**:
- `wiki:wiki:readonly` - 读取知识库
- `docx:document:readonly` - 读取文档
- `docx:document:create` - 创建文档
- `wiki:node:write` - 写入知识库

---

## 💡 使用方式

### 方式一：命令模式

**文档查找**:
```
/find 入职指南
/查找 员工手册
```

**内容搜索**:
```
/search 年假政策
/搜索 报销流程
```

**创建文档**:
```
/create 会议记录:讨论了项目进度
/new 标题:内容
```

**历史对话分析**:
```
/summary              # 分析最近100条消息
/summary 200          # 分析最近200条消息
/meeting              # 提取会议内容
/decision             # 提取决策内容
/history 关键词        # 搜索历史消息
/stats                # 对话统计
```

**系统命令**:
```
/help                 # 显示帮助
/indexstats           # 知识库统计
```

### 方式二：自然语言

支持自然语言交互，系统会智能识别意图：

```
"入职文档在哪里"
"搜索关于报销的内容"
"新建会议记录：讨论Q1计划"
```

---

## 📋 命令参考

| 命令 | 功能 | 示例 |
|------|------|------|
| `/find <关键词>` | 查找文档 | `/find 入职指南` |
| `/search <关键词>` | 搜索内容 | `/search 年假政策` |
| `/create <标题>:<内容>` | 创建文档 | `/create 会议记录:讨论了...` |
| `/summary [数量]` | 分析对话 | `/summary 200` |
| `/meeting [数量]` | 会议记录 | `/meeting` |
| `/decision [数量]` | 决策提取 | `/decision 50` |
| `/history <关键词>` | 搜索历史 | `/history 项目` |
| `/stats [数量]` | 对话统计 | `/stats` |
| `/help` | 帮助信息 | `/help` |
| `/indexstats` | 索引统计 | `/indexstats` |

---

## 📚 详细文档

- [用户配置指南](docs/guides/USER-GUIDE.md) - 完整安装配置教程
- [使用说明](docs/guides/USAGE.md) - 功能使用指南
- [调试指南](docs/guides/DEBUG-GUIDE.md) - 问题排查
- [安全指南](docs/security/SECURITY-GUIDE.md) - 安全配置
- [多账号管理](docs/about/MULTI-ACCOUNT.md) - 多账号功能

---

## 🔐 安全与隐私

### 数据处理原则
- ✅ **本地存储**: 所有凭证存储在本地环境变量
- ✅ **AES-256加密**: 敏感信息加密存储
- ✅ **最小权限**: 仅申请必要的飞书API权限
- ✅ **不远程收集**: 不收集、不上传用户数据
- ✅ **开源透明**: 所有代码开源，可审计

### 隐私保护
- 仅与飞书官方API通信
- 不收集使用统计或用户信息
- 本地索引数据仅保存在用户本地
- 历史对话分析仅在本地进行

---

## 🔧 技术架构

### 核心模块
- **BotAccountManager**: 多账号管理和加密
- **MultiAccountIndexer**: 多账号索引管理
- **DocumentLocator**: 智能文档定位
- **ContentSearcher**: 内容检索引擎
- **AutoArchiver**: 自动归档系统
- **ConversationSummarizer**: 对话分析引擎

### 技术栈
- Node.js 16+
- Axios (HTTP客户端)
- 飞书开放平台API
- AES-256-CBC加密

---

## 📊 项目信息

- **版本**: 2.1.3
- **开源协议**: MIT License
- **状态**: ✅ 生产就绪
- **文档**: 10个核心文档

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

---

## 📝 更新日志

### v2.1.3 (2026-03-10)
- 🔄 集成 OpenClaw 内置权限管理
- 🔒 改用管理者权限
- 🧹 优化代码结构

### v2.1.1 (2026-03-08)
- ✨ 历史对话分析功能
- 👥 多账号管理优化
- 🐛 数据格式兼容性修复

### v2.0.0 (2026-03-08)
- ✨ 多账号管理功能
- 🔒 安全审计和加固
- 📚 文档结构优化

---

**作者**: alvin-susu
**官网**: [GitHub](https://github.com/alvin-susu/feishu_docs_download)
**安全合规**: ✅ 通过安全审计
