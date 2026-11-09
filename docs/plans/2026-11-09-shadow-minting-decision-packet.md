# Shadow-minting decision packet (2026-11-09, dossier §18.168)

**Milestones.** None has moved since 2026-10-25. This packet asks for
one decision, whether stricter certification may run in shadow, and keeps
it apart from the question of replacing the live checker.

The gate reports them separately:

```text
criteria 1-7: not met (2)
S1 NOT MET: each loss accepted within shadow certification only
S2 NOT MET: the real EffectsUnread reaches RT8 and the window
shadow minting: not met (S1, S2)
live replacement: not met (2, S1, S2)
```

Criterion 6 is met: the approved budgets hold for the protocol at
2c5b9e30 and the source identity check passes. The failed `npm run perf`
files stay failed; the budget approval does not change them. Held: the
minting switch, F14's retirement, live replacement, pushing.

## 1. What the switch changes

Online's check would mint through the validator, and a read fault would
decline, with no fallback to substitution-only `certify`.

The live compiler does not reach this code. A transitive scan of the
compiled imports from `Program.Compile`, `Program.Command` and
`Program.Main` reaches none of the read-back, `Strategy.Online` or
`Decide.Shadow`. So the switch changes what shadow reports, and no
program's compile result. That holds only while the wiring stays as it
is.

## 2. Losses acceptable only within shadow certification

The comparison at 2c5b9e30 (test/fixtures/r0/t2-minting-comparison3.json):
census 0 moved, RT8 15, window 16, shadow 16. None is unexpected. Under
minting these stop certifying in shadow:

| List | Declarations (effect pin) | Effect |
|---|---|---|
| Read faults, 12 | c7 and q7 `statsEvidence`; `expected-handler` `k`; fx008
`r2`, `r9`; f3, late1, late2, one3, two3, rigid `main`; inline fx032 `g` (a known defect) | the read-back cannot read the package; §3.2(b) |
| ForcedTail, 4 | effect-namespaces and services `main`; fx-services `fake`; fx008 `aroundBoth` | a checker limitation |

The corpus loader's read-fault list is 11, without fx032 `g`. The two
`statsEvidence` declarations move from Solved to Unresolved. The three
`RequirementUnjudged` are existing refusals and do not move.

**Recommendation: accept both lists within shadow certification only.**
Shadow exists to report what the new path can certify, and these are the
honest gaps. Reporting them costs no working program, and the reported
gaps are what a later replacement decision needs.

**To record:** a dossier section naming `shadow certification`, the read
fault list and ForcedTail, cited in `shadowLosses`. It must be a different
section from any cited for `losses`, on any list, which must each name
`live replacement` and not `shadow certification`. The gate refuses one
citation for both.

## 3. Consequences of replacing the live checker: unresolved

Nothing here is decided by section 2.

- Today's whole checker compiles all 19 gap declarations. Replacement
  could lose the read-fault and ForcedTail programs: 16 certification
  losses on the effect pin (12 and 4), 15 on the corpus loader (11 and
  4). What users would actually lose is not measured.
- Whether the three existing-refusal programs survive replacement is not
  measured either.
- R037 (2) blocks live replacement, Entry's fail-open fallback first. No
  fallback may be called unreachable without its preservation argument.
- C6's expected divergence and F14's retirement stay separate decisions.

## 4. The test that must run with the switch

The committed `Unsupport` has no `EffectsUnread`, so today's read-fault
fixtures are rendering evidence only. The switch's own change must add
the constructor to `Unsupport` and a regression row tagged
`effects-unread-real`, cited in `realReadFaultRow`; the gate checks both. It must show:

1. Each `ReadFault` constructor, carried by the real `EffectsUnread`
   through `Decide.reading`, reaches RT8's accounting and the window.
2. RT8 reads it as a read-fault decline with its fault name (R038 (1)),
   and the window classes it §3.2(b), where today compiles and refuses.
3. The classification does not read as an accepted loss: its target stays
   unresolved.
4. A restored defect fails: `EffectsUnread` removed from RT8's decline
   kinds reads as DEFECT (R038 (3)), and a genuine `RecordDefect` or
   `Malformed` still reads as a defect beside it.
5. The real comparison repeats on the real constructor, every movement
   listed and nothing re-pinned.

## 5. Decisions for the author

1. Accept the two lists within shadow certification only (section 2)?
2. If so, authorize the switch's implementation with section 4's test? It
   would add the constructor and the mint through `validate`, with review,
   a complete verify and a repeated comparison and protocol.

Live replacement is not asked here.
