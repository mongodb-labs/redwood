import { createRules } from './rules.js';

chrome.storage.sync
  .get({
    redirectMongoCdnDevelopment: true,
    redirectMongoCdnQa: false,
    redirectMongoCdnProduction: false,
    localAssetsUrl: 'http://localhost:8081',
  })
  .then(async (config) => {
    // Uncomment for seeing matches (not a lot of info).
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
      console.log(JSON.stringify(info));
    });

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map((rule) => rule.id);
    const newRules = createRules(config);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: newRules,
    });
  });
