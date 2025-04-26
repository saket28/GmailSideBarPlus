// --- --- --- --- --- --- --- --- --- --- --- ---
// --- CONFIGURATION & SELECTORS (ADJUST IF BROKEN!) ---
// --- --- --- --- --- --- --- --- --- --- --- ---
export const PANEL_ID = 'sender-panel'; // Use the ID from styles.css
export const ACTIVE_FILTER_CLASS = 'sender-filter-active';
export const DARK_THEME_CLASS = 'dark-theme'; // Class for dark mode styling

export const CHECK_INTERVAL_MS = 1000;
export const MAX_CHECKS = 30;
export const DEBOUNCE_DELAY_MS = 750; // Debounce for initial scan trigger

// --- LOGGING ---
export const ENABLE_LOGGING = true; // Set to false to disable all console logs

// --- SELECTORS (VERY LIKELY TO NEED UPDATES - User Provided) ---
// Parent element to inject the panel INTO. Should contain both the standard nav and main content.
export const INJECTION_PARENT_SELECTOR = '.aqk'; // User provided - verify with Inspect Element!
// The element to inject the panel *BEFORE*. Usually the main content area wrapper.
export const INJECTION_REFERENCE_NODE_SELECTOR = '.bkK'; // '.aeN'; // User provided - verify with Inspect Element!
// The main content element that needs its margin adjusted.
export const MAIN_CONTENT_SELECTOR = '.bkK'; // '.aeN'; // User provided - verify with Inspect Element!

// Selectors for scanning emails
export const EMAIL_CONTAINER_SELECTOR = 'div[role="main"] .Cp';
export const EMAIL_ROW_SELECTOR = 'tr[role="row"].zA, tr.zE';
export const SENDER_NAME_SELECTOR = '.yW span[email]';
export const SENDER_EMAIL_ATTRIBUTE = 'email';
export const SENDER_NAME_FALLBACK_SELECTOR = '.yP';

// Note: Panel widths are now controlled by CSS variables in styles.css
// export const PANEL_WIDTH_PX = 200;

// Dark Mode Detection: Class added to BODY element by Gmail (Inspect body in dark mode)
export const GMAIL_DARK_MODE_INDICATOR = 'dark'; // ADJUST THIS based on inspecting the <body> element in dark mode!
// --- --- --- --- --- --- --- --- --- --- --- ---
export const GMAIL_DARK_MODE_ELEMENT_SELECTOR = '.aim a';