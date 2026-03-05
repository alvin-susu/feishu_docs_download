/**
 * 高效内容检索功能
 * 智能搜索知识库内容，返回信息摘要和关联文档
 */

class ContentSearcher {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;
    }

    /**
     * 搜索内容
     */
    async search(query) {
        try {
            console.log(`🔍 搜索内容: ${query}`);

            // 基于索引搜索文档
            const documents = this.indexer.search(query);

            if (documents.length === 0) {
                return `🤔 未找到与"${query}"相关的内容

💡 建议：
• 尝试使用不同的关键词
• 使用更通用的搜索词
• 使用 /find 命令查找特定文档`;
            }

            // 获取文档详情（包含内容摘要）
            const results = await this.getDetailedResults(documents, query);

            return this.formatSearchResults(results, query);

        } catch (error) {
            console.error('内容搜索错误:', error);
            throw error;
        }
    }

    /**
     * 获取详细搜索结果
     */
    async getDetailedResults(documents, query) {
        const detailedResults = [];

        // 限制结果数量，避免Token消耗过高
        const maxResults = Math.min(documents.length, 5);

        for (let i = 0; i < maxResults; i++) {
            const doc = documents[i];

            try {
                // 获取文档详情（按需加载内容）
                const detail = await this.indexer.getDocumentDetail(doc.id);

                // 计算相关性分数
                const relevance = this.calculateRelevance(query, detail);

                detailedResults.push({
                    document: detail,
                    relevance,
                    excerpt: this.extractRelevantExcerpt(detail.summary || '', query)
                });

            } catch (error) {
                console.error(`获取文档详情失败 [${doc.title}]:`, error.message);
                // 如果获取详情失败，使用基本信息
                detailedResults.push({
                    document: doc,
                    relevance: 0.5,
                    excerpt: '无法获取内容摘要'
                });
            }
        }

        // 按相关性排序
        detailedResults.sort((a, b) => b.relevance - a.relevance);

        return detailedResults;
    }

    /**
     * 计算查询相关性
     */
    calculateRelevance(query, document) {
        let score = 0;
        const lowerQuery = query.toLowerCase();

        // 标题匹配权重较高
        if (document.title.toLowerCase().includes(lowerQuery)) {
            score += 0.4;
        }

        // 关键词匹配
        const queryKeywords = this.extractKeywords(query);
        for (const keyword of queryKeywords) {
            if (document.keywords.includes(keyword)) {
                score += 0.2;
            }
        }

        // 内容匹配（如果有摘要）
        if (document.summary && document.summary.toLowerCase().includes(lowerQuery)) {
            score += 0.3;
        }

        return Math.min(score, 1.0); // 限制最大分数为1
    }

    /**
     * 提取关键词
     */
    extractKeywords(text) {
        return this.indexer.extractKeywords(text);
    }

    /**
     * 提取相关段落
     */
    extractRelevantExcerpt(content, query, maxLength = 150) {
        if (!content) {
            return '暂无内容摘要';
        }

        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();

        // 查找查询词在内容中的位置
        const index = lowerContent.indexOf(lowerQuery);

        if (index === -1) {
            // 如果没有直接匹配，返回前半部分
            return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
        }

        // 提取包含查询词的段落
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + query.length + 50);

        let excerpt = content.substring(start, end);

        // 添加省略号
        if (start > 0) excerpt = '...' + excerpt;
        if (end < content.length) excerpt = excerpt + '...';

        return excerpt;
    }

    /**
     * 格式化搜索结果
     */
    formatSearchResults(results, query) {
        if (results.length === 0) {
            return `🤔 未找到与"${query}"相关的内容`;
        }

        let response = `🔍 找到 ${results.length} 个与"${query}"相关的结果

`;

        results.forEach((result, index) => {
            const doc = result.document;
            const category = this.indexer.index.categories.get(doc.wikiSpaceId);

            response += `${index + 1}. **${doc.title}**
   📍 ${category?.name || '未知知识库'}
   📝 ${result.excerpt}
   🔗 [查看文档](${doc.url})
   ⭐ 相关度: ${Math.round(result.relevance * 100)}%

`;
        });

        // 添加相关文档推荐
        if (results.length > 0) {
            const topDoc = results[0].document;
            const relatedDocs = this.getRelatedDocuments(topDoc.id, 3);

            if (relatedDocs.length > 0) {
                response += `📚 **相关文档推荐**
`;
                relatedDocs.forEach((doc, index) => {
                    response += `${index + 1}. ${doc.title}
   🔗 ${doc.url}
`;
                });
            }
        }

        response += `💡 提示：
• 点击文档链接查看完整内容
• 使用更具体的关键词可获得更精准的结果`;

        return response;
    }

    /**
     * 获取相关文档
     */
    getRelatedDocuments(docId, limit = 5) {
        try {
            const targetDoc = this.indexer.index.documents.get(docId);

            if (!targetDoc) {
                return [];
            }

            // 计算相似度
            const similarities = [];

            for (const [id, doc] of this.indexer.index.documents) {
                if (id !== docId) {
                    const similarity = this.calculateDocumentSimilarity(targetDoc, doc);
                    if (similarity > 0.1) { // 相似度阈值
                        similarities.push({ doc, similarity });
                    }
                }
            }

            // 按相似度排序并返回前N个
            similarities.sort((a, b) => b.similarity - a.similarity);
            return similarities.slice(0, limit).map(item => item.doc);

        } catch (error) {
            console.error('获取相关文档错误:', error);
            return [];
        }
    }

    /**
     * 计算文档相似度
     */
    calculateDocumentSimilarity(doc1, doc2) {
        // 基于关键词重叠计算相似度
        const keywords1 = new Set(doc1.keywords);
        const keywords2 = new Set(doc2.keywords);

        let intersection = 0;
        for (const keyword of keywords1) {
            if (keywords2.has(keyword)) {
                intersection++;
            }
        }

        const union = keywords1.size + keywords2.size - intersection;
        return union > 0 ? intersection / union : 0; // Jaccard相似度
    }

    /**
     * 高级搜索 - 支持过滤条件
     */
    async advancedSearch(query, filters = {}) {
        try {
            console.log(`🔍 高级搜索: ${query}`, filters);

            // 基础搜索
            let documents = this.indexer.search(query);

            // 应用过滤条件
            if (filters.wikiSpaceId) {
                documents = documents.filter(doc => doc.wikiSpaceId === filters.wikiSpaceId);
            }

            if (filters.startDate) {
                documents = documents.filter(doc =>
                    new Date(doc.updateTime) >= new Date(filters.startDate)
                );
            }

            if (filters.endDate) {
                documents = documents.filter(doc =>
                    new Date(doc.updateTime) <= new Date(filters.endDate)
                );
            }

            if (filters.minKeywords) {
                documents = documents.filter(doc =>
                    doc.keywords.length >= filters.minKeywords
                );
            }

            // 获取详细结果
            const results = await this.getDetailedResults(documents, query);

            return this.formatSearchResults(results, query);

        } catch (error) {
            console.error('高级搜索错误:', error);
            throw error;
        }
    }

    /**
     * 获取搜索统计信息
     */
    getSearchStats() {
        const indexStats = this.indexer.getStats();

        return {
            totalDocuments: indexStats.totalDocuments,
            totalKeywords: indexStats.totalKeywords,
            averageKeywordsPerDoc: this.calculateAverageKeywords(),
            lastUpdateTime: indexStats.lastUpdate
        };
    }

    /**
     * 计算平均关键词数量
     */
    calculateAverageKeywords() {
        let totalKeywords = 0;
        let docCount = 0;

        for (const doc of this.indexer.index.documents.values()) {
            totalKeywords += doc.keywords.length;
            docCount++;
        }

        return docCount > 0 ? Math.round(totalKeywords / docCount) : 0;
    }
}

module.exports = ContentSearcher;
