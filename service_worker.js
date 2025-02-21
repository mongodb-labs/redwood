chrome.storage.sync
  .get({
    match: "https://my-source.com",
    replace: "http://localhost:8080",
    wds: true,
    webServerPort: 8080,
    compressed: false
  })
  .then(async ({ match, replace, wds, webServerPort, compressed }) => {
    const replaceURL = new URL(replace);
    const likelyWebServerURL = `${replaceURL.protocol}//${replaceURL.hostname}:${webServerPort}`;

    const isWDS = wds === "true";
    const isCompressed = compressed === "true";
    const matchForRegex = match.replaceAll(/\./g, '\\.');
    const likelyWebServerURLForRegex = likelyWebServerURL.replaceAll(/\./g, '\\.');

    const genRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([^/]*)\\.[a-fA-F0-9]+\\..*$`;
    const appAssetRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([a-z]+)\/(.*)\\.[a-fA-F0-9]+\\..*$`
    const appAssetNoHashRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([a-z]+)\/(.*)\\..*$`

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map((rule) => rule.id);

    // Uncomment for seeing matches (not a lot of info).
    // chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    //   console.log(JSON.stringify(info))
    // })

    const addMin = (type) => {
      return isCompressed ? '.min' : '';
    }
    const selectURLForRegexSub = (type) => {
      return (isWDS && type === 'css') ? likelyWebServerURL : replace;
    }
    const makeGenAssetRegexSub = (type) => {
      return `${selectURLForRegexSub(type)}/static/\\1/\\2${addMin(type)}.${type}`
    }
    const makeAppAssetRegexSub = (type) => {
      return `${selectURLForRegexSub(type)}/static/\\1/\\2/\\3${addMin(type)}.${type}`
    }
    const makeAppAssetNoHashRegexSub = (type) => {
      // min will show up in group 3, if needed.
      return `${selectURLForRegexSub(type)}/static/\\1/\\2/\\3.${type}`
    }
    const cssAssetRegexSub = `${replace}/static/assets/css/\\1${addMin('css')}.css`

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: [
        // JS
        {
          id: 1,
          action: {
            type: "redirect",
            "redirect": { regexSubstitution: makeGenAssetRegexSub('js'), }
          },
          "condition": {
            regexFilter: genRegex,
            "resourceTypes": ["script"]
          }
        },
        // JS chunk redirected-to hashes
        {
          id: 2,
          action: {
            type: "redirect",
            "redirect": { regexSubstitution: makeAppAssetNoHashRegexSub('js'), }
          },
          "condition": {
            regexFilter: appAssetNoHashRegex,
            "resourceTypes": ["script"]
          }
        },

        // CSS
        {
          id: 3,
          action: {
            type: "redirect",
            redirect: {
              regexSubstitution: makeGenAssetRegexSub('css'),
            },
          },
          condition: {
            regexFilter: genRegex,
            resourceTypes: ["stylesheet"],
          },
        },
        {
          id: 4,
          action: {
            type: "redirect",
            redirect: {
              regexSubstitution: makeAppAssetRegexSub('css'),
            },
          },
          condition: {
            regexFilter: appAssetRegex,
            resourceTypes: ["stylesheet"],
          },
        },
        {
          id: 5,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
              { header: "Access-Control-Allow-Headers", operation: "set", value: "*" },
            ],
          },
          condition: {
            urlFilter: isWDS ? likelyWebServerURL : replace,
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"],
          },
        },
      ],
    });
  });
