// assets/js/history.js

document.addEventListener('DOMContentLoaded', () => {
    let user = OmoshiroiUtils.getUser();
    if (!user) user = { name: "Trial Guest", role: "guest" };
    
    const history = OmoshiroiUtils.getUserHistory(user);
    const __lang = localStorage.getItem('lang') || 'id';

    // Translations
    const T = {
        title: __lang === 'id' ? 'Riwayat & Analitik Anda' : 'Your History & Analytics',
        avgScore: __lang === 'id' ? 'Skor Rata-rata' : 'Avg Score',
        totalAttempts: __lang === 'id' ? 'Total Ujian' : 'Total Attempts',
        emptyState: __lang === 'id' ? 'Belum ada riwayat tes.' : 'No test history available yet.',
        viewBtn: __lang === 'id' ? 'Lihat Detail' : 'View Detail',
        level: __lang === 'id' ? 'Level' : 'Level',
        score: __lang === 'id' ? 'Skor' : 'Score',
        date: __lang === 'id' ? 'Tanggal' : 'Date',
        action: __lang === 'id' ? 'Aksi' : 'Action'
    };

    // Populate Username
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = user.name;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            OmoshiroiUtils.logout();
        });
    }

    // Populate Analytics
    const totalDisplay = document.getElementById('totalAttempts');
    const avgDisplay = document.getElementById('avgScore');
    
    if (history.length > 0) {
        totalDisplay.textContent = Object.keys(history).length; // or just history.length
        const sum = history.reduce((acc, curr) => acc + curr.score, 0);
        avgDisplay.textContent = (sum / history.length).toFixed(1) + '%';
    } else {
        totalDisplay.textContent = '0';
        avgDisplay.textContent = '0%';
    }

    // Populate Table
    const tableBody = document.getElementById('historyTableBody');
    if (history.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 2rem; color: var(--text-secondary);">${T.emptyState}</td></tr>`;
    } else {
        // Sort descending by date
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedHistory.forEach(item => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'badge-fail';
            if (item.score >= 80) badgeClass = 'badge-master';
            else if (item.score >= 50) badgeClass = 'badge-pass';

            tr.innerHTML = `
                <td>${new Date(item.date).toLocaleString()}</td>
                <td><strong>${item.level}</strong></td>
                <td>
                    <span class="badge ${badgeClass}" style="margin-right: 0.5rem;">${item.score.toFixed(1)}%</span>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm view-detail-btn" data-id="${item.test_id}">${T.viewBtn}</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Attach listeners for View Detail
        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const testId = this.getAttribute('data-id');
                localStorage.setItem('selected_history_id', testId);
                // Redirect to correct localized result
                window.location.href = 'result.html';
            });
        });
    }
});
