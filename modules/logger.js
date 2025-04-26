import * as config from './config.js';

export function log(message, type = 'info') {
    if (!config.ENABLE_LOGGING) return;

    switch (type.toLowerCase()) {
        case 'error':
            console.error(`GSS: ${message}`);
            break;
        case 'warn':
            console.warn(`GSS: ${message}`);
            break;
        default:
            console.log(`GSS: ${message}`);
    }
}
