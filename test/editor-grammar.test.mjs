import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  grammarPath, render, wordGroups
} from '../scripts/editor-grammar-generate.mjs';

// IDE001 stage 1: the editor grammar must not drift from the lexer.
const chars = readFileSync('src/Format/Lex/Chars.purs', 'utf8');
const reservedBody = chars.split(/^reserved ∷/m)[1].split(/^\S/m).slice(0, 2)
  .join('\n').split('_ → false')[0];
const reservedWords = [...reservedBody.matchAll(/^\s+"(\w+)" → true$/gm)]
  .map(match => match[1]).sort();
const grammar = JSON.parse(readFileSync(grammarPath, 'utf8'));
const items = grammar.repository.items.patterns;
const wordsOf = rule => rule.match.match(/\(\?:([^)]*)\)/)[1].split('|');
const named = prefix => items.filter(rule => rule.name?.startsWith(prefix));

test('the lexer source yields the reserved words this test compares', () => {
  assert.ok(reservedWords.length >= 20, reservedWords.join(' '));
  assert.ok(reservedWords.includes('fn') && reservedWords.includes('_'));
});

test('the grammar keyword set equals the lexer reserved words', () => {
  const contextual = named('storage.modifier.contextual').flatMap(wordsOf);
  const reserving = items.filter(rule => rule.name && rule.match
    && !rule.name.startsWith('storage.modifier.contextual')
    && /^(keyword\.(control|declaration)|constant\.language|support\.type)/
      .test(rule.name)).flatMap(wordsOf);
  const wildcard = named('variable.language.wildcard').flatMap(wordsOf);
  assert.deepEqual([...reserving, ...wildcard].sort(), reservedWords);
  assert.deepEqual(contextual.sort(), ['fail', 'nofail', 'pure']);
  assert.deepEqual(contextual.filter(word => reservedWords.includes(word)), []);
});

test('the generator groups every word once', () => {
  const all = wordGroups.flatMap(([, words]) => words);
  assert.equal(new Set(all).size, all.length);
});

test('the committed grammar is what the generator renders', () => {
  assert.equal(readFileSync(grammarPath, 'utf8'), render());
});

test('the extension is private, runtime-free and has no comment syntax', () => {
  const manifest = JSON.parse(
    readFileSync('editors/vscode/package.json', 'utf8'));
  assert.equal(manifest.private, true);
  assert.equal(manifest.main, undefined);
  assert.deepEqual(manifest.contributes.languages[0].extensions, ['.wxw']);
  const configuration = JSON.parse(
    readFileSync('editors/vscode/language-configuration.json', 'utf8'));
  assert.equal(configuration.comments, undefined);
  assert.deepEqual(configuration.brackets,
    [['{', '}'], ['(', ')'], ['[', ']']]);
});
