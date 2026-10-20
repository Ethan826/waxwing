# Wand's record concatenation, as implemented by Gonzalez: probes

Inputs (`*.expr`) and outputs (`all.out`, `nested-build.out`) of the
companion REPL to Gabriella Gonzalez, "Mechanized type inference for
record concatenation" (haskellforall.com, 2026-07-07), which implements
Wand's inference for right-biased concatenation (LICS 1989).
Source: github.com/Gabriella439/record-concatenation, commit b4a63ba
(2026-06-30, the only commit). It is BSD-3-Clause; by repository policy
neither the source nor the changes made to it are copied here. Only the
programs written for the assessment and the tool's output are.

## Build (2026-10-20)

GHC 9.4.8 and cabal-install 3.10.2.1 (ghcup), with `CABAL_DIR` in a
scratch directory (1.3 GB of dependencies; deleted afterwards). Resolved
versions: lens 5.3.6, Earley 0.13.0.1, megaparsec 9.7.1, repline
0.4.3.0, disjoint-containers 0.3.0.1. One change: `sscript` was removed
from the cabal file's `build-depends` (no module imports it). Nix and
`.envrc` were not used. `cabal build -w ghc-9.4.8`.

The REPL reads one expression per line from standard input, so each
`.expr` file holds one or more one-line programs:

    sh run.sh <path-to-record-concatenation> > all.out

`run.sh` drops the empty prompts; a refused program prints `Type
mismatch`, `Field mismatch` or `Occurs check failed`.

`nested-build.out` is the same run on a diagnostic build that changes
the author's code in one place: field substitution and field deletion
(`substituteField`, `deleteFields`) applied with `Lens.transformOn
biplate` over a derived `Plated Field` instance, so that they also
reach fields of records nested inside a field's type. Only `nested.expr`
changes (see Defects).

## Patches, reproduced (2026-10-20)

Both builds were rebuilt from a fresh clone of b4a63ba and rerun with
`run.sh`; their outputs equal `all.out` and `nested-build.out` byte for
byte. The changes, stated exactly so they can be reapplied without
copying the source here:

1. Build (both builds): delete the line `, sscript` from the
   `build-depends` of record-concatenation.cabal.
2. Nested-field diagnostic (`nested-build.out` only), in src/Core.hs:
   add `instance Lens.Plated Field` (the default `plate`, via `Data`)
   after `instance Monoid Field`; in `solve`, replace `Lens.over
   biplate` with `Lens.transformOn biplate` at the two uses applying
   `substituteField f _F` and the two applying `deleteFields fs`.

Patch files for these (`git format-patch b4a63ba`) are kept outside the
repository, like the source.

## Syntax and encoding notes

Nix-like: `x: e`, application, `let x = e; in e`, `{ l = e; }`, `e.l`,
`e with l = e`, `e without l`, `e // e` (right-biased concatenation),
`+`, numbers, strings, `true`, `false`. There is no type syntax: no
annotations, signatures or declarations. `let` is not generalized
(let-mono.expr: `let id = x: x; in { a = id 1; b = id true; }` is
refused).

- `{ ...a, ...b }` is `a // b`. Nothing refuses overlap.
- `r lacks { l }` on a value `q`: `(j: j q + j (r without l)) (z: 0)`,
  with `r` an otherwise unused lambda parameter in front of the program.
  The lambda-bound `j` makes `q`'s type equal to that of `r without l`,
  so `q`'s `l` is `absent`. `r` is needed because `j q + j (q without
  l)` hits the self-unification defect below.
- A signature's row parts are lambda parameters (`a`, `b`) of the
  function, never supplied by the caller, joined to the parameter by a
  lambda-bound `k`: `(k: (x: y: x) (k p) (k (a // b))) (z: true)`. The
  call's result type then shows what was inferred for each part.
- `(x: y: x) e1 e2` sequences two subterms. Records are not used as
  tuples (see Defects).
- Programs 4 and 5 bodies are typed, not run; values are irrelevant.

## Results

| File | Program | Result |
|---|---|---|
| p3, p3-swap | 3 | accepted, `{ age : Number, name : String }` |
| p3-three | 3, two groupings, inline joins | accepted, equal types |
| p3-three-join | 3, one let-bound join | refused (let not generalized) |
| p3-overlap | 3, overlap control | accepted, `{ name : Number }` |
| p4 | 4 | `{ admin : Boolean } -> { admin ? absent }` |
| p4-left | 4, left part lacks | right part gets `admin : Boolean` |
| p4-nolacks | 4 without lacks | stuck `p q = present Boolean` |
| p4-neg | 4's negative control | interface accepted; call refused |
| p5 | 5 | `{ x : Number, y ? absent }`, `{ x ? absent, y : Number }` |
| p5-explicit | 5, explicit spelling | accepted |
| p5-neg | 5, both lack `y` / `x` | refused |
| p6 | 6 | accepted |
| p6-neg | 6's negative control | definition accepted; call refused |
| p11 | 11, `//` and `with` forms | accepted, `a : Number`, `a : Boolean` |
| p11-neg | 11's negative control | refused |
| p11-lambda, p11-merge | 11's other forms | accepted |
| residual | unsatisfiable residual | accepted (see below) |
| self-unify | `x: (k: k x + k x) (y: 0)` | refused, occurs check |
| nested | concatenation inside a record | wrong type (see below) |

Result type of p4's call (the first argument is the lacks dummy `r`):

    { admin ? u } -> { admin : Boolean } -> { admin ? absent } -> Boolean

p6-neg states the "promise" by unifying the wrapper's result with `(a
// b) with done = true`. Without rigid variables this becomes a
constraint on the callers (`v w = present Boolean`): the definition is
accepted and only the call with `{ name }`, `{ age }` is refused.

p11-merge with `q = { a = "s"; }` gives `String` for both `m1.a` and
`m2.a`: the right operand overrides.

## Verdicts, residual constraints included

The tool prints a type, possibly with constraints it could not solve
(`C => T`), or refuses. It never tests those constraints for
satisfiability (Defects), so a printed type with constraints is not by
itself a successful check. Each output is classified:

| Verdict | Probes |
|---|---|
| accepted, no residual constraints | p3, p3-swap, p3-three, p3-overlap; p4 and p4-left (calls and interfaces); p5, p5-explicit; p6; p11, p11-lambda; p11-merge's calls |
| accepted with residual constraints, satisfiable by hand | p4-nolacks (`p q = present Boolean`: `p = absent`, `q = present Boolean`); p6-neg's definition (`v w = present Boolean`); p11-merge's lambda (`present Number p = present e`, `present Boolean p = present j`: `p = absent`) |
| accepted with residual constraints, unsatisfiable | residual (`z a26` both `present String` and `present Number`): a wrong acceptance |
| refused | p3-three-join, p4-neg (call), p5-neg, p6-neg (call), p11-neg, let-mono, self-unify (wrongly: occurs check) |

"Satisfiable by hand" is an argument from the printed constraints
(choose `absent` for the bare field variable), not a run of a
satisfiability test; Wand's §5 Theorem is the test the tool omits. No
program 4, 5 or 11 result depends on such a residual: each of their
calls types with no residual constraints.

## Defects found

- Unsatisfiable residuals are accepted. residual.expr uses
  `(r // s).x` as a Number and as a String. The result keeps both
  constraints, `z a26 = present String, z a26 = present Number`, and
  the term is accepted; applying it to `{ x = 1; }` and `{ }` is
  refused. Stuck constraints are never tested for satisfiability.
- Unifying a variable with itself fails. The solver's variable cases
  run the occurs check before testing for `a = a`, so `x: (k: k x + k
  x) (y: 0)` reports "Occurs check failed" (self-unify.expr).
- Nested fields are not substituted. `biplate` stops at the
  outermost `Field`, and `substituteField`/`deleteFields` do not
  recurse into a present field's type. So
  `((q: { f = q // { a = 1; }; }) { name = "Ada"; }).f.name + 1` is
  accepted as `Number` (nested.expr); with the diagnostic build it is
  refused (`String` against `Number`), and `.f` gets `{ a : Number,
  name : String }`. Every other probe gives the same output on both
  builds.
