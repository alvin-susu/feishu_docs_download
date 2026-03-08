# 飞书知识库智能助手 - 多账号功能说明

## 🎯 功能概述

根据产品文档第六章要求，插件现已支持**多机器人账号绑定**功能，允许用户同时管理多个飞书机器人，适配企业多知识库、分权限管理场景。

## ✨ 核心特性

### 1. 多账号并行绑定
- ✅ 支持绑定多个不同的飞书机器人（不同AppID+AppSecret）
- ✅ 每个机器人对应独立的权限范围与知识库空间
- ✅ 账号间互不干扰，无绑定数量上限（建议不超过5个）

### 2. 安全加密存储
- ✅ AppID与AppSecret采用AES加密本地存储
- ✅ 仅存于OpenClaw客户端本地，不上传至外部服务器
- ✅ 符合企业数据安全要求

### 3. 权限自动检查
- ✅ 自动验证机器人权限配置
- ✅ 生成可视化权限报告
- ✅ 智能推荐权限配置优化建议

### 4. 索引隔离机制
- ✅ 为每个账号独立生成专属索引
- ✅ 轻量化索引，仅缓存核心信息
- ✅ 切换账号时自动切换对应索引

### 5. 命令行管理工具
- ✅ 提供CLI工具管理多个账号
- ✅ 交互式添加、删除、切换账号
- ✅ 安全的加密存储机制

## 🔧 使用指南

### 环境配置

首先配置必需的环境变量：

```bash
# 在项目根目录创建 .env 文件
cat > .env << EOF
# 数据加密密钥（必需，用于加密存储账号信息）
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF
```

### 添加机器人账号

使用命令行工具添加第一个机器人：

```bash
# 添加机器人（交互式）
node scripts/account-cli.js add
```

按照提示输入：
1. **机器人备注**：自定义名称，便于区分（如"行政知识库"）
2. **AppID**：飞书机器人的应用ID（如 `cli_xxxxxxxxxxxxxxxx`）
3. **AppSecret**：飞书机器人的应用密钥

示例：
```
🤖 添加飞书机器人账号

请输入机器人备注 (如: 行政知识库, 最多10字符): 行政知识库
请输入飞书机器人 AppID: cli_xxxxxxxxxxxxxxxx
请输入飞书机器人 AppSecret: ••••••••

✅ 成功添加机器人: 行政知识库
   AppID: cli_xxxxxxxxxxxxxxxx
   账号ID: bot_1234567890_abc123
   🔸 已自动设为当前账号
```

### 添加更多机器人账号

重复上述命令添加多个机器人：

```bash
# 添加第二个机器人
node scripts/account-cli.js add

# 添加第三个机器人
node scripts/account-cli.js add
```

### 查看所有机器人账号

```bash
# 列出所有机器人
node scripts/account-cli.js list
```

输出示例：
```
🤖 已绑定机器人列表

🔸 [1] 行政知识库
      AppID: cli_xxxxxxxxxxxxxxxx
      状态: ✅ 已激活
      ID: bot_1234567890_abc123
      最后同步: 2026-03-08 14:30:00

  [2] 研发文档库
      AppID: cli_yyyyyyyyyyyyyyyy
      状态: ✅ 已激活
      ID: bot_0987654321_xyz789
      最后同步: 2026-03-08 15:20:00
```

### 切换当前账号

在OpenClaw中使用不同的机器人：

```bash
# 切换到指定机器人
node scripts/account-cli.js switch bot_0987654321_xyz789
```

或者查看当前使用的是哪个机器人：

```bash
# 显示当前机器人
node scripts/account-cli.js current
```

### 删除机器人账号

```bash
# 删除指定机器人
node scripts/account-cli.js delete bot_1234567890_abc123

# 确认删除
确认删除机器人 "行政知识库"？此操作不可恢复 (yes/no): yes

✅ 已删除机器人: 行政知识库
```

### 验证机器人权限

```bash
# 验证当前机器人
node scripts/account-cli.js validate

# 验证指定机器人
node scripts/account-cli.js validate bot_0987654321_xyz789
```

## 🔧 命令参考

```bash
# 添加机器人
node scripts/account-cli.js add

# 查看所有机器人
node scripts/account-cli.js list

# 显示当前机器人
node scripts/account-cli.js current

# 切换机器人
node scripts/account-cli.js switch <账号ID>

# 删除机器人
node scripts/account-cli.js delete <账号ID>

# 验证机器人权限
node scripts/account-cli.js validate [账号ID]

# 显示帮助
node scripts/account-cli.js
```

## 📁 数据存储

所有机器人账号信息加密存储在：

```
~/WebstormProjects/feishu_docs_download/data/accounts.json
```

**安全特性**：
- ✅ 使用AES-256加密
- ✅ 密钥来自环境变量 `ENCRYPTION_KEY`
- ✅ 仅存储在本地，不上传到任何服务器
- ✅ 每个机器人的AppSecret单独加密

## 🔐 安全机制

### 数据加密
```
AppID + AppSecret → AES加密 → 本地存储
```

### 权限隔离
```
账号A → 知识库A → 索引A
账号B → 知识库B → 索引B
```

### 最小权限原则
- 仅开通必需权限
- 禁止过度授权
- 定期权限自查

## 📊 技术实现

### 核心模块

1. **BotAccountManager** - 账号管理器
   - 账号增删改查
   - 加密存储管理
   - 当前账号切换

2. **MultiAccountIndexer** - 多账号索引管理
   - 独立索引构建
   - 索引隔离机制
   - 增量更新优化

3. **PermissionChecker** - 权限检查器
   - 自动权限验证
   - 权限报告生成
   - 优化建议推荐

### 数据存储结构

```
data/
├── accounts.json              # 账号信息（加密）
└── index/
    ├── bot_001_xxx.json      # 账号1的索引
    ├── bot_002_yyy.json      # 账号2的索引
    └── bot_003_zzz.json      # 账号3的索引
```

## 🚀 开发和测试

### 启动开发服务器

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问配置面板
http://localhost:3000
```

### API接口

```javascript
// 获取账号列表
GET /api/accounts

// 添加账号
POST /api/accounts
{
  "name": "机器人备注",
  "appId": "cli_xxx",
  "appSecret": "xxx"
}

// 切换账号
POST /api/accounts/{accountId}/switch

// 验证账号
POST /api/accounts/{accountId}/validate

// 删除账号
DELETE /api/accounts/{accountId}
```

## ⚠️ 注意事项

1. **首次使用必须绑定账号**
   - 未绑定状态下所有功能锁定
   - 必须完成至少一个账号绑定才能使用

2. **权限配置要求**
   - 参照产品文档第五章权限清单
   - 确保机器人有足够的权限访问目标知识库
   - 遵循最小权限原则

3. **索引自动更新**
   - 每24小时自动增量更新
   - 可手动触发重建索引
   - 切换账号时自动加载对应索引

4. **数据安全**
   - 账号信息加密存储
   - 删除账号会清除所有相关数据
   - 不支持账号数据恢复

## 📈 性能优化

### 轻量化索引
- 仅缓存文档标题、目录、关键词、链接
- 不缓存全文内容
- 大幅降低存储占用和Token消耗

### 按需加载
- 分页同步，避免一次性全量读取
- 用户查询时精准调取对应内容
- 增量更新，不重复全量同步

### 多账号隔离
- 不同账号索引完全隔离
- 切换账号仅加载对应索引
- 减少内存占用

## 🔮 未来规划

- [ ] 支持账号分组管理
- [ ] 支持账号批量操作
- [ ] 支持账号数据导入导出
- [ ] 支持账号使用统计
- [ ] 支持自动故障切换

## 📞 技术支持

如有问题或建议，请联系：
- ClawHub插件社区
- 产品技术支持团队
