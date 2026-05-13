import { MATCH_ENVIRONMENTS } from './matchEnvironments.js';

const POPUP_DEFAULTS = {
    match: MATCH_ENVIRONMENTS[0].match,
    replace: 'http://127.0.0.1:80',
    environmentIndex: 0,
    isActive: true,
};

function syncEnvUi(items) {
    let idx = Number(items.environmentIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= MATCH_ENVIRONMENTS.length) idx = 0;

    const sel = document.getElementById('env-select');
    sel.replaceChildren();
    MATCH_ENVIRONMENTS.forEach((p, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = p.label;
        sel.appendChild(o);
    });
    sel.value = String(idx);

    const matchEl = document.querySelector('var.js-match');
    const replaceEl = document.querySelector('var.js-replace');
    matchEl.textContent = MATCH_ENVIRONMENTS[idx].match;
    replaceEl.textContent = items.replace;
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
        const row = MATCH_ENVIRONMENTS[idx];
        if (!row) return;
        chrome.storage.sync.set({ environmentIndex: idx, match: row.match });
    });

    chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName === 'sync') {
            if (changes.isActive) {
                applyActiveState(changes.isActive.newValue);
            }
            if (changes.environmentIndex || changes.match || changes.replace) {
                chrome.storage.sync.get(null, (items) => {
                    syncEnvUi({ ...POPUP_DEFAULTS, ...items });
                });
            }
        }
    });

    document.getElementById('toggle-btn').addEventListener('click', () => {
        chrome.storage.sync.get({ isActive: true }, ({ isActive }) => {
            chrome.storage.sync.set({ isActive: !isActive });
        });
    });
});

function applyActiveState(isActive) {
    const heading = document.querySelector('.js-heading');
    const btn = document.getElementById('toggle-btn');

    heading.toggleAttribute('data-active', isActive);
    heading.textContent = isActive ? '▶️ Redwood is running' : '⏹️ Redwood is paused';

    btn.toggleAttribute('data-active', isActive);
    btn.textContent = isActive ? 'Disable' : 'Enable';
}
