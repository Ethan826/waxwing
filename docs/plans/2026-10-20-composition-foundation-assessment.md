# Composition requirements: foundation assessment

Date: 2026-10-20, revised three times the same day after the author's
reviews (the first version recommended an improvement rule of its own,
§4.4; the third adds program 11, Pottier's system and the narrow
question of §4.8; the fourth, a bounded pass, adds Makholm and Wells,
§4.9, and Sulzmann, §4.10, and scopes the claims about Pottier and
signatures). Status: assessment for the author's decision. No
implementation is proposed for authorization here.

Requirements: docs/plans/2026-10-20-composition-acceptance-programs.md
(eae3188; program 11 added since). Evidence:
research/composition-assessment/ (program variants and runner;
probes run with PureScript 0.15.16, Koka 3.2.3, GHC 9.4.8, Ur/Web
20200209 and Pottier's Wallace toy of 2000-02-11); Waxwing's
own runs use the Task 7 checkpoint build (branch `r005b-task7-wip`,
4d741a1, which accepts several spreads in a literal). Each claim about
another system says whether it comes from running that system (probe)
or from reading its paper or source (reading).

## 0. In brief

The narrow question (§4.8): can a published approach keep independent
field types (program 11) while accepting programs 4 and 5 and refusing
their negative controls? Among the systems examined, no. They divide:

- **Rows as type variables** (PureScript, Ur/Web, Waxwing today; probes)
  keep program 11 and the forwarding wrapper, and do not infer the
  splits of programs 4 and 5. Jones's improvement (FPCA 1995 §4.1) is
  the published frame for adding that, but it supplies no improving
  function for merges and `lacks`; that function would be new.
- **Presence flags over a shared type term** (Simon 2014; reading)
  accept 4 and 5 by satisfiability and refuse program 11, because a
  field has one type wherever records are joined.
- **Conditional subtyping constraints** (Pottier 2000; reading, and a
  probe of his Wallace toy) keep program 11 (accepted, with one pending
  conditional per use), but records have width subtyping, a definition
  is checked only for satisfiability (a function whose parts both lack
  `admin` and that reads `.admin` is accepted until it is called), the
  toy has no declared signatures to check, and program 4 as written
  cannot be stated in it. That absence is the toy's, not a proof about
  the approach: Pottier's thesis checks module signatures by a sound,
  incomplete comparison of schemes, for a system without concatenation
  or conditional constraints (§4.8).

So the concrete conflict: deciding a split from facts needs reasoning
about field presence, and the published systems that do it either share
one type per field (Simon) or check only satisfiability under subtyping
(Pottier); the systems that keep field types independent do not decide
splits. Nothing here proposes a way around it.

Elsewhere: program 8 (§5.1) and program 9 (§5.2, W as the baseline)
follow the author's dispositions; program 7 (§6) is a separate
milestone. Decisions: §7.

## 1. Where the work stands, and what the requirements supersede

**Preserved.** Branch `r005b-replan` ends at 43b3a28: B5 as accepted
(1337bd3), the docs entry for decision 24 (69d4525), three behaviour-
preserving splits for Task 7 (fa57f41 Check/Overlap, 0a36ae3
Check/RestBinder, 22d3631 RowMerge/Chain) and a test fix the split
needed (43b3a28: the structural metadata test listed Desugar by file
name and read Chain as a solving module). The splits' differential
against 1337bd3 found 0 differences (8,713 harvested sources, fuzz,
matches, mutations; .build/evidence/r005b-t7-split-diff.log). The Task 7
implementation in progress is preserved unmerged on `r005b-task7-wip`
(4d741a1); it builds with 0 warnings and does not pass verify (on it the
record suites run 486 of 493 tests passing; docs/progress.md has the
details).

**Superseded by the clarified requirements** (each was an approved
decision under the plan it belonged to; the acceptances stay evidence
that the code met that plan):

| Earlier decision | Where | Now |
|---|---|---|
| O4 kept as an accepted limitation ("callers cannot repair it") | plan §10 decisions 17, 18, 19; limitations file option C | program 4 is required: the uniquely determined split is inferred, with no caller annotation |
| `apply(merge, noX)` (program 12, `diag-14-fix`) reclassified Unresolved with an annotated lambda as its fix | plan §4.5, §5; decision 2 of 2026-10-19 | program 5 is required directly; the annotated lambda stays a valid spelling, not a required fix |
| D4's kind-2 hint for a call's own rows (`no annotation can decide …`) | decision 20 | its premise (O4 unrepairable) no longer holds for determined splits |
| "Waxwing generalizes nothing"; `let` is monomorphic | language.md; QT re-plan §0 ("Entailment") | program 8A is the desired experience; a named-helper-only restriction was not accepted |
| A callback's row must equal the row where it is called (FX017, FX018) | language.md, ADR 010 | program 9 needs a callback of row `Users + ...e` called where `Database + Log` are also available |
| The adopted solver's scope: PureScript's `Union` cases plus Sym, 1g, 2g, H | plan §2 | still sound for what it decides; it does not decide programs 4 and 5 (§2), so it is not the complete foundation the requirements need |

Not superseded: everything the programs leave alone (the surface of
records and `lacks`/`disjoint` clauses, the disjoint meaning of a
spread, explicit overlap policy, typed failures as they are).

## 2. The programs against the current compiler

Run with `GOTOOLCHAIN=go1.26.4 node research/composition-assessment/
run.mjs` on the checkpoint build. "Checks" means checking accepts it and
lowering stops at the Task 8 placeholder (rows of several tails are not
lowered yet).

| Program | Outcome now | Negative control | What stands in the way |
|---|---|---|---|
| 1 small part of a larger value | runs, `Hello, Ada!` | rejected (missing `name`) | nothing |
| 2 add a field, keep the rest | runs, `Ada` | rejected (D1, `r lacks { reviewed }`) | nothing |
| 3 combine two pieces | checks (swapped and both groupings of three too) | none | lowering (Task 8): unavailable yet, not a design question |
| 4 a split decided by a `lacks` fact | **rejected**: D4 `Cannot tell how acceptsParts's r and s split { admin: Bool }` | rejected (H: neither part can hold `admin`) | **inference limitation** (§3) |
| 5 `composeRequirements(join, restricted)` | **rejected**: D4 `Cannot tell how join's r and s split { x: Int, y: Int }` | none | **inference limitation**; the annotated spelling checks |
| 6 a forwarding wrapper | checks | rejected (promised `extra` not supplied) | lowering only |
| 7 overlap by chosen semigroups | rejected: `mergeWith` unbound | none | **unavailable feature**: a typing that maps a type over a row's fields (§6); explicit dictionaries are ordinary values |
| 8A a local row-polymorphic helper | **rejected**: second use mismatches the first | none | **semantic choice** (monomorphic `let`, language.md) |
| 8B the named generic helper | runs | none | nothing |
| 9 layered service fulfillment | **rejected** as written: `action must allow every effect at this call (Users + Database + Log), but its row is Users`; with the callback's row widened to `Users + Database + Log + ...e`, runs, `User("Ada")` | test replacement runs (`User("Test user")`); `profile` without `Users` rejected | **semantic choice** in the effect system (FX017/FX018 equal-row rule, §5) |
| 10 typed failures, one family removed | runs, `Guest`; with `(1, false)`, `Forbidden` | rejected (pure `guestGreeting` leaves `Denied`) | nothing |
| 11 extend one input at two field types (added) | runs, `0` (generic and lambda forms) | rejected (D1, `r lacks { a }`) | nothing; the two-spread form checks (lowering defect on the checkpoint, §2 below) |

The same two record programs in PureScript 0.15.16 (research/
composition-assessment/purs; `purs compile P4.purs`, …): program 4 and
program 5 are refused (`NoInstanceFound`, "The instance head contains
unknown type variables"); program 6 compiles. PureScript's `Union`
improves only through its three functional dependencies (two rows known
determine the third) and its `Lacks` facts never inform `Union`, so the
foundation the current solver copies cannot decide either program.

Found while probing (checkpoint build only): a literal of two spreads
whose rows are all known passes checking and emits Go that does not
build (`programs/shared-type-*.wxw`, `undefined:
waxwingBasewaxwingLocal0`); Task 8's lowering placeholder guards several
tails, not several spreads. Recorded in docs/findings.md (Task 7, item
5).

## 3. What programs 4 and 5 ask of a foundation

Both call interfaces written with `{ ...r, ...s }` and facts (`lacks`,
`disjoint`). On the labels alone each has one solution: program 4 puts
`admin` in `r` and leaves `s` empty; program 5 puts `x` in the first
part and `y` in the second (`diag-14-fix`, plan §4.5, 1 solution; O4
with `{ admin: false }`, limitations file, 1 solution). Three questions
are asked of a foundation:

1. **Satisfiability.** Can the facts be met at all? Needed to refuse the
   negative controls (program 4 with both parts lacking `admin`).
2. **Useful inferred types.** What does the rest of the program learn
   about the types? In the current design that means deciding which part
   holds a label, because each part is its own row.
3. **Checking quantified signatures.** Inside a generic function the
   signature's rows are rigid: the body must type for every instance of
   them (the forwarding wrapper of program 6).

The current design answers 1 partially, 2 only through PureScript's
dependencies (two rows known determine the third; a `lacks` fact never
counts), and 3 by the cases it has for rigid tails (1g, 2g).

## 4. Candidate foundations for records

### 4.1 The current design: PureScript's `Union` (QT-strict+Sym+H)

PureScript 0.15.16's `unionRows` and `Union`'s three dependencies (Jones
2000), with the approved adaptations 1g, 2g, Sym and H (plan §2).
Programs 1, 2, 3, 6 (lowering aside); not 4 or 5, in Waxwing or in
PureScript (probe, §2). Sound for what it decides; programs 4 and 5 are
outside what its rules decide, so keeping it means restricting the
requirements.

### 4.2 Rose: Morris and McKinna, POPL 2019

Reading. Containment and combination predicates over an abstract row
theory, principal types by Jones's qualified types (§4.5, Theorem 11);
the only dependency is the forward one (coherence, Def. 13-14), with no
improvement rules and no lacks predicate. It states what Waxwing's
`Merge` already is and adds nothing programs 4 and 5 need. Its sequel
(Hubers and Morris, ICFP 2023) bears on program 7 (§6).

### 4.3 Simon, Optimal inference of fields in row-polymorphic records

Reading of the paper (PLDI 2014; author's copy). What it is:

- **Two domains** (§2.3). A record type is a Rémy-style type term,
  `{N1.f1 : t1, …, a.fa}`, unified as usual; each field and each type
  variable also carries a Boolean flag, "this field exists". Flags are
  related by a Boolean function in CNF (the "flow"). A program is
  ill-typed when the type terms do not unify or the flow is
  unsatisfiable (§1).
- **Rules** (Fig. 3). Application equates the flags of formal and actual
  (`⇔`); a conditional relates its result's flags to each branch's by
  implication (`⇒`), not equality; the empty record sets its flags
  false; selecting `N` requires `fN`; an update leaves the other
  fields' flags unchanged.
- **Generalization** (Fig. 3, LETREC; §2.4). Let-bound variables are
  generalized (Milner-Mycroft, polymorphic recursion included); a type
  scheme carries the flow projected onto its own flags (existential
  projection), and instantiation duplicates the flow onto fresh flags
  (`applyS`, `expand`, Def. 2, Fig. 4).
- **Concatenation** (§5). Asymmetric concatenation gives Horn clauses
  (linear time). Symmetric concatenation, "a type error if a field
  exists in both records", needs `¬(f1 ∧ f2)`, which is not Horn:
  "satisfiability and existential projection can be computed using a
  SAT solver [Brauer, King and Kriener, CAV 2011], it is questionable if
  this operation justifies this increase in complexity". In §5 both
  arguments and the result of a concatenation have the same type term
  and differ only in their flags.
- **Field types.** A field has one type within a type term even where it
  is absent: Simon rejects `f {foo = "bad"}` where Pottier's system
  accepts it, and keeps that choice (§1.1). Typing fields only where
  they exist needs conditional unification constraints, "an SMT solver
  with a theory of unification constraints … as far as we know, no
  state-of-the-art SMT solver features" one (§5). That is Simon's
  report of 2014, not a finding about solvers available now.
- **Implementation** (§6): select and update only, a 2-SAT solver, in a
  22,000-line DSL toolchain; "we never had the need for record
  concatenation". No implementation of the §5 concatenation was found.
- **Optimality** (§1.2, §3): the inferred types are backward complete
  relative to an abstract semantics in which `if` is a nondeterministic
  choice, and with polymorphic recursion.

**Why it fits programs 4 and 5.** There is no part to decide. `{ ...r,
...s }` is the result of a symmetric concatenation: one type term, the
flags of the result being "in r or in s, not both", `s lacks { admin }`
being "s's flag for `admin` is false". Program 4's call fixes the result's
flags (`admin` present, nothing else), the formula is satisfiable, and
the program types; which assignment satisfies it is not part of any
type. Program 5 likewise; their negative controls make the formula
unsatisfiable. `apply0(merge)` and O4's two-solution variant type too:
under this treatment "undetermined by labels" is not an ambiguity, as
the author's note on decision 3 anticipated.

**The translation**, construct by construct, and its source:

| Waxwing | Simon form | Source |
|---|---|---|
| record type `{ l: T, ...r }` | type term `{l.f : T, ρ.fρ}` | §2.3, as written |
| `{ ...r, ...s }` | the result of a symmetric concatenation of two occurrences of one term `ρ`, flags `fr`, `fs`: per field `f ⇔ fr ∨ fs` and `¬(fr ∧ fs)` | §5, analysed, not implemented; `⇔` in place of `⇒` (below) |
| `where r lacks { a }` | `ρ` holds `a`, and `r`'s flag for it is false | as the empty record and selection rules do (Fig. 3) |
| `where r disjoint s` | `¬(fr ∧ fs)` per field and for the row | §5's clause |
| a literal `{ ...a, x: v, ...b }` | concatenations, the field as a one-field record | §5 |
| `.l`, `e without { l }`, `{ l, ...rest }` | selection; removal (§5: two-variable Horn) | as written; removal analysed |
| exact records: both branches of `if`, an argument and its parameter, have the same fields | flags equated (`⇔`) everywhere; Simon's conditional uses implications | **Waxwing's**: a restriction of Simon's rules |
| a declared signature, rigid row variables | not in Simon (inference only): rigid terms as constants; the body's flow, projected onto the signature's flags, must follow from the signature's clauses | **Waxwing's**; the entailment of qualified types (Jones 1992 §1, read for the QT re-plan) with Boolean predicates |
| `let` of a lambda | generalized with its projected flow | as written (Waxwing has no polymorphic recursion to infer) |
| monomorphized Go layouts | not in Simon (his records are dynamic) | **Waxwing's**: every constructed value's flags must be fixed; to be argued (a value of type `{ ...r }` alone comes only from a position typed `{ ...r }`, so free flags fix no layout) and checked |

**What would change in Waxwing.** Record types gain flags beside their
terms; a row variable of a signature becomes a flag over a type term
shared with the other rows it is joined to; the `Merge` predicates, the
case table (1, 2, 2g, Sym, 1g), H and the Unresolved class go, replaced
by a Boolean store with satisfiability and existential projection (a
SAT procedure, textbook; projection by resolution or Brauer et al.);
specialization keys come from flags; D1-D6 have to be recovered from an
unsatisfiable formula, which is new diagnostic work. Tasks B1-B5 survive
as tests and fixtures, not as solver code.

**What it would refuse that the compiler accepts today.** Sharing one
type term means a field has one type wherever records are joined, even
where it is absent. `programs/shared-type-lambda.wxw` and
`shared-type-generic.wxw` merge one record `q` (which lacks `a`) with `{
a: 1 }` and, separately, with `{ a: true }`: checking accepts both now;
under the translation `q`'s term would need `a: Int` and `a: Bool`, a
type error. Keeping today's behaviour needs Pottier-style conditional
constraints, for which Simon knew of no solver in 2014 (§5; a 2014
statement, not checked against what exists now). This is the concrete
tradeoff of this foundation.

**Assessment.** Simon's two domains are an established, implemented
technique (also Glynn, Stuckey and Sulzmann 2001, cited in §7), and his
§5 gives the constraint symmetric concatenation needs. The parts Waxwing
would add (exact records as `⇔`, signature checking by entailment, fixed
layouts) are each standard in form, but the whole is not a system anyone
has implemented with symmetric concatenation; it is a translation to
argue, with the four questions of §7 decision 1.

### 4.4 The first version's proposal, withdrawn

The first version recommended "place a field in a part only when every
solution places it there" (Jones's improvement, decided exactly on
presence flags). That is a correctness criterion for a rule, not an
algorithm: it leaves open how the Boolean problem represents Waxwing's
typing problem, how rigid rows are represented, which field-type
relations are kept, and how substitutions, residual constraints and
defaulting interact, and it rested on two unproved assumptions. Simon
answers those questions differently and in print (no placement at all;
one type term; flow projection), so 4.3 replaces it.

### 4.5 Boolean unification of presence (Flix's method)

Reading. Unification in Boolean rings has most general unifiers, with
and without constants (Baader and Snyder, Handbook of Automated
Reasoning, §3.4); Madsen and van de Pol (OOPSLA 2020) put it inside
Hindley-Milner with let-generalization and principal types modulo
Boolean equivalence, at about 1.4× inference time and only with formula
simplification. Flix applies it to effects and restrictable variants
(over a finite declared label set), not records: its record rows are
ordinary rows (RecordConstraintSolver.scala). Applied to records it
would give principal flag solutions where 4.3 keeps a projected formula;
it shares 4.3's field-type question and adds a change to the type
language (types carrying Boolean formulas). Not preferred over 4.3.

### 4.6 A general solver (SMT, or a SAT library)

Answers satisfiability; gives no types, generalization or texts; Z3 in
the checker was assessed and refused for layering and determinism
(alternatives file §8.3). 4.3 needs a SAT procedure inside the checker,
not a general solver.

### 4.7 What was searched

"No published record system does this" is bounded by what was read:
Simon 2014; Rémy 1992 (RR-1739); Morris and McKinna 2019; Hubers and
Morris 2023; Castagna and Peyrot (arXiv 2404.00338); the Flix papers and
repository; PureScript's source; Pottier (Nordic Journal of Computing
2000, LICS 2003, the 1998 thesis, Wallace's source; §4.8); Jones FPCA
1995 §4.1; Makholm and Wells 2005 (§4.9); Sulzmann's HM(REC) (TAPOS
1999 §7; §4.10). Not read: Wand 1991; Sulzmann's thesis (2000), the
work ATTAPL ch. 10 §10.8 cites for record extension and concatenation,
and his RR-1128 (1997), neither of which could be retrieved (§4.10).
Simon's
2014 statement that no SMT solver had a theory of unification
constraints is his, of 2014; whether a solver for SMT's theory of
algebraic datatypes now provides what his §5 calls for was not
examined.

### 4.8 The narrow question, against the systems examined

Program 11 (added to the requirements, eae3188's document, §11): a
record `q` that lacks `a`, extended once with `a: 1` and once with `a:
true`. Rows: P = probe (the system run), R = reading.

| System | 3, 6 | 4 | 4's negative control | 5 | 11 | Declared signatures checked |
|---|---|---|---|---|---|---|
| Waxwing today (QT-strict+Sym+H) | accepted (P) | refused, Unresolved (P) | refused (P) | refused, Unresolved (P) | accepted (P) | yes |
| PureScript 0.15.16 (`Union`, `Lacks`) | 6 accepted (P) | refused (P) | not run | refused (P) | accepted (P, purs/P11.purs) | yes |
| Ur/Web 20200209 (`$(r ++ s)`, `[r ~ s]`) | accepted (P) | refused: "Stuck unifying these records" (P) | not run | refused, same (P) | accepted (P) | yes |
| Simon 2014, translated (§4.3) | accepted (R) | accepted by satisfiability (R) | refused (R) | accepted (R) | **refused** (R) | to be added |
| Makholm and Wells 2005 (Bowtie; `bowtini` 1.3) | accepted (P) | not expressible (no declarations); encoded, accepted with no split visible to callers (P) | **not refused**: free set variables are solved by ⊥ (P; R: ICFP Lemma 5.9) | encoded, accepted; an unsatisfiable variant accepted too (P) | **refused**, one row per join (P; R: TR §3, ICFP §5); accepted with a written `\\ a` per use (P) | no: checking a given typing is NP-complete (R: TR App. B.4); a Church-style check promised, not given |
| Sulzmann, HM(REC) (TAPOS 1999 §7) | not expressible: no extension or concatenation (R) | not expressible (R) | not expressible (R) | not expressible (R) | not expressible (R) | no annotation rule; entailment a parameter of X (R) |
| Sulzmann, HM(RECc), thesis 2000 (§5.1.2, A.2; §4.10) | 3 accepted, overlap also accepted (R); 6: no signatures | accepted by satisfiability; REC5 entails `admin` in `r`, printed closure does not derive it (R) | unsatisfiable, refused only given a satisfiability test not supplied for RECc (R) | accepted by satisfiability; REC5-6 entail the split (R) | **accepted**, refused negative control (R) | no: no annotations; entailment procedure not given (R) |
| Pottier 2000 (Wallace toy) | accepted (P: disjoint union typed, overlap refused) | not expressible: the toy has no declarations (P) | not refused under its rules (R) | satisfiable, so not refused (R) | **accepted** (P) | not in the toy (P); the 1998 thesis's typer checks module signatures by a sound, incomplete scheme comparison, without concatenation or conditionals (R) |

**Pottier, read** (NJC 2000 §5.1-§5.2; LICS 2003; Wallace's source):
field types are `Abs`, `Pre τ`, `Either τ`, `Any` with `Pre τ` and
`Abs` incomparable and a common supertype, so records have width
subtyping; there is no `lacks` predicate (absence is an upper bound `φ ≤
Abs`). Symmetric concatenation is four conditional constraints, `Abs ≤
φ1 ? φ2 ≤ φ3`, `Abs ≤ φ2 ? φ1 ≤ φ3`, `Pre ≤ φ1 ? φ2 ≤ Abs`, `Pre ≤ φ2 ?
φ1 ≤ Abs` ("any one of these two constraints would in fact suffice";
the toy implements three, toy/engine.ml). A condition tests only a lower
bound on a head constructor, which keeps the solver polynomial (LICS
2003 §2). Implications run from the parts to the result: a lower bound
on the result (a record passed where `{ ...r, ...s }` is expected) puts
nothing on the parts, which is why program 4's negative control is not
refused. Inference is an HM(X) instance with closed constrained schemes
and lazy simplification ("ignore any conditional constraints whose
condition has not yet been fulfilled", NJC Example 4). The toy's
declaration form is commented out.

**Pottier and signatures, scoped.** The missing facility is the toy's.
The remark "no complete entailment algorithm is currently known"
(wallace/core.ml, 2000) is an implementation comment on simplification:
it explains why the joining of two constraint leaves does not test
whether one is already greater. It says nothing about declarations. The
thesis (1998, ch. 4, 8, 9, read) is the precise statement: entailment
and the comparison of constrained schemes were, in 1998, of open
decidability for its constraints; chapter 9 gives a sound, incomplete
comparison (generalizing Trifonov and Smith), and the thesis's typer
uses it to compare an inferred scheme with the one a module signature
declares (introduction; ch. 8 opening). So under Pottier's approach a
declared signature can be checked soundly, and some correct declarations
may be refused. Three limits on what follows for Waxwing: the thesis's
system has no concatenation and no conditional constraints, and whether
its comparison extends to them was not examined; "open" and "currently
known" are statements of 1998 and 2000, not checked against later work
on subtype entailment; and a sound, incomplete check would refuse some
valid declarations, which the requirements have not been asked about.

**Pottier, run**: Wallace 2000-02-11 (cambium.inria.fr/~fpottier/
wallace; "Distributed only by permission", so the archive and the
port's patches stay outside the repository), built with OCaml 5.5.1
after mechanical changes (renamed library functions aliased; `&` and
`or` written `&&` and `||`; the lexer's string buffer moved to `Bytes`;
one cast of a parser result whose type parameter is phantom, its `info`
always `None`). Inputs and outputs: research/composition-assessment/
wallace/. Program 11's lambda form gets type `int` and keeps one pending
conditional per use (`if RAbs < -a then RPre int < R1`, and `RPre
bool`); with `q` holding `a` it is refused ("Constraint
inconsistency"). A function taking `r` and `s`, both made to lack
`admin`, that reads `(r @@ s).admin` is accepted with fourteen pending
conditionals and refused only when applied to `{}` and `{}`; the same
with only `s` lacking `admin`, applied to `{ admin = false }` and `{}`,
gives `bool`.

### 4.9 Makholm and Wells, Bowtie (2005)

Reading (TR HW-MACS-TR-0030 v1.0.2, all; ICFP 2005, §1, §4-§5, §7) and
probes of their tool, `bowtini` 1.3 (Moscow ML; research/composition-
assessment/makholm-wells/, inputs, outputs and build notes; the archive,
marked "PERHAPS_GPL_EVENTUALLY", stays outside the repository). A record
type is `{[R / S]}`: a row `R` of field types and a label set `S`;
no subtyping; concatenation (TConcat) requires both parts and the
result to share one `R`, so a field has one type across a join. The
papers name the consequence "row pollution" and their own example is
program 11's shape; their remedy, hiding (`\\ l`), "cannot be applied
fully automatically" (ICFP §5). Set constraints are `S1 ⊎ S2 = S`, `S1 \
L = S2` and `S ∋ l`; there is no `lacks` (it is encoded by a dummy
concatenation). Their hardness results: typability of the naive system
with exact label sets is NP-complete, for symmetric and overriding
concatenation alike (TR Thm 2.1; ICFP Thm 4.1, 4.7), and they restrict
the system rather than search: a set variable left free is solved by ⊥,
which satisfies every constraint whose parts are unknown. Hence program
4's negative control is not refused; refusing it needs ⊥-free
solvability, NP-complete even with one label (TR Lemma B.5). Inference
is principal and near-linear; there is no `let` in the tool and no
declared signatures. As a foundation it shares Simon's refusal of
program 11 and Pottier's acceptance of program 4's negative control,
and decides no split.

### 4.10 Sulzmann, HM(RECc) (thesis, 2000)

Reading: Sulzmann, A general framework for Hindley/Milner type systems
with constraints (Yale PhD thesis, 2000; the ResearchGate copy,
retrieved by Waxwing's author, not stored in the repository):
§5.1.1-§5.1.2 (pp. 120-127, Figures 5.1-5.2, Remark 5, Theorem
21), Appendix A.2 (p. 174), §4.2 on normal forms (p. 89: entailment
and uniqueness), §2 on annotations (p. 9). Also HM(REC) (Odersky,
Sulzmann and Wehr, TAPOS 1999 §7). No implementation was found or
run; the thesis's record systems are not those of Chameleon
(research/composition-assessment/sulzmann/README.md). Every outcome
below is R.

**What it is.** Ohori's records in HM(X). A record type is exact, `{l1
: τ1, …}`; polymorphism is a kinded variable `(α :: {{l : τ}})`, "α
has field `l` of type `τ`"; REC2 gives a field one type within one
record (one variable). Two further predicates: `(α\l)`, α lacks `l`,
and `concat(α, β, γ)`. Its axioms, with Fig. 5.2's closure rules 6-7:

    REC5 concat(α, β, γ) ∧ (γ :: {{l : δ}}) ∧ (β\l) ⊢e (α :: {{l : δ}})
    REC6 concat(α, β, γ) ∧ (γ :: {{l : δ}}) ∧ (α\l) ⊢e (β :: {{l : δ}})

This is the deduction §4.8 found missing: a field of the result
belongs to the part whose partner lacks it. Fig. 5.2 also refuses a
variable that both has and lacks a label (rule 8) and a closed record
said to lack a field it has (rule 9). Inference closes the constraint,
unifies the equalities it produces and repeats to a fixed point (p.
126); Theorem 21 states the principal constraint property "by
application of the lifting method"; uniqueness of principal types is
conjectured (p. 127).

**Not Waxwing's merge, as published.** §5.1.2 models asymmetric,
overriding concatenation (Remark 5: "the first record takes
precedence"; REC7's label set, `(l̄ \ l̄') ∪ l̄'`, and rule 10, which
keeps the first record's fields, read differently on which side wins).
Appendix A.2 gives a "symmetric" variant: REC3 and REC4 also require the
other part to lack the label; it gives axioms only, no closure figure,
and its principal property is stated "along the lines" of §5.1.2, with
no proof. Neither version refuses overlap: REC7 holds of every pair of
closed records, so `concat({a: 1}, {a: true}, γ)` is satisfiable. There
is no predicate for two parts being disjoint.

**Remark 5 and program 11.** Remark 5 says `typeof` "should also be
seen as parameterized in the record because the same label might
possibly have different types in different records". Program 11 is
kept for the reason that remark states: each concatenation result is
its own variable, and REC2 equates field types only within one
variable. No rule relates `γ1` to `γ2`.

**Trace** (Waxwing's `{ ...r, ...s }` read as `concat(ρr, ρs, γ)`,
`r lacks { l }` as `(ρr\l)`; that reading is itself an adaptation for
disjointness, see "Missing" below):

- **Program 3.** `join : concat(α, β, γ) ⇒ α → β → γ`. At `join({ name
  }, { age })` rule 10 gives `γ = { name, age }`. Accepted; swapped and
  regrouped likewise. Its overlap control (`join({ a }, { a })`) is
  accepted, not refused: no rule refuses overlap.
- **Program 4.** At the call, `γ := { admin: Bool }`, leaving
  `concat(α, β, { admin: Bool }) ∧ (β\admin)`. REC5 entails `(α ::
  {{admin : Bool}})`, by REC1 for the closed result. Fig. 5.2's rule 6
  needs `(γ :: {{admin : δ}})` in the closure as a constraint, and no
  rule of Fig. 5.2 puts the fields of a closed record there (rules 13
  and 16 need a kind on the variable side; rules 10-12, 15, 17-18 need
  closed parts). So the printed closure stops with the constraint
  unchanged, which is a solved form if it is satisfiable; it is (α =
  `{ admin }`, β = `{}`). Accepted; `α`'s field is entailed by the
  axioms, not produced by the printed closure, and `α = { admin: Bool
  }`, `β = {}` are not derived by either (a kind is a lower bound).
- **Program 4's negative control.** `concat(α, β, { admin: Bool }) ∧
  (α\admin) ∧ (β\admin)`: unsatisfiable by REC7 (the result's labels
  come from the parts). REC5 with rule 8 would give ⊥, but rule 6 does
  not fire, as above. Refused only by the satisfiability test the
  solved forms presuppose ("all satisfiable … constraints"), which §5.1.2
  does not give (it gives one for RECl, NP-complete, p. 129).
- **Program 5.** Unification makes `join`'s parts `restricted`'s
  parameters: `concat(α, β, { x: Int, y: Int }) ∧ (α\y) ∧ (β\x)`.
  REC5 and REC6 entail `α` has `x`, `β` has `y`; as in program 4 the
  printed rules 6-7 do not fire on a closed result. Satisfiable;
  accepted.
- **Program 6.** No signatures (below). The inferred scheme of
  `forwarded` is `join`'s, `concat(α, β, γ) ⇒ α → β → γ`.
- **Program 11.** `concat(α, { a: Int }, γ1) ∧ concat(α, { a: Bool },
  γ2) ∧ (α\a)` (or `extend_a`, §5.1.1). No rule relates `γ1` and `γ2`;
  accepted. Negative control: `α := { name: Text, a: Int }` with `(α\a)`
  gives ⊥ by rule 9; refused.

**Declared signatures.** Not provided. The thesis's programs "do not
contain type annotations" (p. 9; Odersky and Läufer 1996 cited for
them); Appendix A.3's rule for polymorphic recursion takes a written
scheme as a typing rule only. Entailment for RECc is defined by the
axioms; no decision procedure for it is given, and the thesis notes
that uniqueness of solved forms "requires a decidable entailment test"
(§4.2, p. 89). Program 6's check would need `concat(α, β, γ) ⊢e concat(α, β,
γ)`, which is trivial; a general check of declared clauses is not.

**Faithful, and what Waxwing would add.** A faithful HM(RECc) gives
exact records, independent field types per record (program 11), the
lacks deduction in its axioms, inference by closure and unification,
and acceptance of programs 3, 4 and 5 by satisfiability. Waxwing would
need, each named here and not designed:

| Missing for Waxwing | Status |
|---|---|
| refusing overlap: a disjointness constraint on two parts, or making `concat` disjoint | not in the thesis; disjointness constraints are published (Harper and Pierce, POPL 1991; Ur/Web's `[r ~ s]`, Chlipala 2010), not with this closure |
| a closure rule giving a closed record's fields (REC1) where rules 6-7 need them | not in Fig. 5.2; the axioms entail it; adding it is a change to the printed algorithm |
| a satisfiability test for RECc (refusing program 4's negative control) | presupposed by the solved forms, not given for RECc |
| A.2's closure algorithm and proof of principality | stated "along the lines of" §5.1.2, not given |
| checking declared signatures (entailment of RECc constraints) | not provided; decidability not stated |
| grounding parts for monomorphized Go (program 4's `α`, `β`) | not in the thesis; a kind is a lower bound, so a witness must be chosen; decision 3 |
| D1-D6 diagnostics from ⊥ or unsatisfiability | Waxwing's |

So the reviewer's lead is confirmed on its central point: the deduction
from `lacks` is published, in a system that keeps program 11. It is a
thesis, not peer-reviewed in this form; its symmetric variant is axioms
only; and what it does not supply is listed above.

**The conflict, stated on the programs.** Program 4's call supplies a
record where `{ ...r, ...s }` is expected and must decide, from `s lacks
{ admin }`, that `admin` is in `r`. In a system whose parts are type
variables (Waxwing, PureScript, Ur/Web), that is improvement from a
`lacks` fact, and Jones's framework (FPCA 1995 §4.1, read: "the
typing algorithm … might be parameterized by the choice of an improving
function"; its record example improves only two `has` predicates on one
field) leaves the improving function to the language: none of the
examined systems has one for merges. Simon avoids the decision by
sharing the parts' type term, which is what refuses program 11. Pottier
keeps program 11 by conditional constraints, but checks satisfiability
of constraints that run only from parts to result, under subtyping;
signature checking in that setting is published only without
concatenation (above). No examined system decides programs 4 and 5 while
keeping program 11 and checking declared signatures; Makholm and Wells
(§4.9) do not change that. Sulzmann's HM(RECc) (§4.10) changes the
first half: its axioms make the deduction from `lacks` and keep
program 11. It does not check declared signatures, refuse overlap, or
give the closure rule and satisfiability test that programs 4 and 5's
negative controls need; those are listed in §4.10, not supplied.

## 5. Programs 8 and 9

### 5.1 Program 8: local generalization

Probes (research/composition-assessment/ghc, GHC 9.4.8, `HasField`
standing in for row polymorphism; each helper used at two record types):

| Helper | GHC default | `-XMonoLocalBinds` |
|---|---|---|
| G1 closed: `getName p = getField @"name" p` | runs | runs |
| G2 captures a closed local constant | runs | runs |
| G3 uses another generalized local helper | runs | runs |
| G4 captures an enclosing parameter | runs | **refused** (second use mismatches) |
| G5 captures a local computed from a parameter | runs | **refused** |
| G6 = G4 with a signature on the helper | runs | runs |

Koka 3.2.3 (research/composition-assessment/koka/localgen*.kk): a local
`fun` that captures a parameter is generalized (prints `p:1 p:one`); a
local `val` bound to a lambda is not (refused at the second use).

GHC's rule (User's Guide, "Let-generalisation", read): a local binding
group is generalized if each of its free variables is closed (imported,
or let-bound with a closed signature or a fully generalized type); so
G2 and G3 generalize under MonoLocalBinds and G4, G5 do not. The reason
(Vytiniotis, Peyton Jones and Schrijvers, TLDI 2010 §2.2; OutsideIn(X)
§4.2, read) is local type assumptions: GADT matches, type families and
local constraints make generalizing an open local binding costly and
fragile. Waxwing has no construct that brings a type assumption into
scope locally (no GADTs, existentials or type families; `where` clauses
only on signatures, docs/language.md). So the proposal is the Damas-
Milner rule for let-bound lambdas, captures included (G1-G5 all
accepted), not MonoLocalBinds.

What is Waxwing's own policy, not GHC's: only a lambda (a value) is
generalized, as the value restriction does and as Koka's papers require
of generalized expressions (total, POPL 2017 §3.1); a generalized
local's effect row is generalized with it and opened where it is used,
as a declaration's is (ADR 010 opens a closed row at a declaration's
instantiation). Residual row constraints are generalized with the type
(qualified types; under 4.3, the projected flow). Lowering: a local used
at several types is specialized per use; one that captures locals needs
its captures as parameters (lambda lifting) before it can be
specialized like a declaration.

### 5.2 Program 9: which handler receives an operation

Probe: Koka 3.2.3 refuses program 9 as written ("effects do not match":
inferred `<users|e>`, expected `<users,database,log|_>`;
koka/repo.kk), as Waxwing does. Two spellings make it type; they mean
different things. Run in Koka (koka/layers.kk, masked-*.kk) and, for W,
in Waxwing (programs/p9-wide.wxw, p9-layers.wxw). The scenario
callback `busy` writes to `Log`, fetches from `Database`, then calls
`profile(7)`:

| Spelling | Program 9's `profile(7)`, one layer of each | `busy`, one layer of each | `busy`, two nested layers (inner and outer) of each |
|---|---|---|---|
| **W**: callback row widened to `Users + Database + Log + ...e`; no injection | runs, `User("Ada")` (Waxwing) | runs; every log and fetch goes to that layer | every operation, the callback's and the repository's, goes to the inner layer (Koka and Waxwing agree) |
| **M**: callback row `Users + ...e` as written; the wrapper writes `mask(Database, Log) { action(()) }` (Koka's `mask<l>`) | runs, `User(db-name-7)` | **refused** (Koka: "unhandled effect: database"): the callback's own Database and Log must come from a further, outer layer | the callback's operations go to the outer layer, the repository's to the inner (`[outer log] callback: …`, `[inner log] repository: …`) |

So W means "the callback shares the services the repository uses"; M
means "the callback's own services are separate from the repository's
dependencies, supplied further out". When the repository and the
callback should use the same service (one log), W gives it; M cannot,
by construction. Program 9's own callback uses only `Users`, so both
give the same result there.

Systems not run, from their papers: Biernacki et al.'s `lift` (Handle
with care, POPL 2018, Fig. 5) is M; Frank's adaptors are M (Convent et
al., JFP 2020 §3), and Frank's ports (callback abilities relative to the
ambient one, POPL 2017 §3.1) would accept the narrow row without writing
anything, with W's sharing;
Effekt's capabilities avoid the question (its documentation). The
reading of Frank's ports is an inference from §3.1 (adjustments are "the
difference between the ambient effects and the effects of the input"),
not a run. No system read inserts M's injection implicitly.

## 6. Program 7: overlap by chosen semigroups

Two separate capabilities. **Explicit dictionaries** need no classes: a
policy is an ordinary value (a record `{ combine: (Int, Int) -> Int }`,
or a function), and `{ port: last }` is a record of such values; classes
would add implicit selection and named instances, which the author left
open. **The typing of `mergeWith`** is what is missing: with the overlap
written as its own row `o`, the inputs `{ ...o, ...a }` and `{ ...o, ...b
}`, `o`, `a`, `b` pairwise disjoint and the result `{ ...o, ...a, ...b }`,
the policy record has `o`'s labels with each field's type `T` replaced
by a combiner of `T`. That is a type constructor mapped over a row's
fields: Ur/Web's `map` (Chlipala 2010) and Hubers and Morris's
row-indexed types (ICFP 2023, `rapply : Π(f ⇒ g) → Π f → Π g` and a
record of per-field dictionaries, §3.3; explicitly typed, no inference
algorithm). With it, `debug` is kept by construction, a whole-record
`last` is a different, ill-typed argument, and an `Int` field meeting a
`Text` field cannot be in `o` (one type per label). Under 4.3 the
overlap row is a flag pattern over the shared term, which leaves this
typing to be designed. A separate milestone.

## 7. Decisions for the author

The author's dispositions of 2026-10-20 (second review) are recorded;
what remains open:

1. **Records**: not Simon (it refuses program 11, which is to be kept),
   and no examined system resolves §4.8's conflict. The author's choice
   is among: requirements that keep program 11 and accept that 4 and 5
   need what no examined system provides (a published improving function
   for merges and `lacks` would have to be found, or one argued and
   approved as new under ADR 014); or a semantics with one type per field
   across joins (Simon; Makholm and Wells, §4.9), giving up program 11;
   or a satisfiability-only reading under subtyping (Pottier), changing
   what a record type means, with signatures checked, if at all, by a
   sound and incomplete comparison published only without concatenation
   (§4.8). Sulzmann's HM(RECc) (§4.10) is now a fourth candidate: it
   has the deduction and keeps program 11, with seven obligations
   listed there (disjointness, a closure rule, satisfiability, A.2's
   algorithm, signature entailment, grounding, diagnostics), some
   published elsewhere and some not. Whether a
   current SMT theory of algebraic datatypes supplies the conditional
   unification Simon's §5 lacked in 2014 stays unexamined; the bounded
   pass stops at these candidates.
2. **Fast paths**: deferred until a foundation is chosen; equivalence to
   it must be established.
3. **Undetermined splits**: a system that keeps the alternatives without
   choosing one could be acceptable; whether they may stay unresolved
   through compilation follows from the chosen system's account.
4. **Program 8**: captures allowed (approved experience). The plan must
   cite the precise published rules: ordinary let-polymorphism, which
   does not generalize variables free in the enclosing environment
   (Damas and Milner), with an established treatment of effects (the
   value restriction; Koka's generalization of total expressions). GHC's
   default accepts all of G1-G6 (§5.1).
5. **Program 9**: W, sharing the surrounding services, as the baseline;
   M stays an explicit, deliberate isolation. W's wider callback row is a
   concrete spelling under review, not yet the best surface.
6. **Program 7**: a separate milestone: dictionaries are values; generic
   row mapping needs its own established typing.
7. **Task 7**: semantic expansion paused; the checkpoint
   (`r005b-task7-wip`) and its lowering defect stay recorded.

## 8. Evidence and limits

- Probes run: Waxwing (checkpoint build) on every program variant;
  PureScript 0.15.16 on programs 4-6 and 11; Koka 3.2.3 on program 9's
  spellings and local generalization; GHC 9.4.8 on G1-G6; Ur/Web
  20200209 on programs 3-6 and 11; Wallace's toy on program 11 and
  encodings of program 4's facts. Each is in research/composition-
  assessment with its command. Ur/Web and OCaml were installed with
  Homebrew for this (bottles; Homebrew's automatic cleanup ran with the
  install).
- Reading only: Simon's algorithm (not run; his implementation has no
  concatenation), Rose, Flix's Boolean unification, Frank, Effekt,
  Biernacki et al., and Pottier's treatment of programs 4 and 5 (the toy
  cannot state them). No candidate was implemented; 4.3's outcomes on
  programs 4 and 5 follow from the formulas, not from a run.
- Sources and what could not be accessed: the README there.
