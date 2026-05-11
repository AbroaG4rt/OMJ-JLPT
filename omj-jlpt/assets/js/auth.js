// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const successTarget = window.__loginSuccessTarget || 'dashboard.html';
    const lang = localStorage.getItem('lang') || 'id';

    // ── If already logged in, redirect ──────────────────────────────────────
    const localStr   = localStorage.getItem('omoshiroi_user');
    const sessionStr = sessionStorage.getItem('omoshiroi_user');
    let hasSession   = false;

    if (localStr)   { try { hasSession = JSON.parse(localStr).remember;  } catch(e){} }
    if (sessionStr) { hasSession = true; }

    if (hasSession) {
        window.location.href = successTarget;
        return;
    }

    // ── Toggle Password Visibility ───────────────────────────────────────────
    const toggleBtn  = document.getElementById('togglePasswordBtn');
    const pwInput    = document.getElementById('password');
    if (toggleBtn && pwInput) {
        toggleBtn.addEventListener('click', e => {
            e.preventDefault();
            const isHidden = pwInput.type === 'password';
            pwInput.type = isHidden ? 'text' : 'password';
            toggleBtn.textContent = isHidden ? '👁️‍🗨️' : '👁️';
        });
    }

    // ── Login Form Submit ────────────────────────────────────────────────────
    const loginForm  = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            if (!username) return;

            const submitBtn = loginForm.querySelector('[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }

            try {
                let response;
                try {
                    response = await fetch('../data/users.json');
                    if (!response.ok) throw new Error();
                } catch(_) {
                    response = await fetch('data/users.json');
                }

                const users = await response.json();
                const matched = users.find(u =>
                    u.name.toLowerCase() === username.toLowerCase() && u.password === password
                );

                if (matched) {
                    // ✅ Valid account — use role from JSON (premium or guest)
                    createSession(matched.name, matched.role || 'guest', password);
                } else {
                    if (loginError) {
                        loginError.classList.remove('hidden');
                        loginError.textContent = lang === 'id'
                            ? 'Akun tidak ditemukan. Periksa nama dan kata sandi Anda.'
                            : 'Account not found. Please check your credentials.';
                    }
                }
            } catch (err) {
                console.error('[Auth] Login error:', err);
                if (loginError) {
                    loginError.classList.remove('hidden');
                    loginError.textContent = 'System Error: Cannot validate login. Please try again.';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = lang === 'id' ? 'MULAI SESI' : 'START SESSION';
                }
            }
        });
    }

    // ── Demo / Guest Access Button ───────────────────────────────────────────
    const demoBtn = document.getElementById('demoAccessBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', e => {
            e.preventDefault();
            createSession('Demo Guest', 'guest', '');
        });
    }

    // ── Continue as Guest Link (no form) ─────────────────────────────────────
    const guestLink = document.getElementById('continueAsGuestBtn');
    if (guestLink) {
        guestLink.addEventListener('click', e => {
            e.preventDefault();
            createSession('Demo Guest', 'guest', '');
        });
    }

    // ── Create Session ────────────────────────────────────────────────────────
    function createSession(name, role, password) {
        const rememberEl = document.getElementById('rememberMe');
        const remember   = rememberEl ? rememberEl.checked : false;

        const sessionData = {
            user: {
                name,
                role,
                loginTime: Date.now(),
                password: password || ''
            },
            remember
        };

        const payload = JSON.stringify(sessionData);
        if (remember) {
            localStorage.setItem('omoshiroi_user', payload);
        } else {
            sessionStorage.setItem('omoshiroi_user', payload);
        }

        window.location.href = successTarget;
    }
});
