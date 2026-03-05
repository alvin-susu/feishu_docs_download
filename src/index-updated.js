/**
 * 飞书知识库智能助手主程序（支持多账号）
 * OpenClaw插件 - 飞书机器人联动
 */

require('dotenv').config();
const BotAccountManager = require('./core/BotAccountManager');
const MultiAccountIndexer = require('./core/MultiAccountIndexer');
const PermissionChecker = require('./core/PermissionChecker');
const FeishuBot = require('./bot/FeishuBot');
const MessageHandler = require('./handlers/MessageHandler');

class FeishuWikiAssistant {
    constructor() {
        this.accountManager = new BotAccountManager();
        this.multiAccountIndexer = null;
        this.permissionChecker = new PermissionChecker();
        this.currentBot = null;
        this.messageHandler = null;

        this.isInitialized = false;
    }

    /**
     * 初始化插件
     */
    async initialize() {
        try {
            console.log('🚀 飞书知识库智能助手启动中...');

            // 加载已保存的账号
            await this.accountManager.loadAccounts();

            // 初始化多账号索引管理器
            this.multiAccountIndexer = new MultiAccountIndexer(this.accountManager);

            // 如果有当前账号，初始化对应的机器人
            const currentAccount = this.accountManager.getCurrentAccount();
            if (currentAccount) {
                await this.initializeCurrentAccount(currentAccount);
            }

            // 初始化消息处理器
            this.messageHandler = new MessageHandler(this);

            this.isInitialized = true;
            console.log('✅ 插件启动完成');

            return {
                success: true,
                hasCurrentAccount: !!currentAccount,
                accountStats: this.accountManager.getStats()
            };

        } catch (error) {
            console.error('❌ 插件启动失败:', error.message);
            throw error;
        }
    }

    /**
     * 初始化当前账号
     */
    async initializeCurrentAccount(account) {
        try {
            console.log(`🔑 初始化机器人账号: ${account.name}`);

            // 创建机器人实例
            this.currentBot = new FeishuBot();
            this.currentBot.appId = account.appId;
            this.currentBot.appSecret = account.appSecret;

            // 初始化机器人
            await this.currentBot.initialize();

            // 切换到对应账号的索引
            await this.multiAccountIndexer.switchIndex(account.id);

            // 如果索引不存在或过期，构建新索引
            const indexer = this.multiAccountIndexer.getCurrentIndexer();
            const shouldBuildIndex = !indexer.index.lastUpdate ||
                this.isIndexExpired(indexer.index.lastUpdate);

            if (shouldBuildIndex) {
                console.log('📝 需要构建或更新索引...');
                await this.multiAccountIndexer.buildIndexForAccount(account.id);
            } else {
                console.log('✅ 索引状态良好，无需重建');
            }

            console.log(`✅ 机器人账号 ${account.name} 初始化完成`);

        } catch (error) {
            console.error(`初始化账号失败 [${account.name}]:`, error.message);
            await this.accountManager.updateAccountStatus(account.id, 'error');
            throw error;
        }
    }

    /**
     * 判断索引是否过期
     */
    isIndexExpired(lastUpdateTime) {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
        const age = Date.now() - new Date(lastUpdateTime).getTime();
        return age > maxAge;
    }

    /**
     * 添加机器人账号
     */
    async addAccount(accountInfo) {
        try {
            // 添加账号
            const account = await this.accountManager.addAccount(accountInfo);

            // 验证账号权限
            console.log('🔍 开始验证机器人权限...');
            await this.validateNewAccount(account);

            // 构建索引
            console.log('📝 开始构建文档索引...');
            await this.multiAccountIndexer.buildIndexForAccount(account.id, true);

            return account;

        } catch (error) {
            console.error('添加账号失败:', error);
            throw error;
        }
    }

    /**
     * 验证新账号
     */
    async validateNewAccount(account) {
        // 创建临时机器人实例
        const tempBot = new FeishuBot();
        tempBot.appId = account.appId;
        tempBot.appSecret = this.accountManager.decrypt(account.appSecret);

        // 检查权限
        const permissionReport = await this.permissionChecker.checkPermissions(tempBot);

        // 保存权限检查结果
        await this.accountManager.updateAccountStatus(
            account.id,
            permissionReport.summary.level === 'success' ? 'active' : 'error',
            {
                permissionReport: permissionReport.summary
            }
        );

        if (permissionReport.summary.level === 'critical') {
            throw new Error(permissionReport.summary.message);
        }

        return permissionReport;
    }

    /**
     * 切换当前账号
     */
    async switchAccount(accountId) {
        try {
            console.log(`🔄 切换至账号: ${accountId}`);

            // 切换账号管理器中的当前账号
            const account = await this.accountManager.switchAccount(accountId);

            // 初始化新账号
            await this.initializeCurrentAccount(account);

            console.log('✅ 账号切换完成');

            return {
                success: true,
                accountName: account.name
            };

        } catch (error) {
            console.error('切换账号失败:', error);
            throw error;
        }
    }

    /**
     * 处理消息
     */
    async handleMessage(message) {
        try {
            if (!this.isInitialized) {
                return '系统正在初始化，请稍后再试';
            }

            // 确保有当前账号
            if (!this.currentBot) {
                return '请先在插件配置面板绑定飞书机器人账号';
            }

            // 委托给消息处理器
            const response = await this.messageHandler.process(message);

            return response || null;

        } catch (error) {
            console.error('处理消息错误:', error);
            return '抱歉，处理您的请求时出现错误，请稍后重试。';
        }
    }

    /**
     * 发送消息
     */
    async sendMessage(chatId, content) {
        if (!this.currentBot) {
            throw new Error('未设置当前机器人账号');
        }

        return await this.currentBot.sendMessage(chatId, content);
    }

    /**
     * 获取当前账号信息
     */
    getCurrentAccountInfo() {
        const account = this.accountManager.getCurrentAccount();
        if (!account) {
            return null;
        }

        const indexer = this.multiAccountIndexer.getCurrentIndexer();
        const stats = indexer ? indexer.getStats() : null;

        return {
            account: this.accountManager.getAccount(account.id, false),
            indexStats: stats
        };
    }

    /**
     * 获取所有账号信息
     */
    getAllAccountsInfo() {
        const accounts = this.accountManager.getAllAccounts();
        const allStats = this.multiAccountIndexer.getAllIndexesStats();

        return accounts.map(account => ({
            ...account,
            indexStats: allStats[account.id] || null
        }));
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            hasCurrentAccount: !!this.currentBot,
            accountStats: this.accountManager.getStats(),
            storageStats: this.multiAccountIndexer ?
                this.multiAccountIndexer.getStorageStats() : null
        };
    }

    /**
     * 重建当前账号索引
     */
    async rebuildCurrentIndex() {
        if (!this.currentBot) {
            throw new Error('未设置当前机器人账号');
        }

        const currentAccount = this.accountManager.getCurrentAccount();
        return await this.multiAccountIndexer.buildIndexForAccount(
            currentAccount.id,
            true
        );
    }

    /**
     * 更新所有活跃账号索引
     */
    async updateAllIndexes() {
        return await this.multiAccountIndexer.updateAllActiveIndexes();
    }

    /**
     * 删除账号
     */
    async deleteAccount(accountId) {
        try {
            console.log(`🗑️ 删除账号: ${accountId}`);

            // 删除账号
            await this.accountManager.deleteAccount(accountId);

            // 清除对应索引
            await this.multiAccountIndexer.clearAccountIndex(accountId);

            // 如果删除的是当前账号，需要切换
            if (accountId === this.accountManager.currentAccountId) {
                const newCurrentAccount = this.accountManager.getCurrentAccount();
                if (newCurrentAccount) {
                    await this.initializeCurrentAccount(newCurrentAccount);
                } else {
                    this.currentBot = null;
                }
            }

            console.log('✅ 账号删除完成');

            return { success: true };

        } catch (error) {
            console.error('删除账号失败:', error);
            throw error;
        }
    }

    /**
     * 关闭插件
     */
    async shutdown() {
        console.log('🛑 正在关闭插件...');

        // 保存所有索引
        if (this.multiAccountIndexer) {
            for (const [accountId, indexer] of this.multiAccountIndexer.indexes) {
                try {
                    await indexer.saveIndex();
                } catch (error) {
                    console.error(`保存索引失败 [${accountId}]:`, error);
                }
            }
        }

        // 保存账号信息
        await this.accountManager.saveAccounts();

        this.isInitialized = false;
        console.log('✅ 插件已关闭');
    }
}

// 导出插件类
module.exports = FeishuWikiAssistant;

// 如果直接运行此文件，启动插件
if (require.main === module) {
    const assistant = new FeishuWikiAssistant();

    // 优雅退出处理
    process.on('SIGINT', async () => {
        await assistant.shutdown();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await assistant.shutdown();
        process.exit(0);
    });

    // 启动插件
    assistant.initialize()
        .then(result => {
            console.log('启动结果:', result);
        })
        .catch(error => {
            console.error('启动失败:', error);
            process.exit(1);
        });
}
