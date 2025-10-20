import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReplaceRegex, defaultPlaceholders } from './regex_util.js';

describe('substituteBuilder', () => {
  test('should escape all characters', () => {
    const { searchRegex } = createReplaceRegex('wss://google.com:8081/test.js?query=value', '');

    assert(new RegExp(searchRegex).test('wss://google.com:8081/test.js?query=value'));
    assert(!new RegExp(searchRegex).test('wss://googleXcom:8081/test.js?query=value'));
    assert(!new RegExp(searchRegex).test('wss://google.com:8081/test.j?query=value'));
  });

  test('should use env variables both in regex and replacement', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'wss://[subdomain].google.com:[port]/test.js',
      'ws://[replacement_website]/main.json',
      {
        subdomain: 'clou?d',
        port: '8081',
        replacement_website: 'localhost:8080',
      }
    );

    assert(new RegExp(searchRegex).test('wss://clou?d.google.com:8081/test.js'));
    assert.equal(
      'wss://clou?d.google.com:8081/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'ws://localhost:8080/main.json'
    );
  });

  test('should support env variables as placeholder', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[env]/test.js',
      'https://google.com/[env]/main.json',
      { env: defaultPlaceholders.segment }
    );

    assert(new RegExp(searchRegex).test('https://google.com/production/test.js'));
    assert.equal(
      'https://google.com/production/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://google.com/production/main.json'
    );
  });

  test('should support one placeholder used twice', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[segment]/[segment]/test.js',
      'https://yahoo.com/[segment]/[segment]/main.json'
    );

    assert.equal(
      'https://google.com/production/another_segment/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://yahoo.com/production/another_segment/main.json'
    );
  });

  test('should support placeholder with id', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[segment#a]/[segment#1]/test.js',
      'https://yahoo.com/[segment#1]/[segment#a]/main.json'
    );

    assert.equal(
      'https://google.com/production/another_segment/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://yahoo.com/another_segment/production/main.json'
    );
  });

  test('should support segment placeholder', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[segment]/test.js',
      'https://google.com/[segment]/main.json'
    );

    assert(new RegExp(searchRegex).test('https://google.com/production/test.js'));
    assert(!new RegExp(searchRegex).test('https://google.com/production/another_segment/test.js'));
    assert.equal(
      'https://google.com/production/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://google.com/production/main.json'
    );
  });

  test('should support hex placeholder', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[hex]/test.js',
      'https://google.com/[hex]/main.json'
    );

    assert.equal(
      'https://google.com/672e65e9296a5864b92ae860/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://google.com/672e65e9296a5864b92ae860/main.json'
    );
    assert(!new RegExp(searchRegex).test('https://google.com/672e65e9296a5864b92ae86G/test.js'));
  });

  test('should support * placeholder', () => {
    const { searchRegex, replaceRegex } = createReplaceRegex(
      'https://google.com/[*]/test.js',
      'https://google.com/[*]/main.json'
    );

    assert.equal(
      'https://google.com/production/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://google.com/production/main.json'
    );
    assert.equal(
      'https://google.com/production/another_segment/test.js'.replace(new RegExp(searchRegex), replaceRegex),
      'https://google.com/production/another_segment/main.json'
    );
  });
});
