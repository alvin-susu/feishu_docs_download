#!/bin/bash
# 🎉 项目清理和文档重组 - 最终验证脚本

echo "🎯 项目清理和文档重组 - 最终验证"
echo "=========================================="

SUCCESS_COUNT=0
TOTAL_CHECKS=0

# 检查函数
check_item() {
    local description=$1
    local command=$2

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if eval "$command"; then
        echo "✅ $description"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    else
        echo "❌ $description"
        return 1
    fi
}

echo ""
echo "🔍 第一阶段：项目结构检查"
echo "--------------------------------"

check_item "README.md 存在" "test -f README.md"
check_item "docs/ 目录存在" "test -d docs"
check_item "src/ 目录存在" "test -d src"
check_item "package.json 格式正确" "node -e 'require(JSON.parse(require(\"fs\").readFileSync(\"package.json\")))' 2>/dev/null"

echo ""
echo "🔍 第二阶段：测试文件清理检查"
echo "--------------------------------"

check_item "test-single-doc.js 已删除" "! test -f test-single-doc.js"
check_item "test/ 目录已删除" "! test -d test"
check_item "无 .test 文件残留" "! find . -maxdepth 1 -name '*test*' -type f 2>/dev/null | grep -v node_modules"

echo ""
echo "🔍 第三阶段：文档结构检查"
echo "--------------------------------"

check_item "docs/INDEX.md 存在" "test -f docs/INDEX.md"
check_item "docs/USER-GUIDE.md 存在" "test -f docs/USER-GUIDE.md"
check_item "docs/DEBUG-GUIDE.md 存在" "test -f docs/DEBUG-GUIDE.md"
check_item "docs/ 文件数量正确" "test \$(ls docs/*.md 2>/dev/null | wc -l) -ge 10"

echo ""
echo "🔍 第四阶段：功能完整性检查"
echo "--------------------------------"

check_item "src/index.js 语法正确" "node -c src/index.js 2>/dev/null"
check_item "package.json 无test命令" "! grep -q '\"test\".*test/test.js' package.json"
check_item "skill.json 无test命令" "! grep -q '\"test\".*test/test.js' skill.json"

echo ""
echo "🔍 第五阶段：项目干净度检查"
echo "--------------------------------"

check_item "根目录无散乱md文件" "test \$(find . -maxdepth 1 -name '*.md' -type f | wc -l) -eq 1"
check_item ".gitignore 配置正确" "grep -q 'test/' .gitignore || ! grep -q 'test-single-doc' .gitignore"

echo ""
echo "=========================================="
echo "📊 验证结果"
echo "=========================================="

PERCENTAGE=$((SUCCESS_COUNT * 100 / TOTAL_CHECKS))

echo "通过检查: $SUCCESS_COUNT/$TOTAL_CHECKS ($PERCENTAGE%)"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_CHECKS ]; then
    echo "🎉 所有检查通过！项目清理和文档重组完成！"
    echo ""
    echo "📁 当前项目结构:"
    echo "  ├── README.md          # 项目说明"
    echo "  ├── package.json       # Node.js配置"
    echo "  ├── skill.json         # OpenClaw配置"
    echo "  ├── docs/              # 📚 文档中心 (12个文档)"
    echo "  ├── src/               # 💻 源代码"
    echo "  ├── scripts/           # 🛠️ 工具脚本"
    echo "  └── ...                # 其他目录"
    echo ""
    echo "✅ 项目已准备好发布！"
    exit 0
else
    echo "⚠️  发现 $((TOTAL_CHECKS - SUCCESS_COUNT)) 个问题需要处理"
    echo ""
    echo "请检查上述失败的检查项"
    exit 1
fi