#!/usr/bin/env node

/**
 * 飞书知识库批量下载工具（使用修复的API调用）
 * 基于"逐个读取"的策略，避免直接调用飞书API的400错误
 */

const fs = require('fs').promises;
const path = require('path');
const FeishuBot = require('../src/bot/FeishuBot');
const BotAccountManager = require('../src/core/BotAccountManager');

// CT-公交项目知识库配置
const WIKI_SPACE_ID = '7604792184608410814';

class SmartBatchDownloader {
    constructor(outputDir) {
        this.outputDir = outputDir;
        this.bot = null;
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            failedList: []
        };
        this.docList = [];
    }

    async initialize() {
        console.log('🚀 初始化飞书机器人...');
        this.accountManager = new BotAccountManager();
        await this.accountManager.loadAccounts();
        const currentAccount = this.accountManager.getCurrentAccount();

        if (!currentAccount) {
            throw new Error('未找到当前机器人账号');
        }

        console.log(`   使用账号: ${currentAccount.name}`);
        this.bot = new FeishuBot();
        this.bot.appId = currentAccount.appId;
        this.bot.appSecret = currentAccount.appSecret;
        await this.bot.initialize();
        console.log('✅ 机器人初始化完成\n');
    }

    // 先遍历整个知识库，收集所有文档
    async collectAllDocuments() {
        console.log('🔍 开始遍历知识库，收集所有文档...\n');
        await this.traverseWiki(WIKI_SPACE_ID, '');
        console.log(`\n✅ 共发现 ${this.docList.length} 个文档`);
        return this.docList;
    }

    async traverseWiki(spaceId, nodeToken = '', relativePath = '') {
        try {
            const params = { page_size: 50 };
            if (nodeToken) {
                params.parent_node_token = nodeToken;
            }

            const response = await this.bot.apiRequest('GET', `/wiki/v2/spaces/${spaceId}/nodes`, null, params);

            if (!response.data || !response.data.items) {
                return;
            }

            const nodes = response.data.items;
            for (const node of nodes) {
                const nodeType = node.obj_type;
                const nodeTitle = node.title || '未命名';
                const newNodeToken = node.node_token;
                const objToken = node.obj_token;
                const hasChild = node.has_child;
                const newRelativePath = relativePath ? path.join(relativePath, nodeTitle) : nodeTitle;

                if (nodeType === 'docx' || nodeType === 'doc') {
                    // 收集文档信息 - 使用 node_token 而不是 obj_token
                    if (newNodeToken) {
                        this.docList.push({
                            token: newNodeToken,
                            title: nodeTitle,
                            path: path.dirname(newRelativePath) || ''
                        });
                        console.log(`  📄 ${nodeTitle} (${newNodeToken.substring(0, 8)}...)`);
                    }
                }

                // 递归处理子节点
                if (hasChild && newNodeToken) {
                    await this.traverseWiki(spaceId, newNodeToken, newRelativePath);
                }
            }
        } catch (error) {
            console.log(`  ⚠️  节点处理失败: ${error.message}`);
        }
    }

    async downloadSingleDocument(docInfo) {
        const { token, title, path: docPath } = docInfo;
        this.stats.total++;

        const filename = `${title}.md`;
        const filePath = path.join(this.outputDir, docPath, filename);

        // 跳过已存在的文件
        try {
            await fs.access(filePath);
            console.log(`  [跳过] ${title}`);
            this.stats.skipped++;
            return;
        } catch {
            // 文件不存在，继续下载
        }

        process.stdout.write(`  [下载] ${title} (${this.stats.success + 1}/${this.docList.length}) ... `);

        try {
            const content = await this.getDocumentContent(token);

            const metadata = {
                '文档token': token,
                '标题': title,
                '下载时间': new Date().toISOString()
            };

            await this.saveFile(content, filePath, metadata);
            console.log('✓');
            this.stats.success++;
        } catch (error) {
            console.log(`✗ ${error.message}`);
            this.stats.failed++;
            this.stats.failedList.push({ title: title, error: error.message });
        }
    }

    async getDocumentContent(documentId) {
        // 使用修复后的API调用
        try {
            // 步骤1: 获取文档的所有块
            const blocksResponse = await this.bot.apiRequest('GET', `/docx/v1/documents/${documentId}/blocks`);

            if (!blocksResponse.data || !blocksResponse.data.items) {
                return '';
            }

            if (!blocksResponse.data || !blocksResponse.data.items) {
                return '';
            }

            // 步骤2: 提取文本内容
            let content = '';
            const blocks = blocksResponse.data.items;

            for (const block of blocks) {
                if (block.block_type === 1 && block.page && block.page.elements) {
                    // 文本块
                    for (const element of block.page.elements) {
                        if (element.text_run && element.text_run.content) {
                            content += element.text_run.content + '\n';
                        }
                    }
                } else if (block.block_type === 2 && block.text && block.text.elements) {
                    // 标题块
                    for (const element of block.text.elements) {
                        if (element.text_run && element.text_run.content) {
                            content += `# ${element.text_run.content}\n`;
                        }
                    }
                } else if (block.block_type === 51 && block.sub_page_list) {
                    // 子页面，跳过
                    continue;
                }
            }

            return content.trim();
        } catch (error) {
            throw new Error(`获取文档内容失败: ${error.message}`);
        }
    }

    async saveFile(content, filePath, metadata = null) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        if (metadata) {
            let metaText = '\n\n---\n元数据:\n';
            for (const [key, value] of Object.entries(metadata)) {
                metaText += `- ${key}: ${value}\n`;
            }
            content = content + metaText;
        }

        await fs.writeFile(filePath, content, 'utf-8');
    }

    async processDownload() {
        const separator = '='.repeat(60);
        console.log(separator);
        console.log('🚀 飞书知识库智能批量下载工具');
        console.log(separator);
        console.log(`📚 知识库: CT-公交项目知识库`);
        console.log(`📂 保存目录: ${this.outputDir}`);
        console.log(separator);

        // 初始化
        await this.initialize();

        // 第一步：收集所有文档
        await this.collectAllDocuments();

        if (this.docList.length === 0) {
            console.log('\n⚠️ 未找到任何文档');
            return;
        }

        // 第二步：逐个下载文档
        console.log(`\n📥 开始批量下载 ${this.docList.length} 个文档...\n`);
        for (let i = 0; i < this.docList.length; i++) {
            await this.downloadSingleDocument(this.docList[i]);

            // 每10个文档显示一次进度
            if ((i + 1) % 10 === 0) {
                const progress = Math.round(((i + 1) / this.docList.length) * 100);
                console.log(`\n📊 进度: ${progress}% (${i + 1}/${this.docList.length})`);
            }
        }

        // 打印统计
        this.printStats();
    }

    printStats() {
        const separator = '='.repeat(60);
        console.log('\n' + separator);
        console.log('🎉 批量下载完成！');
        console.log(separator);
        console.log(`总计: ${this.stats.total} 个`);
        console.log(`成功: ${this.stats.success} 个 ✓`);
        console.log(`失败: ${this.stats.failed} 个 ✗`);
        console.log(`跳过: ${this.stats.skipped} 个 ⊝`);
        console.log(`成功率: ${Math.round((this.stats.success / this.stats.total) * 100)}%`);
        console.log(separator);

        if (this.stats.failedList.length > 0) {
            console.log('\n❌ 失败文档列表:');
            for (const { title, error } of this.stats.failedList) {
                console.log(`  - ${title}: ${error}`);
            }
        }
    }
}

// 主函数
async function main() {
    const outputDir = process.argv[2] || './ct-wiki-batch-download';

    const downloader = new SmartBatchDownloader(outputDir);
    await downloader.processDownload();
}

if (require.main === module) {
    main().catch(error => {
        console.error('\n❌ 下载失败:', error.message);
        process.exit(1);
    });
}