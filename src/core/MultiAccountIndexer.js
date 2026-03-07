/**
 * 多账号索引管理器
 * 为不同机器人账号维护独立的索引，实现索引隔离
 */

const fs = require('fs').promises;
const path = require('path');

class MultiAccountIndexer {
    constructor(accountManager) {
        this.accountManager = accountManager;
        this.indexes = new Map(); // accountId -> WikiIndexer
        this.currentIndexer = null;
        this.indexBasePath = path.join(__dirname, '../../data/index');
    }

    /**
     * 获取当前账号的索引器
     */
    getCurrentIndexer() {
        const currentAccount = this.accountManager.getCurrentAccount();

        if (!currentAccount) {
            throw new Error('未设置当前机器人账号');
        }

        return this.getIndexer(currentAccount.id);
    }

    /**
     * 获取指定账号的索引器
     */
    getIndexer(accountId) {
        if (!this.indexes.has(accountId)) {
            const WikiIndexer = require('./WikiIndexer');
            const indexer = new WikiIndexer();
            indexer.indexFilePath = path.join(this.indexBasePath, `${accountId}.json`);
            this.indexes.set(accountId, indexer);
        }

        return this.indexes.get(accountId);
    }

    /**
     * 切换到指定账号的索引
     */
    async switchIndex(accountId) {
        const account = this.accountManager.getAccount(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        // 切换到对应账号的索引器
        this.currentIndexer = this.getIndexer(accountId);

        // 尝试加载索引
        const loaded = await this.currentIndexer.loadIndex();

        console.log(`✅ 切换至账号索引: ${account.name}`);

        return {
            success: true,
            accountName: account.name,
            indexLoaded: loaded
        };
    }

    /**
     * 为账号构建索引
     */
    async buildIndexForAccount(accountId, forceRebuild = false) {
        try {
            const account = this.accountManager.getAccount(accountId, true);

            if (!account) {
                throw new Error('账号不存在');
            }

            console.log(`🔍 为账号 ${account.name} 构建索引...`);

            // 获取账号的索引器
            const indexer = this.getIndexer(accountId);

            // 创建临时的机器人实例
            const FeishuBot = require('../bot/FeishuBot');
            const bot = new FeishuBot();

            // 设置机器人凭证
            bot.appId = account.appId;
            bot.appSecret = account.appSecret;
            await bot.initialize();

            // 将机器人实例注入索引器
            indexer.setBot(bot);

            // 构建索引
            const index = await indexer.buildIndex(forceRebuild);

            // 更新账号状态
            await this.accountManager.updateAccountStatus(accountId, 'active', {
                totalDocuments: index.documents.size,
                totalCategories: index.categories.size,
                lastBuildTime: new Date().toISOString()
            });

            console.log(`✅ 账号 ${account.name} 索引构建完成`);

            return {
                success: true,
                accountId,
                stats: {
                    totalDocuments: index.documents.size,
                    totalCategories: index.categories.size,
                    totalKeywords: index.keywords.size
                }
            };

        } catch (error) {
            console.error(`构建索引失败 [${accountId}]:`, error);

            // 更新账号状态为错误
            await this.accountManager.updateAccountStatus(accountId, 'error');

            return {
                success: false,
                accountId,
                error: error.message
            };
        }
    }

    /**
     * 增量更新当前账号索引
     */
    async updateCurrentIndex() {
        const indexer = this.getCurrentIndexer();
        return await indexer.incrementalUpdate();
    }

    /**
     * 搜索当前账号索引
     */
    searchInCurrent(query) {
        const indexer = this.getCurrentIndexer();
        return indexer.search(query);
    }

    /**
     * 获取当前账号索引统计
     */
    getCurrentIndexStats() {
        const indexer = this.getCurrentIndexer();
        return indexer.getStats();
    }

    /**
     * 清除账号索引
     */
    async clearAccountIndex(accountId) {
        try {
            const indexPath = path.join(this.indexBasePath, `${accountId}.json`);

            try {
                await fs.unlink(indexPath);
                console.log(`✅ 清除账号索引: ${accountId}`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // 清除内存中的索引器
            if (this.indexes.has(accountId)) {
                this.indexes.delete(accountId);
            }

            return { success: true };

        } catch (error) {
            console.error('清除索引失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量更新所有活跃账号的索引
     */
    async updateAllActiveIndexes() {
        const accounts = this.accountManager.getAllAccounts();
        const activeAccounts = accounts.filter(acc => acc.status === 'active');

        console.log(`🔄 开始更新 ${activeAccounts.length} 个活跃账号的索引...`);

        const results = [];

        for (const account of activeAccounts) {
            try {
                const result = await this.buildIndexForAccount(account.id, false);
                results.push({
                    accountId: account.id,
                    accountName: account.name,
                    ...result
                });
            } catch (error) {
                results.push({
                    accountId: account.id,
                    accountName: account.name,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量更新完成，成功 ${successCount}/${activeAccounts.length}`);

        return results;
    }

    /**
     * 获取所有账号的索引统计
     */
    getAllIndexesStats() {
        const stats = {};
        const accounts = this.accountManager.getAllAccounts();

        for (const account of accounts) {
            try {
                const indexer = this.getIndexer(account.id);
                const indexStats = indexer.getStats();

                stats[account.id] = {
                    accountName: account.name,
                    status: account.status,
                    ...indexStats
                };
            } catch (error) {
                stats[account.id] = {
                    accountName: account.name,
                    status: account.status,
                    error: '无法读取索引统计'
                };
            }
        }

        return stats;
    }

    /**
     * 导出索引数据
     */
    async exportIndex(accountId) {
        try {
            const indexer = this.getIndexer(accountId);
            const index = indexer.getIndex();

            return {
                accountId,
                exportTime: new Date().toISOString(),
                data: {
                    documents: Array.from(index.documents.entries()),
                    categories: Array.from(index.categories.entries()),
                    keywords: Array.from(index.keywords.entries()),
                    lastUpdate: index.lastUpdate,
                    version: index.version
                }
            };

        } catch (error) {
            console.error('导出索引失败:', error);
            throw error;
        }
    }

    /**
     * 导入索引数据
     */
    async importIndex(accountId, indexData) {
        try {
            const indexer = this.getIndexer(accountId);

            // 验证数据格式
            if (!indexData.data || !indexData.data.documents) {
                throw new Error('无效的索引数据格式');
            }

            // 恢复索引
            indexer.index.documents = new Map(indexData.data.documents);
            indexer.index.categories = new Map(indexData.data.categories);
            indexer.index.keywords = new Map(indexData.data.keywords);
            indexer.index.lastUpdate = indexData.data.lastUpdate;
            indexer.index.version = indexData.data.version;

            // 保存到文件
            await indexer.saveIndex();

            console.log(`✅ 导入索引成功: ${accountId}`);

            return { success: true };

        } catch (error) {
            console.error('导入索引失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取索引存储空间使用情况
     */
    async getStorageStats() {
        const stats = {
            totalSize: 0,
            accountIndexes: {}
        };

        try {
            const accounts = this.accountManager.getAllAccounts();

            for (const account of accounts) {
                const indexPath = path.join(this.indexBasePath, `${account.id}.json`);

                try {
                    const statsObj = await fs.stat(indexPath);
                    const size = statsObj.size;

                    stats.accountIndexes[account.id] = {
                        accountName: account.name,
                        size: size,
                        sizeFormatted: this.formatBytes(size)
                    };

                    stats.totalSize += size;

                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error(`获取索引文件大小失败 [${account.id}]:`, error);
                    }
                }
            }

            stats.totalSizeFormatted = this.formatBytes(stats.totalSize);

            return stats;

        } catch (error) {
            console.error('获取存储统计失败:', error);
            return stats;
        }
    }

    /**
     * 格式化字节数
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 清理过期的索引文件
     */
    async cleanupOldIndexes(maxAge = 30 * 24 * 60 * 60 * 1000) { // 默认30天
        try {
            const accounts = this.accountManager.getAllAccounts();
            const now = Date.now();
            const cleaned = [];

            for (const account of accounts) {
                const indexPath = path.join(this.indexBasePath, `${account.id}.json`);

                try {
                    const statsObj = await fs.stat(indexPath);
                    const lastModified = statsObj.mtime.getTime();
                    const age = now - lastModified;

                    // 如果索引文件超过指定天数，且账号不活跃，则删除
                    if (age > maxAge && account.status !== 'active') {
                        await this.clearAccountIndex(account.id);
                        cleaned.push({
                            accountId: account.id,
                            accountName: account.name,
                            reason: '过期且账号不活跃'
                        });
                    }

                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error(`检查索引文件失败 [${account.id}]:`, error);
                    }
                }
            }

            if (cleaned.length > 0) {
                console.log(`🧹 清理了 ${cleaned.length} 个过期索引`);
            }

            return cleaned;

        } catch (error) {
            console.error('清理过期索引失败:', error);
            return [];
        }
    }
}

module.exports = MultiAccountIndexer;
