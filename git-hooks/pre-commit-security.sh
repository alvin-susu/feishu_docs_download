#!/bin/bash
# 🔒 Git Pre-Commit 安全检查钩子
# 防止意外提交敏感信息到Git仓库

echo "🔒 执行安全检查..."

# 检查的敏感模式
SENSITIVE_PATTERNS=(
    "app_secret\s*[:=]\s*['\"][^'\"]{16,}"  # AppSecret 格式
    "appSecret\s*[:=]\s*['\"][^'\"]{16,}"  # appSecret 格式
    "FEISHU_APP_ID\s*=\s*cli_[a-z0-9]{16}" # 飞书AppID格式
    "password\s*[:=]\s*['\"][^'\"]{8,}"    # 密码格式
    "api_key\s*[:=]\s*['\"][^'\"]{20,}"    # API密钥格式
    "secret\s*[:=]\s*['\"][^'\"]{20,}"      # Secret格式
    "token\s*[:=]\s*['\"][^'\"]{20,}"       # Token格式
    "ENCRYPTION_KEY\s*=\s*[^\s]{32,}"       # 加密密钥格式
)

# 检查的敏感文件
SENSITIVE_FILES=(
    "\.env$"
    "\.env\.local$"
    "\.env\.production$"
    "data/accounts\.json"
    "*secret*"
    "*credential*"
    "*.key"
    "*.pem"
)

# 获取暂存区的文件
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

HAS_SECURITY_ISSUES=false

# 检查敏感文件
echo "🔍 检查敏感文件..."
for file in $STAGED_FILES; do
    for pattern in "${SENSITIVE_FILES[@]}"; do
        if echo "$file" | grep -qE "$pattern"; then
            echo "❌ 发现敏感文件: $file"
            echo "⚠️  请勿将包含凭证的文件提交到Git"
            HAS_SECURITY_ISSUES=true
        fi
    done
done

# 检查敏感内容
echo "🔍 检查敏感内容..."
for file in $STAGED_FILES; do
    # 只检查文本文件
    if file "$file" | grep -q "text\|JSON\|JavaScript"; then
        for pattern in "${SENSITIVE_PATTERNS[@]}"; do
            if git diff --cached "$file" | grep -iE "$pattern" > /dev/null; then
                echo "❌ 在 $file 中发现可能敏感的内容"
                echo "⚠️  匹配模式: $pattern"
                HAS_SECURITY_ISSUES=true
            fi
        done
    fi
done

# 检查大文件
echo "🔍 检查大文件..."
for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$FILE_SIZE" -gt 1048576 ]; then  # 1MB
            echo "⚠️  发现大文件: $file ($(du -h "$file" | cut -f1))"
            echo "💡 请考虑使用Git LFS或排除此文件"
        fi
    fi
done

if [ "$HAS_SECURITY_ISSUES" = true ]; then
    echo ""
    echo "🚨 安全检查失败！"
    echo ""
    echo "请修复上述问题后再提交，或使用 --no-verify 跳过检查（不推荐）"
    echo ""
    echo "如需跳过检查: git commit --no-verify"
    exit 1
fi

echo "✅ 安全检查通过"
exit 0