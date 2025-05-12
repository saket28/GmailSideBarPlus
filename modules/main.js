import * as config from './config.js';
import { debounce } from './utils.js';
import { injectPanel } from './domUtils.js';
import { scanAndPopulateList } from './emailScanner.js';
import { handleHashChange } from './eventHandlers.js';
import { state } from './state.js';
import { log } from './utils.js';

/** Performs the very first scan and sets up completion state. */
function performInitialScanAndPopulate() {
    if (state.initialScanComplete) return; // Only run the *very first* time

    scanAndPopulateList(); // Call the core logic

    // Only mark as complete and disconnect observer after the first successful scan
    state.initialScanComplete = true;
    if (state.emailContainerObserver) {
        state.emailContainerObserver.disconnect();
        state.emailContainerObserver = null;
        log("Initial Email list MutationObserver disconnected.");
    }
}

// Debounced version for triggering the initial scan
const debouncedInitialScan = debounce(performInitialScanAndPopulate, config.DEBOUNCE_DELAY_MS);

/** Sets up the MutationObservers to watch for email list and theme changes. */
function setupInitialObserver() {
    // 1. Observer for Email List Appearance
    const emailListTargetNode = document.body;
    if (!emailListTargetNode) return false; // Should not happen

    log("Setting up initial observer on body for email list...");
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
            log("Email container detected by observer.");
            debouncedInitialScan(); // Trigger scan
            // performInitialScanAndPopulate will disconnect this observer upon completion
        }
    });
    state.emailContainerObserver.observe(emailListTargetNode, { childList: true, subtree: true });

    // Also trigger a check in case the container is already there
    if (document.querySelector(config.EMAIL_CONTAINER_SELECTOR)) {
         log("Email container already present on initial check.");
         debouncedInitialScan();
    }

    // 3. Listener for Hash Changes (handles highlighting AND triggers scan - runs continuously)
    // Ensure listener is only added once
    window.removeEventListener('hashchange', handleHashChange); // Remove previous if any
    window.addEventListener('hashchange', handleHashChange);
    log("Added hashchange listener.");

    // Initial call to handle the state when the page first loads
    handleHashChange();


    return true; // Observer setup attempted
}

// --- INITIALIZATION ---
function initializeSidebar() {
    let frameId;
    const MAX_TIME = config.CHECK_INTERVAL_MS * config.MAX_CHECKS;
    const startTime = Date.now();

    const checkLoop = () => {
        if (!state.panelInjected) {
            state.panelInjected = injectPanel();
        }

        if (state.panelInjected && !state.emailContainerObserver && !state.initialScanComplete) {
            setupInitialObserver();
        }

        // Check timeout condition
        if (state.initialScanComplete || (Date.now() - startTime >= MAX_TIME)) {
            if (!state.initialScanComplete && state.panelInjected) {
                log("Timed out waiting for email list to appear for initial scan.", "error");
                const list = document.getElementById(`${config.PANEL_ID}-list`);
                const placeholder = list?.querySelector('.placeholder');
                if (placeholder) placeholder.textContent = 'Error: Timeout finding emails.';
            } else if (!state.panelInjected) {
                log("Timed out waiting for Gmail UI. Panel not injected.", "error");
            } else {
                log("Initialization check finished.");
            }
            return;
        }

        frameId = requestAnimationFrame(checkLoop);
    };

    checkLoop();
}

// Start the initialization process with error handling
try {
    initializeSidebar();
} catch (error) {
    log(`Initialization failed - ${error.message}`, "error");
    // Try to display error to user
    const errorDisplay = document.createElement('div');
    errorDisplay.style.color = 'red';
    errorDisplay.textContent = 'Sidebar initialization failed. Please reload the page.';
    document.body.prepend(errorDisplay);
}
