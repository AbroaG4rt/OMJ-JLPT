/* assets/js/language-switch.js */

const I18n = {
    currentLang: localStorage.getItem('lang') || 'id', // Default to Bahasa Indonesia as requested
    translations: {},

    // Entry hook
    init: async function() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        
        // 1. Excluded pages -> Load definitions but do not enforce redirect routing logic
        if (filename.startsWith('test.html')) {
            await this.loadTranslations(this.currentLang);
            return;
        }

        // 2. Identify suffix for translation enforcement
        const suffixMatch = filename.match(/_([a-z]{2})\.html/);
        if (suffixMatch) {
            const pageLang = suffixMatch[1];
            if (pageLang !== this.currentLang) {
                // Instantly redirect to correct language preference to prevent rendering mismatched logic
                this.redirectTo(filename.replace(`_${pageLang}.html`, `_${this.currentLang}.html`));
                return;
            }
        } else if (filename !== 'index.html' && filename !== 'login.html' && filename !== 'dashboard.html' && filename !== 'level.html' && filename !== 'result.html') {
            // Ignore anything outside known environment constraints
        }

        // 3. Authorized matching HTML clone verified. Load dynamic assets.
        await this.loadTranslations(this.currentLang);
        this.injectLanguageDropdown();
    },

    loadTranslations: async function(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
            } else {
                console.warn(`Translation JSON not found for ${lang}`);
            }
        } catch (e) {
            console.error("Failed to load translation file", e);
            this.translations = {}; // fail secure
        }
    },

    switchLanguage: function(lang) {
        localStorage.setItem('lang', lang);
        this.currentLang = lang;
        
        let path = window.location.pathname;
        let filename = path.split('/').pop() || 'index.html';
        
        // Do not redirect `test.html` on switch. We typically wouldn't even render the switch on `test.html`.
        if (filename.startsWith('test.html')) return; 

        // Strip queries/hashes just in case for reliable routing
        const baseRoute = filename.split('?')[0].split('#')[0];

        // Perform rewrite swap
        if (baseRoute.match(/_([a-z]{2})\.html/)) {
            this.redirectTo(baseRoute.replace(/_[a-z]{2}\.html/, `_${lang}.html`));
        } else {
            // E.g. raw explicit paths catching the edge case
            this.redirectTo(baseRoute.replace('.html', `_${lang}.html`));
        }
    },

    redirectTo: function(filename) {
        window.location.replace(filename);
    },

    // Simple nested map transversal for localization text
    t: function(keyString) {
        const keys = keyString.split('.');
        let val = this.translations;
        for (let k of keys) {
            if (val && val[k]) val = val[k];
            else return keyString; // Fallback to raw key if missing
        }
        return val;
    },

    injectLanguageDropdown: function() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginLeft = '1rem';
        container.style.verticalAlign = 'middle';
        
        container.innerHTML = `
            <select id="langSwitcher" class="form-control" style="background-color: var(--card-bg); padding: 0.2rem 1.8rem 0.2rem 0.5rem; width: auto; font-size: 0.85rem; border-color: #ddd;">
                <option value="id" ${this.currentLang === 'id' ? 'selected' : ''}>ID - Bahasa</option>
                <option value="en" ${this.currentLang === 'en' ? 'selected' : ''}>EN - English</option>
            </select>
        `;

        navLinks.appendChild(container);

        document.getElementById('langSwitcher').addEventListener('change', (e) => {
            this.switchLanguage(e.target.value);
        });
    }
};

// Start logic chain instantly
I18n.init();

// Export globally for script.js / result.js consumption
window.I18n = I18n;
