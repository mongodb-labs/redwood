setInputs = (items) => {
  document.querySelector('input[name=match]').value = items.match;
  document.querySelector('input[name=replace]').value = items.replace;
  document.querySelector('input[name=wds]').checked = items.wds;
  document.querySelector('input[name=webServerPort]').value = items.webServerPort;
  document.querySelector('input[name=compressed]').checked = items.compressed;
};

setPreset = (event) => {
  const presets = {
    Development: {
      match: 'https://assets-dev.mongodb-cdn.com/mms',
      replace: 'http://localhost:8081',
      wds: true,
      webServerPort: 8081,
      compressed: false,
    },
    QA: {
      match: 'https://assets-qa.mongodb-cdn.com/mms',
      replace: 'http://localhost:8081',
      wds: true,
      webServerPort: 8081,
      compressed: false,
    },
    Production: {
      match: 'https://assets.mongodb-cdn.com/mms',
      replace: 'http://localhost:8081',
      wds: true,
      webServerPort: 8081,
      compressed: false,
    },
  };

  setInputs(presets[event.target.value]);
};

document.addEventListener('DOMContentLoaded', () => {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      match: 'https://example.com',
      replace: 'http://127.0.0.1:80',
      wds: true,
      webServerPort: 8080,
      compressed: false,
    },
    (items) => {
      setInputs(items);
    }
  );

  const getInput = (name) => document.querySelector(`input[name=${name}]`).value;
  const getCheckbox = (name) => document.querySelector(`input[name=${name}]`).checked;

  document.querySelectorAll('input[name=preset]').forEach((button) => {
    button.addEventListener('click', setPreset);
  });

  document.querySelector('button[name=save]').addEventListener('click', () => {
    chrome.storage.sync.set(
      {
        match: getInput('match'),
        replace: getInput('replace'),
        wds: getCheckbox('wds'),
        webServerPort: getInput('webServerPort'),
        compressed: getCheckbox('compressed'),
      },
      chrome.runtime.reload
    );
    window.close();
  });
});
