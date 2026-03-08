#!/usr/bin/env node

/**
 * 飞书机器人账号管理 CLI 工具
 * 用于添加、删除、切换、列出多个飞书机器人账号
 */

const readline = require('readline');
const BotAccountManager = require('../src/core/BotAccountManager');

class AccountCLI {
    constructor() {
        this.accountManager = new BotAccountManager();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * 执行命令
     */
    async execute(command, args) {
        try {
            // 初始化账号管理器
            await this.accountManager.loadAccounts();

            switch (command) {
                case 'add':
                    await this.addAccount();
                    break;
                case 'list':
                case 'ls':
                    this.listAccounts();
                    break;
                case 'switch':
                    await this.switchAccount(args[0]);
                    break;
                case 'delete':
                case 'rm':
                    await this.deleteAccount(args[0]);
                    break;
                case 'current':
                    this.showCurrent();
                    break;
                case 'validate':
                    await this.validateAccount(args[0]);
                    break;
                default:
                    this.showHelp();
            }
        } catch (error) {
            console.error(`❌ 错误: ${error.message}`);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    /**
     * 添加账号
     */
    async addAccount() {
        console.log('\n🤖 添加飞书机器人账号\n');

        const name = await this.question('请输入机器人备注 (如: 行政知识库, 最多10字符): ');
        if (!name || name.length > 10) {
            console.log('❌ 备注长度必须在1-10个字符之间');
            return;
        }

        const appId = await this.question('请输入飞书机器人 AppID: ');
        if (!appId) {
            console.log('❌ AppID不能为空');
            return;
        }

        const appSecret = await this.question('请输入飞书机器人 AppSecret: ', true);
        if (!appSecret) {
            console.log('❌ AppSecret不能为空');
            return;
        }

        try {
            const account = await this.accountManager.addAccount({
                name: name.trim(),
                appId: appId.trim(),
                appSecret: appSecret.trim()
            });

            console.log(`\n✅ 成功添加机器人: ${account.name}`);
            console.log(`   AppID: ${account.appId}`);
            console.log(`   账号ID: ${account.id}`);

            // 如果是第一个账号，自动设为当前账号
            const current = this.accountManager.getCurrentAccount();
            if (current && current.id === account.id) {
                console.log('   🔸 已自动设为当前账号');
            }
        } catch (error) {
            console.log(`\n❌ 添加失败: ${error.message}`);
        }
    }

    /**
     * 列出所有账号
     */
    listAccounts() {
        const accounts = this.accountManager.getAllAccounts();
        const current = this.accountManager.getCurrentAccount();

        if (accounts.length === 0) {
            console.log('\n📭 暂无机器人账号');
            console.log('   使用 "node scripts/account-cli.js add" 添加账号\n');
            return;
        }

        console.log('\n🤖 已绑定机器人列表\n');
        accounts.forEach((account, index) => {
            const isCurrent = current && current.id === account.id;
            const icon = isCurrent ? '🔸' : ' ';
            const status = this.getStatusIcon(account.status);

            console.log(`${icon} [${index + 1}] ${account.name}`);
            console.log(`      AppID: ${account.appId}`);
            console.log(`      状态: ${status} ${this.getStatusText(account.status)}`);
            console.log(`      ID: ${account.id}`);
            if (account.lastSync) {
                console.log(`      最后同步: ${new Date(account.lastSync).toLocaleString()}`);
            }
            console.log();
        });
    }

    /**
     * 切换当前账号
     */
    async switchAccount(accountId) {
        if (!accountId) {
            console.log('❌ 请指定要切换的账号ID');
            console.log('   使用 "node scripts/account-cli.js list" 查看所有账号');
            return;
        }

        try {
            await this.accountManager.switchAccount(accountId);
            const account = this.accountManager.getAccount(accountId);
            console.log(`\n✅ 已切换到机器人: ${account.name}`);
        } catch (error) {
            console.log(`\n❌ 切换失败: ${error.message}`);
        }
    }

    /**
     * 删除账号
     */
    async deleteAccount(accountId) {
        if (!accountId) {
            console.log('❌ 请指定要删除的账号ID');
            console.log('   使用 "node scripts/account-cli.js list" 查看所有账号');
            return;
        }

        const account = this.accountManager.getAccount(accountId);
        if (!account) {
            console.log(`\n❌ 未找到账号: ${accountId}`);
            return;
        }

        const confirm = await this.question(
            `确认删除机器人 "${account.name}"？此操作不可恢复 (yes/no): `
        );

        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ 已取消删除');
            return;
        }

        try {
            await this.accountManager.removeAccount(accountId);
            console.log(`\n✅ 已删除机器人: ${account.name}`);
        } catch (error) {
            console.log(`\n❌ 删除失败: ${error.message}`);
        }
    }

    /**
     * 显示当前账号
     */
    showCurrent() {
        const current = this.accountManager.getCurrentAccount();

        if (!current) {
            console.log('\n📭 当前未设置机器人账号');
            console.log('   使用 "node scripts/account-cli.js add" 添加账号\n');
            return;
        }

        console.log('\n🔸 当前机器人账号\n');
        console.log(`名称: ${current.name}`);
        console.log(`AppID: ${current.appId}`);
        console.log(`状态: ${this.getStatusText(current.status)}`);
        console.log(`ID: ${current.id}`);
        if (current.lastSync) {
            console.log(`最后同步: ${new Date(current.lastSync).toLocaleString()}`);
        }
        console.log();
    }

    /**
     * 验证账号
     */
    async validateAccount(accountId) {
        if (!accountId) {
            const current = this.accountManager.getCurrentAccount();
            if (!current) {
                console.log('❌ 当前未设置机器人账号');
                return;
            }
            accountId = current.id;
        }

        const account = this.accountManager.getAccount(accountId);
        if (!account) {
            console.log(`\n❌ 未找到账号: ${accountId}`);
            return;
        }

        console.log(`\n🔍 正在验证机器人: ${account.name}...`);
        console.log('   请稍候...\n');

        try {
            const FeishuBot = require('../src/bot/FeishuBot');
            const bot = new FeishuBot();
            bot.appId = account.appId;
            bot.appSecret = account.appSecret;
            await bot.initialize();

            // 测试API调用
            await bot.apiRequest('GET', '/auth/v3/tenantAccessToken');

            console.log('✅ 验证成功！机器人权限正常\n');
        } catch (error) {
            console.log(`❌ 验证失败: ${error.message}\n`);
        }
    }

    /**
     * 显示帮助
     */
    showHelp() {
        console.log(`
飞书机器人账号管理工具

用法:
  node scripts/account-cli.js <command> [args]

命令:
  add              添加新的机器人账号
  list, ls         列出所有机器人账号
  current          显示当前使用的机器人
  switch <id>      切换到指定机器人
  delete <id>      删除指定机器人
  validate [id]    验证机器人权限 (默认验证当前账号)

示例:
  # 添加机器人
  node scripts/account-cli.js add

  # 查看所有机器人
  node scripts/account-cli.js list

  # 切换机器人
  node scripts/account-cli.js switch bot_xxx

  # 删除机器人
  node scripts/account-cli.js delete bot_xxx

  # 验证当前机器人
  node scripts/account-cli.js validate

配置文件:
  ~/WebstormProjects/feishu_docs_download/data/accounts.json
  (所有账号信息加密存储)

环境变量:
  ENCRYPTION_KEY  加密密钥 (必需，至少32字符)
`);
    }

    /**
     * 提问
     */
    question(prompt, hidden = false) {
        return new Promise((resolve) => {
            if (hidden) {
                // 隐藏输入（用于密码）
                const stdin = process.stdin;
                const stdout = process.stdout;
                stdin.setRawMode(true);
                stdout.write(prompt);

                let password = '';
                stdin.on('data', (char) => {
                    if (char === '\n' || char === '\r' || char === '\u0004') {
                        stdin.setRawMode(false);
                        stdout.write('\n');
                        resolve(password);
                    } else if (char === '\u0003') {
                        // Ctrl+C
                        process.exit(1);
                    } else if (char === '\u007f') {
                        // Backspace
                        if (password.length > 0) {
                            password = password.slice(0, -1);
                            stdout.write('\b \b');
                        }
                    } else {
                        password += char;
                        stdout.write('*');
                    }
                });
            } else {
                this.rl.question(prompt, (answer) => {
                    resolve(answer);
                });
            }
        });
    }

    /**
     * 获取状态图标
     */
    getStatusIcon(status) {
        const icons = {
            'active': '✅',
            'pending': '⏳',
            'error': '❌'
        };
        return icons[status] || '❓';
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const texts = {
            'active': '已激活',
            'pending': '待校验',
            'error': '异常'
        };
        return texts[status] || status;
    }
}

// 主函数
async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    const cli = new AccountCLI();

    if (!command) {
        cli.showHelp();
        process.exit(0);
    }

    await cli.execute(command, args);
    process.exit(0);
}

// 运行
if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ 发生错误:', error.message);
        process.exit(1);
    });
}

module.exports = AccountCLI;
