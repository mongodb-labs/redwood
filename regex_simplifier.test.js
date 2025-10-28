import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { simplifyNamedGroups } from './regex_simplifier.js';

describe('simplifyNamedGroups', () => {
  describe('basic conversion', () => {
    test('converts single named group', () => {
      const result = simplifyNamedGroups('(?<name>[a-z]+)', '${name}', {
        backReferenceSymbol: '\\',
      });

      assert.equal(result.searchRegex, '([a-z]+)');
      assert.equal(result.replaceRegex, '\\1');
    });

    test('converts multiple named groups', () => {
      const result = simplifyNamedGroups(
        '(?<protocol>https?)://(?<domain>[^/]+)/(?<path>.*)',
        '${protocol}://localhost/${path}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(https?)://([^/]+)/(.*)');
      assert.equal(result.replaceRegex, '\\1://localhost/\\3');
    });

    test('handles groups in different order in replacement', () => {
      const result = simplifyNamedGroups(
        '(?<first>\\w+)-(?<second>\\w+)-(?<third>\\w+)',
        '${third}/${second}/${first}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\w+)-(\\w+)-(\\w+)');
      assert.equal(result.replaceRegex, '\\3/\\2/\\1');
    });
  });

  describe('backreference symbols', () => {
    test('uses backslash by default', () => {
      const result = simplifyNamedGroups('(?<test>\\w+)', '${test}');

      assert.equal(result.replaceRegex, '\\1');
    });

    test('uses dollar sign when specified', () => {
      const result = simplifyNamedGroups('(?<test>\\w+)', '${test}', {
        backReferenceSymbol: '$',
      });

      assert.equal(result.replaceRegex, '$1');
    });
  });

  describe('nested and complex patterns', () => {
    test('handles nested non-capturing groups', () => {
      const result = simplifyNamedGroups(
        '(?<outer>test(?:inner)?end)',
        '${outer}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(test(?:inner)?end)');
      assert.equal(result.replaceRegex, '\\1');
    });

    test('handles multiple nested parentheses', () => {
      const result = simplifyNamedGroups(
        '(?<group>a(b(c)d)e)',
        '${group}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(a(b(c)d)e)');
      assert.equal(result.replaceRegex, '\\1');
    });

    test('handles escaped parentheses in groups', () => {
      const result = simplifyNamedGroups(
        '(?<group>test\\(escaped\\))',
        '${group}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(test\\(escaped\\))');
      assert.equal(result.replaceRegex, '\\1');
    });

    test('handles complex real-world pattern', () => {
      const result = simplifyNamedGroups(
        '^(?<protocol>https?)://(?<domain>[^/]+)/static/(?<segment>[^/]+)/(?<name>[^.]+)\\.(?<hash>[a-f0-9]+)\\.js$',
        '${protocol}://localhost/static/${segment}/${name}.js',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '^(https?)://([^/]+)/static/([^/]+)/([^.]+)\\.([a-f0-9]+)\\.js$');
      assert.equal(result.replaceRegex, '\\1://localhost/static/\\3/\\4.js');
    });
  });

  describe('replacement without all groups', () => {
    test('allows referencing only some groups', () => {
      const result = simplifyNamedGroups(
        '(?<a>\\w+)-(?<b>\\w+)-(?<c>\\w+)',
        '${a}-${c}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\w+)-(\\w+)-(\\w+)');
      assert.equal(result.replaceRegex, '\\1-\\3');
    });

    test('allows replacement with no group references', () => {
      const result = simplifyNamedGroups(
        '(?<name>\\w+)',
        'static-value',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\w+)');
      assert.equal(result.replaceRegex, 'static-value');
    });
  });

  describe('error cases', () => {
    test('throws error for duplicate named group', () => {
      assert.throws(
        () => {
          simplifyNamedGroups(
            '(?<name>\\w+)-(?<name>\\d+)',
            '${name}',
            { backReferenceSymbol: '\\' }
          );
        },
        { message: "Named capture group 'name' is already defined!" }
      );
    });

    test('throws error for undefined group reference', () => {
      assert.throws(
        () => {
          simplifyNamedGroups(
            '(?<name>\\w+)',
            '${name}-${undefined}',
            { backReferenceSymbol: '\\' }
          );
        },
        { message: "Named capture group 'undefined' is not defined in the search pattern!" }
      );
    });

    test('throws error for unmatched parentheses', () => {
      assert.throws(
        () => {
          simplifyNamedGroups(
            '(?<name>\\w+',
            '${name}',
            { backReferenceSymbol: '\\' }
          );
        },
        { message: "Unmatched parentheses for named group 'name'" }
      );
    });
  });

  describe('mixed content', () => {
    test('handles literal text around groups', () => {
      const result = simplifyNamedGroups(
        'prefix-(?<middle>\\w+)-suffix',
        'start-${middle}-end',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, 'prefix-(\\w+)-suffix');
      assert.equal(result.replaceRegex, 'start-\\1-end');
    });

    test('handles special regex characters', () => {
      const result = simplifyNamedGroups(
        '^(?<protocol>https?):\\/\\/(?<host>[^/]+)\\/',
        '${protocol}://new-${host}/',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '^(https?):\\/\\/([^/]+)\\/');
      assert.equal(result.replaceRegex, '\\1://new-\\2/');
    });
  });

  describe('mixed numbered and named groups', () => {
    test('handles named + numbered + named', () => {
      const result = simplifyNamedGroups(
        '(?<first>\\w+)-([^-]+)-(?<third>\\w+)',
        '${first}/${third}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\w+)-([^-]+)-(\\w+)');
      assert.equal(result.replaceRegex, '\\1/\\3');
    });

    test('handles numbered + named', () => {
      const result = simplifyNamedGroups(
        '(\\d+)-(?<name>\\w+)',
        '${name}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\d+)-(\\w+)');
      assert.equal(result.replaceRegex, '\\2');
    });

    test('handles named + numbered (no reference to numbered)', () => {
      const result = simplifyNamedGroups(
        '(?<protocol>https?)://([^/]+)/(?<path>.*)',
        '${protocol}://localhost/${path}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(https?)://([^/]+)/(.*)');
      assert.equal(result.replaceRegex, '\\1://localhost/\\3');
    });

    test('handles multiple numbered groups interspersed', () => {
      const result = simplifyNamedGroups(
        '(?<a>\\w+)-(\\d+)-(?<b>\\w+)-(\\d+)-(?<c>\\w+)',
        '${c}/${b}/${a}',
        { backReferenceSymbol: '\\' }
      );

      assert.equal(result.searchRegex, '(\\w+)-(\\d+)-(\\w+)-(\\d+)-(\\w+)');
      assert.equal(result.replaceRegex, '\\5/\\3/\\1');
    });
  });
});

