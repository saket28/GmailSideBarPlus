import * as config from './config.js';
import { debounce } from './utils.js';
import { injectPanel, detectAndApplyTheme } from './domUtils.js';
import { scanAndPopulateList } from './emailScanner.js';
import { updateActiveFilterHighlight } from './eventHandlers.js';
import { state } from './state.js';

console.log("Gmail Sender Filter Sidebar: Script starting (modular)...");

/** Performs the very first scan and sets up completion state. */
function performInitialScanAndPopulate() {
    if (state.initialScanComplete) return; // Only run the *very first* time

    scanAndPopulateList(); // Call the core logic

    // Only mark as complete and disconnect observer after the first successful scan
    state.initialScanComplete = true;
    if (state.emailContainerObserver) {
        state.emailContainerObserver.disconnect();
        state.emailContainerObserver = null;
        console.log("Gmail Sender Filter Sidebar: Initial Email list MutationObserver disconnected.");
    }
}

// Debounced version for triggering the initial scan
const debouncedInitialScan = debounce(performInitialScanAndPopulate, config.DEBOUNCE_DELAY_MS);

/** Sets up the MutationObservers to watch for email list and theme changes. */
function setupInitialObserver() {
    // 1. Observer for Email List Appearance
    const emailListTargetNode = document.body;
    if (!emailListTargetNode) return false; // Should not happen

    console.log("Gmail Sender Filter Sidebar: Setting up initial observer on body for email list...");
    state.emailContainerObserver = new MutationObserver((mutationsList, observer) => {
        // This observer only runs until the first scan is complete
        if (state.initialScanComplete) {
             // It should have been disconnected already, but double-check
             if (observer) observer.disconnect();
             state.emailContainerObserver = null; // Clear reference
             return;
        }
        const emailContainer = document.querySelector(config.EMAIL_CONTAINER_SELECTOR);
        if (emailContainer) {
            console.log("Gmail Sender Filter Sidebar: Email container detected by observer.");
            debouncedInitialScan(); // Trigger scan
            // performInitialScanAndPopulate will disconnect this observer upon completion
        }
    });
    state.emailContainerObserver.observe(emailListTargetNode, { childList: true, subtree: true });

    // Also trigger a check in case the container is already there
    if (document.querySelector(config.EMAIL_CONTAINER_SELECTOR)) {
         console.log("Gmail Sender Filter Sidebar: Email container already present on initial check.");
         debouncedInitialScan();
    }

    // 2. Observer for Theme Changes (runs continuously)
    if (!state.themeObserver) {
        console.log("Gmail Sender Filter Sidebar: Setting up theme observer on body attributes...");
        state.themeObserver = new MutationObserver(mutations => {
             for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // console.log("Body class changed, re-checking theme.");
                    detectAndApplyTheme();
                    break;
                }
            }
        });
        state.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // 3. Listener for Hash Changes (for highlighting - runs continuously)
    // Ensure listener is only added once
    window.removeEventListener('hashchange', updateActiveFilterHighlight); // Remove previous if any
    window.addEventListener('hashchange', updateActiveFilterHighlight);

    return true; // Observer setup attempted
}

// --- INITIALIZATION ---
function initializeSidebar() {
    const checkInterval = setInterval(() => {
        state.checkCounter++;

        if (!state.panelInjected) {
            state.panelInjected = injectPanel(); // Try to inject panel structure first
        }

        // Once panel structure is in, set up the observers if not already done
        if (state.panelInjected && !state.emailContainerObserver && !state.initialScanComplete) {
             setupInitialObserver();
        }

        // Timeout condition
        if (state.initialScanComplete || state.checkCounter >= config.MAX_CHECKS) {
            clearInterval(checkInterval);
            if (!state.initialScanComplete && state.panelInjected) {
                 console.error("Gmail Sender Filter Sidebar: Timed out waiting for email list to appear for initial scan.");
                 const list = document.getElementById(`${config.PANEL_ID}-list`);
                 const placeholder = list ? list.querySelector('.placeholder') : null;
                 if (placeholder) placeholder.textContent = 'Error: Timeout finding emails.';
            } else if (!state.panelInjected) {
                 console.error("Gmail Sender Filter Sidebar: Timed out waiting for Gmail UI. Panel not injected.");
            } else {
                 console.log("Gmail Sender Filter Sidebar: Initialization check finished.");
                 // Observers are now managed internally (email observer disconnects itself, theme observer persists)
            }
        }
    }, config.CHECK_INTERVAL_MS);
}

// Start the initialization process
initializeSidebar();
