#!/bin/bash
# 🧹 项目发布前最终清理检查脚本

echo "🧹 飞书知识库智能助手 - 发布前最终检查"
echo "=========================================="

ISSUES_FOUND=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_issue() {
    local description=$1
    local severity=$2
    local solution=$3

    if [ "$severity" = "critical" ]; then
        echo -e "${RED}❌ [严重] $description${NC}"
    elif [ "$severity" = "warning" ]; then
        echo -e "${YELLOW}⚠️  [警告] $description${NC}"
    else
        echo "✅ [提示] $description"
    fi
    echo "   💡 $solution"
    echo ""
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

echo "🔍 第一阶段：敏感信息扫描"
echo "--------------------------------"

# 1. 检查是否包含真实飞书凭证
echo "检查飞书凭证..."
SENSITIVE_PATTERNS=(
    "cli_a9282ff886b8dbb6"
    "YZPhsMHUVrYkYhA9QwyRhhTJUaTOObaH"
    "407faa38beba4469e6eebcac1a239cc2"
    "bot_1772805688273_qq7ccv3st"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -r "$pattern" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" > /dev/null; then
        check_issue "发现已知的敏感信息: $pattern" "critical" "请手动搜索并清理该信息"
    fi
done

# 2. 检查是否包含AppID格式
echo "检查飞书AppID格式..."
if grep -r "cli_[a-z0-9]\{16\}" --include="*.js" --include="*.json" --include="*.md" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" | grep -v "cli_xxxxxxxxxxxxxxxx" | grep -v "your_app_id" > /dev/null; then
    check_issue "发现可能的飞书AppID格式" "warning" "请检查是否为真实凭证，如果是请清理"
fi

# 3. 检查data目录
echo "检查data目录..."
if [ -d "data" ]; then
    if [ -f "data/accounts.json" ]; then
        if grep -q "cli_a9282ff886b8dbb6\|appSecret.*[a-f0-9]\{32,\}" data/accounts.json 2>/dev/null; then
            check_issue "data/accounts.json可能包含真实凭证" "critical" "请清空或删除该文件"
        fi
    fi

    # 检查index目录
    if [ -d "data/index" ]; then
        INDEX_FILES=$(find data/index -name "*.json" 2>/dev/null)
        if [ -n "$INDEX_FILES" ]; then
            echo "⚠️  data/index目录包含文件，建议清理"
        fi
    fi
fi

# 4. 检查测试文件
echo "检查测试文件..."
TEST_IMAGES=$(find test -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" 2>/dev/null)
if [ -n "$TEST_IMAGES" ]; then
    check_issue "test目录包含图片文件" "warning" "图片可能包含敏感信息，建议删除"
fi

echo ""
echo "🔍 第二阶段：文件完整性检查"
echo "--------------------------------"

# 5. 检查必要的安全文件
echo "检查安全配置文件..."
if [ ! -f ".gitignore" ]; then
    check_issue "缺少.gitignore文件" "critical" "请创建.gitignore文件"
fi

if [ ! -f ".env.example" ]; then
    check_issue "缺少.env.example文件" "warning" "请创建环境变量模板文件"
fi

# 6. 检查README是否包含敏感信息
echo "检查README文件..."
if [ -f "README.md" ]; then
    if grep -q "password\|secret\|token\|credential" README.md 2>/dev/null; then
        if ! grep -q "your_\|example\|placeholder" README.md 2>/dev/null; then
            check_issue "README.md可能包含真实凭证" "warning" "请检查并清理敏感信息"
        fi
    fi
fi

echo ""
echo "🔍 第三阶段：Git历史检查"
echo "--------------------------------"

# 7. 检查是否在Git仓库中
if [ -d ".git" ]; then
    echo "✅ 项目在Git仓库中"

    # 检查是否有未提交的敏感文件
    UNTRACKED_SECRETS=$(git ls-files --others --exclude-standard | grep -E "\.env$|.*secret.*|.*credential.*" || true)
    if [ -n "$UNTRACKED_SECRETS" ]; then
        check_issue "发现未跟踪的敏感文件" "critical" "请添加到.gitignore或删除"
    fi
else
    echo "ℹ️  项目不在Git仓库中"
fi

echo ""
echo "🔍 第四阶段：依赖和配置检查"
echo "--------------------------------"

# 8. 检查依赖包
if [ -f "package.json" ]; then
    echo "✅ package.json存在"
    if grep -q "your_app_id\|your_secret" package.json 2>/dev/null; then
        echo "ℹ️  package.json包含占位符，这是正常的"
    fi
fi

# 9. 检查.env文件
if [ -f ".env" ]; then
    if grep -q "your_app_id_here\|your_app_secret_here\|your_key_here" .env 2>/dev/null; then
        echo "✅ .env文件包含占位符，这是正常的"
    elif grep -q "cli_a9282ff886b8dbb6\|YZPhsMHUVrYkYhA9QwyRhhTJUaTOObaH" .env 2>/dev/null; then
        check_issue ".env文件包含真实凭证" "critical" "请清理.env文件"
    fi
fi

echo ""
echo "=========================================="
echo "📊 最终检查报告"
echo "=========================================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ 项目可以安全发布！${NC}"
    echo ""
    echo "🎯 发布清单："
    echo "  [ ] 运行 npm test 确保功能正常"
    echo "  [ ] 更新 README.md 版本信息"
    echo "  [ ] 检查 package.json 版本号"
    echo "  [ ] 创建发布标签"
    echo "  [ ] 通知用户更新注意事项"
    echo ""
    echo "⚠️  重要提醒："
    echo "  • 确保用户知道需要配置自己的飞书凭证"
    echo "  • 提供清晰的配置文档"
    echo "  • 建议用户启用Git安全钩子"
    exit 0
else
    echo -e "${RED}❌ 发现 $ISSUES_FOUND 个问题需要处理${NC}"
    echo ""
    echo "📋 请按优先级修复上述问题后再发布"
    echo ""
    echo "🔄 修复完成后，请再次运行此脚本"
    exit 1
fi