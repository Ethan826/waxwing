# Validator cost: path comparison (2026-11-09)

Status: proposal (dossier §18.163). Profiling and this proposal are
authorized. No validator optimization or freeze exception is authorized,
and nothing here is implemented. These are attribution samples, not the
performance protocol, and no budget is proposed.

## Finding

Most validator time is ordering. A profile of `validate` over the 2,820
packages that read (11.8 s of samples) has 9.4 s of self time in ordering
and comparison code: `Data.Ord`, `Domain.Recorded.Origin`, `Data.Map`,
record access. The largest callers are `Asked` (2.1 s), `Effects.Record`
(2.1 s with `scopeOf` and `effectKnown`), `Witness` (0.9 s) and
`RecordRefs` (0.9 s).

The keys are recorded variables and atoms that hold a `Path`, so each map
operation compares paths. Across the run:

| Measure | Value |
|---|---|
| Path comparisons | 14,619,789 |
| Equal paths | 2,480,741 (17%) |
| Equal paths that are the same object | 2,480,741 (all of them) |
| Steps compared up to the first difference | 209,609,320 of 250,277,250 (84%) |

Paths share long prefixes, so most comparisons walk most of the path. The
derived `Ord` does that through `ordArray` and a generic element
comparison, which is where `Data.Ord` time goes.

## Experiments

Disposable copies of the compiled output, at 04cba894; src untouched.
Conditions: shared machine, load 4.1 to 7.7, 34 to 42% memory free. Five
rotated runs per arm, median CPU of the validator loop alone:

| Arm | Validator CPU (s) | Range |
|---|---|---|
| derived `Ord` (today) | 14.0 | 13.8 to 15.1 |
| same-object shortcut | 13.2 | 12.8 to 14.0 |
| one monomorphic loop over the steps | 7.1 | 7.0 to 7.2 |
| both | 7.0 | 6.9 to 7.2 |

The "both" figures exclude the slower run under the CPU profiler.

Results: `validate` gave the same digest in all four builds over every
package (2,813 `Right`, 7 `Left`). An oracle build ran the monomorphic
loop beside the derived comparison on all 14,619,789 comparisons, with 0
mismatches.

## What this shows

The monomorphic loop halves validator time and needs no change to what
is compared. It repeats `Step`'s derived order: `Named` before `Index`,
strings and integers by their own order, then the shorter path first
when one is a prefix of the other.

The same-object shortcut is a small saving alone, and nothing further
beside the loop. The check of identical objects is cheap and correct, but
the data does not justify adding it.

## Options

**A. A hand-written `compare` on `Path` (recommended).** One loop in
`Domain.Recorded.Origin`, with no change to `Eq` or to `Ord`'s meaning.
Required: an agreement property against a reference comparison on
generated paths (every step-kind pair, prefixes, empty paths), a
restored-defect row for each ordering case, the validator digest, and the
protected pins. A derived instance is correct by construction and a
hand-written one is not, which is what those tests pay for.

**B. Interned paths** (hash-consing; Filliâtre and Conchon, 2006). Compare
by integer identity. It would remove the walk, but an interned integer
does not preserve the lexicographic order. Any behavior that depends on
map iteration order would have to be shown independent of it, or the
order rank kept. Larger, and riskier for the intended ordering. Not
recommended until A has been measured.

**C. Fewer comparisons.** The callers above may rebuild or rescan maps.
This was not investigated, and it would change validator code.

## Decisions for the author

1. Whether to authorize A. It changes a `Domain` module the validator
   depends on, not the validator's modules. Whether that needs a freeze
   exception is your ruling; this proposal does not assume it does not.
2. Whether a further cost target remains after A. Only the protocol, run
   on a landed change, can say.
