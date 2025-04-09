import * as config from './config.js';
import { scanAndPopulateList } from './emailScanner.js';
import { state } from './state.js'; // Import state

/** Handles clicks on the refresh button. */
export function handleRefreshClick(event) {
    event.stopPropagation(); // Prevent panel click listener if needed
    console.log("Gmail Sender Filter Sidebar: Refresh button clicked.");

    // Visually reset the list immediately for feedback
    const list = document.getElementById(`${config.PANEL_ID}-list`);
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
export function handlePanelClick(event) {
    // Check if the click was on the refresh button - if so, do nothing here
    if (event.target.closest(`#${config.PANEL_ID}-refresh`)) {
        return;
    }

    const target = event.target.closest('a'); // Find the nearest anchor link clicked
    if (target && target.closest(`#${config.PANEL_ID}`)) {
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
export function updateActiveFilterHighlight() {
    const panel = document.getElementById(config.PANEL_ID);
    // Wait until scan is complete AND panel is injected before highlighting
    if (!panel || !state.initialScanComplete) return; // Use state variable
    const list = document.getElementById(`${config.PANEL_ID}-list`);
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
        a.classList.remove(config.ACTIVE_FILTER_CLASS);
        const filterType = a.dataset.filterType;

        if (filterType === 'sender') {
            const linkFirstWord = a.dataset.firstWord; // Read directly
            // Highlight only if the first word matches AND it was an inbox search
            if (activeFilterName && isInInboxSearch && linkFirstWord && linkFirstWord.toLowerCase() === activeFilterName.toLowerCase()) {
                a.classList.add(config.ACTIVE_FILTER_CLASS);
                activeFound = true;
            }
        } else if (filterType === 'clear') {
            // Highlight "Show All" if in inbox/label view AND no specific inbox sender filter is active
            if (!activeFilterName && (currentHash.startsWith('#inbox') || currentHash.startsWith('#label') || currentHash === '' || currentHash === '#')) {
                 a.classList.add(config.ACTIVE_FILTER_CLASS);
                 activeFound = true;
            }
        }
    });

     // Ensure "Show All" is highlighted if effectively in inbox and no sender filter matches
     if (!activeFound && (currentHash.startsWith('#inbox') || currentHash.startsWith('#label') || currentHash === '' || currentHash === '#')) {
          const clearLink = list.querySelector('.clear-filter a');
          if(clearLink) clearLink.classList.add(config.ACTIVE_FILTER_CLASS);
     }
}
