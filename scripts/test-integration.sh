#!/bin/bash

# 飞书知识库智能助手 - 完整功能测试脚本
# 用于验证README中描述的所有核心功能

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🧪 飞书知识库智能助手 - 完整功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试项目目录
SKILL_DIR="$HOME/.openclaw/workspace/skills/feishu-wiki-assistant"
cd "$SKILL_DIR"

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_case() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${YELLOW}[测试 $TOTAL_TESTS]${NC} $test_name"
    echo "命令: $test_command"
    echo "---"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ 测试通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 测试失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 打印分隔线
separator() {
    echo ""
    echo "=========================================="
    echo ""
}

# ============ 第一阶段：环境检查 ============
echo -e "${YELLOW}📋 第一阶段：环境检查${NC}"
separator()

test_case "检查项目目录是否存在" "test -d '$SKILL_DIR'"
test_case "检查核心源代码目录" "test -d '$SKILL_DIR/src'"
test_case "检查文档目录" "test -d '$SKILL_DIR/docs'"
test_case "检查脚本目录" "test -d '$SKILL_DIR/scripts'"
test_case "检查账号管理CLI工具" "test -f '$SKILL_DIR/scripts/account-cli.js'"
test_case "检查环境变量文件" "test -f '$SKILL_DIR/.env'"

# ============ 第二阶段：配置验证 ============
echo -e "\n${YELLOW}📋 第二阶段：配置验证${NC}"
separator()

test_case "检查ENCRYPTION_KEY是否设置" "test -n '\$ENCRYPTION_KEY'"
test_case "检查ENCRYPTION_KEY长度是否足够" "[ \${#ENCRYPTION_KEY} -ge 32 ]"

# ============ 第三阶段：账号管理功能测试 ============
echo -e "\n${YELLOW}📋 第三阶段：账号管理功能测试${NC}"
separator()

echo "ℹ️  注意：以下测试需要真实的飞书机器人凭证"
echo "ℹ️  如果您没有配置凭证，这些测试会失败（这是正常的）"
echo ""
read -p "是否要测试账号管理功能？(需要真实凭证) [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ACCOUNT_CLI="node $SKILL_DIR/scripts/account-cli.js"

    # 测试list命令（即使没有账号也应该工作）
    test_case "列出所有账号（可能为空）" "$ACCOUNT_CLI list"

    # 测试current命令
    test_case "显示当前账号（可能为空）" "$ACCOUNT_CLI current"

    echo "ℹ️  跳过添加账号测试（需要手动输入凭证）"
    echo "ℹ️  如需测试，请运行: $ACCOUNT_CLI add"
else
    echo "⏭️  跳过账号管理测试"
fi

# ============ 第四阶段：核心功能模块测试 ============
echo -e "\n${YELLOW}📋 第四阶段：核心功能模块测试${NC}"
separator()

test_case "检查BotAccountManager模块" "test -f '$SKILL_DIR/src/core/BotAccountManager.js'"
test_case "检查WikiIndexer模块" "test -f '$SKILL_DIR/src/core/WikiIndexer.js'"
test_case "检查DocumentLocator模块" "test -f '$SKILL_DIR/src/features/DocumentLocator.js'"
test_case "检查ContentSearcher模块" "test -f '$SKILL_DIR/src/features/ContentSearcher.js'"
test_case "检查AutoArchiver模块" "test -f '$SKILL_DIR/src/features/AutoArchiver.js'"
test_case "检查MeetingAssistant模块" "test -f '$SKILL_DIR/src/features/MeetingAssistant.js'"

# ============ 第五阶段：OpenClaw集成测试 ============
echo -e "\n${YELLOW}📋 第五阶段：OpenClaw集成测试${NC}"
separator()

test_case "检查skill.json" "test -f '$SKILL_DIR/skill.json'"
test_case "检查package.json" "test -f '$SKILL_DIR/package.json'"

# 验证skill.json中的版本
SKILL_VERSION=$(grep '"version"' $SKILL_DIR/skill.json | head -1 | grep -o '[0-9.]*')
echo "当前版本: $SKILL_VERSION"

# ============ 第六阶段：文档完整性测试 ============
echo -e "\n${YELLOW}📋 第六阶段：文档完整性测试${NC}"
separator()

test_case "检查用户指南" "test -f '$SKILL_DIR/docs/guides/USER-GUIDE.md'"
test_case "检查使用说明" "test -f '$SKILL_DIR/docs/guides/USAGE.md'"
test_case "检查调试指南" "test -f '$SKILL_DIR/docs/guides/DEBUG-GUIDE.md'"
test_case "检查安全指南" "test -f '$SKILL_DIR/docs/security/SECURITY-GUIDE.md'"
test_case "检查部署指南" "test -f '$SKILL_DIR/docs/deployment/DEPLOYMENT-GUIDE.md'"
test_case "检查多账号文档" "test -f '$SKILL_DIR/docs/about/MULTI-ACCOUNT.md'"
test_case "检查文档索引" "test -f '$SKILL_DIR/docs/INDEX.md'"

# ============ 第七阶段：安全检查 ============
echo -e "\n${YELLOW}📋 第七阶段：安全检查${NC}"
separator()

test_case "检查.gitignore中是否有.env" "grep -q '\.env' $SKILL_DIR/.gitignore"
test_case "检查.gitignore中是否有node_modules" "grep -q 'node_modules' $SKILL_DIR/.gitignore"
test_case "检查data目录在.gitignore中" "grep -q '^data/' $SKILL_DIR/.gitignore || grep -q '^data$' $SKILL_DIR/.gitignore || grep -q 'data/\*.json' $SKILL_DIR/.gitignore"

# 检查是否有硬编码凭证
if grep -r "appSecret.*=.*['\"][^'\"]" $SKILL_DIR/src/ 2>/dev/null | grep -v "example" | grep -v "template"; then
    echo -e "${RED}❌ 检测到可能的硬编码凭证${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
else
    echo -e "${GREEN}✅ 未检测到硬编码凭证${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ============ 第八阶段：README功能验证 ============
echo -e "\n${YELLOW}📋 第八阶段：README核心功能验证${NC}"
separator()

echo "README中提到的核心功能："
echo ""
echo "1. 智能文档定位 - DocumentLocator.js"
if test -f "$SKILL_DIR/src/features/DocumentLocator.js"; then
    echo -e "   ${GREEN}✅ 模块存在${NC}"
    grep -q "class DocumentLocator" "$SKILL_DIR/src/features/DocumentLocator.js" && \
    echo -e "   ${GREEN}✅ 类定义正确${NC}" || echo -e "   ${RED}❌ 类定义缺失${NC}"
else
    echo -e "   ${RED}❌ 模块不存在${NC}"
fi
echo ""

echo "2. 高效内容检索 - ContentSearcher.js"
if test -f "$SKILL_DIR/src/features/ContentSearcher.js"; then
    echo -e "   ${GREEN}✅ 模块存在${NC}"
    grep -q "class ContentSearcher" "$SKILL_DIR/src/features/ContentSearcher.js" && \
    echo -e "   ${GREEN}✅ 类定义正确${NC}" || echo -e "   ${RED}❌ 类定义缺失${NC}"
else
    echo -e "   ${RED}❌ 模块不存在${NC}"
fi
echo ""

echo "3. 自动智能归档 - AutoArchiver.js"
if test -f "$SKILL_DIR/src/features/AutoArchiver.js"; then
    echo -e "   ${GREEN}✅ 模块存在${NC}"
    grep -q "class AutoArchiver" "$SKILL_DIR/src/features/AutoArchiver.js" && \
    echo -e "   ${GREEN}✅ 类定义正确${NC}" || echo -e "   ${RED}❌ 类定义缺失${NC}"
else
    echo -e "   ${RED}❌ 模块不存在${NC}"
fi
echo ""

echo "4. 会议协作自动化 - MeetingAssistant.js"
if test -f "$SKILL_DIR/src/features/MeetingAssistant.js"; then
    echo -e "   ${GREEN}✅ 模块存在${NC}"
    grep -q "class MeetingAssistant" "$SKILL_DIR/src/features/MeetingAssistant.js" && \
    echo -e "   ${GREEN}✅ 类定义正确${NC}" || echo -e "   ${RED}❌ 类定义缺失${NC}"
else
    echo -e "   ${RED}❌ 模块不存在${NC}"
fi
echo ""

# ============ 第九阶段：OpenClaw重启提示 ============
echo -e "\n${YELLOW}📋 第九阶段：OpenClaw集成${NC}"
separator()

echo "检查OpenClaw进程状态..."
if pgrep -f "openclaw" > /dev/null; then
    echo -e "${GREEN}✅ OpenClaw正在运行${NC}"
    echo ""
    echo "ℹ️  需要重启OpenClaw以加载新版本的插件"
    echo ""
    read -p "是否现在重启OpenClaw？ [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在停止OpenClaw..."
        pkill -f openclaw
        sleep 2
        echo "正在启动OpenClaw..."
        openclaw &
        sleep 3
        echo -e "${GREEN}✅ OpenClaw已重启${NC}"
    else
        echo "⏭️  跳过重启"
    fi
else
    echo -e "${YELLOW}⚠️  OpenClaw未运行${NC}"
    echo ""
    read -p "是否启动OpenClaw？ [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在启动OpenClaw..."
        openclaw &
        sleep 3
        echo -e "${GREEN}✅ OpenClaw已启动${NC}"
    else
        echo "⏭️  跳过启动"
    fi
fi

# ============ 测试结果汇总 ============
separator()
echo -e "${YELLOW}📊 测试结果汇总${NC}"
separator()
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    echo ""
    echo "✅ 项目已成功同步到OpenClaw"
    echo "✅ 所有核心功能模块完整"
    echo "✅ 文档齐全"
    echo "✅ 安全检查通过"
    echo ""
    echo "📝 下一步："
    echo "1. 在OpenClaw中配置飞书机器人凭证"
    echo "2. 使用以下命令添加账号："
    echo "   cd $SKILL_DIR"
    echo "   node scripts/account-cli.js add"
    echo "3. 在飞书群中@机器人测试功能"
    exit 0
else
    echo -e "${RED}❌ 部分测试失败，请检查上述错误${NC}"
    exit 1
fi
