#!/bin/bash
# 🔒 安装Git安全钩子

echo "🔒 安装Git安全检查钩子..."

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
SOURCE_HOOK="$PROJECT_ROOT/git-hooks/pre-commit-security.sh"
TARGET_HOOK="$HOOKS_DIR/pre-commit"

# 检查是否在Git仓库中
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ 错误: 当前目录不是Git仓库"
    exit 1
fi

# 备份现有的pre-commit钩子
if [ -f "$TARGET_HOOK" ]; then
    echo "📦 备份现有的pre-commit钩子..."
    cp "$TARGET_HOOK" "$TARGET_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 创建符号链接
echo "🔗 创建安全钩子链接..."
ln -sf "$SOURCE_HOOK" "$TARGET_HOOK"

# 确保钩子可执行
chmod +x "$TARGET_HOOK"

echo "✅ Git安全钩子安装完成"
echo ""
echo "📋 钩子功能:"
echo "  • 防止提交包含敏感信息的文件"
echo "  • 检测代码中的凭证模式"
echo "  • 警告大文件提交"
echo ""
echo "🎯 钩子将自动在每次git commit时运行"
echo "💡 如需跳过检查: git commit --no-verify"