// 网站配置加载脚本

// 加载并应用网站配置
async function loadSiteConfig() {
    try {
        const response = await fetch('/api/site-config');
        if (response.ok) {
            const config = await response.json();
            
            // 更新网站名称
            if (config.site_name) {
                document.querySelectorAll('.site-name').forEach(el => {
                    el.textContent = config.site_name;
                });
                document.querySelectorAll('.site-logo-text').forEach(el => {
                    el.textContent = config.site_name;
                });
                
                // 更新页面标题
                const titleEl = document.querySelector('title');
                if (titleEl) {
                    const currentTitle = titleEl.textContent;
                    titleEl.textContent = currentTitle.replace('AI HACKER', config.site_name);
                }
            }
            
            // 显示滚动公告（后台管理页面不显示）
            if (config.announcement && config.announcement.trim() && !window.location.pathname.includes('admin')) {
                showScrollingAnnouncement(config.announcement);
            }
            
            // 更新页脚版权信息
            if (config.footer_copyright && config.footer_copyright.trim()) {
                document.querySelectorAll('.footer-copyright').forEach(el => {
                    el.textContent = config.footer_copyright;
                });
            }
        }
    } catch (error) {
        console.error('加载网站配置失败:', error);
    }
}

// 显示滚动公告
function showScrollingAnnouncement(announcement) {
    const nav = document.querySelector('nav');
    if (!nav) return;
    
    const announcementBar = document.createElement('div');
    announcementBar.className = 'bg-black text-white py-2 px-4 text-sm overflow-hidden relative';
    announcementBar.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-1 overflow-hidden">
                <div class="announcement-scroll whitespace-nowrap inline-block">
                    ${announcement}
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-300 flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    
    nav.parentNode.insertBefore(announcementBar, nav);
    
    // 添加滚动动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes scroll-left {
            0% {
                transform: translateX(100%);
            }
            100% {
                transform: translateX(-100%);
            }
        }
        .announcement-scroll {
            animation: scroll-left 20s linear infinite;
        }
        .announcement-scroll:hover {
            animation-play-state: paused;
        }
    `;
    document.head.appendChild(style);
}

// 页面加载时执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteConfig);
} else {
    loadSiteConfig();
}
