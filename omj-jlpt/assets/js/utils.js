// assets/js/utils.js
// Shared utilities for Omoshiroi Japan App

window.OmoshiroiUtils = {
    getUser: function() {
        const userStr = localStorage.getItem('omoshiroi_user') || sessionStorage.getItem('omoshiroi_user');
        if (!userStr) return null;
        try {
            const data = JSON.parse(userStr);
            if (data && data.user) return data.user;
            return data;
        } catch (e) {
            return null;
        }
    },
    
    saveResult: function(user, result) {
        if (!user || !user.name) return;
        const key = `test_history_${user.name}`;
        const history = JSON.parse(localStorage.getItem(key)) || [];
        history.push(result);
        localStorage.setItem(key, JSON.stringify(history));
    },

    getUserHistory: function(user) {
        if (!user || !user.name) return [];
        const key = `test_history_${user.name}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    },

    logout: function() {
        // Clear session only. Do not delete history.
        localStorage.removeItem('omoshiroi_user');
        sessionStorage.removeItem('omoshiroi_user');
        window.location.href = 'login.html';
    },

    formatTime: function(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    requireAuth: function() {
        if (!this.getUser()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    checkAccess: function(level) {
        const user = this.getUser();
        
        // Guest (not logged in or explicitly has 'guest' role like the demo account)
        if (!user || user.role === "guest") {
            return level === "N5";
        }

        // Premium Role (Logged-in valid users)
        if (user.role === "premium") {
            return true;
        }

        return false;
    },

    showLoader: function() {
        if (document.getElementById('jlpt-global-loader')) {
            document.getElementById('jlpt-global-loader').classList.remove('hidden');
            return;
        }

        const loaderWrapper = document.createElement('div');
        loaderWrapper.id = 'jlpt-global-loader';
        loaderWrapper.className = 'jlpt-loader-wrapper';
        loaderWrapper.innerHTML = `
            <div class="jlpt-loader">
                <svg viewBox="0 0 100 100" width="100%" height="100%">
                    <!-- Sun / Goal glowing -->
                    <circle cx="80" cy="20" r="10" class="loader-glow" />
                    
                    <!-- Torii Gate Background -->
                    <g class="loader-torii-bg">
                        <path d="M 40 10 Q 60 7 80 10 L 82 13 Q 60 10 40 13 Z" />
                        <rect x="42" y="13" width="36" height="3" />
                        <rect x="48" y="16" width="4" height="60" />
                        <rect x="68" y="16" width="4" height="60" />
                        <rect x="45" y="25" width="30" height="3" />
                    </g>
                    
                    <!-- Diagonal Stairs (bottom-left to top-right) -->
                    <path class="loader-stairs-path" d="M 0 100 L 20 100 L 20 80 L 40 80 L 40 60 L 60 60 L 60 40 L 80 40 L 80 20 L 100 20" />
                    
                    <!-- Character (Stickman) progressing upwards -->
                    <g class="loader-character-group">
                        <circle cx="20" cy="74" r="3" /> <!-- Head -->
                        <line x1="20" y1="77" x2="20" y2="86" /> <!-- Body -->
                        <line x1="20" y1="80" x2="16" y2="82" /> <!-- Left Arm -->
                        <line x1="20" y1="80" x2="24" y2="82" /> <!-- Right Arm -->
                        <line x1="20" y1="86" x2="16" y2="92" /> <!-- Left Leg -->
                        <line x1="20" y1="86" x2="24" y2="92" /> <!-- Right Leg -->
                    </g>
                </svg>
            </div>
        `;
        document.body.appendChild(loaderWrapper);
    },

    hideLoader: function() {
        const loader = document.getElementById('jlpt-global-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
};

// Global Security Settings
document.addEventListener('contextmenu', event => event.preventDefault()); // Disable right click

// Global Mobile Navigation Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelector('.nav-links');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (navLinks && mobileMenuBtn) {
        if (!document.getElementById('mobileOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'mobileOverlay';
            overlay.className = 'mobile-overlay';
            document.body.appendChild(overlay);
        }
        
        const overlay = document.getElementById('mobileOverlay');

        function toggleMobileNav() {
            const isOpening = !navLinks.classList.contains('nav-active');
            navLinks.classList.toggle('nav-active');
            overlay.classList.toggle('active');
            document.body.style.overflow = isOpening ? 'hidden' : '';
        }

        function closeMobileNav() {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        mobileMenuBtn.addEventListener('click', toggleMobileNav);
        overlay.addEventListener('click', closeMobileNav);
        
        navLinks.querySelectorAll('a').forEach(anchor => {
            anchor.addEventListener('click', closeMobileNav);
        });
    }
});
