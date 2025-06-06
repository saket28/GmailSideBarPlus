import * as config from './config.js';
import { handlePanelClick } from './eventHandlers.js'; // Import needed handlers
import { state } from './state.js';
import { log } from './utils.js';

/** Detects Gmail theme and applies class to panel */
export function detectAndApplyTheme() {
    if (state.themeApplied) return; // Only run once
    const panel = document.getElementById(config.PANEL_ID);
    if (!panel) return;
    const el = document.querySelector('.aim a');
    if (!el) return; // Element not found
    const elColor = getComputedStyle(el).color;
    const isDarkMode = elColor === 'rgb(255, 255, 255)'; // Check if the element is white (dark mode)
  
    if (isDarkMode) {
        panel.classList.add(config.DARK_THEME_CLASS);
    } else {
        panel.classList.remove(config.DARK_THEME_CLASS);
    }
    state.themeApplied = true;
    log(`Theme set to ${isDarkMode ? 'Dark' : 'Light'}`);
}

/** Creates the panel structure (HTML). */
export function createPanelElement() {
    const panel = document.createElement('div');
    panel.id = config.PANEL_ID;

    // Header with settings button
    const header = document.createElement('div');
    header.id = `${config.PANEL_ID}-header`;
    const title = document.createElement('h3');
    title.textContent = 'GMessenger';

    // Create settings button with SVG using DOM methods
    const settingsBtn = document.createElement('button');
    settingsBtn.id = `${config.PANEL_ID}-settings`;
    settingsBtn.title = 'Open Settings';
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    
    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z');
    
    // Append elements
    svg.appendChild(path);
    settingsBtn.appendChild(svg);
    
    settingsBtn.addEventListener('click', () => {
        window.postMessage({ type: 'GSS_OPEN_SETTINGS' }, '*');
    });
    
    header.appendChild(title);
    header.appendChild(settingsBtn);
    panel.appendChild(header);

    // List Container (same as before)
    const listContainer = document.createElement('div');
    listContainer.id = `${config.PANEL_ID}-list-container`;
    const list = document.createElement('ul');
    list.id = `${config.PANEL_ID}-list`;
    const clearLi = document.createElement('li');
    clearLi.className = 'clear-filter';
    const clearLink = document.createElement('a');
    clearLink.href = "#";
    clearLink.textContent = 'Show All';
    clearLink.dataset.filterType = 'clear';
    clearLi.appendChild(clearLink);
    list.appendChild(clearLi);
    const placeholderLi = document.createElement('li');
    placeholderLi.className = 'placeholder';
    placeholderLi.textContent = 'Scanning emails...';
    list.appendChild(placeholderLi);
    listContainer.appendChild(list);
    panel.appendChild(listContainer);

    // Add main click listener for filtering (delegated)
    panel.addEventListener('click', handlePanelClick); // Handles filter clicks from eventHandlers

    return panel;
}

/** Tries to find the container and inject the panel structure. Returns true if injected, false otherwise. */
export function injectPanel() {
    if (document.getElementById(config.PANEL_ID)) {
        return true; // Already injected
    }

    const parentContainer = document.querySelector(config.INJECTION_PARENT_SELECTOR);
    const referenceNode = parentContainer ? parentContainer.querySelector(config.INJECTION_REFERENCE_NODE_SELECTOR) : null;

    if (parentContainer && referenceNode) {
        log("Found container and reference node, injecting panel...");
        const panelElement = createPanelElement();
        parentContainer.insertBefore(panelElement, referenceNode);       
        setTimeout(() => detectAndApplyTheme(), 500);        
        log("Panel structure injected.");
        return true;
    } else {
        log(`Could not find suitable injection point. Parent: ${parentContainer ? 'Found' : 'null'}, Reference: ${referenceNode ? 'Found' : 'null'}. Check INJECTION selectors.`, 'warn');
        return false;
    }
}
