# 飞书知识库智能助手

> **安全合规说明**: 本插件仅为API集成工具，不收集、存储或传输任何用户数据。所有凭证均存储在本地环境变量中，遵循最小权限原则。

---

## 🌟 功能特点

### 🎯 核心功能
- **智能文档定位**: 快速在知识库中查找所需文档
- **高效内容检索**: 基于关键词和语义的智能搜索
- **自动智能归档**: 将文档自动分类归档到指定位置
- **会议协作自动化**: 会议记录自动生成和分享

### 👥 多账号管理 (v2.0新增)
- **多机器人支持**: 管理多个飞书机器人账号
- **独立索引**: 每个账号拥有独立的知识库索引
- **快速切换**: 在不同账号间快速切换
- **数据隔离**: 账号间数据完全隔离，安全可靠

### 🔒 安全保障
- **本地存储**: 所有凭证存储在本地环境变量
- **AES-256加密**: 企业级加密标准保护敏感信息
- **权限控制**: 遵循最小权限原则
- **开源透明**: 代码完全开源，可审计

---

## 🚀 快速开始

### 1. 环境要求
- Node.js 16.0.0 或更高版本
- OpenClaw 2026.3.1+
- 飞书开放平台账号

### 2. 安装插件
```bash
# 通过ClawHub安装
clawhub install feishu-wiki-assistant

# 重启OpenClaw生效
openclaw
```

### 3. 配置说明

#### 方式一：单机器人配置（简单场景）

如果只需要一个飞书机器人，直接在OpenClaw环境变量中配置：

```env
# 飞书机器人AppID (从飞书开放平台获取)
FEISHU_APP_ID=your_app_id_here

# 飞书机器人AppSecret (从飞书开放平台获取)
FEISHU_APP_SECRET=your_app_secret_here

# 数据加密密钥 (使用下方命令生成)
ENCRYPTION_KEY=your_generated_encryption_key
```

#### 方式二：多机器人配置（推荐）

如果需要管理多个飞书机器人（例如：不同部门、不同知识库）：

```bash
# 1. 生成加密密钥并配置
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex')}")

# 2. 添加第一个机器人
node scripts/account-cli.js add

# 3. 添加更多机器人（可选）
node scripts/account-cli.js add

# 4. 查看所有机器人
node scripts/account-cli.js list

# 5. 切换机器人
node scripts/account-cli.js switch <账号ID>
```

**多机器人优势**：
- ✅ 支持多个飞书机器人账号
- ✅ 每个机器人独立的权限和知识库
- ✅ 方便切换不同机器人
- ✅ 账号信息加密存储

#### 生成加密密钥
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 飞书权限配置
访问 [飞书开放平台](https://open.feishu.cn/) 配置以下权限：
- 接收群聊@消息
- 发送消息
- 读取知识库
- 读取文档
- 创建文档
- 写入知识库节点

---

## 💡 使用示例

### 知识库查询
```
你: 查询飞书知识库中关于"服务器配置"的文档
助手: 找到3个相关文档...
```

### 批量下载
```
你: 批量下载飞书知识库
助手: 开始下载知识库文档...
```

### 多账号切换
```
你: 切换到研发文档机器人
助手: 已切换到研发文档机器人账号
```

### 会议助手
```
你: 创建会议记录
助手: 会议记录已创建，文档链接：...
```

---

## 📚 详细文档

- [用户配置指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USER-GUIDE.md) - 完整的安装配置教程
- [使用说明](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USAGE.md) - 功能使用指南
- [调试指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/DEBUG-GUIDE.md) - 问题排查和调试
- [安全指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/security/SECURITY-GUIDE.md) - 安全配置和应急处理
- [部署指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/deployment/DEPLOYMENT-GUIDE.md) - 生产环境部署
- [多账号管理](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/about/MULTI-ACCOUNT.md) - 多账号功能说明

---

## 🔐 安全与隐私

### 数据处理原则
- ✅ **本地存储**: 所有凭证仅存储在用户本地环境变量中
- ✅ **最小权限**: 仅申请必要的飞书API权限
- ✅ **本地数据处理**: 批量下载功能会将文档元数据（token、标题、下载时间）保存到本地，用于提升搜索效率
- ✅ **不远程收集**: 不收集、不上传任何用户数据到第三方服务器
- ✅ **开源透明**: 所有代码开源，可审计
- ✅ **加密保护**: 本地敏感数据使用AES-256加密存储

### 隐私保护
- 不发送任何用户数据到第三方服务器（仅与飞书官方API通信）
- 不收集任何使用统计或用户信息
- 所有API调用直接与飞书官方API通信
- 本地索引数据和下载的文档仅保存在用户本地
- 批量下载功能会在本地保存文档内容和元数据

### 多机器人账号管理

本插件支持管理多个飞书机器人账号，适用于多知识库场景：

```bash
# 添加第一个机器人
node scripts/account-cli.js add

# 查看所有机器人
node scripts/account-cli.js list

# 切换机器人
node scripts/account-cli.js switch <账号ID>

# 删除机器人
node scripts/account-cli.js delete <账号ID>
```

**账号存储**：
- 所有机器人账号信息加密存储在 `data/accounts.json`
- 使用环境变量 `ENCRYPTION_KEY` 进行加密
- 支持添加多个机器人（建议不超过5个）
- 每个机器人独立的权限和索引

**使用方式**：
1. 通过CLI工具添加多个机器人账号
2. 使用CLI工具切换当前使用的机器人
3. 在OpenClaw中自动使用当前机器人的权限

### 安全审计
本项目已通过以下安全检查：
- ✅ 无硬编码凭证
- ✅ 强制加密密钥验证
- ✅ 敏感信息完全清理
- ✅ Git安全钩子保护
- ✅ 企业级加密标准

---

## 🔧 技术架构

### 核心模块
- **BotAccountManager**: 多账号管理和加密
- **WikiIndexer**: 知识库增量索引
- **DocumentLocator**: 智能文档定位
- **ContentSearcher**: 内容检索引擎
- **AutoArchiver**: 自动归档系统
- **MeetingAssistant**: 会议协作助手

### 技术栈
- Node.js 16+
- Express (Web服务器)
- Axios (HTTP客户端)
- 飞书开放平台API
- AES-256-CBC加密

---

## 📊 项目信息

- **核心代码**: ~208KB
- **文档文件**: 10个
- **功能模块**: 6个
- **开源协议**: MIT License
- **项目状态**: ✅ 生产就绪

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 开启Pull Request

---

## 📝 更新日志

### v2.0.0 (2026-03-08)
- ✨ 新增多账号管理功能
- 🔒 安全审计和加固
- 📚 优化文档结构
- 🛠️ 清理无用文件
- ✅ 通过安全合规检查

### v1.0.0 (2024-01-05)
- 🎉 初始版本发布
- ✅ 基础飞书机器人功能
- ✅ 知识库查询和检索

---

## 📞 获取帮助

- 📖 [完整文档](https://github.com/alvin-susu/feishu_docs_download/tree/main/docs)
- 🐛 [提交Issue](https://github.com/alvin-susu/feishu_docs_download/issues)
- 💬 [项目讨论](https://github.com/alvin-susu/feishu_docs_download/discussions)

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**作者**: alvin-susu
**版本**: 2.0.0
**状态**: ✅ 生产就绪
**官网**: [GitHub](https://github.com/alvin-susu/feishu_docs_download)
**安全合规**: ✅ 通过安全审计
