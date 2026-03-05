/**
 * 测试文件
 * 用于测试飞书知识库智能助手的各个功能
 */

require('dotenv').config();
const FeishuWikiAssistant = require('../src/index');

// 测试配置
const testConfig = {
    enableConsoleLog: true,
    mockMode: true // 在没有真实飞书环境时使用模拟模式
};

class TestRunner {
    constructor() {
        this.assistant = null;
        this.testResults = [];
    }

    /**
     * 初始化测试环境
     */
    async initialize() {
        try {
            console.log('🧪 初始化测试环境...');

            // 创建助手实例
            this.assistant = new FeishuWikiAssistant();

            // 如果是模拟模式，设置模拟数据
            if (testConfig.mockMode) {
                this.setupMockData();
            }

            console.log('✅ 测试环境初始化完成');
            return true;

        } catch (error) {
            console.error('❌ 初始化测试环境失败:', error);
            return false;
        }
    }

    /**
     * 设置模拟数据
     */
    setupMockData() {
        console.log('📝 设置模拟数据...');

        // 模拟知识库索引
        const mockIndex = {
            documents: new Map([
                ['doc_001', {
                    id: 'doc_001',
                    title: '产品需求文档 - 飞书知识库智能助手',
                    wikiSpaceId: 'space_001',
                    parentToken: '',
                    url: 'https://example.com/doc/doc_001',
                    createTime: '2024-01-01T00:00:00Z',
                    updateTime: '2024-01-02T00:00:00Z',
                    keywords: ['产品', '需求', '飞书', '知识库', '智能', '助手'],
                    summary: '本文档描述了飞书知识库智能助手的产品需求和功能规划...'
                }],
                ['doc_002', {
                    id: 'doc_002',
                    title: '技术架构设计文档',
                    wikiSpaceId: 'space_001',
                    parentToken: '',
                    url: 'https://example.com/doc/doc_002',
                    createTime: '2024-01-03T00:00:00Z',
                    updateTime: '2024-01-04T00:00:00Z',
                    keywords: ['技术', '架构', '设计', '开发', 'api'],
                    summary: '本文档描述了系统的整体架构设计和技术选型...'
                }],
                ['doc_003', {
                    id: 'doc_003',
                    title: '会议记录 - 2024年第1周项目例会',
                    wikiSpaceId: 'space_002',
                    parentToken: '',
                    url: 'https://example.com/doc/doc_003',
                    createTime: '2024-01-05T00:00:00Z',
                    updateTime: '2024-01-05T00:00:00Z',
                    keywords: ['会议', '记录', '项目', '例会', '周报'],
                    summary: '本周项目例会讨论了项目进度、风险和下周计划...'
                }]
            ]),
            categories: new Map([
                ['space_001', {
                    name: '产品文档',
                    children: ['产品需求文档 - 飞书知识库智能助手'],
                    documentCount: 2
                }],
                ['space_002', {
                    name: '会议记录',
                    children: ['会议记录 - 2024年第1周项目例会'],
                    documentCount: 1
                }]
            ]),
            keywords: new Map([
                ['产品', ['doc_001']],
                ['技术', ['doc_002']],
                ['会议', ['doc_003']]
            ]),
            lastUpdate: new Date().toISOString(),
            version: 1
        };

        // 替换索引器
        this.assistant.indexer.index = mockIndex;
        console.log('✅ 模拟数据设置完成');
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始运行测试套件...\n');

        await this.testDocumentLocator();
        await this.testContentSearcher();
        await this.testAutoArchiver();
        await this.testMessageHandler();

        this.printTestResults();
    }

    /**
     * 测试文档定位功能
     */
    async testDocumentLocator() {
        console.log('🔍 测试文档定位功能...');

        try {
            const DocumentLocator = require('../src/features/DocumentLocator');
            const locator = new DocumentLocator(this.assistant);

            // 测试1: 查找产品需求文档
            const result1 = await locator.find('产品需求');
            this.addTestResult('文档定位-查找产品需求', true, result1);

            // 测试2: 查找不存在的文档
            const result2 = await locator.find('不存在的文档');
            this.addTestResult('文档定位-查找不存在文档', true, result2);

            // 测试3: 智能补全
            const result3 = locator.autoComplete('产品');
            this.addTestResult('文档定位-智能补全', result3.length > 0, `找到${result3.length}个结果`);

        } catch (error) {
            this.addTestResult('文档定位功能', false, error.message);
        }
    }

    /**
     * 测试内容搜索功能
     */
    async testContentSearcher() {
        console.log('🔍 测试内容搜索功能...');

        try {
            const ContentSearcher = require('../src/features/ContentSearcher');
            const searcher = new ContentSearcher(this.assistant);

            // 测试1: 搜索技术相关内容
            const result1 = await searcher.search('技术架构');
            this.addTestResult('内容搜索-搜索技术架构', true, result1);

            // 测试2: 搜索不相关内容
            const result2 = await searcher.search('不相关的内容xyz');
            this.addTestResult('内容搜索-搜索不相关内容', true, result2);

        } catch (error) {
            this.addTestResult('内容搜索功能', false, error.message);
        }
    }

    /**
     * 测试自动归档功能
     */
    async testAutoArchiver() {
        console.log('📁 测试自动归档功能...');

        try {
            const AutoArchiver = require('../src/features/AutoArchiver');
            const archiver = new AutoArchiver(this.assistant);

            // 测试1: 分类测试
            const classification1 = archiver.classifyDocument('产品需求文档', '这是关于产品的需求描述');
            this.addTestResult('自动归档-产品分类',
                classification1.targetCategory === '产品文档',
                `分类结果: ${classification1.targetCategory}`);

            // 测试2: 会议分类
            const classification2 = archiver.classifyDocument('会议记录', '项目进度讨论');
            this.addTestResult('自动归档-会议分类',
                classification2.targetCategory === '会议记录',
                `分类结果: ${classification2.targetCategory}`);

        } catch (error) {
            this.addTestResult('自动归档功能', false, error.message);
        }
    }

    /**
     * 测试消息处理功能
     */
    async testMessageHandler() {
        console.log('💬 测试消息处理功能...');

        try {
            const MessageHandler = require('../src/handlers/MessageHandler');
            const handler = new MessageHandler(this.assistant);

            // 测试1: 帮助命令
            const result1 = await handler.handleCommand('help', '', {});
            this.addTestResult('消息处理-帮助命令',
                result1.includes('帮助'),
                '帮助命令正常工作');

            // 测试2: 统计命令
            const result2 = await handler.handleCommand('stats', '', {});
            this.addTestResult('消息处理-统计命令',
                result2.includes('统计'),
                '统计命令正常工作');

            // 测试3: 意图识别
            const intent = await handler.recognizeIntent('查找产品需求文档');
            this.addTestResult('消息处理-意图识别',
                intent.type === 'find_document',
                `识别意图: ${intent.type}`);

        } catch (error) {
            this.addTestResult('消息处理功能', false, error.message);
        }
    }

    /**
     * 添加测试结果
     */
    addTestResult(testName, passed, result) {
        this.testResults.push({
            name: testName,
            passed,
            result,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 打印测试结果
     */
    printTestResults() {
        console.log('\n📊 测试结果汇总:\n');

        let passed = 0;
        let failed = 0;

        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);

            if (result.passed) {
                passed++;
            } else {
                failed++;
                console.log(`   错误: ${result.result}`);
            }
        });

        console.log(`\n总计: ${this.testResults.length} 个测试`);
        console.log(`通过: ${passed} 个`);
        console.log(`失败: ${failed} 个`);
        console.log(`成功率: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    }
}

// 运行测试
async function runTests() {
    const runner = new TestRunner();

    const initialized = await runner.initialize();
    if (!initialized) {
        console.error('❌ 测试环境初始化失败，退出测试');
        process.exit(1);
    }

    await runner.runAllTests();
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ 测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;
