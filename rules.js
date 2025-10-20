import { createReplaceRegex, defaultPlaceholders } from './regex_util.js';

export function createRules({ match, replace, wds, webServerPort, compressed }) {
  let ruleIdCounter = 1;

  function createRegexReplace(searchPattern, replacePattern, useWDSBase) {
    const replaceURL = new URL(replace);
    const wdsBase = `${replaceURL.protocol}//${replaceURL.hostname}:${webServerPort}`;
    const isWDS = wds === 'true';
    const isCompressed = compressed === 'true';

    const env = {
      name: defaultPlaceholders.segment,
      hash: defaultPlaceholders.hex,
      ext: defaultPlaceholders.alphanumeric,
      orig_url: match,
      repl_url: isWDS && useWDSBase ? wdsBase : replace,
      min: isCompressed ? '.min' : '',
    };

    const options = {
      backReferenceSymbol: '\\',
    };

    return createReplaceRegex(searchPattern, replacePattern, env, options);
  }

  function createRedirectRule(searchPattern, replacePattern, useWDSBase, types) {
    const { searchRegex, replaceRegex } = createRegexReplace(searchPattern, replacePattern, useWDSBase);
    return {
      id: ruleIdCounter++,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: replaceRegex,
        },
      },
      condition: {
        regexFilter: searchRegex,
        resourceTypes: types,
      },
    };
  }

  function createCorsRule(pattern, types) {
    const { searchRegex } = createRegexReplace(pattern, '', true);
    return {
      id: ruleIdCounter++,
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
      condition: {
        regexFilter: searchRegex,
        resourceTypes: types,
      },
    };
  }

  return [
    // JS chunks
    createRedirectRule(
      '[orig_url]/static/[segment]/[name].[hash].js',
      '[repl_url]/static/[segment]/[name][min].js',
      false,
      ['script']
    ),
    // JS
    createRedirectRule(
      '[orig_url]/static/[segment]/[segment]/[name].js',
      '[repl_url]/static/[segment]/[segment]/[name][min].js',
      false,
      ['script']
    ),
    // CSS chunks with single segment
    createRedirectRule(
      '[orig_url]/static/[segment]/[name].[hash].css',
      '[repl_url]/static/[segment]/[name][min].css',
      true,
      ['stylesheet']
    ),
    // CSS chunks with two segments
    createRedirectRule(
      '[orig_url]/static/[segment]/[segment]/[name].[hash].css',
      '[repl_url]/static/[segment]/[segment]/[name][min].css',
      true,
      ['stylesheet']
    ),
    // CORS for other resources
    createCorsRule('[repl_url][*]', [
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
    ]),
  ];
}
