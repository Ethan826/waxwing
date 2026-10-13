import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

// Opt-in snapshot check of the TextMate grammar (editors/vscode/README.md).
// vscode-textmate and vscode-oniguruma are not repository dependencies:
// `npm install --no-save` them, or point WAXWING_GRAMMAR_MODULES at a
// directory holding node_modules. `--update` rewrites the snapshots.
const modules = process.env.WAXWING_GRAMMAR_MODULES ?? process.cwd();
const need = createRequire(join(resolve(modules), 'x'));
const textmate = need('vscode-textmate');
const oniguruma = need('vscode-oniguruma');
const root = 'editors/vscode';
const wasm = readFileSync(need.resolve('vscode-oniguruma/release/onig.wasm'));
await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset,
  wasm.byteOffset + wasm.byteLength));
const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: sources => new oniguruma.OnigScanner(sources),
    createOnigString: text => new oniguruma.OnigString(text)
  }),
  loadGrammar: async () => textmate.parseRawGrammar(
    readFileSync(`${root}/syntaxes/waxwing.tmLanguage.json`, 'utf8'),
    'waxwing.tmLanguage.json')
});
const grammar = await registry.loadGrammar('source.waxwing');

// One line per token: its text, then its scopes without the root and the
// `.waxwing` suffix, innermost last.
const plain = scope => scope.replace(/\.waxwing$/, '');
const snapshot = source => {
  let stack = textmate.INITIAL;
  return source.split('\n').flatMap((line, number) => {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    return [`${number + 1}: ${line}`, ...result.tokens.map(token =>
      `  ${JSON.stringify(line.slice(token.startIndex, token.endIndex))} ${
        token.scopes.slice(1).map(plain).join(' ')}`)];
  }).map(line => line.trimEnd()).join('\n') + '\n';
};

const sources = [
  ...readdirSync('examples').filter(f => f.endsWith('.wxw')).map(f => ({
    path: `examples/${f}`, out: `${root}/snapshots/${f}.snap` })),
  { path: `${root}/fixtures/text-literals.wxw`,
    out: `${root}/snapshots/text-literals.wxw.snap` }
];
let failures = 0;
for (const { path, out } of sources) {
  const actual = snapshot(readFileSync(path, 'utf8'));
  if (process.argv.includes('--update')) writeFileSync(out, actual);
  else {
    let expected = null;
    try { expected = readFileSync(out, 'utf8'); } catch { /* missing */ }
    if (expected !== actual) {
      failures += 1;
      console.error(`differs: ${path}`);
    }
  }
}
assert.equal(failures, 0, 'grammar snapshots differ; review, then --update');
console.log(`${sources.length} grammar snapshots ${
  process.argv.includes('--update') ? 'written' : 'match'}`);
