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

    if (isActive) {
        heading.textContent = 'Redwood is running';
        heading.className = 'js-heading active';
        btn.textContent = 'Disable';
        btn.className = 'px-3 py-1 text-sm rounded text-white bg-red-500 hover:bg-red-600';
    } else {
        heading.textContent = 'Redwood is paused';
        heading.className = 'js-heading inactive';
        btn.textContent = 'Enable';
        btn.className = 'px-3 py-1 text-sm rounded text-white bg-green-600 hover:bg-green-700';
    }
}
