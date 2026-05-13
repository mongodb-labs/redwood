document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({
        match: 'https://example.com',
        replace: 'http://127.0.0.1:80',
        isActive: true,
    }, items => {
        document.querySelector('var.js-match').innerHTML = items.match;
        document.querySelector('var.js-replace').innerHTML = items.replace;
        applyActiveState(items.isActive);
    });

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const tabId = tabs[0].id;

        const writeLogs = logs => {
            document.querySelector('ul').innerHTML =
                Object.keys(logs)
                    .sort((a,b) => logs[a.order] > logs[b.order])
                    .map(path => `<li>${path.replace(/\?.*/,'')}</li>`)
                    .join('');
        };

        chrome.storage.sync.get('logs', ({ logs }) => writeLogs(logs[tabId]));

        chrome.storage.onChanged.addListener(function(changes) {
            if (changes.logs) {
                writeLogs(changes.logs.newValue[tabId]);
            }
            // changes.isActive is a StorageChange object ({oldValue, newValue}), or absent (undefined) if isActive didn't change
            if (changes.isActive) {
                applyActiveState(changes.isActive.newValue);
            }
        });
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
