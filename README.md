# 飞书知识库智能助手

OpenClaw × 飞书机器人联动工具，实现企业飞书知识库智能化管理。通过飞书机器人触发指令，OpenClaw 执行智能操作，结果反馈至飞书侧，全流程自动化。

## 📚 **完整文档**

所有详细文档已移至 [**docs/** 文档目录](https://github.com/alvin-susu/feishu_docs_download/tree/main/docs)，包括：
- 📖 [用户配置指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USER-GUIDE.md) - 完整的安装配置教程
- 🔧 [调试指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/DEBUG-GUIDE.md) - 开发调试和问题排查
- 🔒 [安全指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/security/SECURITY-GUIDE.md) - 安全配置和最佳实践
- 📋 [更新日志](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/about/CHANGELOG.md) - 版本更新记录

👉 **查看 [文档中心索引](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/INDEX.md)** 获取完整文档列表

## 🎯 核心功能

| 功能 | 描述 | 使用场景 |
|------|------|----------|
| **智能文档定位** | 直接返回飞书文档精准链接 | 员工询问目标文档位置，省去逐层翻找目录 |
| **高效内容检索** | 智能匹配知识库内容，返回摘要与链接 | 咨询相关工作内容，一站式信息获取 |
| **自动智能归档** | 自动识别内容分类，按规则归档至标准目录 | 新建文档时自动分类存放，避免归档错误 |
| **会议协作自动化** | 提取待办事项、智能生成文档并归档 | 群内@机器人触发快捷操作，无需手动跳转 |

## 🚀 快速开始

### 📁 项目结构

- **`src/`** - 核心源代码 (OpenClaw Skill运行必需)
- **`docs/`** - 完整文档中心 (用户配置指南)
- **`scripts/`** - 工具脚本 (批量下载、安全检查)
- **`data/`** - 数据模板 (运行时生成)

👉 **查看 [完整目录结构说明](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/about/DIRECTORY-STRUCTURE.md)**

### 环境要求

- **OpenClaw**: 2026.3.1+ (最低兼容版本)
- **飞书开放平台权限**: 需申请相关接口权限
- **企业飞书知识库**: 需配置机器人访问权限
- **Node.js**: 16+ (本地调试需要)

### 安装方式

**方式一：OpenClaw Skill (推荐)**
```bash
# 自动安装到 OpenClaw skills 目录
git clone https://github.com/alvin-susu/feishu_docs_download.git ~/.openclaw/skills/feishu-wiki-assistant

# 或使用 OpenClaw 命令安装 (如果支持)
openclaw skill install feishu-wiki-assistant
```

**方式二：本地运行 (调试模式)**
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

### 初始化配置

1. **配置环境变量**

创建 `.env` 文件或设置环境变量：

```bash
# 必需配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# 可选配置 (事件回调需要时)
FEISHU_VERIFICATION_TOKEN=your_verification_token
FEISHU_ENCRYPT_KEY=your_encrypt_key
```

2. **多机器人配置 (可选)**

如需使用多个飞书机器人账号，编辑 `data/accounts.json`:

```json
{
  "accounts": [
    {
      "name": "行政知识库机器人",
      "appId": "cli_xxxxxxxxxxxxx",
      "appSecret": "xxxxxxxxxxxxx",
      "enabled": true
    },
    {
      "name": "研发文档机器人",
      "appId": "cli_yyyyyyyyyyyyyy",
      "appSecret": "yyyyyyyyyyyyy",
      "enabled": false
    }
  ],
  "currentAccount": "行政知识库机器人"
}
```

### 权限配置

插件需要以下飞书开放平台权限：

#### 基础消息权限

| 权限 Scope | 用途 |
|------------|------|
| `im:message.group_at_msg:readonly` | 接收群内@机器人的消息 |
| `im:message:send_as_bot` | 以机器人身份发送消息 |
| `im:chat:readonly` | 获取群组基础信息 |
| `contact:user.base:readonly` | 读取用户基础信息 |

#### 文档&知识库权限

| 权限 Scope | 类型 | 对应功能 |
|------------|------|----------|
| `wiki:wiki:readonly` | 只读 | 文档定位、内容检索 |
| `docx:document:readonly` | 只读 | 内容检索、信息提取 |
| `drive:drive:readonly` | 只读 | 文档定位、目录匹配 |
| `docx:document:create` | 读写 | 新建文档、自动归档 |
| `wiki:node:write` | 读写 | 自动归档、添加待办 |

## 📖 使用指南

### 使用方式

本工具支持两种使用方式：

**方式一：飞书群聊中使用 (推荐)**

1. 将飞书机器人添加到企业群聊
2. 在群聊中@机器人并发送命令
3. 机器人会自动处理并回复结果

```
群聊示例：
@飞书助手 /find 入职指南
@飞书助手 /search 年假政策
@飞书助手 /create 会议记录:讨论了Q1计划
```

**方式二：OpenClaw命令行调用**

```bash
# 在OpenClaw中使用skill命令
openclaw skill exec feishu-wiki-assistant --command "find 入职指南"
openclaw skill exec feishu-wiki-assistant --command "search 年假政策"
```

### 基本命令

| 命令 | 功能 | 飞书群聊示例 | 命令行示例 |
|------|------|------------|-----------|
| `/help` | 显示帮助信息 | `@机器人 /help` | `--command "help"` |
| `/find <文档名称>` | 查找文档位置 | `@机器人 /find 入职指南` | `--command "find 入职指南"` |
| `/search <关键词>` | 搜索知识库内容 | `@机器人 /search 年假政策` | `--command "search 年假政策"` |
| `/create <标题>:<内容>` | 创建新文档并自动归档 | `@机器人 /create 会议记录:讨论了项目进度` | `--command "create 会议记录:讨论了项目进度"` |
| `/stats` | 查看索引统计 | `@机器人 /stats` | `--command "stats"` |
| `/index` | 重建索引 | `@机器人 /index` | `--command "index"` |

### 命令详解

**1. 文档查找命令**
```bash
# 飞书群聊中
@飞书助手 /find 入职指南
@飞书助手 /find 员工手册

# 支持中英文命令
@飞书助手 /查找 入职指南
```

**2. 内容搜索命令**
```bash
# 飞书群聊中
@飞书助手 /search 年假政策
@飞书助手 /search 报销流程

# 支持中英文命令
@飞书助手 /搜索 年假政策
```

**3. 创建文档命令**
```bash
# 飞书群聊中 (使用冒号分隔标题和内容)
@飞书助手 /create 会议记录:今天讨论了项目进度和下阶段计划

# 支持多种命令格式
@飞书助手 /new 项目文档:描述了新项目的技术方案
@飞书助手 /new 需求文档:用户需求分析
```

**4. 系统管理命令**
```bash
# 查看索引统计
@飞书助手 /stats

# 重建知识库索引
@飞书助手 /index
```

### 自然语言交互

除了命令格式外，也支持自然语言交互，系统会智能识别您的意图：

**文档查找类**
```
• "入职文档在哪里"
• "查找年假政策文档"
• "员工手册怎么找"
• "XX文档位置"
```

**内容搜索类**
```
• "搜索关于报销流程的内容"
• "关于考勤制度有什么信息"
• "年假怎么算"
• "关于XX的内容"
```

**创建文档类**
```
• "新建文档名：内容"
• "创建一个会议记录：讨论了Q1计划"
• "新建需求文档：用户反馈的功能需求"
```

### 使用示例

**场景一：新员工入职查询**
```
新员工：@飞书助手 入职指南在哪里？
飞书助手：📄 已为您找到入职指南文档
📗 文档位置：行政文档/新人培训/入职指南
🔗 文档链接：https://xxx.feishu.cn/doc/xxx
```

**场景二：快速信息查询**
```
员工：@飞书助手 年假政策是什么？
飞书助手：📚 关于年假政策的核心内容：
• 工作满1年：享受5天年假
• 工作满3年：享受10天年假
• 工作满5年：享受15天年假
📖 详细文档：人事制度/假期管理/年假制度
```

**场景三：会议记录快速归档**
```
会议中：@飞书助手 /create 周会记录:讨论了项目进度，决定下周完成第一阶段开发
飞书助手：✅ 文档已创建并自动归档
📁 归档位置：项目文档/周会记录/2024-03-07周会记录
🔗 文档链接：https://xxx.feishu.cn/doc/xxx
```

### 批量下载功能

支持批量下载整个飞书知识库到本地：

```bash
# 在项目目录中运行批量下载脚本
cd ~/.openclaw/skills/feishu-wiki-assistant
node scripts/batch-download-fixed.js

# 指定输出目录
node scripts/batch-download-fixed.js ./my-wiki-backup

# 脚本会自动：
# 1. 读取环境变量中的飞书机器人配置
# 2. 遍历整个知识库结构
# 3. 逐个下载文档并转换为Markdown格式
# 4. 保持原有的目录结构
```

**批量下载特点：**
- ✅ 自动保持知识库目录结构
- ✅ 转换为Markdown格式便于阅读
- ✅ 支持断点续传（跳过已下载文件）
- ✅ 详细的进度显示和错误报告
- ✅ 包含文档元数据（token、标题、下载时间）

## 🔧 开发指南

### 项目结构

```
feishu_docs_download/
├── src/
│   ├── bot/
│   │   └── FeishuBot.js          # 飞书机器人核心类
│   ├── handlers/
│   │   └── MessageHandler.js      # 消息处理器
│   ├── features/
│   │   ├── DocumentLocator.js     # 文档定位功能
│   │   ├── ContentSearcher.js     # 内容搜索功能
│   │   ├── AutoArchiver.js        # 自动归档功能
│   │   ├── MeetingAssistant.js    # 会议助手功能
│   │   └── WikiDownloader.js      # 批量下载功能
│   ├── core/
│   │   ├── BotAccountManager.js   # 机器人账号管理
│   │   └── WikiIndexer.js         # 知识库索引
│   └── index.js                   # 主入口
├── scripts/
│   └── batch-download-fixed.js    # 批量下载脚本
├── data/
│   └── accounts.json              # 账号配置
└── README.md
```

### 调试模式

项目支持双模式运行：

```bash
# OpenClaw Skill 模式 (默认)
# 自动集成到 OpenClaw 工作流

# Debug 模式 (本地调试)
DEBUG=true npm start
```

### 核心技术要点

**1. 轻量化索引机制**
- 仅缓存文档标题、目录、关键词、链接
- 避免全文缓存，降低存储与 Token 消耗
- 支持 24 小时自动增量更新

**2. 多账号隔离**
- 不同机器人账号索引完全隔离
- 切换账号时仅加载对应索引
- 避免数据混淆与内存浪费

**3. 按需读取策略**
- 根据用户指令精准定位目标目录
- 仅读取必要的文档内容
- 大幅降低 Token 消耗与响应时间

**4. 错误处理与日志**
- 完善的错误捕获与用户反馈
- 详细的调试日志输出
- 支持操作失败重试机制

## 🛠️ 故障排除

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 机器人绑定失败 | AppID/AppSecret 错误 | 核对飞书开放平台配置信息 |
| 权限不足提示 | 缺少必需的飞书权限 | 参考权限配置清单，申请相关权限 |
| 文档检索无结果 | 索引未构建或知识库未授权 | 执行 `/index` 重建索引，检查机器人知识库权限 |
| 批量下载失败 | API 调用频率限制 | 调整下载间隔时间，或分批下载 |

### 权限自查

插件内置权限自查功能：

```bash
# 自动校验机器人权限
# 检查可访问的知识库范围
# 生成可视化权限报告
# 支持一键重新同步
```

## 📊 性能优化

### 优化策略

1. **分级索引** - 为每个账号独立生成专属索引
2. **分页同步** - 首次同步采用分页懒加载模式
3. **增量更新** - 仅同步新增、修改的文档数据
4. **缓存复用** - 利用 OpenClaw 原生缓存机制
5. **索引隔离** - 不同账号索引完全独立

### 性能指标

- **响应时长**: ≤ 3 秒 (符合 ClawHub 规范)
- **内存占用**: 符合 OpenClaw 插件标准
- **Token 消耗**: 通过轻量化索引大幅降低

## 🔒 安全与合规

### 数据安全

- ✅ **本地加密存储**: AppID/AppSecret 采用 AES 加密本地存储
- ✅ **权限最小化**: 仅申请功能必需的飞书权限
- ✅ **数据隔离**: 不同机器人账号数据完全隔离
- ✅ **权限继承**: 新建文档继承父目录权限设置

### 合规要求

- ✅ **目录结构规范**: 严格遵循 OpenClaw Skill 标准目录结构
- ✅ **配置文件规范**: manifest.json 完整填写插件信息
- ✅ **安全合规**: 无恶意代码，所有数据处理本地化
- ✅ **性能规范**: 响应时长、内存占用符合 OpenClaw 标准

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
# 编辑 .env 文件，填入飞书机器人配置

# 启动调试模式
DEBUG=true npm start
```

### 代码规范

- 使用 CommonJS 模块系统 (`require` / `module.exports`)
- 遵循 ESLint 配置规范
- 添加详细的 JSDoc 注释
- 编写单元测试覆盖核心功能

## 📝 更新日志

### v2.1.3 (2026-03-09)

**新增功能**
- ✨ 文档协作者权限：创建文档时自动添加群聊/私聊者为协作者
- ✨ 直接添加群聊为协作者：支持 share_type='chat' 方式
- ✨ 历史对话分析：获取群聊/私聊历史消息进行分析
- ✨ 调试脚本：添加协作者脚本、获取群成员脚本

**技术优化**
- 🔧 addDocumentCollaborators 支持多种API方案尝试
- 🔧 优先使用群聊方式添加协作者，失败时回退到成员添加

### v1.0.0 (2026-03-07)

**新增功能**
- ✨ 智能文档定位功能
- ✨ 高效内容检索功能
- ✨ 自动智能归档功能
- ✨ 会议协作自动化功能
- ✨ 批量下载知识库功能

**技术优化**
- 🔧 轻量化索引机制
- 🔧 多机器人账号管理
- 🔧 按需读取策略
- 🔧 增量更新机制

## 📄 许可证

MIT License

## 🔗 相关链接

- [OpenClaw 文档](https://docs.openclaw.ai)
- [飞书开放平台](https://open.feishu.cn/)
- [项目源码](https://github.com/alvin-susu/feishu_docs_download)

---

> **注**: 本项目作为 OpenClaw Skill 运行，所有数据处理均在企业内部环境完成，不上传至第三方服务器，确保企业数据安全。
