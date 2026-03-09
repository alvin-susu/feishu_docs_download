# 文档协作者权限设置问题排查

**文档ID**: UDwOdULGkoRSBlxRDmKcEoaQnNh
**问题**: 为对话中的人分配协作者可编辑权限没有生效
**最后更新**: 2026-03-09

---

## 🔍 最新代码改进

### 2026-03-09 更新

1. **多种API方案尝试**：代码现在会尝试3种不同的API方案
   - 方案1: `/docx/v1/documents/{id}/shares` (share_type: 'user')
   - 方案2: `/docx/v1/documents/{id}/permissions`
   - 方案3: 使用 `full` 权限尝试

2. **详细日志输出**：
   - 输出待添加的用户ID列表
   - 每个方案的执行结果
   - 成功/失败计数

3. **错误诊断改进**：
   - 捕获每个方案的错误信息
   - 提供更清晰的失败原因

---

## 🔐 需要的飞书权限

在飞书开放平台配置以下权限（必需）：

### 文档权限相关
```
✅ docx:document:permission       - 管理文档权限（必需）
✅ docx:permission:member:update - 更新协作者权限（必需）
```

### 联系人相关（用于获取群成员）
```
✅ contact:user.base:readonly    - 读取用户基本信息
✅ contact:group:readonly        - 读取群组信息
```

### 重要提示
1. 添加权限后必须点击"发布应用"或"申请权限"
2. 权限发布后可能需要等待几分钟生效

---

## 🧪 测试步骤

### 1. 运行测试脚本

```bash
cd ~/.openclaw/workspace/skills/feishu-wiki-assistant
node scripts/test-document-permission.js
```

### 2. 查看日志

创建文档后查看日志输出：
- `📝 开始为文档 XXX 添加 N 个协作者（权限：edit）`
- `📋 待添加的用户ID: ou_xxx, ou_yyy`
- `✅ 权限设置完成: 成功 X 个，失败 Y 个`

### 3. 手动验证

1. 打开文档：https://zhipu-ai.feishu.cn/docx/UDwOdULGkoRSBlxRDmKcEoaQnNh
2. 点击右上角"..."
3. 查看"协作者"列表

---

## 🔧 可能的问题原因

### 1. API权限不足

**症状**：API调用返回权限错误

**解决**：
- 访问飞书开放平台
- 添加 `docx:document:permission` 权限
- 点击发布应用

### 2. 用户ID格式错误

**症状**：API调用成功但用户未被添加

**说明**：
- 飞书用户ID格式为 `ou_xxx`
- 确保从群成员列表获取的ID格式正确

### 3. API端点不正确

**症状**：API返回 404 或其他错误

**说明**：已更新代码尝试多种API格式

---

## 📝 当前实现代码

```javascript
async addDocumentCollaborators(documentId, options = {}) {
    // 获取用户ID列表（从群成员或直接提供）
    const userIds = await this.getConversationMembers(chatType, chatId);

    // 尝试3种方案添加协作者
    for (const userId of userIds) {
        // 方案1: /shares 接口
        await this.apiRequest('POST', `/docx/v1/documents/${documentId}/shares`, {
            share_type: 'user',
            share_id: userId,
            perm: 'write',
            notify: false
        });

        // 方案2: /permissions 接口
        await this.apiRequest('POST', `/docx/v1/documents/${documentId}/permissions`, {
            member_type: 'user',
            member_id: userId,
            type: 'edit'
        });
    }
}
```

---

## 📖 参考资源

- [飞书开放平台](https://open.feishu.cn/)
- [文档权限API](https://open.feishu.cn/document/server-docs/docs/docs/docx/permission/)

---

## ⚠️ 注意事项

1. **权限必须发布**：在飞书开放平台添加权限后，必须点击"发布应用"
2. **API版本**：飞书API有v1和v2版本，不同版本端点可能不同
3. **用户ID格式**：飞书用户ID格式为 `ou_xxx`（需要从群成员API获取）

---

**状态**: 🔄 排查中
**下一步**: 运行测试脚本查看详细错误信息
