# The read-back's repeated walks, on the path that validates (2026-11-08)

Status: investigation (dossier §18.162). Nothing here is landed or
approved. No budget is proposed. These are attribution samples, not the
performance protocol's run.

## Question

The cost proposal (2026-11-04) recommended index-first lookup from a
`lazy` Proxy experiment on the read-back alone. The author asked for the
repeated `Walk.nodeAt` lookups to be investigated before any laziness was
selected, because deferring a computation and making it cheaper are
different fixes, and for the options to be compared on the path that
needs effect validation after activation.

## Method

A disposable worktree at 96ba184f, with the held minting change applied
(docs/plans/2026-11-04-minting-comparison-scratch2.diff). The worktree
is gone; nothing reached a branch. The probe runs the protocol's inputs
through recheck, the type read-back, `readEffects` and `certifyPackage`,
timing each step: 2,832 candidates, 2,820 packages read, 12 read faults.

Index-first lookup was implemented for real in Walk.purs
(docs/plans/2026-11-08-walk-index-first-scratch.diff), replacing the
earlier Proxy: an array child holds a function from index to item, and
only the named item is wrapped.

Five arms, five rounds with the order rotated, one process at a time.
Load 3.1 to 5.4, 33 to 47% memory free, the machine in ordinary shared
use. Raw samples, the probe and the profile are in
.build/evidence/2026-11-08-walk/ (git-ignored).

## Results

Medians of five runs, in seconds:

| Arm | CPU | recheck | type read-back | readEffects | validate | peak RSS (MiB) |
|---|---|---|---|---|---|---|
| today's walk, package read and validated | 72.2 | 3.1 | 1.8 | 42.3 | 11.6 | 1,134 |
| memoized exact paths | 37.5 | 3.2 | 1.9 | 13.4 | 11.7 | 983 |
| index-first | 22.0 | 3.0 | 1.8 | 2.7 | 11.4 | 688 |
| index-first and memoized | 21.7 | 2.9 | 1.9 | 2.5 | 11.2 | 689 |
| package deferred and never read | 6.8 | 2.7 | 2.1 | 0 | 0 | 654 |

Index-first and today's walk give the same digest over every type
read-back and package
(9fd4b2890ff3b5a8719ceb9c4a5b81627aff6160c892707c33340d79ff06171c).
Item wrappers built fall from 2,208,857,777 to 3,948,068. On the
10,000-part `scalePrograms#2 main`, `readEffects` falls from 39.4 s to
0.26 s.

## What this shows

**Repetition is real but secondary.** Memoizing removes about 35 s, the
roughly ×3.6 the proposal measured on the dominant term. With index-first
in place it removes a further 0.3 s, inside the spread between runs
(21.7 to 22.5 s). Once a lookup costs its depth, repeated lookups are
cheap, and a memo table is state with no measurable return.

**Width is the defect.** Index-first removes the wrappers that are never
read. This makes the computation cheaper; it defers nothing the result
needs.

**A lazy package does not reduce the cost that activation needs.** The
6.8 s arm is what laziness buys only while nothing reads the package.
The strategy sends every `Candidate` to its check (Strategy.purs:107),
and the minted check reads `certificate.effects` before anything else.
Every candidate's package is forced, so after activation a lazy field
costs the same 72.2 s. It would only hide the cost until then.

**Validation becomes the largest step.** With index-first, validation is
11.4 of 22.0 s. The 2026-11-04 proposal's indicative ×2.3 to ×3.2 covers
the read-back without the validator and is not a prediction for this
path. In the profile, 10.1 s of samples sit under the validator:
`Effects.Validate` 5.4 s, `Asked` 2.3 s, `Witness` 1.0 s and
`Effects.Complete` 0.9 s. By self time the largest are `Data.Ord` 2.6 s
and `Domain.Recorded.Origin` 2.3 s, which is path comparison for
`Map`-keyed lookups. The wide declaration accounts for about 1.4 s.

## What this does not show

The probe has no arm for today's `certify`, so 6.8 s is not today's
whole cost and 22.0 / 6.8 is not an activation ratio. Only the recorded
protocol, run against a landed change, gives a figure a budget can use.
Peak RSS includes setup (627 to 655 MiB before the loop).

## Recommendation

1. Take index-first lookup. It is the change that makes the work cheaper,
   and its results are identical on these inputs. It still needs the pins
   the proposal lists, a must-fail row and the header comment corrected.
2. Drop the memo and the path index for now. They can return if a
   profile after index-first shows the walk again.
3. Do not make the package lazy. It would change `Certificate` and move
   no post-activation cost.
4. Investigate validation next, starting with path comparison, before
   setting a validator budget. No fix is proposed here.
