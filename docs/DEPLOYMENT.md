# 飞书知识库智能助手 - 部署指南

## 前置要求

1. Node.js 18.0 或更高版本
2. 飞书开放平台企业账号
3. 飞书机器人应用权限
4. OpenClaw 2026.3.1 或更高版本

## 部署步骤

### 1. 准备飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 配置应用权限（参考产品文档第五部分）
4. 获取应用凭证：
   - App ID
   - App Secret
   - Verification Token
   - Encrypt Key

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入飞书应用信息：
```env
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here
FEISHU_VERIFICATION_TOKEN=your_verification_token_here
FEISHU_ENCRYPT_KEY=your_encrypt_key_here
```

### 4. 运行测试

```bash
npm test
```

### 5. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

### 6. 配置飞书机器人回调

1. 在飞书开放平台配置事件回调URL
2. URL格式：`https://your-domain.com/api/feishu/callback`
3. 选择订阅事件：
   - `im.message.receive_v1` - 接收消息
   - `wiki.article.*` - 知识库变更事件（可选）

## 部署到服务器

### Docker 部署（推荐）

1. 构建镜像：
```bash
docker build -t feishu-wiki-assistant .
```

2. 运行容器：
```bash
docker run -d \
  --name feishu-assistant \
  -p 3000:3000 \
  --env-file .env \
  feishu-wiki-assistant
```

### 传统部署

1. 上传代码到服务器
2. 安装依赖：`npm install --production`
3. 使用 PM2 管理进程：
```bash
pm2 start src/index.js --name feishu-assistant
pm2 save
pm2 startup
```

## 验证部署

1. 检查服务状态：访问健康检查接口
2. 在飞书群中@机器人发送 `/help`
3. 验证功能是否正常响应

## 故障排除

### 常见问题

1. **机器人无响应**
   - 检查环境变量配置
   - 验证飞书权限设置
   - 查看服务日志

2. **索引构建失败**
   - 确认知识库访问权限
   - 检查API调用限制
   - 手动重建索引：发送 `/index` 命令

3. **Token消耗过高**
   - 确认索引功能正常工作
   - 检查是否启用了增量更新
   - 查看缓存配置

## 监控与维护

### 日志查看
```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
grep "ERROR" logs/app.log
```

### 性能监控
- 使用 `/stats` 命令查看索引统计
- 监控API调用次数和Token消耗
- 定期检查缓存命中率

### 定期维护
- 每周重建索引
- 清理过期缓存
- 更新分类规则

## 安全建议

1. 定期更新依赖包
2. 使用HTTPS加密通信
3. 启用访问速率限制
4. 定期备份数据和配置
5. 监控异常访问行为
