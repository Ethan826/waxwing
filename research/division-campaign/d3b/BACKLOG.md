# D3b local backlog

## Resolved: exact rejection for a rigid opaque field versus a record

Observed 2026-10-21 in `checks/named-targeted.log`:
`record-constant: d3b unknown, bounded invalid, expect invalid`.
`solve.mjs` checked clashes on outer constructors only, so the nested
field equation went to bounded search, whose failure is not exact.

Fixed 2026-10-21: `clash.mjs` adds a recursive clash check over fields
both sides are forced to have (a written field, a rigid tail's field at
θ*_π, or absence when every tail is rigid and lacks the label), with
atomic bases and opaque constants compared by name. Flexible type
variables, non-atomic base strings and fields a flexible tail may
supply are never claimed to clash. Bounds are unchanged.

Regression: `node run.mjs --assert 0 3 '' record-constant` now reports
`d3b invalid` and exits 0 (`checks/clash-new.log`). With solve.mjs
temporarily replaced by its d7113d7 version (outer constructors only),
the same command reports `d3b unknown` and exits 1
(`checks/clash-old.log`); the new solve.mjs was then restored.

## Resolved: diagnostic runner exit status

`run.mjs` keeps its report mode (exit 0 whatever it prints). `--assert`
exits 1 on a named verdict mismatch or any invariant failure. A planted
mismatch (record-constant's expectation set to `valid` in the working
tree, then restored) exits 1 in assert mode and 0 in report mode
(`checks/assert-planted.log`, `checks/report-planted.log`). The
`contextFree` mutant on the four targeted cases exits 1 with three
`covers` failures (`checks/assert-mutant.log`). Only an assert-mode exit
status may be cited as a pass.

## Resolved: full named run time

Before this change the full named and contextFree runs each timed out
at 180 seconds after 42 cases. The case after `forwarded` is `join3`;
alone, at unchanged bounds, it takes 32.3 seconds
(`checks/profile-join3.log`). With a 3600-second limit the full named
run in assert mode completed all 59 cases in 425.4 seconds on a shared
machine, exit 0, no mismatches or invariant failures
(`checks/named-full.log`). The full `contextFree` mutant run has not
been repeated at the longer limit; it remains open if wanted.
