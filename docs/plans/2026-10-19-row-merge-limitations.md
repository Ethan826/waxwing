# Open-row merge: two limitations of the adopted design (for decision)

Status: decided by the user, 2026-10-19 (plan §10 decision 17). Option
A (case 2g) is approved and implemented within B3, with one amendment
found while implementing it (below); option C (keep O4's limitation) is
approved; option D is a requirement for B5 whose exact wording comes
back for approval. Until this decision the probes were pinned as waiting
(test/r005b-limitations.test.mjs); what purs 0.15.16 does with the same
shapes is recorded in research/purs-given-1g (`node run.mjs`, the last
four cases).

## The decision

- **2g** restores ordinary forwarding and recursion: it subtracts a
  known symbolic subrow from a known symbolic result. Its boundaries:
  the right part and the result hold no unresolved row meta after
  following bindings; every label and rigid tail of the right part
  occurs explicitly in the result; shared fields' types are unified;
  rigid tails are cancelled by identity, never inspected, split or
  inferred from what they might contain; Sym applies it with the inputs
  exchanged. It is recorded as another explicit adaptation (rules file
  §3a), not as PureScript's given matching, and it introduces no
  improvement between predicates.
- **The amendment** (user, 2026-10-19). As proposed, a missing atom left
  the predicate waiting. Implementing it showed that this pre-empts case
  3: `Merge R {a | u} {c}`'s mirror meets 2g's preconditions, R is
  missing from `{ c }`, and waiting there kept case 3 from moving `a`
  into `{ c }` and refusing. A problem refused in every order at B3 then
  waited in some orders (generated family "program-shaped, shared", seed
  25: judge `orderDiff` 1; in the prototype before H, `kindDiff` 4 in
  each of two shaped families, hidden by H). Amended: 2g applies only
  when the result holds every atom of the right part; otherwise it makes
  no claim, and checking continues to case 3 or waiting. Case 2 keeps
  PureScript's behaviour. The missing-atom test restricts where 2g
  applies; it never suppresses a rule that can establish a
  contradiction.
- **O4 stays unresolved**, an accepted expressiveness limitation of this
  tranche. A caller cannot repair it with the annotation syntax Waxwing
  has: the row arguments belong to the call's instantiation, and only
  lambda parameters can be annotated. Writing the callee's signature
  differently (`{ admin: Bool, ...r }`) is a possible redesign, and a
  library's caller does not necessarily control it.
- **B5's hints** must be told apart: offer a lambda annotation where one
  can resolve the constraint; for rows of a call's own instantiation,
  explain the limitation and suggest no annotation that cannot help.
  The exact wording comes back for approval; no new diagnostic text is
  approved by this decision.

## What B3 showed

Two kinds of valid program wait to the end of the body (placeholder P5
today, Unresolved from B4), and neither is the cost the plan described
earlier ("annotate a lambda's parameter").

1. **A wanted merge whose left part and result are known rigid rows.** A
   generic function whose result names a variable that no parameter
   fixes, calling itself or forwarded to by a wrapper, makes `Merge U ?v
   { ...U, ...V }`. Its only solution is `?v = V`, but no case applies:
   case 2 and its mirror need the result *closed*, and a rigid tail is
   not.
2. **O4.** `granted2({ admin: false })` with `granted2(p: { ...r, ...s })
   where s lacks { admin }` makes `Merge ?r ?s { admin }`. Its only
   solution puts `admin` in `r`, but only the `lacks` fact says so.

## Probes

| Program | Waxwing at B3 | with 2g | purs 0.15.16 | Can the caller repair it? |
|---|---|---|---|---|
| `fn both(x: { ...u }): { ...u, ...v } = both(x);` | waits at `both(x)` | accepted | accepted (the given `Union u v uv` solves the wanted by union, left -> right) | no: `?v` is the call's own instantiation |
| nonrecursive wrapper: `fn fwd(x: { ...a }, k: …): { ...a, ...b } = both(x, k);` with `both(x: { ...u }, k: ({ ...u }) -> { ...u, ...v }): { ...u, ...v } = k(x)` | waits at `both(x, k)`; `both` alone is accepted | accepted | accepted | no, as above |
| through a lambda: `{ let f = fn(y) => h(pickR(x, y)); 0 }` with `h: ({ ...a, ...b }) -> Int` | waits at `pickR(x, y)` | accepted, annotated or not | accepted | yes: `fn(y: { ...b })` is accepted |
| control: `fn fwd(x: { ...a }, y: { ...b }): { ...a, ...b } = pickR(x, y);` | accepted (1g) | accepted (1g) | accepted | — |
| O4 | waits at the call | waits at the call | rejected (`NoInstanceFound`) | no |

## Where each limitation comes from

- **The self-call and the forwarding wrapper** come from both causes
  the user named. Waxwing has no entailment from the signature's own
  merged rows: purs matches the wanted `Union` against the given one by
  a functional dependency and Waxwing does not. And the row argument is
  inaccessible: `?v` belongs to the call, and Waxwing annotates only
  lambda parameters, so nothing written at the call names it.
- **The lambda wrapper** comes from the missing entailment alone. The
  unknown part is a lambda's parameter, and annotating it repairs the
  program, so this is the kind of cost the plan already listed.
- **O4** is not a matter of entailment. purs rejects it too: nothing
  given decides the split. The row arguments are inaccessible, and what
  would decide the split is a rule that moves a label to the only part
  allowed to hold it. That was Task 4's commit, which the adopted design
  removed (B2). PureScript has no such rule either.

## Options

### A. Case 2g, for the first limitation

Case 2 with rigid tails, as 1g is case 1 with them. For `Merge l r t`:
when neither the right part nor the result holds an unknown (fields and
rigid tails only), and the result holds every atom of the right part,
then `l := t` less those atoms (labels by name, rigid tails), with the
shared fields' types unified. When the result lacks one of them it
waits, as case 2 does (superseded by the amendment: it makes no claim).
Sym gives the mirror. The justification is 1g's, read the other way:
with no unknown in the right part and the result, disjoint union
cancels, so the left part has exactly one value, and taking it keeps
every solution. It agrees with purs's given matching on every probe
above; like 1g, it is broader (it needs no given in a particular
orientation).

- Evidence as proposed (`node qt-2g.mjs 2000`, research only): with 2g
  added to the adopted configuration, no S, L or H violation and no
  order or mirror difference on the raw, dense and shaped families
  (2,000 problems each) and domain B whole. The only verdict changes
  were waiting → accepted: the two self-call shapes in every order, and
  2 of 4,000 shaped runs. O4 is unaffected. **Correction** (2026-10-19,
  implementing it): that run had H at the end of every body and only one
  shaped seed, and H hid the order differences the proposed form makes
  before H (the amendment above). The amended form, run with and without
  H on two shaped seeds as well, has none; its verdict changes are
  waiting → accepted and waiting → refused (rules file §3a).
- Cost: about 20 lines in Check/RowMerge/Cases (case 2's closed test
  becomes "no unknown", with rigid subtraction), the reference
  configuration in the tests, a regression row, and B3's evidence run
  again. A local adaptation, like Sym and 1g, so it needs approval
  (ADR 014).
- Matching wanted predicates against the signature's givens, as purs
  does, would also work. It needs the signature's merged rows made into
  given predicates and a matcher by dependency; it is larger,
  and 2g already covers these probes.

### B. Keep the first limitation

Then B5's D4 for it must not suggest
an annotation where none can help (below).

### C. Keep O4's limitation

No rule within the adopted design
decides it, and adding the commit back would reverse the B2 decision.
Two changes outside this tranche would help: explicit instantiation
syntax at a call (a language feature), or the author writing the
callee's signature differently (`{ admin: Bool, ...r }`).

### D. The D4 text, in B5, whichever of A to C is chosen

The approved D4
hint "pass a lambda with annotated parameters in place of merge" is
right only when a waiting predicate's unknown parts come from a lambda's
parameters or a function value passed as an argument. When they are a
call's own instantiation (the self-call, the wrapper without 2g, O4), no
annotation helps, and the text must say what can: changing the callee's
signature. B5 would derive and pin that text, for approval.

## Recommendation (as proposed; decided above)

A (2g) for the first limitation, if the user accepts one more local
adaptation of the same kind as 1g; otherwise B. C for O4. D in either
case.

## Usability, as far as it is known

The adopted design accepts far fewer of the research problems than B2's
one-tail rules did (domain B: 8,352 accepted runs at B3 against 109,384
at B2). Those are constraint problems built to stress the solver, not a
sample of programs, and the reference prototype agrees with every B3
verdict, so the figure shows the policy's reach on those problems, not
how often users would meet it. No corpus of real Waxwing programs that
merge records exists to measure that.
