# G-effect-rows: what the builder, checker and lowering read (2026-10-24)

The author asked (dossier §18.73) for an audit of what the builder,
today's checker and lowering actually read of effect information,
before any representation is proposed. An independent agent (Opus,
read-only, no builds or runs) produced it at r0-t2-d1 2a94b33; the
controller re-read four of its load-bearing citations (Strip before
Specialize, Outcomes.purs `stripProgram`; Seeds.purs `monomorphic`
reading the signature row's arguments; Generate/Control.purs translating
an annotation `Rigidly`; Check/Lambda.purs `annotationRow`) and they
hold. Every "unobservable" or "behaviour" verdict below is **argued**
from code paths; no fixture was run. Nothing here is decided.

Kinds: (1) arrow rows, nested included; (2) data-type row arguments;
(3) handler label, mark, inference row and clause row; (4) the
declaration's own row; (5) effect-row variables and holes. Option c's
effect: B behaviour, K key or name only, U unobservable, N/A untouched.

## 1. The builder (`build`, generation)

| # | Site | Kind | What it does | Option c |
|---|---|---|---|---|
| A1 | Generate/Elab/Internal.purs:183-209 `elabTy` | 1,2,3 | Rebuilds arrow rows, data row arguments, handler label and rows from generator types | Carries what the generator wrote (A6-A12) |
| A2 | Elab/Internal.purs:173-177 `readEffect` | 5 | A handle in an effect-row tail is an `EffectRowSort` use: seal check `SortClash` | No effect-row variable can be read |
| A3 | Elab/Internal.purs:151-166 `readAs` | 5 | `EffectRowSort` refused; images through `imageType` | as A2 |
| A4 | Generate/Elab/Image.purs:55-66 | 1,2,3 | Image arrows `closedRow`; `TData o args []`; handler `Label e args Unmarked`, `{closedRow, Nothing}` | Option c's loss; handler effect and arguments kept |
| A5 | Elab/Internal.purs:232-236 `elabLabel` | 3 | Keeps the generator's (written) mark | Written marks, not today's |
| A6 | Generate/Translate.purs:105-110 `rowOf` | 1,2,3,5 | `Rigidly` keeps the declared row; `Instantiated` gives `closedRow`; data row count kept | Generator data types have k closed rows, images 0: one built body can disagree with itself |
| A7 | Generate/Node.purs:62-66 `arrowOf` | 1 | Every generated arrow `closedRow` (lambdas, partial calls, operation references) | Inferred rows lost |
| A8 | Generate/Call.purs:180-187 `saturated` | 1 | Over-application's intermediate arrow built `closedRow`, no witness read | Inferred stage rows lost |
| A9 | Generate/Builtin.purs:59, 150-152 | 1 | `print` `Console NoFail`; `show`, `crash` `closedRow` (today fresh rows) | Inferred rows lost |
| A10 | Generate/Effect.purs:154-156 | 3 | Handler literal `Label e slots mark`, `{closedRow, Nothing}` (today inference and clause rows, Check/Clauses.purs:73-74) | Both rows lost |
| A11 | Generate/Control.purs:149-151 | 1 | An annotated lambda parameter is translated `Rigidly`, so the signature's ambient row variable stays a rigid tail; today `annotationRow` (Check/Lambda.purs:82-84) replaces it with the lambda's row | **A wrong rigid name, not an empty row**: a fourth departure the option-c note did not list |
| A12 | Generate/Body.purs:51-70 | 4 | Parameters, result and written row copied from the declaration; `main`'s tail dropped (today a hole resolved by `resolvedRow`) | Decl row kept except `main`'s tail; whether today's `main` row has inferred labels: unknown |
| A13 | Generate/Signature.purs:93-97; Facts.purs:72-80 | 4 | Reads the declared row's label arguments for record facts (Sig6) | N/A |
| A14 | Check/Holes.purs:47-67 `foldHoles` | 5 | One hole numbering over type holes, row-tail holes and row-label argument holes | Without row holes, type-hole numbers can differ; T2 renumbers |

## 2. Today's checker, after inference

| # | Site | Kind | Use | Option c |
|---|---|---|---|---|
| B1 | Check/Strip.purs:8-31 (Outcomes.purs:88) | 3,4 | Before specialization every mark becomes `Unmarked` and every clause row `Nothing` | U for marks and clauses: option c's image form is today's post-strip form; only the handler's inference row differs |
| B2 | Check/Instantiation.purs:60-73; NestedArguments.purs:46-90 | 1,2,5 | RowSort slots dropped; `children` excludes rows | U |
| B3 | Check/Nested.purs:39-55, 104-113 | 2,3 | Reads declaration tables, not build output | N/A |
| B4 | Check/Coverage.purs:121-128; Spelling.purs:28-45; Substitute.purs:15-42 | 1,2,3 | Rows affect only set dedup; spelling and substitution ignore or drop rows | U |
| B5 | Every effect refusal (findings, "Effect and coverage audit") | all | Read the solver state during or just after inference, never the checked IR | N/A for build; this is the validation r0-erased-rows §7.1 item 2 requires, independent of the witness |
| B6 | Strategy/ReadBack/Type.purs:52-70 | 1,2,3 | The read-back erases rows | E-a needs a read-back of rows |
| B7 | Strategy/HoleContract.purs:76-84 | 5 | `Free` images for SortType and SortRow only | No effect-row sort |

## 3. Lowering

| # | Site | Kind | Use | Option c |
|---|---|---|---|---|
| C1 | Specialize/Lower.purs:45-63 `lowerType` | 1,2,3,5 | Data rows ignored; arrows through `spine`, rows dropped; a handler reads its label's effect and arguments; holes to the representative; hole tails to none | U; the handler effect and arguments are kept |
| C2 | Lower.purs:146-199 | 1,2 | Fields and operations from tables; RowSort slots skipped | N/A |
| C3 | Specialize/Seeds.purs:76-83 `monomorphic` | 4 (1, 2 inside) | A type variable occurring only in the signature row's label arguments decides seeding | The one behaviour-relevant row read; N/A under option c because build copies the signature; B if signatures came from erased images |
| C4 | Specialize/Values.purs:83-100; Generate/Fresh.purs:44-79 | 5 | Instantiations hold no effect-row slot | U |
| C5 | Specialize/Handlers.purs:100-108; Effects.purs:23-39 | 3 | Effect layout key: effect and type-sorted label arguments | U for rows; depends on type-sorted values (below) |
| C6 | Handlers.purs:95-98, 110-116 | 3 | Fail family from the payload's type head | U |
| C7 | Specialize/Ground.purs; Specialize.purs:34-41; Intern.purs:49-69 | 1,2,3 | Ground keys rowless; arrows interned by parameter and result | U |
| C8 | Domain/IR/Internal.purs:20-28 | all | The IR has no row | U |
| C9 | Format.Go (Context, Handle, Families, Effect) | 3 | Runtime lookup by effect id; type assertion to a layout | U for rows |
| C10 | Specialize/Printable.purs:74-103 | 1 | Judges rowless ground IR | U |

## 4. Summary (argued)

Lowering and the post-inference passes read effect information only in
type-sorted form: operation and handler instantiations, a handler
type's label effect and arguments, Fail payload types, and the declared
signature's row label arguments (C3). Option c keeps the first three
(RTExpr holds them), and build copies the signature, so lowering's
reads are not affected. After Strip, marks and clause rows reach no
consumer.

Option c does lose information in the checked IR itself (A4, A6-A12):
inferred arrow rows, nested rows in images, data row arguments (with
inconsistent counts, A6 against A4), handler inference and clause rows,
`main`'s tail, the annotation's ambient tail (A11, a wrong name), and
the shared hole numbering. T2 and T8 cannot see this; a witness-based
effect validator (§7.1 item 2) and Task 4.6's "equality, effect rows
included" would.

The author's warning holds: lowering erasing rows does not make them
irrelevant to it. The type-sorted values lowering reads can be fixed by
rows: in `fn f(g: Unit -> Unit with State(a)): Unit with State(a)`, the
value of `a` at a call fixes f's specialization key and its effect
layout key (C5), and a wrong value would assert the wrong layout at
run time (C9; argued, not run). Rows feed lowering through obligations,
which is §7.1 item 2's validation.

## 5. Proposal (a recommendation, not a decision): "a-min"

Option (a) of r0-ea-representation.md, pinned down in three ways.

1. Images are `Inline (Ty Var)` over the existing Domain.Type and
   Domain.Row, mark-stripped (every label `Unmarked`, clauses
   `Nothing`; precedent Type/Marks.purs `stripMarks` and P4), keeping
   data row arguments at the declared count, arrow rows at every stage
   and the handler inference row; row tails are a rigid variable, a
   hole or an `EffectRowSort` problem variable.
2. G0 judges a projection `erase image : RTExpr` (T-R0b §2.2's
   translation; precedent ReadBack.Type `readType`), so RTExpr, G0,
   the atoms and the Lean vocabulary stay as they are.
3. A binding for effect-row variables, `InlineRow (TyRow Var)`, with
   `Free n` in the shared hole numbering, and a new sort
   `SortEffectRow` (`UseSort.EffectRowSort` exists); names as
   r0-erased-rows §6.
4. Build: `imageType` becomes a renaming; `readEffect` reads the new
   binding; the generator sites A6-A12 take handles instead of
   `closedRow` (including A11's ambient tail and `main`'s tail).
5. T2 compares the post-Strip program, rows included.

Why smallest (argued): nested rows live only inside images, so the
image type needs row positions at every arrow, data and handler node,
which is `Ty Var` without marks; (b) keeps no nested rows or data row
arguments, and position-addressed overlays would be new machinery;
marks and clause rows can be dropped because no consumer after Strip
reads them (if post-Strip is the target, question 1).

Sources: rows with scoped labels (Leijen, TFP 2005; Koka, as FX001
adopted); the witness as a many-sorted solved substitution (Pottier,
ICFP 2014, D1's source; W §1.6's row bindings); effect erasure as in
type-and-effect systems (Lucassen and Gifford 1988; Talpin and
Jouvelot 1992); mark normalisation as Strip.purs.

Novel, for explicit approval: (i) the check "an image is mark-stripped
and its `erase` is what G0 judged"; (ii) which projection becomes the
trusted `erase` (readType and Generate.Elab.Recorded are kept
independent so RT8 catches a disagreement); (iii) new role names and
slots §2.1 lacks (`main`'s tail, A8's stages, possibly A11); (iv) the
hole-contract argument below.

Costs: the canonical encoding changes for every image and the new
binding; the hole contract can stay as it is if it judges
`erase(image)` (argued: under E-a no atom mentions an effect-row
variable, so effect-row `Free` always passes, which rests on there
being no atoms, not on lowering); Cov's domain grows by every
`EffectRowSort` slot, so a strategy binding them all `Free` passes Cov
with no assurance and `EffectsUnchecked` must catch it; RT8 and window
rows may move; T2's scope becomes the full post-Strip IR for the online
witness, which needs a read-back of rows (B6).

Claims needing adversarial review before approval: lowering reads no
effect-row value from the checked IR; no consumer after Strip reads
marks or clause rows; a-min is minimal; the hole contract is unchanged
for effect-row holes; `erase` leaves G0's verdicts unchanged; the E-a
slot list is complete. Proposed fixtures (not run): F1 a corpus
differential of Go output with every body row erased, with a mutant
that makes lowering read a row; F2 a positive control for C3; F3 the
obligation program above with a forced wrong `a`; F4 data row
arguments `[]` against k closed rows give identical Go.

## 6. Questions for the author

1. Is the fidelity target the post-Strip program lowering receives, or
   the pre-Strip per-declaration IR (which holds marks and clause rows,
   and would need a mark-variable sort)?
2. Does "handler marks" mean the `Mark` (always `Unmarked` after Strip)
   or the handler label's effect and arguments (already kept)?
3. Should E-a add slots for `main`'s tail, A8's over-application stages
   and A11's ambient tail?
4. Which projection becomes G0's trusted `erase`?
5. May a non-effect strategy bind `EffectRowSort` variables `Free`, or
   must Cov or `EffectsUnchecked` refuse it?
6. Is a moved RT8 or window row acceptable under (a)?
7. Should two option-c defects be fixed now, shadow only: A11's wrong
   rigid tail and A6 against A4's data row counts (BACKLOG R031)?

Not checked by the audit: Format.Go line by line; Generate/Elab.purs
`positionsOf`, Gen.purs, Static/*; Specialize Keys, State, Layouts,
Record and Copy in full; the T2 harness beyond r0-elab-erase.mjs; RT8
and window machinery; whether today's `main` row has inferred labels;
Resolve's lambda-annotation path; payload translation under `Rigidly`.
