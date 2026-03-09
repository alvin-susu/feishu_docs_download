#!/usr/bin/env node

/**
 * 为已有文档添加协作者
 * 用法: node scripts/add-collaborator.js <documentId> <userId> [perm]
 * 示例: node scripts/add-collaborator.js UDwOdULGkoRSBlxRDmKcEoaQnNh ou_xxx write
 */

const FeishuBot = require('../src/bot/FeishuBot');
require('dotenv').config();

async function addCollaborator() {
    const args = process.argv.slice(2);
    const documentId = args[0];
    const userId = args[1];
    const perm = args[2] || 'write'; // read, write, comment, full

    if (!documentId || !userId) {
        console.log('用法: node scripts/add-collaborator.js <documentId> <userId> [perm]');
        console.log('示例: node scripts/add-collaborator.js UDwOdULGkoRSBlxRDmKcEoaQnNh ou_xxx write');
        console.log('');
        console.log('perm 可选值: read, write, comment, full (默认: write)');
        process.exit(1);
    }

    console.log('🔧 为已有文档添加协作者\n');
    console.log(`文档ID: ${documentId}`);
    console.log(`用户ID: ${userId}`);
    console.log(`权限: ${perm}\n`);

    const bot = new FeishuBot();

    try {
        // 初始化机器人
        await bot.initialize();
        console.log('✅ 机器人初始化成功\n');

        // 尝试多种API方案添加协作者
        console.log('📝 尝试添加协作者...\n');

        let success = false;

        // 方案1: /shares 接口
        console.log('方案1: POST /docx/v1/documents/{id}/shares');
        try {
            const result1 = await bot.apiRequest('POST', `/docx/v1/documents/${documentId}/shares`, {
                share_type: 'user',
                share_id: userId,
                perm: perm,
                notify: false
            });
            console.log('  ✅ 成功!\n');
            console.log('  返回:', JSON.stringify(result1, null, 2));
            success = true;
        } catch (error) {
            console.log('  ❌ 失败:', error.message);
        }

        // 方案2: /permissions 接口
        if (!success) {
            console.log('\n方案2: POST /docx/v1/documents/{id}/permissions');
            try {
                const result2 = await bot.apiRequest('POST', `/docx/v1/documents/${documentId}/permissions`, {
                    member_type: 'user',
                    member_id: userId,
                    type: perm === 'write' ? 'edit' : perm
                });
                console.log('  ✅ 成功!\n');
                console.log('  返回:', JSON.stringify(result2, null, 2));
                success = true;
            } catch (error) {
                console.log('  ❌ 失败:', error.message);
            }
        }

        // 方案3: /shares/batch_create 接口
        if (!success) {
            console.log('\n方案3: POST /docx/v1/documents/{id}/shares/batch_create');
            try {
                const result3 = await bot.apiRequest('POST', `/docx/v1/documents/${documentId}/shares/batch_create`, {
                    shares: [{
                        share_type: 'user',
                        share_id: userId,
                        perm: perm
                    }]
                });
                console.log('  ✅ 成功!\n');
                console.log('  返回:', JSON.stringify(result3, null, 2));
                success = true;
            } catch (error) {
                console.log('  ❌ 失败:', error.message);
            }
        }

        if (success) {
            console.log('\n✅ 协作者添加成功!');
            console.log(`文档链接: https://zhipu-ai.feishu.cn/docx/${documentId}`);
        } else {
            console.log('\n❌ 所有方案都失败了');
            console.log('请检查:');
            console.log('  1. 飞书应用是否有 docx:document:permission 权限');
            console.log('  2. 用户ID格式是否正确 (应为 ou_xxx 格式)');
            console.log('  3. 权限是否已发布');
        }

    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        process.exit(1);
    }
}

addCollaborator();
