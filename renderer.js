const fs = require('fs');

const tabList = document.getElementById('tab-list');
const contentArea = document.getElementById('content-area');
const btnAddTab = document.getElementById('btn-add-tab');

// Internal State
let tabs = [];
let activeTabId = null;

// The default set of elegant UI colors
const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#64748b'];

function renderTabs() {
    // Use DOM-diffing logic to avoid recreation blink
    tabs.forEach((tab, index) => {
        let btn = document.getElementById(`tab-btn-${tab.id}`);
        if (!btn) {
            btn = document.createElement('button');
            btn.id = `tab-btn-${tab.id}`;
            btn.className = 'tab';
            btn.style.setProperty('--theme-color', tab.color);
            btn.innerHTML = `
                <span class="tab-name">${tab.name}</span>
                <div class="swoop-container left">
                    <div class="swoop-solid"></div>
                </div>
                <div class="swoop-container right">
                    <div class="swoop-solid"></div>
                </div>
            `;
            btn.onclick = () => activateTab(tab.id);
            tabList.appendChild(btn);
        } else {
            btn.querySelector('.tab-name').textContent = tab.name;
            btn.style.setProperty('--theme-color', tab.color);
        }

        // Exact Solid State Z-Index Cascading Stack
        if (tab.id === activeTabId) {
            btn.classList.add('active');
            btn.style.zIndex = 100;
        } else {
            btn.classList.remove('active');
            btn.style.zIndex = tabs.length - index;
        }
    });
}

function activateTab(id) {
    activeTabId = id;
    renderTabs();

    // Use active classes which toggle CSS opacity instead of display:none
    // This completely solves the problem of iframes reloading on click!
    document.querySelectorAll('.section').forEach(sec => {
        if (sec.id === `section-${id}`) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });

    // Handle Content Blend Matrix
    let blend = document.getElementById('content-blend');
    if (!blend) {
        blend = document.createElement('div');
        blend.id = 'content-blend';
        document.querySelector('.content').appendChild(blend);
    }

    // Always trigger sequenced transition on tab switch
    const color = tabs.find(t => t.id === id)?.color || '#111111';

    // Reset transition state
    blend.classList.remove('active');

    // Use timeout to allow CSS to reset opacity before applying the new color and springing back in
    setTimeout(() => {
        blend.style.setProperty('--theme-color', color);
        blend.classList.add('active');
    }, 50);
}

function createSectionEl(id, color) {
    const sec = document.createElement('div');
    sec.id = `section-${id}`;
    sec.className = 'section';
    sec.style.setProperty('--theme-color', color);
    contentArea.appendChild(sec);
    return sec;
}

function compileAndRunJSX(code, container) {
    try {
        let processedCode = code;

        // Auto-detect the main component name before stripping export
        let mainComponent = 'App';
        const exportMatch = processedCode.match(/export\s+default\s+(?:function\s+)?([A-Z]\w+)/);
        if (exportMatch) {
            mainComponent = exportMatch[1];
        } else {
            const funcMatch = processedCode.match(/function\s+([A-Z]\w+)/);
            if (funcMatch) mainComponent = funcMatch[1];
        }

        // Strip react imports to rely on window.React
        processedCode = processedCode.replace(/import\s+React.*?from\s+['"]react['"];?/g, '');
        processedCode = processedCode.replace(/import\s+{([^}]+)}\s+from\s+['"]react['"];?/g, 'const {$1} = window.React;');
        processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
        processedCode = processedCode.replace(/export\s+default\s+/g, '');

        // Append rendering setup
        processedCode += `\n\nconst root = ReactDOM.createRoot(document.getElementById('${container.id}'));\nroot.render(React.createElement(${mainComponent}));`;

        const compiled = Babel.transform(processedCode, { presets: ['env', 'react'] }).code;

        const script = document.createElement('script');
        // Wrap in IIFE so inner variables (like COLORS) don't conflict with our renderer scope
        script.textContent = `(function() {\n${compiled}\n})();`;
        container.appendChild(script);
    } catch (err) {
        container.innerHTML = `<div style="color:#ef4444;padding:40px;font-family:monospace;font-size:14px;background:#0f172a;height:100%;"><h3 style="margin-top:0;">Error compiling JSX:</h3><pre style="white-space:pre-wrap;">${err.message}</pre></div>`;
    }
}

function addTab(name, color, type, code) {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    tabs.push({ id, name, color, type, code });

    const sec = createSectionEl(id, color);

    if (type === 'setup') {
        renderSetupForm(sec, id);
    } else if (type === 'html') {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = code;
        sec.appendChild(iframe);
    } else if (type === 'jsx') {
        const containerId = `react-root-${id}`;
        sec.innerHTML = `<div id="${containerId}" style="min-height:100%; padding:0; box-sizing:border-box;"></div>`;
        // Delay slightly to ensure Absolute DOM is inserted before React targets it
        setTimeout(() => {
            compileAndRunJSX(code, sec.querySelector(`#${containerId}`));
        }, 50);
    }

    activateTab(id);
}

function renderSetupForm(container, tabId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'setup-container';

    const currentTab = tabs.find(t => t.id === tabId);
    const selectedColor = currentTab?.color || '#3b82f6';

    wrapper.innerHTML = `
    <div class="setup-form">
      <h2>Configure Sandbox Layout</h2>
      
      <div class="form-group">
        <label>Tab Context Name</label>
        <input type="text" id="setup-name-${tabId}" placeholder="e.g. Navigation Demo" value="${currentTab.name === 'New Sandbox' ? '' : currentTab.name}" autocomplete="off" />
      </div>
      
      <div class="form-group">
        <label>Theme Color</label>
        <div class="custom-color-control">
          <div class="color-picker-input-wrap" style="background-color: ${selectedColor};" id="custom-color-wrap-${tabId}">
            <input type="color" id="setup-color-${tabId}" value="${selectedColor}" />
          </div>
          <input type="text" id="setup-hex-${tabId}" class="hex-input" value="${selectedColor.toUpperCase()}" spellcheck="false" autocomplete="off" maxlength="7"/>
        </div>
      </div>
      
      <div class="form-group">
        <label>Environment Context</label>
        <select id="setup-type-${tabId}">
          <option value="html" ${currentTab.type === 'html' ? 'selected' : ''}>Standalone HTML (iframe)</option>
          <option value="jsx" ${currentTab.type === 'jsx' ? 'selected' : ''}>React 18 JSX Environment (Babel)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Source Payload</label>
        <textarea id="setup-code-${tabId}" placeholder="// Paste functional component or HTML block..." spellcheck="false">${currentTab.code || ''}</textarea>
      </div>
      
      <button class="btn-primary" id="setup-btn-${tabId}">Inject & Run Code</button>
    </div>
  `;
    container.appendChild(wrapper);

    // Setup Custom Color Logic
    const colorInput = document.getElementById(`setup-color-${tabId}`);
    const hexInput = document.getElementById(`setup-hex-${tabId}`);
    const customWrap = document.getElementById(`custom-color-wrap-${tabId}`);

    let activeColor = selectedColor;

    function updateColor(color) {
        activeColor = color;
        customWrap.style.backgroundColor = color;
        colorInput.value = color; // sync native picker
        hexInput.value = color.toUpperCase(); // sync hex text box
    }

    colorInput.addEventListener('input', (e) => {
        updateColor(e.target.value);
    });

    hexInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            updateColor(val);
        }
    });

    // Action Button Logic
    document.getElementById(`setup-btn-${tabId}`).onclick = () => {
        const nameEl = document.getElementById(`setup-name-${tabId}`);
        const name = nameEl.value.trim() || 'Untitled Session';
        const type = document.getElementById(`setup-type-${tabId}`).value;
        const code = document.getElementById(`setup-code-${tabId}`).value;

        // Update tab memory
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
            tabs[tabIndex].name = name;
            tabs[tabIndex].color = activeColor;
            tabs[tabIndex].type = type;
            tabs[tabIndex].code = code;
        }

        // Convert current section into presentation mode
        container.innerHTML = '';
        container.className = 'section active'; // Keep active during switch
        container.style.setProperty('--theme-color', activeColor);
        renderTabs();

        if (type === 'html') {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = code;
            container.appendChild(iframe);
        } else if (type === 'jsx') {
            const rootId = `react-root-${tabId}`;
            container.innerHTML = `<div id="${rootId}" style="min-height:100%; padding:0; box-sizing:border-box;"></div>`;
            setTimeout(() => compileAndRunJSX(code, container.querySelector(`#${rootId}`)), 50);
        }
    };
}

// Add Tab Hook
btnAddTab.onclick = () => {
    addTab('New Sandbox', '#3b82f6', 'setup', '');
};

// Initial Read Sequence
let ex1Code = '';
let ex2Code = '';
try {
    ex1Code = fs.readFileSync('/Users/rjack/Desktop/almanac/electron-tabs/examples/farmsim.jsx', 'utf-8');
    ex2Code = fs.readFileSync('/Users/rjack/Desktop/almanac/electron-tabs/examples/beyondtensegrity.html', 'utf-8');
} catch (e) {
    console.error("Failed to load examples directly", e);
}

// Boot Sequence
if (!ex1Code && !ex2Code) {
    addTab('Setup', '#334155', 'setup', ''); // Fallback setup
}

if (ex1Code) { addTab('Farm Sim', '#10b981', 'jsx', ex1Code); }
if (ex2Code) { addTab('Tensegrity', '#c8a96e', 'html', ex2Code); }

if (tabs.length > 0) {
    activateTab(tabs[0].id);
}
