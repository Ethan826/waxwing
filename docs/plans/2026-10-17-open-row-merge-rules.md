# Open-row merge: arguments for the solving rules (R005 Tranche B)

Status:
Task 0 of docs/plans/2026-10-17-open-row-merge-plan.md, 2026-10-17;
accepted by the user (2026-10-17) with the notes below

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
