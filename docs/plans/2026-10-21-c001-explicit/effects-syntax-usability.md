# Effects syntax finding for the author

Status: observed usability concern, 2026-10-21. No syntax, diagnostic or
language-policy change is selected. This finding extends beyond C001.

Six candidate programs in the ordinary-record baseline used a trailing with
pure as though it covered both stages of a binary operation. Under the
existing FX001 rule, those written contracts are ill typed. This was our
repeated misunderstanding in one bounded exploration, not a measured error
rate among Waxwing users.

In a named declaration signature:

```text
(a, a) -> a with pure
```

is `a -> a -> a with pure`. Only the nearest arrow is annotated. The
unwritten earlier stage uses the declaration's ambient row. A lambda whose
final stage is pure cannot call that potentially effectful stage under the
pure contract. To state that both operation stages are pure:

```text
a -> a with pure -> a with pure
```

Adding lambda parameter annotations, using a concrete carrier, or using
named partial application did not repair the original contracts. The
carrier-stage controls c7/c8 checked after the signatures changed. c7's
constructed Stats result still retains an ambient first stage; the
experiment does not claim every arrow in that program is explicitly pure.

The diagnostic compounds the misunderstanding: it prints identical expected
and found function/record types, omitting their distinguishing rows.
[CB002](baseline/BACKLOG.md) records exact reproduced examples. The
[baseline report](baseline/README.md) separates these type rejections from
successful Go output and the reference interpreter's grammar gaps.

The rule itself is documented in effects-design §1, with staged-row
semantics in §2, and implemented by Format.Parse.Chain folded/combined. The
failures are consistent with that rule; they do not demonstrate an unsound
compiler or a record-composition defect.

For review after this tranche: whether documentation, examples and mismatch
diagnostics make this per-stage contract clear enough. Any syntax revision
or compiler diagnostic work needs its own approved scope. Nothing here
authorizes either, and no shared tracking file was edited.
