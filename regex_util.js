export const defaultPlaceholders = {
  // to match any character
  '*': /.*/,
  // to match a segment in a URL so any character except '/' e.g. 'production'
  segment: /[^\/]+/,
  // to match a hex e.g. '672e65e9296a5864b92ae860'
  hex: /[a-fA-F0-9]+/,
  // to match all filename characters e.g. 'test.js'
  // Matches all valid characters for a Unix filename (excluding '/' and null char)
  filename: /[^~)('!*<>:;,?"|/\\]+/,
  // to match an extension e.g. 'js'
  alphanumeric: /[a-zA-Z0-9]+/,
};

/**
 * A registry for placeholders used in the search and replacement patterns, that keeps track of the index of the capture group generated for each placeholder to be used in the replacement pattern.
 * (e.g. `[segment#1]` will generate capture group 1, `[segment#2]` will generate capture group 2, etc.)
 */
class PlaceholderRegistry {
  constructor() {
    this.nameToBackRef = new Map();
    this.backRefCounter = 0;
    this.nameToUsageCounter = new Map();
  }

  registerCaptureGroup(name, id) {
    this.backRefCounter++;

    if (!this.nameToBackRef[name]) {
      this.nameToBackRef[name] = {};
    }

    if (id !== undefined) {
      this.nameToBackRef[name][id] = this.backRefCounter;
      return;
    }

    if (!this.nameToBackRef[name].orderedUsage) {
      this.nameToBackRef[name].orderedUsage = [];
    }
    this.nameToBackRef[name].orderedUsage.push(this.backRefCounter);
  }

  isRegistered(name) {
    return !!this.nameToBackRef[name];
  }

  /**
   * Returns the index of the capture group generated for the placeholder.
   *
   * @param {string} name - The name of the placeholder.
   * @param {string} id - The id of the placeholder.
   * @returns {number} The index of the capture group.
   */
  getBackReference(name, id) {
    if (!this.nameToBackRef[name]) {
      throw new Error(`Placeholder '${name}' is not registered!`);
    }
    if (id !== undefined) {
      const value = this.nameToBackRef[name][id];
      if (value === undefined) {
        throw new Error(`Placeholder '${name}' with id '${id}' has not been used in search pattern!`);
      }
      return value;
    } else {
      const usageOrder = this.nameToBackRef[name].orderedUsage;
      if (usageOrder === undefined) {
        throw new Error(`Placeholder '${name}' has never been used without an id in search pattern!`);
      }
      const count = this.nameToUsageCounter.get(name) || 0;
      this.nameToUsageCounter.set(name, count + 1);
      const value = usageOrder[count];
      if (value === undefined) {
        throw new Error(
          `Placeholder '${name}' has been used ${usageOrder.length} time(s) in search pattern but used at least ${
            count + 1
          } times in replacement pattern!`
        );
      }
      return value;
    }
  }
}

/**
 * Replaces all occurrences of a regex in a string with a replacement function.
 *
 * @param {string} str - The string to replace.
 * @param {RegExp} regex - The regex to match.
 * @param {Function} replaceLiteralFn (optional) - The function to transform the text around the occurrence of the regex.
 * @param {Function} replaceFn - The function to transform the regex match object (RegExpExecArray) into a replacement string.
 * @returns {string} The replaced string.
 */
function replaceAll(str, regex, replaceLiteralFn, replaceFn) {
  let match;
  let from = 0;
  let output = '';
  replaceLiteralFn = replaceLiteralFn || ((str) => str);

  // replace all occurrences of the regex in the string
  while ((match = regex.exec(str)) !== null) {
    output += replaceLiteralFn(str.slice(from, match.index));
    output += replaceFn(match);
    from = match.index + match[0].length;
  }
  if (from < str.length) {
    output += replaceLiteralFn(str.slice(from));
  }

  return output;
}

/**
 * Creates a pair of regular expressions for search and replacement using placeholders similar to webpack configurations.
 *
 * This utility function allows you to define search and replacement patterns containing placeholders
 * (such as `[segment]`, `[name]`, `[hash]`, or custom ones) which will be translated into
 * capture groups internally. The `env` parameter can be used to pass custom
 * values or RegExp objects for specific placeholders. A set of default placeholder patterns are also available
 * as `defaultPlaceholders`.
 *
 * Placeholders with an id (e.g. `[segment#1]/[segment#2]/[segment#3]/test.js`) can be used to match the same placeholder multiple times in the same pattern and used in
 * the replacement pattern with different order (e.g. `[segment#3]/[segment#2]/test.js`).
 * If order of repeated placeholders in search pattern is the same as in replacement pattern,
 * you can simply use the placeholder without an id (e.g. `[segment]/[segment]/test.js` in search pattern and `[segment]/[segment]/main.json` in replacement pattern).
 *
 * @param {string} searchPattern - The pattern to match, using placeholders in square brackets.
 *   Example: 'https://google.com/[env]/test.js'
 * @param {string} replacePattern - The pattern to generate a replacement, also using placeholders.
 *   Example: 'https://google.com/[env]/main.json'
 * @param {Object} [env={}] - An object that maps placeholder names to values. Values can
 *   be strings (literal match) or RegExp objects (pattern match).
 *   Example: { env: `defaultPlaceholders.segment` }
 * @param {Object} [options={}] - Additional configuration options.
 *   @param {string} [options.backReferenceSymbol='$'] - The symbol to use for backreferences in the replacement string (e.g., '$' or '\').
 *   @param {Function} [options.regexEscape=RegExp.escape] - Escape function used to escape literal text in patterns.
 *
 * @returns {Object} An object containing:
 *   - searchRegex {string}: The string RegExp pattern for searching (e.g. 'https://google\\.com/(.*)/test\\.js')
 *   - replaceRegex {string}: The corresponding replacement pattern with group references (e.g. 'https://google.com/$1/main.json')
 *
 * @throws {Error} If placeholders in the replacement pattern do not match those defined in the search pattern.
 *
 * @example
 * const {searchRegex, replaceRegex} = createReplaceRegex(
 *   'https://google.com/[env]/test.js',
 *   'https://google.com/[env]/main.json',
 *   {env: `defaultPlaceholders.segment`}
 * );
 * // Results in:
 * //   searchRegex: '^https://google\.com/([^/]+)/test\.js$'
 * //   replaceRegex: 'https://google.com/$1/main.json'
 */
export function createReplaceRegex(searchPattern, replacePattern, env = {}, options = {}) {
  // the symbol to use to back reference captured groups in regular expressions
  // (e.g. $1 = '$', \1 = '\', etc.)
  options.backReferenceSymbol = options.backReferenceSymbol || '$';
  options.regexEscape = options.regexEscape || RegExp.escape;
  // regex to match [name] or [name#id]
  // group 1: name
  // group 2 (optional): id
  const placeholderRegex = /\[([^\]#]+)(?:#([^\]#]+))?]/g;
  const placeholderRegistry = new PlaceholderRegistry();

  let searchRegex = replaceAll(searchPattern, placeholderRegex, options.regexEscape, ([expr, name, id]) => {
    let value = expr;
    if (env[name]) {
      if (typeof env[name] === 'string') {
        value = `(${options.regexEscape(env[name])})`;
      } else if (env[name] instanceof RegExp) {
        value = `(${env[name].source})`;
      } else {
        throw new Error(`Invalid placeholder value: ${name}. Must be a string or a RegExp.`);
      }
    } else if (defaultPlaceholders[name]) {
      value = `(${defaultPlaceholders[name].source})`;
    } else {
      throw new Error(`Unknown placeholder: ${expr}`);
    }

    placeholderRegistry.registerCaptureGroup(name, id);
    return value;
  });
  searchRegex = `^${searchRegex}$`;

  const replaceRegex = replaceAll(replacePattern, placeholderRegex, null, ([, name, id]) => {
    if (!placeholderRegistry.isRegistered(name) && typeof env[name] === 'string') {
      return env[name];
    }
    return `${options.backReferenceSymbol}${placeholderRegistry.getBackReference(name, id)}`;
  });

  return { searchRegex, replaceRegex };
}
