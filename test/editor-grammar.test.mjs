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
const scope = suffix => `${suffix}.waxwing`;
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
  assert.deepEqual(contextual.sort(), ['nofail', 'pure']);
  assert.deepEqual(contextual.filter(word => reservedWords.includes(word)), []);
});

// FX020 (ADR 012): `fail` is an ordinary name; `as` is contextual and not
// reserved; operations are qualified by an adjacent `Effect.`.
const rule = name => items.find(item => item.name === `${name}.waxwing`);
const expression = grammar.repository.expression.patterns;
const matches = (name, text) => new RegExp(rule(name).match).test(text);

test('fail and as are not reserved words', () => {
  assert.ok(!reservedWords.includes('fail') && !reservedWords.includes('as'));
});

test('a qualified operation is an adjacent Effect.op', () => {
  const name = 'meta.qualified-operation';
  const found = new RegExp(rule(name).match).exec('x = Log.log(1)');
  assert.deepEqual(found.slice(1), ['Log', '.', 'log']);
  for (const text of ['Log . log(1)', 'Log. log', 'x.y', 'f(...e)', '1.5'])
    assert.ok(!matches(name, text), text);
  assert.deepEqual(Object.values(rule(name).captures).map(c => c.name),
    ['entity.name.type.waxwing', 'punctuation.accessor.waxwing',
      'entity.name.function.waxwing']);
});

test('as aliases an effect, and renames inside an import list', () => {
  const alias = 'meta.effect-alias';
  assert.ok(matches(alias, 'with Database as D + Log'));
  assert.ok(!matches(alias, 'as = 1') && !matches(alias, 'let as = D'));
  const imports = expression.find(item => item.name === scope('meta.imports'));
  assert.equal(imports.begin.includes('\\{'), true);
  assert.ok(new RegExp(imports.begin).test('Log { log }'));
  assert.ok(new RegExp(imports.begin).test('Fail(E) { fail as f }'));
  assert.ok(!new RegExp(imports.begin).test('match n { x => 1 }'));
  assert.ok(!new RegExp(imports.begin).test('handler Log { log(n) => n }'));
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
