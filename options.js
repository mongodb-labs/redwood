import { MATCH_ENVIRONMENTS } from './matchEnvironments.js';

const STORAGE_DEFAULTS = {
    replace: 'http://127.0.0.1:80',
    environmentIndex: 0,
    wds: true,
    webServerPort: 8080,
    compressed: false,
};

document.addEventListener('DOMContentLoaded', () => {
    const getInput = (name) => document.querySelector(`input[name=${name}]`).value;

    chrome.storage.sync.get(STORAGE_DEFAULTS, (items) => {
        document.querySelector('input[name=replace]').value = items.replace;
        document.querySelector('input[name=wds]').value = items.wds;
        document.querySelector('input[name=webServerPort]').value = items.webServerPort;
        document.querySelector('input[name=compressed]').value = items.compressed;
    });

    document.querySelector('button[name=save]').addEventListener('click', () => {
        chrome.storage.sync.get(STORAGE_DEFAULTS, (items) => {
            let idx = Number(items.environmentIndex);
            if (!Number.isFinite(idx) || idx < 0 || idx >= MATCH_ENVIRONMENTS.length) idx = 0;
            chrome.storage.sync.set(
                {
                    match: MATCH_ENVIRONMENTS[idx].match,
                    replace: getInput('replace'),
                    wds: getInput('wds'),
                    webServerPort: getInput('webServerPort'),
                    compressed: getInput('compressed'),
                },
                chrome.runtime.reload,
            );
        });
    });
});
