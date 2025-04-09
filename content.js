(function() {
    'use strict';

    // --- --- --- --- --- --- --- --- --- --- --- ---
    // --- CONFIGURATION & SELECTORS (ADJUST IF BROKEN!) ---
    // --- --- --- --- --- --- --- --- --- --- --- ---
    const PANEL_ID = 'dynamic-sender-filter-panel'; // Use the ID from styles.css
    const PANEL_COLLAPSED_CLASS = 'collapsed';
    const ACTIVE_FILTER_CLASS = 'sender-filter-active';
    const CONTENT_SHIFT_CLASS = 'content-shifted-by-panel';
    const DARK_THEME_CLASS = 'dark-theme'; // Class for dark mode styling

    const CHECK_INTERVAL_MS = 1000;
    const MAX_CHECKS = 30;
    const DEBOUNCE_DELAY_MS = 750; // Debounce for initial scan trigger

    // --- SELECTORS (VERY LIKELY TO NEED UPDATES - User Provided) ---
    // Parent element to inject the panel INTO. Should contain both the standard nav and main content.
    const INJECTION_PARENT_SELECTOR = '.aqk'; // User provided - verify with Inspect Element!
    // The element to inject the panel *BEFORE*. Usually the main content area wrapper.
    const INJECTION_REFERENCE_NODE_SELECTOR = '.aeN'; // User provided - verify with Inspect Element!
    // The main content element that needs its margin adjusted.
    const MAIN_CONTENT_SELECTOR = '.aeN'; // User provided - verify with Inspect Element!

    // Selectors for scanning emails
    const EMAIL_CONTAINER_SELECTOR = 'div[role="main"] .Cp';
    const EMAIL_ROW_SELECTOR = 'tr[role="row"].zA';
    const SENDER_NAME_SELECTOR = '.yW span[email]';
    const SENDER_EMAIL_ATTRIBUTE = 'email';
    const SENDER_NAME_FALLBACK_SELECTOR = '.yP';

    const PANEL_WIDTH_PX = 200; // Width of the expanded panel - Note: This is now controlled by CSS variable --panel-width
    const PANEL_COLLAPSED_WIDTH_PX = 40; // Width when collapsed - Note: This is now controlled by CSS variable --panel-collapsed-width

    // Dark Mode Detection: Class added to BODY element by Gmail (Inspect body in dark mode)
    const GMAIL_DARK_MODE_INDICATOR = 'dark'; // ADJUST THIS based on inspecting the <body> element in dark mode!
    // --- --- --- --- --- --- --- --- --- --- --- ---

    let checkCounter = 0;
    let panelInjected = false;
    let initialScanComplete = false;
    let emailContainerObserver = null;
    // --- Use a Set to store unique first words directly ---
    let uniqueSendersCache = new Set();
    let themeObserver = null; // For observing theme changes on body

    console.log("Gmail Sender Filter Sidebar: Script starting...");

    // --- UTILITY FUNCTIONS (Define Early) ---
    /** Debounce function */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- CORE FUNCTIONS ---

    /** Detects Gmail theme and applies class to panel */
    function detectAndApplyTheme() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        const isDarkMode = document.body.classList.contains(GMAIL_DARK_MODE_INDICATOR);
        if (isDarkMode) {
            panel.classList.add(DARK_THEME_CLASS);
        } else {
            panel.classList.remove(DARK_THEME_CLASS);
        }
        // console.log(`Gmail Sender Filter Sidebar: Theme set to ${isDarkMode ? 'Dark' : 'Light'}`);
    }

    /** Creates the panel structure (HTML), including the refresh button. */
    function createPanelElement() {
        const panel = document.createElement('div');
        panel.id = PANEL_ID;

        // Header (Title + Refresh + Toggle)
        const header = document.createElement('div');
        header.id = `${PANEL_ID}-header`;
        const title = document.createElement('h3');
        title.textContent = 'Filter by Sender';

        // --- Create Refresh Button ---
        const refreshButton = document.createElement('button');
        refreshButton.id = `${PANEL_ID}-refresh`;
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
        refreshButton.addEventListener('click', handleRefreshClick); // Add listener
        // --- End Refresh Button ---

        // Create Toggle Button (same as before)
        const toggleButton = document.createElement('button');
        toggleButton.id = `${PANEL_ID}-toggle`;
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
        toggleButton.addEventListener('click', togglePanelCollapse);

        // Append elements to header
        header.appendChild(title);
        header.appendChild(refreshButton); // Add refresh button
        header.appendChild(toggleButton);
        panel.appendChild(header);

        // List Container (same as before)
        const listContainer = document.createElement('div');
        listContainer.id = `${PANEL_ID}-list-container`;
        const list = document.createElement('ul');
        list.id = `${PANEL_ID}-list`;
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
        panel.addEventListener('click', handlePanelClick); // Handles filter clicks

        return panel;
    }

    /** Toggles the collapsed state of the panel. */
    function togglePanelCollapse() {
        const panel = document.getElementById(PANEL_ID);
        const parentContainer = document.querySelector(INJECTION_PARENT_SELECTOR) || document.body;
        if (!panel || !parentContainer) return;

        const isCollapsed = panel.classList.toggle(PANEL_COLLAPSED_CLASS);
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
                 parentContainer.classList.remove(CONTENT_SHIFT_CLASS);
             } else {
                 parentContainer.classList.add(CONTENT_SHIFT_CLASS);
             }
        } else {
             console.warn("Panel injected into body, content shifting via class not applied.");
        }
    }

    /** Extracts sender name and email from a single email row element. */
    function extractSenderFromRow(rowElement) {
        let nameElement = rowElement.querySelector(SENDER_NAME_SELECTOR);
        let email = nameElement ? nameElement.getAttribute(SENDER_EMAIL_ATTRIBUTE) : null;
        let name = nameElement ? (nameElement.textContent.trim() || email) : null;

        if (!email || !name) {
            nameElement = rowElement.querySelector(SENDER_NAME_FALLBACK_SELECTOR);
            if (nameElement) {
                 name = name || nameElement.textContent.trim();
                 if (!email) {
                     const potentialEmailElement = nameElement.closest('td')?.querySelector('[title*="@"]');
                     if (potentialEmailElement) {
                         const titleAttr = potentialEmailElement.getAttribute('title');
                         const emailMatch = titleAttr.match(/[\w\.\-]+@[\w\.\-]+\.\w+/);
                         if (emailMatch) email = emailMatch[0];
                     }
                 }
            }
        }

        if (name) {
            name = name.replace(/\s+/g, ' ').trim();
            if (!name) name = email || "Unknown Sender";
            if (name !== "Unknown Sender") {
                 // Return full name, we extract first word later
                 return { name: name, email: email ? email.toLowerCase() : null };
            }
        }
        return null;
    }

    /** Scans currently visible emails, extracts unique first words, populates the panel list. */
    function scanAndPopulateList() {
        console.log("Gmail Sender Filter Sidebar: Scanning emails and populating list...");

        const panel = document.getElementById(PANEL_ID);
        const list = document.getElementById(`${PANEL_ID}-list`);
        if (!panel || !list) {
            console.error("Panel or list element not found during scan.");
            return;
        }

        // Ensure placeholder is visible during scan
        list.querySelectorAll('li:not(.clear-filter)').forEach(li => li.remove());
        let placeholderLi = list.querySelector('.placeholder');
        if (!placeholderLi) {
            placeholderLi = document.createElement('li');
            placeholderLi.className = 'placeholder';
            list.appendChild(placeholderLi);
        }
        placeholderLi.textContent = 'Scanning emails...';


        const emailContainer = document.querySelector(EMAIL_CONTAINER_SELECTOR);
        if (!emailContainer) {
            console.warn("Email container not found for scanning.");
            placeholderLi.textContent = 'Error: Email list not found.';
            return;
        }

        // --- Use Set for unique first words ---
        uniqueSendersCache.clear(); // Clear cache before re-scan
        const emailRows = emailContainer.querySelectorAll(EMAIL_ROW_SELECTOR);

        emailRows.forEach(row => {
            const senderInfo = extractSenderFromRow(row);
            if (senderInfo && senderInfo.name) {
                const firstWord = senderInfo.name.split(' ')[0].trim();
                if (firstWord) {
                    uniqueSendersCache.add(firstWord);
                }
            }
        });
        // --- End of Set logic ---

        // --- Update Panel ---
        placeholderLi.remove(); // Remove placeholder before adding results

        if (uniqueSendersCache.size === 0) {
            const noSendersLi = document.createElement('li');
            noSendersLi.className = 'placeholder';
            noSendersLi.textContent = 'No senders found in view.';
            list.appendChild(noSendersLi);
        } else {
            const sortedSenders = Array.from(uniqueSendersCache).sort((a, b) => {
                return a.localeCompare(b, undefined, { sensitivity: 'base' });
            });

            sortedSenders.forEach(firstWord => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.href = "#";
                link.textContent = firstWord;
                link.dataset.firstWord = firstWord;
                link.dataset.filterType = 'sender';
                li.appendChild(link);
                list.appendChild(li);
            });
        }
        console.log(`Gmail Sender Filter Sidebar: Scan complete. Found ${uniqueSendersCache.size} unique sender first words.`);
        updateActiveFilterHighlight(); // Update highlight after list is populated
    }

    /** Performs the very first scan and sets up completion state. */
    function performInitialScanAndPopulate() {
        if (initialScanComplete) return; // Only run the *very first* time

        scanAndPopulateList(); // Call the core logic

        // Only mark as complete and disconnect observer after the first successful scan
        initialScanComplete = true;
        if (emailContainerObserver) {
            emailContainerObserver.disconnect();
            emailContainerObserver = null;
            console.log("Gmail Sender Filter Sidebar: Initial Email list MutationObserver disconnected.");
        }
    }

    // Debounced version for triggering the initial scan
    const debouncedInitialScan = debounce(performInitialScanAndPopulate, DEBOUNCE_DELAY_MS);

    /** Handles clicks on the refresh button. */
    function handleRefreshClick(event) {
        event.stopPropagation(); // Prevent panel click listener if needed
        console.log("Gmail Sender Filter Sidebar: Refresh button clicked.");

        // Visually reset the list immediately for feedback
        const list = document.getElementById(`${PANEL_ID}-list`);
        if (list) {
            list.querySelectorAll('li:not(.clear-filter)').forEach(li => li.remove());
            let placeholderLi = list.querySelector('.placeholder');
            if (!placeholderLi) {
                placeholderLi = document.createElement('li');
                placeholderLi.className = 'placeholder';
                list.appendChild(placeholderLi);
            }
            placeholderLi.textContent = 'Refreshing...';
        }

        // Call the core scanning logic directly
        // Use a small timeout to allow the UI to update with "Refreshing..."
        setTimeout(scanAndPopulateList, 50);
    }

    /** Handles clicks within the panel for filtering (filter links). */
    function handlePanelClick(event) {
        // Check if the click was on the refresh button - if so, do nothing here
        if (event.target.closest(`#${PANEL_ID}-refresh`)) {
            return;
        }

        const target = event.target.closest('a'); // Find the nearest anchor link clicked
        if (target && target.closest(`#${PANEL_ID}`)) {
            event.preventDefault();
            const filterType = target.dataset.filterType;

            if (filterType === 'sender') {
                const firstWord = target.dataset.firstWord;
                if (firstWord) {
                    console.log(`Gmail Sender Filter Sidebar: Filtering Inbox by first word "${firstWord}"`);
                    const searchTerm = `in:inbox from:${firstWord}`;
                    const searchHash = `#search/${encodeURIComponent(searchTerm)}`;
                    window.location.hash = searchHash;
                }
            } else if (filterType === 'clear') {
                console.log("Gmail Sender Filter Sidebar: Clearing filter, going to Inbox.");
                window.location.hash = '#inbox';
            }
        }
    }

    /** Updates the active highlight based on the current URL hash (compares first words). */
    function updateActiveFilterHighlight() {
        const panel = document.getElementById(PANEL_ID);
        // Wait until scan is complete AND panel is injected before highlighting
        if (!panel || !initialScanComplete) return;
        const list = document.getElementById(`${PANEL_ID}-list`);
        if (!list) return;

        const currentHash = window.location.hash;
        let activeFilterName = null; // This should be the first word parsed from URL
        let isInInboxSearch = false;

        if (currentHash.startsWith('#search/')) {
            try {
                let searchQuery = decodeURIComponent(currentHash.substring(8));
                isInInboxSearch = /\bin:inbox\b/i.test(searchQuery);
                // Match non-whitespace chars after from:
                const fromMatch = searchQuery.match(/from:(\S+)/i);
                if (fromMatch && fromMatch[1]) {
                    activeFilterName = fromMatch[1];
                }
            } catch (e) { console.error("Error parsing search hash:", e); }
        }

        let activeFound = false;
        list.querySelectorAll('li a').forEach(a => { // Use simpler selector
            a.classList.remove(ACTIVE_FILTER_CLASS);
            const filterType = a.dataset.filterType;

            if (filterType === 'sender') {
                const linkFirstWord = a.dataset.firstWord; // Read directly
                // Highlight only if the first word matches AND it was an inbox search
                if (activeFilterName && isInInboxSearch && linkFirstWord && linkFirstWord.toLowerCase() === activeFilterName.toLowerCase()) {
                    a.classList.add(ACTIVE_FILTER_CLASS);
                    activeFound = true;
                }
            } else if (filterType === 'clear') {
                // Highlight "Show All" if in inbox/label view AND no specific inbox sender filter is active
                if (!activeFilterName && (currentHash.startsWith('#inbox') || currentHash.startsWith('#label') || currentHash === '' || currentHash === '#')) {
                     a.classList.add(ACTIVE_FILTER_CLASS);
                     activeFound = true;
                }
            }
        });

         // Ensure "Show All" is highlighted if effectively in inbox and no sender filter matches
         if (!activeFound && (currentHash.startsWith('#inbox') || currentHash.startsWith('#label') || currentHash === '' || currentHash === '#')) {
              const clearLink = list.querySelector('.clear-filter a');
              if(clearLink) clearLink.classList.add(ACTIVE_FILTER_CLASS);
         }
    }

    /** Tries to find the container and inject the panel structure. */
    function injectPanel() {
        if (document.getElementById(PANEL_ID)) {
            panelInjected = true;
            return true;
        }

        const parentContainer = document.querySelector(INJECTION_PARENT_SELECTOR);
        const referenceNode = parentContainer ? parentContainer.querySelector(INJECTION_REFERENCE_NODE_SELECTOR) : null;

        if (parentContainer && referenceNode) {
             console.log("Gmail Sender Filter Sidebar: Found container and reference node, injecting panel...");
             const panelElement = createPanelElement();
             parentContainer.insertBefore(panelElement, referenceNode);

             // Apply initial collapsed state & content shift using chrome.storage.local
             chrome.storage.local.get('senderPanelCollapsed', (result) => {
                 const startCollapsed = result.senderPanelCollapsed || false; // Default to false if not found
                 if (startCollapsed) {
                     panelElement.classList.add(PANEL_COLLAPSED_CLASS);
                 } else if (parentContainer !== document.body) {
                     parentContainer.classList.add(CONTENT_SHIFT_CLASS);
                 }
                 // Apply initial theme after checking storage
                 detectAndApplyTheme();
             });


             panelInjected = true;
             console.log("Gmail Sender Filter Sidebar: Panel structure injected.");
             return true;
        } else {
            console.log(`Gmail Sender Filter Sidebar: Could not find suitable injection point. Parent: ${parentContainer ? 'Found' : 'null'}, Reference: ${referenceNode ? 'Found' : 'null'}. Check INJECTION selectors.`);
            return false;
        }
    }

    /** Sets up the MutationObservers to watch for email list and theme changes. */
    function setupInitialObserver() {
        // 1. Observer for Email List Appearance
        const emailListTargetNode = document.body;
        if (!emailListTargetNode) return false; // Should not happen

        console.log("Gmail Sender Filter Sidebar: Setting up initial observer on body for email list...");
        emailContainerObserver = new MutationObserver((mutationsList, observer) => {
            // This observer only runs until the first scan is complete
            if (initialScanComplete) {
                 // It should have been disconnected already, but double-check
                 if (observer) observer.disconnect();
                 emailContainerObserver = null; // Clear reference
                 return;
            }
            const emailContainer = document.querySelector(EMAIL_CONTAINER_SELECTOR);
            if (emailContainer) {
                console.log("Gmail Sender Filter Sidebar: Email container detected by observer.");
                debouncedInitialScan(); // Trigger scan
                // performInitialScanAndPopulate will disconnect this observer upon completion
            }
        });
        emailContainerObserver.observe(emailListTargetNode, { childList: true, subtree: true });

        // Also trigger a check in case the container is already there
        if (document.querySelector(EMAIL_CONTAINER_SELECTOR)) {
             console.log("Gmail Sender Filter Sidebar: Email container already present on initial check.");
             debouncedInitialScan();
        }

        // 2. Observer for Theme Changes (runs continuously)
        if (!themeObserver) {
            console.log("Gmail Sender Filter Sidebar: Setting up theme observer on body attributes...");
            themeObserver = new MutationObserver(mutations => {
                 for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        // console.log("Body class changed, re-checking theme.");
                        detectAndApplyTheme();
                        break;
                    }
                }
            });
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }

        // 3. Listener for Hash Changes (for highlighting - runs continuously)
        // Ensure listener is only added once
        window.removeEventListener('hashchange', updateActiveFilterHighlight); // Remove previous if any
        window.addEventListener('hashchange', updateActiveFilterHighlight);

        return true; // Observer setup attempted
    }

    // --- INITIALIZATION ---
    const checkInterval = setInterval(() => {
        checkCounter++;

        if (!panelInjected) {
            injectPanel(); // Try to inject panel structure first
        }

        // Once panel structure is in, set up the observers if not already done
        // Note: setupInitialObserver now handles both email list and theme observers
        if (panelInjected && !emailContainerObserver && !initialScanComplete) {
             setupInitialObserver();
        }

        // Timeout condition
        if (initialScanComplete || checkCounter >= MAX_CHECKS) {
            clearInterval(checkInterval);
            if (!initialScanComplete && panelInjected) {
                 console.error("Gmail Sender Filter Sidebar: Timed out waiting for email list to appear for initial scan.");
                 const list = document.getElementById(`${PANEL_ID}-list`);
                 const placeholder = list ? list.querySelector('.placeholder') : null;
                 if (placeholder) placeholder.textContent = 'Error: Timeout finding emails.';
            } else if (!panelInjected) {
                 console.error("Gmail Sender Filter Sidebar: Timed out waiting for Gmail UI. Panel not injected.");
            } else {
                 console.log("Gmail Sender Filter Sidebar: Initialization check finished.");
                 // Observers are now managed internally (email observer disconnects itself, theme observer persists)
            }
        }
    }, CHECK_INTERVAL_MS);

})(); // End of wrapper
