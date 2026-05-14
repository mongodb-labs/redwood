import { MATCH_ENVIRONMENTS } from './matchEnvironments.js';

const CUSTOM_ENV_INDEX = -1;

const POPUP_DEFAULTS = {
    match: MATCH_ENVIRONMENTS[0].match,
    replace: 'http://localhost:8080',
    environmentIndex: 0,
    isActive: true,
    customUrl: '',
};

function syncEnvUi(settings) {
    let idx = Number(settings.environmentIndex);
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
        customContainer.classList.remove('hidden');
        customInput.value = settings.customUrl || '';
    } else {
        customContainer.classList.add('hidden');
    }

    const matchEl = document.querySelector('var.js-match');
    const replaceEl = document.querySelector('var.js-replace');
    if (matchEl) {
        matchEl.textContent = isCustom ? settings.customUrl : MATCH_ENVIRONMENTS[idx].match;
    }
    if (replaceEl) replaceEl.textContent = settings.replace;
}

function readSyncSettings(callback) {
    chrome.storage.sync.get(null, (settings) => {
        callback({ ...POPUP_DEFAULTS, ...settings });
    });
}

async function checkServerStatus(url) {
    try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        return true;
    } catch (error) {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    readSyncSettings((settings) => {
        syncEnvUi(settings);
        applyActiveState(settings.isActive);

        // Check server status
        checkServerStatus(settings.replace).then(isRunning => {
            const statusEl = document.getElementById('popup-server-status');
            const dividerEl = document.getElementById('server-status-divider');
            if (statusEl && !isRunning) {
                statusEl.textContent = '🚨 Local server is not running 🚨';
                statusEl.className = 'popup-server-status-error popup-text';
                dividerEl?.classList.remove('hidden');
            }
        });
    });

    const envSelect = document.getElementById('env-select');
    envSelect.addEventListener('change', () => {
        const idx = Number(envSelect.value);

        if (idx === CUSTOM_ENV_INDEX) {
            // Show custom input
            chrome.storage.sync.get(['customUrl'], (settings) => {
                const customUrl = settings.customUrl || '';
                chrome.storage.sync.set({ environmentIndex: idx, match: customUrl }, () => {
                    readSyncSettings((settings) => {
                        syncEnvUi(settings);
                    });
                });
            });
        } else {
            const row = MATCH_ENVIRONMENTS[idx];
            if (!row) return;
            chrome.storage.sync.set({ environmentIndex: idx, match: row.match }, () => {
                readSyncSettings((settings) => {
                    syncEnvUi(settings);
                });
            });
        }
    });

    const customInput = document.getElementById('custom-url-input');
    customInput.addEventListener('input', (e) => {
        const customUrl = e.target.value.trim();
        chrome.storage.sync.set({ customUrl, match: customUrl }, () => {
            readSyncSettings((settings) => {
                syncEnvUi(settings);
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
                chrome.storage.sync.get(null, (settings) => {
                    syncEnvUi({ ...POPUP_DEFAULTS, ...settings });
                });
            }
        }
    });

    document.getElementById('toggle-switch').addEventListener('change', (e) => {
        chrome.storage.sync.set({ isActive: e.target.checked });
    });

    document.getElementById('settings-button').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});

function applyActiveState(isActive) {
    const heading = document.querySelector('.js-heading');
    const toggle = document.getElementById('toggle-switch');
    const headerContainer = document.getElementById('header-container');

    heading.toggleAttribute('data-active', isActive);
    heading.textContent = isActive ? '▶️ Redwood is running' : '⏹️ Redwood is paused';

    if (isActive) {
        headerContainer.classList.remove('bg-gray-dark2');
        headerContainer.classList.add('bg-green-dark2');
    } else {
        headerContainer.classList.remove('bg-green-dark2');
        headerContainer.classList.add('bg-gray-dark2');
    }

    toggle.checked = isActive;
}
