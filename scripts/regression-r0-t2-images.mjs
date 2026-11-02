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
    needle: '  position → note unread (reading.live position)\n',
    replacement: '  _ → note unread (rowFree reading.arities today)\n',
    probe: 'r0-t2-images-live',
    message: /r0-t2-images-live: \["f05"\]/
  }
];
