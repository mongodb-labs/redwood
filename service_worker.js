import { MATCH_ENVIRONMENTS, DEFAULT_ENVIRONMENT } from './matchEnvironments.js';

const DEFAULTS = {
  match: DEFAULT_ENVIRONMENT.match,
  environmentIndex: 0,
  replace: "http://localhost:8080",
  wds: true,
  webServerPort: 8080,
  compressed: false,
  isActive: true,
};

function resolveEnvironmentMatch(settings) {
  let idx = Number(settings.environmentIndex);

  // Handle custom URL case (idx = -1)
  if (idx === -1) {
    const match = settings.customUrl || settings.match || MATCH_ENVIRONMENTS[0].match;
    return { ...settings, environmentIndex: idx, match };
  }

  if (!Number.isFinite(idx) || idx < 0 || idx >= MATCH_ENVIRONMENTS.length) idx = 0;
  const match = MATCH_ENVIRONMENTS[idx].match;
  return { ...settings, environmentIndex: idx, match };
}

async function updateRules(rawSettings) {
  const settings = resolveEnvironmentMatch(rawSettings);
  const { match, replace, wds, webServerPort, compressed, isActive } = settings;

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldRuleIds = oldRules.map((rule) => rule.id);

  if (!isActive) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRuleIds, addRules: [] });
    chrome.action.setIcon({
      path: {
        16: "icons/redwood-off-16.png",
        32: "icons/redwood-off-32.png",
        48: "icons/redwood-off-48.png",
        128: "icons/redwood-off.png",
      },
    });
    return;
  }

  const replaceURL = new URL(replace);
  const likelyWebServerURL = `${replaceURL.protocol}//${replaceURL.hostname}:${webServerPort}`;

  const isWDS = wds === "true";
  const isCompressed = compressed === "true";
  const matchForRegex = match.replaceAll(/\./g, '\\.');

  const genRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([^/]*)\\.[a-fA-F0-9]+\\..*$`;
  const appAssetRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([a-z]+)\/([^/]+)\\.[a-fA-F0-9]+\\..*$`;
  const appAssetNoHashRegex = `^${matchForRegex}.*\/static\/([a-z]+)\/([a-z]+)\/([^/]+)\\..*$`;

  const addMin = () => isCompressed ? '.min' : '';
  const selectURLForRegexSub = (type) => (isWDS && type === 'css') ? likelyWebServerURL : replace;
  const makeGenAssetRegexSub = (type) => `${selectURLForRegexSub(type)}/static/\\1/\\2${addMin()}.${type}`;
  const makeAppAssetRegexSub = (type) => `${selectURLForRegexSub(type)}/static/\\1/\\2/\\3${addMin()}.${type}`;
  const makeAppAssetNoHashRegexSub = (type) => `${selectURLForRegexSub(type)}/static/\\1/\\2/\\3.${type}`;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
    addRules: [
      {
        id: 1,
        action: { type: "redirect", redirect: { regexSubstitution: makeGenAssetRegexSub('js') } },
        condition: { regexFilter: genRegex, resourceTypes: ["script"] },
      },
      {
        id: 2,
        action: { type: "redirect", redirect: { regexSubstitution: makeAppAssetNoHashRegexSub('js') } },
        condition: { regexFilter: appAssetNoHashRegex, resourceTypes: ["script"] },
      },
      {
        id: 3,
        action: { type: "redirect", redirect: { regexSubstitution: makeGenAssetRegexSub('css') } },
        condition: { regexFilter: genRegex, resourceTypes: ["stylesheet"] },
      },
      {
        id: 4,
        action: { type: "redirect", redirect: { regexSubstitution: makeAppAssetRegexSub('css') } },
        condition: { regexFilter: appAssetRegex, resourceTypes: ["stylesheet"] },
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

  chrome.action.setIcon({
    path: {
      16: "icons/redwood-on-16.png",
      32: "icons/redwood-on-32.png",
      48: "icons/redwood-on-48.png",
      128: "icons/redwood-on.png",
    },
  });
}

chrome.storage.sync.get(null).then((items) => updateRules({ ...DEFAULTS, ...items }));

chrome.storage.onChanged.addListener(() => {
  chrome.storage.sync.get(null).then((items) => updateRules({ ...DEFAULTS, ...items }));
});
