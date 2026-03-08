# 🐛 本地调试指南

## 快速开始
飞书机器人配置请使用环境变量设置，请勿在文档中存储真实凭证。

**⚠️ 安全提示**: 本文档不包含真实凭证，请在`.env`文件中配置您的飞书机器人信息。

### 1. 安装依赖

首先确保Node.js版本 >= 18.0.0，然后安装项目依赖：

```bash
# 进入项目目录
cd C:\Users\13509\WebstormProjects\feishu_docs_download

# 安装依赖
npm install
```

### 2. 配置环境变量

复制环境变量模板并创建配置文件：

```bash
# Windows
copy .env.example .env

# 或手动创建 .env 文件
```

编辑 `.env` 文件，添加以下配置：

```env
# 生成加密密钥（用于本地存储加密）
ENCRYPTION_KEY=your-secure-encryption-key-here-min-32-chars

# 服务器配置
PORT=3000
NODE_ENV=development

# 索引配置
INDEX_UPDATE_INTERVAL=86400000
ENABLE_AUTO_INDEX=true

# 日志配置
LOG_LEVEL=debug
```

### 3. 启动开发服务器

```bash
# 方式1：使用npm命令
npm run dev

# 方式2：直接运行
node server/dev-server.js
```

启动成功后会看到：

```
🚀 开发服务器启动成功
📍 访问地址: http://localhost:3000
🎨 配置面板: http://localhost:3000/ui/config-panel.html
🔌 健康检查: http://localhost:3000/health
```

## 🔧 调试配置界面

### 访问配置面板

在浏览器中打开：`http://localhost:3000`

### 模拟飞书机器人账号

由于需要真实的飞书机器人凭证，你可以：

1. **使用模拟模式调试**：
   - 修改测试代码使用模拟数据
   - 不需要真实的飞书凭证

2. **申请飞书测试账号**：
   - 访问 [飞书开放平台](https://open.feishu.cn/)
   - 创建测试应用
   - 获取 AppID 和 AppSecret

### 添加测试账号

在配置面板中：

1. 点击"添加第一个飞书机器人"
2. 填写测试信息：
   - 机器人备注：`测试机器人`
   - AppID：你的测试AppID
   - AppSecret：你的测试AppSecret
3. 点击"校验并保存"

## 🧪 测试API接口

### 使用curl测试

```bash
# 健康检查
curl http://localhost:3000/health

# 获取账号列表
curl http://localhost:3000/api/accounts

# 添加账号（需要真实的飞书凭证）
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试机器人",
    "appId": "cli_xxx",
    "appSecret": "xxx"
  }'
```

### 使用Postman测试

1. 导入API集合到Postman
2. 设置基础URL：`http://localhost:3000`
3. 测试各个API端点

## 🐛 调试技巧

### 1. 查看日志

服务器日志会实时显示在控制台：

```
🚀 飞书知识库智能助手启动中...
🔍 开始构建知识库索引...
✅ 索引构建完成，共索引 3 个文档
```

### 2. 启用详细日志

在 `.env` 文件中设置：

```env
LOG_LEVEL=debug
```

### 3. 使用Chrome DevTools

在配置面板中：
- 按 `F12` 打开开发者工具
- 查看 Console 标签页的错误信息
- 使用 Network 标签页查看API请求

### 4. 断点调试

使用VSCode调试：

1. 创建 `launch.json` 文件：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动开发服务器",
      "program": "${workspaceFolder}/server/dev-server.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

2. 在代码中设置断点
3. 按 `F5` 启动调试

### 5. 测试单个模块

创建测试脚本 `test-debug.js`：

```javascript
const BotAccountManager = require('./src/core/BotAccountManager');

async function testAccountManager() {
  const manager = new BotAccountManager();

  try {
    // 测试添加账号
    const account = await manager.addAccount({
      name: '测试机器人',
      appId: 'test_app_id',
      appSecret: 'test_app_secret'
    });

    console.log('添加账号成功:', account);

    // 测试获取所有账号
    const accounts = manager.getAllAccounts();
    console.log('所有账号:', accounts);

  } catch (error) {
    console.error('测试失败:', error);
  }
}

testAccountManager();
```

运行测试：

```bash
node test-debug.js
```

## 📱 调试飞书集成

### 设置飞书测试环境

1. **创建飞书测试应用**：
   - 登录飞书开放平台
   - 创建企业自建应用
   - 配置应用权限

2. **设置本地回调**：
   > ⚠️ **安全警告**: 仅在开发测试环境使用ngrok，切勿在生产环境或公共网络使用！
   >
   > 使用ngrok会将您的本地服务器暴露到公网，可能导致：
   > - 🔓 敏感数据泄露（知识库内容、用户信息等）
   > - 🌐 未授权访问您的本地服务
   > - ⚠️ 潜在的安全风险
   >
   > **安全建议**:
   > - ✅ 仅用于本地开发测试
   > - ✅ 测试完成后立即停止ngrok
   > - ✅ 不要在生产环境使用
   > - ✅ 考虑使用飞书内网穿透或其他安全方案
   >
   > 如需使用，请确保了解风险并自行承担安全责任。

   ```bash
   # 仅在开发测试环境使用
   npx ngrok http 3000
   ```
   - 在飞书开放平台配置回调URL（测试用）

3. **测试消息接收**：
   - 在飞书群中@测试机器人
   - 查看本地服务器日志
   - 验证消息处理逻辑

### 模拟飞书API响应

修改 `src/bot/FeishuBot.js` 中的方法返回模拟数据：

```javascript
async getWikiList() {
  // 返回模拟数据用于调试
  return {
    data: {
      items: [
        {
          wiki_space_id: 'test_space_1',
          name: '测试知识库'
        }
      ]
    }
  };
}
```

## 🔍 常见问题排查

### 问题1：端口被占用

```bash
# 查找占用3000端口的进程
netstat -ano | findstr :3000

# 终止进程
taskkill /PID <进程ID> /F
```

或修改 `.env` 文件中的端口：

```env
PORT=3001
```

### 问题2：依赖安装失败

```bash
# 清除缓存重试
npm cache clean --force
npm install

# 或使用淘宝镜像
npm install --registry=https://registry.npmmirror.com
```

### 问题3：文件权限错误

```bash
# Windows：以管理员身份运行PowerShell
# Linux/Mac：使用sudo
sudo npm install
```

## 📊 性能监控

### 内存使用监控

```javascript
// 在代码中添加
setInterval(() => {
  const used = process.memoryUsage();
  console.log('内存使用:', {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
  });
}, 10000);
```

### API响应时间监控

在 `server/dev-server.js` 中添加：

```javascript
this.app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
```

## 🚀 部署前检查清单

- [ ] 所有测试通过
- [ ] 环境变量配置正确
- [ ] 敏感信息已移除
- [ ] 日志级别设置为production
- [ ] 依赖版本兼容
- [ ] 端口配置正确
- [ ] 文件权限设置正确

## 📞 获取帮助

遇到问题时：

1. 查看服务器日志输出
2. 检查 `.env` 配置
3. 验证飞书应用权限
4. 查看项目Issues
5. 联系技术支持

## 🔗 有用的链接

- [飞书开放平台](https://open.feishu.cn/)
- [Node.js调试指南](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [VSCode调试文档](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
