/**
 * 机器人账号管理器
 * 管理多个飞书机器人账号的绑定、存储、切换
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class BotAccountManager {
    constructor() {
        this.accounts = new Map();
        this.currentAccountId = null;
        this.storagePath = path.join(__dirname, '../../data/accounts.json');
        this.encryptionKey = this.getOrCreateEncryptionKey();
    }

    /**
     * 获取加密密钥 (安全版本)
     * 🔒 安全要求: 必须设置ENCRYPTION_KEY环境变量，不使用硬编码密钥
     */
    getOrCreateEncryptionKey() {
        const key = process.env.ENCRYPTION_KEY;

        // 🔒 安全检查: 强制要求环境变量，不使用硬编码密钥
        if (!key || key.length < 32) {
            throw new Error(
                '安全错误: 必须设置ENCRYPTION_KEY环境变量(至少32字符)\n' +
                '请在.env文件中设置: ENCRYPTION_KEY=your_32_character_random_string\n' +
                '生成方法: openssl rand -hex 32'
            );
        }

        // 如果密钥长度不足32字符，补充到32字符以上
        const secureKey = key.length < 32 ? key.padEnd(32, '0') : key;

        return crypto.createHash('sha256').update(secureKey).digest();
    }

    /**
     * 加密数据
     */
    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('加密失败:', error);
            throw new Error('数据加密失败');
        }
    }

    /**
     * 解密数据
     */
    decrypt(encryptedText) {
        try {
            const parts = encryptedText.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('解密失败:', error);
            throw new Error('数据解密失败');
        }
    }

    /**
     * 生成账号ID
     */
    generateAccountId() {
        return 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 添加机器人账号
     */
    async addAccount(accountInfo) {
        try {
            const { name, appId, appSecret } = accountInfo;

            // 验证必填字段
            if (!name || !appId || !appSecret) {
                throw new Error('机器人备注、AppID、AppSecret为必填项');
            }

            // 验证备注名称长度
            if (name.length > 10) {
                throw new Error('机器人备注不能超过10个字符');
            }

            // 检查是否已存在相同AppID的账号
            for (const [id, account] of this.accounts) {
                if (account.appId === appId) {
                    throw new Error('该AppID已绑定，请勿重复添加');
                }
            }

            // 创建新账号
            const accountId = this.generateAccountId();
            const account = {
                id: accountId,
                name: name.trim(),
                appId: appId.trim(),
                appSecret: this.encrypt(appSecret.trim()), // 加密存储
                isDefault: this.accounts.size === 0, // 第一个账号设为默认
                status: 'pending', // pending, active, error
                lastSync: null,
                syncStats: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.accounts.set(accountId, account);

            // 如果是第一个账号，自动设为当前账号
            if (account.isDefault) {
                this.currentAccountId = accountId;
            }

            // 保存到本地
            await this.saveAccounts();

            // 🔒 安全日志: 不记录敏感信息
            if (process.env.LOG_LEVEL === 'debug') {
                console.log(`✅ 新增机器人账号: ${name}`);
            } else {
                console.log('✅ 新增机器人账号成功');
            }
            return account;

        } catch (error) {
            console.error('添加账号失败:', error);
            throw error;
        }
    }

    /**
     * 获取账号信息（脱敏）
     */
    getAccount(accountId, includeSecret = false) {
        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        // 返回脱敏信息
        const result = {
            id: account.id,
            name: account.name,
            appId: account.appId,
            isDefault: account.isDefault,
            status: account.status,
            lastSync: account.lastSync,
            syncStats: account.syncStats,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
        };

        // 仅在需要时返回解密后的密钥
        if (includeSecret) {
            result.appSecret = this.decrypt(account.appSecret);
        } else {
            // 返回脱敏的密钥
            result.appSecret = this.maskSecret(account.appSecret);
        }

        return result;
    }

    /**
     * 脱敏密钥显示
     */
    maskSecret(encryptedSecret) {
        return '●●●●●●●●'; // 始终返回固定长度的掩码
    }

    /**
     * 获取所有账号列表（脱敏）
     */
    getAllAccounts() {
        const accounts = [];

        for (const [id, account] of this.accounts) {
            accounts.push(this.getAccount(id, false));
        }

        return accounts;
    }

    /**
     * 获取当前账号（包含完整信息）
     */
    getCurrentAccount() {
        if (!this.currentAccountId) {
            return null;
        }

        return this.getAccount(this.currentAccountId, true);
    }

    /**
     * 切换当前账号
     */
    async switchAccount(accountId) {
        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        this.currentAccountId = accountId;
        await this.saveAccounts();

        // 🔒 安全日志: 不记录具体的机器人名称
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`✅ 切换至机器人: ${account.name}`);
        } else {
            console.log('✅ 机器人账号切换成功');
        }
        return account;
    }

    /**
     * 更新账号信息
     */
    async updateAccount(accountId, updates) {
        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        // 允许更新的字段
        const allowedFields = ['name', 'appId', 'appSecret'];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                if (field === 'appSecret') {
                    account[field] = this.encrypt(updates[field]);
                } else {
                    account[field] = updates[field].trim();
                }
            }
        }

        account.updatedAt = new Date().toISOString();

        await this.saveAccounts();

        console.log(`✅ 更新机器人账号: ${account.name}`);
        return this.getAccount(accountId, false);
    }

    /**
     * 删除账号
     */
    async deleteAccount(accountId) {
        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        // 如果删除的是当前账号，需要切换到其他账号
        if (accountId === this.currentAccountId) {
            const remainingAccounts = Array.from(this.accounts.keys()).filter(id => id !== accountId);

            if (remainingAccounts.length > 0) {
                this.currentAccountId = remainingAccounts[0];
                // 更新默认账号
                this.accounts.get(this.currentAccountId).isDefault = true;
            } else {
                this.currentAccountId = null;
            }
        }

        this.accounts.delete(accountId);

        await this.saveAccounts();
        await this.clearAccountIndex(accountId);

        // 🔒 安全日志: 不记录删除的账号信息
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`✅ 删除机器人账号: ${account.name}`);
        } else {
            console.log('✅ 机器人账号删除成功');
        }
        return true;
    }

    /**
     * 更新账号同步状态
     */
    async updateAccountStatus(accountId, status, syncStats = null) {
        const account = this.accounts.get(accountId);

        if (!account) {
            throw new Error('账号不存在');
        }

        account.status = status;
        account.lastSync = new Date().toISOString();

        if (syncStats) {
            account.syncStats = syncStats;
        }

        account.updatedAt = new Date().toISOString();

        await this.saveAccounts();
    }

    /**
     * 验证账号配置
     */
    async validateAccount(accountId) {
        const account = this.getAccount(accountId, true);

        if (!account) {
            throw new Error('账号不存在');
        }

        try {
            // 这里应该调用飞书API验证账号是否有效
            // 简化实现，实际应该调用 FeishuBot 的验证方法
            const FeishuBot = require('../bot/FeishuBot');
            const bot = new FeishuBot();

            // 设置临时的凭证
            bot.appId = account.appId;
            bot.appSecret = account.appSecret;

            // 尝试获取访问令牌
            await bot.refreshAccessToken();

            // 更新账号状态为有效
            await this.updateAccountStatus(accountId, 'active');

            return { valid: true, message: '账号验证成功' };

        } catch (error) {
            // 更新账号状态为错误
            await this.updateAccountStatus(accountId, 'error');

            return { valid: false, message: error.message };
        }
    }

    /**
     * 清除账号索引数据
     */
    async clearAccountIndex(accountId) {
        try {
            const indexPath = path.join(__dirname, '../../data/index', `${accountId}.json`);

            try {
                await fs.unlink(indexPath);
                console.log(`✅ 清除账号索引: ${accountId}`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        } catch (error) {
            console.error('清除索引失败:', error);
        }
    }

    /**
     * 保存账号到本地文件
     */
    async saveAccounts() {
        try {
            const dir = path.dirname(this.storagePath);
            await fs.mkdir(dir, { recursive: true });

            const serializableData = {
                accounts: Array.from(this.accounts.entries()),
                currentAccountId: this.currentAccountId,
                version: 1
            };

            await fs.writeFile(
                this.storagePath,
                JSON.stringify(serializableData, null, 2),
                'utf-8'
            );

        } catch (error) {
            // 🔒 安全错误处理: 不暴露内部错误详情
            console.error('保存账号失败:', error.message);
            // 记录详细错误到调试日志
            if (process.env.LOG_LEVEL === 'debug') {
                console.error('详细错误信息:', error);
            }
            throw new Error('账号保存失败，请检查配置和权限');
        }
    }

    /**
     * 从本地文件加载账号
     */
    async loadAccounts() {
        try {
            const data = await fs.readFile(this.storagePath, 'utf-8');
            const loadedData = JSON.parse(data);

            // 验证版本
            if (loadedData.version !== 1) {
                throw new Error('账号数据版本不匹配');
            }

            // 恢复账号数据
            this.accounts = new Map(loadedData.accounts);
            this.currentAccountId = loadedData.currentAccountId;

            // 🔒 安全日志: 不暴露账号数量
            if (process.env.LOG_LEVEL === 'debug') {
                console.log(`✅ 加载 ${this.accounts.size} 个机器人账号`);
            } else {
                console.log('✅ 账号数据加载成功');
            }
            return true;

        } catch (error) {
            // 🔒 安全错误处理: 不暴露内部错误详情
            if (error.code === 'ENOENT') {
                console.log('📝 未找到本地账号数据');
            } else {
                console.error('加载账号失败:', error.message);
                // 记录详细错误到调试日志
                if (process.env.LOG_LEVEL === 'debug') {
                    console.error('详细错误信息:', error);
                }
            }
            return false;
        }
    }

    /**
     * 获取账号统计信息
     */
    getStats() {
        const stats = {
            totalAccounts: this.accounts.size,
            activeAccounts: 0,
            errorAccounts: 0,
            pendingAccounts: 0,
            currentAccountId: this.currentAccountId
        };

        for (const account of this.accounts.values()) {
            switch (account.status) {
                case 'active':
                    stats.activeAccounts++;
                    break;
                case 'error':
                    stats.errorAccounts++;
                    break;
                case 'pending':
                    stats.pendingAccounts++;
                    break;
            }
        }

        return stats;
    }

    /**
     * 导出账号数据（用于备份）
     */
    exportAccounts() {
        const data = {
            accounts: [],
            exportTime: new Date().toISOString(),
            version: 1
        };

        for (const [id, account] of this.accounts) {
            data.accounts.push({
                id: account.id,
                name: account.name,
                appId: account.appId,
                isDefault: account.isDefault,
                status: account.status,
                createdAt: account.createdAt
            });
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * 清空所有账号（谨慎使用）
     */
    async clearAllAccounts() {
        this.accounts.clear();
        this.currentAccountId = null;
        await this.saveAccounts();
        console.log('⚠️ 已清空所有机器人账号');
    }
}

module.exports = BotAccountManager;
