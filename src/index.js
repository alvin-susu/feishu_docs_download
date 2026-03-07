/**
 * 飞书知识库智能助手主程序
 * OpenClaw插件 - 飞书机器人联动
 */

require('dotenv').config();
const FeishuBot = require('./bot/FeishuBot');
const WikiIndexer = require('./core/WikiIndexer');
const DocumentService = require('./services/DocumentService');
const MessageHandler = require('./handlers/MessageHandler');

class FeishuWikiAssistant {
    constructor() {
        this.bot = new FeishuBot();
        this.indexer = new WikiIndexer();
        this.documentService = new DocumentService();
        this.messageHandler = new MessageHandler(this);

        this.isInitialized = false;
    }

    /**
     * 初始化插件
     */
    async initialize() {
        try {
            console.log('🚀 飞书知识库智能助手启动中...');

            // 初始化飞书机器人
            await this.bot.initialize();

            // 构建知识库索引
            await this.indexer.buildIndex();

            // 注册消息处理器
            this.bot.on('message', (message) => this.handleMessage(message));

            // 启动机器人
            await this.bot.start();

            this.isInitialized = true;
            console.log('✅ 插件启动完成，等待消息...');

        } catch (error) {
            console.error('❌ 插件启动失败:', error.message);
            throw error;
        }
    }

    /**
     * 处理接收到的消息
     */
    async handleMessage(message) {
        try {
            if (!this.isInitialized) {
                await this.sendMessage(message.chat_id, '系统正在初始化，请稍后再试');
                return;
            }

            console.log(`📨 收到消息: ${message.content}`);

            // 委托给消息处理器
            const response = await this.messageHandler.process(message);

            if (response) {
                await this.sendMessage(message.chat_id, response);
            }

        } catch (error) {
            console.error('处理消息错误:', error);
            await this.sendMessage(message.chat_id, '抱歉，处理您的请求时出现错误，请稍后重试。');
        }
    }

    /**
     * 发送消息
     */
    async sendMessage(chatId, content) {
        return await this.bot.sendMessage(chatId, content);
    }

    /**
     * 获取知识库索引
     */
    getIndex() {
        return this.indexer.getIndex();
    }

    /**
     * 关闭插件
     */
    async shutdown() {
        console.log('🛑 正在关闭插件...');
        await this.bot.stop();
        await this.indexer.saveIndex();
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
    assistant.initialize().catch(error => {
        console.error('启动失败:', error);
        process.exit(1);
    });
}
