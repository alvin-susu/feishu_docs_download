/**
 * 对话分析功能
 * 纯粹的查询和分析功能，不自动创建文档
 */

class ConversationSummarizer {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;
    }

    /**
     * 获取历史对话摘要（不创建文档）
     * @param {string} chatId - 对话ID
     * @param {Object} options - 选项
     * @param {number} options.messageCount - 分析的消息数量
     * @param {string} options.analyzeType - 分析类型：summary|meeting|decision
     * @returns {string} 分析结果
     */
    async analyzeHistory(chatId, options = {}) {
        try {
            const {
                messageCount = 100,
                analyzeType = 'summary'
            } = options;

            console.log(`📋 分析历史对话，消息数量: ${messageCount}`);

            // 1. 获取历史消息
            const messages = await this.bot.getAllChatHistory(chatId, {
                maxMessages: messageCount
            });

            if (messages.length === 0) {
                return '⚠️ 未找到历史消息\n\n💡 建议：\n• 确保对话中有历史消息\n• 检查机器人是否有读取消息的权限\n• 权限：im:message:readonly';
            }

            console.log(`✅ 获取到 ${messages.length} 条历史消息`);

            // 2. 解析消息
            const parsedMessages = messages.map(msg => this.bot.parseMessage(msg));

            // 3. 分析对话内容
            const analysis = this.analyzeConversation(parsedMessages, analyzeType);

            // 4. 返回分析结果（不创建文档）
            return this.formatAnalysis(analysis, analyzeType);

        } catch (error) {
            console.error('分析历史对话失败:', error);

            // 友好的错误提示
            if (error.message.includes('权限') || error.message.includes('403')) {
                return '⚠️ 权限不足\n\n💡 需要在飞书开放平台配置以下权限：\n• im:message:readonly - 读取消息\n• im:chat - 获取聊天信息';
            }

            throw error;
        }
    }

    /**
     * 搜索历史对话中的关键词
     * @param {string} chatId - 对话ID
     * @param {string} keyword - 关键词
     * @param {number} maxMessages - 搜索的最大消息数
     * @returns {string} 搜索结果
     */
    async searchKeyword(chatId, keyword, maxMessages = 200) {
        try {
            console.log(`🔍 搜索关键词"${keyword}"`);

            const messages = await this.bot.searchMessages(chatId, keyword, {
                maxMessages: maxMessages
            });

            if (messages.length === 0) {
                return `🔍 搜索结果\n\n关键词"${keyword}"未找到匹配消息。\n\n💡 建议：\n• 尝试其他关键词\n• 增加搜索范围`;
            }

            // 格式化搜索结果
            let result = `🔍 搜索"${keyword}"的结果\n\n`;
            result += `找到 ${messages.length} 条匹配消息：\n\n`;

            messages.slice(0, 20).forEach((msg, index) => {
                const time = new Date(msg.createTime * 1000).toLocaleString('zh-CN');
                result += `${index + 1}. **${time}** @${msg.senderId}\n`;
                result += `   ${msg.text.substring(0, 100)}...\n\n`;
            });

            if (messages.length > 20) {
                result += `... 还有 ${messages.length - 20} 条消息\n\n`;
            }

            result += `💡 提示：可以使用以上内容创建文档\n• /create 标题:内容\n• /meeting 标题`;

            return result;

        } catch (error) {
            console.error('搜索关键词失败:', error);
            throw error;
        }
    }

    /**
     * 统计对话信息
     * @param {string} chatId - 对话ID
     * @param {number} messageCount - 统计的消息数量
     * @returns {string} 统计结果
     */
    async getConversationStats(chatId, messageCount = 100) {
        try {
            console.log(`📊 统计对话信息，消息数量: ${messageCount}`);

            const messages = await this.bot.getAllChatHistory(chatId, {
                maxMessages: messageCount
            });

            if (messages.length === 0) {
                return '⚠️ 未找到历史消息';
            }

            const parsedMessages = messages.map(msg => this.bot.parseMessage(msg));
            const stats = this.calculateStats(parsedMessages);

            // 格式化统计结果
            let result = `📊 对话统计信息\n\n`;
            result += `**时间范围**: ${stats.timeRange.start.toLocaleString('zh-CN')} - ${stats.timeRange.end.toLocaleString('zh-CN')}\n`;
            result += `**消息总数**: ${stats.totalMessages} 条\n`;
            result += `**参与人数**: ${stats.participants.length} 人\n`;
            result += `**活跃度**: ${stats.avgMessagesPerUser.toFixed(1)} 条/人\n\n`;

            // 活跃用户
            result += `### 最活跃用户 TOP5\n\n`;
            stats.activeUsers.slice(0, 5).forEach((user, index) => {
                result += `${index + 1}. @${user.userId}: ${user.messageCount} 条消息\n`;
            });
            result += `\n`;

            // 热门话题
            if (stats.topTopics.length > 0) {
                result += `### 热门话题 TOP5\n\n`;
                stats.topTopics.slice(0, 5).forEach((topic, index) => {
                    result += `${index + 1}. ${topic.word} (${topic.count} 次)\n`;
                });
            }

            return result;

        } catch (error) {
            console.error('统计对话信息失败:', error);
            throw error;
        }
    }

    /**
     * 分析对话内容（内部方法）
     * @param {Array} messages - 解析后的消息列表
     * @param {string} analyzeType - 分析类型
     * @returns {Object} 分析结果
     */
    analyzeConversation(messages, analyzeType) {
        const analysis = {
            totalMessages: messages.length,
            participants: new Set(),
            userMessageCounts: new Map(),
            timeRange: {
                start: null,
                end: null
            },
            topics: [],
            keyPoints: [],
            decisions: [],
            actionItems: [],
            keywords: new Map()
        };

        // 按时间排序
        messages.sort((a, b) => a.createTime - b.createTime);

        // 设置时间范围
        if (messages.length > 0) {
            analysis.timeRange.start = new Date(messages[0].createTime * 1000);
            analysis.timeRange.end = new Date(messages[messages.length - 1].createTime * 1000);
        }

        // 分析每条消息
        for (const message of messages) {
            // 统计参与者
            if (message.senderId) {
                analysis.participants.add(message.senderId);
                const count = analysis.userMessageCounts.get(message.senderId) || 0;
                analysis.userMessageCounts.set(message.senderId, count + 1);
            }

            // 提取关键词
            const words = this.extractKeywords(message.text);
            words.forEach(word => {
                const count = analysis.keywords.get(word) || 0;
                analysis.keywords.set(word, count + 1);
            });

            // 根据类型提取特定信息
            if (analyzeType === 'meeting') {
                this.extractMeetingInfo(message, analysis);
            } else if (analyzeType === 'decision') {
                this.extractDecisionInfo(message, analysis);
            } else {
                this.extractGeneralInfo(message, analysis);
            }
        }

        // 转换为Array并排序
        analysis.participants = Array.from(analysis.participants);

        analysis.activeUsers = Array.from(analysis.userMessageCounts.entries())
            .map(([userId, count]) => ({ userId, messageCount: count }))
            .sort((a, b) => b.messageCount - a.messageCount);

        analysis.topTopics = Array.from(analysis.keywords.entries())
            .filter(([word]) => word.length > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        return analysis;
    }

    /**
     * 计算对话统计信息
     * @param {Array} messages - 消息列表
     * @returns {Object} 统计信息
     */
    calculateStats(messages) {
        const stats = {
            totalMessages: messages.length,
            participants: new Set(),
            userMessageCounts: new Map(),
            timeRange: {
                start: null,
                end: null
            },
            activeUsers: [],
            topTopics: []
        };

        // 按时间排序
        messages.sort((a, b) => a.createTime - b.createTime);

        if (messages.length > 0) {
            stats.timeRange.start = new Date(messages[0].createTime * 1000);
            stats.timeRange.end = new Date(messages[messages.length - 1].createTime * 1000);
        }

        for (const message of messages) {
            if (message.senderId) {
                stats.participants.add(message.senderId);
                const count = stats.userMessageCounts.get(message.senderId) || 0;
                stats.userMessageCounts.set(message.senderId, count + 1);
            }
        }

        stats.activeUsers = Array.from(stats.userMessageCounts.entries())
            .map(([userId, count]) => ({ userId, messageCount: count }))
            .sort((a, b) => b.messageCount - a.messageCount);

        stats.topTopics = Array.from(this.extractAllKeywords(messages).entries())
            .filter(([word]) => word.length > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        stats.avgMessagesPerUser = stats.totalMessages / stats.participants.size;

        return stats;
    }

    /**
     * 提取所有消息的关键词
     * @param {Array} messages - 消息列表
     * @returns {Map} 关键词频率
     */
    extractAllKeywords(messages) {
        const keywordMap = new Map();

        for (const message of messages) {
            const words = this.extractKeywords(message.text);
            words.forEach(word => {
                const count = keywordMap.get(word) || 0;
                keywordMap.set(word, count + 1);
            });
        }

        return keywordMap;
    }

    /**
     * 提取关键词
     * @param {string} text - 文本内容
     * @returns {Array} 关键词列表
     */
    extractKeywords(text) {
        if (!text) return [];

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

        // 较长的消息作为关键点
        if (text.length > 50 && text.length < 500) {
            analysis.keyPoints.push({
                text: text.substring(0, 200),
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
     * 格式化分析结果
     * @param {Object} analysis - 分析结果
     * @param {string} analyzeType - 分析类型
     * @returns {string} 格式化的分析结果
     */
    formatAnalysis(analysis, analyzeType) {
        let result = '';

        const typeNames = {
            summary: '对话总结',
            meeting: '会议记录分析',
            decision: '决策分析'
        };

        const typeName = typeNames[analyzeType] || '对话分析';

        result = `📋 ${typeName}\n\n`;
        result += `**消息数量**: ${analysis.totalMessages} 条\n`;
        result += `**参与人数**: ${analysis.participants.length} 人\n`;
        result += `**时间范围**: ${analysis.timeRange.start.toLocaleString('zh-CN')} - ${analysis.timeRange.end.toLocaleString('zh-CN')}\n\n`;

        // 热门话题
        if (analysis.topTopics.length > 0) {
            result += `### 🏷️ 主要话题\n\n`;
            analysis.topTopics.slice(0, 5).forEach((topic, index) => {
                result += `${index + 1}. **${topic.word}** (${topic.count}次)\n`;
            });
            result += `\n`;
        }

        // 活跃用户
        if (analysis.activeUsers.length > 0) {
            result += `### 👥 活跃用户 TOP5\n\n`;
            analysis.activeUsers.slice(0, 5).forEach((user, index) => {
                result += `${index + 1}. @${user.userId}: ${user.messageCount}条消息\n`;
            });
            result += `\n`;
        }

        // 根据类型显示特定内容
        if (analyzeType === 'meeting') {
            if (analysis.actionItems.length > 0) {
                result += `### ✅ 待办事项 (${analysis.actionItems.length}项)\n\n`;
                analysis.actionItems.slice(0, 10).forEach((item, index) => {
                    result += `${index + 1}. ${item.text}\n`;
                });
                result += `\n`;
            }

            if (analysis.decisions.length > 0) {
                result += `### 🎯 决策记录 (${analysis.decisions.length}项)\n\n`;
                analysis.decisions.slice(0, 5).forEach((decision, index) => {
                    const time = new Date(decision.time * 1000).toLocaleTimeString('zh-CN');
                    result += `${index + 1}. **${time}**: ${decision.text}\n`;
                });
                result += `\n`;
            }
        } else if (analyzeType === 'decision') {
            if (analysis.decisions.length > 0) {
                result += `### 🎯 决策内容\n\n`;
                analysis.decisions.forEach((decision, index) => {
                    const time = new Date(decision.time * 1000).toLocaleString('zh-CN');
                    result += `#### 决策 ${index + 1}\n`;
                    result += `**时间**: ${time}\n`;
                    result += `**提出者**: @${decision.sender}\n`;
                    result += `**内容**: ${decision.text}\n\n`;
                });
            }
        }

        // 关键讨论点
        if (analysis.keyPoints.length > 0) {
            result += `### 💬 关键讨论点 (前5条)\n\n`;
            analysis.keyPoints.slice(0, 5).forEach((point, index) => {
                const time = new Date(point.time * 1000).toLocaleTimeString('zh-CN');
                result += `${index + 1}. **${time}** @${point.sender}\n`;
                result += `   ${point.text}\n\n`;
            });
        }

        // 提示用户可以基于此创建文档
        result += `\n---\n\n💡 **提示**: 可以基于以上分析结果创建文档\n`;
        result += `• 会议记录: /meeting ${analysis.topTopics[0]?.word || '标题'}\n`;
        result += `• 决策记录: /decision ${analysis.topTopics[0]?.word || '标题'}\n`;
        result += `• 自定义创建: /create 标题:内容`;

        return result;
    }
}

module.exports = ConversationSummarizer;

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
