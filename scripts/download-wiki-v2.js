#!/usr/bin/env node

/**
 * 飞书知识库下载工具（使用 FeishuBot 类）
 */

const fs = require('fs').promises;
const path = require('path');

// 导入类
const FeishuBot = require('../src/bot/FeishuBot');
const BotAccountManager = require('../src/core/BotAccountManager');

// 知识库配置
const WIKI_SPACE_ID = '7604792184608410814';
const WIKI_ROOT_TOKEN = 'XbCGwDRfyipsCXkfjC9csGctnZe';

class WikiDownloader {
    constructor(outputDir) {
        this.outputDir = outputDir;
        this.bot = null;
        this.accountManager = null;
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            failedList: []
        };
    }

    async initialize() {
        console.log('🚀 初始化飞书机器人...');

        // 加载账号管理器
        this.accountManager = new BotAccountManager();
        await this.accountManager.loadAccounts();

        // 获取当前账号
        const currentAccount = this.accountManager.getCurrentAccount();

        if (!currentAccount) {
            throw new Error('未找到当前机器人账号');
        }

        console.log(`   使用账号: ${currentAccount.name}`);

        // 创建机器人实例
        this.bot = new FeishuBot();
        this.bot.appId = currentAccount.appId;
        this.bot.appSecret = currentAccount.appSecret;

        // 初始化
        await this.bot.initialize();

        console.log('✅ 机器人初始化完成\n');
    }

    async getWikiNodes(spaceId, parentNodeToken = '') {
        const params = { page_size: 50 };
        if (parentNodeToken) {
            params.parent_node_token = parentNodeToken;
        }

        return await this.bot.apiRequest('GET', `/wiki/v2/spaces/${spaceId}/nodes`, null, params);
    }

    async getWikiNode(spaceId, nodeToken) {
        return await this.bot.apiRequest('GET', `/wiki/v2/spaces/${spaceId}/nodes/${nodeToken}`);
    }

    async getDocumentContent(documentId) {
        // 步骤1: 获取文档基本信息（包含 block_id）
        const response = await this.bot.apiRequest('GET', `/docx/v1/documents/${documentId}/blocks/document`);

        if (!response.data || !response.data.document || !response.data.document.block_id) {
            throw new Error(`无法获取文档信息: ${documentId}`);
        }

        const blockId = response.data.document.block_id;

        // 步骤2: 获取文档的所有子块
        const blocksResponse = await this.bot.apiRequest(
            'GET',
            `/docx/v1/documents/${documentId}/blocks/${blockId}/children`
        );

        if (!blocksResponse.data || !blocksResponse.data.items) {
            return '';
        }

        // 步骤3: 提取文本内容
        let content = '';
        const blocks = blocksResponse.data.items;

        for (const block of blocks) {
            if (block.block_type === 1 && block.text_run) {
                const textElements = block.text_run.elements || [];
                for (const element of textElements) {
                    if (element.text_run && element.text_run.content) {
                        content += element.text_run.content + '\n';
                    }
                }
            } else if (block.block_type === 2) {
                // 标题
                if (block.heading1 && block.heading1.elements) {
                    for (const element of block.heading1.elements) {
                        if (element.text_run && element.text_run.content) {
                            content += `# ${element.text_run.content}\n`;
                        }
                    }
                }
            } else if (block.block_type === 3) {
                // 列表
                if (block.bullet && block.bullet.elements) {
                    for (const element of block.bullet.elements) {
                        if (element.text_run && element.text_run.content) {
                            content += `• ${element.text_run.content}\n`;
                        }
                    }
                }
            }
        }

        return content;
    }

    async saveFile(content, filePath, metadata = null) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        if (metadata) {
            const metaText = '\n\n---\n元数据:\n';
            for (const [key, value] of Object.entries(metadata)) {
                metaText += `- ${key}: ${value}\n`;
            }
            content = content + metaText;
        }

        await fs.writeFile(filePath, content, 'utf-8');
    }

    async downloadDocument(docToken, title, relativePath = '') {
        this.stats.total++;

        const filename = `${title}.md`;
        const filePath = path.join(this.outputDir, relativePath, filename);

        // 跳过已存在的文件
        try {
            await fs.access(filePath);
            console.log(`  [跳过] ${filename}`);
            this.stats.skipped++;
            return;
        } catch {
            // 文件不存在，继续下载
        }

        console.log(`  [下载] ${filename}`);

        try {
            const content = await this.getDocumentContent(docToken);

            const metadata = {
                '文档token': docToken,
                '标题': title,
                '下载时间': new Date().toISOString()
            };

            await this.saveFile(content, filePath, metadata);
            console.log(`  ✓`);
            this.stats.success++;
        } catch (error) {
            console.log(`  ✗ ${error.message}`);
            this.stats.failed++;
            this.stats.failedList.push({ filename, error: error.message });
        }
    }

    async downloadWikiRecursive(spaceId, nodeToken = '', relativePath = '') {
        console.log(`\n📁 处理节点: ${relativePath || '/'}`);

        try {
            const response = await this.getWikiNodes(spaceId, nodeToken);

            const nodes = response.data.items || [];

            if (nodes.length === 0) {
                console.log('  ℹ 此节点没有子节点');
                return;
            }

            for (const node of nodes) {
                const nodeType = node.obj_type;
                const nodeTitle = node.title || '未命名';
                const nodeToken = node.node_token;
                const objToken = node.obj_token;
                const hasChild = node.has_child;

                const newRelativePath = relativePath
                    ? path.join(relativePath, nodeTitle)
                    : nodeTitle;

                if (nodeType === 'docx' || nodeType === 'doc') {
                    // 文档
                    if (objToken) {
                        await this.downloadDocument(objToken, nodeTitle, path.dirname(newRelativePath) || '');
                    }
                }

                // 递归处理子节点
                if (hasChild && nodeToken) {
                    await this.downloadWikiRecursive(spaceId, nodeToken, newRelativePath);
                }
            }
        } catch (error) {
            console.log(`  ✗ 错误: ${error.message}`);
        }
    }

    printStats() {
        console.log('\n' + '='*60);
        console.log('下载完成！');
        console.log('='*60);
        console.log(`总计: ${this.stats.total} 个`);
        console.log(`成功: ${this.stats.success} 个 ✓`);
        console.log(`失败: ${this.stats.failed} 个 ✗`);
        console.log(`跳过: ${this.stats.skipped} 个 ⊝`);
        console.log('='*60);

        if (this.stats.failedList.length > 0) {
            console.log('\n失败的文档:');
            for (const { filename, error } of this.stats.failedList) {
                console.log(`  - ${filename}: ${error}`);
            }
        }
    }

    async download() {
        console.log('='*60);
        console.log('飞书知识库下载工具');
        console.log('='*60);
        console.log(`知识库ID: ${WIKI_SPACE_ID}`);
        console.log(`保存目录: ${this.outputDir}`);
        console.log('='*60);

        // 初始化
        await this.initialize();

        // 开始下载
        console.log('开始下载...\n');
        await this.downloadWikiRecursive(WIKI_SPACE_ID);

        // 打印统计
        this.printStats();
    }
}

// 主函数
async function main() {
    const outputDir = process.argv[2] || './download';

    const downloader = new WikiDownloader(outputDir);
    await downloader.download();
}

if (require.main === module) {
    main().catch(console.error);
}
