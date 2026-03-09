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
     * @param {string} options.permissionType - 权限类型: 'view'|'edit'|'comment'
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
     * @param {string} documentId - 文档ID
     * @param {Object} options - 选项
     * @param {Array<string>} options.collaborators - 协作者ID列表
     * @param {string} options.chatType - 对话类型
     * @param {string} options.chatId - 对话ID
     * @param {string} options.permissionType - 权限类型: 'view'|'edit'|'comment'
     */
    async addDocumentCollaborators(documentId, options = {}) {
        try {
            let userIds = [];

            // 如果直接提供了协作者列表
            if (options.collaborators && Array.isArray(options.collaborators)) {
                userIds = options.collaborators;
            }
            // 如果提供了对话信息，自动获取成员
            else if (options.chatId) {
                userIds = await this.getConversationMembers(options.chatType, options.chatId);
            }

            if (userIds.length === 0) {
                console.log('⚠️ 没有需要添加的协作者');
                return;
            }

            // 添加文档权限
            const permissionType = options.permissionType || 'edit'; // 默认给编辑权限
            const permissions = userIds.map(userId => ({
                user_id: userId,
                type: permissionType,
                notify: false // 不发送通知
            }));

            await this.apiRequest('POST', `/docx/v1/documents/${documentId}/permissions/batch_create`, {
                permissions
            });

            console.log(`✅ 已为文档 ${documentId} 添加 ${userIds.length} 个协作者（权限：${permissionType}）`);

        } catch (error) {
            console.error('添加文档协作者失败:', error);
            // 不抛出错误，避免影响文档创建主流程
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
}

module.exports = FeishuBot;
