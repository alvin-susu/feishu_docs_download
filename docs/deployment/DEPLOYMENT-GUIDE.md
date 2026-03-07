# 🚀 飞书知识库智能助手 - 部署指南

**文档版本**: v2.0
**适用版本**: v2.0.0+
**最后更新**: 2026-03-07

---

## 📋 部署前准备

### 环境要求

#### 核心要求
- **Node.js**: 16.0.0 或更高版本
- **OpenClaw**: 2026.3.1+ (如使用OpenClaw Skill模式)
- **飞书开放平台账号**: 用于创建应用和获取凭证
- **企业飞书知识库**: 需要配置机器人访问权限

#### 系统要求
- **操作系统**: Linux/macOS/Windows
- **内存**: 最低 512MB RAM
- **磁盘空间**: 最低 100MB 可用空间
- **网络**: 能访问飞书开放平台API

### 飞书开放平台配置

#### 1. 创建应用
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录您的飞书账号
3. 点击"创建自建应用"
4. 填写应用名称和描述

#### 2. 获取凭证
- **AppID**: 应用唯一标识符
- **AppSecret**: 应用密钥 (请妥善保管)

#### 3. 配置权限

**必需权限**:
```json
{
  "im:message:group_at_msg:readonly": "接收群聊@消息",
  "im:message:send_as_bot": "发送消息",
  "wiki:wiki:readonly": "读取知识库",
  "docx:document:readonly": "读取文档",
  "docx:document:create": "创建文档",
  "wiki:node:write": "写入知识库节点"
}
```

**权限申请步骤**:
1. 进入应用详情页
2. 点击"权限管理"
3. 申请上述必需权限
4. 等待审核通过

#### 4. 配置机器人
- 将机器人添加到目标知识库
- 授予机器人相应的访问权限
- 记录知识库ID

---

## 🚀 部署方式

### 方式一：OpenClaw Skill 部署 (推荐)

#### 优势
- ✅ 零配置，即插即用
- ✅ 自动管理依赖和生命周期
- ✅ 与OpenClaw深度集成
- ✅ 支持多机器人管理

#### 部署步骤

**1. 安装到OpenClaw**
```bash
# 方法一：通过OpenClaw安装 (如果支持)
openclaw skill install feishu-wiki-assistant

# 方法二：手动安装
git clone https://github.com/alvin-susu/feishu_docs_download.git \
  ~/.openclaw/skills/feishu-wiki-assistant
```

**2. 配置环境变量**
```bash
cd ~/.openclaw/skills/feishu-wiki-assistant

# 创建环境变量文件
cp .env.example .env

# 编辑配置
nano .env  # 或使用您喜欢的编辑器
```

**3. 配置内容**
```env
# 飞书机器人凭证
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=your_32_character_app_secret

# 数据加密密钥 (必需)
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex')")

# 日志配置
LOG_LEVEL=info
```

**4. 验证配置**
```bash
# 测试配置是否正确
node src/index.js

# 如果看到初始化成功信息，说明配置正确
```

### 方式二：本地运行部署

#### 适用场景
- 本地开发调试
- 自定义运行环境
- 集成到现有系统

#### 部署步骤

**1. 安装依赖**
```bash
# 克隆项目
git clone https://github.com/alvin-susu/feishu_docs_download.git
cd feishu_docs_download

# 安装Node.js依赖
npm install
```

**2. 配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env

# 设置安全的文件权限
chmod 600 .env
```

**3. 启动应用**
```bash
# 开发模式启动
npm start

# 或使用调试模式
DEBUG=true npm start
```

**4. 访问配置界面**
```bash
# 开发服务器启动后访问
# http://localhost:3000

# 可以通过Web界面配置机器人账号
```

---

## 👥 多账号部署配置

### 多机器人账号管理

#### 1. 添加多个机器人
```json
// data/accounts.json (自动生成)
{
  "accounts": [
    {
      "id": "bot_1",
      "name": "行政知识库机器人",
      "appId": "cli_xxx",
      "appSecret": "加密后的密钥",
      "isDefault": true
    },
    {
      "id": "bot_2",
      "name": "研发文档机器人",
      "appId": "cli_yyy",
      "appSecret": "加密后的密钥",
      "isDefault": false
    }
  ],
  "currentAccountId": "bot_1"
}
```

#### 2. 切换机器人账号
```bash
# 通过命令切换
# 或编辑 data/accounts.json 的 currentAccountId
```

#### 3. 索引数据隔离
每个机器人账号都有独立的知识库索引：
```
data/index/
├── bot_1_index.json    # 行政知识库索引
└── bot_2_index.json    # 研发知识库索引
```

---

## 🔧 生产环境部署

### 服务器配置建议

#### 推荐配置
- **CPU**: 2核心以上
- **内存**: 1GB以上
- **磁盘**: 10GB以上
- **操作系统**: Ubuntu 20.04+ / CentOS 8+

#### 系统服务配置

**使用PM2守护进程**:
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start src/index.js --name feishu-assistant

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs feishu-assistant
```

**使用Systemd服务**:
```bash
# 创建服务文件
sudo nano /etc/systemd/system/feishu-assistant.service
```

```ini
[Unit]
Description=Feishu Wiki Assistant
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/feishu_docs_download
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl enable feishu-assistant
sudo systemctl start feishu-assistant
sudo systemctl status feishu-assistant
```

---

## 🐳 Docker部署 (可选)

### Dockerfile配置

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY src/ ./src/

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/index.js"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t feishu-assistant:latest .

# 运行容器
docker run -d \
  --name feishu-assistant \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  feishu-assistant:latest
```

---

## 🔍 部署验证

### 功能测试

#### 1. 基础功能测试
```bash
# 测试应用启动
curl http://localhost:3000/health

# 预期返回:
# {"status":"ok","timestamp":"..."}
```

#### 2. API功能测试
```bash
# 测试知识库连接
# 测试文档查询功能
# 测试账号配置加载
```

#### 3. 多账号测试
```bash
# 测试多个机器人账号切换
# 验证索引数据隔离
# 确认权限边界正确
```

### 性能测试

#### 压力测试
```bash
# 使用Apache Bench进行简单测试
ab -n 100 -c 10 http://localhost:3000/health
```

#### 监控指标
```bash
# CPU使用率
top -p $(pgrep -f "node src/index.js")

# 内存使用
ps aux | grep "node src/index.js"

# 响应时间
curl -w "@curl-format.txt" http://localhost:3000/health
```

---

## 📋 部署检查清单

### 部署前检查
- [ ] Node.js版本 >= 16.0.0
- [ ] 飞书开放平台账号已创建
- [ ] 所需权限已申请并通过
- [ .env 文件已正确配置
- [ ] ENCRYPTION_KEY已生成
- [ ] 文件权限已正确设置

### 部署后验证
- [ ] 应用成功启动
- [ ] 健康检查接口正常
- [ ] 飞书API连接正常
- [ ] 账号配置加载成功
- [ ] 日志正常输出
- [ ] 错误处理正常工作

### 生产环境检查
- [ ] 进程守护配置完成
- [ ] 开机自启动已设置
- [ ] 日志轮转已配置
- [ ] 监控告警已设置
- [ ] 备份策略已制定

---

## 🆘 故障排除

### 常见问题

#### 1. 应用启动失败
**错误**: `安全错误: 必须设置ENCRYPTION_KEY环境变量`

**解决**:
```bash
# 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex')"

# 添加到.env文件
ENCRYPTION_KEY=生成的密钥
```

#### 2. 飞书API调用失败
**错误**: `飞书机器人密钥无效`

**解决**:
1. 检查.env中的凭证是否正确
2. 验证飞书开放平台中的应用状态
3. 确认权限已正确配置

#### 3. 知识库访问失败
**错误**: `权限不足或知识库未授权`

**解决**:
1. 将机器人添加到目标知识库
2. 授予机器人相应的访问权限
3. 验证知识库ID是否正确

#### 4. 多账号切换失败
**错误**: `账号不存在`

**解决**:
1. 检查accounts.json配置
2. 确认账号ID正确
3. 重新加载应用

---

## 📞 获取帮助

### 部署支持
- 查看 [DEBUG-GUIDE.md](DEBUG-GUIDE.md) 调试指南
- 查看 [USER-GUIDE.md](USER-GUIDE.md) 配置说明
- 查看 [SECURITY-GUIDE.md](SECURITY-GUIDE.md) 安全指南

### 技术支持
- 提交GitHub Issue
- 查看项目Wiki
- 联系项目维护者

---

**🚀 准备好部署了吗？按照本指南一步步操作即可！**

**📅 文档版本**: v2.0 | **最后更新**: 2026-03-07