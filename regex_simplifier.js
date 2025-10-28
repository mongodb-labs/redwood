/**
 * A registry for named capture groups that tracks their numeric indices.
 */
class NamedGroupRegistry {
  constructor() {
    this.nameToNumber = new Map();
  }

  /**
   * Registers a named capture group with its position number.
   * @param {string} name - The name of the capture group.
   * @param {number} position - The position/number of this capture group.
   * @throws {Error} If the named group is already registered.
   */
  registerNamedGroup(name, position) {
    if (this.nameToNumber.has(name)) {
      throw new Error(`Named capture group '${name}' is already defined!`);
    }
    this.nameToNumber.set(name, position);
  }

  /**
   * Returns the numeric index for a named capture group.
   * @param {string} name - The name of the capture group.
   * @returns {number} The numeric index.
   * @throws {Error} If the named group is not registered.
   */
  getGroupNumber(name) {
    if (!this.nameToNumber.has(name)) {
      throw new Error(`Named capture group '${name}' is not defined in the search pattern!`);
    }
    return this.nameToNumber.get(name);
  }
}

/**
 * Converts named capture groups to numbered capture groups.
 *
 * This function takes a regex pattern with .NET-style named capture groups ((?<name>...))
 * and a replacement pattern with JavaScript-style named references (${name}), and converts
 * them to numbered capture groups and backreferences.
 *
 * @param {string} searchRegex - The regex pattern with (?<name>...) syntax.
 * @param {string} replaceRegex - The replacement pattern with ${name} syntax.
 * @param {Object} [options={}] - Configuration options.
 *   @param {string} [options.backReferenceSymbol='\\'] - Symbol for backreferences ('\\' or '$').
 *
 * @returns {Object} An object containing:
 *   - searchRegex {string}: The regex pattern with numbered groups.
 *   - replaceRegex {string}: The replacement pattern with numbered backreferences.
 *
 * @throws {Error} If duplicate named groups are found or undefined groups are referenced.
 *
 * @example
 * const result = simplifyNamedGroups(
 *   '(?<protocol>https?)://(?<domain>[^/]+)/(?<path>.*)',
 *   '${protocol}://localhost/${path}',
 *   { backReferenceSymbol: '\\' }
 * );
 * // Result:
 * //   searchRegex: '(https?)://([^/]+)/(.*)'
 * //   replaceRegex: '\\1://localhost/\\3'
 */
export function simplifyNamedGroups(searchRegex, replaceRegex, options = {}) {
  options.backReferenceSymbol = options.backReferenceSymbol || '\\';

  const registry = new NamedGroupRegistry();

  // Step 1: Scan the entire pattern to count ALL capture groups (both named and regular)
  // and register named groups with their correct positions
  let groupCounter = 0;
  let pos = 0;

  while (pos < searchRegex.length) {
    const char = searchRegex[pos];

    // Skip escaped characters
    if (char === '\\') {
      pos += 2;
      continue;
    }

    // Check if this is a capture group
    if (char === '(') {
      // Check if it's a named group (?<name>...)
      if (searchRegex[pos + 1] === '?' && searchRegex[pos + 2] === '<') {
        // Extract the name
        const nameMatch = searchRegex.slice(pos).match(/^\(\?<([^>]+)>/);
        if (nameMatch) {
          groupCounter++;
          registry.registerNamedGroup(nameMatch[1], groupCounter);
          pos += nameMatch[0].length;
          continue;
        }
      }
      // Check if it's a non-capturing group (?:...)
      else if (searchRegex[pos + 1] === '?' && searchRegex[pos + 2] === ':') {
        pos++;
        continue;
      }
      // Check for other non-capturing syntax like (?=...), (?!...), etc.
      else if (searchRegex[pos + 1] === '?') {
        pos++;
        continue;
      }
      // It's a regular capturing group
      else {
        groupCounter++;
        pos++;
        continue;
      }
    }

    pos++;
  }

  // Step 2: Convert search pattern - replace (?<name>...) with (...)
  let simplifiedSearch = searchRegex;
  let match;
  let offset = 0;

  // Match named groups
  const namedGroupStart = /\(\?<([^>]+)>/g;

  while ((match = namedGroupStart.exec(searchRegex)) !== null) {
    const groupName = match[1];
    const startPos = match.index;
    const contentStart = match.index + match[0].length;

    // Find the matching closing parenthesis
    let depth = 1;
    let endPos = contentStart;

    while (depth > 0 && endPos < searchRegex.length) {
      const char = searchRegex[endPos];

      if (char === '\\') {
        // Skip escaped characters
        endPos += 2;
        continue;
      }

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }

      endPos++;
    }

    if (depth !== 0) {
      throw new Error(`Unmatched parentheses for named group '${groupName}'`);
    }

    // Replace (?<name>...) with (...)
    const groupContent = searchRegex.slice(contentStart, endPos - 1);
    const replacement = `(${groupContent})`;

    simplifiedSearch =
      simplifiedSearch.slice(0, startPos + offset) +
      replacement +
      simplifiedSearch.slice(startPos + offset + (endPos - startPos));

    // Adjust offset for the length difference
    offset += replacement.length - (endPos - startPos);
  }

  // Step 3: Parse and convert replacement pattern
  // Match ${name} references
  const namedRefRegex = /\$\{([^}]+)\}/g;

  const simplifiedReplace = replaceRegex.replace(namedRefRegex, (fullMatch, name) => {
    const groupNumber = registry.getGroupNumber(name);
    return `${options.backReferenceSymbol}${groupNumber}`;
  });

  return {
    searchRegex: simplifiedSearch,
    replaceRegex: simplifiedReplace,
  };
}
