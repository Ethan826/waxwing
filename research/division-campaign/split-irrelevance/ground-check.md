# Per-specialization ground checking: an investigation (Stream 8)

Date: 2026-10-21. Base: 77e0fa3 (dossier §18.17, item 5: "investigate,
do not adopt"). No compiler change; no recommendation to adopt. Status
labels as in statements.md.

**Corrected in place on 2026-10-21** after the independent review of
streams 5 and 8 (research/division-campaign/reviews/streams-5-8-review.md,
dossier §18.23) and the author's decisions (§18.24). Corrections are
marked inline and listed at the end; the earlier version is in Git
history. Kinds of evidence are kept apart as in statements.md:
check-time refusal, specialization-time refusal, reference-model
behaviour, and observed generated-code behaviour (none here: no
several-tail Go exists).

## 1. The idea

At each specialized copy, check that the concrete bindings satisfy the
recorded body constraints. At a key every rigid row and type variable
is ground (split-selection.md §1), and every flexible variable is
either a witness evaluated at the key or a default (`Int`, `{}`). The
recorded problem then becomes a closed one: evaluate each atom of `D`
and `B` at one assignment. No solver and no quantifier. In the Lean
model this is `Sat θ C` at one concrete `θ`, the definition itself,
not a theorem.

Two placements, which check different things:

- **At a call edge** (the callee's interface at the instantiation):
  `Sat (wit k θ) (D g)`, plus any requirement atoms of `g`'s interface.
  This is clause (ii) of statements.md's `Covers`, at one key: the
  split chosen for this call is valid at this key.
- **At a copy** (the copy's own body at its key): `Sat (combine θ σ) B`,
  where `σ` is the checker's solution for the body's flexible variables
  lowered at the key. This is the ground instance of signature validity
  (`ValidFin`, Sig/Finite.lean) at one `θ`.

## 2. Where it would sit (read-only map)

| Step | File:line | What is there now | What a ground check needs |
|---|---|---|---|
| a call's key is computed | src/Features/Specialize/Values.purs:44-51 (`callee`), instantiation lowered at :82-94 (`instantiated`) | `instantiated scope span sorts instantiation >>= called scope.env span id` | between the two: the callee's clauses at the lowered arguments (call-edge placement) |
| a key is looked up or created | src/Features/Specialize/Keys.purs:60-70 (`called`), :146-154 (`claim`, the key limit) | memo table of keys | nothing; the check belongs before, once per (call, key) or once per key |
| a copy is filled | src/Features/Specialize/Body.purs:30-41 (`fillFunction`) | parameters, result and body copied at `work.arguments` | the copy's recorded `B` at its key (copy placement) |
| calls and bare references inside a body | src/Features/Specialize/Body.purs:69 (calls), :83-84 (`FunctionRef`), both through `callee` | each call's key | as the first row |
| a record type at a key | src/Features/Specialize/Record.purs:53-59 (`singleTail`) | E_INTERNAL `Duplicate record label` when a written label is also in the tail's image | already a ground `lacks` check, for one atom kind, as an internal error |
| print sites at ground types | src/Features/Specialize.purs:95 → src/Features/Specialize/Printable.purs:55-63, :99-104 | E_TYPE `Expected a printable value` | already a ground requirement check, as a **user** error (E2's source) |
| the checked declaration | src/Domain/Checked/Internal.purs:45-54 (`FunctionDecl`) | no clauses, no recorded `B` | a slot for `D` and the recorded `B` (or a per-call list of instantiated callee clauses) |

Prerequisites, none present: the constraint recorder (recon.md: no
explicit `B` is built today), a place for `D` and `B` in the checked
IR, Task 8's several-tail lowering (Record.purs:39, the placeholder),
and an evaluation of term witnesses at a key (split-selection.md §2.3).

## 3. What it catches

- **Witness and lowering defects at reached keys.** A witness that the
  checker or an untrusted search produced but which fails `B` or the
  callee's `D` at a key that the program actually reaches; a lowering
  that evaluates a correct witness wrongly (a set term computed on the
  wrong labels, a field type copied from the wrong row). Today a
  repeated label is already refused with E_INTERNAL (Record.purs:58), a
  specialization-time refusal. Any other such defect is not caught by
  the specializer; it may give a wrong layout, or Go that does not
  compile (a type mismatch at a call boundary fails `go build`)
  (corrected 2026-10-21, dossier §18.23 F10). Where the defect shows in
  the bindings the check evaluates, it turns into E_INTERNAL at a source
  span too.
- **Mismatch between what the checker solved and what the specializer
  lowers**: the default holes (`Int`, `{}`, ADR 007, ADR 013) where a
  constrained row was left undetermined (recon.md: lowering fills
  `route`'s `u` with `{}`, which breaks `B`). The check would fire at
  the first key where the default violates a recorded atom.
- **Requirement atoms, if recorded.** With `Pr` (printability) in the
  recorded constraints it subsumes `checkSites`. As an *internal*
  check, it would then report only checker defects.

## 4. Cost (derived; not measured)

Per (call, key): `|D g|` atoms. Per copy: `|B f|` atoms. At a key all
types are hash-consed numbers and layouts are interned with fields
sorted by label (Specialize/Layouts.purs:42, `internLayout`). Interning
is not constant time: `internLayout` sorts a record's fields
(`sortFields`) and looks them up in a `Map` keyed by field arrays, so a
record node with `k` fields costs O(k log k + k log L), with `L` the
layouts interned so far (corrected 2026-10-21, dossier §18.23 F9).
Then:

- an equation is a comparison of two interned numbers after lowering
  both sides, which specialization lowers anyway: O(size of the two
  type expressions);
- `lacks r l` is a lookup in a sorted layout: O(log |r|);
- `disjoint r s` is a merge of two sorted label arrays: O(|r| + |s|);
- a requirement `Pr(τ)` is `groundPrintable`, as today.

What the cost is linear in (corrected 2026-10-21, dossier §18.23 F9):
per key, it is linear in the total size of the atoms' ground images at
that key, meaning the rows after each tail is flattened into its label
set (`singleTail` splices each tail's layout fields) and nested records
are lowered, up to the log factor of interning. Summed over the keys
the program reaches, it is linear in the size of the specialized
program's lowered types, not in source size. The number of keys can be
exponential in source size; it is bounded only by the key limit
(10,000 today). Not measured. Memory: `D`
and `B` stay in the checked IR for the specializer's lifetime. Keys are
unchanged (the check reads them only). Measuring needs the recorder;
recon.md's size measurements (`|R|`, `|L|`) bound the atom counts.

## 5. What it cannot establish

1. **It cannot replace the universally quantified signature proof.** It
   checks the keys this program reaches, not every `θ ⊨ D`. A signature
   that is invalid (`bad`: `{ ...a, ...b }` without `a disjoint b`,
   dossier §17.2) passes at every key of a program whose callers happen
   to pass disjoint rows, and fails only when a later caller does not.
   The diagnostic then lands at a key deep in the call graph, blaming
   the caller's choice, not the signature. Signature validity
   (`checkAll_validFin`, Sig/Patterns.lean:131) is a statement about all
   keys; the ground check is a statement about one.
2. **It cannot show that the recorder captured every relevant
   constraint.** It evaluates the atoms it is given. An unrecorded
   requirement passes. E2 is the instance: before printability is
   counted, every ground check of `divide`'s `D` passes under both
   splits, and the refusal (a specialization-time refusal) comes from a
   check that was never part of the constraints (statements.md §1).
   Completeness of the recorder is a claim about the
   source-to-constraint translation (Stream 5), which no check on the
   output can establish.
3. **It does not make acceptance split-independent.** If a ground check
   refuses with a *user* error, acceptance becomes a property of the
   keys a particular split reaches: the template model M0 of
   statements.md, under which E2 is refused or accepted by the split.
   It is safe for split irrelevance only as an internal assertion that
   never fires when the model is complete (`Covers`). Under `Covers`,
   `req_of_covers` (statements.md §4) gives every call edge reached from
   a declaration and key whose interface holds its callee's interface
   (corrected 2026-10-21, dossier §18.23 F7: edges reached from a root
   whose own interface fails are not covered); when interfaces include
   the callee's
   clauses (`Req₀`, `Req₁`), the call-edge check of `D` holds there, so
   a firing call-edge check is evidence of a defect in the checker,
   the recorder or the lowering, never a user error. The copy-placement
   check of `B` is not covered by any theorem here (`B` is not in the
   model).
4. **It does not certify uniformity.** A witness that happens to work at
   every reached key may still not be a uniform witness (dossier §18.6,
   D2's per-assignment versus uniform distinction). Lowering does not
   need uniformity; signature validity does.
5. **It says nothing about keys not reached**, including keys a
   separately compiled module would reach (ADR 002's reserved boxed
   backend); there is no whole program to enumerate.

## 6. Relation to the Lean certificate checker (trust boundary)

| | Certificate gate (§15, `checkAll`) | Ground check |
|---|---|---|
| Claim | `checkAll P T = true → ValidFin P`: for every finite `θ ⊨ D` a witness exists (proved, Sig/Patterns.lean:131) | `Sat θ C` at one concrete `θ` |
| Quantifier | all keys | reached keys |
| What Lean gives | the theorem, for the Lean function | nothing beyond the definition of `Sat`; the property is closed and needs no proof |
| What the compiler would run | a PureScript port of `checkAll` | a PureScript evaluator of atoms on layouts |
| Trust in the running code | evidence only: differential tests against Lean; the port does not inherit Lean's theorem (§18.17, item 6) | the same: the evaluator, the lowering of ground types and the recorder are trusted, unproved |
| Shared unverified link | the recorder and the source-to-constraint translation | the same |
| Gap it narrows | none at keys: it is about the abstract problem | whether the bindings the specializer computed at each reached key satisfy the recorded constraints. Whether lowering and Go emission implement those bindings is not checked; that needs a separate argument or test (A-go, Task 8). (Lean's `interp` is `noncomputable`; recon.md lists a computable `interp` as a new obligation.) (corrected 2026-10-21, dossier §18.23 F8) |

The two are complementary: the gate establishes validity for all keys
of the recorded problem; the ground check checks, at the keys used,
that the bindings the specializer computed satisfy the same recorded
problem. It is evidence about the bindings, not about the layouts or
the Go built from them. It reads those bindings from the same lowering
it would check, and does not inspect Go structs, field order, the
conversion at a call boundary, or whether the value passed has the
layout the copy expects (Task 8's layout identity); a defect shared by
the lowering and the check's own evaluation of types passes unseen
(corrected 2026-10-21, dossier §18.23 F8; the earlier wording said it
closes the gap to the layouts lowered). Neither establishes that the
recorded problem is the program's whole set of requirements. That is
the recorder's completeness, the hypothesis `Covers` names in
statements.md, and it remains a separate, stated assumption.

## 7. Findings for the author

- A ground check exists today for one atom kind (`lacks`, Record.purs:58,
  internal) and for one requirement kind (printability, user-facing,
  Specialize.purs:95); both are specialization-time refusals. The
  second is the source of E2. Printability and comparability at
  caller-side sites are judged earlier, at check time, on the
  instantiated type (statements.md §1.3). Investigating
  the idea therefore also asks whether `checkSites` should stay a user
  error once printability is counted in the model (it would then be
  redundant as a user check and useful as an internal one).
- A ground check needs no solver. Its cost, derived and not measured,
  is linear in the size of the specialized program's lowered types (per
  key, the atoms' ground images after flattening tails and lowering
  nested records), up to a log factor from interning; the number of
  keys can be exponential in source size, bounded only by the key limit
  (§4; corrected 2026-10-21, dossier §18.23 F9). It needs the recorder
  and an IR slot first; it cannot be added before them.
- It is translation validation of the bindings at reached keys: it
  checks concrete bindings against the recorded constraints, and does
  not prove that lowering or Go emission implements them (corrected
  2026-10-21, dossier §18.23 F8). It does not replace the signature
  proof, it does not establish recorder completeness, and, as a
  user-facing refusal, it would make acceptance depend on the split.

## Corrections

Corrected in place on 2026-10-21 after the review in
research/division-campaign/reviews/streams-5-8-review.md (dossier
§18.23), following the author's decisions (§18.24).

- **F8** (§6 table and paragraph, §7): "closes the gap" to the layouts
  lowered is replaced. The check compares concrete bindings with the
  recorded constraints; it does not prove that lowering or Go emission
  implements them.
- **F9** (§4, §7): "linear" now says in what: the lowered ground images
  per key (tails flattened, nested records lowered), up to a log factor
  from interning, summed over keys whose number is bounded only by the
  key limit.
- **F10** (§3): other lowering defects may give a wrong layout or Go
  that fails `go build`, not only a silently wrong layout.
- **F7** (§5.3): `req_of_covers` covers call edges reached from a
  declaration and key whose interface holds.
- **Kinds of evidence** (head, §3, §5.2, §7): refusals are labelled
  check-time or specialization-time; no generated-code behaviour was
  observed.
