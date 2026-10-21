# Source-to-constraint specification for Waxwing's record fragment

Stream 5 of the parallel campaign (dossier §18.13), 2026-10-21. Status:
a specification for review, with examples and a comparison against the
compiler. Nothing here changes the compiler, the dossier or the shared
Lean definitions. Labels for claims follow the dossier's head:
**proved** (Lean, this stream: Composition/Sig/SourceCampaign.lean),
**checked** (run), **derived** (argued here, not proved), **predicted**
(expected compiler behaviour read from its code and tests, not run).

**Corrected in place on 2026-10-21** after the independent review of
streams 5 and 8 (research/division-campaign/reviews/streams-5-8-review.md,
dossier §18.23) and the author's decisions on it (§18.24). Each
correction is marked inline; the list is at the end. The earlier
version is in Git history, and the review is the audit trail.

**Kinds of evidence** (corrected 2026-10-21, dossier §18.23, §18.24).
Four kinds are kept apart, and each claim about acceptance or behaviour
says which it is:

- **check-time refusal**: the checker refuses the program before
  specialization;
- **specialization-time refusal**: the specializer refuses it after
  check has passed;
- **reference-model behaviour**: what a Lean model or its evaluator
  does (stream 8's λ-split), not the compiler;
- **observed generated-code behaviour**: the output of Go the compiler
  emitted and ran. None exists for several tails: no program with two
  tails passes specialization today (Task 8 placeholder, row S2), so no
  claim here is of this kind.

Contents:

1. The intended fragment
2. The translation
3. Specialization-time requirements (the author's priority question)
4. Region sizes: §18.4's open row
5. Examples and expected verdicts
6. Current compiler behaviour
7. Findings
8. Questions for the author
9. Lean, files and reproduction

Sources read: docs/language.md (records, R001-R005, R012), the dossier
§2, §13.1, §14.1, §17, §18.4, §18.6, §18.10, §18.13,
docs/plans/2026-10-20-composition-acceptance-programs.md,
docs/plans/2026-10-19-row-merge-rules.md and -limitations.md,
research/composition-assessment/sig-oracle/source-boundary.mjs,
Composition/Syntax.lean, Sig/Validity.lean, Sig/Finite.lean,
Sig/SourceBoundary.lean, and the compiler under src/Features/Check,
src/Features/Specialize, src/Format/Go and their tests.

## 1. The intended fragment

The grammar below is the part of Waxwing that makes record constraints.
It is docs/language.md's grammar with one intended extension marked
(†): a literal with several spreads, which programs 3, 6 and 11 use and
which the compiler refuses today (§6, F1).

```ebnf
function  = "fn", name, "(", [ param, { ",", param } ], ")", ":", type,
            [ "where", clause, { ",", clause } ], "=", expr ;
clause    = row, "lacks", "{", label, { ",", label }, "}"
          | row, "disjoint", row ;
type      = base | tyvar | type, "->", type
          | "{", [ part, { ",", part } ], "}"
          | upper, "(", targ, { ",", targ }, ")" ;     (declared types)
part      = label, ":", type | "...", row ;
targ      = type | "...", row | "{", part, { ",", part }, "}" ;
expr      = name | literal | expr, "(", args, ")"      (call/apply)
          | "{", item, { ",", item }, "}"              (record literal)
          | expr, ".", label                           (access)
          | expr, "{", label, "=", expr, { ... }, "}"  (update)
          | expr, "without", "{", label, { ... }, "}"  (removal)
          | "match", expr, "{", arm, { ",", arm }, "}"
          | "fn", "(", lparam, { ... }, ")", "=>", expr  (lambda)
          | "{", "let", name, "=", expr, ";", ..., expr, "}"
          | "if" ... | expr, op, expr | text with "${expr}" holes ;
item      = label, ":", expr | "...", expr ;   (several "..." items †)
recordpat = "{", fieldpat, { ",", fieldpat },
            [ ",", "...", [ name ] ], "}" ;
fieldpat  = label, [ ":", pattern ] ;
```

Record-generating positions: record types at any depth (parameters,
results, fields, arrows, declared-type arguments, lambda annotations),
literals, spreads, access, update, removal, record patterns and rest
binders, calls of generic functions (instantiation), and type variables
instantiated at record types.

Outside the fragment (not translated): effects and handlers, `Fail`
payload families, comparison and printability (requirements that §2
does not yet translate; §3 says how they would enter; corrected
2026-10-21, dossier §18.23 F1, F2),
coverage, declared parameterized types other than as abbreviations for
the records they write (Lean's `TExpr` has no type constructors), local
generalization (program 8A), the merge API of program 7.

## 2. The translation

### 2.1 Target

The target is `SigProblem` (Sig/Validity.lean, dossier §13.1): rigid
type variables, rigid row variables, `D` and `B`, over the atoms of
Syntax.lean: `eq t u`, `lacks r l`, `disjoint r s`, `ff`. `TExpr` is
`base | arrow | tvar | record fields tails`; a record expression
`{ l1: t1, ..., ...r1, ..., ...rk }` denotes the disjoint composition of
its fields and tails and is undefined unless they are pairwise disjoint.
An `eq` atom holds only when both sides are defined. The verdict is
`ValidFin` (finite rows and values, §14.8). A call site is the special
case with no rigid variables (`decideCall`'s problem).

### 2.2 Variables

| Source | Variable | Kind |
|---|---|---|
| a declaration's lowercase type names in its signature | type variable | rigid, inside its own body |
| a declaration's `...r` names in its signature | row variable | rigid, inside its own body |
| each use (call or bare reference) of a generic function | fresh copies of all its variables | flexible |
| each spread `...e` in a literal | a fresh row `ρ` | flexible |
| each access, update, removal, record pattern | a fresh row `ρ` and fresh field types `α` | flexible |
| each unannotated lambda parameter, each `let`, each expression result | a fresh type variable | flexible |

Rigid variables are never bound; flexible ones may depend on every
rigid one (`combine`, §13.1). Every type variable, rigid or flexible,
may be equated with any type, a record included.

### 2.3 Rules

`T⟦τ⟧` maps a written type to a `TExpr`: `Int`, `Bool`, `Text`, `Unit`
to base types, `a` to `tvar a`, `A -> B` to `arrow`, `{ l: A, ...r }`
to `record`, and a declared type with record-row parameters to the
record its declaration writes (R012: `Holder({ y: Bool, ...s })` is
`{ x: Int, y: Bool, ...s }`). `e ⇝ (τ, C)` reads "expression `e` has
type `τ` and contributes atoms `C`"; `C` goes into `B`.

| Construct | Type | Atoms |
|---|---|---|
| R1. declaration `fn f(x̄: T̄): R where cs = body` | — | `D` = `cs` (a `lacks` per listed label) ∪ implied(T̄, R); `B` = body's atoms ∪ `τbody = T⟦R⟧` |
| R2. implied clauses | — | for every record type `{ l̄, ...r1, ..., ...rk }` written in a parameter or result type at any depth (inside arrows and declared-type arguments too): `ri lacks lj` for each written label, `ri disjoint rj` for `i ≠ j` |
| R3. local `x` | its binding's type | — |
| R4. literal `1`, `true`, `"…"`, `()` | base | interpolation holes: `τhole = Text` (language.md: other types go through `show`) |
| R5. record literal `{ l1: e1, ..., ...s1, ..., ...sk }` | fresh `α` | each `ei ⇝ τi`; each `sj ⇝ σj` with `σj = { ...ρj }`; `α = { l1: τ1, ..., ...ρ1, ..., ...ρk }` |
| R6. access `e.l` | fresh `β` | `τe = { l: β, ...ρ }` |
| R7. update `e { l = e' }` | `τe` | `τe = { l: β, ...ρ }`, `τe' = β` |
| R8. removal `e without { l̄ }` | `{ ...ρ }` | `τe = { l1: β1, ..., ...ρ }` |
| R9. pattern `{ l̄: p̄, ... }` / `{ l̄, ...x }` against `τs` | binders: `βi`, `x : { ...ρ }` | `τs = { l1: β1, ..., ...ρ }`; subpatterns against `βi` |
| R10. closed pattern `{ l̄: p̄ }` | — | `τs = { l1: β1, ..., ln: βn }` |
| R11. call `f(e1, ..., en)` of a declaration | instantiated result | fresh flexible copies `θ` of `f`'s variables; `τei = θ(T⟦Ti⟧)`; `θ(D_f)` (written and implied) as atoms of `B` |
| R12. bare reference to `f` (partial application, value) | `θ(T⟦T1⟧ -> ... -> T⟦R⟧)` | `θ(D_f)` as in R11 |
| R13. application `e(a1, ..., an)` of a value | fresh `β` | `τe = τa1 -> ... -> τan -> β` |
| R14. lambda `fn(x: T?) => e` | `γ = σ -> τe` | `σ = T⟦T⟧` or fresh; the atom `γ = σ -> τe` (forces the annotation to be defined) |
| R15. `let x = e; rest` | `τrest` | `x : τe`, monomorphic |
| R16. `if`, `match` arms, `+`, `++`, comparison | as today | branch and arm types equal; operands `Int`/`Text`; comparison operands equal |

Notes on the rules:

- **Definedness.** R5's `α = { ... }` atom is what makes an unused
  literal still require disjoint parts (program 11's `let first`), and
  R14's makes an annotation in a body be well formed (language.md:
  `fn(q: { a: Int, ...r }) => q` needs `r lacks { a }`). Without them a
  never-used expression would escape its requirement. These atoms are
  how "a type written in a body is held to the same sets" becomes
  semantic: the annotation's composition is defined only where `D`
  makes it so, so the requirement is entailment from `D`, not a
  separate syntactic rule.
- **Implied clauses come from the signature only** (R2). A body
  annotation implies nothing; it must be entailed (R14).
- **D's shape.** By R1-R2 every `D` from source is a list of `lacks` and
  `disjoint` atoms over rigid rows. There is no source syntax for a
  clause equation, a type-variable clause, a field-type clause or a
  presence requirement (§3 and §4 use this).
- **Spread overlap.** A spread and a written label, or two spreads, may
  not share a label: R5 gives one composition with no bias. Program 7's
  overlapping merge is a separate API, not translated.
- R6 follows §17.1; R7-R10 are this stream's, read from language.md
  ("a rigid tail never supplies a field"; a closed pattern against a
  rigid tail is refused).

Proved (Lean, SourceCampaign.lean): a `D` made only of `lacks` and
`disjoint` atoms is closed downwards (`clauseOnly_down`: removing
fields from rows keeps it true), holds when every row is empty
(`clauseOnly_empty`, so `clauseOnly_satisfiable`), and never forces a
label to be present (`clauseOnly_drop`). Consequences, derived:

- §2.3's refusal of unsatisfiable `D` and O3's vacuity disjunct never
  fire for a source program. (`r disjoint r` and `{ ...r, ...r }` are
  refused at Resolve already; both would be satisfiable by `r = ∅`.)
- A body atom that needs a label present in a rigid row is never valid
  (example n02, `missing_not_validFin`). Every label a body reads
  through a rigid row must be written beside that row in the signature.
- A body atom that needs a rigid type variable to be a record is never
  valid (`tyvarRecord_not_validFin`): nothing in `D` mentions type
  variables, so a rigid `a` ranges over all types.

### 2.4 Where the presence fragment is exact

The presence fragment (§18.6) has set variables, `{l}`, `∪`, and atoms
`e ∩ e = ∅`, `l ∉ e`, `e = e`. The **presence projection** of a
translated problem maps each row variable to a set variable, each
top-level record expression `{ l̄, ...r̄ }` to `{l1} ∪ ... ∪ R1 ∪ ...`,
each `eq` between two record expressions to set equality plus the
pairwise-disjointness atoms of both sides' parts, `lacks` and
`disjoint` to themselves, and drops every other atom.

Derived: typed validity implies validity of the projection, for any
translated problem (a typed witness's domains are a presence witness;
a presence rigid instance extends to a typed one with all fields at one
base type). The converse, which is what makes the presence verdict the
whole verdict, needs the following. The projection is **exact** for a
problem when, after eliminating every flexible type variable that one
`eq` defines (dossier §10.2's binding equations):

- E1. every remaining `eq` relates two record expressions at top level,
  or two types with no record in them;
- E2. field types at labels both sides write are equal by syntax or
  decomposable into atoms satisfying E1 (nested records written on both
  sides, as in p16 and p17s);
- E3. no field type depends on which rigid row a label came from: no
  label can sit in two rigid rows with types that the problem needs to
  agree (§18.4's type-agreement placement), which holds when no `eq`
  relates two compositions that both contain parts of the same two
  rigid rows.

The projection leaves the presence fragment, and the typed questions
(D3a, D3b) take over, at:

- **N1, nesting through rows.** A record arriving inside a field that
  only a row carries, `{ ...Y } = { box: { ...r } }` with `Y` flexible:
  `Y`'s field types tie a nested row to `r`, which no set atom over the
  top-level sets states (§18.10). Arises from source when a generic
  callee's row parameter is instantiated at a record holding records.
  The decomposed form (E2) is exact; the undecomposed form is not.
- **N2, records under arrows.** Callback types (program 5) put rows in
  arrow types; they decompose structurally (E2) when both sides write
  the arrow, which every translated `eq` from R11-R14 does.
- **N3, type variables.** Flexible type variables bound to records are
  eliminated first (p18). Rigid type variables are opaque: by
  `clauseOnly_*` and `tyvarRecord_not_validFin`, a valid source problem
  never needs one to be a record, so §18.9's "division in record-valued
  rigid type variables" does not arise from this grammar (derived; the
  argument is the downward closure plus independence of `a` from `D`).
  D3b's hypotheses "tying rigid type variables to rows" likewise have
  no source spelling: `D` contains no equation.
- **N4, field types.** E3. `n14` (`{ a: Int, ...r }` returned as
  `{ a: Bool, ...r }`) has a valid projection and is invalid typed.

## 3. Specialization-time requirements (the author's priority question)

Question: does this specification include every condition that can
later reject a specialization? **No.** Two requirement kinds do not
appear in §2's translation and depend on the instantiation (corrected
2026-10-21, dossier §18.23 F1, F2):

- **printability** (row S1). At a site whose type is the caller's own,
  solved by a callee's instantiation, it is judged at check time on the
  instantiated type (check-time refusal: h1, pr-cf in the review). At a
  site whose type mentions a generic callee's rigid rows, the check-time
  judgment passes and the requirement is judged after specialization
  (specialization-time refusal: E2, row S1);
- **comparability** (row C2). Inside a generic function it is refused
  whatever the split. In a caller whose operand type the instantiation
  solves, it is judged at check time on that type, so it depends on the
  split (check-time refusal: h3, cmp-cf in the review).

Both are missing requirements, a (b) in §18.17's sense, not observable
differences between valid splits. R010 (row C1) is checked before
specialization but judges the form of the chosen instantiation, which
the translation also does not model; it decides admissibility, not
validity (corrected 2026-10-21, dossier §18.23 F13). Everything else is
either already a constraint, an implementation placeholder, a resource
limit or a compiler invariant.

### 3.1 Inventory

Checks after `check` (Program/Compile.purs:16 runs
`parse >=> resolve >=> check >=> specialize >=> keyed`, then emits Go
text; `go build` is the host's), and the check-phase checks that judge
an instantiation rather than a type. File:line at b5647cc.

| # | Check | Where | Phase | Depends on the split? | In §2's translation? | How it would enter |
|---|---|---|---|---|---|---|
| S1 | printability of `show`, `Console.print`, `crash` arguments: no function or handler at any depth | check time: Check/Printable.purs:54-58 judges the site's type as the checker has solved it. A tail or type variable never "contains a function", so a site at a generic callee's rigid row passes; a site at the caller's own type, solved by the instantiation, is refused there when that type holds a function (h1, pr-cf). After specialization: sites noted at Specialize/Body.purs:92-94; judged in Specialize/Printable.purs:55-63 (`checkSites`), 99-113 (`refuse`, `notPrintable`); called at Specialize.purs:95 (corrected 2026-10-21, dossier §18.23 F2) | caller-side sites: **check time**, on the instantiated type (check-time refusal). Sites at a generic callee's rigid rows: after specialization, at every reached site, including sites in lambdas never applied (specialization-time refusal) | **yes**: which fields reach `{ ...u }` decides, at either phase | **no** | a unary atom `printable τ` in `B` at each site. At a caller-side site it is recorded at check time on the instantiated type, flexible variables included; the caller's operation does not become a declaration on the callee. A site inside a generic callee puts the requirement in the callee's contract (written, or by the eventual inference rules), passed to callers through instantiation by R11 as `lacks` is. Both feed one constraint problem (corrected 2026-10-21, dossier §18.23, §18.24 decision 2; §3.3) |
| S2 | several-tails lowering placeholder, E_INTERNAL `R005B placeholder: rows with several tails are lowered in Task 8` | Specialize/Record.purs:38-44 | specialization of every reached type with two tails | no (every such program) | n/a: implementation gap | none; it is a missing feature, not a requirement |
| S3 | duplicate label in a lowered record, E_INTERNAL | Specialize/Record.purs:57-58 | specialization | would, if reached | yes: R5's definedness atoms | already a constraint; the guard only fires on a checker defect |
| S4 | specialization limit, more than 10,000 polymorphic keys | Specialize/Keys.purs:146-153 (`claim`), used at Keys.purs:94, 126 and Effects.purs:44 | specialization | in principle (different splits, different key sets); a global count | no | not a typing atom; a resource limit, as `E_NESTING` |
| S5 | Fail family keys must fit, E_INTERNAL `Fail without a family` | Format/Go/Families.purs:52-61 (`keyed`); Specialize/Handlers.purs:112 | after specialization | no: families must be concrete at check time (language.md: `Fail needs a concrete error family`) | no (outside the fragment) | none needed while families are closed label sets known at check time |
| S6 | undetermined holes: types to the representative (Int), record rows to the **empty rest** | Specialize.purs:49-53; Specialize/Record.purs:20-25 (and Values.purs) | specialization | yes, if an undetermined split reached it | no | today the checker refuses undetermined merges (Unresolved) before this; if it ever stopped doing so, this is a silent canonical split (empty), which decision 3 rules out |
| S7 | compiler invariants (invalid ids, syntax mismatch, invalid entry) | Specialize.purs:99-100; Body.purs:32; Keys.purs:39, 62, 76, 80, 95; Lower.purs:85, 128, 190, 200, 203, 207, 222; Values.purs:67; Ground.purs:76, 80; Effects.purs:71 | specialization | no | n/a | none; defects |
| C1 | R010 instantiation rule: inside a recursive group a type or row argument must be a bare variable of the caller or ground | Check/Instantiation.purs:53-70 (`judgeCall`, `PolymorphicRecursion`); types: Check/Nested.purs:166 | check, on the solved instantiation | **yes**: a divided witness `r|T` or a composed `{ ...r, ...s }` is neither bare nor ground | no | a side condition on witnesses, not an atom: it restricts which valid solutions are admissible, and leaves validity unchanged (corrected 2026-10-21, dossier §18.23 F13; §3.3) |
| C2 | comparison: operand ground, no function | Check/Comparable.purs:18-24, 76-80 | check, on the operand's type as solved | inside a generic function, no: any rigid tail or variable is refused (`not comparable`), any hole is `Ambiguous type`. **In a caller whose operand type the instantiation solves, yes** (check-time refusal): of two splits of one `divide` call, both meeting its clauses, `u = { c }` passes check and `u = { c, f }` is refused with `Type { c: Int, f: Int -> Int } is not comparable` (cmp-c, cmp-cf in the review; h3/h4 with one tail) (corrected 2026-10-21, dossier §18.23 F1) | no | a missing requirement: a unary atom `comparable τ`, recorded at check time on the instantiated type, flexible variables included, and not a declaration on the callee (§18.24 decision 2). Inside a generic function, an undetermined split part in a comparison is refused as ambiguous |
| C3 | `main`'s result printable and ground | Check.purs:56-65 | check | no (ground) | no | none needed |
| C4 | inferred type depth over 1,000 | the unifier's `TooDeep` (e.g. Check/Record.purs:157) | check | in principle (size of the solution) | no | a resource limit |

Nothing in Format/Go refuses a program except S5 (searched: the only
`Left` in src/Format/Go is Families.purs:61).

### 3.2 The `show` example: (a) or (b)?

Stream 6's example: inside `divide`, a never-applied
`let peek = fn(p: { ...u }) => show(p);`. With the split giving
`u = {}` it compiles; with `u = { f }`, `f` a function field, S1 refuses
it after specialization (specialization-time refusal; the site is in
the generic callee, at its rigid row).

**Under this specification it is (b), an incomplete constraint model.**
The argument:

1. §2's translation of `divide` has no atom for `show(p)`: R13 types
   the call, and `show` accepts any type. So `divide`'s problem says
   nothing about `u`'s field types, and both splits satisfy it.
2. S1 nevertheless rejects one split. A check that rejects a
   specialization the constraint problem accepts is, by definition, a
   requirement the problem does not contain.
3. The requirement belongs to `divide`, not to the split: under a ∀
   reading of `divide`'s own signature, its body needs `printable u`
   for every `u` its `D` allows, and `D` (lacks, disjoint) cannot say
   that, so with S1 added as an atom `divide` itself is invalid at its
   declaration, whatever any caller does. The current compiler instead
   checks it per instantiation, as language.md states ("generic code
   may print an open record, and the type is checked at each
   instantiation"): a template-style rule, not a ∀ rule.

When the `show` site is in the caller instead, in a lambda whose
parameter type the split solves (E2c; pr-cf in the review), the
refusal comes at check time, on the caller's instantiated type
(check-time refusal). That requirement is the caller's: it is recorded
as a check-time constraint on the instantiated type, flexible variables
included, and does not become a declaration on `divide` (corrected
2026-10-21, dossier §18.23 F2; §18.24 decision 2).

**The applied `peek`: claim withdrawn** (corrected 2026-10-21, dossier
§18.23 F3; §18.24 decision 4). The earlier version said that once
`peek` is applied and both splits are printable, the printed output
differs between two valid splits, a genuine (a). No such distinction
has been demonstrated. A counterexample must give `peek` a well-typed
argument of type `{ ...u }` without adding a projection and without
fixing the split. The candidates the review tried each fail, and they
are kept here as evidence; they do not exhaust the language:

- `peek(whole)` and `peek(left)` are ill-typed (check-time refusal for
  `whole`: `Expected { ...u }, found { ...u, ...v }`);
- a parameter `part: { ...u }`, a parameter that holds `{ ...u }` in a
  field or an extension, or a callback returning a written record, fixes
  `u` through the caller's value;
- a function of type `({ ...p, ...q }) -> { ...p }` needs a projection
  (stream 8's E3, outside the projection-free fragment);
- a callback `g: (Int) -> { ...u }` passed `fn(n) => crash("boom")`,
  with the split written by a second lambda, or a divergent
  `fn absurd(n: Int): { ...p } = absurd(n)`, is well typed, projects
  nothing and fixes nothing, but never gives `show` a value. The crash
  or divergence is the same under both splits (derived; the crash pair
  passes check and stops at the Task 8 placeholder, and `absurd` with
  the split left open is refused at check by `CannotTell`, so neither
  ran end to end).

In stream 8's reference model, run-time irrelevance (`eval_split`)
holds for every projection-free term, so no projection-free argument
makes the model's results differ (reference-model behaviour). No
generated code was observed. Comparison output is not covered by that
model either (stream 8, F5).

So the reported refusal is (b). This example gives no (a) and no
reason for decision 3. Decision 3 (forced or written splits) stands on
the author's rulings: §18.17 item 3 and §18.22 (corrected 2026-10-21,
dossier §18.23 F3).

**Written splits** (corrected 2026-10-21, §18.24 decision 1). Today an
unforced split passes check only when the caller writes it, by
annotating a lambda parameter of type `({ ...u }) -> …` (the checker's
own `CannotTell` diagnostic asks for this). Such a caller-side
annotation counts as a written split under decision 3 when it actually
determines the relevant split; one that leaves the same ambiguity
unresolved does not. A written split must still satisfy every caller
and callee requirement: cmp-cf writes a split that the caller's own
comparison then refuses at check time.

### 3.3 Where signature validity and compile acceptance differ

1. **S1, printability** (above). Validity says yes for every `u`;
   acceptance depends on the instance, at check time for caller-side
   sites and after specialization for sites at a generic callee's rigid
   rows (corrected 2026-10-21, dossier §18.23 F2). With a `printable`
   atom, the
   requirement is a unary predicate that distributes over composition
   (`printable(x ⊎ y)` iff both) and holds of `∅`, like `lacks` with
   one flag per row: a row-level clause keeps it within set terms over
   rigid rows (a part of a non-`printable` rigid row must not reach
   `u`). A field-level reading (place each label by whether its type
   is printable) would be a type-dependent placement, outside set terms
   (the §18.4 challenge "type-agreement placement" in another form).
   A row-level clause is a shorthand: it needs an explicit translation
   to the corresponding requirement on the record type, and the
   recorder specification keeps a requirement's origin (caller or
   callee) apart from the type it operates on (corrected 2026-10-21,
   §18.24 decision 2; the choice between the two readings is the
   review's M1, left to the reconciled specification).
2. **C2, comparability** (corrected 2026-10-21, dossier §18.23 F1).
   Inside a generic function the check is conservative and does not
   depend on the split. In a caller, it judges the operand's
   instantiated type at check time, and two splits that both meet the
   callee's clauses differ in acceptance (check-time refusal, cmp-c and
   cmp-cf). This is a missing requirement, like S1, recorded at check
   time on the instantiated type (§18.24 decision 2).
3. **C1, R010.** Validity quantifies over all witnesses; R010 admits
   only witnesses whose row arguments are bare or ground within a
   recursive group. A recursive generic function that is valid only
   through a divided or composed witness has no admissible witness, and
   is refused at check time. Validity is unchanged; R010 decides
   admissibility, a separate property (corrected 2026-10-21, dossier
   §18.23 F13; §18.22 item 3). Example shape: a self-recursive `route`
   (its call of itself would need `u := r|T`). Not run (no build, §6).
4. **S4 and C4**, resource limits: acceptance can fail on a valid
   program by size. Not a constraint question.
5. **S2**, the lowering placeholder: every valid program whose reached
   types have two tails is refused today. An implementation gap.
6. **S6**: if an undetermined split were ever lowered, the empty rest
   would be chosen silently. Today Unresolved refusal prevents it; a
   future solver that accepts undetermined splits must not reach S6.

No check found depends on the split in a way the current atoms already
express; the three that depend on it (S1, C2 at caller sites, C1) are
outside the translation (corrected 2026-10-21, dossier §18.23 F1).

## 4. Region sizes: §18.4's open row

§18.4 asks whether any source construct expresses `≠ ∅` or a count.
Argued construct by construct (derived; the atoms are those of §2.3):

| Construct | Presence atoms | `≠ ∅` or count? |
|---|---|---|
| `lacks` (written, R1; implied, R2) | `l ∉ R` | no |
| `disjoint` (written, implied) | `R ∩ S = ∅` | no |
| literal, spread (R5) | pairwise `∩ = ∅` of parts; `A = {l̄} ∪ P̄` | no |
| access, update, removal, patterns (R6-R9) | `T = {l} ∪ P`, `P ∩ {l} = ∅` | it forces `l ∈ T`, a written label: an equation with the constant `{l}`, handled by patterns (§18.6), never about a rest region |
| closed pattern (R10) | `T = {l̄}` | no; it forces a rest to be empty, an equation to `∅` |
| call (R11, R12) | the callee's clauses: `lacks`, `disjoint` | no |
| type variables, arrows, lets, `if`, `match` | equalities | no |
| `{}` (removal of every field, `{ ...rest }`) | `T = ∅` | no |

No source construct produces a negated atom or a disjunction: there is
no `≠` clause, `if` and `match` type both branches, a record pattern
never tests a label at run time (types are static, `{}` is not a
pattern), and coverage is not a typing atom. Equations relate only
unions of parts, so no atom compares sizes.

Constructs that would introduce `≠ ∅` or counts if added, recorded for
the author: (i) instance selection that depends on whether a field is
present (program 7's per-field semigroups, if selected by presence);
(ii) row reflection (a `keys`, `RowToList` or field-count operation);
(iii) a pattern or type test that distinguishes an empty rest; (iv) a
`where` clause stating presence (`r has { l }`), which would also break
`clauseOnly_down`. None is in the grammar.

## 5. Examples and expected verdicts

Files: research/division-campaign/source/examples/*.wxw (each with a
`main`, since the compiler requires one). Notation: `R` rigid rows,
`D`, `B` (flexible variables primed or Greek), `{ ...r }` written
`{r}`. Columns: **valid** (`ValidFin` of the translation), **P9s**
(certified or Unresolved; P9s never answers Contradiction), **pres.**
(validity of the presence projection, §2.4), **typed** (expected verdict
of a typed division checker such as D4 if D3a holds; conjectural).
"S" marks a call-site problem (no rigid variables; the question is
whether a solution exists and whether the split is forced).

### 5.1 Positive (should be accepted)

| File | Shape | Translated problem | valid | P9s | pres. | typed |
|---|---|---|---|---|---|---|
| p01-greeting | program 1 | `R={r}`, `D: r lacks name`; `B: {name: Text, r} = {name: β, ρ}`, `β = Text` | yes (`greeting_validFin`) | certified (§17) | valid | yes |
| p02-mark | program 2 | `D: r lacks reviewed` (written and implied); `B: {r} = {ρ}`, `α = {reviewed: Bool, ρ}`, `α = {reviewed: Bool, r}` | yes (`mark_validFin`) | certified | valid | yes |
| p03-mark-implied | p02 without `where` | same `D` (implied by the result type alone) | yes | certified | valid | yes |
| p04-mark-all | forwards to `mark` | §17 `markForwarded` | yes (`markForwarded_validFin`) | certified | valid | yes |
| p05-join | program 3 | `D: r # s`; `B: {r} = {ρ1}`, `{s} = {ρ2}`, `α = {ρ1, ρ2}`, `α = {r, s}` | yes (`join_validFin`) | certified | valid | yes |
| p06-forwarded, p06s | program 6 | §17 `forwarded` | yes (`forwarded_validFin`) | certified | valid | yes |
| p07-join3, p07s | `join(join(a, b), c)` | §17 `join3` | yes (`join3_validFin`) | certified | valid | yes |
| p08s-swapped-stub | `join(b, a)` | `D: r # s`; `B: {s} = {r'}`, `{r} = {s'}`, `r' # s'`, `{r', s'} = {r, s}` | yes (`swapped_validFin`, this stream) | expected certified (whole rests; not run) | valid | yes |
| p09-both | program 11 | §17 `both` | yes (`both_validFin`) | certified | valid | yes |
| p10-wrap-accepts | caller of program 4 | §17 `wrapAccepts`: `{r} = {a', b'}`, `b' lacks admin`, `a' # b'` | yes (`wrapAccepts_validFin`) | certified | valid | yes |
| p11-route | §17.3 | `routeSig`: `D: s # t`; `B: {r} = {u', v'}`, `{s} = {s'}`, `{t} = {t'}`, `u' # s'`, `v' # t'`, `u' # v'` | yes (`routeSig_validFin`) | **Unresolved** (`routeSig_not_accepts`) | valid (the presence `split`) | expected yes, `u' = r|(dom r ∖ dom s)` |
| p12-route-narrowed | `route` plus `r # s` | as p11, `D: s # t, r # s` | yes (`routeNarrowed_validFin`) | certified | valid | yes |
| p13-older | update through a written field | `D: r lacks age`; `B: {age: Int, r} = {age: β, ρ}`, `β = Int`, `{age: Int, r} = {age: γ, ρ'}`, `γ = Int` | yes (derived) | expected certified | valid | yes |
| p14-drop | `without` | `D: r lacks a`; `B: {a: Int, r} = {a: β, ρ}`, `{ρ} = {r}` | yes (derived) | expected certified | valid | yes |
| p15-rest-binder | `{ a, ...others }` | as p14 | yes (derived) | expected certified | valid | yes |
| p16-nested-access | `x.box` returning `{ ...r }` | `B: {box: {r}} = {box: β, ρ}`, `β = {r}` | yes (derived) | expected certified | valid (E2: decomposed) | yes |
| p17s-nested-join-stub | composition inside a field | `D: r # s`; `B: {box: {r}} = {box: β, ρ}`, `β = {r'}`, `{s} = {s'}`, `r' # s'`, `γ = {box: {r', s'}}`, `γ = {box: {r, s}}` | yes (derived) | expected certified | valid (E2) | yes |
| p18-twice-tyvar | `same(x, x)`, `same(p: a, q: a)` | `B: α = {r}`, `α = {r}` | yes (`twice_validFin`) | expected certified | valid after eliminating `α` | yes |
| p19-self-call | `both(x: {u}): {u, v} = both(x)` | `D: u # v` (implied by the result); `B: {u} = {u'}`, `u' # v'`, `{u', v'} = {u, v}` | yes (`selfCall_validFin`) | expected certified | valid | yes |
| p20-pattern-open | `{ name, ... }` | `D: r lacks name`; `B: {name: Text, r} = {name: β, ρ}`, `β = Text` | yes (derived) | expected certified | valid | yes |
| p21-body-type-implied | annotation `{ ...r, ...s }` | `D: r # s` (implied by the parameter); `B: γ = {r, s} -> Int` | yes (derived) | expected certified | valid | yes |
| S c21-accepts-parts | program 4 at its call | `{admin: Bool} = {r', s'}`, `s' lacks admin`, `r' # s'` | solvable; split forced (`admin ∈ r'`) | n/a (call) | solvable | n/a |
| S c22, c22s | program 5 | `α = {r'} = {u'}`, `β = {s'} = {v'}`, `{r', s'} = {x: Int, y: Int}`, `r' # s'`, `u' lacks y`, `v' lacks x` | solvable; forced (`r' = {x}`, `s' = {y}`) | n/a | solvable | n/a |
| S c23-both-lambda | program 11, lambda | `q: ρ`; `α1 = {ρ, a: Int}`, `α2 = {ρ, a: Bool}`, `ρ = {name: Text}` | solvable | n/a | solvable | n/a |
| S c24-both-two-spreads | program 11, two spreads | `α1 = {ρ1, ρq}`, `{ρ1} = {a: Int}`, likewise `α2`; `ρq = {b: Int}` | solvable | n/a | solvable | n/a |

### 5.2 Negative (should be refused)

| File | Shape | Why invalid | valid | P9s | pres. | typed |
|---|---|---|---|---|---|---|
| n01-undeclared-merge | `{ ...a, ...b }`, no clause | `r`, `s` may share a label (§13.2 `unnamed_labels_matter`) | no | Unresolved | invalid | no |
| n02-missing-field | `p.name` through `{ ...r }` | `r` may be empty (`missing_not_validFin`) | no | Unresolved | invalid | no |
| n03-extend-unlacked | `{ ...p, reviewed: true }`, no lack | `r` may hold `reviewed` | no | Unresolved | invalid | no |
| n04-route-unclaused | `route` without `s # t` | `r = s = t = {l}`: `l` must go to `u'` (meets `s`) or `v'` (meets `t`) | no | Unresolved | invalid | no |
| n05-pass-twice | `g(p, p)`, `g`'s `r # s` | `t # t` needs `t = ∅` | no | Unresolved | invalid | no |
| n06-wrapper-no-fact | `g(a, b)` without `u # v` | `u`, `v` may overlap | no | Unresolved | invalid | no |
| n07-closed-pattern-rigid | `{ a }` against `{ a: Int, ...r }` | `r` may be non-empty | no | Unresolved | invalid | no |
| S n08-overlap-call | `join({ x: 1 }, { x: 2 })` | `{x} # {x}` | no solution | n/a | no solution | n/a |
| S n09-accepts-parts-both-lack | program 4's control | neither part may hold `admin` | no solution | n/a | no solution | n/a |
| S n10-both-call-has-a | `both({ name: "Ada", a: 2 })` | the argument violates `r lacks a` | no solution | n/a | no solution | n/a |
| n11-tyvar-not-record | `x.name` with `x: a` | `a` may be `Int` (`tyvarRecord_not_validFin`) | no | Unresolved | n/a (no row) | no |
| n12-wrapper-promises-more | program 6's control | result `{extra: Int, r, s}` ≠ `{r, s}` | no | Unresolved | invalid | no |
| n13-nested-rigid-field | `g(x)` with `g(p: { box: { ...u }, ...v })` | needs `box ∈ r` (`clauseOnly_drop`) | no | Unresolved | invalid | no |
| n14-retype | `{ a: Int, ...r }` as `{ a: Bool, ...r }` | `Int ≠ Bool` | no | Unresolved | **valid** (N4) | no |
| n15-nested-retail | `{ box: { ...r } }` as `{ box: { a: Int, ...r } }` | nested `{r} ≠ {a: Int, r}` | no | Unresolved | top level **valid**; decomposed invalid (N1/E2) | no |
| n16-body-type-two-tails | annotation `{ ...r, ...s }`, no clause | the annotation is undefined when `r`, `s` overlap | no | Unresolved | invalid | no |

Where the verdicts differ: P9s and typed division differ only on p11
(`route`); presence-only and typed differ on n14 and on n15's top-level
projection. The call-site rows (S) are not signature problems; their
second question is decision 3's (is the split forced or written?),
answered forced for c21 and c22. A caller-side annotation counts as
written when it actually determines the split (corrected 2026-10-21,
§18.24 decision 1).

## 6. Compiler behaviour at the original stream base

Historical observation: the missing module was later restored in 2d175e3;
§18.18 and the integration review record later checker probes. Keep the
following predictions and observations at their original base distinct
from those later runs.

**F0, the stream-base tree does not build.** At b5647cc,
`npm run build` fails with `ModuleNotFound Features.Check.SeveralTails`,
imported by src/Features/Check/Removal.purs:14 and RestBinder.purs:15;
commit 43b3a28 deleted the module. Restoring it in this worktree was
refused by the session's permission check, so this stream did not run
the checker. What was run:

- **Checked (run):** Parse and Resolve, compiled from unmodified
  sources (every workspace module whose imports avoid the missing one,
  `purs compile` into the worktree's ignored output/), through
  `node research/division-campaign/source/run.mjs`. Output below.
- **Predicted:** the Check verdicts, from the compiler's tests and
  code, each with its evidence. To be confirmed by running `run.mjs`
  after a build that includes Check.

| File | Intended | Run (Parse, Resolve) | Check, predicted | Evidence for the prediction |
|---|---|---|---|---|
| p01-greeting | accept | passes | accept | examples/records.wxw; r001 tests |
| p02-mark | accept | passes | accept | test/r005-lacks.test.mjs, r005-check "extends" |
| p03-mark-implied | accept | passes | accept | implied lacks include the result (Resolve/Apart.purs:162-166) |
| p04-mark-all | accept | passes | accept | r005-lacks: "through a wrapper that passes the row on" |
| p05-join | accept | **refused**: E_TYPE 3:11 `A record literal accepts at most one spread` | — | run |
| p06-forwarded | accept | **refused** (same, in `join`) | — | run |
| p06s-forwarded-stub | accept | passes | accept (1g) | r005b-limitations "control: both parts given" |
| p07-join3 | accept | **refused** (same) | — | run |
| p07s-join3-stub | accept | passes | accept (1g twice) | rules §3 table (`merge (merge a b) c`) |
| p08s-swapped-stub | accept | passes | accept (1g, either orientation) | rules §3 table (`merge b a`) |
| p09-both | accept | passes | accept | program 11 recorded as current behaviour |
| p10-wrap-accepts | accept | passes | **refuse**, Unresolved (D4 "Cannot tell ... no annotation can decide") | O4: `Merge a' b' r` with only a `lacks` deciding; r005b-limitations "O4, kept" |
| p11-route | accept | passes | **refuse**; likely as a contradiction (D6 "must be ..., but neither u nor v can hold r"), see F3 | rules §0 (rigid rows are indivisible atoms) and §7 (H) |
| p12-route-narrowed | accept | passes | **refuse**, Unresolved: only `u'` can hold `r`, and no rule moves an atom to its only possible part (removed at B2) | limitations doc, "O4" |
| p13-older, p14-drop, p15-rest-binder, p20 | accept | passes | accept | r001-expressions, r005-check, r004 tests |
| p16-nested-access | accept | passes | accept | single tails |
| p17s-nested-join-stub | accept | passes | accept (1g at a nested position) | rules §10 (nested rows in research/row-merge-typed) |
| p18-twice-tyvar | accept | passes | accept | poly-check (instantiation) |
| p19-self-call | accept | passes | accept (2g) | r005b-limitations "recursive self-call" |
| p21-body-type-implied | accept | passes | accept | language.md Tranche B ("a parameter or result type that writes both") |
| c21-accepts-parts | accept | passes | **refuse**, Unresolved (O4) | r005b-limitations, exact text pinned for `granted2` |
| c22-compose-requirements | accept | **refused** at `join`'s literal | — | run |
| c22s (stub) | accept | passes | **refuse**, Unresolved (split decided only by `lacks`, O4's kind) | as c21; not pinned by a test |
| c23-both-lambda | accept | passes | accept | Tranche A on flexible rows |
| c24-both-two-spreads | accept | **refused**: E_TYPE 3:29, one spread | — | run |
| n01-undeclared-merge | refuse (no clause) | **refused**: E_TYPE 2:19, one spread | — | run; refused for the wrong reason (F1) |
| n02-missing-field | refuse | passes | refuse: `name is not a field of { ...r }` | language.md, records |
| n03-extend-unlacked | refuse | passes | refuse: `r may already have field reviewed` | r005-check |
| n04-route-unclaused | refuse | passes | refuse (H or D3) | as p11 |
| n05-pass-twice | refuse | passes | refuse: `t is in both records and may have fields` | r005b-disjoint |
| n06-wrapper-no-fact | refuse | passes | refuse: `u and v are not known to be disjoint; ...` | r005b-disjoint |
| n07-closed-pattern-rigid | refuse | passes | refuse: `Pattern is missing the rest of ...` | language.md, record patterns |
| n08-overlap-call | refuse | **refused** at `join`'s literal | — | run; the intended reason (D2) is unreached |
| n09-accepts-parts-both-lack | refuse | passes | refuse (H) | r005b-disjoint "a decomposed lack" (analogous) |
| n10-both-call-has-a | refuse | passes | refuse: `a is not allowed here: r lacks { a }` | r005-lacks |
| n11-tyvar-not-record | refuse | passes | refuse: `Expected a record, found a` | language.md, access |
| n12-wrapper-promises-more | refuse | **refused** at `join`'s literal | — | run |
| n13-nested-rigid-field | refuse | passes | refuse (rigid `r` cannot supply `box`) | language.md "a rigid tail never supplies a field" |
| n14-retype | refuse | passes | refuse: `Expected Bool, found Int` | r001-unify |
| n15-nested-retail | refuse | passes | refuse (shape mismatch) | r001-unify |
| n16-body-type-two-tails | refuse | **refused**: E_TYPE 2:25 `r and s are not known to be disjoint; require r disjoint s in the signature` | — | run; agrees with the intended reason |

Full output of the run (`node research/division-campaign/source/run.mjs`,
2026-10-21): every file not marked refused above printed
`passed resolve; check unavailable`.

## 7. Findings

Discrepancies between the intended translation and the compiler, as
findings, not fixes. Each says whether it was run or predicted.

- **F0 (run).** The r005b-replan tip does not build from a clean
  checkout: 43b3a28 deleted src/Features/Check/SeveralTails.purs while
  Removal.purs:14 and RestBinder.purs:15 import it. (Reported to the
  coordinator, who is committing the fix on main.)
- **F1 (run).** A literal with two spreads is refused at Resolve
  (Resolve/Record.purs:73-80), so programs 3, 6 and 11's third form,
  and every example built on a literal `join`, never reach the
  constraint check. Negative controls n01 and n08 are refused, but for
  this reason, not for their intended ones (no clause; overlap).
- **F2 (predicted).** The compiler reads rigid rows as indivisible atoms
  (row-merge-rules §0). Its verdicts therefore track P9s's whole-rest
  model, not `ValidFin`: `route` (p11) is refused although valid.
- **F3 (predicted, the most important to run).** For p11 the end-of-body
  rule H (row-merge-rules §7) should find that neither `u'` nor `v'`
  can hold `r` (each would need an undeclared disjointness with `s` or
  `t`) and report a **Contradiction** (D6). The dossier's §2.1 reserves
  Contradiction for problems with no solution; `route` has one. If the
  run confirms it, H's refusal is unsound with respect to the intended
  semantics wherever a solution divides a rigid row. P9s answers
  Unresolved here, as it must.
- **F4 (predicted).** Valid problems that P9s certifies are refused as
  Unresolved: p10 (`wrapAccepts`) and p12 (`routeNarrowed`), and the
  call-site splits of programs 4 and 5 (c21, c22s), all forced by a
  `lacks` or a single possible part. The acceptance programs require 4
  and 5.
- **F5 (code read; caller side run by the review).** Printability and
  comparability depend on the split while validity does not (§3). At
  caller-side sites both are judged at check time on the instantiated
  type (check-time refusal: h1, h3, pr-cf, cmp-cf in the review);
  printability at a generic callee's rigid rows is judged after
  specialization (specialization-time refusal, S1) (corrected
  2026-10-21, dossier §18.23 F1, F2).
- **F6 (code read).** R010 judges the solved instantiation (C1): any
  solution that divides or composes rigid rows inside a recursive group
  is not admissible and is refused, so division and recursion cannot
  combine today. The solution stays valid; admissibility is a separate
  property (corrected 2026-10-21, dossier §18.23 F13).
- **F7 (code read).** Undetermined record rows are lowered as the empty
  rest (S6). Harmless while the checker refuses undetermined splits; a
  canonical split by another name if that ever changes.
- **F8 (derived).** No source construct gives `D` an equation, a type
  clause or a presence requirement, so D3b's agreement-forcing
  hypotheses (`r = s ⊎ t`, `α = { ...r }`) and §18.9's record-valued
  rigid type variables have no source spelling in this grammar. They
  remain relevant only if the grammar grows.
- **Agreements (predicted).** Implied clauses include the result type
  (p03), as R2 says; body annotations must be entailed, not implied
  (n16, run); a rigid row never supplies a field (n02, n07, n13).

## 8. Questions for the author

Ambiguities in the intended source behaviour, not resolved here:

1. **Several spreads.** Is a literal with several spreads part of the
   intended fragment (programs 3, 6, 11 use it; language.md refuses
   it)? This specification assumes yes (R5).
2. **Result-type implications.** `fn mark(p: { ...r }): { reviewed:
   Bool, ...r }` implies `r lacks { reviewed }` from its result alone
   (R2, and the compiler agrees). Program 2's text calls the written
   clause what "makes this operation deliberately fresh". Is the
   implied lack, with its obligation on callers, intended?
3. **Implied clauses inside arrows and callback parameters.** R2 takes
   every record written anywhere in a parameter or result type, a
   callback's parameter (a contravariant position) included. Intended?
4. **Printability.** Keep the per-instantiation check (validity and
   acceptance differ; split selection then depends on it), or make it a
   requirement: a `where r printable` clause, or a class constraint
   from the instance-selection direction, implied to callers like
   `lacks` (§3.3)? A field-level reading would place labels by type.
   *Answered* (§18.22 item 1, §18.24 decision 2; corrected 2026-10-21):
   printability and comparability are represented in interfaces and
   may be inferred. Caller-side ones are check-time constraints on the
   instantiated types, flexible variables included; ones from inside a
   generic callee appear in its contract. The row-level versus
   field-level reading is left to the reconciled specification.
5. **R010 and division.** Should a recursive group accept row arguments
   that are divided (`r|T`) or composed (`{ ...r, ...s }`) parts of the
   caller's rigid rows, or does division stop at recursion?
6. **Contradiction versus Unresolved for divisions.** Until a dividing
   checker exists, should a rigid row that no part can hold whole be
   reported as Unresolved (dossier §2.1) rather than as a contradiction
   (H, F3)?
7. **Patterns on flexible rows.** The compiler extends an unknown tail
   by a pattern's labels and closes it when a pattern lists every known
   field without `...` (language.md). R9-R10 give each pattern its own
   equation; whether arm order or "every known field" can change a
   verdict under R10 has not been checked.
8. **Effects and `Fail` payloads.** Out of scope here. Should a later
   pass translate record rows inside effect rows and failure families
   (their label sets are families, which must stay closed)?

## 9. Lean, files and reproduction

Lean (research/composition-proofs/Composition/Sig/SourceCampaign.lean,
imported from Composition.lean; existing model only; no `sorry`;
`#print axioms` gives propext, Classical.choice, Quot.sound for each):

| Theorem | Statement |
|---|---|
| `clauseOnly_down` | a `D` of `lacks`/`disjoint` atoms stays true when fields are removed |
| `clauseOnly_empty`, `clauseOnly_satisfiable` | such a `D` holds at the all-empty (finite) assignment |
| `clauseOnly_drop` | removing any one field keeps such a `D` true |
| `swapped_validFin` | p08s is valid |
| `selfCall_validFin` | p19 is valid |
| `twice_validFin` | p18 is valid |
| `tyvarRecord_not_validFin` | a rigid type variable equated with a record is invalid |
| `missing_not_validFin` | n02 is invalid |

Reproduction (from the repository root):

```sh
cd research/composition-proofs && lake build     # 67 jobs, no warnings
# After a build that includes Features.Check (F0 fixed):
npm run build
node research/division-campaign/source/run.mjs   # all phases
```

`run.mjs` loads output/'s compiled modules, runs Parse, Resolve, Check
and Specialize in order (no Go toolchain), and reports a missing phase
as unavailable rather than as a pass. To reproduce this stream's
partial run without the fix, compile only the modules whose imports
avoid Features.Check.SeveralTails into output/ and run the same script;
it prints `check unavailable` after Resolve.

Disk: the worktree's output/ and .spago/ (about 80 MB, ignored by git)
were removed after the run; no Go build cache was created.

## Corrections

Corrected in place on 2026-10-21 after the review in
research/division-campaign/reviews/streams-5-8-review.md (dossier
§18.23), following the author's decisions (§18.24). The earlier text is
in Git history.

- **Kinds of evidence** (head): check-time refusal, specialization-time
  refusal, reference-model behaviour and observed generated-code
  behaviour are named and kept apart; none of the last kind exists for
  several tails.
- **F1** (§3 intro, row C2, §3.3, F5): comparison in a caller is judged
  at check time on the instantiated type and depends on the split
  (cmp-c, cmp-cf). It is a missing requirement (b). The earlier row
  said it never separates two valid splits.
- **F2** (§3 intro, row S1, §3.2, §3.3, F5): caller-side printability is
  judged at check time, not after specialization; only sites at a
  generic callee's rigid rows wait for specialization.
- **F3, decision 4** (§3.2): the applied-`peek` (a) claim is withdrawn.
  The failed candidates are kept as evidence, without a claim that they
  exhaust the language. `peek` is no longer given as a reason for
  decision 3, which stands on §18.17 item 3 and §18.22.
- **Decision 2** (rows S1, C2, §3.2, §3.3, question 4): caller-side
  printability and comparability are check-time constraints on the
  instantiated types, flexible variables included, not new declarations
  on the callee; a row-level clause needs an explicit translation to the
  record-type requirement.
- **Decision 1** (§3.2, §5): a caller-side annotation counts as a
  written split when it actually determines the split, and must still
  satisfy every caller and callee requirement.
- **F13** (row C1, §3 intro, §3.3, F6): R010 decides admissibility, not
  validity.
