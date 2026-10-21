// Research-only source reachability probes; uses existing output modules.
import fs from 'node:fs';
const root = new URL('../../../output/', import.meta.url).href;
const { parse } = await import(`${root}Format.Parse/index.js`);
const { resolve } = await import(`${root}Features.Resolve/index.js`);
const { check } = await import(`${root}Features.Check/index.js`);
const { wire } = await import(`${root}Format.Diagnostic/index.js`);
const header = `fn recordAny(): { ...w } with pure = crash("unreachable");
fn gate(
 whole: { ...ui, ...ub, ...uu, ...ut, ...ua, ...ur },
 intPart: { ...ui, ...mi }, boolPart: { ...ub, ...mb },
 unitPart: { ...uu, ...mu }, textPart: { ...ut, ...mt },
 arrowPart: { ...ua, ...ma }, recordPart: { ...ur, ...mr }
): Unit with pure = ();
`;
const call = `gate(x, { f: 0 }, { f: true }, { f: () }, { f: "x" },
 { f: (fn(z) => crash("unreachable")) }, { f: recordAny() })`;
const results = [];
for (const [name, prefix, ty] of [
  ['generic', '', 'a'], ['int', '', 'Int'],
  ['nominal', 'type Box = Box;\n', 'Box']
]) {
  const source = prefix + header +
    `fn route(x: { f: ${ty} }): Unit with pure =\n ${call};\n` +
    'fn main(): Int = 0;\n';
  fs.writeFileSync(new URL(`./${name}.wxw`, import.meta.url), source);
  let value = source;
  let outcome = { name, stage: 'check', accepted: true };
  for (const [stage, f] of [
    ['parse', parse], ['resolve', resolve], ['check', check]
  ]) {
    const result = f(value);
    if (result.constructor.name === 'Left') {
      outcome = {
        name, stage, accepted: false, diagnostic: wire(result.value0)
      };
      break;
    }
    value = result.value0;
  }
  results.push(outcome);
}
const json = JSON.stringify(results, null, 2) + '\n';
fs.writeFileSync(new URL('./probe-results.json', import.meta.url), json);
for (const result of results) {
  console.log(`${result.name}: ${result.stage}, ` +
    `${result.accepted ? 'accepted' : result.diagnostic.message}`);
}
