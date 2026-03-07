#!/bin/bash
# 🔍 项目安全检查脚本

echo "🔍 飞书知识库智能助手 - 项目安全检查"
echo "=========================================="

ISSUES_FOUND=0

# 检查函数
check_issue() {
    local description=$1
    local severity=$2
    local solution=$3

    echo "❌ [$severity] $description"
    echo "   💡 解决方案: $solution"
    echo ""
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# 1. 检查环境变量配置
echo "🔍 检查环境变量配置..."
if [ -f ".env" ]; then
    # 检查是否使用默认值
    if grep -q "your_app_id_here\|your_app_secret_here\|your_key_here" .env; then
        check_issue ".env文件包含占位符，未配置真实凭证" "高" "请在.env中配置真实的飞书机器人凭证"
    fi

    # 检查是否设置ENCRYPTION_KEY
    if ! grep -q "ENCRYPTION_KEY=" .env || grep -q "ENCRYPTION_KEY=please_generate" .env; then
        check_issue "未设置ENCRYPTION_KEY环境变量" "严重" "请生成并设置ENCRYPTION_KEY: openssl rand -hex 32"
    fi

    # 检查是否使用了不安全的LOG_LEVEL
    if grep -q "LOG_LEVEL=debug" .env; then
        check_issue "LOG_LEVEL设置为debug，可能泄露敏感信息" "中" "生产环境请使用LOG_LEVEL=info或warn"
    fi
else
    check_issue ".env文件不存在" "严重" "请复制.env.example为.env并配置"
fi

# 2. 检查敏感文件
echo "🔍 检查敏感文件..."
if [ -f "data/accounts.json" ]; then
    # 检查是否包含真实凭证
    if grep -q "cli_[a-z0-9]\{16\}" data/accounts.json && ! grep -q "your_app_id_here" data/accounts.json; then
        check_issue "data/accounts.json可能包含真实凭证" "严重" "请清空该文件或移至.gitignore"
    fi
fi

# 3. 检查代码中的硬编码凭证
echo "🔍 检查代码中的硬编码凭证..."
HARDCODED_CREDENTIALS=$(grep -r "app_id\|app_secret\|password\|ENCRYPTION_KEY" --include="*.js" --include="*.json" src/ | grep -v "process.env\|your_app\|your_secret\|your_key" | grep -v "node_modules" | wc -l)
if [ "$HARDCODED_CREDENTIALS" -gt 0 ]; then
    check_issue "发现可能硬编码的凭证: $HARDCODED_CREDENTIALS 处" "高" "请检查并移除代码中的硬编码凭证"
fi

# 4. 检查.gitignore配置
echo "🔍 检查.gitignore配置..."
REQUIRED_IGNORES=(".env" "data/" "*.secret" "*.credential" "*.key" "logs/")
for ignore in "${REQUIRED_IGNORES[@]}"; do
    if ! grep -q "$ignore" .gitignore 2>/dev/null; then
        check_issue ".gitignore缺少: $ignore" "中" "请添加到.gitignore文件"
    fi
done

# 5. 检查文档中的敏感信息
echo "🔍 检查文档中的敏感信息"
if grep -q "cli_[a-z0-9]\{16\}" DEBUG-GUIDE.md README.md 2>/dev/null; then
    check_issue "文档中可能包含真实AppID" "严重" "请清理文档中的敏感信息"
fi

# 6. 检查依赖包安全性
echo "🔍 检查依赖包安全性..."
if [ -f "package.json" ]; then
    echo "   💡 运行 'npm audit' 检查依赖包漏洞"
    echo "   💡 运行 'npm outdated' 检查过期包"
fi

# 7. 检查文件权限
echo "🔍 检查文件权限..."
if [ -f ".env" ]; then
    ENV_PERMS=$(stat -c %a .env 2>/dev/null || stat -f %A .env 2>/dev/null)
    if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
        check_issue ".env文件权限不安全: $ENV_PERMS" "中" "请设置: chmod 600 .env"
    fi
fi

# 8. 生成安全报告
echo ""
echo "=========================================="
echo "📊 安全检查报告"
echo "=========================================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ 未发现明显的安全问题"
    echo ""
    echo "🎯 建议定期运行此脚本检查安全性"
    exit 0
else
    echo "❌ 发现 $ISSUES_FOUND 个安全问题"
    echo ""
    echo "📋 请按优先级修复上述问题"
    echo ""
    echo "🔄 修复完成后，请再次运行此脚本验证"
    exit 1
fi