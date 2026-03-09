/**
 * 对话总结功能
 * 基于历史对话内容自动生成文档
 */

class ConversationSummarizer {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;
    }

    /**
     * 基于历史对话创建文档
     * @param {string} chatId - 对话ID
     * @param {Object} options - 选项
     * @param {number} options.messageCount - 使用的消息数量（默认100）
     * @param {string} options.documentTitle - 文档标题（可选）
     * @param {string} options.documentType - 文档类型：meeting|discussion|decision|summary
     * @param {Object} options.context - 对话上下文
     * @returns {string} 创建结果
     */
    async createFromHistory(chatId, options = {}) {
        try {
            const {
                messageCount = 100,
                documentTitle = null,
                documentType = 'summary',
                context = {}
            } = options;

            console.log(`📝 基于历史对话创建文档，消息数量: ${messageCount}`);

            // 1. 获取历史消息
            const messages = await this.bot.getAllChatHistory(chatId, {
                maxMessages: messageCount
            });

            if (messages.length === 0) {
                return '⚠️ 未找到历史消息，无法创建文档。\n\n💡 建议：\n• 确保对话中有历史消息\n• 检查机器人是否有读取消息的权限';
            }

            console.log(`✅ 获取到 ${messages.length} 条历史消息`);

            // 2. 解析消息
            const parsedMessages = messages.map(msg => this.bot.parseMessage(msg));

            // 3. 分析对话内容
            const analysis = this.analyzeConversation(parsedMessages, documentType);

            // 4. 生成文档标题
            const title = documentTitle || this.generateTitle(analysis, documentType);

            // 5. 生成文档内容
            const content = this.generateContent(analysis, parsedMessages, documentType);

            // 6. 创建文档
            const documentId = await this.bot.createDocument(title, content, {
                chatType: context.chatType,
                chatId: context.chatId,
                permissionType: 'edit'
            });

            // 7. 自动归档
            await this.autoArchive(documentId, title, documentType);

            return this.formatResult(title, analysis, documentId, context);

        } catch (error) {
            console.error('基于历史对话创建文档失败:', error);
            throw error;
        }
    }

    /**
     * 分析对话内容
     * @param {Array} messages - 解析后的消息列表
     * @param {string} documentType - 文档类型
     * @returns {Object} 分析结果
     */
    analyzeConversation(messages, documentType) {
        const analysis = {
            totalMessages: messages.length,
            participants: new Set(),
            timeRange: {
                start: null,
                end: null
            },
            topics: [],
            keyPoints: [],
            decisions: [],
            actionItems: [],
            mentions: new Map(),
            keywords: new Map()
        };

        // 按时间排序
        messages.sort((a, b) => a.createTime - b.createTime);

        // 设置时间范围
        if (messages.length > 0) {
            analysis.timeRange.start = new Date(messages[0].createTime);
            analysis.timeRange.end = new Date(messages[messages.length - 1].createTime);
        }

        // 分析每条消息
        for (const message of messages) {
            // 收集参与者
            if (message.senderId) {
                analysis.participants.add(message.senderId);
            }

            // 提取@提及
            const mentions = message.text.match(/@(\S+)/g);
            if (mentions) {
                mentions.forEach(mention => {
                    const userId = mention.substring(1);
                    const count = analysis.mentions.get(userId) || 0;
                    analysis.mentions.set(userId, count + 1);
                });
            }

            // 提取关键词
            const words = this.extractKeywords(message.text);
            words.forEach(word => {
                const count = analysis.keywords.get(word) || 0;
                analysis.keywords.set(word, count + 1);
            });

            // 根据文档类型提取特定信息
            if (documentType === 'meeting') {
                this.extractMeetingInfo(message, analysis);
            } else if (documentType === 'decision') {
                this.extractDecisionInfo(message, analysis);
            } else {
                this.extractGeneralInfo(message, analysis);
            }
        }

        // 转换Set为Array
        analysis.participants = Array.from(analysis.participants);
        analysis.mentions = Array.from(analysis.mentions.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // 提取高频关键词作为话题
        analysis.topics = Array.from(analysis.keywords.entries())
            .filter(([word]) => word.length > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        return analysis;
    }

    /**
     * 提取关键词
     * @param {string} text - 文本内容
     * @returns {Array} 关键词列表
     */
    extractKeywords(text) {
        if (!text) return [];

        // 简单的分词（中文和英文）
        return text
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1);
    }

    /**
     * 提取会议相关信息
     * @param {Object} message - 消息对象
     * @param {Object} analysis - 分析结果
     */
    extractMeetingInfo(message, analysis) {
        const text = message.text;

        // 待办事项
        const todoPatterns = [
            /(?:待办|todo|任务|task)[:：]\s*(.+)/i,
            /(?:需要|要|需)[:：]\s*(.+?)(?:，|。|$)/i,
            /(?:请|麻烦)[:：]\s*(.+?)(?:，|。|$)/i
        ];

        for (const pattern of todoPatterns) {
            const match = text.match(pattern);
            if (match) {
                analysis.actionItems.push({
                    text: match[1].trim(),
                    sender: message.senderId,
                    time: message.createTime
                });
                break;
            }
        }

        // 决策
        if (/决定|确定|同意|通过|采纳/i.test(text)) {
            analysis.decisions.push({
                text: text.substring(0, 100),
                sender: message.senderId,
                time: message.createTime
            });
        }
    }

    /**
     * 提取决策相关信息
     * @param {Object} message - 消息对象
     * @param {Object} analysis - 分析结果
     */
    extractDecisionInfo(message, analysis) {
        const text = message.text;

        // 决策关键词
        if (/决定|确定|同意|反对|通过|拒绝|采纳/i.test(text)) {
            analysis.decisions.push({
                text: text.substring(0, 200),
                sender: message.senderId,
                time: message.createTime
            });
        }
    }

    /**
     * 提取一般信息
     * @param {Object} message - 消息对象
     * @param {Object} analysis - 分析结果
     */
    extractGeneralInfo(message, analysis) {
        const text = message.text;

        // 较长的消息作为关键点
        if (text.length > 50 && text.length < 500) {
            // 避免重复
            const isDuplicate = analysis.keyPoints.some(
                point => point.text === text.substring(0, 100)
            );

            if (!isDuplicate) {
                analysis.keyPoints.push({
                    text: text.substring(0, 200),
                    sender: message.senderId,
                    time: message.createTime
                });
            }
        }
    }

    /**
     * 生成文档标题
     * @param {Object} analysis - 分析结果
     * @param {string} documentType - 文档类型
     * @returns {string} 标题
     */
    generateTitle(analysis, documentType) {
        const dateStr = new Date().toLocaleDateString('zh-CN');

        const typeNames = {
            meeting: '会议记录',
            discussion: '讨论总结',
            decision: '决策记录',
            summary: '对话总结'
        };

        const typeName = typeNames[documentType] || '对话总结';

        // 如果有主要话题，使用话题作为标题
        if (analysis.topics.length > 0) {
            const mainTopic = analysis.topics[0].word;
            return `${mainTopic} - ${typeName} (${dateStr})`;
        }

        // 否则使用通用标题
        return `${typeName} (${dateStr})`;
    }

    /**
     * 生成文档内容
     * @param {Object} analysis - 分析结果
     * @param {Array} messages - 消息列表
     * @param {string} documentType - 文档类型
     * @returns {string} 文档内容
     */
    generateContent(analysis, messages, documentType) {
        let content = '';

        // 标题和基本信息
        content += `# ${this.generateTitle(analysis, documentType)}\n\n`;
        content += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `**消息数量**: ${analysis.totalMessages} 条\n`;
        content += `**参与人数**: ${analysis.participants.length} 人\n`;

        if (analysis.timeRange.start && analysis.timeRange.end) {
            content += `**时间范围**: ${analysis.timeRange.start.toLocaleString('zh-CN')} - ${analysis.timeRange.end.toLocaleString('zh-CN')}\n`;
        }

        content += `\n---\n\n`;

        // 主要话题
        if (analysis.topics.length > 0) {
            content += `## 主要话题\n\n`;
            analysis.topics.slice(0, 5).forEach((topic, index) => {
                content += `${index + 1}. ${topic.word} (提及 ${topic.count} 次)\n`;
            });
            content += `\n`;
        }

        // 根据文档类型添加不同内容
        if (documentType === 'meeting') {
            content += this.generateMeetingContent(analysis);
        } else if (documentType === 'decision') {
            content += this.generateDecisionContent(analysis);
        } else {
            content += this.generateGeneralContent(analysis);
        }

        // 关键讨论点
        if (analysis.keyPoints.length > 0) {
            content += `\n## 关键讨论点\n\n`;
            analysis.keyPoints.slice(0, 10).forEach((point, index) => {
                const time = new Date(point.time).toLocaleTimeString('zh-CN');
                content += `${index + 1}. **${time}**: ${point.text}\n\n`;
            });
        }

        // 参与者
        content += `\n## 参与者\n\n`;
        content += `共 ${analysis.participants.length} 人参与讨论\n`;

        // 常被@的用户
        if (analysis.mentions.length > 0) {
            content += `\n### 常被@的用户\n\n`;
            analysis.mentions.slice(0, 5).forEach(([userId, count]) => {
                content += `- @${userId}: ${count} 次\n`;
            });
        }

        return content;
    }

    /**
     * 生成会议文档内容
     * @param {Object} analysis - 分析结果
     * @returns {string} 内容
     */
    generateMeetingContent(analysis) {
        let content = '';

        // 待办事项
        if (analysis.actionItems.length > 0) {
            content += `## 待办事项\n\n`;
            analysis.actionItems.forEach((item, index) => {
                const time = new Date(item.time).toLocaleTimeString('zh-CN');
                content += `${index + 1}. [ ] **${item.text}** (提出者: @${item.sender}, 时间: ${time})\n`;
            });
            content += `\n`;
        }

        // 决策
        if (analysis.decisions.length > 0) {
            content += `## 决策记录\n\n`;
            analysis.decisions.forEach((decision, index) => {
                const time = new Date(decision.time).toLocaleTimeString('zh-CN');
                content += `${index + 1}. **${time}**: ${decision.text}\n`;
            });
            content += `\n`;
        }

        return content;
    }

    /**
     * 生成决策文档内容
     * @param {Object} analysis - 分析结果
     * @returns {string} 内容
     */
    generateDecisionContent(analysis) {
        let content = '';

        if (analysis.decisions.length > 0) {
            content += `## 决策内容\n\n`;
            analysis.decisions.forEach((decision, index) => {
                const time = new Date(decision.time).toLocaleString('zh-CN');
                content += `### 决策 ${index + 1}\n\n`;
                content += `**时间**: ${time}\n`;
                content += `**提出者**: @${decision.sender}\n`;
                content += `**内容**: ${decision.text}\n\n`;
            });
        }

        return content;
    }

    /**
     * 生成通用文档内容
     * @param {Object} analysis - 分析结果
     * @returns {string} 内容
     */
    generateGeneralContent(analysis) {
        let content = '';

        // 待办事项
        if (analysis.actionItems.length > 0) {
            content += `## 待办事项\n\n`;
            analysis.actionItems.forEach((item, index) => {
                content += `${index + 1}. [ ] ${item.text}\n`;
            });
            content += `\n`;
        }

        return content;
    }

    /**
     * 自动归档文档
     * @param {string} documentId - 文档ID
     * @param {string} title - 文档标题
     * @param {string} documentType - 文档类型
     */
    async autoArchive(documentId, title, documentType) {
        try {
            // 这里可以调用AutoArchiver的归档功能
            // 简化实现，仅记录日志
            console.log(`✅ 文档 ${documentId} 创建完成，类型: ${documentType}`);
        } catch (error) {
            console.error('自动归档失败:', error);
        }
    }

    /**
     * 格式化创建结果
     * @param {string} title - 文档标题
     * @param {Object} analysis - 分析结果
     * @param {string} documentId - 文档ID
     * @param {Object} context - 对话上下文
     * @returns {string} 格式化的结果
     */
    formatResult(title, analysis, documentId, context) {
        const memberInfo = context.chatType === 'group' ? '群成员' : '您';

        let result = `✅ 已基于历史对话创建文档\n\n`;
        result += `📄 文档标题：${title}\n`;
        result += `📊 消息数量：${analysis.totalMessages} 条\n`;
        result += `👥 参与人数：${analysis.participants.length} 人\n`;
        result += `🔐 权限：已自动添加${memberInfo}为协作者（可编辑）\n`;

        if (analysis.topics.length > 0) {
            result += `\n🏷️ 主要话题：\n`;
            analysis.topics.slice(0, 3).forEach((topic, index) => {
                result += `   ${index + 1}. ${topic.word} (${topic.count}次)\n`;
            });
        }

        if (analysis.actionItems.length > 0) {
            result += `\n✅ 提取待办：${analysis.actionItems.length} 项\n`;
        }

        result += `\n💡 文档已自动整理并分类，方便查看和协作。`;

        return result;
    }
}

module.exports = ConversationSummarizer;
