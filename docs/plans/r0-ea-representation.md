# E-a's witness representation: options for the author

R0 Task 7.1a, 2026-10-23. A decision note; nothing here is
implemented. The author's G-erased ruling (r0-erased-rows.md §7.1,
item 4) adopted E-a. Task 7.1 found that the implemented witness cannot
carry E-a's values, so the controller ruled that Task 7.1 lands D1's
§12.1 fallback for now. Labels as in the R0 documents: **cited**,
**argued**, **checked** (a recorded run).

**The gap (cited).** D1 §3.2 assumes `Inline τ` holds a `Ty Open`.
Task 4.4's amendment 1 made it `Inline RTExpr`
(src/Domain/Verdict/Witness.purs). `RTExpr` erases every effect row:
arrow rows, a data type's row arguments and a handler's rows
(src/Domain/Recorded/Atom.purs; T-R0b §2.2). So (i) an `EffectRowSort`
variable has no binding form, (ii) rows inside an image cannot be
written, so item 4's "consistent bindings inside nested types" cannot
be tested, and (iii) `build` cannot rebuild today's effect rows from
the witness alone. A related gap: an `RTExpr` image may name a problem
variable, which W's `Ty Open` could not, and no Cov clause excludes
it. Task 7.1a reports it as the build fault `ImageVariable`, a broken
invariant (argued: the online adapter's images are read back from
checked types and never name one).

**What lands now (option c, the controller's ruling).** Images come
back with closed, empty rows (Generate.Elab.Image). A handle in an
effect-row tail fails the seal check (`SortClash`). Task 7.1b's T2 and
T8 will compare effect-erased projections. Task 4.6 stays blocked.

**Correction (2026-10-24, whole-stack review P2-4).** Option c drops
more than effect rows. Generate.Elab.Image builds a data type as
`TData owner arguments []`, so its row arguments are gone and their
count no longer matches the declaration; it writes handler labels
`Unmarked` with `clauses: Nothing`. test/r0-elab-erase.mjs erases all
three, so T2 and T8 cannot see them. The ruling is the controller's
(an agent's), not the author's: the author adopted E-a conditionally
(r0-erased-rows.md §7.1 item 4), and no author approval of this
departure was recorded when it landed (dossier §18.72). Gate
G-effect-rows (plan §3.A) holds the decision and blocks Task 4.6 and
Task 7.2's bridge removal.

| | (a) row-carrying images | (b) effect-row binding only | (c) §12.1 fallback |
|---|---|---|---|
| Witness | `Inline` holds a `Ty` over `Var` with rows; G0 reads its `RTExpr` projection; a binding form for effect-row variables | `RTExpr` images kept; a new `InlineRow` for `EffectRowSort` variables | unchanged |
| Item 4 (nested types) | testable | not testable: nested rows still erased | not testable |
| Canonical encoding (test/r0-canonical.mjs) | changes for images and the new binding | adds the new binding | unchanged |
| Hole contract | must also judge effect-row holes in images (lowering's row default) | judges the new variables' `Free` holes | unchanged |
| Cov's domain | grows by the `EffectRowSort` variables (§2.1's slots) | grows the same way | unchanged |
| RT8 and window | may move: new variables raise `Uncovered` or `HoleContract` cases; each moved row would need listing (Task 7.1's brief: stop for the author if a class moves) | as (a), for the top-level slots only | none (Task 7.1a asserts no pin changed) |
| T2 scope | full checked IR for the online witness | effect rows at named slots only | effect-erased |

**Lowering (E-c's audit, argued from comments, not run).** `lowerType`
ignores a data type's row arguments and lowers an arrow through its
spine (src/Features/Specialize/Lower.purs:45-60). Specialization keys
"hold no effect rows" (Specialize/Ground.purs:25), and effect layouts
are keyed by an effect and its type arguments, which are label
arguments `RTExpr` keeps (Specialize/Effects.purs:36). If an audit
confirms that, lowering needs no effect-row value from the witness,
and E-a's values matter only to the checked IR's own consistency and
to effect validation (G-erased item 2).

**Questions for the author.** (1) Which option, and is a moved RT8 or
window row acceptable under it? (2) Should Cov exclude images that
name a problem variable (a W/Task 4.4 owner clause), or is
`ImageVariable` as a broken invariant enough? (3) Is E-c's audit wanted
before choosing, since (a) costs most if lowering never reads the rows?
