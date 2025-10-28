import {createRules} from './rules.js';
import {describe, test} from 'node:test';
import assert from 'node:assert';

/**
 * Helper function to test if a URL matches and redirects correctly
 * according to Chrome's declarativeNetRequest rules
 */
function testRedirect(rules, originalUrl) {
  for (const rule of rules) {
    if (rule.action.type !== 'redirect') continue;

    const regexFilter = rule.condition.regexFilter;
    // Convert Chrome's regex format to JavaScript RegExp
    // Chrome uses ^ and $ implicitly, and uses \1, \2 for back references
    const regexSubstitution = rule.action.redirect.regexSubstitution.replaceAll(/\\(\d+)/g, '$$$1');

    // Apply the substitution
    const jsRegex = new RegExp(regexFilter);
    if (jsRegex.test(originalUrl)) {
      return originalUrl.replace(jsRegex, regexSubstitution);
    }
  }

  // No rule matched
  return null;
}

describe('DEV redirections', () => {
  const rules = createRules({
    redirectMongoCdnDevelopment: true,
    localAssetsUrl: 'http://localhost:8081',
  });

  test('CSS chunk with hash should redirect to minified version', () => {
    const result = testRedirect(
      rules,
      'https://assets-dev.mongodb-cdn.com/mms/static/dist/bem-components.f5bb320780.css'
    );
    assert.strictEqual(result, 'http://localhost:8081/static/dist/bem-components.css');
  });

  test('JS chunk with hash should redirect to minified version', () => {
    const result = testRedirect(
      rules,
      'https://assets-dev.mongodb-cdn.com/mms/static/dist/runtime.ebe475bf44114144d0de.js'
    );
    assert.strictEqual(result, 'http://localhost:8081/static/dist/runtime.js');
  });

  test('JS file with two segments should redirect', () => {
    const result = testRedirect(
      rules,
      'https://assets-dev.mongodb-cdn.com/mms/static/dist/main/ui-access-list-edit-page.js'
    );
    assert.strictEqual(result, 'http://localhost:8081/static/dist/main/ui-access-list-edit-page.js');
  });

  test('HMR hot-update JS file should redirect', () => {
    const result = testRedirect(
      rules,
      'https://assets-dev.mongodb-cdn.com/mms/static/dist/packages_ai-models_components_UsagePage_tsx.2b6a17246155ab151602.hot-update.js'
    );
    assert.strictEqual(
      result,
      'http://localhost:8081/static/dist/packages_ai-models_components_UsagePage_tsx.2b6a17246155ab151602.hot-update.js'
    );
  });

  test('HMR hot-update JSON file should redirect', () => {
    const result = testRedirect(
      rules,
      'https://assets-dev.mongodb-cdn.com/mms/static/dist/main.2b6a17246155ab151602.hot-update.json'
    );
    assert.strictEqual(result, 'http://localhost:8081/static/dist/main.2b6a17246155ab151602.hot-update.json');
  });
});
