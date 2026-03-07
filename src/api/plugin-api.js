/**
 * ClawHub插件API路由处理器
 * 为配置界面提供后端支持
 */

const FeishuWikiAssistant = require('../index-updated');

class PluginAPI {
    constructor() {
        this.assistant = null;
        this.initialized = false;
    }

    /**
     * 初始化API
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        this.assistant = new FeishuWikiAssistant();
        await this.assistant.initialize();
        this.initialized = true;
    }

    /**
     * 处理HTTP请求
     */
    async handleRequest(request) {
        try {
            // 确保已初始化
            await this.initialize();

            const { method, path, body, query } = request;

            // 路由分发
            if (path === '/api/accounts' && method === 'GET') {
                return await this.getAccounts();
            }

            if (path === '/api/accounts' && method === 'POST') {
                return await this.addAccount(body);
            }

            if (path.startsWith('/api/accounts/') && method === 'POST') {
                const accountId = path.split('/')[3];
                const action = path.split('/')[4];

                if (action === 'switch') {
                    return await this.switchAccount(accountId);
                }

                if (action === 'validate') {
                    return await this.validateAccount(accountId);
                }
            }

            if (path.startsWith('/api/accounts/') && method === 'DELETE') {
                const accountId = path.split('/')[3];
                return await this.deleteAccount(accountId);
            }

            if (path === '/api/status' && method === 'GET') {
                return await this.getStatus();
            }

            if (path === '/api/index/rebuild' && method === 'POST') {
                return await this.rebuildIndex();
            }

            if (path === '/api/index/update-all' && method === 'POST') {
                return await this.updateAllIndexes();
            }

            // 404
            return {
                status: 404,
                body: { error: 'Not Found' }
            };

        } catch (error) {
            console.error('API请求处理错误:', error);
            return {
                status: 500,
                body: { error: error.message }
            };
        }
    }

    /**
     * 获取账号列表
     */
    async getAccounts() {
        const accounts = this.assistant.getAllAccountsInfo();
        const currentAccountId = this.assistant.accountManager.currentAccountId;

        return {
            status: 200,
            body: {
                accounts,
                currentAccountId
            }
        };
    }

    /**
     * 添加账号
     */
    async addAccount(accountData) {
        try {
            const { name, appId, appSecret } = accountData;

            // 验证必填字段
            if (!name || !appId || !appSecret) {
                return {
                    status: 400,
                    body: {
                        error: '机器人备注、AppID、AppSecret为必填项'
                    }
                };
            }

            // 添加账号
            const account = await this.assistant.addAccount({
                name: name.trim(),
                appId: appId.trim(),
                appSecret: appSecret.trim()
            });

            return {
                status: 200,
                body: {
                    success: true,
                    account: this.assistant.accountManager.getAccount(account.id, false)
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    error: error.message
                }
            };
        }
    }

    /**
     * 切换账号
     */
    async switchAccount(accountId) {
        try {
            const result = await this.assistant.switchAccount(accountId);

            return {
                status: 200,
                body: {
                    success: true,
                    ...result
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    error: error.message
                }
            };
        }
    }

    /**
     * 验证账号
     */
    async validateAccount(accountId) {
        try {
            const account = this.assistant.accountManager.getAccount(accountId, true);

            // 创建临时机器人实例
            const FeishuBot = require('../bot/FeishuBot');
            const bot = new FeishuBot();
            bot.appId = account.appId;
            bot.appSecret = account.appSecret;

            // 获取访问令牌
            await bot.refreshAccessToken();

            // 检查权限
            const PermissionChecker = require('../core/PermissionChecker');
            const permissionChecker = new PermissionChecker();
            const report = await permissionChecker.checkPermissions(bot);

            // 格式化报告
            const formattedReport = permissionChecker.formatReport(report);

            return {
                status: 200,
                body: {
                    valid: report.summary.level !== 'critical',
                    report: formattedReport,
                    summary: report.summary
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    valid: false,
                    error: error.message
                }
            };
        }
    }

    /**
     * 删除账号
     */
    async deleteAccount(accountId) {
        try {
            const result = await this.assistant.deleteAccount(accountId);

            return {
                status: 200,
                body: {
                    success: true,
                    ...result
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    error: error.message
                }
            };
        }
    }

    /**
     * 获取系统状态
     */
    async getStatus() {
        const status = this.assistant.getSystemStatus();

        return {
            status: 200,
            body: status
        };
    }

    /**
     * 重建索引
     */
    async rebuildIndex() {
        try {
            const result = await this.assistant.rebuildCurrentIndex();

            return {
                status: 200,
                body: {
                    success: true,
                    ...result
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    error: error.message
                }
            };
        }
    }

    /**
     * 更新所有索引
     */
    async updateAllIndexes() {
        try {
            const results = await this.assistant.updateAllIndexes();

            return {
                status: 200,
                body: {
                    success: true,
                    results
                }
            };

        } catch (error) {
            return {
                status: 400,
                body: {
                    error: error.message
                }
            };
        }
    }
}

module.exports = PluginAPI;
