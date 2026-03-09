/**
 * 群聊会议协作自动化功能
 * 自动提取待办事项、智能生成会议文档
 */

class MeetingAssistant {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;

        // 待办事项识别规则
        this.todoPatterns = this.initializeTodoPatterns();
    }

    /**
     * 初始化待办事项识别模式
     */
    initializeTodoPatterns() {
        return [
            // 明确的待办关键词
            /(?:待办|todo|任务|task)[:：]\s*(.+)/i,
            /(?:需要|要|需)[:：]\s*(.+?)(?:，|。|$)/i,
            /(?:请|麻烦)[:：]\s*(.+?)(?:，|。|$)/i,
            /(?:跟进|处理|解决|完成)[:：]\s*(.+)/i,

            // 责任分配模式
            /@(\w+)\s*(?:负责|处理|跟进)\s*(.+)/i,
            /(.+?)\s*由\s*@\w+\s*负责/i,

            // 时间相关的待办
            /(?:今天|明天|下周|本周)[:：]\s*(.+)/i,
            /(?:\s+前|\s+后)[:：]\s*(.+)/i,

            // 优先级标识
            /\[(?:紧急|重要|高优先级)\][:：]\s*(.+)/i,

            // 行动动词
            /(?:整理|准备|提交|发送|更新|修改|检查|确认|协调)\s*(.+)/i
        ];
    }

    /**
     * 添加待办事项
     */
    async addTodo(documentId, todoText, context = {}) {
        try {
            console.log(`✅ 添加待办: ${todoText}`);

            // 如果没有指定文档，尝试推断
            if (!documentId) {
                documentId = await this.inferTargetDocument(context);
            }

            if (!documentId) {
                return `⚠️ 无法确定目标文档

💡 请：
• 明确指定要添加待办的文档
• 或使用 /create 创建新文档`;
            }

            // 清理待办文本
            const cleanTodoText = this.sanitizeTodoText(todoText);

            // 添加待办事项到文档
            await this.bot.addTodoItem(documentId, cleanTodoText);

            // 获取文档信息
            const docInfo = this.indexer.index.documents.get(documentId);

            return `✅ 待办事项已添加

📄 文档：${docInfo?.title || '未知文档'}
✨ 待办内容：${cleanTodoText}
🔗 文档链接：${docInfo?.url || ''}

💡 提示：待办事项已添加到文档末尾，可在飞书中查看和勾选完成。`;

        } catch (error) {
            console.error('添加待办错误:', error);
            throw error;
        }
    }

    /**
     * 清理待办文本
     */
    sanitizeTodoText(text) {
        return text
            .trim()
            .replace(/^\s*[-*•]\s*/, '') // 移除列表符号
            .replace(/\[([^\]]+)\]\s*/g, '') // 移除方括号内容（优先级等）
            .substring(0, 200); // 限制长度
    }

    /**
     * 推断目标文档
     */
    async inferTargetDocument(context) {
        try {
            // 如果有上下文信息（如当前正在讨论的文档）
            if (context.currentDocumentId) {
                return context.currentDocumentId;
            }

            // 如果在群聊中，查找群聊相关的最近文档
            if (context.chatId) {
                const recentDoc = await this.findRecentDocumentInChat(context.chatId);
                if (recentDoc) {
                    return recentDoc;
                }
            }

            // 尝试从上下文中提取文档名称
            if (context.mentionedDocument) {
                const docs = this.indexer.search(context.mentionedDocument);
                if (docs.length > 0) {
                    return docs[0].id;
                }
            }

            return null;

        } catch (error) {
            console.error('推断目标文档错误:', error);
            return null;
        }
    }

    /**
     * 查找群聊中的最近文档
     */
    async findRecentDocumentInChat(chatId) {
        try {
            // 在实际实现中，这里应该查询群聊历史记录
            // 找出最近讨论或创建的文档
            // 现在简化为返回null
            return null;

        } catch (error) {
            console.error('查找群聊最近文档错误:', error);
            return null;
        }
    }

    /**
     * 从消息中提取待办事项
     */
    extractTodos(messages) {
        const todos = [];

        for (const message of messages) {
            const text = this.extractText(message);

            for (const pattern of this.todoPatterns) {
                const match = text.match(pattern);
                if (match) {
                    const todoText = match[1] || match[0];
                    if (todoText && todoText.trim().length > 0) {
                        todos.push({
                            text: todoText.trim(),
                            author: message.sender || '未知',
                            timestamp: message.timestamp || new Date().toISOString(),
                            messageId: message.message_id
                        });
                    }
                }
            }
        }

        return todos;
    }

    /**
     * 提取文本内容
     */
    extractText(message) {
        if (typeof message === 'string') {
            return message;
        }

        if (typeof message === 'object') {
            if (message.content) {
                try {
                    const parsed = JSON.parse(message.content);
                    return parsed.text || message.content;
                } catch (e) {
                    return message.content;
                }
            }
            if (message.text) {
                return message.text;
            }
        }

        return '';
    }

    /**
     * 生成会议文档
     * @param {Object} meetingInfo - 会议信息
     * @param {Array} messages - 消息列表
     * @param {Object} context - 对话上下文（用于设置权限）
     * @param {string} context.chatType - 对话类型: 'private'|'group'
     * @param {string} context.chatId - 对话ID（群聊）/ 用户ID（私聊）
     */
    async generateMeetingDocument(meetingInfo, messages, context = {}) {
        try {
            console.log(`📝 生成会议文档: ${meetingInfo.title}`);

            // 提取会议信息
            const meetingData = this.extractMeetingInfo(meetingInfo, messages);

            // 生成文档内容
            const documentContent = this.formatMeetingDocument(meetingData);

            // 创建文档并设置权限
            const documentId = await this.bot.createDocument(
                meetingData.title,
                documentContent,
                {
                    chatType: context.chatType,
                    chatId: context.chatId,
                    permissionType: 'full', // 给对话成员管理者权限
                    toolExecutor: context.toolExecutor // OpenClaw feishu_perm 工具
                }
            );

            // 自动归档
            const classification = {
                category: 'meeting',
                targetCategory: '会议记录',
                confidence: 0.9,
                matchedKeywords: ['会议']
            };

            await this.archiveMeetingDocument(documentId, meetingData.title, classification);

            const memberInfo = context.chatType === 'group' ? '群成员' : '您';
            return `✅ 会议文档已生成

📄 文档标题：${meetingData.title}
📅 会议时间：${meetingData.date}
👥 参与人数：${meetingData.participants.length}
✅ 待办事项：${meetingData.todos.length}
🔐 权限：已自动添加${memberInfo}为协作者

🔗 查看文档：[点击打开](https://example.com/doc/${documentId})

💡 文档已自动归档到会议记录分类，${memberInfo}可以直接编辑和协作。`;

        } catch (error) {
            console.error('生成会议文档错误:', error);
            throw error;
        }
    }

    /**
     * 提取会议信息
     */
    extractMeetingInfo(meetingInfo, messages) {
        // 提取待办事项
        const todos = this.extractTodos(messages);

        // 提取参与者
        const participants = this.extractParticipants(messages);

        // 提取关键讨论点
        const keyPoints = this.extractKeyPoints(messages);

        return {
            title: meetingInfo.title || '会议记录',
            date: meetingInfo.date || new Date().toLocaleDateString(),
            time: meetingInfo.time || new Date().toLocaleTimeString(),
            location: meetingInfo.location || '线上会议',
            participants,
            todos,
            keyPoints,
            summary: meetingInfo.summary || ''
        };
    }

    /**
     * 提取参与者
     */
    extractParticipants(messages) {
        const participants = new Set();

        for (const message of messages) {
            if (message.sender) {
                participants.add(message.sender);
            }

            // 提取@的用户
            const text = this.extractText(message);
            const mentions = text.match(/@(\w+)/g);
            if (mentions) {
                mentions.forEach(mention => {
                    participants.add(mention.substring(1));
                });
            }
        }

        return Array.from(participants);
    }

    /**
     * 提取关键讨论点
     */
    extractKeyPoints(messages) {
        const keyPoints = [];

        // 简单的算法：提取较长的消息作为讨论点
        for (const message of messages) {
            const text = this.extractText(message);
            if (text.length > 50 && text.length < 500) {
                // 排除待办事项
                const isTodo = this.todoPatterns.some(pattern => pattern.test(text));
                if (!isTodo) {
                    keyPoints.push({
                        content: text.substring(0, 200),
                        author: message.sender || '未知',
                        timestamp: message.timestamp
                    });
                }
            }
        }

        // 限制数量
        return keyPoints.slice(0, 10);
    }

    /**
     * 格式化会议文档
     */
    formatMeetingDocument(meetingData) {
        let content = `# ${meetingData.title}

**会议时间**: ${meetingData.date} ${meetingData.time}
**会议地点**: ${meetingData.location}
**参与人员**: ${meetingData.participants.join(', ')}

`;

        // 会议摘要
        if (meetingData.summary) {
            content += `## 会议摘要
${meetingData.summary}

`;
        }

        // 关键讨论点
        if (meetingData.keyPoints.length > 0) {
            content += `## 讨论要点
`;
            meetingData.keyPoints.forEach((point, index) => {
                content += `${index + 1}. ${point.content} (${point.author})
`;
            });
            content += `
`;
        }

        // 待办事项
        if (meetingData.todos.length > 0) {
            content += `## 待办事项
`;
            meetingData.todos.forEach((todo, index) => {
                content += `- [ ] ${todo.text} (负责人: ${todo.author})
`;
            });
        }

        return content;
    }

    /**
     * 归档会议文档
     */
    async archiveMeetingDocument(documentId, title, classification) {
        try {
            // 查找目标知识库
            const targetSpace = this.findMeetingWikiSpace();

            if (!targetSpace) {
                console.warn('未找到会议记录知识库');
                return;
            }

            // 获取或创建会议记录节点
            const targetNode = await this.findOrCreateMeetingNode(targetSpace.wiki_space_id);

            // 创建知识库节点
            await this.bot.createWikiNode(
                targetSpace.wiki_space_id,
                targetNode.node_token,
                documentId,
                title
            );

            // 更新索引
            await this.updateIndexAfterCreation(documentId, title, targetSpace);

            console.log('✅ 会议文档已归档');

        } catch (error) {
            console.error('归档会议文档错误:', error);
        }
    }

    /**
     * 查找会议记录知识库
     */
    findMeetingWikiSpace() {
        for (const [spaceId, category] of this.indexer.index.categories) {
            if (category.name.includes('会议') || category.name.includes('Meeting')) {
                return {
                    wiki_space_id: spaceId,
                    name: category.name
                };
            }
        }
        return null;
    }

    /**
     * 查找或创建会议记录节点
     */
    async findOrCreateMeetingNode(wikiSpaceId) {
        try {
            const nodes = await this.bot.getAllWikiNodes(wikiSpaceId);

            for (const node of nodes) {
                if (node.title === '会议记录' && node.obj_type === 'node') {
                    return node;
                }
            }

            return { node_token: '' };

        } catch (error) {
            console.error('查找会议节点错误:', error);
            return { node_token: '' };
        }
    }

    /**
     * 创建文档后更新索引
     */
    async updateIndexAfterCreation(documentId, title, wikiSpace) {
        try {
            const docInfo = {
                id: documentId,
                title: title,
                wikiSpaceId: wikiSpace.wiki_space_id,
                parentToken: '',
                url: `https://example.com/doc/${documentId}`,
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString(),
                keywords: this.indexer.extractKeywords(title),
                summary: ''
            };

            this.indexer.index.documents.set(documentId, docInfo);
            await this.indexer.saveIndex();

        } catch (error) {
            console.error('更新索引错误:', error);
        }
    }

    /**
     * 分析群聊消息上下文
     */
    async analyzeChatContext(messages) {
        try {
            // 提取待办事项
            const todos = this.extractTodos(messages);

            // 分析主题
            const topics = this.analyzeTopics(messages);

            // 识别参与者
            const participants = this.extractParticipants(messages);

            return {
                todos,
                topics,
                participants,
                messageCount: messages.length
            };

        } catch (error) {
            console.error('分析群聊上下文错误:', error);
            return {
                todos: [],
                topics: [],
                participants: [],
                messageCount: 0
            };
        }
    }

    /**
     * 分析讨论主题
     */
    analyzeTopics(messages) {
        // 简单的关键词频率分析
        const wordFrequency = {};

        for (const message of messages) {
            const text = this.extractText(message);
            const keywords = this.indexer.extractKeywords(text);

            for (const keyword of keywords) {
                wordFrequency[keyword] = (wordFrequency[keyword] || 0) + 1;
            }
        }

        // 返回频率最高的关键词
        return Object.entries(wordFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([keyword]) => keyword);
    }

    /**
     * 智能回复群聊
     */
    async generateSmartResponse(context) {
        try {
            const analysis = await this.analyzeChatContext(context.messages);

            let response = '';

            // 如果有待办事项
            if (analysis.todos.length > 0) {
                response += `📋 **发现 ${analysis.todos.length} 个待办事项**\n\n`;
                analysis.todos.slice(0, 3).forEach((todo, index) => {
                    response += `${index + 1}. ${todo.text}\n`;
                });
                response += `\n💡 输入 "/todo ${analysis.todos[0].text}" 可将待办添加到文档\n\n`;
            }

            // 如果有主要话题
            if (analysis.topics.length > 0) {
                response += `💬 **主要讨论话题**: ${analysis.topics.join(', ')}\n\n`;
            }

            // 提供操作建议
            response += `💡 **我可以帮您**:\n`;
            response += `• 创建会议文档：/create 会议记录:内容\n`;
            response += `• 添加待办事项：/todo 待办内容\n`;
            response += `• 查找相关文档：/find 关键词\n`;
            response += `• 搜索知识库：/search 关键词`;

            return response;

        } catch (error) {
            console.error('生成智能回复错误:', error);
            return '抱歉，分析群聊内容时出现错误。';
        }
    }
}

module.exports = MeetingAssistant;
