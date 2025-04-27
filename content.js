'use strict';

(function() {
    console.log("GSS ⚙️ Loader script running...");

    function injectScript(filePath) {
        const script = document.createElement('script');
        script.setAttribute('type', 'module'); // IMPORTANT: Set type to module
        script.setAttribute('src', chrome.runtime.getURL(filePath)); // Get extension URL

        const head = document.head || document.documentElement;
        if (head) {
            head.appendChild(script);
            console.log(`GSS ⚙️ Injected ${filePath} as module.`);
        } else {
            console.error("GSS ⚙️ Could not find head or documentElement to inject script.");
        }
    }

    injectScript('modules/main.js');
})();
