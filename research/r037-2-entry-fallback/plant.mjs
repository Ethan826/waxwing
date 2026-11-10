// Plants R037 (2)'s defect in a scratch copy of compiled output.
// Pre-repair output only (7153f66d or earlier): the repair (§18.178)
// removed the `resolve` call it plants into, so on later output it throws
// "site not unique". The new path's checks are mutants.mjs.
// usage: node plant.mjs <outputDir> open|closed
import { readFileSync, writeFileSync } from 'node:fs';
const [dir, mode] = process.argv.slice(2);
const file = `${dir}/Features.Check.Entry/index.js`;
let js = readFileSync(file, 'utf8');
const site = 'var v1 = Features_Check_Subst.resolve(state.subst)(';
if (js.split(site).length !== 2) throw new Error('site not unique');
// The planted `resolve`: returns a non-arrow for the TFun it is given.
js = js.replace(site,
  'var v1 = ((s) => (t) => Domain_Type_Core.TUnit.value)(state.subst)(');
if (mode === 'closed') {
  const arm = 'return new Domain_Row.Row([  ], Data_Maybe.Nothing.value);';
  if (js.split(arm).length !== 2) throw new Error('arm not unique');
  // Fail-closed arm: signal an internal error instead of an empty row.
  js = js.replace(arm, 'return null;');
  const use = 'return traverse_(allowed)(Data_Array.zip(v.value0)';
  if (js.split(use).length !== 2) throw new Error('use not unique');
  js = js.replace(use, 'if (v === null) return new Data_Either.Left('
    + '{ problem: new Domain_Problem.Internal(Domain_Problem.BodyState.value,'
    + ' "main\'s row did not resolve to an arrow"), span: definition.span,'
    + ' related: [] });\n                ' + use);
}
writeFileSync(file, js);
console.log(`planted ${mode} in ${file}`);
