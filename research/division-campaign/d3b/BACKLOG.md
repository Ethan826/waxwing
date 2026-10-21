# D3b local backlog

## Exact rejection for a rigid opaque field versus a record field

Observed 2026-10-21 in `checks/named-targeted.log`:
`record-constant: d3b unknown, bounded invalid, expect invalid`.
The new named case does not match its expected D3b verdict. The same
mismatch occurs in the targeted mutant run. Neither is an invariant
failure or a proof counterexample.

`solve.mjs` dispatches the normalized nested field equation to bounded
search, which correctly reports an inexact negative result. Its exact
clash check currently examines outer constructors only. The rigid field
is opaque, so a record field cannot equal it; this case should admit an
exact rejection after decomposing the fixed singleton-field equation.

Next action: establish a sound recursive clash check for fixed fields,
add this named case as its regression, and show the regression fails
with the old clash detector restored. Retain the current `invalid`
expectation and all bounds. Do not relabel a bounded failure as exact.

The full named and contextFree runs each timed out at 180 seconds after
42 completed cases. Their saved prefixes are partial evidence only.
Next full run: profile the next case after `forwarded`, preserve all
current bounds, and allocate an explicit larger wall budget if justified.

## Diagnostic runner exit status does not assert the verdicts

Independent review found run.mjs exits zero even when it displays a
verdict mismatch or invariant failure. The retained reports inspect
actual output and disclose the record-constant mismatch; process exit
zero must not be cited as a passing suite. Next action: separate the
exploratory report mode from an explicit assertion mode, with a planted
mismatch proving the assertion mode fails. No such mode is added here.
