# 飞书知识库智能助手 - 多账号部署指南

## 📋 部署前准备

### 环境要求
- Node.js 18.0+
- OpenClaw 2026.3.1+
- 飞书开放平台企业账号
- 多个飞书机器人应用（如需多账号功能）

### 权限准备
确保每个飞书机器人已开通必需权限（参考产品文档第五章）

## 🚀 快速部署

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 加密密钥（用于本地存储加密）
ENCRYPTION_KEY=your-secure-encryption-key-here

# 服务器配置
PORT=3000
NODE_ENV=production

# 索引配置
INDEX_UPDATE_INTERVAL=86400000  # 24小时
```

### 3. 构建项目

```bash
npm run build
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🔧 多账号配置

### 添加机器人账号

1. **访问配置面板**
   ```
   http://your-domain.com
   ```

2. **填写机器人信息**
   - 机器人备注：如"行政知识库机器人"
   - AppID：从飞书开放平台获取
   - AppSecret：从飞书开放平台获取

3. **自动验证和同步**
   - 系统自动验证账号
   - 检查权限配置
   - 构建文档索引

### 批量导入账号（可选）

创建批量导入文件 `accounts-import.json`：

```json
{
  "accounts": [
    {
      "name": "行政知识库",
      "appId": "cli_xxx1",
      "appSecret": "secret1"
    },
    {
      "name": "技术文档库",
      "appId": "cli_xxx2",
      "appSecret": "secret2"
    }
  ]
}
```

使用API批量导入：

```bash
curl -X POST http://localhost:3000/api/accounts/import \
  -H "Content-Type: application/json" \
  -d @accounts-import.json
```

## 🔐 安全配置

### 加密密钥管理

生成安全的加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的密钥设置到环境变量 `ENCRYPTION_KEY`

### 权限最小化原则

为每个机器人仅开通必需权限：

| 机器人类型 | 必需权限 |
|-----------|---------|
| 只读查询机器人 | 只读权限 |
| 内容管理机器人 | 读写权限 |
| 全功能机器人 | 全部权限 |

## 📊 监控和维护

### 健康检查

```bash
curl http://localhost:3000/health
```

### 查看系统状态

```bash
curl http://localhost:3000/api/status
```

### 更新所有账号索引

```bash
curl -X POST http://localhost:3000/api/index/update-all
```

### 备份数据

```bash
# 备份账号数据
cp data/accounts.json backup/accounts-$(date +%Y%m%d).json

# 备份索引数据
cp -r data/index backup/index-$(date +%Y%m%d)/
```

## 🐳 Docker部署

### 构建镜像

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/dev-server.js"]
```

### 启动容器

```bash
# 构建镜像
docker build -t feishu-wiki-assistant .

# 运行容器
docker run -d \
  --name feishu-assistant \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  feishu-wiki-assistant
```

### Docker Compose部署

```yaml
version: '3.8'

services:
  app:
    image: feishu-wiki-assistant
    container_name: feishu-wiki-assistant
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    restart: unless-stopped
```

## 🔧 生产环境优化

### 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server/dev-server.js --name feishu-assistant

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 日志管理

配置日志轮转：

```bash
# /etc/logrotate.d/feishu-assistant
/path/to/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## 🚨 故障排除

### 常见问题

1. **账号无法绑定**
   - 检查AppID和AppSecret是否正确
   - 确认机器人权限配置完整
   - 查看服务器日志获取详细错误信息

2. **索引构建失败**
   - 确认机器人有访问知识库的权限
   - 检查网络连接是否正常
   - 尝试手动触发索引重建

3. **多账号切换异常**
   - 清除浏览器缓存
   - 重新加载配置面板
   - 检查索引文件是否损坏

4. **性能问题**
   - 检查索引文件大小
   - 调整索引更新频率
   - 考虑启用缓存优化

### 调试模式

启用调试日志：

```bash
export LOG_LEVEL=debug
npm start
```

### 重置系统

⚠️ **警告：以下操作将清除所有数据**

```bash
# 停止服务
pm2 stop feishu-assistant

# 清除数据
rm -rf data/*

# 重启服务
pm2 restart feishu-assistant
```

## 📈 性能优化建议

1. **索引优化**
   - 定期清理过期索引
   - 启用增量更新
   - 限制索引文件大小

2. **缓存策略**
   - 启用API响应缓存
   - 缓存账号权限信息
   - 缓存频繁访问的文档

3. **并发控制**
   - 限制同时构建的索引数量
   - 设置合理的超时时间
   - 使用连接池管理数据库连接

## 🔒 安全加固

1. **网络安全**
   - 使用HTTPS加密传输
   - 配置防火墙规则
   - 限制API访问频率

2. **数据安全**
   - 定期备份重要数据
   - 加密敏感信息
   - 实施访问控制

3. **监控告警**
   - 监控异常登录
   - 监控API调用频率
   - 设置资源使用告警

## 📞 技术支持

如有部署问题，请联系：
- 技术支持邮箱
- ClawHub插件社区
- GitHub Issues
