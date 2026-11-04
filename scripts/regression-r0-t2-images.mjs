// Tranche 2 Task 10 regression rows (type images; design §C.8, dossier
// §18.155 (6)), for the tranche 2 registry; probes in
// test/regression-r0-t2-images.mjs. Each restores one defect in a whole,
// compiling form.
const images = 'src/Features/Check/Strategy/ReadBack/Images.purs';
const guard = '    | fieldOrder (eraseTy image) == fieldOrder today'
  + ' = Right unit\n';

export const t2ImagesRows = [
  {
    // An auxiliary's arrow converted anyway, with an invented closed row.
    name: 'r0-t2-images-auxiliary',
    file: images,
    needle: '  Arrow _ _ → Nothing\n',
    replacement: '  Arrow one other → PArrow <$> recur one\n'
      + '    <*> pure { labels: [], tail: Nothing } <*> recur other\n',
    probe: 'r0-t2-images-auxiliary',
    message: /r0-t2-images-auxiliary: \["c7","q7"\]/
  },
  {
    // The erasure-agreement guard dropped: any image agrees.
    name: 'r0-t2-images-guard',
    file: images,
    needle: guard,
    replacement: '    | fieldOrder (eraseTy image)'
      + ' == fieldOrder (eraseTy image) = Right unit\n',
    probe: 'r0-t2-images-guard',
    message: /r0-t2-images-guard: \["held"\]/
  },
  {
    // Today's image compared without sorting its record fields.
    name: 'r0-t2-images-field-order',
    file: images,
    needle: guard,
    replacement: '    | fieldOrder (eraseTy image) == today = Right unit\n',
    probe: 'r0-t2-images-field-order',
    message: /r0-t2-images-field-order: \["p2"\]/
  },
  {
    // A positioned image converted from today's σ, not the live type.
    name: 'r0-t2-images-live',
    file: images,
    needle: '  position → reading.live variable position\n',
    replacement: '  _ → note (UnreadImage variable)'
      + ' (rowFree reading.arities today)\n',
    probe: 'r0-t2-images-live',
    message: /r0-t2-images-live: \["f05"\]/
  },
  {
    // An auxiliary naming a flexible variable θ left unbound (I1).
    name: 'r0-t2-images-namable',
    file: images,
    needle: '    | otherwise → Nothing\n',
    replacement: '    | otherwise → Just variable\n',
    probe: 'r0-t2-images-namable',
    message: /namable: \["flexibleField","flexibleTail"\]/
  },
  {
    // An auxiliary's data converted whatever its declared row count.
    name: 'r0-t2-images-data-rows',
    file: images,
    needle: '    | arity.rows == 0 = Just (PData owner arguments [])\n',
    replacement: '    | arity.rows >= 0 = Just (PData owner arguments [])\n',
    probe: 'r0-t2-images-data-rows',
    message: /r0-t2-images-data-rows: \["rowData"\]/
  },
  {
    // An auxiliary's handler head converted with invented rows and mark.
    name: 'r0-t2-images-handler',
    edits: [
      {
        file: images,
        needle: '  App (HandlerHead _) _ → Nothing\n',
        replacement: '  App (HandlerHead effect) arguments → (\\args →'
          + ' PHandler { effect, args, mark: TermN } { inference:'
          + ' { labels: [], tail: Nothing }, clauses: Nothing })'
          + ' <$> traverse recur arguments\n'
      },
      {
        file: images,
        needle: '(PRecordRow, PTy(..), Term)\n',
        replacement: '(PRecordRow, PTy(..), Term(..))\n'
      }
    ],
    probe: 'r0-t2-images-handler',
    message: /r0-t2-images-handler: \["handler"\]/
  },
  {
    // A record-row variable's rigid read as a lone tail.
    name: 'r0-t2-images-record-hole',
    file: images,
    needle: '    | isHole variable →'
      + ' Just { fields: [], tails: [ variable ] }\n',
    replacement: '    | isHole variable || true →'
      + ' Just { fields: [], tails: [ variable ] }\n',
    probe: 'r0-t2-images-record-hole',
    message: /r0-t2-images-record-hole: \["rigid"\]/
  }
];
