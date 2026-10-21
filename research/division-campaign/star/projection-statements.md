# Option C, statements only: projection onto written labels

Research under dossier §18.39 item 3. Definitions, exact statements, an
analysis and a review. No prototype, no proof, no adoption. Every
statement below is **proposed and unproved**. The Lean file
research/composition-proofs/Composition/Sig/ProjectionDefs.lean holds
the definitions and the statements as `def … : Prop`, with no theorem
and no `sorry`; `lake build` passes with it imported from
Composition.lean.

The checks quoted in §2.4, §3.2 and the appendix were run after the
definitions were written, on small sizes, by scratch scripts outside
the repository. They are evidence for the statements, not proofs of
them. `divide5` (§3) is a new family built for this note. It is not part
of the star protocol and is not an amendment to it.

## 0. Verdict

- **Projection onto written labels handles `divide3`.** One certificate,
  `u := r|A` and `t := r`'s rest (A the written labels `a_1..a_m`),
  works at every consistent pattern. Its size is linear in m. Checking
  it needs only SC2's four region queries (`possible`, `must`,
  `possibleBoth`, `nonEmpty`) and `declared`. A's prototype calls all
  but `possibleBoth`; rest-less pieces bring that one into use (§1.3).
  §2 gives the argument.
- **It is not enough in general.** `divide5` (§3) is valid and in
  `Accepts`. No certificate built from projection pieces works both at a
  pattern with r and s at some label and at one with r and s₂ at that
  label. So any family of such certificates covering all patterns has
  at least `2^m` members.
- **Scope.** The one-literal guards below go beyond the authorized ask
  (§18.39 item 3: settle projection on `divide3` first). They are here
  only to name the smallest next step, and they are proposed for no
  further work (question 2).
- **The smallest further operation** is a projection guarded by one
  literal over another rigid row at the same label: `r|(S ∩ dom s)` and
  `r|(S ∖ dom s)`, S a set of written labels. It handles `divide5`
  uniformly. A guard is a Boolean presence formula over rigid domains
  at one label, and one literal is the least such formula that is not
  a constant; this is where the general case begins. As proposed (PG),
  the per-label checks stay 2-SAT, hence polynomial, for guards of up
  to two literals. With arbitrary formulas as guards, checking an
  untrusted certificate is coNP-hard per label.
- **Boundary: every proposed checker statement targets P9s's
  `Accepts`**, not option B's `ValidOpen` (§4.1).
- **Everything here stays inside `Accepts`.** Guards act on written
  labels, where P9s already enumerates patterns. These pieces compress
  certificates that `checkAll` tables already admit (K7). They do not
  bring `route` in: `route` needs `dom s` on the rests, which is §18.1's
  general term witness and lies outside `Accepts` (K8).

## 1. The operation

### 1.1 Pieces

Fix a signature problem P (`SigProblem`, §13.1). L = `written P` is its
finite set of written labels; R = `P.rigidRow`. A **piece** is
`⟨r, S, g, ρ⟩`:

- `r ∈ R`, a rigid row;
- `S ⊆ L`, a finite set of written labels;
- `g`, a guard: a list of literals `s⁺` or `s⁻` (rigid row `s` holds,
  or lacks, the label at hand). Projection proper has `g = []`;
- `ρ ∈ {true, false}`, whether the piece carries `r`'s rest.

Lean: `Piece`, `Lit` (ProjectionDefs.lean).

The **projection onto written labels** that the author asked about is
the guard-free piece `⟨r, S, [], false⟩`, written `r|S`. Its complement
relative to the written labels, together with the rest, is
`⟨r, L ∖ S, [], true⟩`. That is strategy A's existing piece
`{r, ex = S}`.

### 1.2 Denotation at a pattern

P9s's generic model (Sig/Generic.lean) reads a pattern π as the rigid
assignment `genRow P π r`: at written label l the constant `A r l` if
`π r l`, and at the generic label `inr r` the rest constant `R r`.
A piece denotes `genRow` restricted:

```
⟦⟨r, S, g, ρ⟩⟧π (inl l) = genRow P π r (inl l)   if l ∈ S and g holds at l
                       = none                    otherwise
⟦⟨r, S, g, ρ⟩⟧π (inr s) = genRow P π r (inr s)   if ρ
                       = none                    otherwise
```

where `s⁺` holds at l iff `π s l` and `s⁻` iff `¬ π s l`. Lean:
`pieceRow`. For a finite pattern p (a list of present pairs) the same
row is given as a syntactic list by `Piece.entries P p`, so that a
schematic certificate instantiates to an ordinary `Cert` (§15.2):
`SCert.inst P p σ`. The written-label part of a piece at π is
`{ l ∈ S ∩ L : π r l ∧ g(π, l) }`; its rest part is all or nothing.

### 1.3 Interaction with `{r, ex}`

- `{r, ex}` = `⟨r, L ∖ ex, [], true⟩`, and the whole row r =
  `⟨r, L, [], true⟩` (statement PI2).
- A row splits into pieces: `r = r|S ⊎ ⟨r, L ∖ S, [], true⟩` for every
  S ⊆ L, at every pattern. More generally, the pieces of one rigid row
  inside one record are disjoint iff their written parts are disjoint at
  every pattern of the region and at most one carries the rest.
- **Normal form.** Without guards, two pieces of the same row in one
  record merge into `⟨r, S₁ ∪ S₂, [], ρ₁ ∨ ρ₂⟩` once they are known to
  be disjoint. So a record has at most one piece per rigid row, and
  strategy A's `equal` compares holders label by label as it does now,
  with `l ∈ S` in place of `l ∉ ex`. Its rest comparison must then range
  over the rest-carrying pieces only. schematic.mjs compares every piece
  (`rests differ`), and that would be wrong once rest-less pieces exist.

What changes in the symbolic check (`checkSym`, schematic.mjs) once a
piece may lack its rest. This is a design note, not a prototype:

1. **Label clashes between pieces of different rows.** Today `compose`
   and `apart` never test two pieces against each other label by label.
   Every piece carries its rest, so a pair of pieces needs `declared(r,
   s)`, and a declared `disjoint` already makes the two rows disjoint at
   every written label of a consistent pattern. Rest-less pieces lose
   that implicit check. The checker must test `possibleBoth(r, s, l)` for
   each `l ∈ S_r ∩ S_s`, in compositions and in `disjoint` atoms.
2. **Two pieces of the same row in one record** are allowed. They need
   `S₁ ∩ S₂` (restricted to labels r may hold) to be empty and at most
   one rest.
3. **Rest obligations (W3, and HoldsG's rest condition on `disjoint`)**
   apply only between rest-carrying pieces. This is what lets
   `u := r|A` pass `u disjoint s` in `divide3` when `r` and `s` are not
   declared disjoint.
4. **Pieces of the same row on the two sides of a `disjoint` atom**
   (added after review, F3). Today `apart` fails on them
   unconditionally (`rest r on both sides`). With rest-less pieces,
   `x disjoint y` with `r|S₁` in x and `r|S₂` in y holds iff no
   `l ∈ S₁ ∩ S₂` has `possible(r, l)` and the two do not both carry the
   rest.

These are rules of the proposed checker. They are stricter than
`Works`: `SCert.inst` concatenates entries, and `denRow` reads the
first occurrence, so an overlapping entry is hidden rather than
refused (review, F10). That is harmless for PC3, which is about
soundness only.

With these four changes, guard-free pieces need no new region query.
Every per-label condition still reads at most two holders of one label,
and the conditions are the ones the four queries answer (statement PQ).

### 1.4 Typing

A piece contributes, at each label it holds, r's own field: `A r l` in
the generic model, `θ(r)(l)` under a rigid assignment θ. There is no
type choice, so field types come with the projected labels. A piece is
`genRow` restricted to a set of generic labels, and in the semantic
reading it is θ(r) restricted to `{ l ∈ S : g }` plus, if ρ, every
label outside L. This is the same "copy the source row's field" that
D3a's typed templates use per Venn cell (§18.6). The difference is that
a piece is one template for all patterns, conditioned on r's presence
bit (and the guard), where D3a fixes the pattern first.

### 1.5 How it differs from `r|T` (§18.1)

§18.1's term witnesses restrict a rigid row to a set term
`T ::= ∅ | dom r | {l} | T ∪ T | T ∩ T | T ∖ T`, over **all** labels,
rest labels included. The pieces here are the special case

- guard-free: `T = S` or `T = S ∪ (dom r ∖ L)`, with S a union of
  written singletons. On the rests, T is all of `dom r ∖ L` or nothing.
  No `dom s` occurs anywhere;
- one-literal guards: additionally `T = S ∩ dom s` or `T = S ∖ dom s`,
  but **only on written labels**.

So no piece here ever divides a rest. That is the dividing line with
`Accepts`. P9s's generic model has one rest constant per rigid row and
certifies pattern by pattern, so anything a piece does on written labels
can also be done by an explicit `checkAll` table. Dividing a rest by
another row's domain (`route`'s `u = r|(dom r ∖ dom s)`) cannot be done
in that model at all (`routeSig_not_accepts`, K8). That is D2/D4
territory and needs new semantics, which is not authorized.

## 2. `divide3`

### 2.1 The problem

`divide3 m` (star/problems.mjs): rigid `r = 0` and `s = 1`; written
labels `A = {a_1..a_m}`; `D = { s lacks a_j }`; flexible `u = 2`,
`t = 3`; body `{ ...r } = { ...u, ...t }`, `u disjoint s`,
`t lacks a_j` for every j. The bits `(r, a_j)` are free and the bits
`(s, a_j)` are forced false, so there are exactly `2^m` consistent
patterns. Lean: `divide3Sig`.

At pattern π the only certificate shape that works is
`u = { a_j : A r a_j | π(r, a_j) }` and `t = { inr r : R r }`:

- `u` cannot carry `inr r`: `u disjoint s` with `s`'s rest `inr s`
  requires `declared(r, s)` (HoldsG, D2 obligation), and it is not
  declared;
- `u` and `t` cannot carry `inr s`: the left side of the equation has
  no `inr s`;
- so `t` carries `inr r`, `t lacks a_j` keeps every `a_j` out of `t`,
  and the equation puts r's present `a_j` fields in `u`.

### 2.2 Why strategy B needs `2^m` leaves (exact)

Strategy B's leaves hold certificates over strategy A's pieces, which
always carry their rest (`Piece.Old`). By §2.1, `u` can contain no
piece at all. Its fields at the `a_j` are written fields, and written
fields do not depend on the pattern. At a pattern where r holds `a_j`,
`u` needs the written field `a_j`; at one where r lacks it, `u` must not
have it. So **one Old-piece certificate works at two consistent patterns
only if they agree on every bit `(r, a_j)`** (statement PD3⁻). There
are `2^m` patterns, and any family of Old-piece certificates covering
them, a decision tree in particular, has at least `2^m` members. The
measurement (`divide3` m = 16: 65,536 leaves, report.md §4.3) meets this
bound exactly. The bound applies to B's measured leaves only if B's
acceptance by `checkSym` implies `Works` at every pattern of each leaf,
which is SC3 and is unproved.

### 2.3 One projection certificate is uniform

`σ₃ = { u ↦ r|A, t ↦ ⟨r, ∅, [], true⟩ }` (Lean: `sigma3`). At every
consistent pattern π:

- `{ ...r } = { ...u, ...t }`: the right side is
  `r|A ⊎ ⟨r, ∅, [], true⟩`, two pieces of one row with disjoint written
  parts and one rest, so it is defined. Per label, both sides have the
  single holder r. Both sides have the rest `inr r` alone. Statically
  equal.
- `u disjoint s`: `u` carries no rest, so there is no rest obligation.
  At `a_j`, u holds it only where r does, and r and s never both do
  (`¬possibleBoth(r, s, a_j)`, since s lacks `a_j`). Holds.
- `t lacks a_j`: `a_j ∉ ∅`. Holds.

The check reads `possibleBoth(r, s, a_j)` m times and `nonEmpty` once
from the region. With the changes of §1.3, strategy A's checker shape accepts
σ₃ with O(m) work, against B's `2^m` leaves and E's `2^m` entries.

### 2.4 Checks run (small sizes; evidence, not proof)

- With sig-oracle's generic semantics and P9s's side condition (the
  reference strategy E uses), σ₃ instantiated at every consistent
  pattern passes for m = 1..10 (1,024 of 1,024 at m = 10).
- With the **proved** checker `checkCert` (K4) through `SCert.inst`
  (`#eval`, Label = String, B = Unit): σ₃ passes 4/4, 16/16, 64/64 and
  256/256 pattern lists for m = 1..4. The control `u := ⟨r, A, [], true⟩`
  (an Old piece) passes 0/16 at m = 2. These count lists, not patterns
  (review, F1): `written` does not remove duplicates, and `divide3`
  writes each `a_j` twice, so each of the `2^m` patterns appears `2^m`
  times. The `divide5` counts are not affected, since there each label
  is written once.
- Exhaustive over uniform certificates with one piece per (flexible
  row, rigid row) and no written fields: with Old pieces, 0 of 81
  (m = 1) and 0 of 625 (m = 2) work; with projection pieces, 9 of 625
  and 25 of 6,561 do. At m = 1 all nine were listed: each is σ₃ plus
  rest-less pieces of `s`, which are empty at every consistent
  pattern.

## 3. Where projection stops: `divide5`

### 3.1 The family

`divide5 m` (new; Lean: `divide5Sig`): rigid `r = 0`, `s = 1`,
`s₂ = 2`, with `D = { s disjoint s₂ }`; flexible `u = 3`, `t = 4`,
`q = 5`; body `{ ...r } = { ...u, ...t, ...q }`, `u disjoint s`,
`t disjoint s₂`, `q lacks a_j` for every j. Per label the allowed holder
sets are the subsets of `{r, s, s₂}` without both `s` and `s₂`: 6 per
label, `6^m` patterns.

It is valid and in `Accepts`. At `a_j`, if r holds it then `s` and `s₂`
cannot both hold it. If `s` does, `t` takes it; otherwise `u` does. `q`
takes r's rest. The certificate σ₅ below, instantiated, passes the
reference check at every consistent pattern for m = 1..8
(1,679,616 of 1,679,616 at m = 8), and `checkCert` through `#eval` at
m = 1, 2 (6/6, 36/36). The bounded oracle (SMALL bounds) finds m = 1
valid.

### 3.2 Projection is not enough (exact)

Take a certificate whose pieces are all guard-free (`Piece.Proj`), and
two consistent patterns: p, where r and s hold `a_j`, and p′, where r
and `s₂` hold it. Suppose it works at both.

- The left side holds `a_j` with value `A r a_j` at both, so the right
  side must hold it, from exactly one source.
- A written field `a_j` sits in u, t or q at both patterns. In u it
  breaks `u disjoint s` at p; in t it breaks `t disjoint s₂` at p′; in q
  it breaks `q lacks a_j`.
- A piece of `s` or `s₂` covering `a_j` gives `A s a_j` or `A s₂ a_j`,
  not `A r a_j`.
- So a guard-free piece of r covers `a_j`, and it is present at both
  patterns. In u it breaks `u disjoint s` at p; in t it breaks
  `t disjoint s₂` at p′; in q it breaks `q lacks a_j`.

Contradiction (statement PD5⁻). The `2^m` patterns that put `{r, s}`
or `{r, s₂}` at each label differ pairwise at some label in exactly
this way, so any covering family of certificates whose pieces are all
guard-free has at least `2^m` members. Exhaustive check at m = 1 (one piece per
(flexible row, rigid row), no written fields): 0 of 19,683 Old-piece
and 0 of 1,953,125 projection-piece certificates are uniform.

The prototypes' search also fails here: strategy E is Unresolved for
m ≥ 2 (its unification search finds no certificate at some patterns:
11 of 36 at m = 2, where `entries: 25` counts the successes), and so
is B ("row 0 may hold a2"). This is a
search limitation, not a fact about validity: σ₅'s instantiations are
a complete table.

### 3.3 The smallest further operation: one-literal guards

`σ₅ = { u ↦ ⟨r, A, [s⁻], false⟩, t ↦ ⟨r, A, [s⁺], false⟩,
q ↦ ⟨r, ∅, [], true⟩ }` (Lean: `sigma5`), that is, `u := r|(A ∖ dom s)`
and `t := r|(A ∩ dom s)`. At every consistent pattern:

- equation: per label the right side's r-pieces have presence
  `(r ∧ ¬s) ∨ (r ∧ s) ≡ r`, and the two disjuncts are exclusive.
  Rests: `inr r` alone on both sides;
- `u disjoint s`: `r ∧ ¬s ∧ s` is unsatisfiable;
- `t disjoint s₂`: needs `r ∧ s ∧ s₂` impossible, which follows from
  the declared `s disjoint s₂` (`¬possibleBoth(s, s₂, a_j)`).

A guard is a Boolean presence formula over rigid domains at one label.
One literal is the least such formula that is not a constant, so this
is where the general case begins. Two observations bound its cost.

**Short guards keep checking polynomial (proposed, PG).** Under SC2's
fragment (`lacks` and `disjoint` in D, plus a cube), the allowed holder
sets of one label are the models of a 2-CNF `F_l`: `¬r` for
`r lacks l`, `¬r ∨ ¬s` for a declared pair, a unit per cube bit. An
r-piece with guard g is present at l iff `r ∧ g`, a conjunction of
literals. Every per-label obligation of the check is one of:

- *possible* (a clash in a composition or a `disjoint` atom, a
  `lacks`): satisfiability of `F_l` and one or two conjunctions of
  literals, which is 2-SAT whatever the guards;
- *must* (a written field `A r l` against the r-pieces covering l):
  `F_l ⇒ ⋁ᵢ (r ∧ gᵢ)`, i.e. `must(r, l)` and the unsatisfiability of
  `F_l ∧ r ∧ ⋀ᵢ ¬gᵢ`. Each `¬gᵢ` is a clause of `|gᵢ|` literals;
- *same holders* (an equation, per source row r): for each r-piece
  `r ∧ g` on one side, unsatisfiability of `F_l ∧ r ∧ g ∧ ⋀ⱼ ¬g′ⱼ`
  over the other side's r-pieces. Again each `¬g′ⱼ` is a clause of
  `|g′ⱼ|` literals, because r is already true.

With guards of at most two literals every clause has at most two
literals, so every obligation is 2-SAT: polynomial (Krom 1967), and
linear time (Aspvall, Plass and Tarjan 1979). Neither was read for
this note; both are standard. With arbitrary formulas as
guards, one r-piece on each side reduces tautology checking to the
*same holders* obligation: `r = ⟨r, {l}, g, false⟩ ⊎ …` holds iff g is
valid on `F_l ∧ r`, so checking an untrusted certificate is coNP-hard
per label. For conjunctions of three or more literals we know no
polynomial bound and have not shown hardness: composition definedness
makes one side's guards pairwise exclusive on the region, which
constrains the clause sets a well-formed certificate can produce. In
every case the check splits label by label, never across labels.

**Inside `Accepts`.** Guards read only written-label bits, which
patterns already fix. Each instantiation is an ordinary `Cert`, so a
guarded certificate that works at every pattern yields a `checkAll`
table, and the guarded fragment accepts only problems in `Accepts`.
Guards on the rests would be §18.1's `r|(dom r ∖ dom s)`.
That would take P9s's single rest constant per row apart and is a
different model (§18.6 D2, D4).

### 3.4 Per-label formulas suffice for presence (proposed, PW)

How far can guards go? For the presence fragment (§18.6), O2 makes each
atom, D's included, a conjunction over labels. O3 makes the written part
independent of the rests. So the following is proposed, with this
argument but no proof: **if a presence problem is valid, then for every
flexible row u and written label l there is a Boolean function `φ_{u,l}`
of the rigid bits at l alone such that `Q_u(π) := { l : φ_{u,l}(π|_l) }`
is a written choice that works at every pattern satisfying D.** Choose,
for each allowed bit vector at l, a local choice satisfying the
per-label conjunct; validity provides one because every factor of the
product is non-empty, unless D is impossible on the written labels,
the vacuous case. This uniformizes D2's per-pattern written choice
`Q̄`. It says nothing about types, and nothing about how many literals
`φ` needs. Whether one literal always suffices for problems in
`Accepts` is open; we did not search.

The written part is already formal (review, F2): Presence/Defs.lean
has `WrittenValid` and `SatOn`, and `o3` is exactly the "valid iff D is
impossible on the written labels, or `WrittenValid ∧ RestValid`" used
above. The argument is D2's per-region selection (`sel` in D2.lean,
`regionSel` in Witness.lean, §18.14) applied at each written label. It
reuses that construction and is not a new argument. PW can be stated in
Lean now, roughly
`WrittenValid P → ∃ φ, ∀ π …, SatOn (· ∈ written P) π (fun j k => φ j k
(π · k)) P.B`. It is left in prose here, pending question 4.

## 4. Proposed statements (none proved)

Lean names in ProjectionDefs.lean. `Works P σ p` is
`checkCert P p (σ.inst P p) = true`; `UniformOn P cube σ` is "Works at
every finite consistent pattern agreeing with the cube".

| name | statement | shape |
|---|---|---|
| PI1 | `denRow (q.entries P p) = pieceRow P (patternOf p) q` for every piece q | SC1, per piece |
| PI2 | `pieceRow ⟨r, L, [], true⟩ = genRow P π r`, and `⟨r, L ∖ ex, [], true⟩` is A's `{r, ex}` | SC1, compatibility |
| PQ | for guard-free certificates, the check (with §1.3's four changes) reads the region only through `possible`, `must`, `possibleBoth`, `nonEmpty` and `declared`: two regions with the same answers get the same verdict | SC2 unchanged |
| PC3 (chk) | `chk P σ cube = true → UniformOn P cube σ`, for the candidate checker `chk` | SC3 |
| PC4 | `UniformOn P [] σ → Accepts P` | SC4 |
| PD3 | `UniformOn (divide3Sig as) [] (sigma3 as)` for distinct `as` | non-vacuity |
| PD3⁻ | Old pieces only: Works at p and p′ implies p, p′ agree on every `(r, a)` | lower bound, `2^m` |
| PD5 | `UniformOn (divide5Sig as) [] (sigma5 as)` | non-vacuity, guards |
| PD5⁻ | Proj pieces only: no σ Works both at p with r, s at a and p′ with r, s₂ at a | projection insufficient |
| PG | with guards of at most two literals, each per-label obligation of the check is a 2-SAT instance over SC2's 2-CNF, decided exactly; with arbitrary formula guards the check is coNP-hard per label | complexity boundary |
| PW | presence, written part: per-label Boolean witnesses `φ_{u,l}` exist for every valid problem | uniform D2, written part |

PI1, PI2, PC3, PC4, PD3, PD3⁻, PD5 and PD5⁻ are stated in Lean. PQ
and PG need a symbolic checker to be written down first, and stay in
prose. PW could be stated now over Presence/Defs.lean (§3.4) and is
left in prose pending question 4. The `as.Nodup` hypotheses are not
needed and are harmless (review, F11). PC4 follows from K2
(`consistentS_iff`), K4 and K5 exactly as `checkAll_accepts` does, so
it is a near-immediate corollary rather than a research question.

**What a checker with projection must justify.** Exactly SC1 and SC3 in
this form. Instantiation (PI1, then K1 for finiteness) turns a
schematic certificate into an ordinary one at each pattern. The
symbolic check implies `checkCert` at each pattern of the region (PC3).
With SC2 over all consistent patterns, acceptance follows by K4 and K5
(PC4), then `ValidAll` and `ValidFin` by `s1`, `s1_fin`. Nothing new is
needed in the semantics. The new obligations are the three checker
changes of §1.3, which PC3 must cover. The solver stays untrusted
(§18.39 item 1): it proposes σ, and only PC3 is trusted.

**Relation to D2 (§18.6, proved for presence).** D2 gives, per pattern,
one written choice `Q̄` and rest terms uniform over the rests. Pieces
work the other way round. They keep the rests whole (P9s's model) and
make the written choice uniform across patterns, of the shape
`Q_u(π) = ⋃ { l ∈ S : π r l ∧ g(π, l) }`. PW is the presence-level
statement that per-label uniform choices always exist. The two results
are independent: D2 does not give pieces, and pieces do not give D2.

**Relation to K7.** By `accepts_iff_checkAll`, `Accepts P` iff some
`checkAll` table works. Every acceptance via PC4 is a P9s acceptance,
so neither projection nor guards add an accepted problem. They replace
a `2^m`-entry table by one O(m) certificate. K8 is untouched:
`split` and `route` stay out.

### 4.1 Which acceptance boundary (added at the author's request)

There are two boundaries, and they differ:

- **P9s's `Accepts`** (Sig/Generic.lean), the boundary of `checkCert`,
  `checkAll` and K1-K8. Its generic model has one rest constant
  `inr r` per rigid row, taken whole or not at all. `route` is outside
  it (`routeSig_not_accepts`, K8).
- **Option B's `ValidOpen`** (Typed/Bridge/Valid.lean), characterized
  by `openCharacterization` (Typed/Bridge/ProofInstantiateSound.lean at
  r005b-replan 7f58764, not in this worktree's base 72be46b, read with
  `git show`): for a Scoped problem with fresh labels and existence
  within symbols, `ValidOpen P` iff every pattern with an instance has
  a generic instance `θs` (`GenericInst`, `WithinC`) at which the body
  is solvable over finite values (`SolvableFinAt`). Its generic model
  (Typed/Model.lean) divides rests into Venn cells: one label per
  nonempty set of rigid rows, with constants `X r S`. `route` is valid
  and lies inside this boundary.

**Every statement in §4 targets `Accepts`.** PC3 ends in `checkCert`,
and PC4 ends in `Accepts` through K4 and K5. By K7 these checkers
accept a subset of what `checkAll` accepts, so they cannot certify
`route` or `split` in any form. Where the families fall:

| problem | `Accepts` | `ValidOpen` | what the pieces do |
|---|---|---|---|
| `divide3` m | inside (E's table, m ≤ 16) | inside, argued: no base types, so every base extension is the same problem, which `Accepts` makes `ValidFin` (`s1_fin`); not checked in Lean | projection: one O(m) certificate instead of `2^m` |
| `divide5` m | inside (σ₅'s instantiations, m ≤ 8) | inside, by the same argument | one-literal guards: the same |
| `route` | outside (K8) | inside | nothing at written labels; the witness divides a rest |

**What the pieces would mean for option B (prose only, no statement
proposed for proof).** Written labels are handled per pattern in both
models (`GenericInst` fixes `π` at `inl l`), so projection and guards
play the same role there: they make the written-label part of a
certificate uniform across patterns. On the rests the models differ. In
option B, a rest is a union of cell labels `inr S`, and a cell is not a
pattern bit. A witness such as `route`'s `u = r|(dom r ∖ dom s)` selects
the cells `S ∋ r` with `s ∉ S`, and that selection is the same at every
pattern. So an option-B certificate would extend a piece with a set of
cells, not with guards: `⟨r, S, g, C⟩` with C a set of cells in place
of the rest flag. The shape of the corresponding statement would be:

- **PB4 (shape only):** if, for every pattern π with `HasInstance P π`,
  the certificate instantiated at π solves the lifted body at a generic
  instance `θs_π` with `GenericInst P π θs_π`, then `ValidOpen P`. This
  is the `←` direction of `openCharacterization` (`d3bSoundOpen`, B5),
  which needs none of `Scoped`, fresh labels or existence.

PB4 is not proposed here. Two things block it. First, `GenericInst` is
established only by classical existence (`d3bExistsWithin`; θ* is
chosen classically, §18.38), so a checker has no computed `θs_π` to
instantiate against. Second, the cell-level pieces need their own
region and typing analysis, because cells carry the per-(row, cell)
constants `X r S`. Both are decisions for the author. The
`divide3`/`divide5` verdicts above do not depend on the boundary: both
families lie inside `Accepts` and inside `ValidOpen`, and their
difficulty is at written labels only.

## 5. Prior art and ADR 014

| piece of the design | source | status |
|---|---|---|
| per-label presence, flags per field | Rémy's ML with flags (Π), as read through *Typing record concatenation for free*, POPL 1992, §2.1 (division/concatenation-leads.md); the 1989/1994 paper is listed "Not accessed" (composition-assessment/README.md) and was not read | published; composition |
| rows "defining all labels but those in L", L a finite syntactic set: A's `{r, ex}` | Rémy, *Typing record concatenation for free*, POPL 1992, §2.1 (division/concatenation-leads.md) | published; composition |
| projection onto written labels as shared flag variables: `r = {a_j: φ_j τ_j; ρ}`, `u = {a_j: φ_j τ_j; abs}` | follows from Rémy's flags **[inference]**; whether Rémy's systems expand a rigid (generalized) row at labels was not checked. P9s's patterns do this by enumeration | composition, with one unpublished step (rigid expansion) |
| single-label restriction | Leijen, TFP 2005 (`r − l`); Harper and Pierce, POPL 1991 (`r\l`, known fields only); Ur's `e − c`, one name (Chlipala, PLDI 2010, Fig. 4) | published; none restricts to another row's domain |
| row restriction by folding over a row's own fields | Ur, §2.3 (`selector`, folders) | published; splits by own fields, not by another row |
| splits stated as predicates | Rose (Morris and McKinna, POPL 2019), Rω (Hubers and Morris, ICFP 2023) | published; can state `u ⊙ v ∼ r`, derive no witness, no difference or meet operator |
| Boolean presence formulas, rigid variables as constants, SVE | Madsen and van de Pol, OOPSLA 2020; Martin and Nipkow 1989; Flix `SveAlgorithm` | published; no source applies it to record-label presence or to hypotheses relating the rigids (§18.2) |
| hypotheses on rigids (`s disjoint s₂`) | Martin and Nipkow, Lemma 4.5 (presented algebras) | published, algebraic only |
| 2-SAT: polynomial (Krom 1967), linear time (Aspvall, Plass and Tarjan, IPL 1979) | not read here (standard) | published; composition |
| per-label reduction of validity | Martin and Nipkow, Thm 4.1, and the pointwise argument in division/boolean-elimination.md; `bitCheck_iff` (Presence/Decide.lean); Givant and Halmos 2009 is cited in report.md but not read here | published / proved here |

**New machinery under ADR 014 (flagged):**

1. The certificate format: schematic certificates whose values contain
   rigid-row pieces, checked symbolically against P9s's generic model.
   This is already flagged for strategy A; pieces without a rest and
   guards extend it.
2. SC2's exactness for the product-of-labels region. Unchanged here,
   still unproved.
3. §1.3's three checker changes: label clashes between rest-less pieces,
   same-row pieces, rest obligations only between rest-carrying pieces.
   These are local rules derived from HoldsG, with no published source.
4. PG's reduction of guarded-piece checking to 2-SAT over the 2-CNF
   that SC2's fragment yields. The parts are published (2-SAT, per-label
   reduction); joining them is new glue.
5. Using presence formulas over rigid rows as certificates for a ∀∃
   problem whose hypotheses relate the rigids. No read source does
   this (§18.2).

The textbook alternative, which ADR 014 makes the default, is to keep
`checkAll` tables or strategy B's trees. These are exponential on
`divide3` and `divide5` (§2.2, §3.2), but they need no new checker rule.
The need for projection is shown only on `divide3`, a constructed
family, and no ported program has yet been shown to have this shape.

## 6. Independent review

One reviewer subagent, briefed to check the statements and the
`divide3` argument adversarially, with separate soundness and
completeness passes. It read this note, ProjectionDefs.lean, the star
code, the Sig Lean files, the dossier sections and the division notes.
It re-ran the checks and ran its own exhaustive Lean `#eval`s. It found
**nothing blocking**.

Confirmed, with its own evidence:

- σ₃ is uniform (re-run). With `as = []` there is one pattern, and
  `Works` holds.
- **PD3⁻ is true.** u can hold no `.inr` key, so its keys are its
  written labels, which do not depend on the pattern. Exhaustive at
  m = 1: 1,996,569 certificates over rows {0, 1, 7}, label lists
  {[], [a1], [a1, a1], [z]}, up to two pieces, and written fields with
  values {A0a1, A1a1, R0, {}}. Of these, 20 work at the empty pattern,
  6 at {(0, a1)}, and **0 at both**.
- **PD5⁻ is true.** Exhaustive at m = 1: 314,432 certificates, rest
  flag either way, one written field. Of these, 70 work at p, 70 at p′,
  and **0 at both**.
- σ₅ is uniform at the sizes checked, and `divide5` is in `Accepts`.
  The strategy outcomes on `divide5` re-ran as recorded.
- PI1 and PI2 hold by unfolding. PI2 also holds off `written P`, where
  `genRow` is `none`.
- PG's reductions are right, and so is the coNP reduction for formula
  guards. The 3+-literal caveat is honest. Side remark: if `F_l` imposes
  no constraint, pairwise-exclusive guards make validity decidable by
  counting, so any hardness must come from `F_l`.
- PW's argument is sound given `o2` and `o3`.
- The relations to K7 and K8 hold, and so does "stays inside
  `Accepts`". PB4 matches `D3bSoundOpen` at 7f58764, which has no
  Scoped, fresh-label or existence premise.
- The ADR 014 list does not overclaim.

Findings and what was done:

| # | severity | finding | action |
|---|---|---|---|
| F1 | should fix | the `#eval` counts for `divide3` count pattern lists, not patterns: `written` repeats each `a_j`, so each pattern appears `2^m` times | stated in §2.4 and the appendix |
| F2 | should fix | PW's written part is already formal (`WrittenValid`, `SatOn`, `o3`), and PW reuses D2's per-region selection | §3.4 and §4 corrected |
| F3 | should fix | same-row pieces on the two sides of a `disjoint` atom were not covered | §1.3 item 4 added |
| F4 | should fix | §5 cited Rémy 1989/1994, Givant and Halmos, Krom and APT, none of which the notes read; Krom is polynomial, not linear | §5 and §3.3 corrected; marked not read |
| F5 | minor | A's prototype never calls `possibleBoth`; σ₃'s check reads `possibleBoth(r, s, a_j)`, not `possible(s, a_j)` | §0 and §2.3 corrected |
| F6 | minor | E failed at 11 of 36 `divide5` patterns (m = 2), not 25 | §3.2 corrected |
| F7 | minor | Lean `Piece` does not require `row ∈ P.rigidRow`; the prose does | noted below; harmless for PD3⁻, PD5⁻ (the equation rejects the extra key) |
| F8 | minor | "B's leaves meet the bound" needs SC3 | §2.2 qualified |
| F9 | minor | wording in §0, §3.2, §3.3 | corrected |
| F10 | note | `SCert.inst` does not check definedness: first occurrence hides overlaps, so §1.3's rules are stricter than `Works` | stated in §1.3 |
| F11 | note | `as.Nodup` is unneeded; PC4 is near-immediate from K2, K4, K5 | stated in §4 |
| F12 | note | guards go beyond §18.39 item 3's ask | scope bullet added to §0 |

F7 is left as a recorded difference rather than changed in Lean. The
fragments `Old`, `Proj` and `OneLit` range over pieces of any row, so
the Lean negative statements are slightly stronger than the prose, and
the reviewer's exhaustive runs included a non-rigid row (7, 9).

**Tool refusals during the review**, quoted by the reviewer:
"This agent is isolated in the worktree
/Users/ethan/Desktop/waxwing/.claude/worktrees/agent-ab673e373c4bcbbbb,
but this command names git in a form too complex to verify that it
stays inside the worktree. Refusing to run it — a worktree-isolated
agent's git operations must target its own worktree. Split it into
plain, separate commands and run them from
/Users/ethan/Desktop/waxwing/.claude/worktrees/agent-ab673e373c4bcbbbb."
It got a second refusal with the same text, except that the
second sentence read "this command is too complex to verify that it
stays inside the worktree". It did not re-run the `git status`. For
the other refused call it followed the message's instruction: it wrote
the scratch file with Write and ran the command as a separate plain
command. The author should judge whether that was acceptable. The
author of this note did the same (see the final report).

## 7. Questions for the author

1. **Scope of SC1-SC4.** §18.39 item 1 asks for SC1-SC4 as exact
   statements. Should they be stated over the general piece
   `⟨r, S, g, ρ⟩` from the start, with A's `{r, ex}` as a special case
   (PI2), so that projection does not need a second statement pass? Or
   should SC1-SC4 stay on `{r, ex}`, with projection kept apart until a
   program needs it?
2. **Projection vs guards.** Guard-free projection costs no new region
   query (PQ) and handles `divide3`. One-literal guards add 2-SAT (PG).
   Is it right to recommend projection only, with guards deferred until
   a ported program shows a `divide5` shape?
3. **Search.** Nothing here says how a solver finds `u := r|A`. Row
   unification with rigid tails does not produce it. Search is
   untrusted, but without it the format is unused. Should a search
   statement or prototype follow, or should checking stay first?
4. **PW.** It is a short argument from O2 and O3. Is it worth a Lean
   proof as the uniform written-part analogue of D2, or is it only
   context?
5. **An oracle for guard size.** Should a frozen-grammar oracle search
   for a problem in `Accepts` that needs two-literal guards? If none
   exists within the grammar, PG's polynomial boundary would cover what
   P9s can accept at that size.
6. **The import edit.** The brief asked for ProjectionDefs.lean to be
   imported from Composition.lean. That is the only edit to an existing
   Lean file, one added line.

7. **Boundary.** The statements target `Accepts` (§4.1). If the
   checker's eventual target is `ValidOpen`, pieces need cell sets on
   the rests and a computed generic instance (PB4's blockers). Should
   option C be restated against `ValidOpen` before any SC1-SC4 proof
   work, or stay at the `Accepts` boundary beside `checkAll`?

## Appendix: commands and outputs

Scratch scripts, not committed (session scratchpad): `check.mjs`
(sig-oracle semantics, star/generic.mjs, star/strategies.mjs) and
`Eval.lean` (`lake env lean`, importing ProjectionDefs).

```
divide3: projection certificate, every consistent pattern
  m=1..10: 2/2, 4/4, ..., 1024/1024 pass
divide3: exhaustive uniform certificates
  m=1: old pieces 0/81; with projection 9/625
  m=2: old pieces 0/625; with projection 25/6561
divide5: bounded oracle m=1 valid (225 rigid)
divide5: E valid at m=1 (6 entries); Unresolved m=2..6 (search)
         A Unresolved m=1..6; B valid m=1 (3 leaves), Unresolved m>=2
divide5: exhaustive uniform, m=1: old 0/19683, projection 0/1953125
divide5: one-literal certificate m=1..8: 6/6 ... 1679616/1679616
Lean checkCert (#eval), counts of pattern lists (divide3: 4^m lists
  for 2^m patterns, review F1):
  sigma3 m=1..4 (4,4) (16,16) (64,64) (256,256)
  sigma5 m=1,2 (6,6) (36,36); projection-only control m=1 (6,5);
  divide3 with an Old piece for u, m=2 (16,0)
```
