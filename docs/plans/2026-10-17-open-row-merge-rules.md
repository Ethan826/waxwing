# Open-row merge: arguments for the solving rules (R005 Tranche B)

Status:
Task 0 of docs/plans/2026-10-17-open-row-merge-plan.md, 2026-10-17;
accepted by the user (2026-10-17) with the notes below

**Partly superseded** (the user, 2026-10-19, adopting QT-strict + Sym +
H): the sum rule (§5), homes and commits (§8), the drain and quiet
equations (§9), U3 in the bind rule (§7), `x # x` binding `{}` (§10),
§11a's forms for those rules and the `naming` heuristic (§14) no longer
describe the design. Their replacements are argued in Task B0 of
docs/plans/2026-10-19-row-merge-implementation-plan.md,
which lists what is kept (§1).

One section per solving rule of docs/plans/2026-10-16-open-row-merge-
design.md (draft 3, §2, §3, §5.2, §6), written before any rule is
implemented (the plan's evidence rule 3, with the user's correction of
2026-10-17: rewriting and defaulting are argued differently, and
heuristics are labelled apart from correctness rules). Each argument is
backed by the checks named in its section; research/open-row-merge/
README.md gives the commands. The prototype is labels only: field types,
effect rows and lowering are absent, and the rules that depend on them
are argued here and checked by the compiler tests the plan names.

**Implementation obligations.** The field-type argument (§9, nested
equations), the rollback argument and the joint-fixpoint argument (§12)
and the specialization argument (the unsolved-tail reading, §12) are
identified implementation obligations, not established compiler
behaviour: the prototype cannot check them. Their planned tests (plan
ledger L17, L18, L19, L22) must land with the changes that implement
them (Tasks 5 and 8). Property E's exhaustive and random evidence is
bounded evidence over the stated domains, not a proof of every rewrite
in general (ledger L29).

## 0. Setting

**Semantics** (the oracle's, research/open-row-merge/oracle.mjs, written
independently of the solver). Atoms are labels and rigid row variables.
A meta denotes a finite set of atoms; a row denotes the multiset union
of its fields and its tails' denotations. A row is well formed when no
atom occurs twice, every rigid in it lacks every label in it by
hypothesis, and every two rigids in it are apart by hypothesis (rigids
are uninterpreted: a fact about a rigid holds only by hypothesis, which
by parametricity is the universal reading). Constraints: `L = R` (both
sides well formed, equal multisets), `L # R` (`L ⊎ R` well formed),
`v lacks l` (`l` not in `v`, and every rigid in `v` lacks `l`), and,
for the solver's upper bounds, `v within U` (every atom of `v` in `U`).
The universe can be the atoms the problem mentions: removing any other
atom from every meta keeps every constraint (design §12).

**Creation-site obligations.** A row's own well-formedness is recorded
where the row is made (design §1.4), not by the unification that meets
it; the harness (drive.mjs) records it before each equation, as the
compiler will. Every argument below is about the system "equations plus
their rows' creation obligations"; a rule that drops a well-formedness
condition from an equation relies on that obligation being recorded.

**A state** Σ is a substitution (bindings `m := F ⊎ T`), facts on unbound
metas (lacks, apart pairs, upper bounds) and pending equations. Its free
variables are its unbound metas, the program's and the solver's fresh
ones. A solution of Σ is an assignment σ of its free variables, each a
well-formed set, satisfying every fact and every pending equation, all
rows read through the bindings. Reading a meta back, `ρ(σ)(m)`, is the
denotation of its flattened binding under σ.

**Two kinds of correctness rule.**

- A **rewrite** turns Σ into Σ' (possibly with fresh metas F). Its
  obligation: *it preserves solutions*. The read-backs of the solutions
  of Σ', restricted to the metas of Σ, are exactly the read-backs of the
  solutions of Σ: `{ ρ'(σ')|V : σ' ∈ Sol(Σ') } = { ρ(σ) : σ ∈ Sol(Σ) }`,
  V the metas of Σ. Fresh metas are existential: a solution of Σ must
  extend to one of Σ' (⊇), and every solution of Σ', forgetting F, must
  give one of Σ (⊆). A rewrite that **rejects** must establish that Σ has
  no solution. Every rewrite must **terminate** (§13).
- A **defaulting** rule selects one solution rather than keeping all of
  them; it does not preserve solutions and does not need to. Its
  obligation: *the selected solution satisfies every constraint*, and,
  since accepted bodies get the least solution (property L), *it is the
  least*. There is one: the end-of-body empty default (§12).

**Heuristics** change only which work is done or which equivalent
representative is kept, never the solution set; each is labelled
`heuristic` (§14) with what it may cost.

**The whole-run invariant E.** If every rewrite preserves solutions, then
after the constraints `C1 … Ck` the state Σk satisfies
`{ ρk(σ)|P : σ ∈ Sol(Σk) } = Sol(C1 … Ck)`, P the program's metas.
research/open-row-merge/state.mjs reads a state back as a constraint
system (facts, upper bounds as `within`, pending equations through the
bindings) and enumerates its solutions; exhaustive.mjs checks E against
the oracle on every run that is not refused. A failure of any single
rewrite's obligation that changes the solution set shows as a failure of
E at the end of some run in the domain.

**Exhaustive domains** (exhaustive.mjs, 2026-10-17; each problem in every
order of its constraints; problems equal up to renaming metas or labels
run once):

| Domain | Bound | Problems | Runs | Time (10 workers) |
|---|---|---|---|---|
| A (the plan's) | labels a, b; one rigid R with every lacks hypothesis; metas m0-m2; two equations of rows with at most one field and two tails (repeats allowed), plus nothing, one `lacks` or one `dis` | 3,339,712 | 19,305,292 | 53 s |
| B (quiet) | label a; no rigid; metas m0-m3; the same shapes | 79,825 | 453,550 | 4 s |

Domain A cannot form a quiet equation (two metas on each side after
cancellation need four metas), so B adds it.

| Result | A | B |
|---|---|---|
| accept, refuse, D4 | 870,440 / 18,374,712 / 60,140 | 193,376 / 249,746 / 10,428 |
| E checked (every run not refused), failures | 930,580, 0 | 203,804, 0 |
| H `dishonest`, S `solvedViolates`, L `notLeast`, `unsound` | 0, 0, 0, 0 | 0, 0, 0, 0 |
| D (default satisfies the state on accept) failures | 0 | 0 |
| C1, C3 failures; C2 order differences | 0, 0; 0 | 0, 0; 0 |
| D4 with 0 / 1 / several solutions | 466 / 120 / 59,554 | 32 / 80 / 10,316 |
| fresh metas over \|P\|·\|K\|; state changes over the measure | 0 (max ratio 1/3); 0 (max ratio 2/3) | 0 (1/3); 0 (2/3) |
| one-tail problems; any commit, deferral or quiet equation in them | 47,496; 0 | 1,550; 0 |

Runs in which each rule fired (A / B): commit 296,191 / 4,253; defer
803,312 / 37,173; quiet 0 / 6,518; one meta alone 3,097,783 / 192,121;
shared remainder 364,733 / 0; common tails cancelled 4,150,659 /
158,394; sum-rule bound 3,297,838 / 231,624, lack 142,285 / 4,481,
apart 197,370 / 20,962; U4 (bound emptied, bound to `{}`) 1,736,220 /
179,443; self-apart 7,666,467 / 336,573; deduplication 3,552 / 656;
re-examination by the drain 465,095 / 33,437. Refusals by kind (A):
evidence 9,167,657, no home 8,557,401, overlap 547,713, lacks 91,053,
upper 10,888; all with no solution.

**Random problems.** perm.mjs with `STATE=1` also checks E on the raw
and dense generators (up to four metas, two rigids, three labels; states
with more than four free metas would be skipped and counted, and none
were): seeds 21-28 × 12,000 problems × five orders, 480,000 runs per
generator, E checked on 111,800 (raw) and 325,090 (dense) runs with 0
failures; every other count identical to the recorded campaign
(README.md).

**Sensitivity.** Each check was run on a copy of the prototype with one
defect restored (copies deleted afterwards): committing a constant to
its first home when it has several fails H, L, E and C2 (domain B);
dropping the rigid check of the sum rule's lack (the bug the program
generator once found, design Appendix A) fails H and C2 (domain A);
not passing a bound meta's lacks to its image's tails (bind rule step 3)
fails S, E and C2 in domain A. Domain B alone does not catch the last
(one label, no rigid; the sum rule re-derives the lack there), which is
why A is the gate's domain and B a supplement.

# Part I: rewrites

Each section: the rule; why it preserves solutions; what a rejection
establishes; why it terminates (or §13); its evidence.

## 1. Flatten (design §1.2)

`flatten` replaces each bound tail by its image, repeatedly, and sorts.
**Preserves:** by definition of reading through bindings, the flattened
row denotes the same multiset under every σ; no constraint changes.
**Rejects:** a label twice on one flattened side: the side is never well
formed, so no σ satisfies the equation (`overlap`). **Terminates:** the
bindings form no cycle (the occurs check, §7), so the worklist visits
each binding once per occurrence. **Evidence:** every run flattens;
`overlap` refusals 547,713 (A), 0 dishonest.

## 2. Common labels (design §2.1 step 2)

A label on both sides unifies its field types and leaves both sides.
**Preserves:** on well-formed sides each label occurs once, so `{ l: A }
⊎ L' = { l: B } ⊎ R'` holds exactly when `A = B` and `L' = R'`. The field
types' unification is Tranche A's unifier, unchanged. **Rejects:** only
through the field types' unifier. **Terminates:** a label cancels once
per equation and enters a residue only through a binding (§13). Field
types are not in the prototype: the nested case (a field type that is a
multi-tail row) is argued in §9 and checked by the compiler tests of
Task 5 (ledger L17). **Evidence (labels):** every equation with a shared
label in both domains.

## 3. Cancel common tails (design §2.1 step 3)

`A ⊎ X = B ⊎ X` becomes `A = B`, tails as multisets. **Preserves:**
multiset union cancels: for every σ, `A ⊎ X = B ⊎ X` iff `A = B`. The
equation's well-formedness conditions that mention X (X apart from A
and B) are creation obligations already recorded (§0). **Rejects:**
never by itself. **Terminates:** it shortens both sides. **Evidence:**
fired in 4,150,659 runs (A) with E holding; the tests `r005b-cancel` and
`{ ...r, ...s } ~ { ...s, ...r }` (Task 4).

## 4. Residue failure (design §2.1 step 4)

After cancellation, a constant (a label, or a rigid tail) on one side
must lie inside a meta of the other side. **Rejects:** a rigid denotes
itself and a label is an atom, so if the other side has no meta its
atoms are fixed and lack the constant: no σ satisfies the equation (the
`no home` kind with no meta, part of the 8,557,401 `mismatch` refusals,
0 dishonest). **Preserves / terminates:** it changes nothing else.

## 5. The sum rule: bound, lack, apart; U2-U4 (design §2.5)

For a residue `C1 ⊎ M1 = C2 ⊎ M2`, every `m ∈ M1` lies within `C2 ⊎ M2`.

- *bound*: if every `n ∈ M2` is bounded, `m within C2 ∪ ⋃ upper(n)`;
- *lack*: a label every `n ∈ M2` lacks, which no constant of `C2` is, and
  which every rigid of `C2` lacks by hypothesis, is lacked by `m`;
- *apart*: a tail `q` apart from every `n ∈ M2` and known disjoint from
  every constant of `C2` is apart from `m`.

**Preserves:** each derived fact is a consequence of the residue and the
facts already present, so adding it removes no solution, and it is
satisfied by every solution, so it adds none. *Bound:* in every solution
the atoms of `m` are among those of `C2` and of the `n`, each within its
bound. *Lack:* an atom of `m` is a constant of `C2` (not `l`) or comes
from some `n` (which lacks `l`); a rigid of `m` comes from `C2` (lacks
`l` by hypothesis) or from some `n` (whose rigids lack `l`, as `n`
lacks `l`). The rigid condition is necessary: without it the rule is
unsound (sensitivity run above). *Apart:* every pair of an atom of `m`
and an atom of `q` is a pair of an atom of `C2` or of some `n` with an
atom of `q`, compatible by the premises, so `m ⊎ q` is well formed.
**U2** (a bound loses an atom the meta lacks or is apart from) and
**U3** (binding `m := F ⊎ T` checks the image's constants against the
bound and narrows each meta of `T` to the bound minus those constants)
are consequences in the same way: the meta's denotation is within the
bound and well formed, so the image's metas hold none of the image's
constants. **U4** is a rewrite of a different shape: a bound narrowed to
the empty set leaves `{}` as the meta's only value, so binding it to
`{}` replaces a variable by its unique value (preserves). **Rejects:**
U3's check fails only when a constant the meta must hold is outside its
bound, which no solution allows (`upper`, 10,888 in A, 0 dishonest).
**Terminates:** facts only grow over finite sets and bounds only shrink
(§13). **Evidence:** bound, lack and apart fired in the runs counted in
§0 with E, H and S holding; perm.mjs and its `NOSUM=1` comparison.

## 6. One meta alone (design §2.1 step 6)

A side that is exactly one meta `m` binds `m` to the other side `R`
(through the bind rule, §7). **Preserves:** after cancellation `m` does
not occur in `R`, so the equation `m = R` defines `m`; replacing `m` by
`R` everywhere (which the bind rule does for `m`'s facts) keeps exactly
the solutions, with `ρ(σ)(m) = ⟦R⟧σ`. Two bare metas: either may be
bound; the newer to the older is a presentation choice. **Evidence:**
fired in 3,097,783 runs (A). With one tail per side every solvable
residue reaches this rule or the shared remainder (§8): the one-tail
runs never committed, deferred or waited quietly (0 of 47,496 + 1,550
problems), the structural part of design §2.3 (ledger L1).

## 7. The bind rule (design §3.2)

Binding an unbound `m := F ⊎ T` (flattened) re-expresses each of `m`'s
facts on the image. **Preserves:** each step is the meaning of the fact
after substituting the image for `m`:

1. and 3. `m lacks l` iff `l ∉ F` and every tail of `T` lacks `l` (a
   rigid by hypothesis): step 1 checks the first, step 3 records the
   second (a meta inherits it with its reason; a rigid must have it);
2. and 6. `m within U`: U3 (§5);
4. `m # p` iff `(F ⊎ T) # p`: the pair is removed and re-required by
   decomposition (§10);
5. a meta denotes a well-formed row, so the image's own well-formedness
   is required (it is a creation site);
7. the occurs check: after cancellation (§3) and with fresh metas in
   commits and remainders, `m` never occurs among its image's tails, so
   the check never fires on row tails (prototype: no occurs refusal is
   reachable on tails; argued, ledger L33). It guards field types, as
   Tranche A's occurs check does (infinite types have no solution).
8. `arrivedAt` and the index are metadata, not constraints.

**Rejects:** steps 1-3 fail only when a fact of `m` excludes a constant
the image forces (`lacks`, `upper`, `evidence`), so no solution.
**Terminates:** each binding removes an unbound meta; re-required facts
act on the image (§13). **Evidence:** 10,294,094 runs (A) bound a meta;
dropping step 3 fails S and E (sensitivity, §0).

**Compiler (Task 3, single-tail rows).** Features.Check.RecordTail
`bindTail` implements steps 1, 3, 4, 5 (the image's own lacks, as
Tranche A did), 7 and 8 (`arrivedAt`); step 2 and step 6 (bounds) arrive
with Task 4. Step 3 passes each lack on with its reason (a meta rest
inherits the reason and the meta it arrived with; a rigid rest must
already lack it). Step 4 removes the meta's pairs from both sides before
re-requiring each on the image, so the store keeps its invariant that a
pair names only rigids and unbound metas. A refusal is reported by the
lack's reason (D1 for a written lack, D2 or D3'' for a pair's, the
caller's shape text otherwise); the reason changes only the report, not
whether the binding is refused. Tests: test/r005b-disjoint.test.mjs,
test/r005b-precedence.test.mjs; regression rows `r005b-provenance`
(step 3 keeps the reason) and `r005-provenance`.

**Compiler (Task 4, any number of tails; supersedes the Task 3
paragraph).** `bindTail` takes the image's tails as an array and runs
every step: 1; 2 (U3's check, §15.6); 3 and 5 on each tail (a meta
inherits the meta's lacks and the image's labels; a rigid must lack
both, so a rigid rest is now also held to the image's own labels, which
Task 3 did not check); 7 (occurs, with the guard of §15.8); 4, each
partner `p` re-required as the full `(F ⊎ T) # p` of §10 (Task 3 checked
the image against one partner with at most one tail); 5's pairs, each
two tails of `T` apart; 6 (U3's narrowing of each meta of `T`); 8. Each
sub-requirement flattens its rows when it runs, so a meta an earlier
step bound (a meta apart from itself, U4) is read through its binding.
Tests: test/row-merge.test.mjs and -domains.test.mjs (S, H, L, E),
test/r005b-unify.test.mjs.

## 8. Homes, commit and the shared remainder (design §2.1 steps 7-8)

**Homes** compute, for each constant, the metas of the other side that
may hold it. Its obligation is completeness: a meta excluded is one
that no solution lets hold the constant. Each exclusion is a
consequence: the meta lacks the label or is apart from the rigid; the
constant is outside its bound; or moving it in breaks a fact at once (a
rigid apart from the meta must lack the label, by the meaning of `#`; a
rigid constant must lack every label the meta lacks and be apart from
every rigid partner, by the meanings of `lacks` and `#`). Meta partners
never exclude, which errs on the side of admitting (complete).
**Rejects:** a constant with no home lies in no meta of the other side
in any solution, and must lie in one (§4): no solution. The prototype
reports `mismatch`; draft 3 binds a lone meta anyway so the excluding
fact reports itself (§2.1 step 8): a text difference only, governed by
R10 (diagnostics Appendix B), never a class difference.

**Commit.** A constant `c` with exactly one home `m` is committed: `m :=
{ c } ⊎ z`, `z` fresh. **Preserves (with the fresh meta):** by
completeness every solution has `c` in `m` (⊆ is immediate: any solution
of Σ' reads back to one of Σ, since `m`'s facts move to the image by the
bind rule). For ⊇, given a solution σ of Σ, set `z` to `σ(m)` minus `c`:
a subset of a well-formed row, so well formed, and every fact of `m`,
re-expressed on `{ c } ⊎ z`, holds because it held of `σ(m)`.
**Evidence:** 296,191 runs (A) committed with E holding; committing to
the first of several homes fails E, H, L and C2 (sensitivity).

**Shared remainder.** One meta on each side, both sides with constants:
`m ⊎ C1 = n ⊎ C2` with `C1`, `C2` disjoint after cancellation, so every
solution has `C2 ⊆ m`, `C1 ⊆ n` and `m − C2 = n − C1`; binding `m := C2 ⊎
z`, `n := C1 ⊎ z`, `z` fresh, preserves solutions by the same
fresh-variable argument (z is that common rest). A constant that `m`
cannot hold fails in the bind rule with its fact: no solution.
**Evidence:** 364,733 runs (A) (`r001-shared-remainder` in Tranche A).

## 9. Defer, quiet, the drain and deduplication (design §2.1, §2.2, §2.6)

**Defer** (constants remain, each with several homes) and **quiet** (no
constants, at least two metas on each side) move the residue to
`pending`, where it is still a constraint of the state. **Preserves:**
nothing is removed or added (the sum rule's facts came first, §5).
**Rejects:** never.

**The drain** re-examines a pending equation, which applies §1-§8 to it:
each step preserves solutions, so the drain does. A re-examination that
waits again replaces the entry under the same id.

**Deduplication** drops a pending equation whose normal form equals an
older one's. **Preserves:** the normal form (residue flattened, sides
sorted and ordered) denotes the same equation, so the state keeps the
same constraint once instead of twice. Keeping the older id and site is
a choice of which diagnostic to give (R7, R11), not of solutions.
**Evidence:** quiet 6,518 runs (B), deferral 803,312 (A), deduplication
3,552 (A) and 656 (B), re-examination 465,095 (A), E holding throughout;
chain.mjs (quiet equations do not multiply).

**Nested equations** (field types; argued, not prototyped). A label
cancelled during a re-examination unifies its field types (§2); if they
meet a multi-tail row, that inner equation is deferred under its own
id with the outer equation's site and owner. **Preserves:** the inner
equation is the field types' equation, kept as a constraint. **Once
only:** the outer equation's re-examination sees no label `a` again
(cancelled labels leave the residue, §2), so it cannot re-create the
inner equation; a duplicate would be deduplicated anyway. Checked first
by Task 5's `r005b-nested-field` and `r005b-pending-dedup` (ledger L17).

## 10. Decomposition of `L # R` (design §3.1)

`L # R` on flattened, separately well-formed rows holds iff no label is
on both sides, each label of one side is lacked by each tail of the
other, and each tail of one side is apart from each tail of the other:
this is `L ⊎ R` well formed, written pairwise. So decomposition is a
rewrite (preserves solutions) into lacks and pairs, and its rejections
establish impossibility:

- a label on both sides: `L ⊎ R` holds it twice (`overlap`, D2);
- a label against a rigid without the hypothesis, two rigids without
  the hypothesis: rigids are uninterpreted, so no σ makes it hold
  (`evidence`, D3, D3'');
- the same rigid twice: it occurs twice in `L ⊎ R` (`evidence`, D3').

**`x # x` on a meta:** the meta occurs twice in `L ⊎ R`, which is well
formed only if it denotes `{}`; binding it to `{}` replaces a variable
by its only value (preserves). **Evidence:** self-apart fired in
7,666,467 runs (A) with E holding; fixture `diag-18-wrong` (D3', rigid
twice); `evidence` refusals 9,167,657 (A), 0 dishonest.

**Compiler (Task 3, single-tail rows).** Features.Check.Disjoint
`requireApart` decomposes the pair of a bound meta's image `F ⊎ T` (`T`
at most one tail until Task 4) with each partner `p`, which is a rigid
or an unbound meta: labels first, in sorted order, then the tail
(location rule 5). It is this section's rewrite restricted to `R = p`
(no label on `R`, so the overlap case cannot arise until a literal of
several spreads, Task 7): a label against a meta `p` becomes `p lacks
l`, keeping the pair's reason and the bound meta as where the label
arrived; against a rigid it must be a hypothesis (D3''); `t # p` with
`t = p` a meta binds `{}` through the bind rule, with `t = p` a rigid is
D3'; two different rigids must be a hypothesis (D3); otherwise the pair
is stored. Seeding stores pairs between two fresh metas (a use) or two
rigids (the body's hypotheses), which need no decomposition. The
rejections are this section's (impossibility); the binding to `{}` is
its `x # x` case. Tests: test/r005b-disjoint.test.mjs (D2, D3, D3',
D3'', `{}` forced and its control without the clause, Decision 14's two
distinctions through a declared-type wrapper); regression rows
`r005b-mixed-lacks`, `r005b-mixed-tails`, `r005b-self-apart`.

**Compiler (Task 4; supersedes the Task 3 paragraph).**
Features.Check.Disjoint `requireDisjoint` is this section's rewrite in
full, on both rows as flattened when it runs: a label on both sides is
the overlap (reported by the pair's reason: D2, D1, D6 or the shape
text); each label of the left side is lacked by each tail of the right
side, in sorted order, then each label of the right side by each tail of
the left; then each tail of one side is apart from each tail of the
other (`requireApart`: a pair of tails that are still bare is the cases
above; a tail bound meanwhile is decomposed through its image).
`requireLack` on a meta bound meanwhile passes the lack to its image
(the label must not be among its fields; each of its tails lacks it); on
an unbound meta it records the lack and prunes the meta's upper bound
(U2, §5). `wellFormed` is a row's own disjointness (each tail against the
row's labels, each two tails apart), the creation-site obligation of §0,
recorded by the test entry before each equation as the prototype's
driver does. Obligations checked now that Task 3's single-tail form
omitted: labels on both sides (a partner bound since the pair was
stored), the right side's labels against the left side's tails, every
pair of tails rather than one, a rigid rest against the image's labels,
the image's own pairs of tails, and U2 on every new lack and pair.
Regression rows `r005b-mixed-lacks` (labels against tails skipped),
`r005b-mixed-tails` (tails against tails skipped), `r005b-self-apart`
and `r005b-provenance` follow the rewritten code (same defects).

**Reasons and their precedence (design §1.3; not a solving rule).** The
store keeps, for each lacked label and each pair, one reason. Merging
two facts on one key keeps the union of the facts (the key is present)
and chooses one reason by `prefer`, the minimum of a total order
(written lacks, written disjoint, implied, spread; then the earlier
span). The constraint set, and so every solution, is the same whichever
reason is kept; only the text of a later violation depends on it.
`prefer` depends on its two arguments alone, so the kept reason is
independent of arrival order (test/r005b-prefer.test.mjs: commutative
and associative on 3,000 random triples; regression row
`r005b-precedence`).

## 11. Removal's fresh remainder (design §5.2)

`e without { l1, …, ln }` requires `e` against `{ l1: α1, …, ln: αn,
...ρ }` with `ρ`, `αi` fresh, the row's creation obligation `ρ lacks
li`, and has type `ρ`; a rest binder likewise. **Preserves (fresh
metas):** the requirement says that `e`'s row holds each `li` (removal's
meaning); in every solution `ρ` is that row without the `li`, uniquely,
so the new system's solutions restricted to the old metas are exactly
the old ones in which `e` holds the labels. The type is never computed
by subtracting from a resolved type, so a later binding of a part that
holds `li` cannot bring `li` back into `ρ` (review F1). **Evidence:**
removal.mjs; fixtures `design-removal-left`, `-right`, `-rest-field`,
`-wait` (the access is refused while the equation waits, and after it
resolves either way).

## 11a. The compiler's forced solving (Task 4)

Features.Check.UnifyRecord drives one equation through §1-§8, one
examination at a time (Features.Check.RowResidue, SumRule, Narrow,
Homes, Commit, RowSettle, Homeless). Where it differs in form from the
prototype, the difference and its argument:

1. **Common labels once each** (§2). The labels both sides hold unify
   their field types once per equation; a later pass skips them. If that
   unification bound one of the rows' own tails, both rows are flattened
   again and every label unified anew (Tranche A's `rebound`). Unifying
   two types already unified again would change nothing, so skipping it
   keeps the solutions.
2. **One meta alone, two bare metas** (§6). Of two bare metas the newer
   (the larger number) is bound to the older, as Tranche A and type
   unification do; either choice preserves solutions (§6).
3. **The shared remainder before homes** (§8). With one meta on each
   side and constants on both, the remainder is made without computing
   homes. A constant one of the two metas could not hold is refused by
   the bind rule's own checks, each the meaning of the excluding fact:
   step 1 (a lack), U3 (a bound), step 3 (a rigid constant must lack what
   the meta lacks), step 4 (a pair re-required: a rigid constant apart
   from the meta is in both rows, D3'; a label against a rigid partner of
   the meta must be lacked by it, D3''; a rigid constant and a rigid
   partner need the hypothesis, D3). So the class is the prototype's
   (`no home` there); only the text differs, and it is the fact's, as
   draft 3 step 8 asks.
4. **A constant with no home is placed anyway** (draft 3 step 8, R10.2).
   *Rejection:* homes are complete (§8), so no solution puts the
   constant in any meta of the other side, and it must lie in one (§4):
   no solution. The constant is placed in each such meta on a copy of the
   state and the refusal whose reason the precedence prefers is reported
   (text only). Should every placement succeed, the records' mismatch is
   reported: the rejection rests on homes, not on the placement.
5. **U4's refusal keeps its fact** (R10.2). A meta U4 bound to `{}`
   keeps its last bound in `emptied`, whose `pruned` map holds, per atom,
   the fact that removed it (U2). When a constant then finds no meta on
   the other side (§4, a rejection as argued there), the fact that pruned
   it from such a meta's bound is reported, the strongest by the
   precedence, printed as the substitution stood before that sum-rule
   step; a constant only bounds' equations excluded is `Outside` (D6,
   Task 6); otherwise the records' mismatch. The verdict is §4's; only
   the text is chosen.
6. **U3's check reports a pruned atom by its fact.** Binding a bounded
   meta to an image whose constant is outside the bound is refused (§5,
   U3). If a fact pruned that atom (U2), the refusal is that fact's (a
   lack: D1, D2 or the shape text; a pair with a rigid: the rigid in both
   rows, D3'), as the bind rule would refuse it without the bound;
   otherwise `Outside`. Text only.
7. **The sum rule reads facts of live variables only.** The compiler
   keeps a meta's lacks after binding it (the prototype forgets them);
   the sum rule and homes read lacks only of unbound metas and rigids,
   as the prototype does. A bound meta's lacks are true of its image
   (§7, step 3), so reading them would also be sound; not reading them
   keeps the port's facts the prototype's.
8. **Waiting is a placeholder.** Constants left each with several homes
   (defer) or metas on both sides and no constant (quiet) are Task 5's;
   until then the examination ends in `Placeholder "equations that wait
   are solved in Task 5"`: neither a verdict nor a guess (the three-way
   result's `Unresolved` is made by Task 5's end of body). Nothing is
   removed or added before it, so no claim about solutions is made.
9. **The occurs check on a tail is a checker defect** (§7 step 7, ledger
   L33). After cancellation, and with fresh metas in commits and
   remainders, a meta is never among its own image's tails; the bind
   rule reports it, were it to happen, as E_INTERNAL `A record tail
   occurs in its own binding` (`Unexpected`), and the oracle tests count
   it as a defect (0 in every run). The occurs check on field types is
   Tranche A's, unchanged.
10. **The counters.** `changes` counts state changes (a binding, a new
    lack, each meta side of a new pair, a bound set or narrowed) as the
    prototype's version does; `fresh` counts solver-made metas. The
    oracle tests assert them within §13's measure and |P|·|K| (ledger L3,
    L4).

**Evidence (compiler).** test/row-merge.test.mjs: every fixture at
solver stage 4 in every order (never waits, its class), the stage-5
fixtures (a verdict never contradicts the class, Unresolved ones always
wait), the raw, dense, raw-program and program-shaped generators in five
orders (S, H, L, C2, E with its sensitivity check, L3, L4, L33) and
L31's direct check; test/row-merge-domains.test.mjs: the one-tail
problems of domains A and B in every order equal to ADR 013's rules
(verdict and solution; ledger L1), domain B whole and domain A one
candidate in 50, with E; `node scripts/row-merge-exhaustive.mjs A` (and
`B`), the whole domains, outside verify. Results: docs/progress.md, "R005
Tranche B Task 4".

## 11b. Result boundary classification (Task 4 fix, 2026-10-18)

Features.Check.RowOutcome `outcome` turns a unification's result into
`Either Stop RowOutcome`. Each failure constructor is classified by name
(no catch-all), with what establishes its claim (docs/engineering.md,
"Result boundary classification"; the user's review of 2026-10-18 found
the first version mapping every failure but a placeholder to
`Contradiction`):

| Failure | Result | What establishes it |
|---|---|---|
| `Refused` (`Forbidden`, `Overlap`, `MayHold`, `Unproven`, `Twice`, `Outside`, `Derived`) | `Contradiction` | a violated fact, by the rejection arguments of §4, §5 (U3), §7 (steps 1-3), §8 (homes), §10 (decomposition) |
| `Mismatch` | `Contradiction` | §1 (a label twice on a side), §4 (a constant with no meta opposite), §8 (a homeless constant), or Tranche A's unifier on field types (two different heads have no unifier) |
| `Occurs` | `Contradiction` | an infinite type has no solution among finite types (Tranche A) |
| `RowMissing`, `RowExtra`, `RowPayload`, `RowSharedTail`, `RowMismatch`, `RowOccurs` | `Contradiction` | effect-row unification of field types (FX001's unifier): no unifier exists |
| `TooDeep` | `Stop Limit` | nothing about solutions: the type grew past the depth limit |
| `Unexpected` | `Stop Internal` | nothing about solutions: an invariant an argument establishes (the tail occurs guard, §11a.9) found broken, a checker defect |
| `Placeholder` | `Stop Unfinished` | nothing: work a later task does (§11a.8) |

The oracle runner (test/row-merge-entry.mjs `classify`) throws on
`Limit` and `Internal`, so a test or a tool fails rather than count a
refusal; test/r005b-outcome.test.mjs injects each failure directly,
since generated problems rarely reach them. Diagnostics are unchanged:
Require and Reject render the failure as before.

# Part II: defaulting

## 12. The end-of-body default (design §6 step 1)

When a body ends, every free meta of the state is set to `{}` (σ0), the
row lowering already reads for an unsolved tail. This **selects** a
solution: it does not preserve the others, deliberately.

**The selected assignment satisfies every constraint** when no pending
equation has a constant. σ0 satisfies every lacks fact (`{}` holds no
label or rigid), every apart fact (`{} ⊎ x` is well formed when `x` is),
every bound, and every quiet equation (both sides denote `{}`). So σ0 is
a solution of the state, and by E its read-back is a solution of the
program's constraints (property S). A pending equation with a constant
is not satisfied by σ0 (the constant has no meta to lie in), which is
why such a body is not accepted: it is D4, `Unresolved`, a result that
claims nothing about the number of solutions (ledger L13).

**The selected solution is least.** Reading back is monotone in σ (a
meta's value is its fields plus its free tails' values), and σ0 is the
least assignment, so `ρ(σ0) ⊆ ρ(σ)` meta by meta for every solution σ of
the state; by E these read-backs are all the program's solutions, so
`ρ(σ0)` is their meet and is itself a solution: the least (property L).
This argument needs E, which is why every rule of Part I must preserve
solutions exactly: a rewrite that lost solutions could make the default
look least when it is not, and one that added solutions could make it
unsound. **Evidence:** D held on every accepted run, S and L on every
accepted run of both domains and the random campaigns.

**The joint fixpoint with the settle rounds** (design §6; argued, not
prototyped: the prototype has no effect rows). Each settle round ends
with a drain, and the rounds stop when neither the effect pairs nor the
record equations change. **Terminates:** the effect rounds terminate as
today (each decides a pair or changes a label count); the drain
terminates (§13); a round that counts as changed only because the drain
changed something consumes the row measure, which effect retries never
increase (they bind metas or add facts, both measure decrements, and
create no instantiation, so no new program meta). **Order:** the
default is applied only after the fixpoint, so it selects from the final
state; the verdict class depends on the constraint set, not on which of
the two loops ran first, by C2 for the rows and by today's settle
argument for the effects. Checked first by Task 5's
`r005b-end-fixpoint` in both directions (ledger L18). **Rollback:** the
store lives in the substitution, so reverting a postponed pair reverts
the facts and pending equations made inside it, and the retry re-defers
them with the pair's site (ledger L19, `r005b-settle-rollback`).

# Part III: termination and heuristics

## 13. Termination (design §2.7)

Let P be the program's metas, K the constants (labels L and rigids R) it
writes. Fresh metas arise only in commits and remainders, each adding a
new pair (owner in P, constant in K), so at most |P|·|K| (N = |P|(1+|K|)
metas in all). Every state change is one of: a binding (each meta once:
N), a new lack (N·|L|), a new apart pair (at most (N+|R|)(N+|R|+1)/2
pairs, each touching both sides), a bound set or shrunk (N·(|K|+1)). An
examination loops only after a state change; the drain repeats a pass
only after one; so the total work is bounded by this measure times the
number of equations. **Evidence:** exhaustive.mjs asserts, per run,
fresh metas ≤ |P|·|K| (max ratio 1/3) and state changes ≤ N + N·|L| +
(N+|R|)(N+|R|+1) + N(|K|+1) (max ratio 2/3); 0 violations in both
domains. A first version of the assertion counted an apart pair once;
domain A reached the bound exactly (ratio 1), which showed the double
touch and the bound was corrected before the run recorded here.
growth.mjs measures the same on large random problems (ledger L3, L4).

## 14. Heuristics

None of these may change a solution set; each is labelled `heuristic` in
the code that implements it.

- **heuristic: re-examine only equations naming a changed meta** (the
  `naming` index, design §2.6). Sound: a skipped equation stays pending,
  a constraint of the state, so S, H and E are unaffected. Not lossless:
  the sum rule's apart derivation reads the facts of a partner `q` of
  the equation's metas, and `q` need not be named by the equation, so a
  new fact on `q` does not re-examine it. The cost is only completeness
  (a fact not derived, possibly an `Unresolved` that a full re-run
  would resolve) and possibly order dependence; C2 showed no order
  difference in either domain or campaign. The user's requirement
  (2026-10-17): Task 5 must be dependency-complete, indexing every fact
  the rules read including relevant partners, or conservatively
  rescanning pending equations; recording missed wake-ups as a measured
  heuristic is not acceptable under the order-independence requirement.
  It compares the indexed implementation with a reference that rescans
  everything to a fixpoint (ledger L32).
- **heuristic: deduplication by normal form**: an equal normal form is
  the same constraint (§9); two equal constraints with different normal
  forms would only be kept twice (one diagnostic per program anyway,
  R11).
- **heuristic: `arrivedAt`, `boundBy`, `emptied` and narrowing reasons
  only on record metas**: diagnostic metadata; not constraints.
- **heuristic, if adopted: the sum rule only on residues whose metas
  changed** (design §13 risks): the prototype runs it on every
  examination; if adopted, the same soundness argument and caveat as the
  index apply.
- **Not adopted: `expand`** (the k × l basis for a quiet equation beside
  a waiting one): a rewrite (Stickel's basis preserves solutions with
  fresh pieces) that removes some D4 with a least solution at the old
  cost (design §2.2, ledger L27).
