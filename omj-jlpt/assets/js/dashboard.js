// assets/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const user = OmoshiroiUtils.getUser();
    const guestLabel = document.getElementById('guestLabel');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const lang = localStorage.getItem('lang') || 'id';

    if (!user) {
        if (guestLabel) guestLabel.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
    } else {
        if (userNameDisplay) {
            userNameDisplay.classList.remove('hidden');
            const roleBadge = user.role === 'premium' ? 
                `<span class="badge" style="background:#ffd700; color:#5c4f00;">Premium</span>` : 
                `<span class="badge">Guest</span>`;
            userNameDisplay.innerHTML = `<span>${lang === 'id' ? 'Hai' : 'Hi'}, ${user.name}</span> ${roleBadge}`;
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                OmoshiroiUtils.logout();
            });
        }
    }

    // Lock cards based on Access Tier
    document.querySelectorAll('.level-card').forEach(card => {
        const levelTitle = card.querySelector('.level-title').textContent.trim();
        if (!OmoshiroiUtils.checkAccess(levelTitle)) {
            card.classList.add('locked-card');
            // Override the inline onclick handler by replacing it on the DOM node natively
            card.onclick = (e) => {
                e.preventDefault();
                const msg = lang === 'id' ? "Silakan login untuk membuka level ini" : "Please login to unlock this level";
                // Optionally show modal or redirect. Prompt asks for redirect or modal. Redirecting is fine.
                // We'll redirect to login.html explicitly.
                if(confirm(msg + ' \nLanjut ke halaman Login? / Proceed to Login?')) {
                    window.location.href = "login.html";
                }
            };
            card.insertAdjacentHTML('beforeend', `<div class="lock-overlay" title="${lang === 'id' ? 'Login untuk membuka' : 'Login to unlock'}">🔒</div>`);
        }
    });

    const quotes = [
        `"千里の道も一歩から" - A journey of a thousand miles begins with a single step.`,
        `"七転び八起き" - Fall down seven times, stand up eight.`,
        `"継続は力なり" - Perseverance is power.`,
        `"猿も木から落ちる" - Even monkeys fall from trees (Everyone makes mistakes).`
    ];
    document.getElementById('quoteDisplay').textContent = quotes[Math.floor(Math.random() * quotes.length)];

    loadHistory();
});

function selectLevel(level) {
    // Clear any existing test active session strictly for fresh start
    localStorage.removeItem('omoshiroi_active_test');
    
    // Pass the selected level via URL to the preparation page
    window.location.href = `level.html?level=${level}`;
}

function loadHistory() {
    const historyContainer = document.getElementById('historyContainer');
    const user = OmoshiroiUtils.getUser();
    let history = OmoshiroiUtils.getUserHistory(user);

    if (history.length > 0) {
        historyContainer.innerHTML = '';
        
        // Show only latest 3 in dashboard widget
        const recentHistory = history.slice(-3).reverse();
        
        recentHistory.forEach(item => {
            const dateStr = new Date(item.date).toLocaleString();
            let badgeClass = 'badge-fail';
            if (item.score >= 80) badgeClass = 'badge-master';
            else if (item.score >= 50) badgeClass = 'badge-pass';

            const div = document.createElement('div');
            div.style.padding = '1rem 0';
            div.style.borderBottom = '1px solid var(--border-color)';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <strong>${item.level}</strong> - Score: ${item.score.toFixed(1)}%
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</div>
                    </div>
                    <span class="badge ${badgeClass}">${getBadgeText(item.score)}</span>
                </div>
            `;
            historyContainer.appendChild(div);
        });
        
        const viewAllBtn = document.createElement('div');
        viewAllBtn.style.marginTop = '1rem';
        viewAllBtn.style.textAlign = 'center';
        viewAllBtn.innerHTML = `<a href="history.html" class="btn btn-primary" style="display: inline-block; width: 100%;">Lihat Semua / View All</a>`;
        historyContainer.appendChild(viewAllBtn);
    }
}

function getBadgeText(score) {
    if (score >= 80) return "JLPT Master";
    if (score >= 50) return "Keep Going";
    return "Don't Give Up";
}
