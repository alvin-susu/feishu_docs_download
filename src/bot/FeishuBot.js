/**
 * 飞书机器人核心类
 * 处理与飞书开放平台的交互
 */

const axios = require('axios');
const crypto = require('crypto');

class FeishuBot {
    constructor() {
        this.appId = process.env.FEISHU_APP_ID;
        this.appSecret = process.env.FEISHU_APP_SECRET;
        this.verificationToken = process.env.FEISHU_VERIFICATION_TOKEN;
        this.encryptKey = process.env.FEISHU_ENCRYPT_KEY;

        this.accessToken = null;
        this.tokenExpireTime = 0;

        this.apiBaseUrl = 'https://open.feishu.cn/open-apis';
        this.eventHandlers = new Map();
    }

    /**
     * 初始化机器人
     */
    async initialize() {
        if (!this.appId || !this.appSecret) {
            throw new Error('飞书应用凭证未配置');
        }

        // 获取访问令牌
        await this.refreshAccessToken();

        console.log('✅ 飞书机器人初始化完成');
    }

    /**
     * 刷新访问令牌
     */
    async refreshAccessToken() {
        try {
            const response = await axios.post(`${this.apiBaseUrl}/auth/v3/tenant_access_token/internal`, {
                app_id: this.appId,
                app_secret: this.appSecret
            });

            if (response.data.code === 0) {
                this.accessToken = response.data.tenant_access_token;
                this.tokenExpireTime = Date.now() + (response.data.expire - 300) * 1000; // 提前5分钟刷新
                console.log('✅ 访问令牌刷新成功');
            } else {
                throw new Error(`获取访问令牌失败: ${response.data.msg}`);
            }
        } catch (error) {
            console.error('刷新访问令牌错误:', error.message);
            throw error;
        }
    }

    /**
     * 获取有效的访问令牌
     */
    async getAccessToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpireTime) {
            await this.refreshAccessToken();
        }
        return this.accessToken;
    }

    /**
     * 发送API请求
     */
    async apiRequest(method, endpoint, data = null, params = null) {
        const token = await this.getAccessToken();

        try {
            const config = {
                method,
                url: `${this.apiBaseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data) config.data = data;
            if (params) config.params = params;

            const response = await axios(config);

            if (response.data.code !== 0) {
                throw new Error(`API请求失败: ${response.data.msg}`);
            }

            return response.data;
        } catch (error) {
            console.error(`API请求错误 [${method} ${endpoint}]:`, error.message);
            throw error;
        }
    }

    /**
     * 发送消息
     */
    async sendMessage(chatId, content) {
        return await this.apiRequest('POST', '/im/v1/messages', {
            receive_id_type: 'chat_id',
            msg_type: 'text',
            content: JSON.stringify({ text: content }),
            receive_id: chatId
        });
    }

    /**
     * 发送富文本消息
     */
    async sendRichMessage(chatId, elements) {
        return await this.apiRequest('POST', '/im/v1/messages', {
            receive_id_type: 'chat_id',
            msg_type: 'interactive',
            content: JSON.stringify(elements),
            receive_id: chatId
        });
    }

    /**
     * 获取知识库列表
     */
    async getWikiList() {
        return await this.apiRequest('GET', '/wiki/v2/spaces');
    }

    /**
     * 获取知识库节点
     */
    async getWikiNode(wikiSpaceId, parentNodeId = '') {
        const params = { page_size: 50 };
        if (parentNodeId) {
            params.parent_node_token = parentNodeId;
        }
        return await this.apiRequest('GET', `/wiki/v2/spaces/${wikiSpaceId}/nodes`, null, params);
    }

    /**
     * 获取文档内容
     */
    async getDocumentContent(documentId) {
        const response = await this.apiRequest('GET', `/docx/v1/documents/${documentId}/blocks/document`);

        // 获取文档块内容
        const blocksResponse = await this.apiRequest(
            'GET',
            `/docx/v1/documents/${documentId}/blocks/${response.data.document.block_id}/children`
        );

        return this.extractTextFromBlocks(blocksResponse.data.items);
    }

    /**
     * 从块中提取文本
     */
    extractTextFromBlocks(blocks) {
        let text = '';
        blocks.forEach(block => {
            if (block.block_type === 1 && block.text_run) { // 文本块
                text += block.text_run.content + ' ';
            } else if (block.block_type === 2 && block.heading1) { // 标题1
                text += '\n# ' + block.heading1.children[0]?.text_run?.content + '\n';
            } else if (block.block_type === 3 && block.heading2) { // 标题2
                text += '\n## ' + block.heading2.children[0]?.text_run?.content + '\n';
            } else if (block.block_type === 4 && block.heading3) { // 标题3
                text += '\n### ' + block.heading3.children[0]?.text_run?.content + '\n';
            } else if (block.block_type === 13 && block.bullet_list) { // 列表
                block.bullet_list.children.forEach(child => {
                    text += '\n- ' + child.text_run?.content;
                });
                text += '\n';
            }
        });
        return text.trim();
    }

    /**
     * 创建文档
     * @param {string} title - 文档标题
     * @param {string} content - 文档内容
     * @param {Object} options - 额外选项
     * @param {Array<string>} options.collaborators - 协作者ID列表
     * @param {string} options.chatType - 对话类型: 'private'|'group'
     * @param {string} options.chatId - 对话ID（群聊）/ 用户ID（私聊）
     * @param {string} options.permissionType - 权限类型: 'view'|'edit'|'comment'|'full'(管理者)
     * @param {Function} options.toolExecutor - OpenClaw工具执行器（可选，用于调用feishu_perm）
     */
    async createDocument(title, content, options = {}) {
        const response = await this.apiRequest('POST', '/docx/v1/documents', {
            title,
            content
        });
        const documentId = response.data.document.document_id;

        // 自动添加管理者权限
        if (options.collaborators || options.chatId) {
            // 优先使用 feishu_perm 工具（如果提供了 toolExecutor）
            if (options.toolExecutor) {
                await this.addDocumentAdminWithPermTool(documentId, options, options.toolExecutor);
            } else {
                await this.addDocumentAdmin(documentId, options);
            }
        }

        return documentId;
    }

    /**
     * 添加文档管理者 - 支持直接添加群聊
     * @param {string} documentId - 文档ID
     * @param {Object} options - 选项
     * @param {Array<string>} options.collaborators - 管理者ID列表
     * @param {string} options.chatType - 对话类型: 'group' | 'private'
     * @param {string} options.chatId - 对话ID（群ID或用户ID）
     * @param {string} options.permissionType - 权限类型: 'view'|'edit'|'comment'|'full'
     */
    async addDocumentAdmin(documentId, options = {}) {
        try {
            // 默认使用管理者权限 (full)
            const permissionType = options.permissionType || 'full';
            const chatId = options.chatId;
            const chatType = options.chatType;
            let successCount = 0;
            let failCount = 0;

            // 优先方案1: 直接添加群聊为管理者（仅群聊）
            if (chatType === 'group' && chatId) {
                console.log(`📝 尝试将群 ${chatId} 添加为文档管理者...`);
                try {
                    await this.apiRequest('POST', `/docx/v1/documents/${documentId}/shares`, {
                        share_type: 'chat',
                        share_id: chatId,
                        perm: 'full',  // 管理者权限
                        notify: false
                    });
                    console.log(`  ✅ 群聊已添加为管理者`);
                    return;
                } catch (error) {
                    console.log(`  ⚠️ 添加群聊失败: ${error.message}`);
                    console.log(`  📋 尝试添加群成员...`);
                }
            }

            // 方案2: 添加群成员或个人
            let userIds = [];

            // 如果直接提供了管理者列表
            if (options.collaborators && Array.isArray(options.collaborators)) {
                userIds = options.collaborators;
            }
            // 如果提供了对话信息，获取成员
            else if (chatId) {
                userIds = await this.getConversationMembers(chatType, chatId);
            }

            if (userIds.length === 0) {
                console.log('⚠️ 没有需要添加的管理者');
                return;
            }

            console.log(`📝 开始为文档添加 ${userIds.length} 个管理者（权限：${permissionType}）`);

            // 逐个添加管理者
            for (const userId of userIds) {
                let added = false;

                // 方案A: POST /docx/v1/documents/{document_id}/shares (full权限)
                try {
                    await this.apiRequest('POST', `/docx/v1/documents/${documentId}/shares`, {
                        share_type: 'user',
                        share_id: userId,
                        perm: 'full',  // 管理者权限
                        notify: false
                    });
                    console.log(`  ✅ 已添加用户 ${userId} 为管理者`);
                    successCount++;
                    added = true;
                } catch (error) {
                    console.log(`  ⚠️ 用户 ${userId}: ${error.message}`);
                }

                // 方案B: /permissions 接口 (full类型)
                if (!added) {
                    try {
                        await this.apiRequest('POST', `/docx/v1/documents/${documentId}/permissions`, {
                            member_type: 'user',
                            member_id: userId,
                            type: 'full'  // 管理者权限
                        });
                        console.log(`  ✅ 用户 ${userId} 为管理者 (方案B)`);
                        successCount++;
                        added = true;
                    } catch (error) {
                        console.log(`  ⚠️ 用户 ${userId} (方案B): ${error.message}`);
                    }
                }

                if (!added) {
                    failCount++;
                }
            }

            console.log(`✅ 权限设置完成: 成功 ${successCount} 个，失败 ${failCount} 个`);

        } catch (error) {
            console.error('添加文档协作者失败:', error);
        }
    }

    /**
     * 获取对话成员列表
     * @param {string} chatType - 对话类型: 'private'|'group'
     * @param {string} chatId - 对话ID（群聊）/ 用户ID（私聊）
     * @returns {Array<string>} 用户ID列表
     */
    async getConversationMembers(chatType, chatId) {
        try {
            let userIds = [];

            if (chatType === 'group') {
                // 群聊：获取群成员列表
                const response = await this.apiRequest('GET', `/contact/v3/groups/${chatId}/members`, {
                    user_id_type: 'user_id',
                    page_size: 50
                });

                if (response.data && response.data.items) {
                    userIds = response.data.items
                        .map(item => item.member_id_type === 'user' ? item.member_id : null)
                        .filter(id => id !== null);
                }
            } else if (chatType === 'private') {
                // 私聊：返回对话者ID
                userIds = [chatId];
            }

            console.log(`📋 从${chatType === 'group' ? '群聊' : '私聊'}获取到 ${userIds.length} 个成员`);
            return userIds;

        } catch (error) {
            console.error('获取对话成员失败:', error);
            return [];
        }
    }

    /**
     * 使用 OpenClaw 内置 feishu_perm 工具添加文档管理者
     * @param {string} documentId - 文档ID
     * @param {Object} options - 选项
     * @param {Function} toolExecutor - OpenClaw 工具执行器 (context.tools.execute)
     */
    async addDocumentAdminWithPermTool(documentId, options = {}, toolExecutor = null) {
        if (!toolExecutor) {
            console.log('⚠️ 未提供工具执行器，回退到API方式');
            return await this.addDocumentAdmin(documentId, options);
        }

        try {
            const permissionType = options.permissionType || 'full_access';
            const chatId = options.chatId;
            const chatType = options.chatType;

            // 优先添加群聊为管理者
            if (chatType === 'group' && chatId) {
                console.log(`📝 使用 feishu_perm 工具将群 ${chatId} 添加为文档管理者...`);
                try {
                    const result = await toolExecutor('feishu_perm', {
                        action: 'add',
                        token: documentId,
                        type: 'docx',
                        member_type: 'openchat',
                        member_id: chatId,
                        perm: permissionType
                    });
                    console.log('  ✅ 群聊已添加为管理者 (feishu_perm)');
                    return result;
                } catch (error) {
                    console.log(`  ⚠️ feishu_perm 添加群聊失败: ${error.message}`);
                }
            }

            // 获取用户ID列表
            let userIds = [];
            if (options.collaborators && Array.isArray(options.collaborators)) {
                userIds = options.collaborators;
            } else if (chatId) {
                userIds = await this.getConversationMembers(chatType, chatId);
            }

            if (userIds.length === 0) {
                console.log('⚠️ 没有需要添加的管理者');
                return;
            }

            console.log(`📝 使用 feishu_perm 工具添加 ${userIds.length} 个管理者...`);

            let successCount = 0;
            for (const userId of userIds) {
                try {
                    const result = await toolExecutor('feishu_perm', {
                        action: 'add',
                        token: documentId,
                        type: 'docx',
                        member_type: 'userid',
                        member_id: userId,
                        perm: permissionType
                    });
                    console.log(`  ✅ 用户 ${userId} 已添加为管理者`);
                    successCount++;
                } catch (error) {
                    console.log(`  ⚠️ 用户 ${userId}: ${error.message}`);
                }
            }

            console.log(`✅ feishu_perm 添加完成: 成功 ${successCount} 个`);
            return { successCount };

        } catch (error) {
            console.error('feishu_perm 添加管理者失败:', error.message);
            // 回退到API方式
            return await this.addDocumentAdmin(documentId, options);
        }
    }

    /**
     * 获取知识库所有节点（递归）
     * @param {string} wikiSpaceId - 知识库ID
     * @returns {Array} 节点列表
     */
    async getAllWikiNodes(wikiSpaceId) {
        const allNodes = [];
        const queue = [''];

        while (queue.length > 0) {
            const parentNodeToken = queue.shift();
            const response = await this.getWikiNode(wikiSpaceId, parentNodeToken);

            if (response.data && response.data.items) {
                const nodes = response.data.items;
                allNodes.push(...nodes);

                // 将节点类型的节点加入队列，继续获取子节点
                nodes.forEach(node => {
                    if (node.obj_type === 'node') {
                        queue.push(node.node_token);
                    }
                });
            }
        }

        return allNodes;
    }

    /**
     * 在知识库中创建节点
     */
    async createWikiNode(wikiSpaceId, parentNodeToken, documentId, title) {
        return await this.apiRequest('POST', `/wiki/v2/spaces/${wikiSpaceId}/nodes`, {
            parent_node_token: parentNodeToken,
            obj_type: 'document',
        node_type: 'origin',
        title,
        document_id: documentId
    });
    }

    /**
     * 在文档中添加待办事项
     */
    async addTodoItem(documentId, todoText) {
        // 需要先获取文档块结构，然后添加待办块
        const response = await this.apiRequest('GET', `/docx/v1/documents/${documentId}/blocks/document`);
        const blockId = response.data.document.block_id;

        return await this.apiRequest('POST', `/docx/v1/documents/${documentId}/blocks/${blockId}/children`, {
            block_type: 10, // 待办块类型
            todo: {
                checked: false,
                children: [{
                    text_run: {
                        content: todoText
                    }
                }]
            }
        });
    }

    /**
     * 验证事件回调
     */
    verifyEvent(headers, body) {
        // 验证时间戳
        const timestamp = headers['x-lark-request-timestamp'];
        const nonce = headers['x-lark-request-nonce'];
        const signature = headers['x-lark-signature'];

        const signBase = `${timestamp}\n${nonce}\n${JSON.stringify(body)}`;
        const expectedSignature = crypto
            .createHmac('SHA256', this.encryptKey)
            .update(signBase)
            .digest('base64');

        return signature === expectedSignature;
    }

    /**
     * 注册事件处理器
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * 触发事件
     */
    async emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                await handler(data);
            }
        }
    }

    /**
     * 启动机器人
     */
    async start() {
        // 这里应该启动HTTP服务器监听飞书回调
        // 具体实现取决于部署方式
        console.log('✅ 飞书机器人启动完成');
    }

    /**
     * 停止机器人
     */
    async stop() {
        console.log('🛑 飞书机器人已停止');
    }

    /**
     * 获取对话历史消息
     * @param {string} chatId - 对话ID（群聊或私聊）
     * @param {Object} options - 选项
     * @param {number} options.limit - 获取消息数量（默认50，最大100）
     * @param {string} options.cursor - 分页游标
     * @param {string} options.containerIdType - 容器ID类型: 'chat' | 'open_chat_id'
     * @returns {Object} 消息列表和分页信息
     */
    async getChatHistory(chatId, options = {}) {
        try {
            const {
                limit = 50,
                cursor = '',
                containerIdType = 'chat'
            } = options;

            // 限制最大数量
            const pageSize = Math.min(limit, 100);

            const response = await this.apiRequest('GET', `/im/v1/messages`, null, {
                container_id_type: containerIdType,
                container_id: chatId,
                page_size: pageSize,
                cursor: cursor
            });

            return {
                messages: response.data.items || [],
                hasMore: response.data.has_more || false,
                cursor: response.data.page_token || ''
            };

        } catch (error) {
            console.error('获取对话历史失败:', error);
            throw new Error(`获取对话历史失败: ${error.message}`);
        }
    }

    /**
     * 获取所有历史消息（自动分页）
     * @param {string} chatId - 对话ID
     * @param {Object} options - 选项
     * @param {number} options.maxMessages - 最大消息数量（默认200）
     * @param {number} options.pageSize - 每页大小（默认50）
     * @returns {Array} 消息列表
     */
    async getAllChatHistory(chatId, options = {}) {
        const {
            maxMessages = 200,
            pageSize = 50
        } = options;

        const allMessages = [];
        let cursor = '';
        let hasMore = true;

        while (hasMore && allMessages.length < maxMessages) {
            const response = await this.getChatHistory(chatId, {
                limit: Math.min(pageSize, maxMessages - allMessages.length),
                cursor: cursor
            });

            allMessages.push(...response.messages);

            hasMore = response.hasMore && allMessages.length < maxMessages;
            cursor = response.cursor;

            // 避免API限流
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`📋 获取到 ${allMessages.length} 条历史消息`);
        return allMessages;
    }

    /**
     * 获取单条消息详情
     * @param {string} messageId - 消息ID
     * @returns {Object} 消息详情
     */
    async getMessage(messageId) {
        try {
            const response = await this.apiRequest('GET', `/im/v1/messages/${messageId}`);
            return response.data;
        } catch (error) {
            console.error('获取消息详情失败:', error);
            throw new Error(`获取消息详情失败: ${error.message}`);
        }
    }

    /**
     * 解析消息内容
     * @param {Object} message - 消息对象
     * @returns {Object} 解析后的消息
     */
    parseMessage(message) {
        const parsed = {
            messageId: message.message_id,
            messageType: message.msg_type,
            createTime: message.create_time,
            senderId: message.sender?.sender_id?.user_id || message.sender?.user_id,
            senderType: message.sender?.sender_type || 'user',
            chatId: message.chat_id,
            content: null,
            text: ''
        };

        try {
            // 解析不同类型的消息
            switch (message.msg_type) {
                case 'text':
                    const textContent = JSON.parse(message.content);
                    parsed.text = textContent.text || '';
                    parsed.content = textContent;
                    break;

                case 'post':
                    const postContent = JSON.parse(message.content);
                    parsed.text = this.extractPostText(postContent.post);
                    parsed.content = postContent;
                    break;

                case 'interactive':
                    const cardContent = JSON.parse(message.content);
                    parsed.text = this.extractCardText(cardContent);
                    parsed.content = cardContent;
                    break;

                default:
                    parsed.content = message.content;
                    parsed.text = `[${message.msg_type}类型消息]`;
            }
        } catch (error) {
            console.error('解析消息内容失败:', error);
            parsed.text = '[无法解析的消息]';
        }

        return parsed;
    }

    /**
     * 提取富文本消息的文本内容
     * @param {Object} post - 富文本对象
     * @returns {string} 提取的文本
     */
    extractPostText(post) {
        if (!post || !post.content) return '';

        let text = '';
        for (const element of post.content) {
            if (element.tag === 'text') {
                text += element.text || '';
            } else if (element.tag === 'text_link') {
                text += element.text || '';
            } else if (element.tag === 'at') {
                text += `@${element.user_id || ''}`;
            } else if (element.tag === 'br') {
                text += '\n';
            }
        }
        return text;
    }

    /**
     * 提取卡片消息的文本内容
     * @param {Object} card - 卡片对象
     * @returns {string} 提取的文本
     */
    extractCardText(card) {
        if (!card) return '';

        try {
            // 简单的文本提取
            return JSON.stringify(card, null, 2);
        } catch (error) {
            return '[卡片消息]';
        }
    }

    /**
     * 根据关键词搜索历史消息
     * @param {string} chatId - 对话ID
     * @param {string} keyword - 关键词
     * @param {Object} options - 选项
     * @param {number} options.maxMessages - 搜索的最大消息数
     * @returns {Array} 匹配的消息列表
     */
    async searchMessages(chatId, keyword, options = {}) {
        const {
            maxMessages = 200
        } = options;

        const allMessages = await this.getAllChatHistory(chatId, {
            maxMessages: maxMessages
        });

        const parsedMessages = allMessages.map(msg => this.parseMessage(msg));

        // 搜索包含关键词的消息
        const matched = parsedMessages.filter(msg => {
            return msg.text.toLowerCase().includes(keyword.toLowerCase());
        });

        console.log(`🔍 搜索关键词"${keyword}"，找到 ${matched.length} 条匹配消息`);
        return matched;
    }
}

module.exports = FeishuBot;
