/**
 * 消息处理器
 * 处理来自飞书的用户消息，分发到对应的功能模块
 */

const DocumentLocator = require('../features/DocumentLocator');
const ContentSearcher = require('../features/ContentSearcher');
const AutoArchiver = require('../features/AutoArchiver');
const MeetingAssistant = require('../features/MeetingAssistant');
const ConversationSummarizer = require('../features/ConversationSummarizer');

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
        this.conversationSummarizer = new ConversationSummarizer(assistant);

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

        // 添加工具执行器（用于调用 feishu_perm 等内置工具）
        if (this.assistant && this.assistant.toolExecutor) {
            context.toolExecutor = this.assistant.toolExecutor;
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
                // 检查是否是搜索知识库内容
                if (args && !args.includes('历史') && !args.includes('chat')) {
                    return await this.contentSearcher.search(args);
                } else {
                    // 搜索历史对话
                    const searchKeyword = this.parseSearchKeyword(args.replace(/历史|chat/g, '').trim());
                    if (searchKeyword) {
                        return await this.conversationSummarizer.searchKeyword(
                            context.chatId,
                            searchKeyword
                        );
                    } else {
                        return '⚠️ 请提供搜索关键词\n\n用法: /search 关键词';
                    }
                }

            case 'history':
            case 'chat':
                // 搜索历史对话
                const historyKeyword = this.parseSearchKeyword(args);
                if (historyKeyword) {
                    return await this.conversationSummarizer.searchKeyword(
                        context.chatId,
                        historyKeyword
                    );
                } else {
                    return await this.conversationSummarizer.analyzeHistory(
                        context.chatId,
                        {
                            messageCount: this.parseMessageCount(args),
                            analyzeType: 'summary'
                        }
                    );
                }

            case 'create':
            case 'new':
            case '新建':
                const parts = args.split(/[:：]/, 2);
                return await this.autoArchiver.create(
                    parts[0]?.trim() || '未命名文档',
                    parts[1]?.trim() || '',
                    context
                );

            case 'index':
            case 'reindex':
                return await this.handleReindex();

            case 'indexstats':
            case '索引统计':
                return this.getIndexStatsMessage();

            case 'todo':
            case '待办':
                return await this.meetingAssistant.addTodo(null, args, context);

            // 历史对话分析命令（纯查询功能）
            case 'summary':
            case 'summarize':
            case '总结':
            case 'analyze':
            case '分析':
                return await this.conversationSummarizer.analyzeHistory(
                    context.chatId,
                    {
                        messageCount: this.parseMessageCount(args),
                        analyzeType: 'summary'
                    }
                );

            case 'meeting':
            case '会议记录':
            case '会议':
                return await this.conversationSummarizer.analyzeHistory(
                    context.chatId,
                    {
                        messageCount: this.parseMessageCount(args),
                        analyzeType: 'meeting'
                    }
                );

            case 'decision':
            case '决策':
                return await this.conversationSummarizer.analyzeHistory(
                    context.chatId,
                    {
                        messageCount: this.parseMessageCount(args),
                        analyzeType: 'decision'
                    }
                );

            case 'stats':
            case '统计对话':
                return await this.conversationSummarizer.getConversationStats(
                    context.chatId,
                    this.parseMessageCount(args)
                );

            default:
                return `未知命令: ${command}\n输入 /help 查看可用命令`;
        }
    }

    /**
     * 解析消息数量参数
     * @param {string} args - 命令参数
     * @returns {number} 消息数量
     */
    parseMessageCount(args) {
        // 尝试提取数字，如 /summary 50
        const countMatch = args.match(/(\d+)/);
        if (countMatch) {
            return parseInt(countMatch[1], 10);
        }
        return 100; // 默认100条消息
    }

    /**
     * 解析文档标题参数
     * @param {string} args - 命令参数
     * @returns {string|null} 文档标题
     */
    parseDocumentTitle(args) {
        // 提除数字后的文本作为标题
        const title = args.replace(/\d+/, '').trim();
        return title || null;
    }

    /**
     * 解析搜索关键词
     * @param {string} args - 命令参数
     * @returns {string|null} 搜索关键词
     */
    parseSearchKeyword(args) {
        // 去除数字和其他参数，保留关键词
        const keyword = args.replace(/\d+/, '').trim();
        return keyword || null;
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
• 历史对话分析 - 查询和分析聊天记录 ⭐ 新功能

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

**5. 历史对话分析** ⭐ 新功能（纯查询，不创建文档）
• /summary - 分析最近100条消息
• /summary 200 - 分析最近200条消息
• /meeting - 分析会议内容
• /decision - 分析决策内容
• /history 关键词 - 搜索历史消息
• /stats - 对话统计信息

**6. 系统命令**
• /help - 显示帮助
• /indexstats - 知识库索引统计
• /index - 重建索引

💡 **提示**：您也可以直接用自然语言描述需求，我会智能识别您的意图！

📖 **历史对话功能说明**：
• /summary - 分析对话内容，返回摘要信息
• /meeting - 提取会议相关信息（待办、决策等）
• /decision - 提取决策内容
• /history 关键词 - 搜索包含关键词的消息
• /stats - 显示对话统计（活跃用户、热门话题等）

🔄 **配合创建文档**：
1. 先用 /summary 分析对话内容
2. 查看分析结果（话题、待办、决策等）
3. 基于分析结果手动创建文档：
   /create 标题:内容

⚠️ **权限要求**：
• im:message:readonly - 读取历史消息（必需）
• im:chat - 获取聊天信息（必需）`;

💡 **提示**：您也可以直接用自然语言描述需求，我会智能识别您的意图！`;
    }

    /**
     * 获取索引统计消息
     */
    getIndexStatsMessage() {
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
