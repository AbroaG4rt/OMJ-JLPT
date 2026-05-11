const fs = require('fs');

function replaceFileContents(path) {
    if (!fs.existsSync(path)) return;
    let css = fs.readFileSync(path, 'utf8');

    // CSS file specific variable updates
    if (path.endsWith('.css')) {
        css = css.replace(/--bg-color/g, '--background');
        css = css.replace(/--paper-bg/g, '--surface');
        css = css.replace(/--primary-color/g, '--primary');
        css = css.replace(/--sakura-accent/g, '--primary-light');
        
        css = css.replace(/header \{[\s\S]*?z-index: 1000;\r?\n\}/, 
`header {
    background-color: var(--secondary);
    border-bottom: 1px solid var(--secondary);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 1000;
}`);
        
        css = css.replace(/\.brand \{[\s\S]*?\}/, 
`.brand {
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--background);
    text-decoration: none;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}`);
        
        css = css.replace(/\.nav-links a \{[\s\S]*?\}/,
`.nav-links a {
    color: var(--background);
    text-decoration: none;
    font-size: 0.95rem;
    transition: var(--transition);
    opacity: 0.85;
}`);

        css = css.replace(/\.nav-links a:hover \{[\s\S]*?\}/,
`.nav-links a:hover {
    color: var(--accent);
    opacity: 1;
}`);
        
        css = css.replace(/\.btn-primary \{[\s\S]*?\}/,
`.btn-primary {
    background-color: var(--primary);
    color: var(--background);
}`);
        css = css.replace(/\.btn-primary:hover \{[\s\S]*?\}/,
`.btn-primary:hover {
    background-color: var(--primary-hover);
}`);
    } else {
        // HTML Templates overrides
        css = css.replace(/--bg-color/g, '--background');
        css = css.replace(/--paper-bg/g, '--surface');
        css = css.replace(/--primary-color/g, '--primary');
        css = css.replace(/--sakura-accent/g, '--primary-light');
        css = css.replace(/<span id="userNameDisplay" class="hidden" style="font-weight: 600; color: var\(--text-primary\);/g, '<span id="userNameDisplay" class="hidden" style="font-weight: 600; color: var(--background);');
        css = css.replace(/<span id="guestLabel" class="hidden" style="font-size: 0.9rem; color: var\(--text-secondary\);/g, '<span id="guestLabel" class="hidden" style="font-size: 0.9rem; color: var(--surface); opacity: 0.8;');
    }

    fs.writeFileSync(path, css);
}

const files = [
    'assets/css/style.css',
    'id/login.html', 'id/dashboard.html', 'id/result.html', 'id/history.html', 'id/level.html',
    'en/login.html', 'en/dashboard.html', 'en/result.html', 'en/history.html', 'en/level.html',
    'index.html', 'test.html'
];
files.forEach(replaceFileContents);
console.log('Update complete.');
