setInputs = (items) => {
  document.querySelector('input[name=redirect-mongo-cdn-development]').checked = items.redirectMongoCdnDevelopment;
  document.querySelector('input[name=redirect-mongo-cdn-qa]').checked = items.redirectMongoCdnQa;
  document.querySelector('input[name=redirect-mongo-cdn-production]').checked = items.redirectMongoCdnProduction;
  document.querySelector('input[name=local-assets-url]').value = items.localAssetsUrl;
};

document.addEventListener('DOMContentLoaded', () => {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      redirectMongoCdnDevelopment: true,
      redirectMongoCdnQa: false,
      redirectMongoCdnProduction: false,
      localAssetsUrl: 'http://localhost:8081',
    },
    (items) => {
      setInputs(items);
    }
  );

  const getInput = (name) => document.querySelector(`input[name=${name}]`).value;
  const getCheckbox = (name) => document.querySelector(`input[name=${name}]`).checked;

  document.querySelector('button[name=save]').addEventListener('click', () => {
    chrome.storage.sync.set(
      {
        redirectMongoCdnDevelopment: getCheckbox('redirect-mongo-cdn-development'),
        redirectMongoCdnQa: getCheckbox('redirect-mongo-cdn-qa'),
        redirectMongoCdnProduction: getCheckbox('redirect-mongo-cdn-production'),
        localAssetsUrl: getInput('local-assets-url'),
      },
      chrome.runtime.reload
    );
    window.close();
  });
});
