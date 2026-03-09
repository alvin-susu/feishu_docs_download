# 文档协作者权限管理

## 功能说明

从 v2.1.1 版本开始，飞书知识库智能助手在创建文档时会**自动将对话参与者添加为文档协作者**，解决了之前只有机器人能访问文档的问题。

## 问题背景

### 之前的问题
- 机器人创建的文档只有机器人自己拥有访问权限
- 对话中的其他用户无法查看或编辑这些文档
- 需要手动添加协作者，操作繁琐

### 解决方案
- ✅ 自动检测对话类型（私聊/群聊）
- ✅ 自动获取对话参与者列表
- ✅ 自动将参与者添加为文档协作者
- ✅ 支持自定义权限级别（查看/编辑/评论）

## 实现机制

### 1. 对话类型识别

```javascript
// 私聊：只有发送者和机器人
context.chatType = 'private'
context.chatId = 'user_xxx'

// 群聊：群内所有成员
context.chatType = 'group'
context.chatId = 'oc_xxx'
```

### 2. 成员列表获取

#### 私聊场景
```javascript
// 直接返回发送者ID
userIds = [sender_id]
```

#### 群聊场景
```javascript
// 调用飞书API获取群成员列表
GET /contact/v3/groups/{group_id}/members

// 过滤出真实用户（排除机器人、服务号等）
userIds = members
    .filter(m => m.member_id_type === 'user')
    .map(m => m.member_id)
```

### 3. 权限设置

```javascript
// 批量创建文档权限
POST /docx/v1/documents/{document_id}/permissions/batch_create

{
  "permissions": [
    {
      "user_id": "user_xxx",
      "type": "edit",      // view | edit | comment
      "notify": false      // 不发送通知
    },
    ...
  ]
}
```

## 使用示例

### 示例1：群聊中创建会议文档

```bash
# 群聊场景
你: @机器人 创建会议记录：产品讨论会

# 机器人执行
1. 获取群成员列表 [user_a, user_b, user_c]
2. 创建文档"产品讨论会"
3. 自动添加user_a, user_b, user_c为协作者（编辑权限）
4. 返回文档链接

# 结果
✅ 会议文档已生成
📄 文档标题：产品讨论会
👥 参与人数：3
🔐 权限：已自动添加群成员为协作者（可编辑）
```

### 示例2：私聊中创建文档

```bash
# 私聊场景
你: 新建文档：测试计划

# 机器人执行
1. 获取你的ID [your_user_id]
2. 创建文档"测试计划"
3. 自动添加your_user_id为协作者（编辑权限）
4. 返回文档链接

# 结果
✅ 文档创建成功
📄 文档标题：测试计划
🔐 权限：已自动添加您为协作者（可编辑）
```

## 权限级别

| 权限类型 | 说明 | 适用场景 |
|---------|------|---------|
| `view` | 查看权限 | 只读文档、公告 |
| `edit` | 编辑权限 | **默认值**，协作文档 |
| `comment` | 评论权限 | 需要反馈但不修改的文档 |

## API权限要求

需要在飞书开放平台配置以下权限：

### 文档相关
```
docx:document:create       - 创建文档
docx:document:write        - 修改文档内容
docx:document:permission   - 管理文档权限 ✨ 新增
```

### 联系人相关
```
contact:user:readonly      - 读取用户信息
contact:group:readonly     - 读取群组信息 ✨ 新增
contact:group.member:readonly - 读取群成员 ✨ 新增
```

## 代码实现

### FeishuBot.js - 核心方法

```javascript
/**
 * 创建文档（支持添加协作者）
 */
async createDocument(title, content, options = {}) {
    const response = await this.apiRequest('POST', '/docx/v1/documents', {
        title,
        content
    });
    const documentId = response.data.document.document_id;

    // 自动添加协作者权限
    if (options.collaborators || options.chatId) {
        await this.addDocumentCollaborators(documentId, options);
    }

    return documentId;
}

/**
 * 添加文档协作者
 */
async addDocumentCollaborators(documentId, options = {}) {
    // 获取用户ID列表
    let userIds = options.collaborators ||
                  await this.getConversationMembers(options.chatType, options.chatId);

    // 批量设置权限
    const permissions = userIds.map(userId => ({
        user_id: userId,
        type: options.permissionType || 'edit',
        notify: false
    }));

    await this.apiRequest('POST',
        `/docx/v1/documents/${documentId}/permissions/batch_create`,
        { permissions }
    );
}

/**
 * 获取对话成员列表
 */
async getConversationMembers(chatType, chatId) {
    if (chatType === 'group') {
        // 群聊：调用API获取成员
        const response = await this.apiRequest('GET',
            `/contact/v3/groups/${chatId}/members`
        );
        return response.data.items
            .filter(item => item.member_id_type === 'user')
            .map(item => item.member_id);
    } else {
        // 私聊：返回对话者ID
        return [chatId];
    }
}
```

### 调用方式

```javascript
// 在MessageHandler中构建上下文
const context = {
    chatType: message.chat_type,  // 'private' | 'group'
    chatId: message.chat_id       // 群ID / 用户ID
};

// 创建文档时传递上下文
await this.bot.createDocument(title, content, {
    chatType: context.chatType,
    chatId: context.chatId,
    permissionType: 'edit'  // 可选，默认'edit'
});
```

## 错误处理

### 获取成员失败
```javascript
// 如果获取成员列表失败，不影响文档创建
try {
    await this.addDocumentCollaborators(documentId, options);
} catch (error) {
    console.error('添加文档协作者失败:', error);
    // 不抛出错误，避免影响文档创建主流程
}
```

### 权限不足
```javascript
// 如果机器人没有设置权限的权限
// 文档仍会创建成功，只是不会自动添加协作者
// 用户可以手动添加协作者
```

## 优势

### 1. 自动化
- 无需手动添加协作者
- 自动识别对话参与者
- 即时生效

### 2. 灵活性
- 支持私聊和群聊
- 可自定义权限级别
- 可覆盖默认行为

### 3. 安全性
- 只添加真实用户（排除机器人）
- 不发送不必要的通知
- 失败时不影响主流程

### 4. 用户体验
- 创建后立即可协作
- 无需额外操作
- 清晰的权限提示

## 版本历史

- **v2.1.1** (2026-03-08) - 初始实现
  - 自动添加对话参与者为协作者
  - 支持私聊和群聊场景
  - 可配置权限级别

## 相关文档

- [飞书开放平台 - 文档权限](https://open.feishu.cn/document/server-docs/docs/docs/doc-api/permission)
- [飞书开放平台 - 联系人API](https://open.feishu.cn/document/server-docs/contact-v3/user/get)
- [用户配置指南](../guides/USER-GUIDE.md)
- [安全指南](../security/SECURITY-GUIDE.md)

## 常见问题

### Q: 为什么有些群成员没有被添加？
A: 可能的原因：
1. 成员类型不是真实用户（如机器人、服务号）
2. API返回成员列表不完整
3. 权限配置不完整

### Q: 可以修改已创建文档的权限吗？
A: 可以，有以下方式：
1. 在飞书文档中手动添加/移除协作者
2. 使用API修改权限（需要额外开发）

### Q: 如何禁用自动添加协作者？
A: 可以在调用createDocument时不传递context参数：
```javascript
await this.bot.createDocument(title, content);
// 不传递options，不会添加协作者
```

### Q: 协作者会收到通知吗？
A: 不会。代码中设置`notify: false`，避免打扰用户。

---

**功能负责人**: Claude AI
**最后更新**: 2026-03-09
**状态**: ✅ 已实现并测试
