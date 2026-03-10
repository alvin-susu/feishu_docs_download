# 📚 飞书知识库智能助手 - 文档中心

**文档版本**: v2.1
**最后更新**: 2026-03-10
**文档组织**: 精简分类结构

---

## 📖 文档导航

欢迎来到飞书知识库智能助手的文档中心！文档已按类别组织，方便查找。

### 🚀 快速开始

| 文档 | 说明 | 适用对象 |
|------|------|----------|
| [**用户配置指南**](guides/USER-GUIDE.md) | 完整的用户安装和配置教程 | 新用户 |
| [**使用说明**](guides/USAGE.md) | 功能使用指南 | 所有用户 |
| [**调试指南**](guides/DEBUG-GUIDE.md) | 开发调试和问题排查 | 开发者 |
| [**演示指南**](guides/DEMO-GUIDE.md) | 完整功能演示和测试 | 测试人员 |

### 🔒 安全与部署

| 文档 | 说明 | 重要性 |
|------|------|--------|
| [**安全指南**](security/SECURITY-GUIDE.md) | 完整的安全配置和应急处理 | 🔴 必读 |
| [**部署指南**](deployment/DEPLOYMENT-GUIDE.md) | 完整的部署和配置说明 | ⭐ 推荐 |

### 📋 项目信息

| 文档 | 说明 | 用途 |
|------|------|------|
| [**更新日志**](about/CHANGELOG.md) | 版本更新记录 | 了解新功能 |
| [**多账号管理**](about/MULTI-ACCOUNT.md) | 多机器人账号配置 | 高级功能 |
| [**目录结构说明**](about/DIRECTORY-STRUCTURE.md) | 项目目录和文件说明 | 开发参考 |

## 🎯 按使用场景查找

### 我是新用户
1. 📖 阅读 [用户配置指南](guides/USER-GUIDE.md)
2. 🔒 查看 [安全指南](security/SECURITY-GUIDE.md) 的安全配置部分
3. 🚀 按照README.md快速开始

### 我是开发者
1. 🔧 阅读 [调试指南](guides/DEBUG-GUIDE.md)
2. 🚀 查看 [部署指南](deployment/DEPLOYMENT-GUIDE.md)
3. 📁 了解 [目录结构说明](about/DIRECTORY-STRUCTURE.md)

### 遇到安全问题
1. 🚨 立即查看 [安全指南](security/SECURITY-GUIDE.md) 的紧急处理部分
2. 🔒 运行安全检查脚本
3. 📞 参考应急处理流程

### 想要深度配置
1. 👥 阅读 [多账号管理](about/MULTI-ACCOUNT.md)
2. 🚀 查看 [部署指南](deployment/DEPLOYMENT-GUIDE.md) 的生产环境配置
3. 🔧 参考调试指南进行高级配置

## 📁 文档目录结构

```
docs/
├── 📖 guides/              # 用户指南 (4个)
│   ├── USER-GUIDE.md       - 用户配置指南
│   ├── DEBUG-GUIDE.md      - 调试指南
│   ├── USAGE.md            - 使用说明
│   └── DEMO-GUIDE.md       - 演示指南
│
├── 🔒 security/             # 安全相关 (1个)
│   └── SECURITY-GUIDE.md   - 安全配置指南
│
├── 🚀 deployment/           # 部署相关 (1个)
│   └── DEPLOYMENT-GUIDE.md - 部署指南
│
├── 📋 about/                # 项目信息 (3个)
│   ├── CHANGELOG.md        - 更新日志
│   ├── MULTI-ACCOUNT.md    - 多账号功能
│   └── DIRECTORY-STRUCTURE.md - 目录结构
│
└── 🔍 INDEX.md             - 文档索引 (本文档)
```

## 📊 文档统计

### 分类统计
```
📖 用户指南类: 4个文档
🔒 安全部署类: 2个文档
📋 项目信息类: 3个文档
🔍 索引导航: 1个文档
──────────────────────
总计: 10个文档 (已精简)
```

### 文档组织优化
- ✅ **按功能类型分类组织**
- ✅ **4个主要目录，结构清晰**
- ✅ **移除内部/临时文档**
- ✅ **保留核心用户文档**
- ✅ **精简结构，易于查找**

## 📝 文档维护说明

### 文档更新规范
- **用户指南** (`guides/`): 配合新功能更新
- **安全指南** (`security/`): 安全问题修复后立即更新
- **部署指南** (`deployment/`): 部署流程变化时更新
- **项目信息** (`about/`): 重大改进后更新

### 文档优先级
1. 🔴 **紧急**: 安全指南 (security/SECURITY-GUIDE.md)
2. ⭐ **重要**: 用户配置指南 (guides/USER-GUIDE.md)
3. 📋 **常规**: 功能使用说明 (guides/USAGE.md)
4. 📚 **参考**: 开发者文档 (guides/DEBUG-GUIDE.md)

### 添加新文档指南
根据文档类型，将新文档放入相应的文件夹：
- **教程和指南**: 放入 `guides/`
- **安全相关**: 放入 `security/`
- **部署和安装**: 放入 `deployment/`
- **项目信息和报告**: 放入 `about/`

## 🔗 外部资源

- [飞书开放平台](https://open.feishu.cn/)
- [OpenClaw文档](https://docs.openclaw.ai)
- [Node.js文档](https://nodejs.org/docs)

---

**💡 提示**: 如果您找不到需要的文档，请查看项目主目录的 [README.md](../README.md) 或提交Issue请求添加新文档。

**📅 文档最后更新**: 2026-03-10
**🔄 文档结构优化**: v2.1 - 精简文档结构，移除内部文档
