/**
 * 开发服务器
 * 用于演示和测试插件的API接口
 */

const express = require('express');
const path = require('path');

class DevServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.pluginAPI = null;

        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 解析JSON请求体
        this.app.use(express.json());

        // 静态文件服务
        this.app.use('/ui', express.static(path.join(__dirname, '../ui')));

        // 日志中间件
        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // 配置面板主页
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../ui/config-panel.html'));
        });

        // API路由代理
        this.app.all('/api/*', async (req, res) => {
            try {
                // 确保插件API已初始化
                if (!this.pluginAPI) {
                    const PluginAPI = require('../src/api/plugin-api');
                    this.pluginAPI = new PluginAPI();
                    await this.pluginAPI.initialize();
                }

                // 处理请求
                const response = await this.pluginAPI.handleRequest({
                    method: req.method,
                    path: req.path,
                    body: req.body,
                    query: req.query
                });

                // 返回响应
                res.status(response.status).json(response.body);

            } catch (error) {
                console.error('API处理错误:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // 404处理
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not Found' });
        });

        // 错误处理
        this.app.use((err, req, res, next) => {
            console.error('服务器错误:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            await new Promise((resolve, reject) => {
                this.server = this.app.listen(this.port, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            console.log(`🚀 开发服务器启动成功`);
            console.log(`📍 访问地址: http://localhost:${this.port}`);
            console.log(`🎨 配置面板: http://localhost:${this.port}/ui/config-panel.html`);
            console.log(`🔌 健康检查: http://localhost:${this.port}/health`);

        } catch (error) {
            console.error('启动服务器失败:', error);
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 服务器已停止');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const server = new DevServer(3000);

    // 优雅退出处理
    process.on('SIGINT', async () => {
        console.log('\n正在关闭服务器...');
        await server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await server.stop();
        process.exit(0);
    });

    // 启动服务器
    server.start().catch(error => {
        console.error('启动失败:', error);
        process.exit(1);
    });
}

module.exports = DevServer;
