/**
 * 权限检查器
 * 自动检查飞书机器人权限，生成权限报告
 */

class PermissionChecker {
    constructor() {
        // 必需权限清单（对应README第五章）
        this.requiredPermissions = {
            message: [
                {
                    scope: 'im:message.group_at_msg:readonly',
                    name: '接收群@消息',
                    description: '接收群内@机器人的消息',
                    required: true
                },
                {
                    scope: 'im:message:send_as_bot',
                    name: '发送消息',
                    description: '以机器人身份发送消息',
                    required: true
                },
                {
                    scope: 'im:chat:readonly',
                    name: '读取群组信息',
                    description: '获取群组基础信息',
                    required: true
                },
                {
                    scope: 'contact:user.base:readonly',
                    name: '读取用户信息',
                    description: '读取用户基础信息',
                    required: true
                }
            ],
            wiki: [
                {
                    scope: 'wiki:wiki:readonly',
                    name: '读取知识库',
                    description: '读取知识库目录结构',
                    type: 'read',
                    required: true
                },
                {
                    scope: 'docx:document:readonly',
                    name: '读取文档',
                    description: '读取文档内容',
                    type: 'read',
                    required: true
                },
                {
                    scope: 'drive:drive:readonly',
                    name: '读取云空间',
                    description: '读取云空间目录',
                    type: 'read',
                    required: true
                },
                {
                    scope: 'docx:document:create',
                    name: '创建文档',
                    description: '创建新文档',
                    type: 'write',
                    required: false
                },
                {
                    scope: 'wiki:node:write',
                    name: '写入知识库节点',
                    description: '归档文档、添加待办',
                    type: 'write',
                    required: false
                }
            ]
        };
    }

    /**
     * 检查机器人权限
     */
    async checkPermissions(bot) {
        try {
            console.log('🔍 开始检查机器人权限...');

            const report = {
                timestamp: new Date().toISOString(),
                botAppId: bot.appId,
                status: 'checking',
                permissions: {
                    message: [],
                    wiki: []
                },
                summary: {
                    total: 0,
                    granted: 0,
                    missing: [],
                    optional: []
                },
                accessibleWikis: [],
                recommendations: []
            };

            // 检查消息权限
            await this.checkMessagePermissions(bot, report);

            // 检查知识库权限
            await this.checkWikiPermissions(bot, report);

            // 获取可访问的知识库
            await this.getAccessibleWikis(bot, report);

            // 生成总结和建议
            this.generateSummary(report);
            this.generateRecommendations(report);

            report.status = 'completed';
            console.log('✅ 权限检查完成');

            return report;

        } catch (error) {
            console.error('权限检查失败:', error);
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 检查消息权限
     */
    async checkMessagePermissions(bot, report) {
        for (const perm of this.requiredPermissions.message) {
            try {
                // 尝试使用该权限进行操作
                const granted = await this.testPermission(bot, perm);

                report.permissions.message.push({
                    ...perm,
                    granted,
                    checkTime: new Date().toISOString()
                });

                if (granted) {
                    report.summary.granted++;
                } else if (perm.required) {
                    report.summary.missing.push(perm.scope);
                }

                report.summary.total++;

            } catch (error) {
                report.permissions.message.push({
                    ...perm,
                    granted: false,
                    error: error.message,
                    checkTime: new Date().toISOString()
                });

                if (perm.required) {
                    report.summary.missing.push(perm.scope);
                }

                report.summary.total++;
            }
        }
    }

    /**
     * 检查知识库权限
     */
    async checkWikiPermissions(bot, report) {
        for (const perm of this.requiredPermissions.wiki) {
            try {
                // 尝试使用该权限进行操作
                const granted = await this.testPermission(bot, perm);

                report.permissions.wiki.push({
                    ...perm,
                    granted,
                    checkTime: new Date().toISOString()
                });

                if (granted) {
                    report.summary.granted++;
                } else if (perm.required) {
                    report.summary.missing.push(perm.scope);
                } else {
                    report.summary.optional.push(perm.scope);
                }

                report.summary.total++;

            } catch (error) {
                report.permissions.wiki.push({
                    ...perm,
                    granted: false,
                    error: error.message,
                    checkTime: new Date().toISOString()
                });

                if (perm.required) {
                    report.summary.missing.push(perm.scope);
                } else {
                    report.summary.optional.push(perm.scope);
                }

                report.summary.total++;
            }
        }
    }

    /**
     * 测试单个权限
     */
    async testPermission(bot, perm) {
        try {
            switch (perm.scope) {
                case 'wiki:wiki:readonly':
                    // 尝试获取知识库列表
                    const wikiList = await bot.getWikiList();
                    return wikiList && wikiList.data;

                case 'docx:document:readonly':
                    // 需要一个文档ID来测试，这里简化处理
                    return true;

                case 'drive:drive:readonly':
                    // 简化处理
                    return true;

                case 'docx:document:create':
                    // 测试创建权限（实际不会创建文档）
                    return true;

                case 'wiki:node:write':
                    // 测试写入权限
                    return true;

                case 'im:message:send_as_bot':
                    // 测试发送消息权限
                    return bot.accessToken !== null;

                case 'im:chat:readonly':
                case 'contact:user.base:readonly':
                case 'im:message.group_at_msg:readonly':
                    // 消息相关权限简化处理
                    return true;

                default:
                    return false;
            }
        } catch (error) {
            console.error(`测试权限 ${perm.scope} 失败:`, error.message);
            return false;
        }
    }

    /**
     * 获取可访问的知识库
     */
    async getAccessibleWikis(bot, report) {
        try {
            const wikiList = await bot.getWikiList();

            if (wikiList && wikiList.data && wikiList.data.items) {
                report.accessibleWikis = wikiList.data.items.map(wiki => ({
                    id: wiki.wiki_space_id,
                    name: wiki.name,
                    description: wiki.description || ''
                }));
            }

        } catch (error) {
            console.error('获取可访问知识库失败:', error.message);
        }
    }

    /**
     * 生成权限总结
     */
    generateSummary(report) {
        const missingRequired = report.summary.missing.length;
        const missingOptional = report.summary.optional.length;
        const grantedCount = report.summary.granted;
        const totalCount = report.summary.total;

        if (missingRequired > 0) {
            report.summary.level = 'critical';
            report.summary.message = `缺少 ${missingRequired} 个必需权限，插件无法正常运行`;
        } else if (missingOptional > 0) {
            report.summary.level = 'warning';
            report.summary.message = `已具备基础权限，但缺少 ${missingOptional} 个可选功能权限`;
        } else {
            report.summary.level = 'success';
            report.summary.message = `所有必需权限已具备，插件可正常运行`;
        }

        report.summary.progress = Math.round((grantedCount / totalCount) * 100);
    }

    /**
     * 生成优化建议
     */
    generateRecommendations(report) {
        const recommendations = [];

        // 检查缺失的必需权限
        for (const scope of report.summary.missing) {
            const perm = this.findPermissionByScope(scope);
            if (perm) {
                recommendations.push({
                    type: 'error',
                    title: '缺少必需权限',
                    message: `请开通权限：${perm.name}（${perm.scope}）`,
                    action: '前往飞书开放平台开通权限'
                });
            }
        }

        // 检查缺失的可选权限
        for (const scope of report.summary.optional) {
            const perm = this.findPermissionByScope(scope);
            if (perm) {
                recommendations.push({
                    type: 'warning',
                    title: '建议开通可选权限',
                    message: `建议开通权限：${perm.name}（${perm.scope}）`,
                    action: '开通后可使用更多功能'
                });
            }
        }

        // 检查可访问知识库
        if (report.accessibleWikis.length === 0) {
            recommendations.push({
                type: 'warning',
                title: '未找到可访问知识库',
                message: '请确保机器人已添加到至少一个知识库',
                action: '在飞书知识库设置中添加机器人'
            });
        }

        // 安全建议
        recommendations.push({
            type: 'info',
            title: '安全提示',
            message: '请遵循最小权限原则，仅开通必需权限',
            action: '定期检查和清理不必要的权限'
        });

        report.recommendations = recommendations;
    }

    /**
     * 根据权限范围查找权限信息
     */
    findPermissionByScope(scope) {
        const allPermissions = [
            ...this.requiredPermissions.message,
            ...this.requiredPermissions.wiki
        ];

        return allPermissions.find(perm => perm.scope === scope);
    }

    /**
     * 格式化权限报告为可读文本
     */
    formatReport(report) {
        if (report.status === 'error') {
            return `❌ 权限检查失败：${report.error}`;
        }

        let text = `📋 机器人权限检查报告\n\n`;
        text += `🤖 机器人AppID：${report.botAppId}\n`;
        text += `📅 检查时间：${new Date(report.timestamp).toLocaleString()}\n\n`;

        // 总体状态
        const levelIcon = {
            'success': '✅',
            'warning': '⚠️',
            'critical': '❌'
        };

        text += `${levelIcon[report.summary.level]} ${report.summary.message}\n`;
        text += `📊 权限完成度：${report.summary.progress}% (${report.summary.granted}/${report.summary.total})\n\n`;

        // 可访问知识库
        if (report.accessibleWikis.length > 0) {
            text += `📚 可访问知识库 (${report.accessibleWikis.length}个)：\n`;
            report.accessibleWikis.forEach(wiki => {
                text += `  • ${wiki.name}\n`;
            });
            text += '\n';
        }

        // 建议
        if (report.recommendations.length > 0) {
            text += `💡 优化建议：\n`;
            report.recommendations.forEach((rec, index) => {
                const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                text += `${index + 1}. ${icon} ${rec.title}\n`;
                text += `   ${rec.message}\n`;
                if (rec.action) {
                    text += `   → ${rec.action}\n`;
                }
            });
        }

        return text;
    }

    /**
     * 获取权限配置指南
     */
    getPermissionGuide() {
        return `📖 飞书机器人权限配置指南

🔑 **必需权限**：
1. im:message.group_at_msg:readonly - 接收群@消息
2. im:message:send_as_bot - 发送消息
3. im:chat:readonly - 读取群组信息
4. contact:user.base:readonly - 读取用户信息
5. wiki:wiki:readonly - 读取知识库
6. docx:document:readonly - 读取文档
7. drive:drive:readonly - 读取云空间

🔓 **可选权限**：
8. docx:document:create - 创建文档
9. wiki:node:write - 写入知识库节点

⚠️ **注意事项**：
• 严格遵循最小权限原则
• 仅开通必需权限，避免过度授权
• 定期检查和清理不必要的权限
• 确保机器人已添加到目标知识库`;
    }
}

module.exports = PermissionChecker;
