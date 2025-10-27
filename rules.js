import {simplifyNamedGroups} from './regex_simplifier.js';

/**
 * Converts named capture groups to numbered capture groups because Chrome's declarativeNetRequest API only supports numbered capture groups.
 * @param {Array} rules - The rules to simplify.
 * @returns {Array} The simplified rules.
 * @example
 * const rules = [
 *   {
 *     condition: { regexFilter: '(?<name>[a-z]+) is (?<age>[0-9]+) years old' },
 *     action: { redirect: { regexSubstitution: '${name} is ${age} years old' } },
 *   },
 * ];
 * const simplifiedRules = simplifyNamedGroupsInRules(rules);
 * console.log(simplifiedRules);
 * // [
 * //   {
 * //     condition: { regexFilter: '([a-z]+) is ([0-9]+) years old' },
 * //     action: { redirect: { regexSubstitution: '\\1 is \\2 years old' } },
 * //   },
 * // ];
 */
function simplifyNamedGroupsInRules(rules) {
  const options = {
    backReferenceSymbol: '\\',
  };
  for (const rule of rules) {
    const search = rule.condition.regexFilter;
    const replace = rule.action?.redirect?.regexSubstitution || '';
    const { searchRegex, replaceRegex } = simplifyNamedGroups(search, replace, options);
    rule.condition.regexFilter = searchRegex;
    if (replace !== '') {
      rule.action.redirect.regexSubstitution = replaceRegex;
    }
  }
  return rules;
}

export function createRules({
  redirectMongoCdnDevelopment,
  redirectMongoCdnQa,
  redirectMongoCdnProduction,
  localAssetsUrl,
}) {
  let ruleIdCounter = 1;

  const env = [
    ...(redirectMongoCdnDevelopment ? ['-dev'] : []),
    ...(redirectMongoCdnQa ? ['-qa'] : []),
    ...(redirectMongoCdnProduction ? [''] : []),
  ];

  const p = {
    dash_env: `(?<dash_env>${env.join('|')})`,
    mms_prefix: '(?<mms_prefix>/mms)?',
    path: '(?<path>.+)',
    name: '(?<name>[^/]+?)',
    opt_dot_hash: '(?<opt_dot_hash>\\.[0-9a-f]{10,})?',
    opt_dot_min: '(?<opt_dot_min>\\.min)?',
    asset_ext: '(?<asset_ext>js|css|json)',
  };

  return simplifyNamedGroupsInRules([
    // redirect HMR updates
    {
      id: ruleIdCounter++,
      condition: {
        regexFilter: `^https:\/\/assets${p.dash_env}\\.mongodb-cdn\\.com${p.mms_prefix}\\/static\\/${p.path}\\/${p.name}\\.hot-update\\.${p.asset_ext}$`,
        resourceTypes: ['script', 'stylesheet', 'other', 'xmlhttprequest'],
      },
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: localAssetsUrl + '/static/${path}/${name}.hot-update.${asset_ext}',
        },
      },
    },
    // redirect JS and CSS assets
    {
      id: ruleIdCounter++,
      condition: {
        regexFilter: `^https:\/\/assets${p.dash_env}\\.mongodb-cdn\\.com${p.mms_prefix}\\/static\\/${p.path}\\/${p.name}${p.opt_dot_hash}${p.opt_dot_min}\\.${p.asset_ext}$`,
        resourceTypes: ['script', 'other', 'stylesheet'],
      },
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: localAssetsUrl + '/static/${path}/${name}.${asset_ext}',
        },
      },
    },
    // CORS for other resources
    {
      id: ruleIdCounter++,
      condition: {
        regexFilter: `^${localAssetsUrl}.*$`,
        resourceTypes: [
          'csp_report',
          'font',
          'image',
          'main_frame',
          'media',
          'object',
          'other',
          'ping',
          'script',
          'stylesheet',
          'sub_frame',
          'webbundle',
          'websocket',
          'webtransport',
          'xmlhttprequest',
        ],
      },
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Access-Control-Allow-Origin',
            operation: 'set',
            value: '*',
          },
          {
            header: 'Access-Control-Allow-Headers',
            operation: 'set',
            value: '*',
          },
        ],
      },
    },
  ]);
}
