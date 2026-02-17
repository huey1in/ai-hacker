// 法律文档加载脚本

// 简单的 Markdown 转 HTML（支持基本格式）
function markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown
        // 标题
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-3">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-medium mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-medium mb-4">$1</h1>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-black hover:underline">$1</a>')
        // 列表项
        .replace(/^\- (.*$)/gim, '<li class="text-gray-700 leading-relaxed ml-6 mb-2">• $1</li>')
        .replace(/^\* (.*$)/gim, '<li class="text-gray-700 leading-relaxed ml-6 mb-2">• $1</li>')
        // 段落（将双换行符转换为段落）
        .split('\n\n')
        .map(para => {
            if (para.trim().startsWith('<h') || para.trim().startsWith('<li')) {
                return para;
            }
            return '<p class="text-gray-700 leading-relaxed mb-4">' + para.replace(/\n/g, '<br>') + '</p>';
        })
        .join('\n');
    
    return '<div class="space-y-4">' + html + '</div>';
}

// 加载法律文档
async function loadLegalDocs() {
    const contentContainer = document.getElementById('legal-content');
    if (!contentContainer) return;
    
    const docType = contentContainer.dataset.type; // 'terms' 或 'privacy'
    const docName = docType === 'terms' ? '服务条款' : '隐私政策';
    const lastUpdatedEl = document.getElementById('last-updated');
    
    try {
        const response = await fetch('/api/legal-docs');
        if (response.ok) {
            const docs = await response.json();
            const content = docType === 'terms' ? docs.terms : docs.privacy;
            const updatedAt = docType === 'terms' ? docs.terms_updated_at : docs.privacy_updated_at;
            
            // 更新时间
            if (updatedAt && updatedAt.trim()) {
                lastUpdatedEl.textContent = `最后更新时间：${updatedAt}`;
            } else {
                lastUpdatedEl.textContent = '';
            }
            
            if (content && content.trim()) {
                // 如果有自定义内容，显示自定义内容
                contentContainer.innerHTML = markdownToHtml(content);
            } else {
                // 没有配置内容时显示提示
                contentContainer.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-gray-500 mb-4">管理员尚未配置${docName}内容</p>
                        <p class="text-sm text-gray-400">请联系管理员在后台系统设置中添加${docName}</p>
                    </div>
                `;
            }
        } else {
            throw new Error('加载失败');
        }
    } catch (error) {
        console.error('加载法律文档失败:', error);
        lastUpdatedEl.textContent = '最后更新时间：加载失败';
        contentContainer.innerHTML = `
            <div class="text-center py-12">
                <p class="text-gray-500 mb-4">加载${docName}失败</p>
                <p class="text-sm text-gray-400">请稍后重试或联系管理员</p>
            </div>
        `;
    }
}

// 页面加载时执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLegalDocs);
} else {
    loadLegalDocs();
}
