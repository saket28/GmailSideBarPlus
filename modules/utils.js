import * as config from './config.js';

export function log(message, type = 'info') {
    switch (type.toLowerCase()) {
        case 'error':
            console.error(`GSS ❌ ${message}`);
            break;
        case 'warn':
            console.warn(`GSS ⚠️ ${message}`);
            break;
        default:
            if (!config.ENABLE_LOGGING) return;
            console.log(`GSS ℹ️ ${message}`);
    }
}

export function debounce(func, wait) {
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
