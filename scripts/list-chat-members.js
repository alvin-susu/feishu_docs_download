#!/usr/bin/env node

/**
 * 获取群聊成员列表
 * 用法: node scripts/list-chat-members.js <chatId>
 * 示例: node scripts/list-chat-members.js oc_xxx
 */

const FeishuBot = require('../src/bot/FeishuBot');
require('dotenv').config();

async function listChatMembers() {
    const chatId = process.argv[2];

    if (!chatId) {
        console.log('用法: node scripts/list-chat-members.js <chatId>');
        console.log('示例: node scripts/list-chat-members.js oc_xxx');
        console.log('');
        console.log('提示: chatId 可以从消息中获取，或者在飞书群设置中查看');
        process.exit(1);
    }

    console.log('🔍 获取群聊成员列表\n');
    console.log(`群聊ID: ${chatId}\n`);

    const bot = new FeishuBot();

    try {
        await bot.initialize();
        console.log('✅ 机器人初始化成功\n');

        // 获取群成员
        console.log('📋 正在获取群成员...\n');
        const userIds = await bot.getConversationMembers('group', chatId);

        if (userIds.length === 0) {
            console.log('⚠️ 未获取到群成员');
            console.log('可能原因:');
            console.log('  1. 机器人不在该群聊中');
            console.log('  2. 缺少 contact:group:readonly 权限');
            console.log('  3. chatId 格式不正确');
            return;
        }

        console.log(`获取到 ${userIds.length} 个成员:\n`);
        userIds.forEach((userId, index) => {
            console.log(`  ${index + 1}. ${userId}`);
        });

        console.log('\n💡 使用这些ID添加协作者:');
        console.log(`   node scripts/add-collaborator.js <文档ID> <用户ID> write`);

    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        process.exit(1);
    }
}

listChatMembers();
