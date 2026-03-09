# 🎉 v2.1.1 发布说明

**发布日期**: 2026-03-08
**版本类型**: Bug修复版本
**升级建议**: 推荐升级（修复数据兼容性问题）

---

## 📋 本次更新内容

### 🐛 Bug修复

#### 账号数据加载问题修复
- **问题**: 旧版accounts.json格式导致账号加载失败，出现"账号不存在"错误
- **症状**: 即使数据文件存在且内容正确，BotAccountManager仍无法加载账号
- **根本原因**:
  - `saveAccounts()` 使用 `Array.from(this.accounts.entries())` 保存为 `[key, value]` 对数组
  - 但某些情况下（可能是手动创建或旧版本）创建了普通对象数组格式
  - `loadAccounts()` 的 `new Map(loadedData.accounts)` 无法识别普通对象数组

- **解决方案**: 添加智能数据格式检测和自动迁移功能

### ✨ 新功能

#### 数据格式自动迁移
```javascript
// 在 loadAccounts() 中自动检测并迁移
if (旧格式检测) {
    console.log('🔄 检测到旧数据格式，正在自动迁移...');
    // 转换为新格式
    const newFormatAccounts = loadedData.accounts.map(account => [
        account.id,
        account
    ]);
    // 保存迁移后的数据
    await fs.writeFile(...);
    console.log('✅ 数据迁移完成');
}
```

### 🔧 改进

#### 错误处理优化
- 改进 `loadAccounts()` 的错误处理机制
- 添加数据完整性验证
- 优化迁移过程的日志输出
- 确保迁移失败不影响原始数据

#### 兼容性增强
- **向后兼容**: 支持旧版本用户平滑升级
- **自动恢复**: 无需手动干预即可修复数据
- **零停机**: 迁移过程透明，不影响使用

---

## ✅ 测试验证

### 功能测试
- ✅ 账号添加功能正常
- ✅ 账号列表显示正常
- ✅ 账号切换功能正常
- ✅ 当前账号查询正常

### 兼容性测试
- ✅ 新格式数据加载正常
- ✅ 旧格式数据自动迁移成功
- ✅ 迁移后数据保存正确

### 集成测试
- ✅ OpenClaw插件集成正常
- ✅ CLI工具工作正常
- ✅ API连接测试通过

---

## 📦 升级指南

### 自动升级（推荐）

```bash
# 拉取最新代码
git pull origin main

# 或者重新克隆
git clone https://github.com/alvin-susu/feishu_docs_download.git
```

### 手动升级

```bash
# 1. 备份现有数据
cp -r data/ data.backup/

# 2. 更新代码
git fetch origin
git checkout v2.1.1

# 3. 同步到OpenClaw
rsync -av --exclude='node_modules' --exclude='.git' \
  /home/sudi/WebstormProjects/feishu_docs_download/ \
  ~/.openclaw/workspace/skills/feishu-wiki-assistant/

# 4. 重启OpenClaw
pkill -f openclaw && openclaw &
```

### 验证升级

```bash
# 测试账号管理
cd ~/.openclaw/workspace/skills/feishu-wiki-assistant
ENCRYPTION_KEY=your_key node scripts/account-cli.js list
```

---

## 🔍 问题排查

### Q: 升级后仍然报错"账号不存在"？

**A**: 请检查以下几点：

1. 确认 ENCRYPTION_KEY 环境变量已设置：
   ```bash
   echo $ENCRYPTION_KEY  # 应该显示至少32字符的密钥
   ```

2. 检查 accounts.json 文件格式：
   ```bash
   cat data/accounts.json | head -20
   # 应该看到: "accounts": [ ["bot_xxx", { ... }] ]
   ```

3. 如果格式仍然是旧格式，删除该文件重新添加账号：
   ```bash
   rm data/accounts.json
   ENCRYPTION_KEY=your_key node scripts/account-cli.js add
   ```

### Q: 数据迁移失败怎么办？

**A**:
1. 检查文件权限：`ls -la data/accounts.json`
2. 备份现有数据：`cp data/accounts.json data/accounts.json.backup`
3. 尝试手动删除并重新添加账号

### Q: 升级后OpenClaw无法加载插件？

**A**:
1. 确认代码已同步到OpenClaw目录
2. 重启OpenClaw：`pkill -f openclaw && openclaw`
3. 查看OpenClaw日志排查具体错误

---

## 📝 相关文档

- [完整更新日志](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/about/CHANGELOG.md)
- [用户配置指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/USER-GUIDE.md)
- [调试指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/guides/DEBUG-GUIDE.md)
- [安全指南](https://github.com/alvin-susu/feishu_docs_download/blob/main/docs/security/SECURITY-GUIDE.md)

---

## 🤝 反馈渠道

- 🐛 [提交Bug](https://github.com/alvin-susu/feishu_docs_download/issues)
- 💡 [功能建议](https://github.com/alvin-susu/feishu_docs_download/discussions)
- 📧 联系作者: alvin-susu

---

## 📄 许可证

MIT License - 详见 [LICENSE](https://github.com/alvin-susu/feishu_docs_download/blob/main/LICENSE)

---

**发布负责人**: Claude AI
**发布日期**: 2026-03-08
**下载地址**: https://github.com/alvin-susu/feishu_docs_download/releases/tag/v2.1.1
