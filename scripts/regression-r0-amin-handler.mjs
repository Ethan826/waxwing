// R0 a-min regression rows for the handler family (Task 9; design note
// docs/plans/2026-10-30-task-9-literal-design.md), spread into r0AminRows
// (scripts/regression-r0-amin.mjs); probes in
// test/regression-r0-amin-handler.mjs. Each restores its defect in a
// compiling form.
const generate = 'src/Features/Check/Generate/';
const block = `${generate}Block.purs`;
// The mutants' import edit and `forged`: a copy of a marked type whose
// top-level handler mark is `Written FixedN` (marks erase).
const forgedImport = { file: block,
  needle: 'import Domain.Recorded.Effect (ERole(..), EVar(..), MTy(..))\n',
  replacement: 'import Domain.Recorded.Effect\n'
    + '  (ERole(..), EVar(..), Fixed(..), MTy(..), MarkRef(..))\n' };
const forgedHelper = { file: block,
  needle: '-- The deferred row d, `⟨p, effect⟩` at the `defer` item',
  replacement: 'forged ∷ MTy → MTy\n'
    + 'forged = case _ of\n'
    + '  MHandler label rows → MHandler label { mark = Written FixedN }'
    + ' rows\n'
    + '  other → other\n\n'
    + '-- The deferred row d, `⟨p, effect⟩` at the `defer` item' };
export const handlerRows = [
  {
    // R9 §2: a `let` binds the local to a copy of the value's marked type
    // whose top-level handler mark is forged to `Written FixedN`. Erasure
    // is preserved by construction (test/r0-marked-erase.mjs drops
    // marks; the probe checks the two types agree with marks dropped),
    // so the failure comes from the marked side: the installed handler
    // no longer carries `At (Literal p)`.
    name: 'r0-amin-literal-reaches-use',
    edits: [
      forgedImport,
      { file: block,
        needle: '      (bindLocal <@> { ty: found.ty, marked: found.marked }'
          + ' <@> context)\n',
        replacement: '      (bindLocal <@> { ty: found.ty, marked: forged'
          + ' found.marked } <@> context)\n' },
      forgedHelper
    ],
    probe: 'r0-amin-literal-reaches-use',
    message: /installed handler's mark is .*, not At \(Literal/
  },
  {
    // Review 1 P1-1: a block's type is a copy of its result's whose
    // top-level handler mark is forged to `Written FixedN` (erasure kept,
    // as above), so a literal reaching its `with` as a block's result
    // loses `At (Literal p)`. The handler test's route check
    // (r0-obligations-routes.mjs) fails under it too.
    name: 'r0-amin-literal-block-route',
    edits: [
      forgedImport,
      { file: block, needle: '    , marked: final.marked\n',
        replacement: '    , marked: forged final.marked\n' },
      forgedHelper
    ],
    probe: 'r0-amin-literal-block-route',
    message: /installed handler's mark is .*, not At \(Literal/
  },
  {
    // E4: a handler literal records no HandlerLit (nor its consumptions).
    name: 'r0-amin-handler-lit',
    file: `${generate}Effect.purs`,
    needle: '        literalAt (at context path (ExprRule 20)) span\n'
      + '          (Array.mapWithIndex clauseRow clauses)\n',
    replacement: '        when false\n'
      + '          ( literalAt (at context path (ExprRule 20)) span\n'
      + '              (Array.mapWithIndex clauseRow clauses)\n'
      + '          )\n',
    probe: 'r0-amin-handler-lit',
    message: /no HandlerLit at the literal/
  },
  {
    // E4: HandlerLit is recorded, its clause rows' consumptions into R
    // and C are not.
    name: 'r0-amin-handler-lit-clauses',
    file: `${generate}Literal.purs`,
    needle: '    *> sequence_ (Array.mapWithIndex intoBoth clauseRows)\n',
    replacement: '    *> when false\n'
      + '      (sequence_ (Array.mapWithIndex intoBoth clauseRows))\n',
    probe: 'r0-amin-handler-lit',
    message: /clause consumptions at the literal: 0/
  },
  {
    // E5: a `with` over an MHandler records no InstallR (R into ρ).
    name: 'r0-amin-install-r',
    file: `${generate}Effect.purs`,
    needle: '    consumedAt site span\n'
      + '      { site: InstallR\n'
      + '      , source: rows.inference\n'
      + '      , target: context.ambient\n'
      + '      , marks: false\n'
      + '      , bare: false\n'
      + '      }\n',
    replacement: '    when false\n'
      + '      ( consumedAt site span\n'
      + '          { site: InstallR\n'
      + '          , source: rows.inference\n'
      + '          , target: context.ambient\n'
      + '          , marks: false\n'
      + '          , bare: false\n'
      + '          }\n'
      + '      )\n',
    probe: 'r0-amin-install-r',
    message: /no InstallR at an MHandler with/
  },
  {
    // Review 2 P2-2: InstallR is recorded with `marks: true`, so R would
    // be consumed into ρ with marks. The coverage check reads tokens
    // only and passes; the handler test's exact comparison fails.
    name: 'r0-amin-install-r-marks',
    file: `${generate}Effect.purs`,
    needle: '      { site: InstallR\n'
      + '      , source: rows.inference\n'
      + '      , target: context.ambient\n'
      + '      , marks: false\n',
    replacement: '      { site: InstallR\n'
      + '      , source: rows.inference\n'
      + '      , target: context.ambient\n'
      + '      , marks: true\n',
    probe: 'r0-amin-handler-exact',
    message: /handler records differ: .*E21 records/
  }
];
