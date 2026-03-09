#!/usr/bin/env node

/**
 * 测试飞书文档权限设置API
 * 用于调试协作者权限添加功能
 */

const FeishuBot = require('../src/bot/FeishuBot');
require('dotenv').config();

async function testDocumentPermission() {
    console.log('🧪 测试飞书文档权限设置\n');

    const bot = new FeishuBot();

    try {
        // 初始化机器人
        await bot.initialize();
        console.log('✅ 机器人初始化成功\n');

        // 测试文档ID（用户提供的）
        const documentId = 'UDwOdULGkoRSBlxRDmKcEoaQnNh';

        console.log(`📄 测试文档ID: ${documentId}`);
        console.log(`文档链接: https://zhipu-ai.feishu.cn/docx/${documentId}\n`);

        // 测试获取文档信息
        console.log('📖 尝试获取文档信息...');
        try {
            const docInfo = await bot.apiRequest('GET', `/docx/v1/documents/${documentId}`);
            console.log('✅ 文档信息获取成功');
            console.log(`文档标题: ${docInfo.data?.document?.title || docInfo.title || '未知'}`);
            console.log(`文档链接: https://zhipu-ai.feishu.cn/docx/${documentId}\n`);
        } catch (error) {
            console.log('❌ 获取文档信息失败:', error.message);
            console.log('可能原因: 文档不存在或无权限访问\n');
        }

        // 测试获取当前权限
        console.log('🔐 尝试获取当前文档权限...');
        try {
            const permissions = await bot.apiRequest('GET', `/docx/v1/documents/${documentId}/permissions`);
            console.log('✅ 当前权限获取成功');
            console.log(`权限数量: ${permissions.data?.items?.length || 0}`);

            if (permissions.data?.items && permissions.data.items.length > 0) {
                console.log('\n当前协作者列表:');
                permissions.data.items.forEach((perm, index) => {
                    console.log(`  ${index + 1}. 用户: ${perm.user_id || perm.member_id || perm.open_id || '未知'}`);
                    console.log(`     权限类型: ${perm.type || perm.role || '未知'}`);
                });
            } else {
                console.log('  暂无协作者');
            }
            console.log('');
        } catch (error) {
            console.log('⚠️ 获取权限失败:', error.message);
        }

        // 测试添加协作者
        console.log('🧪 测试添加协作者...\n');

        // 使用测试用户ID（实际使用时应从群成员获取）
        const testUserIds = ['test_user_123', 'ou_test123'];

        for (const userId of testUserIds) {
            console.log(`\n尝试添加用户: ${userId}`);

            // 方案1: /shares 接口
            console.log('  方案1: POST /docx/v1/documents/{id}/shares');
            try {
                const result1 = await bot.apiRequest('POST', `/docx/v1/documents/${documentId}/shares`, {
                    share_type: 'user',
                    share_id: userId,
                    perm: 'write',
                    notify: false
                });
                console.log('  ✅ 方案1 成功');
                console.log('     返回:', JSON.stringify(result1, null, 2));
            } catch (error) {
                console.log('  ❌ 方案1 失败:', error.message);
            }

            // 方案2: /permissions 接口
            console.log('  方案2: POST /docx/v1/documents/{id}/permissions');
            try {
                const result2 = await bot.apiRequest('POST', `/docx/v1/documents/${documentId}/permissions`, {
                    member_type: 'user',
                    member_id: userId,
                    type: 'edit'
                });
                console.log('  ✅ 方案2 成功');
                console.log('     返回:', JSON.stringify(result2, null, 2));
            } catch (error) {
                console.log('  ❌ 方案2 失败:', error.message);
            }
        }

        // 测试获取群成员（如果有群ID）
        console.log('\n📋 检查需要配置的飞书权限:');
        console.log('  - docx:document:permission - 管理文档权限');
        console.log('  - docx:permission:member:update - 更新协作者权限');
        console.log('  - contact:user.base:readonly - 读取用户信息');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

// 运行测试
if (require.main === module) {
    testDocumentPermission()
        .then(() => {
            console.log('\n✅ 测试完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ 测试失败:', error);
            process.exit(1);
        });
}

module.exports = testDocumentPermission;
