/**
 * 消息处理器
 * 处理来自飞书的用户消息，分发到对应的功能模块
 */

const DocumentLocator = require('../features/DocumentLocator');
const ContentSearcher = require('../features/ContentSearcher');
const AutoArchiver = require('../features/AutoArchiver');
const MeetingAssistant = require('../features/MeetingAssistant');

class MessageHandler {
    constructor(assistant) {
        this.assistant = assistant;
        this.bot = assistant.bot;
        this.indexer = assistant.indexer;

        // 初始化功能模块
        this.documentLocator = new DocumentLocator(assistant);
        this.contentSearcher = new ContentSearcher(assistant);
        this.autoArchiver = new AutoArchiver(assistant);
        this.meetingAssistant = new MeetingAssistant(assistant);

        // 命令模式
        this.commandPattern = /^\/(\w+)(?:\s+(.*))?$/;
    }

    /**
     * 处理消息
     */
    async process(message) {
        try {
            const { content, sender, chat_id, message_type } = message;

            // 解析消息内容
            const text = this.extractText(content);
            if (!text) return null;

            console.log(`📨 处理消息: ${text}`);

            // 构建对话上下文（用于权限设置）
            const context = this.buildContext(message);

            // 检查是否为命令
            const commandMatch = text.match(this.commandPattern);
            if (commandMatch) {
                const [, command, args] = commandMatch;
                return await this.handleCommand(command, args, message, context);
            }

            // 智能识别用户意图
            const intent = await this.recognizeIntent(text);

            // 根据意图分发处理
            switch (intent.type) {
                case 'find_document':
                    return await this.documentLocator.find(intent.query);

                case 'search_content':
                    return await this.contentSearcher.search(intent.query);

                case 'create_document':
                    return await this.autoArchiver.create(intent.title, intent.content, context);

                case 'add_todo':
                    return await this.meetingAssistant.addTodo(intent.documentId, intent.todoText, context);

                case 'help':
                    return this.getHelpMessage();

                default:
                    return await this.handleGeneralQuery(text);
            }

        } catch (error) {
            console.error('处理消息错误:', error);
            return '抱歉，处理您的请求时出现错误，请稍后重试。';
        }
    }

    /**
     * 构建对话上下文
     * @param {Object} message - 消息对象
     * @returns {Object} 上下文信息
     */
    buildContext(message) {
        const context = {};

        // 判断对话类型
        if (message.chat_type === 'group') {
            context.chatType = 'group';
            context.chatId = message.chat_id;
        } else if (message.chat_type === 'private' || message.sender_id) {
            context.chatType = 'private';
            context.chatId = message.sender_id || message.sender?.user_id;
        }

        return context;
    }

    /**
     * 提取文本内容
     */
    extractText(content) {
        if (typeof content === 'string') {
            return content.trim();
        }

        if (typeof content === 'object') {
            // 处理飞书消息格式
            if (content.text) {
                return content.text.trim();
            }
            if (content.content) {
                try {
                    const parsed = JSON.parse(content.content);
                    if (parsed.text) {
                        return parsed.text.trim();
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }

        return null;
    }

    /**
     * 识别用户意图
     */
    async recognizeIntent(text) {
        const lowerText = text.toLowerCase();

        // 文档查找意图
        if (this.matchPatterns(lowerText, [
            '在哪里', '找文档', '文档位置', '查找', 'find document', 'where is'
        ])) {
            return { type: 'find_document', query: this.extractQuery(text) };
        }

        // 内容检索意图
        if (this.matchPatterns(lowerText, [
            '搜索', '检索', '查找内容', '关于', 'search', '关于什么'
        ])) {
            return { type: 'search_content', query: this.extractQuery(text) };
        }

        // 创建文档意图
        if (this.matchPatterns(lowerText, [
            '新建', '创建', '新建文档', 'create', 'new document'
        ])) {
            const parts = text.split(/[:：]|/, 2);
            return {
                type: 'create_document',
                title: parts[0]?.replace(/^(新建|创建|new|create)/i, '').trim() || '未命名文档',
                content: parts[1]?.trim() || ''
            };
        }

        // 添加待办意图
        if (this.matchPatterns(lowerText, [
            '待办', '添加待办', 'todo', 'add todo'
        ])) {
            return {
                type: 'add_todo',
                documentId: null, // 需要从上下文中推断
                todoText: this.extractQuery(text)
            };
        }

        // 默认为一般查询
        return { type: 'general', query: text };
    }

    /**
     * 匹配意图模式
     */
    matchPatterns(text, patterns) {
        return patterns.some(pattern => text.includes(pattern));
    }

    /**
     * 提取查询内容
     */
    extractQuery(text) {
        // 移除常见的触发词
        const query = text
            .replace(/^(查找|搜索|检索|关于|find|search|where is)/i, '')
            .replace(/(在哪里|文档|内容)/g, '')
            .trim();

        return query || text;
    }

    /**
     * 处理命令
     */
    async handleCommand(command, args, message, context) {
        switch (command) {
            case 'help':
                return this.getHelpMessage();

            case 'find':
            case '查找':
                return await this.documentLocator.find(args);

            case 'search':
            case '搜索':
                return await this.contentSearcher.search(args);

            case 'create':
            case 'new':
            case '新建':
                const parts = args.split(/[:：]/, 2);
                return await this.autoArchiver.create(
                    parts[0]?.trim() || '未命名文档',
                    parts[1]?.trim() || '',
                    context
                );

            case 'stats':
            case '统计':
                return this.getStatsMessage();

            case 'index':
            case 'reindex':
                return await this.handleReindex();

            case 'todo':
            case '待办':
                return await this.meetingAssistant.addTodo(null, args, context);

            default:
                return `未知命令: ${command}\n输入 /help 查看可用命令`;
        }
    }

    /**
     * 处理一般查询
     */
    async handleGeneralQuery(text) {
        // 尝试智能匹配最相关的功能
        const searchResults = this.indexer.search(text);

        if (searchResults.length > 0) {
            const topResult = searchResults[0];

            // 如果查询与文档标题高度匹配
            if (topResult.title.toLowerCase().includes(text.toLowerCase())) {
                return await this.documentLocator.find(text);
            }

            // 否则返回搜索结果
            return await this.contentSearcher.search(text);
        }

        // 没有找到相关内容
        return `未找到与"${text}"相关的内容。\n\n您可以：\n• 使用 /find 命令查找文档\n• 使用 /search 命令搜索内容\n• 使用 /help 查看更多帮助`;
    }

    /**
     * 获取帮助消息
     */
    getHelpMessage() {
        return `🤖 飞书知识库智能助手帮助

📚 **核心功能**
• 智能文档定位 - 快速找到所需文档
• 高效内容检索 - 搜索知识库内容
• 自动智能归档 - 新建文档并自动分类
• 会议协作自动化 - 提取待办、生成文档

💬 **使用方式**

**1. 文档查找**
• "XX文档在哪里" 或 "查找XX"
• /find 文档名称

**2. 内容搜索**
• "搜索XX相关内容" 或 "关于XX"
• /search 关键词

**3. 创建文档**
• "新建文档名：内容"
• /create 标题:内容

**4. 添加待办**
• "添加待办：XX事项"
• /todo 待办内容

**5. 系统命令**
• /help - 显示帮助
• /stats - 查看索引统计
• /index - 重建索引

💡 **提示**：您也可以直接用自然语言描述需求，我会智能识别您的意图！`;
    }

    /**
     * 获取统计消息
     */
    getStatsMessage() {
        const stats = this.indexer.getStats();

        return `📊 知识库索引统计

• 文档总数：${stats.totalDocuments}
• 分类数量：${stats.totalCategories}
• 关键词数量：${stats.totalKeywords}
• 最后更新：${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : '未更新'}
• 索引版本：${stats.version}`;
    }

    /**
     * 处理重建索引请求
     */
    async handleReindex() {
        try {
            await this.indexer.buildIndex(true);
            return '✅ 索引重建完成！现在可以更快速地搜索文档了。';
        } catch (error) {
            return `❌ 索引重建失败: ${error.message}`;
        }
    }
}

module.exports = MessageHandler;
