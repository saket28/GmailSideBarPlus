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

    // Add message listener for module communication
    window.addEventListener('message', function(event) {
        // Only accept messages from our window
        if (event.source !== window) return;
        
        if (event.data.type === 'GSS_OPEN_SETTINGS') {
            chrome.runtime.sendMessage({ action: 'openPopup' }).catch(error => {
                console.log('GSS ⚠️ Settings popup action failed:', error);
            });
        }
    });

    injectScript('modules/main.js');
})();
