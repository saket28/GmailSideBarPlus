import * as config from './config.js';
import { updateActiveFilterHighlight } from './eventHandlers.js'; // Will be created next

// --- Use a Set to store unique first words directly ---
let uniqueSendersCache = new Set();

/** Extracts sender name and email from a single email row element. */
export function extractSenderFromRow(rowElement) {
    let nameElement = rowElement.querySelector(config.SENDER_NAME_SELECTOR);
    let email = nameElement ? nameElement.getAttribute(config.SENDER_EMAIL_ATTRIBUTE) : null;
    let name = nameElement ? (nameElement.textContent.trim() || email) : null;

    if (!email || !name) {
        nameElement = rowElement.querySelector(config.SENDER_NAME_FALLBACK_SELECTOR);
        if (nameElement) {
             name = name || nameElement.textContent.trim();
             if (!email) {
                 const potentialEmailElement = nameElement.closest('td')?.querySelector('[title*="@"]');
                 if (potentialEmailElement) {
                     const titleAttr = potentialEmailElement.getAttribute('title');
                     const emailMatch = titleAttr.match(/[\w\.\-]+@[\w\.\-]+\.\w+/);
                     if (emailMatch) email = emailMatch[0];
                 }
             }
        }
    }

    if (name) {
        name = name.replace(/\s+/g, ' ').trim();
        if (!name) name = email || "Unknown Sender";
        if (name !== "Unknown Sender") {
             // Return full name, we extract first word later
             return { name: name, email: email ? email.toLowerCase() : null };
        }
    }
    return null;
}

function cleanName(name) {
    return name
      .replace(/\b\w+\.(?=\s|$)/g, '')           // Remove words ending in a period
      .replace(/\s*[-–—]\s*$/, '')               // Remove trailing dash/hyphen
      .split(/(?<=\w)[\.\(@]+/)[0]               // Split only after a word and before . ( @ or (
      .trim();
  }  

/** Scans currently visible emails, extracts unique first words, populates the panel list. */
export function scanAndPopulateList() {
    console.log("Gmail Sender Filter Sidebar: Scanning emails and populating list...");

    const panel = document.getElementById(config.PANEL_ID);
    const list = document.getElementById(`${config.PANEL_ID}-list`);
    if (!panel || !list) {
        console.error("Panel or list element not found during scan.");
        return;
    }

    // Ensure placeholder is visible during scan
    list.querySelectorAll('li:not(.clear-filter)').forEach(li => li.remove());
    let placeholderLi = list.querySelector('.placeholder');
    if (!placeholderLi) {
        placeholderLi = document.createElement('li');
        placeholderLi.className = 'placeholder';
        list.appendChild(placeholderLi);
    }
    placeholderLi.textContent = 'Scanning emails...';


    const emailContainers = document.querySelectorAll(config.EMAIL_CONTAINER_SELECTOR);
    if (!emailContainers || emailContainers.length === 0) {
        console.warn("Email container not found for scanning.");
        placeholderLi.textContent = 'Error: Email list not found.';
        return;
    }
    uniqueSendersCache.clear(); // Clear cache before re-scan
    emailContainers.forEach(emailContainer => {
        // --- Use Set for unique first words ---
        const emailRows = emailContainer.querySelectorAll(config.EMAIL_ROW_SELECTOR);

        emailRows.forEach(row => {
            const senderInfo = extractSenderFromRow(row);
            if (senderInfo && senderInfo.name) {
                const firstWord = cleanName(senderInfo.name);
                if (firstWord &&
                    ![...uniqueSendersCache].some(existing => existing.toLowerCase() === firstWord.toLowerCase())) {
                    uniqueSendersCache.add(firstWord);
                }
            }
        });
    });
    // --- End of Set logic ---

    // --- Update Panel ---
    placeholderLi.remove(); // Remove placeholder before adding results

    if (uniqueSendersCache.size === 0) {
        const noSendersLi = document.createElement('li');
        noSendersLi.className = 'placeholder';
        noSendersLi.textContent = 'No senders found in view.';
        list.appendChild(noSendersLi);
    } else {
        const sortedSenders = Array.from(uniqueSendersCache).sort((a, b) => {
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });

        sortedSenders.forEach(firstWord => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = "#";
            link.textContent = firstWord;
            link.dataset.firstWord = firstWord;
            link.dataset.filterType = 'sender';
            li.appendChild(link);
            list.appendChild(li);
        });
    }
    console.log(`Gmail Sender Filter Sidebar: Scan complete. Found ${uniqueSendersCache.size} unique sender first words.`);
    updateActiveFilterHighlight(); // Update highlight after list is populated
}
