import { MATCH_ENVIRONMENTS } from './matchEnvironments.js';

const CUSTOM_ENV_INDEX = -1;

const POPUP_DEFAULTS = {
    match: MATCH_ENVIRONMENTS[0].match,
    replace: 'http://127.0.0.1:80',
    environmentIndex: 0,
    isActive: true,
    customUrl: '',
};

function syncEnvUi(items) {
    let idx = Number(items.environmentIndex);
    const isCustom = idx === CUSTOM_ENV_INDEX;

    if (!isCustom && (!Number.isFinite(idx) || idx < 0 || idx >= MATCH_ENVIRONMENTS.length)) {
        idx = 0;
    }

    const sel = document.getElementById('env-select');
    sel.replaceChildren();
    MATCH_ENVIRONMENTS.forEach((p, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = p.label;
        sel.appendChild(o);
    });

    // Add Custom option
    const customOption = document.createElement('option');
    customOption.value = String(CUSTOM_ENV_INDEX);
    customOption.textContent = 'Custom';
    sel.appendChild(customOption);

    sel.value = String(idx);

    // Show/hide custom URL input
    const customContainer = document.getElementById('custom-url-container');
    const customInput = document.getElementById('custom-url-input');
    if (isCustom) {
        customContainer.style.display = 'block';
        customInput.value = items.customUrl || '';
    } else {
        customContainer.style.display = 'none';
    }

    const matchEl = document.querySelector('var.js-match');
    const replaceEl = document.querySelector('var.js-replace');
    if (matchEl) {
        matchEl.textContent = isCustom ? items.customUrl : MATCH_ENVIRONMENTS[idx].match;
    }
    if (replaceEl) replaceEl.textContent = items.replace;
}

function readSyncSettings(callback) {
    chrome.storage.sync.get(null, (items) => {
        callback({ ...POPUP_DEFAULTS, ...items });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    readSyncSettings((items) => {
        syncEnvUi(items);
        applyActiveState(items.isActive);
    });

    const envSelect = document.getElementById('env-select');
    envSelect.addEventListener('change', () => {
        const idx = Number(envSelect.value);

        if (idx === CUSTOM_ENV_INDEX) {
            // Show custom input
            chrome.storage.sync.get(['customUrl'], (items) => {
                const customUrl = items.customUrl || '';
                chrome.storage.sync.set({ environmentIndex: idx, match: customUrl }, () => {
                    readSyncSettings((items) => {
                        syncEnvUi(items);
                    });
                });
            });
        } else {
            const row = MATCH_ENVIRONMENTS[idx];
            if (!row) return;
            chrome.storage.sync.set({ environmentIndex: idx, match: row.match }, () => {
                readSyncSettings((items) => {
                    syncEnvUi(items);
                });
            });
        }
    });

    const customInput = document.getElementById('custom-url-input');
    customInput.addEventListener('input', (e) => {
        const customUrl = e.target.value.trim();
        chrome.storage.sync.set({ customUrl, match: customUrl }, () => {
            readSyncSettings((items) => {
                syncEnvUi(items);
            });
        });
    });

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'sync') {
            // changes.isActive is a StorageChange object ({oldValue, newValue}), or absent (undefined) if isActive didn't change
            if (changes.isActive) {
                applyActiveState(changes.isActive.newValue);
            }
            if (changes.environmentIndex || changes.match || changes.replace || changes.customUrl) {
                chrome.storage.sync.get(null, (items) => {
                    syncEnvUi({ ...POPUP_DEFAULTS, ...items });
                });
            }
        }
    });

    document.getElementById('toggle-switch').addEventListener('change', (e) => {
        chrome.storage.sync.set({ isActive: e.target.checked });
    });
});

function applyActiveState(isActive) {
    const heading = document.querySelector('.js-heading');
    const toggle = document.getElementById('toggle-switch');

    heading.toggleAttribute('data-active', isActive);
    heading.textContent = isActive ? '▶️ Redwood is running' : '⏹️ Redwood is paused';

    toggle.checked = isActive;
}
