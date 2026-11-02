// Patched scratch copies of the compiled output (design §B, §C): the
// healthy output/ is copied to .build/t2-scratch/<variant>/output and
// a few compiled modules are edited as text, each edit required to
// match exactly once. Nothing under src/, test/ or output/ changes; the
// probes reach a copy through redirect.mjs. Research only.
//   node research/t2-read-back-design/scratch.mjs \
//     generation|trace|both|theta|clean
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../test/r0-corpus.mjs';

export const scratchRoot = join(repoRoot, '.build', 't2-scratch');
export const outputOf = variant => join(scratchRoot, variant, 'output');

const hookCall = (name, args) =>
  `(globalThis.__t2 === undefined ? null : globalThis.__t2.${name}(${args}))`;

// The use wrappers: the raw function renamed, a wrapper of the same name
// calling it and handing the result to the probe's hook.
const wrapped = (name, params, kind) => {
  const curried = params.map(p => `function (${p}) { return `).join('');
  const closing = params.map(() => '; }').join('');
  return `var ${name} = ${curried}${hookCall('use',
    `'${kind}', [${params.join(', ')}], ${name}$raw(${params.join(')(')})`)
  } === null ? ${name}$raw(${params.join(')(')}) : `
    + `globalThis.__t2.last${closing};\n`;
};

const consumeApply = 'Features_Check_Consume.consumeAt(env)(reached)(span)'
  + '(new Features_Check_Provenance.Application(named))(opened.value.row)';
const consumePipe = 'Features_Check_Consume.consumeAt(env)(reached)'
  + '(Domain_Checked_Internal.spanOf(argument))'
  + '(new Features_Check_Provenance.Application(named))(opened.value.row)';
const ownedAt = 'var owned = Features_Check_Generate_Owned.annotationClauses'
  + '(path)(index)(markedType);';

const variants = {
  generation: [
    ['Features.Check.Generate.Control', ownedAt, ownedAt.replace(
      '(markedType)', '(globalThis.__t2gen(context, path, markedType))')]
  ],
  trace: [
    ['Features.Check.Use', 'var functionUse = function (env) {',
      'var functionUse$raw = function (env) {'],
    ['Features.Check.Use', 'var ctorUse = function (env) {',
      'var ctorUse$raw = function (env) {'],
    ['Features.Check.Use', '\nexport {\n    withOrigin,', '\n'
      + wrapped('functionUse', ['env', 'state', 'using', 'v'], 'function')
      + wrapped('ctorUse', ['env', 'state', 'using', 'v'], 'ctor')
      + 'export {\n    withOrigin,'],
    ['Features.Check.Operation', 'var operationUse = function (env) {',
      'var operationUse$raw = function (env) {'],
    ['Features.Check.Operation', '\nexport {', '\n'
      + wrapped('operationUse', ['env', 'state', 'span', 'v', 'index'],
        'operation') + 'export {'],
    ['Features.Check.Apply', consumeApply, `(${hookCall('apply',
      'span, Domain_Resolved.exprSpan(argument), opened.value.row')}, `
      + `${consumeApply})`],
    ['Features.Check.Apply', consumePipe, `(${hookCall('pipe',
      'Domain_Checked_Internal.spanOf(argument), opened.value.row')}, `
      + `${consumePipe})`]
  ]
};

variants.both = [...variants.generation, ...variants.trace];
// The type read-back's completion unifier (ReadBack.purs step 2),
// handed to the probe's hook with the positioned values (theta.mjs).
const mguAt = 'Features_Check_Entailed_Mgu.mgu($$void(view.vars))(remaining)';
variants.theta = [['Features.Check.Strategy.ReadBack', mguAt,
  `globalThis.__t2theta(${mguAt}, values)`]];

const patchOne = (output, [module, find, replace]) => {
  const file = join(output, module, 'index.js');
  const text = readFileSync(file, 'utf8');
  const count = text.split(find).length - 1;
  if (count !== 1)
    throw new Error(`${module}: expected one match, found ${count}`);
  writeFileSync(file, text.replace(find, () => replace));
};

export const makeScratch = variant => {
  const output = outputOf(variant);
  rmSync(join(scratchRoot, variant), { recursive: true, force: true });
  cpSync(join(repoRoot, 'output'), output, { recursive: true });
  for (const patch of variants[variant]) patchOne(output, patch);
  return output;
};

const [what] = process.argv.slice(2);
if (what === 'clean') rmSync(scratchRoot, { recursive: true, force: true });
else if (what in variants) console.log(makeScratch(what));
