/**
 * 知识库索引器
 * 轻量化索引机制，解决Token消耗过高问题
 */

const fs = require('fs').promises;
const path = require('path');

class WikiIndexer {
    constructor() {
        this.index = {
            documents: new Map(),     // 文档索引
            categories: new Map(),    // 分类索引
            keywords: new Map(),      // 关键词索引
            lastUpdate: null,         // 最后更新时间
            version: 1                // 索引版本
        };

        this.indexFilePath = path.join(__dirname, '../../data/index.json');
        this.bot = null; // 将在外部注入
    }

    /**
     * 设置机器人实例
     */
    setBot(bot) {
        this.bot = bot;
    }

    /**
     * 构建索引
     * 采用增量更新策略，减少Token消耗
     */
    async buildIndex(forceRebuild = false) {
        try {
            console.log('🔍 开始构建知识库索引...');

            // 尝试加载现有索引
            if (!forceRebuild) {
                await this.loadIndex();
                if (this.shouldIncrementalUpdate()) {
                    console.log('📝 执行增量更新...');
                    await this.incrementalUpdate();
                } else {
                    console.log('🔄 需要全量重建索引...');
                    await this.fullRebuild();
                }
            } else {
                console.log('🔄 强制全量重建索引...');
                await this.fullRebuild();
            }

            // 保存索引
            await this.saveIndex();

            console.log(`✅ 索引构建完成，共索引 ${this.index.documents.size} 个文档`);
            return this.index;

        } catch (error) {
            console.error('❌ 构建索引失败:', error.message);
            throw error;
        }
    }

    /**
     * 判断是否应该增量更新
     */
    shouldIncrementalUpdate() {
        // 如果索引不存在或过期，需要全量重建
        if (!this.index.lastUpdate) {
            return false;
        }

        // 索引有效期7天
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        const age = Date.now() - new Date(this.index.lastUpdate).getTime();

        return age < maxAge;
    }

    /**
     * 全量重建索引
     */
    async fullRebuild() {
        if (!this.bot) {
            throw new Error('机器人实例未设置');
        }

        console.log('🔄 开始全量重建索引...');

        // 清空现有索引
        this.index.documents.clear();
        this.index.categories.clear();
        this.index.keywords.clear();

        // 获取所有知识库
        const wikiList = await this.bot.getWikiList();
        console.log(`📚 找到 ${wikiList.data.items.length} 个知识库`);

        // 遍历每个知识库
        for (const wiki of wikiList.data.items) {
            await this.indexWikiSpace(wiki.wiki_space_id, wiki.name);
        }

        this.index.lastUpdate = new Date().toISOString();
        console.log('✅ 全量索引构建完成');
    }

    /**
     * 索引单个知识库
     */
    async indexWikiSpace(wikiSpaceId, wikiName) {
        console.log(`📖 索引知识库: ${wikiName}`);

        try {
            // 递归获取所有节点
            const nodes = await this.getAllWikiNodes(wikiSpaceId);

            // 为分类索引添加知识库
            this.index.categories.set(wikiSpaceId, {
                name: wikiName,
                children: [],
                documentCount: 0
            });

            // 索引每个文档节点
            for (const node of nodes) {
                if (node.obj_type === 'document') {
                    await this.indexDocument(wikiSpaceId, node);
                }
            }

        } catch (error) {
            console.error(`索引知识库 ${wikiName} 失败:`, error.message);
        }
    }

    /**
     * 获取知识库所有节点（递归）
     */
    async getAllWikiNodes(wikiSpaceId, parentNodeToken = '') {
        const allNodes = [];
        let pageToken = '';

        do {
            const response = await this.bot.getWikiNode(wikiSpaceId, parentNodeToken);
            const nodes = response.data.items || [];

            allNodes.push(...nodes);

            // 如果有子节点，递归获取
            for (const node of nodes) {
                if (node.obj_type === 'node' && node.has_child) {
                    const childNodes = await this.getAllWikiNodes(wikiSpaceId, node.node_token);
                    allNodes.push(...childNodes);
                }
            }

            // 处理分页
            pageToken = response.data.page_token;
        } while (pageToken);

        return allNodes;
    }

    /**
     * 索引单个文档
     */
    async indexDocument(wikiSpaceId, node) {
        try {
            const docInfo = {
                id: node.node_token,
                title: node.title,
                wikiSpaceId,
                parentToken: node.parent_node_token,
                url: node.url,
                createTime: node.create_time,
                updateTime: node.update_time,
                keywords: this.extractKeywords(node.title),
                summary: '' // 摘要在需要时才获取
            };

            // 添加到文档索引
            this.index.documents.set(node.node_token, docInfo);

            // 更新分类索引
            const category = this.index.categories.get(wikiSpaceId);
            if (category) {
                category.documentCount++;
                if (!category.children.includes(node.title)) {
                    category.children.push(node.title);
                }
            }

            // 构建关键词索引
            for (const keyword of docInfo.keywords) {
                if (!this.index.keywords.has(keyword)) {
                    this.index.keywords.set(keyword, []);
                }
                this.index.keywords.get(keyword).push(node.node_token);
            }

        } catch (error) {
            console.error(`索引文档失败 [${node.title}]:`, error.message);
        }
    }

    /**
     * 提取关键词
     */
    extractKeywords(text) {
        if (!text) return [];

        // 简单的关键词提取（实际项目中可使用更复杂的NLP）
        const keywords = text
            .toLowerCase()
            .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1)
            .filter(word => !this.isStopWord(word));

        // 去重
        return [...new Set(keywords)];
    }

    /**
     * 判断是否为停用词
     */
    isStopWord(word) {
        const stopWords = ['的', '了', '是', '在', '和', '有', '我', '你', '他', '她',
                          'it', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to'];
        return stopWords.includes(word);
    }

    /**
     * 增量更新索引
     */
    async incrementalUpdate() {
        if (!this.bot) {
            throw new Error('机器人实例未设置');
        }

        console.log('📝 开始增量更新索引...');

        const lastUpdateTime = new Date(this.index.lastUpdate);
        let updateCount = 0;

        // 获取所有知识库
        const wikiList = await this.bot.getWikiList();

        // 检查更新的文档
        for (const wiki of wikiList.data.items) {
            const nodes = await this.getAllWikiNodes(wiki.wiki_space_id);

            for (const node of nodes) {
                if (node.obj_type === 'document') {
                    const updateTime = new Date(node.update_time);

                    // 如果文档更新时间晚于索引更新时间，重新索引
                    if (updateTime > lastUpdateTime) {
                        await this.indexDocument(wiki.wiki_space_id, node);
                        updateCount++;
                    }
                }
            }
        }

        this.index.lastUpdate = new Date().toISOString();
        console.log(`✅ 增量更新完成，更新了 ${updateCount} 个文档`);
    }

    /**
     * 搜索文档
     */
    search(query) {
        const keywords = this.extractKeywords(query);
        const results = new Map();

        // 关键词匹配评分
        for (const keyword of keywords) {
            const docs = this.index.keywords.get(keyword);
            if (docs) {
                for (const docId of docs) {
                    const score = results.get(docId) || 0;
                    results.set(docId, score + 1);
                }
            }
        }

        // 按相关性排序
        const sortedResults = Array.from(results.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // 限制结果数量
            .map(([docId]) => this.index.documents.get(docId));

        return sortedResults;
    }

    /**
     * 获取文档详情
     */
    async getDocumentDetail(docId) {
        const docInfo = this.index.documents.get(docId);

        if (!docInfo) {
            throw new Error(`文档不存在: ${docId}`);
        }

        // 如果没有摘要，按需获取
        if (!docInfo.summary && this.bot) {
            try {
                const content = await this.bot.getDocumentContent(docId);
                docInfo.summary = this.generateSummary(content);
            } catch (error) {
                console.error('获取文档详情失败:', error.message);
            }
        }

        return docInfo;
    }

    /**
     * 生成摘要
     */
    generateSummary(content, maxLength = 200) {
        if (!content) return '';

        // 简单摘要生成：取前maxLength个字符
        let summary = content.substring(0, maxLength);

        // 尽量在句子边界截断
        const lastPeriod = Math.max(
            summary.lastIndexOf('。'),
            summary.lastIndexOf('.'),
            summary.lastIndexOf('！'),
            summary.lastIndexOf('!'),
            summary.lastIndexOf('？'),
            summary.lastIndexOf('?')
        );

        if (lastPeriod > maxLength * 0.5) {
            summary = summary.substring(0, lastPeriod + 1);
        } else {
            summary += '...';
        }

        return summary;
    }

    /**
     * 保存索引到文件
     */
    async saveIndex() {
        try {
            const dir = path.dirname(this.indexFilePath);
            await fs.mkdir(dir, { recursive: true });

            const serializableIndex = {
                documents: Array.from(this.index.documents.entries()),
                categories: Array.from(this.index.categories.entries()),
                keywords: Array.from(this.index.keywords.entries()),
                lastUpdate: this.index.lastUpdate,
                version: this.index.version
            };

            await fs.writeFile(
                this.indexFilePath,
                JSON.stringify(serializableIndex, null, 2),
                'utf-8'
            );

            console.log('💾 索引已保存');
        } catch (error) {
            console.error('保存索引失败:', error.message);
        }
    }

    /**
     * 从文件加载索引
     */
    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexFilePath, 'utf-8');
            const loadedIndex = JSON.parse(data);

            // 验证索引版本
            if (loadedIndex.version !== this.index.version) {
                console.log('⚠️ 索引版本不匹配，需要重建');
                return false;
            }

            // 恢复索引数据
            this.index.documents = new Map(loadedIndex.documents);
            this.index.categories = new Map(loadedIndex.categories);
            this.index.keywords = new Map(loadedIndex.keywords);
            this.index.lastUpdate = loadedIndex.lastUpdate;

            console.log('✅ 索引加载成功');
            return true;

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📝 索引文件不存在，将创建新索引');
            } else {
                console.error('加载索引失败:', error.message);
            }
            return false;
        }
    }

    /**
     * 获取索引
     */
    getIndex() {
        return this.index;
    }

    /**
     * 获取索引统计信息
     */
    getStats() {
        return {
            totalDocuments: this.index.documents.size,
            totalCategories: this.index.categories.size,
            totalKeywords: this.index.keywords.size,
            lastUpdate: this.index.lastUpdate,
            version: this.index.version
        };
    }
}

module.exports = WikiIndexer;
