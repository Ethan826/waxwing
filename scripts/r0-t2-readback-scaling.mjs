// The read-back's growth in one node's width and in a body's depth
// (docs/plans/2026-11-04-readback-cost-proposal.md §3): the online path
// (r0-t2-readback-profile.mjs `profiled`) on generated declarations,
//   node scripts/r0-t2-readback-scaling.mjs <build> <family> <n>...
// family `width`: test/text-scale-programs.mjs's "10,000 interpolation
// parts" program with n parts (one Interpolate node of 2n parts);
// family `depth`: `1 + 1 + … + 1` with n terms (an Add chain n - 1
// deep). Prints one JSON line per size: each step's time and, on the
// counting variant (r0-t2-readback-variant.mjs), the walk's tallies.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const right = value => value.constructor.name === 'Right';
const ms = start => Number(process.hrtime.bigint() - start) * 1e-6;

const families = {
  width: count => 'fn id(s: Text): Text = s; fn main(): Text = "'
    + Array.from({ length: count }, (_, index) => `\${id("${index}")},`)
      .join('') + '";',
  depth: count => `fn main(): Int = ${Array(count).fill('1').join(' + ')};`
};

const fresh = () => ({ lookups: 0, steps: 0, levels: 0, built: 0,
  wrapped: 0, keys: new Map() });

const measured = async (load, source) => {
  const parsed = (await load('Format.Parse')).parse(source);
  const program = (await load('Features.Resolve')).resolve(parsed.value0)
    .value0;
  const tables = (await load('Features.Check.Generate.Inputs'))
    .generationInputs(program);
  const holders = (await load('Features.Check.Functional'))
    .functional(program.ctors);
  const decl = program.functions.find(found => found.name === 'main');
  const made = (await load('Features.Check.Generate'))
    .generate(tables.tables)(tables.signatures)(decl);
  const problem = (await load('Domain.Elaborating')).problem(made.value0);
  const { recheck } = await load('Features.Check.Function');
  const { readBack } = await load('Features.Check.Strategy.ReadBack');
  const { readEffects } = await load(
    'Features.Check.Strategy.ReadBack.Package');
  let start = process.hrtime.bigint();
  const live = recheck(holders)(program)(decl).value0;
  const recheckMs = ms(start);
  start = process.hrtime.bigint();
  const found = readBack(problem)(live.function).value0;
  const readBackMs = ms(start);
  globalThis.readBackWalk = fresh();
  start = process.hrtime.bigint();
  const read = readEffects(problem)(found)(live.function)(
    live.state.subst.marks)(live.trace);
  const readEffectsMs = ms(start);
  const { lookups, steps, levels, built, wrapped } = globalThis.readBackWalk;
  return { recheckMs, readBackMs, readEffectsMs, read: right(read),
    walk: { lookups, steps, levels, built, wrapped } };
};

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [build, family, ...sizes] = process.argv.slice(2);
  const load = module =>
    import(pathToFileURL(resolve(build, module, 'index.js')).href);
  for (const size of sizes.map(Number))
    console.log(JSON.stringify({ family, size,
      ...await measured(load, families[family](size)) }));
}
