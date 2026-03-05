/**
 * 文档服务
 * 提供文档相关的通用服务功能
 */

class DocumentService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1小时
    }

    /**
     * 获取文档详情（带缓存）
     */
    async getDocumentDetail(bot, documentId, useCache = true) {
        const cacheKey = `doc_${documentId}`;

        // 检查缓存
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`📦 从缓存获取文档: ${documentId}`);
                return cached.data;
            }
        }

        // 获取文档内容
        const content = await bot.getDocumentContent(documentId);

        const detail = {
            id: documentId,
            content,
            summary: this.generateSummary(content),
            wordCount: this.countWords(content),
            fetchedAt: new Date().toISOString()
        };

        // 更新缓存
        if (useCache) {
            this.cache.set(cacheKey, {
                data: detail,
                timestamp: Date.now()
            });
        }

        return detail;
    }

    /**
     * 生成摘要
     */
    generateSummary(content, maxLength = 200) {
        if (!content) return '';

        let summary = content.substring(0, maxLength);

        // 在句子边界截断
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
     * 统计字数
     */
    countWords(content) {
        if (!content) return 0;

        // 移除空白字符后统计
        const cleanContent = content.replace(/\s+/g, '');
        return cleanContent.length;
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ 缓存已清空');
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * 批量获取文档详情
     */
    async getBatchDocumentDetails(bot, documentIds) {
        const results = [];

        for (const docId of documentIds) {
            try {
                const detail = await this.getDocumentDetail(bot, docId);
                results.push({
                    success: true,
                    documentId: docId,
                    data: detail
                });
            } catch (error) {
                results.push({
                    success: false,
                    documentId: docId,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 格式化文档内容
     */
    formatDocumentContent(content, format = 'markdown') {
        switch (format) {
            case 'markdown':
                return this.formatAsMarkdown(content);
            case 'html':
                return this.formatAsHtml(content);
            case 'plain':
            default:
                return content;
        }
    }

    /**
     * 格式化为Markdown
     */
    formatAsMarkdown(content) {
        // 简单的Markdown格式化
        return content
            .replace(/\n{3,}/g, '\n\n') // 合并多余换行
            .replace(/^[ \t]+/gm, '') // 移除行首空格
            .trim();
    }

    /**
     * 格式化为HTML
     */
    formatAsHtml(content) {
        // 简单的HTML格式化
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/g, '<p>$1</p>')
            .join('');
    }

    /**
     * 验证文档ID
     */
    isValidDocumentId(docId) {
        // 飞书文档ID通常是字母、数字、下划线、连字符的组合
        return /^[a-zA-Z0-9_-]{10,}$/.test(docId);
    }

    /**
     * 清理文档标题
     */
    sanitizeTitle(title) {
        return title
            .trim()
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, ' ')
            .substring(0, 100);
    }

    /**
     * 比较两个文档的相似度
     */
    compareDocuments(doc1, doc2) {
        const keywords1 = new Set(doc1.keywords || []);
        const keywords2 = new Set(doc2.keywords || []);

        let intersection = 0;
        for (const keyword of keywords1) {
            if (keywords2.has(keyword)) {
                intersection++;
            }
        }

        const union = keywords1.size + keywords2.size - intersection;
        return union > 0 ? intersection / union : 0;
    }

    /**
     * 导出文档
     */
    async exportDocument(bot, documentId, format = 'json') {
        try {
            const detail = await this.getDocumentDetail(bot, documentId);

            switch (format) {
                case 'json':
                    return JSON.stringify(detail, null, 2);

                case 'markdown':
                    return `# ${documentId}\n\n${detail.content}`;

                case 'txt':
                    return detail.content;

                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

        } catch (error) {
            console.error('导出文档错误:', error);
            throw error;
        }
    }
}

module.exports = DocumentService;
