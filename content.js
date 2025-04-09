'use strict';

(function() {
    console.log("Gmail Sender Filter Sidebar: Loader script running...");

    // Function to inject the main module script into the page DOM
    function injectScript(filePath) {
        const script = document.createElement('script');
        script.setAttribute('type', 'module'); // IMPORTANT: Set type to module
        script.setAttribute('src', chrome.runtime.getURL(filePath)); // Get extension URL

        const head = document.head || document.documentElement;
        if (head) {
            head.appendChild(script);
            console.log(`Gmail Sender Filter Sidebar: Injected ${filePath} as module.`);
            // Optionally remove the script tag after it has run, though not strictly necessary for modules
            // script.onload = () => { script.remove(); };
        } else {
            console.error("Gmail Sender Filter Sidebar: Could not find head or documentElement to inject script.");
        }
    }

    // Inject the main module script
    injectScript('modules/main.js');

})();
