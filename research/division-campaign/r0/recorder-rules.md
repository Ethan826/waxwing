# R0b: a syntax-directed recorder specification

Stream T-R0b of the design tranche authorized in dossier §18.66
(decision 1, "R0: generate-then-decide"). Date 2026-10-21; base 67ba706;
revised after the reviews of 88c052d (revision log at the end).
**A document only:** no compiler change, no prototype, no proof, no
selection rule, no witness representation. It specifies what a
recorder generates. Whether and how a verdict is reached is T-R0a's
(the generation/verdict interface); §10 states the shape this stream
assumes.

**Canonical here** (the other documents cite these): the problem's
shape (§10 `RecordedProblem`), the generation rules (§3), `vars` and
`types` (§5.2, which serve as T-R0a's site table), variable and entry
identities and origins (§2.3, §6), and the refusal-independence test
RT2 (§9; T-R0a's AT1 cites it). **Owned elsewhere:** witness, bindings
and termination (witness/statements.md, "W"); outcome and verdict
types and the pipeline (r0/generation-interface.md, T-R0a); layers and
codes (r0/boundaries.md, T-R0e); refutation (refute/statements.md,
CX); refusal evidence (r0/refusal-audit.md, T-R0c). Where a rule here
waits on an author ruling, it gives the proposed default and says
"pending author Q<n>" (the reconciliation review's Q1-Q10).

Labels, as in requirements.md: **cited** (file:line or section; source
lines at 67ba706), **argued** (reasoning, unchecked), **proposed** (a
design choice for the author). Nothing here is checked: no fixture or
translator has been run.

**[VOR]** marks every rule, atom and test that involves requirement
atoms (`Q`, `BQ`: printability and comparability). Their semantics,
`ValidOpenR`, is **unstated** (requirements.md §11 item 2; recorder-spec
P1 states only `ValidFinR`). The recorder records them in full, with
their origins, whatever the verdict rule. Recording them now keeps the
problem complete for when the semantics arrives.

The rule for judging them is not the recorder's, and is **pending
author Q2**. requirements.md §11 item 2 reads "a problem with a
non-empty `Q` or `BQ` is Unsupported for every strategy"; taken
literally that makes every program Unsupported, since Sig10 puts
`pr ⟦R⟧` of `main` into `BQ` always. Proposed default (the common
wording of the reconciliation review, finding E2): **`BQ` atoms over
ground types are judged by a stated ground rule** (a function type is
neither printable nor comparable: a definition, not `ValidOpenR`);
**`BQ` atoms that mention a flexible or rigid variable make the
problem Unsupported for every strategy whose `Sound_F` does not cover
them.** No verdict rests on a non-ground requirement atom until
`ValidOpenR` is stated.

Sources read: dossier §18.60-18.66; research/division-campaign/remedy/
requirements.md (revision 2, esp. §2); source/translation.md (whole);
integration/recorder-spec.md (whole); integration/recorder-interface.md;
src/Domain/Resolved.purs, Resolved/Core.purs, Type/Core.purs,
Type/Record.purs, Checked/Internal.purs; and the checker modules cited
where a construct's current shape-dependence is described.

Contents:

1. What decision 1 changes in the recorder
2. The generation judgement
3. Rules, construct by construct
4. Shape-dependent constructs without a solved shape
5. The `vars` map and the ∀rigid/∃flexible structure
6. Origins
7. recorder-spec §3, row by row
8. Recording on refusal: Q10
9. Acceptance tests (stated, not implemented)
10. Interface with T-R0a
11. Conflicts and questions
12. Revision log (reviews of 88c052d)

## 1. What decision 1 changes in the recorder

Decision 1 (§18.66): syntax-directed generation of the complete
problem; the online solver is a search strategy; original obligations
and source origins preserved; no architecture built on tainting and
recovery from solver-chosen bindings. Consequences for recorder-spec
(proposed unless cited):

- **The recorder is a pure, total function**, `generate : Tables →
  Signatures → FunctionDecl → RecordedProblem`, over the resolved AST
  (src/Domain/Resolved.purs:18-58; Resolved/Core.purs:70-84). It takes
  no checker `State`, no `Subst`, no meta counter and no diagnostic.
  The completeness criterion of requirements.md §2.4 ("the atoms one
  occurrence contributes do not depend on how any other atom was
  solved") then holds by the function's type: no substitution is in
  scope (argued).
- **Hooks, makers and the store go.** recorder-spec §2.2's makers
  (`Expected`, `Selected`, `RigidBase`, `Defined`, `ContractUse`,
  `PrintSite`, `CompareSite`) and recorder-interface §3's hook table are
  replaced by **rule ids** (§3). recorder-spec §5.2 (atoms as data in
  the row store, RowStore.purs:54, reverting with the substitution) is
  **dropped**: there is no substitution to revert with. Its rollback
  table (postponed effect pairs, `settleRows` retries, `predicateFor`
  evaluated twice, hint states, hypothetical unifications, re-checks
  for diagnostics) has nothing to apply to. §5.1's "original" holds by
  construction: no atom is ever rewritten.
- **`BQ` is generated by rules, not by a walk over the unsettled body**
  (recorder-spec §2.2 `PrintSite`, `CompareSite`; requirements.md §2.4).
  The site's type is the generated type expression, which mentions the
  flexible variables the split decides, so cmp-c and cmp-cf record the
  same atom (recorder-spec T8b) by construction (argued). [VOR]
- **recorder-spec §6's rigid-overlap procedure becomes a consequence of
  rule E25** (§3.3): the extension's definedness atom over `{ ...r }`
  requires `r lacks l`; no hook before `mayHave` is needed (argued).
- **`adm` and `split` change content.** Both judge a *witness*
  (recorder-spec §2.4), which generation never sees. The recorder
  records the *sites* (syntactic: the call, its callee and the problem
  variables of its slots). It records every reference to a function,
  with no component flag: whether the callee shares a recursive
  component with `f` is a program-wide fact, and admission (T-R0e), the
  first program-wide stage, filters the sites by it. So a change to
  `f`'s body never changes `g`'s problem (T-R0a AT13). The witness's
  form is supplied by a strategy and judged by the admission component.
  Those judgements live beside the problem, never inside it. §10, §11
  item 3.
- **`Outside RequirementAtom` is withdrawn as a model gap**
  (requirements.md §10: "a checker limit encoded as a model gap → an
  `Unsupported` reason"). Requirement atoms are recorded atoms; a
  strategy that cannot judge them reports Unsupported. [VOR]
- **Static rules are not judged by generation.** Arity of builtins,
  over-application of a fixed result, coverage, entry rules: class a
  (requirements.md §2.3) is judged by separate passes, `staticRules ∷
  Tables → FunctionDecl → Array StaticRefusal` (the type is T-R0a's),
  whose refusals are reported **beside** the problem. Generation is
  total over the resolved AST: it never stops and never fails, and a
  statically refused declaration still has its problem (T-R0a's
  `Refused (NonEmptyArray StaticRefusal) RecordedProblem`). This
  answers T-R0a Q-b4: no (proposed; §2.4, §10).

What stays from recorder-spec: the vocabulary of origins and kinds
(§1.1, §1.2), the parts of the problem (§2.1), field-level requirement
atoms with the row-level shorthand (§2.3), the definedness-preserving
normalization (§5.3), group O's constructors (§2.5, less
`RequirementAtom`), and the test intent of §10.

## 2. The generation judgement

### 2.1 Target grammar

Atoms are Lean's (Composition/Syntax.lean, cited translation.md §2.1):
`eq t u`, `lacks ρ l`, `disjoint ρ σ`, `ff`. Type expressions are
Lean's `TExpr` (`base | arrow | tvar | record fields tails`) extended,
**proposed**, by one node:

```text
RTExpr ::= base b | arrow RTExpr RTExpr | tvar x
         | record [(l, RTExpr)] [ρ]
         | app h [RTExpr]          -- h: a TypeId, or Handler e
```

`app h []` with `h` a declared type of no parameters is `base h`
(recorder-interface §4). Any other `app` is not in Lean's `TExpr`
(translation.md §1: declared parameterized types are outside the
fragment), so a rule that builds one also emits an `outside` marker
(§3.5). The atom is still recorded: the problem stays complete and the
marker says the model cannot judge it (proposed; §11 item 4).

Requirement atoms [VOR]: `pr τ`, `cmp τ` over `RTExpr`, field-level,
with `r printable` meaning `pr { ...r }` (cited recorder-spec §2.3).

### 2.2 Translating written types

`⟦T⟧ν` maps a resolved `Ty VarId` (Type/Core.purs:56-65) under a naming
`ν : VarId → variable`:

| `Ty VarId` | `⟦·⟧ν` |
|---|---|
| `TInt`, `TBool`, `TText`, `TUnit` | `base Int`, `base Bool`, `base Text`, `base Unit` |
| `TVar i` (sort `TypeSort`) | `tvar ν(i)` |
| `TRecord { fields, tails }` | `record [(l, ⟦T_l⟧ν)] [ν(i) for each tail i]` (tails are `RecordSort`) |
| `TFun a row b` | `arrow ⟦a⟧ν ⟦b⟧ν`; the effect row is **erased** (recorder-interface §4; requirements.md §11 item 13) |
| `TData t args rows`, `rows` empty, `args` empty | `base t` |
| `TData t args rows`, otherwise | `app t [⟦args⟧ν]`, with `outside` (§3.5) |
| `THandler label rows` | `app (Handler e) [⟦label args⟧ν]`, with `Outside HandlerType` |

Two namings occur. Inside declaration `f`, `ν_f(i)` is `f`'s **rigid**
variable `i`. At an occurrence at path `p` of a callee or constructor
`g`, `ν_{p}(i)` is the fresh flexible variable `⟨p, inst i⟩` (§2.3).
Variables of sort `RowSort` (effect rows) are never translated; they
appear only in erased positions (argued from the table).

### 2.3 Fresh variables

Every fresh variable has a **canonical name** `⟨p, role⟩`: the path `p`
of the AST node that introduces it (§6) and a role from this list
(proposed):

| Role | Sort | Introduced by |
|---|---|---|
| `inst i` | the sort of the callee's, owner's or effect's `VarId i` (type or row) | E3-E6, E17, E20, P4 |
| `res` | type | E5 (over-application), E11, E12, E14, E15, E18 and E19 (`crash`), E21-E23, E25 |
| `param k` | type | E13 (unannotated parameter `k`), E18 |
| `field l`, `rest` | type, row | E26, E28, P5-P7 |
| `upd l`, `updrest l` | type, row | E27 (one pair per updated label) |
| `spread j` | row | E25 (the `j`-th spread item) |

Canonical names make two independent generators produce **equal**
problems, not problems equal up to renaming, so §9's RT1 is a syntactic
comparison (proposed; recorder-interface §5 test 1 needed a renaming
search). A fresh variable is introduced only where a rule needs an
unknown; every other node's type is built from its children. The
problem is therefore one fixed member of the class that
translation.md §2.2 describes (which gives every expression a fresh
variable); the two differ by defining equations only (argued).

### 2.4 The judgement

`Γ ⊢_p e ⇝ τ ; C` reads: under local environment `Γ : LocalId →
RTExpr`, the occurrence of `e` at path `p` has type `τ` and contributes
the multiset `C` of entries, each one of: a `B` atom, a `BQ` atom [VOR],
an `outside` marker, or a site record (`adm`, `split`). Every entry
carries an origin (§6). A rule's `C` is its own entries plus its
children's, in the rule's listed order.

Properties required of the rules (proposed; §9 states their tests):

- **G-total.** Every constructor of `Resolved.Expr` (36), `Pattern` (6),
  `Rest` (3) and `Item` (3) is covered by exactly one rule (a rule may
  cover several constructors), and every rule produces a result.
  Generation never fails.
- **G-local.** `C` and `τ` are functions of the node, its path, `Γ`,
  the children's `(τ, C)`, and the tables (callee signatures, type,
  constructor and effect tables). Nothing else: in particular not the
  call graph, so a declaration's problem depends only on its own syntax
  and the signatures it references.
- **G-dead.** Every syntactic occurrence is generated, including unused
  `let`s, discarded items, unapplied lambdas, unreachable arms and the
  arguments of a call refused for arity.
- **G-fresh.** No fresh variable is shared between two occurrences; two
  occurrences of one callee get disjoint copies.

## 3. Rules, construct by construct

Columns: rule id; resolved constructor (Domain/Resolved.purs line);
result type `τ`; fresh variables; entries; recorder-spec rows; the
translation.md rule it restates. Notation: `τ_c` is child `c`'s type;
`{ l̄: τ̄, ...ρ̄ }` is `record`; `σ → τ` is `arrow`; `θ` is the naming
`ν_p` of §2.2 at this node's path. Origins (contract, types, body, inst)
follow recorder-spec §1.1.

### 3.1 The declaration: `D`, `Q` and the body's result

For `f : FunctionDecl` (Resolved.purs:93-115):

| Rule | Source | Entries | spec rows | tr. |
|---|---|---|---|---|
| Sig1 | `f.variables`, `f.sorts` | rigid type variables: `VarId`s of sort `TypeSort`; rigid rows: of sort `RecordSort`; `RowSort` erased | §2.1 | §2.2 |
| Sig2 | parameter `i`, `LocalId i` | `Γ₀(LocalId i) = ⟦T_i⟧ν_f` (as Check/Function.purs `parameterLocal` binds them) | — | R1 |
| Sig3 | `f.body` at path `ε` | `Γ₀ ⊢_ε body ⇝ τ_b ; C_b`; then `B ∋ eq τ_b ⟦R⟧ν_f` (origin body) | B1 | R1 |
| Sig4 | `f.constraints`, `Lacks` | `D ∋ lacks r l` per label (origin contract; span of the label) | A1 | R1 |
| Sig5 | `f.constraints`, `Disjoint` | `D ∋ disjoint r s` (origin contract) | A2 | R1 |
| Sig6 | parameter, result and effect-row types | `D ∋ lacks r l` for each record type written at any depth, as Check/Implied.purs:28 `implied` computes (origin types) | A3, D3 | R2 |
| Sig7 | `f.joined` | `D ∋ disjoint r s` per pair (origin types) | A4, D3 | R2 |
| Sig8 | declared types with record-row arguments | `D` gains their implied clauses, as Check/Implied.purs:52 `passed`; the type itself follows §2.2 (`app`, `Outside DataOverRecords`) | A5, O5 | R2 |
| Sig9 | contract requirements | `Q`: empty; no syntax or inference exists [VOR] | A6, A7 | — |
| Sig10 | `f` is the entry | `BQ ∋ pr ⟦R⟧ν_f` (origin contract of `main`) [VOR]; groundness of `main` is a static rule (EntryPolymorphic), not an atom | C5 | — |

`D` is computed from the declaration, never from the body, as
recorder-spec §2.1 and recorder-interface §3.4 already specify (cited).

### 3.2 Expressions: leaves, calls and functions

| Rule | Constructor | `τ` | Fresh | Entries | spec rows | tr. |
|---|---|---|---|---|---|---|
| E1 | `Integer`, `Boolean`, `TextLiteral`, `UnitValue` | `base` | — | — | — | R4 |
| E2 | `Local id` | `Γ(id)` | — | — (parameters, `let`s, pattern binders, lambda parameters alike) | — | R3 |
| E3 | `FunctionRef g` | `θ(⟦T₁ → … → R⟧)` | `⟨p, inst i⟩` per non-`RowSort` var of `g` | `B ∋ θ(D_g)`, written and implied (origin inst); `BQ ∋ θ(Q_g)` [VOR]; an `adm` site for every reference (no component flag; admission filters by component, §1); `split` site if `g` has a `RecordSort` variable | F2, F3, F5, F6, F7, D4 | R12 |
| E4 | `CtorRef c` | `θ(⟦fields → owner(args)⟧)` | `⟨p, inst i⟩` per owner var | `B ∋ θ(implied of c.joined)`; `outside` per §3.5 | F8, O5 | R12 |
| E5 | `Call g [e₁..e_k]`, `g` declares `n` | `k ≤ n`: `θ(T_{k+1} → … → R)`; `k > n`: `⟨p, res⟩` | as E3; `⟨p, res⟩` if `k > n` | as E3, and `eq τ_{e_i} θ(⟦T_i⟧)` for `i ≤ min(k, n)`; if `k > n`: `eq θ(⟦R⟧) (τ_{e_{n+1}} → … → τ_{e_k} → ⟨p, res⟩)` | F1-F3, F5, F7, B1, D4 | R11, R13 |
| E6 | `Construct c [ē]` | as E5 with `c`'s fields and owner | as E4 | as E4, and argument equations as E5 | F8, O5 | R11 |
| E13 | `Lambda params body` | `σ₁ → … → σ_m → τ_body` (Check/Lambda.purs `arrowType` convention, cited) | `⟨p, param k⟩` per unannotated parameter | `σ_k = ⟦A_k⟧ν_f` (annotations name only `f`'s variables, Resolved.purs:85-86) or `⟨p, param k⟩`; `B ∋ eq σ_k σ_k` per annotation (definedness, origin types; it carries the body type's `lacks`/`disjoint` obligations, see the note); body under `Γ[x_k ↦ σ_k]` | B14, D2 | R14 |
| E14 | `Apply e [a₁..a_k]` | `⟨p, res⟩` | `⟨p, res⟩` | `eq τ_e (τ_{a₁} → … → τ_{a_k} → ⟨p, res⟩)` | B1 | R13 |
| E15 | `Pipe l r` | as E14 with `e = r`, `a₁ = l` | as E14 | as E14 (FN001 §5: `a \|> e` applies `e` to `a`; a named call on the right is generated by E5 as a partial application, so no case split on its form) | B1 | R13 |

Notes (argued unless marked):

- E5's over-application and E15 read only syntax: the declared count
  `n` comes from `g`'s signature (Resolved/Core.purs:62,
  `GlobalFunction FunctionId Int`). Today's arity refusal when `θ(R)`
  can never be a function (Check/Pipe.purs:15-21, cited) is class a,
  judged separately; the atom `eq θ(⟦R⟧) (… → ⟨p, res⟩)` is recorded
  either way, and with a ground non-arrow `R` it is a head clash on
  original atoms (a class c1 candidate, CX's to state (CX Q4)).
- E3-E6 never record a `Union` (recorder-interface §2): a callee
  parameter with several tails, matched against one argument row (F4),
  is the ordinary atom `eq τ_e θ({ ...l, ...r })`. Definedness of the
  composition is in the atom (Syntax.lean:81-84, cited recorder-spec D1).
- E13's definedness atom is the one recorder-spec §5.3 forbids
  normalization to drop. It is emitted for every annotation; trivial
  ones (no record with two parts, no label beside a tail) may be dropped
  by the same normalization on both sides of a comparison.
- **Body-type `lacks`/`disjoint` checks move into generation**
  (proposed, from T-R0c §3.12 and §6 item 3; **pending author Q4**).
  Today Resolve refuses an annotation such as `{ a: Int, ...r }`
  without `r lacks a` in `D` (Features/Resolve/Lacking.purs:126-167,
  d02) and `{ ...r, ...s }` without `r disjoint s` (Features/Resolve/
  Apart.purs:141-158, n16), program-wide, before any problem exists.
  Under this proposal Resolve no longer refuses them, and E13's
  definedness atom `eq σ_k σ_k` is the obligation: under ∀rigid it
  needs `r lacks a` (resp. `r disjoint s`) at every instance satisfying
  `D`, so a missing clause gives an invalid problem with a checked
  counter-instance (T-R0c: d02 at `r ↦ { a: Int }`, n16 at `r, s ↦
  { z1: Int }`), decided by CX, not by a Resolve stop. Nothing is
  dropped: the obligation is the same atom, now with its origin. Until
  Q4 rules, Resolve still refuses and §8's exception does not apply.

### 3.3 Expressions: operators, control and records

| Rule | Constructor | `τ` | Fresh | Entries | spec rows | tr. |
|---|---|---|---|---|---|---|
| E7 | `Add l r` | `base Int` | — | `eq τ_l Int`, `eq τ_r Int` | B1 | R16 |
| E8 | `Concat l r` | `base Text` | — | `eq τ_l Text`, `eq τ_r Text` | B1 | R16 |
| E9 | `Interpolate parts` | `base Text` | — | `eq τ_part Text` per part | B1 | R4 |
| E10 | `Compare op l r` | `base Bool` | — | `eq τ_l τ_r`; `BQ ∋ cmp τ_l` (origin body) [VOR] | B1, C6, C7, C8 | R16 |
| E11 | `If c y n` | `⟨p, res⟩` | `⟨p, res⟩` | `eq τ_c Bool`, `eq τ_y ⟨p, res⟩`, `eq τ_n ⟨p, res⟩` | B1 | R16 |
| E12 | `Match s arms` | `⟨p, res⟩` | `⟨p, res⟩` | arm `k`: pattern against `τ_s` (§3.4) giving `Γ_k`; body under `Γ_k`; `eq τ_{body_k} ⟨p, res⟩` | B1 | R16 |
| E16 | `Block items v` | `τ_v` | — | items in order: `Let x e` gives `Γ[x ↦ τ_e]` (monomorphic); `Let _ e`, `Discard e`: `e`'s entries only; `Defer e`: `eq τ_e Unit` and `Outside Deferred` | B1, O6 | R15 |
| E24 | `RecordLiteral fields` | `{ l̄: τ̄ }` | — | fields' entries only (labels are distinct: `DuplicateField` at Resolve; a closed literal of distinct labels is always defined) | B2, D1 | R5 |
| E25 | `RecordExtension items` | `⟨p, res⟩` | `⟨p, spread j⟩` per spread; `⟨p, res⟩` | per spread `j`: `eq τ_{s_j} { ...⟨p, spread j⟩ }`; then `eq ⟨p, res⟩ { l̄: τ̄, ...⟨p, spread 1⟩, …, ...⟨p, spread k⟩ }` | B2, B3, B5, B6, D1 | R5 |
| E26 | `FieldAccess e l` | `⟨p, field l⟩` | `⟨p, field l⟩`, `⟨p, rest⟩` | `eq τ_e { l: ⟨p, field l⟩, ...⟨p, rest⟩ }` | B4 | R6 |
| E27 | `RecordUpdate e fields` | `τ_e` | `⟨p, upd l⟩`, `⟨p, updrest l⟩` per field | per field: `eq τ_e { l: ⟨p, upd l⟩, ...⟨p, updrest l⟩ }`, `eq τ_{e_l} ⟨p, upd l⟩` | B7 | R7 |
| E28 | `RecordRemoval e labels` | `{ ...⟨p, rest⟩ }` | `⟨p, field l⟩` per label, `⟨p, rest⟩` | `eq τ_e { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }` | B8, B9 | R8 |

Notes (argued unless marked):

- E10 records `cmp` at the left operand only, as today's walk judges
  it (Check/Comparable.purs:21-23, cited); with `eq τ_l τ_r` the right
  operand's atom would be equivalent. Under the ∀rigid reading, `cmp`
  of a type mentioning a rigid variable fails at a function-valued
  instance, so today's C6 refusal reappears as a semantic consequence of
  an empty `Q` rather than a separate rule [VOR]. C8 (`Ambiguous type`
  at a hole) does **not** reappear: an unconstrained flexible variable
  can be chosen comparable, so C8 is a policy or admissibility rule
  (ADR 007 condition 2), not validity (§11 item 9).
- E25 covers one spread (today's extension), several spreads (†,
  refused at Resolve today, Resolve/Record.purs:80 `SecondSpread`,
  cited recorder-spec B3) and both kinds of base: if `τ_{s_j}` is
  `{ ...r }` with `r` rigid, the spread's atom makes the spread row equal
  `r`, and the definedness of the second atom then needs `r lacks l` for
  every written `l`: recorder-spec §6's rigid-overlap obligation, with no
  hook (argued). The written `lacks` of B5 on a flexible base is likewise
  part of that definedness.
- **The second spread is in-model; generation emits no marker and no
  support record for it.** E25's several-spread atoms are ordinary
  `eq` atoms, and an `outside` marker would wrongly say the model
  cannot judge them. Whether a second spread is a language rule (class
  a: Resolve keeps refusing it, so E25's several-spread case is never
  reached) or a support boundary (S1) is T-R0e's §7 Q3, **pending
  author Q4**. Either way S1 reads the spread count from the problem:
  the `vars` entries with role `spread j` at the node's path (§2.3).
- E24 needs no atom: its parts are fields only. A literal with a spread
  is a `RecordExtension` in the resolved AST (Resolved.purs:56-57).

### 3.4 Patterns, matched against a type `τ_s`

`Γ ⊢_p P : τ_s ⇝ Γ' ; C`. Resolved/Core.purs:70-84.

| Rule | Pattern | Fresh | Entries | `Γ'` | spec rows | tr. |
|---|---|---|---|---|---|---|
| P1 | `Wildcard` | — | — | `Γ` | — | — |
| P2 | `Bind x` | — | — | `Γ[x ↦ τ_s]` | — | R9 |
| P3 | `IntLit`, `BoolLit` | — | `eq τ_s Int` / `eq τ_s Bool` | `Γ` | B1 | R16 |
| P4 | `Ctor c [P̄]` | `⟨p, inst i⟩` per owner var | `eq τ_s θ(owner(args))`; sub-pattern `k` against `θ(⟦field_k⟧)`; `outside` per §3.5 | union of sub-patterns' | B1, O5 | R16 |
| P5 | `Record fields NoRest` | `⟨p, field l⟩` | `eq τ_s { l̄: ⟨p, field l⟩ }`; sub-pattern `l` against `⟨p, field l⟩` | sub-patterns' | B12 | R10 |
| P6 | `Record fields IgnoredRest` | `⟨p, field l⟩`, `⟨p, rest⟩` | `eq τ_s { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }`; sub-patterns | sub-patterns' | B11 | R9 |
| P7 | `Record fields (NamedRest x)` | as P6 | as P6 | sub-patterns' and `x ↦ { ...⟨p, rest⟩ }` | B10, B9 | R9 |

Each arm's pattern contributes its own equation against the shared
`τ_s`. Conjunction is order-free, so arm order cannot change the
problem (argued). Today's growth rule (Check/PatternRow.purs:76
`growable`, :84; recorder-spec B13) is solver behaviour, and no
`Outside PatternGrowth` is emitted (proposed; §11 item 2).

### 3.5 Builtins, effects and outside markers

| Rule | Constructor | `τ` | Fresh | Entries | spec rows |
|---|---|---|---|---|---|
| E18 | `PrintRef`, `ShowRef`, `CrashRef` | `π → Unit`, `π → Text`, `π → ⟨p, res⟩` | `π = ⟨p, param 0⟩`; `⟨p, res⟩` for `crash` | `BQ ∋ pr π` (origin body) [VOR] | C1-C4 |
| E19 | `Print [e]`, `Show [e]`, `Crash [e]` | `Unit`, `Text`, `⟨p, res⟩` | `⟨p, res⟩` for `crash` | `BQ ∋ pr τ_e` (origin body) [VOR]. With other than one argument: every argument's entries, no `pr` (arity is class a) | C1-C4 |
| E17 | `OperationRef e i`, `Perform e i [ē]` | `θ(⟦T̄ → result⟧)` (reference), `θ(⟦result⟧)` (perform) | `⟨p, inst j⟩` per non-`RowSort` parameter `j` of `e` (none when `e` has none) | `eq τ_{e_k} θ(⟦T_k⟧)` per argument; if `e` has parameters: `Outside EffectArgument` (the link from `θ`'s parameters to the handler's instantiation runs through the erased effect row and is not recorded) | O1, O2 |
| E20 | `Handler label clauses` | `app (Handler e) [⟨p, inst j⟩ per parameter]` | `⟨p, inst j⟩` per non-`RowSort` parameter `j` of `e` | `Outside HandlerType`; clause bodies generated with parameters at `θ` of their declared types | O3 |
| E21 | `With h body` | `⟨p, res⟩` | `⟨p, res⟩` | `Outside HandlerType`; children generated; no equation through the handler | O3 |
| E22 | `Handle body clauses` | `⟨p, res⟩` | `⟨p, res⟩` | `Outside FailFamily`; `eq τ_body ⟨p, res⟩`, `eq τ_{clause} ⟨p, res⟩`; clause locals at the label's payload type | O4 |
| E23 | `Fail family e` | `⟨p, res⟩` | `⟨p, res⟩` | if `family` is written: `eq τ_e ⟦family⟧`; `Outside FailFamily` unless `family` is written and translates to a type with no record and no variable | O4 |

`Outside` markers carry their origin like atoms. **A marker's condition
is syntactic too:** it is decided from the node and the tables, never
from a solved type (proposed; this is the same criterion applied to
markers). Where today's rule depends on a solved shape (a `fail` payload
that may be a record; an effect argument that may hold one), the marker
is emitted conservatively. Constructors, extending recorder-spec §2.5
(proposed): `EffectArgument`, `DataOverRecords`, `DataApplication`
(new: `app` with arguments, §2.1), `HandlerType`, `FailFamily`,
`Deferred`, `LocalGeneralization` (no resolved construct produces it
today: lambdas and `let`s are monomorphic, Check/Lambda.purs:22-26
cited). Coverage is **not** a constructor: it is a static pass, class
a (T-R0e §3.2; requirements.md §2.3), unless T-R0c's answer to T-R0a
Q-c1 says otherwise. Effect rows on arrows are erased (§2.2), not
marked; the independence of effect checking from record solutions stays
an assumption (requirements.md §11 item 13; recorder-spec Q4).

**A non-empty `outside` blocks a whole-function Solved** (decision 1;
adversarial review finding 5; T-R0a §5.3 rule 1 and AT11), **pending
author Q3**. Some rules record no equation for an obligation they
cannot express (the "dropped" column); decision 1 allows that only
because the marker then blocks Solved. A marker never blocks
Contradiction: the recorded atoms are a subset of the obligations,
and refuting a subset refutes the whole (CX's C1-M, `ValidOpen`
antitone in `B`; T-R0a AT11).

| Marker | Rules | An obligation left unrecorded? |
|---|---|---|
| `EffectArgument` | E17 | yes: effect parameters against the handler's instantiation |
| `HandlerType` | E20, E21 | yes: body and handler agreement (E21 records no equation through the handler) |
| `FailFamily` | E22, E23 | yes, when the family is not written: the payload's equation |
| `DataApplication`, `DataOverRecords` | §2.2, E4, E6, P4, Sig8 | no: the atom is recorded in full with `app`; Lean's `TExpr` cannot judge it |
| `Deferred` | E16 | none known: `eq τ_e Unit` is recorded; the marker carries recorder-spec O6's gap |
| `LocalGeneralization` | none | not emitted |

The reconciliation review (finding E1) proposes instead that only
markers of acceptance-relevant kinds block Solved, since otherwise
most realistic programs (any `Option(a)`) are Unsupported. This
document keeps the conservative rule until Q3 is ruled, and states the
condition any refinement must meet: a kind may stop blocking Solved
only if its rules leave no obligation unrecorded (a "no" row above),
or a slice theorem states that the recorded atoms imply the omitted
ones, with a check (§11 items 4-6).

## 4. Shape-dependent constructs without a solved shape

requirements.md §2.4 (R7's list) names the constructs whose current
checking branches on a solved shape. For each: today's branch (cited),
and the generated form (argued that it needs no shape).

| Construct | Today: branch on the solved shape | Generated form |
|---|---|---|
| record extension | Check/Extension.purs:76-77 `extend`: "a record base is judged; a hole base becomes `{ ...ρ }` …; anything else is no record"; rigid base: Check/Overlap.purs:89-96 `mayHave` | E25: each spread gets a fresh `⟨p, spread j⟩`; the base is equated with `{ ...ρ }` whatever it is; definedness of the result carries the lacks |
| field selection | Check/Record.purs:138-175 `select`, `notSelected`: record → missing field; hole → grow; rigid or closed → refused; several tails → `Placeholder` | E26: `eq τ_e { l: β, ...ρ }`, fresh `β`, `ρ`; a rigid or closed receiver makes the atom unsatisfiable at some instance, which is a verdict, not a generation step |
| patterns | Check/PatternRow.purs:60-90: grow a hole tail by unknown labels, close it when every known field is listed, refuse a rigid tail without `...` | P5-P7: one equation per pattern against `τ_s`, fresh `β̄`, `ρ`; closed or open by the pattern's syntax only |
| application | Check/Apply.purs `applyValue`, `functionLike` (and Check/Pipe.purs:30-40): whether the callee's solved type is a function | E14, E15: `eq τ_e (τ̄ → β)`, fresh `β` |
| removal | Check/Removal.purs:25-55: `withinOneTail` refuses several tails; `remainder` needs a `TRecord` | E28: `eq τ_e { l̄: β̄, ...ρ }`, result `{ ...ρ }`; any number of tails |
| several tails | Union predicates, `shareTails`, `Merge`, rule H (Check/RowMerge/*, Homes.purs:29-34) | no special form: every composition is an `eq` between record expressions; the solver's predicates are search state, never recorded |
| over-application, pipe | Check/Pipe.purs:15-21: arity at a fixed result, before or after instantiation | E5, E15: syntactic count; the atom is recorded either way |
| `fail` payload | Check/Failure.purs:99-102 `familyUnknown` (`FailNeedsConcrete`); recorder-spec O4: Failure.purs:43, Defer.purs:144-169 | E23: `Outside FailFamily` decided from the written family only |

Why fresh `β`/`ρ` suffice (argued). Each generated equation `eq τ { l̄:
β̄, ...ρ }` states exactly what the construct requires of its operand in
every solution: some fields at `l̄` and some remainder. When the
operand's type is already a record in a solution, the fresh variables
are determined by it (records are cancellative under disjoint
composition with written labels); when it is a flexible variable, they
are free. Either way the atom does not depend on which case a solver
meets first. This is translation.md §2.2's table, rows "each spread"
and "each access, update, removal, record pattern" (cited).

## 5. The `vars` map and the ∀rigid/∃flexible structure

### 5.1 Quantifier structure (proposed, from requirements.md §2.4)

One level per declaration. **Rigid** (∀): `f`'s `VarId`s of sort
`TypeSort` or `RecordSort` (Sig1). **Flexible** (∃, each depending on all
rigid ones): every fresh variable of §2.3. Nothing else is a variable.
There is no nested quantifier: lambdas and `let`s are monomorphic, and
a callee's own rigid variables never appear in `f`'s problem; each
occurrence gets flexible copies (E3-E6, P4). Lambda annotations name only
`f`'s variables, so they introduce no new rigid one (cited Resolved.purs:
85-86). The problem's meaning is `ValidOpen` of `⟨rigidTy, rigidRow, D,
B⟩` (requirements.md §1), and, once stated, `ValidOpenR` with `Q`, `BQ`
[VOR].

### 5.2 The map

**`vars` and `types` are canonical here and together are the site
table** that T-R0a A3 asks for: `types` gives the generated type of
every expression and pattern node, per AST path (which answers T-R0a
Q-b2), and `vars` gives each problem variable its sort, quantifier,
origin and checked-IR position. They are part of the immutable
recorded problem (T-R0e I1). They hold **no checker metas and no
bindings**: generation runs before any strategy (§1), so requirements
§2.4's "`vars` … to checker metas" and W §5.2's "a flexible checker
variable" do not apply to this map. A strategy's bindings belong to
its compilation witness (W's `Compilation`), keyed by `Var`, never to
`vars` (reconciliation B2).

```text
vars : Map Var VarInfo
VarInfo = { sort     : Type | Row
          , quant    : Forall VarId | Exists
          , origin   : { path : Path, role : Role, rule : RuleId
                       , span : Span }
          , position : CheckedName }
CheckedName
  = RigidName VarId          -- Checked `Rigid i` (Checked/Internal:24)
  | Slot Path Int            -- instantiation slot i of the Call,
                             -- FunctionRef, Construct, CtorRef,
                             -- OperationRef, Perform or Handler at path
  | NodeType Path            -- `ty` of the checked Expr at path
  | ParamType Path Int       -- `ty` of lambda parameter k at path
  | LambdaBody Path          -- `ty` of the body of the checked Lambda
                             -- at path (a builtin reference)
  | PatternType Path         -- `ty` of the checked Pattern at path
  | RestType Path            -- the NamedRest binder's type at path
  | Auxiliary                -- no checked-IR position (§5.3)
```

The field was called `named` before revision; it is `position` now,
since "named" is W's word for name-bound variables (reconciliation
B5). A **positioned** variable is one whose `position` is not
`Auxiliary`.

Assignment of positions (proposed): `inst i` ↦ `Slot p i` (Checked
`Instantiation`, "the callee's variable order", Checked/Internal.purs:
31-32; `OperationRef`, `Perform` and `Handler` carry one too, :86-88,
for E17 and E20); `res` of E5, E11, E12, E14, E19, E21-E23, E25 ↦
`NodeType p`; `param k` ↦ `ParamType p k` (a builtin reference is a
checked `Lambda`, Check/Show.purs:44-56, so E18's `π` is `ParamType p
0`); E18's `crash` result ↦ `LambdaBody p` (the synthesized body's
`ty`, as `showRef` builds it, Show.purs:47-55; `crash`'s reference is
built the same way by the comment at :41-43, not read); `field l` of
E26 ↦ `NodeType p`; `field l` of P5-P7 ↦ `PatternType` of the
sub-pattern's path; `rest` of P7 ↦ `RestType p`; every other `field`,
`rest`, `upd`, `updrest` and `spread` ↦ `Auxiliary`.

### 5.3 What the map is for

- **Reading back a candidate** (requirements.md §2.4). The online
  solver is one search strategy. Its result, for an accepted body, is
  the checked IR. A candidate assignment for the positioned variables
  is read by matching each `types(p)` against the settled `ty` at the
  same path, and each `Slot`, `ParamType`, `LambdaBody`,
  `PatternType`, `RestType` directly; `Rigid i` reads as the rigid
  variable `i`, a remaining `Hole` as a variable the strategy must
  still choose (recorder-spec H3). This reads a candidate; it never
  adds an atom. Matching is unique where each record in `types(p)` has
  at most one flexible tail; with several, the read is ambiguous (row
  matching is not unique) and is left to the strategy's adapter
  (argued).
- **Auxiliaries are determined by evaluation, not bound by a witness**
  (proposed; checked by RT7). Each auxiliary `a` has exactly one
  **defining atom**, emitted by the rule that introduces it:

  | Rule | Defining atom | Fresh on the right |
  |---|---|---|
  | E25 | `eq τ_{s_j} { ...⟨p, spread j⟩ }` | `spread j` |
  | E26 | `eq τ_e { l: ⟨p, field l⟩, ...⟨p, rest⟩ }` | `rest` (`field l` is positioned) |
  | E27 | `eq τ_e { l: ⟨p, upd l⟩, ...⟨p, updrest l⟩ }` | `upd l`, `updrest l` |
  | E28 | `eq τ_e { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }` | every `field l`, `rest` |
  | P6 | `eq τ_s { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }` | `rest` (fields positioned) |

  In each, the left side (the **operand**) is a child's type or the
  scrutinee's, and the right side is a record of distinct fresh
  variables of this node (plus positioned `field l`). The operand
  mentions only rigid variables, positioned variables, and auxiliaries
  introduced earlier in generation order (by a child, or by a binding
  in `Γ` made before this node): G-local and G-fresh keep this node's
  own fresh variables out of its operand, so the order is well
  founded (argued).

  **Determination.** Given a finite rigid assignment `θR` and values
  `σ` for the positioned variables, evaluate the operand at `θR ∪ σ`
  (extended to earlier auxiliaries) to a ground type `v`. If `v` is a
  record whose labels include `l̄`, set each fresh field to `v`'s type
  at `l` and the fresh row to `v`'s remaining fields; otherwise the
  defining atom is false at every choice. This is one-sided matching
  of a ground value against a pattern of distinct variables, not
  unification and not solving: a ground record is a finite label map,
  and `{ l̄: β̄, ...ρ }` is defined only when `ρ` lacks `l̄`, so the
  extension is **unique** when it exists (argued). Hence a satisfying
  assignment of all flexible variables exists iff the unique extension
  of `σ` satisfies `B`; exempting auxiliaries from the witness loses no
  solution and adds none.

  **Proposed wording for W's Cov** (W owns it; reconciliation B3,
  adversarial finding 6): "every flexible variable whose
  `VarInfo.position ≠ Auxiliary` has exactly one `Binding`;
  auxiliaries have none and are determined by their defining atoms
  (T-R0b §5.3)". RC2 then reads: extend `σ` to auxiliaries by
  determination, then check `Sat (θR ∪ σ) B_f` over the original
  atoms; a failed determination is an RC2 failure (internal), never
  per-key solving. If W prefers that adapters bind auxiliaries too,
  the determination above is the check that their bindings are right.
- **Witness and lowering** (decision 4; requirements.md §4.1) bind per
  name, and the checked IR already carries names in every position a
  divided part reaches. `CheckedName` is that position, so the adapter
  or representation correspondence (requirements.md §4.3) can be stated
  per variable. A ground re-check may compare a position's lowered
  type with `types(p)` evaluated at the key (adversarial finding 2's
  check, W RC6).

The structure is preserved because `quant` is fixed by Sig1 and §2.3
alone and no rule ever changes it; a strategy's candidate assigns only
`Exists` variables, as functions of the `Forall` ones (argued).

## 6. Origins

Every entry (atom, requirement atom, marker, site) carries:

```text
Origin = { atom : AtomId, rule : RuleId, row : SpecRow
         , span : Span, kind : Contract | Types | Body | Inst }
AtomId = { decl : FunctionId, path : Path, index : Int }
```

- **Path**: from `f.body` (`ε`), each step names a child by the
  constructor's field and index in Domain/Resolved.purs's declaration
  order (e.g. `Call/args/2`, `Match/arms/1/pattern`, `Block/items/0`).
  Signature entries (Sig4-Sig10) use paths into `f.constraints`,
  `f.parameters`, `f.result` and `f.joined`. Spans are not unique (a
  builtin reference's lambda shares one), so the path is the id and the
  span is metadata (proposed).
- **Identities for other documents** (canonical here; reconciliation
  B4). A problem variable is identified by its canonical name `Var =
  ⟨p, role⟩` (§2.3) or, if rigid, by its `VarId`; a site or entry by
  its `Path` (or `AtomId`). Spans are metadata only. So W's
  `NameEntry.origin` is a `Var`, its `site` an `Origin` or `Path`, and
  its `HoleContract` names a `Var`, not a `Span`.
- **Index**: the entry's position in its rule's listed order (§3).
- **Row**: recorder-spec §3's row id, so every existing reference to
  A1-O9 stays meaningful.
- **Span**: the node's; per-label entries (Sig4, E25-E28, P5-P7) use the
  label's span (FieldValue, FieldName, FieldPattern spans).
- **Kind**: recorder-spec §1.1. A caller's operation is never a
  declaration on the callee: E10, E18, E19 are origin body; E3's `θ(Q_g)`
  is origin inst; Sig9, Sig10 are origin contract [VOR].

## 7. recorder-spec §3, row by row

| Row | Rule(s) | Change from recorder-spec |
|---|---|---|
| A1, A2 | Sig4, Sig5 | none |
| A3, A4 | Sig6, Sig7 | none; open questions (translation.md §8 Q2, Q3) unchanged |
| A5 | Sig8 | none |
| A6, A7 | Sig9 | `Outside RequirementAtom` withdrawn; Unsupported [VOR] |
| B1 | Sig3, E5-E16, P3, P4 | one rule per agreement instead of one hook |
| B2, B3 | E25 (E24 for no spread) | several spreads in-rule, no marker; Resolve still refuses them today (class pending author Q4, §3.3) |
| B4 | E26 | `lacks ρ l` folded into definedness |
| B5, B6 | E25 | §6's hook replaced by definedness (§3.3) |
| B7, B8 | E27, E28 | none |
| B9 | E28, P7 | **in-model** (proposed): several tails need no special form; today's refusal is a search failure (class e), reported as T-R0a's reasons give it (§11 item 1) |
| B10-B12 | P7, P6, P5 | none |
| B13 | P5-P7 | `Outside PatternGrowth` dropped (proposed; §11 item 2) |
| B14 | E13 | none; it also carries the body-type `lacks`/`disjoint` checks now made at Resolve (§3.2 note; pending author Q4) |
| B15 | all | nested equations recorded undecomposed, as before |
| D1 | E25 | none |
| D2 | E13 | none |
| D3 | Sig6, Sig7 | none |
| D4 | E3, E5 | none |
| D5 | — | a specialization-time assertion; not generated |
| F1-F3 | E5 | none |
| F4 | E5 | no `Union` record; an ordinary `eq` |
| F5 | E3, E5 | Unsupported instead of `Outside` [VOR] |
| F6 | E3 | none |
| F7 | E3, E5 | `adm` holds every function reference as a site, with no component flag, not the witness form (§10) |
| F8 | E4, E6, P4 | `app` with arguments marked `DataApplication` |
| F9 | all | `main` and other declarations without rigid rows: same rules, empty `Forall` |
| C1-C4 | E18, E19 | generated at the site; no walk [VOR] |
| C5 | Sig10 | `pr` recorded; groundness static [VOR] |
| C6, C7 | E10 | `cmp` recorded on both; C6's refusal becomes a consequence [VOR] |
| C8 | E10 | not a semantic refusal (§3.3 note; §11 item 9) |
| H1, H2 | E3, E5 sites | sites only; judged on a witness by T-R0e |
| H3 | §5.2 | a `Hole` in a candidate is a variable to choose |
| H4-H7 | — | lowering, resource limits, Task 8: not generated |
| O1 | §2.2 | erased, not marked (assumption stated) |
| O2 | E17 | marked when the effect has parameters; the parameters get fresh `inst` variables |
| O3 | E20, E21 | none |
| O4 | E22, E23 | marker's condition made syntactic |
| O5 | §2.2, E4, P4 | none |
| O6 | E16 | none |
| O7 | — | coverage is a static pass (class a), not an `outside` constructor |
| O8 | — | no resolved construct |
| O9 | — | no construct |

## 8. Recording on refusal: Q10

recorder-spec Q10 asked whether a refused declaration needs a
diagnostic prefix-log interface. **Answer (proposed): no.** Under
generate-then-decide the recorded problem is produced by `generate`
before, and independently of, any strategy. Consequences:

- Every declaration that resolves has its complete recorded problem,
  refused or accepted, with no change to `checkFunction`'s `Either
  Diagnostic State` interface. A prefix is never produced.
- Declarations after a refused one are generated too: generation reads
  callee **signatures** only (written, Resolved.purs:93-115), not their
  checking results, so Check.purs:22's skip does not reach it (argued).
  When contracts are inferred (INF001, C001), a caller's `θ(Q_g)` will
  depend on the callee's inference outcome; that is an ordering
  dependency on inference, not on a solver substitution [VOR]
  (recorder-spec Q8).
- Negative tests inspect the full problem of a refused declaration
  (recorder-spec T7's refused paths, T9's n03). The restriction in
  recorder-spec §10 ("no negative test may assume that a diagnostic
  carries the discarded state") no longer binds the recorder's tests;
  it still binds tests of the online solver's diagnostics.
- Only Resolve failures produce no problem: there is no resolved AST.
  They are class a (requirements.md §2.3), **except** the body-type
  `lacks`/disjointness checks (Features/Resolve/Lacking.purs:126-167,
  Features/Resolve/Apart.purs:141-158), which T-R0c §3.12 shows are
  semantic (c2, checked counter-instances). Proposed: they move into
  generation as E13 definedness atoms and are decided by CX (§3.2
  note), so they stop hiding every other declaration; **pending author
  Q4**. Until then they remain Resolve refusals.

## 9. Acceptance tests (stated, not implemented)

Nothing below exists; each is a proposed obligation for the
implementation plan. Incompleteness stays the dangerous direction.

1. **RT1, an independent translator.** A second implementation of §3,
   written from this document without reading the first one's code,
   run with the recorder over the measurement corpus (measurements.md:
   488 functions with a rigid row) and the fixtures below. With
   canonical names (§2.3) the comparison is equality of the two
   multisets of `(Origin.atom, entry)` and of `vars`, after §5.3's
   normalization on both sides. A disagreement is a finding against one
   of them, decided by the rule's text. A script checks that every rule
   id of §3 occurs in both and every `Outside` constructor of §3.5 maps
   to a fixture.
2. **RT2, refusal independence** (requirements.md §2.4). For each
   refusal in classes d and e and each refusal that today rests on
   solver-chosen bindings, a fixture whose online solver refuses
   partway, and whose recorded problem equals RT1's translation (or a
   hand translation), not a prefix. Minimum set: D4 "Cannot tell"
   (`walk` W1; p10; c21); D6 rule H (p11 `route`; `submit`, predicted);
   a `lacks`/`disjoint` refusal after `shareTails` (b04, class e; and
   b03, class d, rule H: T-R0c §6 item 1); the `Placeholder` at
   a several-tail receiver (E26); removal over several tails (B9); a
   type-depth refusal (H5). Each asserts: atoms of expressions after the
   refusal point are present; `BQ` atoms that today's walks would have
   produced after `waitingAtEnd` are present [VOR]; a later declaration
   in the same file has its problem; a statically refused declaration
   (an arity error) has its problem too. **This statement of the test
   is canonical; T-R0a's AT1 cites it** (reconciliation I1).
3. **RT3, injection.** Generation run beside two injected strategies, today's
   online solver and a stub that refuses at once, yields byte-identical
   problems for the whole corpus. A cheap check that no generation path
   consults the strategy (AGENTS.md: inject, never flag-select).
4. **RT4, hand translations.** translation.md §5's examples (p01-p21,
   n01-n16, c21-c24) and §17.1's (source-boundary.mjs), compared after
   eliminating defining equations, since the hand translations give some
   expressions fresh variables that §2.3 does not (argued equivalent).
5. **RT5, totality.** Every constructor of `Resolved.Expr`, `Pattern`, `Rest`
   and `Item` reaches a rule (by exhaustive case in the implementation,
   and a fixture each); generation returns for every corpus function.
6. **RT6, origins.** Every entry's path resolves to a node whose span is
   the recorded span (or contains the recorded label span); every rule
   id maps to a recorder-spec row (§7).
7. **RT7, variables.** Every variable in an entry is in `vars`; `Forall`
   variables are exactly Sig1's; every positioned variable's
   `position` exists in the checked IR of each accepted fixture; every
   auxiliary has exactly one defining atom of §5.3's table, whose
   operand mentions only rigid, positioned and earlier auxiliary
   variables; determination (§5.3) at the candidate of RT8 reproduces
   the auxiliaries' read-back values where both exist.
8. **RT8, candidate.** For each declaration the online solver accepts,
   the candidate read through `vars` (§5.3) satisfies `B` at a ground
   instance of the rigid variables satisfying `D`. A failure is an
   internal error, never evidence about the program (§18.64 item 3).
   Turning the candidate into a certificate is per format and belongs
   to the strategy (requirements.md §10, recorder-spec T8a).
9. **RT9, markers.** One fixture per `Outside` constructor; the problem's
   `outside` holds it with its origin; no Solved verdict is reported for
   the whole function, and a refutable atom beside the marker still
   gives Contradiction (T-R0a AT11). One fixture per parameterised
   effect (E17, E20): its `inst` variables are in `vars` with `Slot`
   positions.
10. **RT10, origin kinds** [VOR]. recorder-spec T10's fixtures (h1-h4, cmp-c,
    cmp-cf, pr-c, pr-cf, eq-c, eq-d, E2's `peek` in `divide`): each `BQ`
    atom has the expected kind; cmp-c and cmp-cf record the same atom.

## 10. Interface with T-R0a

The problem's shape is canonical here (reconciliation A4); T-R0a's A2
and G-complete cite this section verbatim. T-R0a owns the outcome and
verdict types and the pipeline.

```text
generate    ∷ Tables → Signatures → Resolved.FunctionDecl
            → RecordedProblem                    -- total (§1)
staticRules ∷ Tables → Resolved.FunctionDecl
            → Array StaticRefusal                -- beside; T-R0a's type

Tables = { types, ctors, effects }               -- no call graph (G-local)

RecordedProblem =
  { decl     : FunctionId
  , rigidTy  : Array Var, rigidRow : Array Var   -- Forall; recorder-spec
                                                 -- `Tr` and `R`
  , flexTy   : Array Var, flexRow  : Array Var   -- Exists
  , d        : Array (Entry Atom)                -- computed (Sig4-Sig8)
  , q        : Array (Entry ReqAtom)             -- [VOR], empty today
  , b        : Array (Entry Atom)
  , bq       : Array (Entry ReqAtom)             -- [VOR]
  , outside  : Array (Entry OutsideKind)         -- §3.5
  , adm      : Array (Entry CallSite)            -- every function
                                                 -- reference (E3, E5)
  , split    : Array (Entry CallSite)            -- RecordSort slots
  , vars     : Map Var VarInfo                   -- §5.2, site table
  , types    : Map Path RTExpr                   -- §5.2, site table
  }
Entry a  = { origin : Origin, value : a }        -- §6
CallSite = { callee : FunctionId | CtorId, slots : Array Var }
```

`adm` and `split` hold **sites, inside the problem**. P's and A's
judgements of those sites, and a strategy's bindings and names (W's
`Compilation`), live **beside** the problem, never in it. This answers
the former §11 item 12.

What T-R0b guarantees to T-R0a: G-total, G-local, G-dead, G-fresh
(§2.4); canonical names; one problem per resolved declaration, refused
or not (§8), including a statically refused one; no field depends on a
strategy or on another declaration's body.

What T-R0b assumes of T-R0a:

- a strategy receives the problem read-only and never edits `b` or
  `bq`; a verdict is a separate value;
- static (class a, b′) refusals are judged by `staticRules` and
  reported beside the problem, as `Refused (NonEmptyArray
  StaticRefusal) RecordedProblem`, not by stopping generation;
- requirement atoms are judged as the preamble's proposed default
  says (ground atoms by a stated ground rule; atoms over variables
  Unsupported for every strategy whose `Sound_F` does not cover them),
  **pending author Q2** [VOR];
- **non-empty `outside` prevents a whole-function Solved** and never
  prevents Contradiction (§3.5; decision 1), **pending author Q3**;
- any slicing between recorder and strategy quantifies over this
  original problem (requirements.md §11 item 11);
- `adm` and `split` are judged against a strategy's witness by the
  admission component (T-R0e), which filters `adm` by recursive
  component; they are never conjoined into `B`.

## 11. Conflicts and questions

"Pending author Q<n>" refers to the reconciliation review's open
questions Q1-Q10.

1. **B9 in-model** (proposed). Removal and rest binders over several
   tails are recorder-spec `Outside` (Task 7 placeholder). E28 and P7
   express them with no special form; today's refusal
   (`withinOneTail`, Check/Removal.purs:14) and the `Placeholder` at a
   several-tail receiver become search failures, class e: the online
   solver's message is a hint, and the reason is T-R0a's
   `Unsupported (GuardOutsideFragment …)` while no strategy's guard
   covers several tails, `Inference` otherwise. They are not constructs
   outside the model (reconciliation A7). Lowering several tails stays
   Task 8 (H7). Accept?
2. **B13, pattern growth** (proposed). P5-P7 give every pattern its own
   equation; no `Outside PatternGrowth`. Whether today's growth rule
   accepts exactly the problems P5-P7 make valid is unchecked; RT1
   disagreements would show it (recorder-spec Q5).
3. **`adm` and `split` hold sites, not forms.** recorder-spec §2.4
   records a witness's form per call; a generator cannot. For T-R0e:
   the admission judgement takes `(site, witness)` and filters `adm` by
   component; R019's contract (§18.66 decision 2) applies there.
4. **Data applications** (pending author Q3). Lean's `TExpr` has no
   type constructors, so `Option(a)`-like uses get `Outside
   DataApplication` (new) and, under §3.5's rule, cannot be Solved.
   The atom is recorded in full (§3.5 table: nothing left out), so a
   free constructor node in the model, or a slice theorem, would let
   this kind stop blocking Solved. A modelling question for the
   statement owner.
5. **Conservative markers** (pending author Q3). `FailFamily` and
   `EffectArgument` are decided syntactically (§3.5) and so mark more
   functions than today's solved-shape rule would, and both leave an
   obligation unrecorded, so they must block Solved under decision 1.
   Acceptable?
6. **Effect rows erased** (pending author Q3). Independence of effect
   checking from record solutions is assumed (requirements.md §11 item
   13); effect refusals that consume record-solved metas are class f.
7. **Arity at a fixed result** (E5; pending author Q4): class a or a c1
   head clash on original atoms? The atom is recorded either way.
8. **Canonical form versus hand translations.** §2.3 introduces fewer
   fresh variables than translation.md §2.2; RT4 must eliminate
   defining equations, and that normalization is a comparison tool, not
   a validity-preserving theorem (as recorder-interface §5 test 1).
9. **C8 is not validity** (pending author Q4; T-R0e §7 Q5). `cmp` at
   an unconstrained flexible variable is satisfiable, so today's
   `Ambiguous type` is a policy or admissibility refusal (ADR 007
   condition 2), or class e, for T-R0e [VOR].
10. **Lambda effect-row annotation.** Check/Lambda.purs's
    `annotationRow` treats the signature's last `VarId` specially; it is
    an effect row and erased here. Confirm no record obligation hides
    in it.
11. **`ValidOpenR`** [VOR; pending author Q2]: every rule marked [VOR]
    waits for it; the field-level reading and P6's distribution
    (recorder-spec §2.3, §8) are assumed by Sig10, E10, E18, E19. The
    preamble's proposed default applies until then.
12. **Interface overlap with T-R0a.** Closed: the shape in §10 is
    canonical; sites inside the problem, judgements beside it
    (reconciliation A4).
13. **Second spread** (pending author Q4; T-R0e §7 Q3). Language rule
    (class a) or support boundary? Generation records it in-model
    either way, with no marker (§3.3).
14. **Body-type `lacks`/`disjoint` at Resolve** (pending author Q4).
    Move into generation as E13 definedness atoms (§3.2, §8)?
15. **E18's `LambdaBody` position.** The `crash` reference's checked
    `Lambda` is assumed to be built like `showRef`'s (Show.purs:41-55);
    to confirm when RT7 is implemented.

## Revision log (reviews of 88c052d)

Reviews: the interface reconciliation (findings A1-I2, questions
Q1-Q10) and the adversarial soundness review (findings 1-9). Rebased on
3ccb6fb. Only this document was edited.

**Applied.**

- A1: generation is total; `staticRules` beside it; a statically
  refused declaration keeps its problem (§1, §10).
- A2: `adm` holds every function reference with no component flag;
  the call graph is out of the tables and G-local; admission filters
  (§1, §2.4, E3, §7 F7, §10).
- A3: `vars` and `types` stated canonical and as the site table; no
  checker metas, no bindings in `vars` (§5.2).
- A4: `RecordedProblem` stated canonical; sites inside, judgements and
  bindings beside; recorder-spec `R`/`Tr` mapped; §11 item 12 closed.
- A6: second spread in-model, no marker or support record; S1 reads
  the `spread j` roles (§3.3 note, §7, §11 item 13).
- A7: B9 and the several-tail `Placeholder` are class e search
  failures with T-R0a's reasons, not constructs outside the model
  (§7, §11 item 1).
- B3 and adversarial 6: auxiliaries have exactly one defining atom,
  determined uniquely by one-sided evaluation in a well-founded order;
  proposed Cov and RC2 wording for W (§5.3; RT7 extended).
- B4: identities are `Var`, `Path`, `AtomId`; spans are metadata (§6).
- B5: `VarInfo.named` renamed `position`; "positioned variable".
- E1 and adversarial 5: non-empty `outside` blocks a whole-function
  Solved, never Contradiction; a table of which markers leave an
  obligation unrecorded; the condition a refinement must meet (§3.5,
  §10).
- Adversarial 5, E17: parameterised effects introduce `⟨p, inst j⟩`
  (positions `Slot`, Checked/Internal.purs:86-88); E20 likewise, so
  G-total holds.
- E2: proposed common wording for requirement atoms (preamble, §10).
- E3: `Coverage` removed from the `outside` constructors (§3.5, §7 O7).
- G1: body-type `lacks`/disjoint checks proposed as E13 definedness
  atoms decided by CX; §8's class-a exception (§3.2, §8).
- G4: RT2 cites b04 (class e) and b03 (class d, rule H).
- I1: RT2 is the canonical T-R0 test; T-R0a AT1 cites it.
- I2: rules G1-G10 renamed Sig1-Sig10; tests renamed RT1-RT10 (RT1 was
  T2′, RT2 T-R0, RT3 T-inject, RT4 T1′, RT5 T-total, RT6 T-origin, RT7
  T-vars, RT8 T-candidate, RT9 T-outside, RT10 T-origin-kind).

Also done: E18's `crash` result, formerly an auxiliary with no defining
atom (so no witness and no determination covered it), is now
positioned at `LambdaBody p` (§5.2; §11 item 15 asks for
confirmation).

**Pending author rulings** (proposed default written in place):

- Q2: requirement atoms (preamble, §10, §11 item 11).
- Q3: `outside` markers block Solved (§3.5, §10, §11 items 4-6).
- Q4: second spread (§3.3, §11 item 13); body-type checks at Resolve
  (§3.2, §8, §11 item 14); arity at a fixed result (§11 item 7); C8
  (§11 item 9).

**Disagreements, with reasons.**

- Reconciliation E1 proposed editing §10 to "markers of
  acceptance-relevant kinds block Solved; others do not". Not adopted:
  decision 1 forbids dropping an obligation without a marker that
  blocks Solved, three marker kinds do drop obligations (§3.5 table),
  and no slice theorem is stated. The brief also directed adversarial
  finding 5's rule pending Q3. §3.5 states the condition under which
  a kind could later stop blocking Solved.
- Reconciliation A6 offered, as an alternative, a support-site record
  for the second spread. Not adopted: `vars` already records the
  spread roles per path, so S1 can read the count without a new field.

### Consistency re-check (39320ad)

- §5.3: the ground re-check is cited as W RC6, which W has adopted
  (re-check R9).
- §3.2, E5 note: the head-clash rule on original atoms is CX's to
  state (CX Q4), not T-R0c's (re-check R9, F4).
- Citations of T-R0e's old §7 Q3 and Q5 are kept; T-R0e §7 maps old
  numbers to its rows (re-check R11).
