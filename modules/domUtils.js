import * as config from './config.js';
import { handleRefreshClick, handlePanelClick } from './eventHandlers.js'; // Import needed handlers

/** Detects Gmail theme and applies class to panel */
export function detectAndApplyTheme() {
    const panel = document.getElementById(config.PANEL_ID);
    if (!panel) return;
    const isDarkMode = document.body.classList.contains(config.GMAIL_DARK_MODE_INDICATOR);
    if (isDarkMode) {
        panel.classList.add(config.DARK_THEME_CLASS);
    } else {
        panel.classList.remove(config.DARK_THEME_CLASS);
    }
    // console.log(`Gmail Sender Filter Sidebar: Theme set to ${isDarkMode ? 'Dark' : 'Light'}`);
}

/** Creates the panel structure (HTML), including the refresh button. */
export function createPanelElement() {
    const panel = document.createElement('div');
    panel.id = config.PANEL_ID;

    // Header (Title + Refresh + Toggle)
    const header = document.createElement('div');
    header.id = `${config.PANEL_ID}-header`;
    const title = document.createElement('h3');
    title.textContent = 'Filter by Sender';

    // --- Create Refresh Button ---
    const refreshButton = document.createElement('button');
    refreshButton.id = `${config.PANEL_ID}-refresh`;
    refreshButton.title = "Refresh Sender List";
    refreshButton.textContent = ''; // Clear text content
    const svgNamespaceRefresh = "http://www.w3.org/2000/svg";
    const svgIconRefresh = document.createElementNS(svgNamespaceRefresh, "svg");
    svgIconRefresh.setAttribute("viewBox", "0 0 24 24");
    svgIconRefresh.setAttribute("width", "20");
    svgIconRefresh.setAttribute("height", "20");
    svgIconRefresh.setAttribute("fill", "currentColor");
    // SVG Path for Refresh Icon (Example: Material Design Icons Refresh)
    const pathRefresh = document.createElementNS(svgNamespaceRefresh, "path");
    pathRefresh.setAttribute("d", "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z");
    svgIconRefresh.appendChild(pathRefresh);
    refreshButton.appendChild(svgIconRefresh);
    refreshButton.addEventListener('click', handleRefreshClick); // Add listener from eventHandlers
    // --- End Refresh Button ---

    // Create Toggle Button (same as before)
    const toggleButton = document.createElement('button');
    toggleButton.id = `${config.PANEL_ID}-toggle`;
    toggleButton.title = "Toggle Sender Panel";
    toggleButton.textContent = '';
    const svgNamespaceToggle = "http://www.w3.org/2000/svg";
    const svgIconToggle = document.createElementNS(svgNamespaceToggle, "svg");
    svgIconToggle.setAttribute("viewBox", "0 0 24 24");
    svgIconToggle.setAttribute("width", "20");
    svgIconToggle.setAttribute("height", "20");
    svgIconToggle.setAttribute("fill", "currentColor");
    const pathToggle = document.createElementNS(svgNamespaceToggle, "path");
    pathToggle.setAttribute("d", "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z");
    svgIconToggle.appendChild(pathToggle);
    toggleButton.appendChild(svgIconToggle);
    toggleButton.addEventListener('click', togglePanelCollapse); // Add listener (defined below)

    // Append elements to header
    header.appendChild(title);
    header.appendChild(refreshButton); // Add refresh button
    header.appendChild(toggleButton);
    panel.appendChild(header);

    // List Container (same as before)
    const listContainer = document.createElement('div');
    listContainer.id = `${config.PANEL_ID}-list-container`;
    const list = document.createElement('ul');
    list.id = `${config.PANEL_ID}-list`;
    const clearLi = document.createElement('li');
    clearLi.className = 'clear-filter';
    const clearLink = document.createElement('a');
    clearLink.href = "#inbox";
    clearLink.textContent = 'Show All (Inbox)';
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

/** Toggles the collapsed state of the panel. */
export function togglePanelCollapse() {
    const panel = document.getElementById(config.PANEL_ID);
    const parentContainer = document.querySelector(config.INJECTION_PARENT_SELECTOR) || document.body;
    if (!panel || !parentContainer) return;

    const isCollapsed = panel.classList.toggle(config.PANEL_COLLAPSED_CLASS);
    // Use chrome.storage.local for Chrome Extension
    chrome.storage.local.set({ senderPanelCollapsed: isCollapsed }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving collapsed state:", chrome.runtime.lastError);
        } else {
            console.log(`Panel ${isCollapsed ? 'collapsed' : 'expanded'}`);
        }
    });


    if (parentContainer !== document.body) {
         if (isCollapsed) {
             parentContainer.classList.remove(config.CONTENT_SHIFT_CLASS);
         } else {
             parentContainer.classList.add(config.CONTENT_SHIFT_CLASS);
         }
    } else {
         console.warn("Panel injected into body, content shifting via class not applied.");
    }
}

/** Tries to find the container and inject the panel structure. Returns true if injected, false otherwise. */
export function injectPanel() {
    if (document.getElementById(config.PANEL_ID)) {
        return true; // Already injected
    }

    const parentContainer = document.querySelector(config.INJECTION_PARENT_SELECTOR);
    const referenceNode = parentContainer ? parentContainer.querySelector(config.INJECTION_REFERENCE_NODE_SELECTOR) : null;

    if (parentContainer && referenceNode) {
         console.log("Gmail Sender Filter Sidebar: Found container and reference node, injecting panel...");
         const panelElement = createPanelElement();
         parentContainer.insertBefore(panelElement, referenceNode);

         // Apply initial collapsed state & content shift using chrome.storage.local
         chrome.storage.local.get('senderPanelCollapsed', (result) => {
             const startCollapsed = result.senderPanelCollapsed || false; // Default to false if not found
             if (startCollapsed) {
                 panelElement.classList.add(config.PANEL_COLLAPSED_CLASS);
             } else if (parentContainer !== document.body) {
                 parentContainer.classList.add(config.CONTENT_SHIFT_CLASS);
             }
             // Apply initial theme after checking storage
             detectAndApplyTheme();
         });

         console.log("Gmail Sender Filter Sidebar: Panel structure injected.");
         return true;
    } else {
        console.log(`Gmail Sender Filter Sidebar: Could not find suitable injection point. Parent: ${parentContainer ? 'Found' : 'null'}, Reference: ${referenceNode ? 'Found' : 'null'}. Check INJECTION selectors.`);
        return false;
    }
}
