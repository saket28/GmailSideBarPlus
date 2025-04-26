import * as config from './config.js';
import { debounce } from './utils.js'; // Import debounce
import { scanAndPopulateList } from './emailScanner.js';
import { state } from './state.js'; // Import state
import { log } from './utils.js';

/** Handles clicks on the refresh button. */
export function handleRefreshClick(event) {
    event.stopPropagation(); // Prevent panel click listener if needed
    log("Refresh button clicked.");

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
                const currentHash = window.location.hash;
                let baseQuery = '-in:trash';
                //let baseQuery = '';
                // Determine base query from current hash
                //if (currentHash.startsWith('#search/')) {                    
                //    baseQuery = decodeURIComponent(currentHash.substring(8)).replace(/\+from:\S+/i, '').trim(); // Remove existing 'from:' clause
                //} else if (currentHash.startsWith('#label/')) {
                //    const label = decodeURIComponent(currentHash.substring(7));
                //    baseQuery = `label:${label}`;
                //} else if (currentHash.startsWith('#category/')) {
                //    const category = decodeURIComponent(currentHash.substring(10));
                //    baseQuery = `category:${category}`;
                //} else if (currentHash === '#sent') {
                //    baseQuery = 'is:sent';
                //} else if (currentHash === '#starred') {
                //    baseQuery = 'is:starred';
                //} else if (currentHash === '#drafts') {
                //    baseQuery = 'is:drafts';
                //} else if (currentHash === '#important') {
                //    baseQuery = 'is:important';
                //} else if (currentHash === '#spam') {
                //    baseQuery = 'in:spam';
                //} else if (currentHash === '#trash') {
                //    baseQuery = 'in:trash';
                //} else if (currentHash === '#all') {
                //    baseQuery = 'in:all';
                //} else {
                //    // Default to inbox for other cases (#inbox, empty hash, etc.)
                //    baseQuery = '-in:trash';
                //}
                
                // Combine base query with the new 'from:' filter, adding a space only if baseQuery is not empty
                let newSearchTerm = `${baseQuery} from:(${firstWord})`;
                log(`Applying filter: "${newSearchTerm}"`);

                // Manually replace spaces with '+' for Gmail's hash format
                const gmailEncodedSearchTerm = newSearchTerm.replace(/ /g, '+');
                const searchHash = `#search/${gmailEncodedSearchTerm}`;
                window.location.hash = searchHash;

            }
        } else if (filterType === 'clear') {
            const currentHash = window.location.hash;
            let baseQuery = '';
            // Determine base query from current hash
            if (currentHash.startsWith('#search/')) {
                baseQuery = decodeURIComponent(currentHash.substring(8)).replace(/\+from:\S+/i, '').trim(); // Remove existing 'from:' clause
            } 
            // Manually replace spaces with '+' for Gmail's hash format
            const gmailEncodedSearchTerm = baseQuery.replace(/ /g, '+');
            const searchHash = `#search/${gmailEncodedSearchTerm}`;
            window.location.hash = searchHash;
            log("Clearing sender.");
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
    let activeSenderFilter = null; // Store the active 'from:' value if found in search hash

    // Check if current view is a search and extract the 'from:' filter
    if (currentHash.startsWith('#search/')) {
        try {
            const searchQuery = decodeURIComponent(currentHash.substring(8));
            // Match 'from:' filter regardless of other search terms
            const fromMatch = searchQuery.match(/from:\((\S+)\)/i);
            if (fromMatch && fromMatch[1]) {
                activeSenderFilter = fromMatch[1].replaceAll('+', ' '); // Manually replace spaces with '+' for Gmail's hash format
            }
        } catch (e) { 
            log("Error parsing search hash: " + e, 'error'); 
        }
    }

    let activeSenderLinkFound = false; // Track if any sender link was highlighted
    list.querySelectorAll('li a').forEach(a => {
        a.classList.remove(config.ACTIVE_FILTER_CLASS);
        const filterType = a.dataset.filterType;

        if (filterType === 'sender') {
            const linkFirstWord = a.dataset.firstWord;
            // Highlight if a 'from:' filter exists in the URL and matches this link's sender
            if (activeSenderFilter && linkFirstWord && linkFirstWord.toLowerCase() === activeSenderFilter.toLowerCase()) {
                a.classList.add(config.ACTIVE_FILTER_CLASS);
                activeSenderLinkFound = true; // Mark that a sender link is active
            }
        }
        // We handle the 'clear' link separately below
    });

    // Handle the "Show All" (clear filter) link highlighting
    const clearLink = list.querySelector('.clear-filter a');
    if (clearLink) {
        // Highlight "Show All" if we are NOT in a search view OR if we ARE in a search view BUT there's no active sender filter applied
        if (!currentHash.startsWith('#search/') || (currentHash.startsWith('#search/') && !activeSenderFilter)) {
             // Only add if no specific sender link was highlighted already
             if (!activeSenderLinkFound) {
                 clearLink.classList.add(config.ACTIVE_FILTER_CLASS);
             } else {
                 clearLink.classList.remove(config.ACTIVE_FILTER_CLASS);
             }
        } else {
            // If we are in a search view AND a sender filter IS active, "Show All" should not be active.
            clearLink.classList.remove(config.ACTIVE_FILTER_CLASS);
        }
    }
}


// --- New Handler for Hash Changes ---

// Debounced version of scanAndPopulateList for hash changes
const debouncedScanForHashChange = debounce(() => {
    log("Hash changed, triggering debounced scan.");
    // Reset placeholder before scan
    const list = document.getElementById(`${config.PANEL_ID}-list`);
    if (list) {
        let placeholderLi = list.querySelector('.placeholder');
        if (placeholderLi) {
            placeholderLi.textContent = 'Loading emails...';
        }
    }
    // Use a small timeout to ensure the URL change is processed before scanning
    setTimeout(scanAndPopulateList, 100);
}, config.DEBOUNCE_DELAY_MS + 200); // Debounce to wait for Gmail to load content

/**
 * Handles the window.location.hash change event.
 * Updates the active filter highlight and triggers a debounced email scan
 * ONLY if the hash change represents navigating to a new folder/label/view
 * (i.e., hash does NOT start with #search/), NOT when just applying a search filter.
 */
export function handleHashChange() {
    const currentHash = window.location.hash;
    log(`Hash change detected: ${currentHash}`);

    // Determine if we should scan: Scan only if the hash does NOT start with #search/
    // This covers navigating to #inbox, #label/..., #sent, etc.
    const shouldScan = decodeURIComponent(currentHash).indexOf('from:') < 0;
    log(`shouldScan evaluated to: ${shouldScan} for hash ${currentHash}`); // Detailed log

    // Always update highlighting based on the new hash
    updateActiveFilterHighlight();

    // Trigger scan conditionally
    if (shouldScan) {
        log("Condition met (is primary view change), calling debouncedScanForHashChange."); // Detailed log
        debouncedScanForHashChange();
    } else {
        // This case handles when a search filter is applied (e.g., clicking a sender)
        log("Condition NOT met (is search filter change), skipping automatic rescan."); // Detailed log
    }
}
