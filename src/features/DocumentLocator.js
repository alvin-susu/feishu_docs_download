/**
 * 智能文档定位功能
 * 帮助用户快速找到目标文档的精确链接
 */

class DocumentLocator {
    constructor(assistant) {
        this.assistant = assistant;
        this.indexer = assistant.indexer;
        this.bot = assistant.bot;
    }

    /**
     * 查找文档
     */
    async find(query) {
        try {
            console.log(`🔍 查找文档: ${query}`);

            // 搜索文档
            const results = this.indexer.search(query);

            if (results.length === 0) {
                return `🤔 未找到与"${query}"相关的文档

💡 建议：
• 检查文档名称是否正确
• 尝试使用更简单的关键词
• 使用 /search 命令搜索文档内容`;
            }

            // 如果只有一个结果，直接返回
            if (results.length === 1) {
                return this.formatSingleResult(results[0]);
            }

            // 多个结果时返回列表
            return this.formatMultipleResults(results, query);

        } catch (error) {
            console.error('文档定位错误:', error);
            throw error;
        }
    }

    /**
     * 格式化单个结果
     */
    formatSingleResult(doc) {
        const category = this.indexer.index.categories.get(doc.wikiSpaceId);

        return `📄 找到文档：${doc.title}

📍 位置：${category?.name || '未知知识库'}
🔗 链接：${doc.url}
📅 更新：${new Date(doc.updateTime).toLocaleDateString()}

💡 点击链接即可直接打开文档`;
    }

    /**
     * 格式化多个结果
     */
    formatMultipleResults(results, query) {
        let response = `🔍 找到 ${results.length} 个与"${query}"相关的文档

`;

        results.forEach((doc, index) => {
            const category = this.indexer.index.categories.get(doc.wikiSpaceId);
            response += `${index + 1}. ${doc.title}
   📍 ${category?.name || '未知'}
   🔗 ${doc.url}

`;
        });

        response += `💡 提示：
• 点击链接可直接打开文档
• 如果结果太多，可以尝试更具体的关键词`;

        return response;
    }

    /**
     * 获取文档路径
     */
    async getDocumentPath(docId) {
        try {
            const doc = this.indexer.index.documents.get(docId);

            if (!doc) {
                throw new Error(`文档不存在: ${docId}`);
            }

            // 构建路径
            const path = [];
            let currentDoc = doc;

            while (currentDoc) {
                path.unshift({
                    id: currentDoc.id,
                    title: currentDoc.title,
                    url: currentDoc.url
                });

                // 查找父节点
                if (currentDoc.parentToken) {
                    currentDoc = this.findDocumentByNodeToken(currentDoc.parentToken);
                } else {
                    currentDoc = null;
                }
            }

            return path;

        } catch (error) {
            console.error('获取文档路径错误:', error);
            throw error;
        }
    }

    /**
     * 根据节点Token查找文档
     */
    findDocumentByNodeToken(nodeToken) {
        for (const doc of this.indexer.index.documents.values()) {
            if (doc.id === nodeToken) {
                return doc;
            }
        }
        return null;
    }

    /**
     * 获取文档详情
     */
    async getDocumentDetail(docId) {
        try {
            return await this.indexer.getDocumentDetail(docId);
        } catch (error) {
            console.error('获取文档详情错误:', error);
            throw error;
        }
    }

    /**
     * 推荐相关文档
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
                    const similarity = this.calculateSimilarity(targetDoc, doc);
                    if (similarity > 0) {
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
    calculateSimilarity(doc1, doc2) {
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
        return intersection / union; // Jaccard相似度
    }

    /**
     * 智能补全文档名称
     */
    autoComplete(partialName, limit = 5) {
        try {
            const lowerPartial = partialName.toLowerCase();
            const matches = [];

            for (const doc of this.indexer.index.documents.values()) {
                if (doc.title.toLowerCase().includes(lowerPartial)) {
                    matches.push(doc);
                    if (matches.length >= limit) {
                        break;
                    }
                }
            }

            return matches;

        } catch (error) {
            console.error('智能补全错误:', error);
            return [];
        }
    }
}

module.exports = DocumentLocator;
