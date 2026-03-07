# 🔒 安全修复快速参考

## 🚨 立即执行 (今天必须完成!)

### 1. 撤销暴露的飞书凭证
```bash
# ⚠️ 如果您的凭证已暴露，必须立即撤销
# 步骤:
# 1. 访问 https://open.feishu.cn/
# 2. 进入应用管理，找到相关应用
# 3. 点击"重新生成"AppSecret
# 4. 更新项目配置文件
```

### 2. 生成安全密钥
```bash
# 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 将生成的密钥设置到 .env 文件
# ENCRYPTION_KEY=生成的密钥
```

### 3. 更新所有配置
```bash
# 需要更新的文件:
# - .env (项目配置)
# - ~/.openclaw/openclaw.json (OpenClaw配置)
# - ~/.openclaw/workspace/skills/feishu-wiki-assistant/data/accounts.json
```

## ✅ 已自动修复的问题

### 🔴 严重问题
- [x] 清理了暴露的飞书凭证
- [x] 修复了硬编码加密密钥漏洞
- [x] 清理了文档中的敏感信息

### 🟡 中等问题
- [x] 改进了日志安全性
- [x] 加强了错误处理
- [x] 设置了安全文件权限
- [x] 更新了.gitignore配置

## 🛠️ 可用工具

### 安全检查脚本
```bash
# 运行完整的安全检查
bash scripts/security-check.sh
```

### Git安全钩子
```bash
# 安装安全钩子
bash git-hooks/install.sh

# 钩子会自动:
# - 检查敏感文件提交
# - 检测代码中的凭证模式
# - 警告大文件提交
```

## 📋 安全配置清单

### 必须设置的环境变量
```bash
# .env 文件中必须包含:
ENCRYPTION_KEY=至少32位的随机字符串
FEISHU_APP_ID=你的新AppID
FEISHU_APP_SECRET=你的新AppSecret
```

### 推荐的日志配置
```bash
# 生产环境:
LOG_LEVEL=info  # 或 warn

# 开发环境:
LOG_LEVEL=debug
```

## 🔐 安全最佳实践

### ✅ DO (推荐做法)
- 定期更换密钥和凭证 (建议每3个月)
- 使用环境变量存储敏感信息
- 设置合适的文件权限 (600 for .env)
- 定期运行安全检查脚本
- 监控异常API调用活动

### ❌ DON'T (避免做法)
- 不要在代码中硬编码凭证
- 不要将 .env 文件提交到Git
- 不要在生产环境使用 debug 日志级别
- 不要在文档中记录真实凭证
- 不要与他人分享凭证文件

## 🆘 遇到问题？

### 应用启动失败
```
错误: 安全错误: 必须设置ENCRYPTION_KEY环境变量
解决: 在 .env 文件中设置 ENCRYPTION_KEY
```

### Git提交被拦截
```
错误: 发现敏感文件
解决: 检查文件内容，移除敏感信息，或使用 --no-verify 跳过 (不推荐)
```

### 凭证验证失败
```
错误: 飞书机器人密钥无效
解决: 检查 .env 中的凭证是否正确，或重新生成凭证
```

## 📞 紧急联系

如果发现安全问题或异常活动:
1. 立即撤销所有暴露的凭证
2. 检查飞书平台的操作日志
3. 联系飞书技术支持
4. 运行安全检查脚本

---

**📅 最后更新**: 2026-03-07
**🔄 下次审查**: 2026-04-07