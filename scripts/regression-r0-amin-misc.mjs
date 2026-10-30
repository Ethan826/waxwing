// R0 a-min tranche 1 regression rows for Tasks 10 and 11 (defer, Fail
// payloads, entry, FX032's Unsupported, and rule 1's EffectsUnchecked),
// spread into r0AminRows (scripts/regression-r0-amin.mjs); probes in
// test/regression-r0-amin-misc.mjs. Each restores one defect in a
// compiling form: the call stays, behind `when false`.
const generate = 'src/Features/Check/Generate/';
const block = `${generate}Block.purs`;
const body = `${generate}Body.purs`;
const failure = `${generate}Failure.purs`;
export const miscRows = [
  {
    // Task 10: a `defer` records no Defer (E6).
    name: 'r0-amin-misc-defer',
    file: block,
    needle: '      deferAt (at context path (ExprRule 16)) span'
      + ' (deferredRow path)\n        context.ambient\n',
    replacement: '      when false\n'
      + '        ( deferAt (at context path (ExprRule 16)) span'
      + ' (deferredRow path)\n            context.ambient\n        )\n',
    probe: 'r0-amin-misc-defer',
    message: /a defer records no Defer obligation/
  },
  {
    // Task 10: the Defer is there but d is not consumed (E2 at `defer`).
    name: 'r0-amin-misc-defer-consumes',
    file: `${generate}Obligation.purs`,
    needle: '    *> siteAt site DeferInto span\n      ( Consume\n'
      + '          { site: AtDefer\n'
      + '          , source: { labels: [], tail: Just row }\n'
      + '          , target: enclosing\n          , marks: true\n'
      + '          , bare: false\n          }\n      )\n',
    replacement: '    *> when false\n      ( siteAt site DeferInto span\n'
      + '          ( Consume\n              { site: AtDefer\n'
      + '              , source: { labels: [], tail: Just row }\n'
      + '              , target: enclosing\n              , marks: true\n'
      + '              , bare: false\n              }\n          )\n      )\n',
    probe: 'r0-amin-misc-defer-consumes',
    message: /a defer's deferred row is not consumed into the enclosing/
  },
  {
    // Task 10: the enclosing row is a closed empty row, not the ambient.
    name: 'r0-amin-misc-defer-enclosing',
    // (Its second edit restores the `Nothing` import the healthy file no
    // longer needs.)
    edits: [{ file: block,
      needle: '(deferredRow path)\n        context.ambient\n',
      replacement: '(deferredRow path)\n'
        + '        { labels: [], tail: Nothing }\n' },
    { file: block,
      needle: 'import Data.Maybe (Maybe, maybe)\n',
      replacement: 'import Data.Maybe (Maybe(..), maybe)\n' }],
    probe: 'r0-amin-misc-defer-enclosing',
    message: /a defer's enclosing row is not the declared row/
  },
  {
    // Task 10: a deferred expression keeps its caller's ambient row, so a
    // defer inside it names the wrong enclosing row (E11, d).
    name: 'r0-amin-misc-defer-nested',
    // (After Task 8's merge the deferred expression enters its row through
    // Generate.Ambient `enter`; the defect enters the caller's instead.)
    edits: [{ file: block,
      needle: '  inside ← enter valuePath (ownRow EffectOf path) context\n',
      replacement: '  inside ← enter valuePath context.ambient context\n' },
    { file: block,
      needle: 'import Features.Check.Generate.Ambient (enter, ownRow)\n',
      replacement: 'import Features.Check.Generate.Ambient (enter)\n' }],
    probe: 'r0-amin-misc-defer-nested',
    message: /a nested defer's enclosing row is not the outer d/
  },
  {
    // Task 10: `fail` records no FailConcrete for its payload (E9).
    name: 'r0-amin-misc-fail-payload',
    file: failure,
    needle: '        payloadAt (at context path (ExprRule 23)) span'
      + ' paid.marked\n',
    replacement: '        when false\n          ( payloadAt (at context path'
      + ' (ExprRule 23)) span\n              paid.marked\n          )\n',
    probe: 'r0-amin-misc-fail-payload',
    message: /a fail expression records no FailConcrete/
  },
  {
    // Task 10: a fail clause records no FailConcrete for its payload.
    name: 'r0-amin-misc-fail-clause',
    file: failure,
    needle: '    , emits: payloadAt site clause.span markedPayload *>'
      + ' generated.emits\n',
    replacement: '    , emits: generated.emits\n',
    probe: 'r0-amin-misc-fail-clause',
    message: /a fail clause records no FailConcrete/
  },
  {
    // Task 10: Entry in every function, not main alone.
    name: 'r0-amin-misc-entry-everywhere',
    file: body,
    needle: 'entered function row = when (isEntry function)\n',
    replacement: 'entered function row = when (isEntry function'
      + ' || true)\n',
    probe: 'r0-amin-misc-entry-everywhere',
    message: /a function other than main records an Entry/
  },
  {
    // Task 10: main records no Entry.
    name: 'r0-amin-misc-entry-missing',
    file: body,
    needle: 'entered function row = when (isEntry function)\n',
    replacement: 'entered function row = when (isEntry function'
      + ' && false)\n',
    probe: 'r0-amin-misc-entry-missing',
    message: /main records no Entry/
  },
  {
    // Task 10: a perform form records no Unsupported for FX032's operation.
    name: 'r0-amin-misc-unsupported',
    file: `${generate}Perform.purs`,
    needle: '  unsupported context path span effect index shape.written\n',
    replacement: '  when false\n    (unsupported context path span effect index'
      + ' shape.written)\n',
    probe: 'r0-amin-misc-unsupported',
    message: /a perform of an operation with a written row records no/
  },
  {
    // Task 10: Resolve keeps no operation row (FX032's data).
    name: 'r0-amin-misc-operation-row',
    file: 'src/Features/Resolve/Effect.purs',
    needle: '  resolvedRow variables written = hush\n',
    replacement: '  resolvedRow variables written = Nothing <* hush\n',
    probe: 'r0-amin-misc-operation-row',
    message: /Resolve keeps no row for an operation that writes one/
  },
  {
    // Task 11: rule 1 does not block on an Unsupported obligation.
    name: 'r0-amin-misc-unchecked-block',
    file: 'src/Features/Check/Decide/Reason.purs',
    needle: 'blocks open problem = ordinary open problem <> unchecked'
      + ' problem\n',
    replacement: 'blocks open problem = ordinary open problem <>'
      + ' filter (const false) (unchecked problem)\n',
    probe: 'r0-amin-misc-unchecked-block',
    message: /FX032's accepted declaration is not Unresolved/
  }
];
