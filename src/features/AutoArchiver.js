/**
 * 自动智能归档功能
 * 新建文档并自动识别分类，归档到标准目录
 */

class AutoArchiver {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;

        // 分类规则映射
        this.classificationRules = this.initializeClassificationRules();
    }

    /**
     * 初始化分类规则
     */
    initializeClassificationRules() {
        return {
            // 技术相关
            technical: {
                keywords: ['技术', '开发', '代码', 'api', '接口', 'bug', '修复', '部署',
                           'technical', 'development', 'code', 'api', 'bug fix'],
                targetCategory: '技术文档',
                priority: 10
            },
            // 产品相关
            product: {
                keywords: ['产品', '需求', '功能', '用户', '体验', '迭代', '版本',
                           'product', 'requirement', 'feature', 'user', 'iteration'],
                targetCategory: '产品文档',
                priority: 10
            },
            // 项目相关
            project: {
                keywords: ['项目', '进度', '计划', '里程碑', '风险', '资源', '周报', '月报',
                           'project', 'progress', 'milestone', 'weekly report'],
                targetCategory: '项目管理',
                priority: 10
            },
            // 会议相关
            meeting: {
                keywords: ['会议', '纪要', '讨论', '决策', '沟通', '对齐', '同步',
                           'meeting', 'minutes', 'discussion', 'decision'],
                targetCategory: '会议记录',
                priority: 10
            },
            // 人事相关
            hr: {
                keywords: ['人事', '招聘', '入职', '离职', '培训', '考勤', '福利',
                           'hr', 'recruitment', 'onboarding', 'training'],
                targetCategory: '人事文档',
                priority: 10
            },
            // 财务相关
            finance: {
                keywords: ['财务', '预算', '报销', '发票', '成本', '收入', '审批',
                           'finance', 'budget', 'expense', 'invoice'],
                targetCategory: '财务文档',
                priority: 10
            },
            // 运营相关
            operations: {
                keywords: ['运营', '推广', '活动', '营销', '数据', '分析', '报表',
                           'operations', 'marketing', 'campaign', 'analytics'],
                targetCategory: '运营文档',
                priority: 10
            },
            // 设计相关
            design: {
                keywords: ['设计', 'ui', 'ux', '原型', '交互', '视觉', '规范',
                           'design', 'prototype', 'interaction', 'visual'],
                targetCategory: '设计文档',
                priority: 10
            }
        };
    }

    /**
     * 创建文档并自动归档
     */
    async create(title, content = '') {
        try {
            console.log(`📝 创建文档: ${title}`);

            // 验证输入
            if (!title || title.trim().length === 0) {
                throw new Error('文档标题不能为空');
            }

            // 清理标题
            const cleanTitle = this.sanitizeTitle(title);

            // 识别分类
            const classification = this.classifyDocument(cleanTitle, content);

            // 创建文档
            const documentId = await this.bot.createDocument(cleanTitle, content);

            // 自动归档到目标分类
            const archiveResult = await this.archiveToCategory(
                documentId,
                cleanTitle,
                classification
            );

            return this.formatCreationResult(cleanTitle, classification, archiveResult);

        } catch (error) {
            console.error('创建文档错误:', error);
            throw error;
        }
    }

    /**
     * 清理文档标题
     */
    sanitizeTitle(title) {
        return title
            .trim()
            .replace(/[<>:"/\\|?*]/g, '-') // 移除不合法字符
            .replace(/\s+/g, ' ') // 合并多余空格
            .substring(0, 100); // 限制长度
    }

    /**
     * 分类文档
     */
    classifyDocument(title, content) {
        // 合并标题和内容进行分析
        const text = `${title} ${content}`.toLowerCase();

        // 计算每个分类的匹配分数
        const scores = {};

        for (const [category, rule] of Object.entries(this.classificationRules)) {
            let score = 0;
            let matchedKeywords = [];

            // 关键词匹配
            for (const keyword of rule.keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    score += 1;
                    matchedKeywords.push(keyword);
                }
            }

            // 标题中的关键词权重更高
            for (const keyword of rule.keywords) {
                if (title.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 0.5;
                }
            }

            if (score > 0) {
                scores[category] = {
                    score: score * rule.priority,
                    matchedKeywords,
                    targetCategory: rule.targetCategory
                };
            }
        }

        // 找出得分最高的分类
        let bestMatch = null;
        let highestScore = 0;

        for (const [category, result] of Object.entries(scores)) {
            if (result.score > highestScore) {
                highestScore = result.score;
                bestMatch = {
                    category,
                    targetCategory: result.targetCategory,
                    confidence: Math.min(highestScore / 5, 1), // 归一化置信度
                    matchedKeywords: result.matchedKeywords
                };
            }
        }

        // 如果没有匹配到任何分类，使用默认分类
        if (!bestMatch) {
            bestMatch = {
                category: 'general',
                targetCategory: '常规文档',
                confidence: 0,
                matchedKeywords: []
            };
        }

        console.log(`📊 文档分类结果: ${bestMatch.targetCategory} (置信度: ${bestMatch.confidence})`);

        return bestMatch;
    }

    /**
     * 归档到分类
     */
    async archiveToCategory(documentId, title, classification) {
        try {
            // 查找目标知识库和目录
            const targetSpace = this.findTargetWikiSpace(classification.targetCategory);

            if (!targetSpace) {
                console.warn(`未找到目标分类: ${classification.targetCategory}`);
                return {
                    success: false,
                    message: `未找到目标分类，文档已创建但未归档`
                };
            }

            // 获取目标节点（分类的根节点）
            const targetNode = await this.findOrCreateCategoryNode(
                targetSpace.wiki_space_id,
                classification.targetCategory
            );

            // 创建知识库节点
            await this.bot.createWikiNode(
                targetSpace.wiki_space_id,
                targetNode.node_token,
                documentId,
                title
            );

            // 更新索引
            await this.updateIndexAfterCreation(documentId, title, targetSpace);

            return {
                success: true,
                wikiSpace: targetSpace.name,
                category: classification.targetCategory,
                nodeId: targetNode.node_token
            };

        } catch (error) {
            console.error('归档错误:', error);
            return {
                success: false,
                message: `归档失败: ${error.message}`
            };
        }
    }

    /**
     * 查找目标知识库
     */
    findTargetWikiSpace(targetCategory) {
        // 在实际实现中，这里应该从配置中读取分类到知识库的映射
        // 现在简化为查找第一个匹配的知识库

        for (const [spaceId, category] of this.indexer.index.categories) {
            if (category.name.includes(targetCategory) || targetCategory.includes(category.name)) {
                return {
                    wiki_space_id: spaceId,
                    name: category.name
                };
            }
        }

        // 如果没有找到，返回第一个知识库
        const firstSpace = this.indexer.index.categories.keys().next().value;
        if (firstSpace) {
            return {
                wiki_space_id: firstSpace,
                name: this.indexer.index.categories.get(firstSpace).name
            };
        }

        return null;
    }

    /**
     * 查找或创建分类节点
     */
    async findOrCreateCategoryNode(wikiSpaceId, categoryName) {
        try {
            // 尝试查找现有节点
            const nodes = await this.bot.getAllWikiNodes(wikiSpaceId);

            for (const node of nodes) {
                if (node.title === categoryName && node.obj_type === 'node') {
                    return node;
                }
            }

            // 如果没有找到，返回根节点
            return { node_token: '' };

        } catch (error) {
            console.error('查找分类节点错误:', error);
            return { node_token: '' };
        }
    }

    /**
     * 创建文档后更新索引
     */
    async updateIndexAfterCreation(documentId, title, wikiSpace) {
        try {
            // 将新文档添加到索引中
            const docInfo = {
                id: documentId,
                title: title,
                wikiSpaceId: wikiSpace.wiki_space_id,
                parentToken: '',
                url: `https://example.com/doc/${documentId}`, // 实际URL需要从飞书获取
                createTime: new Date().toISOString(),
                updateTime: new Date().toISOString(),
                keywords: this.indexer.extractKeywords(title),
                summary: ''
            };

            this.indexer.index.documents.set(documentId, docInfo);

            // 保存索引
            await this.indexer.saveIndex();

            console.log('✅ 索引已更新');

        } catch (error) {
            console.error('更新索引错误:', error);
        }
    }

    /**
     * 格式化创建结果
     */
    formatCreationResult(title, classification, archiveResult) {
        let response = `✅ 文档创建成功

📄 文档标题：${title}
📂 分类：${classification.targetCategory}
🎯 置信度：${Math.round(classification.confidence * 100)}%`;

        if (archiveResult.success) {
            response += `
📚 归档位置：${archiveResult.wikiSpace}
✨ 已自动归档到标准目录`;
        } else {
            response += `
⚠️ ${archiveResult.message}`;
        }

        if (classification.matchedKeywords.length > 0) {
            response += `

🔑 匹配关键词：${classification.matchedKeywords.join(', ')}`;
        }

        response += `

💡 提示：文档已按照企业规范自动归档，方便后续查找和协作。`;

        return response;
    }

    /**
     * 批量创建文档
     */
    async batchCreate(documents) {
        try {
            console.log(`📝 批量创建 ${documents.length} 个文档`);

            const results = [];

            for (const doc of documents) {
                try {
                    const result = await this.create(doc.title, doc.content);
                    results.push({
                        success: true,
                        title: doc.title,
                        message: result
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        title: doc.title,
                        message: error.message
                    });
                }
            }

            return this.formatBatchResult(results);

        } catch (error) {
            console.error('批量创建错误:', error);
            throw error;
        }
    }

    /**
     * 格式化批量创建结果
     */
    formatBatchResult(results) {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        let response = `📊 批量创建完成

✅ 成功: ${successCount}
❌ 失败: ${failCount}`;

        if (failCount > 0) {
            response += `

❌ 失败详情:`;
            results.filter(r => !r.success).forEach(result => {
                response += `\n• ${result.title}: ${result.message}`;
            });
        }

        return response;
    }

    /**
     * 添加自定义分类规则
     */
    addClassificationRule(ruleName, rule) {
        if (!rule.keywords || !rule.targetCategory) {
            throw new Error('分类规则必须包含 keywords 和 targetCategory');
        }

        this.classificationRules[ruleName] = {
            keywords: rule.keywords,
            targetCategory: rule.targetCategory,
            priority: rule.priority || 10
        };

        console.log(`✅ 已添加自定义分类规则: ${ruleName}`);
    }

    /**
     * 获取分类统计
     */
    getClassificationStats() {
        const stats = {
            totalRules: Object.keys(this.classificationRules).length,
            rules: {}
        };

        for (const [name, rule] of Object.entries(this.classificationRules)) {
            stats.rules[name] = {
                targetCategory: rule.targetCategory,
                keywordCount: rule.keywords.length,
                priority: rule.priority
            };
        }

        return stats;
    }
}

module.exports = AutoArchiver;
