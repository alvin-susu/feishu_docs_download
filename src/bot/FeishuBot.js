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
     */
    async createDocument(title, content) {
        const response = await this.apiRequest('POST', '/docx/v1/documents', {
            title,
            content
        });
        return response.data.document.document_id;
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
