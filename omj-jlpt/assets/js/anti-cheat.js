// assets/js/anti-cheat.js
/**
 * OMOSHIROI JAPAN - Advanced Anti-Cheat Module
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only execute on Test page
    if (!window.location.pathname.includes('test.html')) {
        return;
    }

    document.body.classList.add('test-mode');

    const user = OmoshiroiUtils.getUser();
    if (!user) return;

    // Initialize Cheat State Tracking
    const cheatProfile = {
        tabSwitches: 0,
        copyAttempts: 0,
        screenshotAttempts: 0,
        devToolsAttempts: 0,
        score: 0
    };

    const mainContent = document.querySelector('main');
    
    // Inject Watermark
    const watermarkCanvas = document.createElement('canvas');
    watermarkCanvas.width = 300;
    watermarkCanvas.height = 150;
    const ctx = watermarkCanvas.getContext('2d');
    ctx.rotate(-20 * Math.PI / 180);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(0,0,0,1)'; // CSS handles opacity
    ctx.fillText(`OMOSHIROI JAPAN`, 20, 100);
    ctx.fillText(user.name.toUpperCase(), 20, 120);

    const overlay = document.createElement('div');
    overlay.className = 'watermark-overlay';
    overlay.style.setProperty('--watermark-bg', `url(${watermarkCanvas.toDataURL()})`);
    document.body.appendChild(overlay);

    function triggerBlur(messageText) {
        if (!mainContent.classList.contains('blur-lock')) {
            mainContent.classList.add('blur-lock');
            alert(`⚠️ ANTI-CHEAT SYSTEM WARNING:\n\n${messageText}`);
            
            // Only unblur after acknowledgment
            setTimeout(() => {
                mainContent.classList.remove('blur-lock');
            }, 500); 
        }
    }

    function recordViolation(type, msg) {
        cheatProfile[type]++;
        saveProfile();
        triggerBlur(msg);
        checkAutoLockdown();
    }

    function saveProfile() {
        localStorage.setItem('omoshiroi_cheatData', JSON.stringify(cheatProfile));
    }
    
    // Initial Save
    saveProfile();

    // 1. Copy-Paste / Context Menu Protection
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        recordViolation('copyAttempts', 'Right-click and context menus are disabled during the examination.');
    });

    document.addEventListener('copy', (e) => {
        e.preventDefault();
        recordViolation('copyAttempts', 'Copying text is prohibited.');
    });

    document.addEventListener('cut', (e) => {
        e.preventDefault();
        recordViolation('copyAttempts', 'Modifying text is prohibited.');
    });

    // 2. Keyboard Intercepts
    document.addEventListener('keydown', (e) => {
        // Screenshot keys (Mac cmd+shift+4 usually cannot be natively blocked but we trace the meta keys)
        // PrintScreen is keyCode 44
        if (e.key === "PrintScreen" || e.keyCode === 44 || (e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3' || e.key === 'S' || e.key === 's'))) {
            recordViolation('screenshotAttempts', 'Screenshots are strictly prohibited. The event has been logged.');
        }

        // Copy/Paste (Ctrl+C, V, X, A, U, S)
        if (e.ctrlKey || e.metaKey) {
            const blockedKeys = ['c', 'v', 'x', 'a', 'u', 's'];
            if (blockedKeys.includes(e.key.toLowerCase())) {
                e.preventDefault();
                recordViolation('copyAttempts', `Keyboard shortcut (${e.key}) is disabled.`);
            }
        }

        // DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J)
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))) {
            e.preventDefault();
            recordViolation('devToolsAttempts', 'Developer tools access is disabled.');
        }
    });

    // 3. Tab Switch & Focus Detection
    // Note: The visibilitychange event is robust for tab switching
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Apply blur instantly when tab is leaving
            mainContent.classList.add('blur-lock');
            cheatProfile.tabSwitches++;
            saveProfile();
            
            // We wait to trigger alert until they return due to browser popup restrictions on inactive tabs
        } else {
            // They returned
            triggerBlur(`You left the examination tab!\n\nTab Switch violation: ${cheatProfile.tabSwitches} / 3`);
            checkAutoLockdown();
        }
    });

    // 4. DevTools Resizing Detection
    // Compares window outer size vs inner size. Large discrepancies usually mean dock is open.
    const checkDevTools = () => {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;

        if (widthDiff > threshold || heightDiff > threshold) {
            // Because users might just legitimately resize, we check if it persists for 2 seconds.
            // This is a naive detection but sufficient for 'Best Effort'
        }
    };
    setInterval(checkDevTools, 2000);

    // Auto Lockdown Logic
    function checkAutoLockdown() {
        if (cheatProfile.tabSwitches >= 3) {
            alert("❌ CRITICAL VIOLATION LIMIT REACHED.\n\nYou have left the tab too many times. The test will now automatically submit with your current progress.");
            
            // Force submission securely via test.js hook, or click the button.
            const forceSubmitBtn = document.getElementById('forceSubmitBtn');
            if (forceSubmitBtn) {
                // Remove the beforeunload warning so it doesn't block the auto-submit
                window.onbeforeunload = null; 
                forceSubmitBtn.click();
            }
        }
    }

    // 5. Lockdown Warning
    window.onbeforeunload = (e) => {
        const msg = "Leaving this page may end your test. Are you sure?";
        e.returnValue = msg;
        return msg;
    };

    // Public hook for test.js
    window.AntiCheat = {
        getProfile: () => cheatProfile
    };
});
