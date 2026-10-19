// Case 1g against PureScript 0.15.16 (implementation plan Task B0): does
// the adopted design's case 1g (a `Merge` whose parts hold no unknown,
// only fields and the signature's rigid row variables, gives the result
// `r ⊎ s` symbolically) coincide with what PureScript does, matching a
// wanted `Union` against a GIVEN one by the dependency left right ->
// union (Entailment.hs `matches`, lines 275, 735-750)? Each case is a
// module over Prim.Row only, compiled alone into a fresh directory with
// the installed `purs`; nothing is generalized (every declaration has a
// signature, as in Waxwing). `merge` uses `Union` alone, isolating its
// solving from `Nub` (disjointness, which Waxwing checks as facts).
// Prints one line per case; exit 1 if an outcome differs from the one
// recorded below. Usage: node run.mjs   (needs `purs` 0.15.16 on PATH)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HEAD = `import Prim.Row (class Union, class Cons, class Lacks)
data P (r :: Row Type) = P
data S (l :: Symbol) = S
data U = U
merge :: forall r s t. Union r s t => P r -> P s -> P t
merge _ _ = P
ext :: forall l r o. Cons l U r o => Lacks l r => S l -> P r -> P o
ext _ _ = P
`;

// [name, declaration, outcome expected, what 1g does]
const CASES = [
  ['given-same-order', `g :: forall r s rs. Union r s rs => P r -> P s
  -> P rs
g a b = merge a b`, 'accept', 'accept: t := { ...r, ...s }'],
  ['given-swapped', `g :: forall r s rs. Union r s rs => P r -> P s
  -> P rs
g a b = merge b a`, 'NoInstanceFound', 'accept (Sym and 1g are symmetric)'],
  ['no-given', `g :: forall r s. P r -> P s -> U
g a b = h (merge a b)
h :: forall t. P t -> U
h _ = U`, 'NoInstanceFound',
  'accept if r disjoint s is entailed (a clause); else D3'],
  ['label-then-given', `g :: forall r s rs. Union r s rs => Lacks "a" r
  => P r -> P s -> P rs -> U
g a b _ = h (merge (ext (S :: S "a") a) b)
h :: forall t. P t -> U
h _ = U`, 'accept', 'accept: t := { a, ...r, ...s }'],
  ['assoc-given', `g :: forall r s u rs rsu. Union r s rs => Union rs u rsu
  => P r -> P s -> P u -> P rsu
g a b c = merge (merge a b) c`, 'accept', 'accept'],
  ['assoc-other', `g :: forall r s u rs rsu. Union r s rs => Union rs u rsu
  => P r -> P s -> P u -> P rsu
g a b c = merge a (merge b c)`, 'NoInstanceFound',
  'accept: { ...r, ...s, ...u } either way'],
];

let failed = 0;
for (const [name, decl, want, waxwing] of CASES) {
  const dir = mkdtempSync(join(tmpdir(), 'purs-1g-'));
  const file = join(dir, 'M.purs');
  writeFileSync(file, `module M where\n\n${HEAD}\n${decl}\n`);
  const r = spawnSync('purs', ['compile', '--json-errors', '-o',
    join(dir, 'out'), file], { encoding: 'utf8' });
  const json = JSON.parse(r.stdout.trim().split('\n').pop());
  const got = json.errors.length
    ? [...new Set(json.errors.map(e => e.errorCode))].join(',') : 'accept';
  rmSync(dir, { recursive: true, force: true });
  if (got !== want) failed++;
  console.log(`${got === want ? 'ok  ' : 'FAIL'} ${name}: purs ${got}; `
    + `Waxwing 1g: ${waxwing}`);
}
process.exitCode = failed ? 1 : 0;
