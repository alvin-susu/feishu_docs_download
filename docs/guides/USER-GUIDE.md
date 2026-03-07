# 🎉 用户配置指南

## 📦 项目说明

感谢您使用飞书知识库智能助手！本项目是一个OpenClaw插件，帮助您智能化管理飞书知识库。

## ⚠️ 重要提示

**本项目不包含任何预配置的飞书凭证**。您需要使用自己的飞书机器人账号才能使用本项目的功能。

## 🔧 快速开始

### 第一步：获取飞书机器人凭证

1. **注册/登录飞书开放平台**
   - 访问：https://open.feishu.cn/
   - 使用飞书账号登录

2. **创建应用**
   - 点击"创建自建应用"
   - 填写应用名称和描述
   - 记录下您的 `AppID` 和 `AppSecret`

3. **配置权限**
   - 进入应用详情页
   - 开通必需的权限（参见下方权限清单）
   - 配置事件回调（如需要）

### 第二步：配置项目

1. **创建环境变量文件**
   ```bash
   # 复制模板文件
   cp .env.example .env

   # 编辑配置
   nano .env  # 或使用您喜欢的编辑器
   ```

2. **填入您的凭证**
   ```env
   # 替换为您的真实凭证
   FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
   FEISHU_APP_SECRET=your_32_character_app_secret

   # 生成加密密钥
   ENCRYPTION_KEY=run_this_command_to_generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **设置文件权限**
   ```bash
   chmod 600 .env
   ```

### 第三步：安装和运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **测试配置**
   ```bash
   # 启动应用
   npm start

   # 或使用调试模式
   DEBUG=true npm start
   ```

## 🔐 必需的飞书权限

### 基础消息权限
- `im:message.group_at_msg:readonly` - 接收群聊@消息
- `im:message:send_as_bot` - 以机器人身份发送消息
- `im:chat:readonly` - 获取群组信息
- `contact:user.base:readonly` - 读取用户基础信息

### 文档&知识库权限
- `wiki:wiki:readonly` - 读取知识库
- `docx:document:readonly` - 读取文档内容
- `drive:drive:readonly` - 读取云空间
- `docx:document:create` - 创建文档
- `wiki:node:write` - 写入知识库节点

## 🛠️ 故障排除

### 问题：应用启动失败
**错误**: `安全错误: 必须设置ENCRYPTION_KEY环境变量`

**解决**:
```bash
# 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 将生成的密钥添加到.env文件
ENCRYPTION_KEY=生成的密钥
```

### 问题：飞书API调用失败
**错误**: `飞书机器人密钥无效`

**解决**:
1. 检查 `.env` 文件中的凭证是否正确
2. 确认飞书开放平台中的应用状态
3. 验证是否已开通所需权限

### 问题：无法访问知识库
**错误**: `权限不足或知识库未授权`

**解决**:
1. 在飞书开放平台中将机器人添加到目标知识库
2. 授予机器人相应的知识库权限
3. 确认知识库的访问权限设置

## 🔒 安全建议

### ✅ 推荐做法
- 定期更换飞书机器人凭证（建议每3个月）
- 使用强密码和随机字符串作为加密密钥
- 不要将 `.env` 文件提交到版本控制系统
- 定期备份重要的知识库数据
- 监控异常的API调用活动

### ❌ 避免做法
- 不要在代码中硬编码凭证
- 不要与他人分享您的凭证
- 不要在公共网络中使用调试模式
- 不要忽略安全更新和补丁

## 📚 更多资源

- **项目文档**: 查看 README.md 了解详细功能
- **API文档**: https://open.feishu.cn/document
- **OpenClaw文档**: https://docs.openclaw.ai
- **问题反馈**: 请通过项目GitHub Issues反馈

## 🆘 获取帮助

如果遇到问题：
1. 查看项目的 DEBUG-GUIDE.md 调试指南
2. 检查 SECURITY-URGENT.md 安全说明
3. 运行 `bash scripts/security-check.sh` 进行安全检查
4. 查看项目的 GitHub Issues

---

**🎉 祝您使用愉快！**

如有任何问题，请随时联系我们。我们致力于提供安全、高效的知识库管理工具。