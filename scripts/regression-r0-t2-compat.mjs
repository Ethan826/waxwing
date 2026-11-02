// Tranche 2 Task 14 regression rows (the owed compatibility checks, A2
// spec §2.4, §2.5, §4, §11), for the tranche 2 registry; probes in
// test/regression-r0-t2-compat.mjs. Each restores one defect in a
// whole, compiling form.
const effects = 'src/Features/Check/Strategy/Effects/';
const row = (name, file, needle, replacement, message, extra = {}) =>
  ({ name, file, needle, replacement, probe: name, message, ...extra });

export const t2CompatRows = [
  // erase keeps only the first field of a row variable's record, where
  // today's σ has two. (The same defect in `eraseTy` is caught first by
  // the read-back's own image check, ReadBack.Images `ImageApart`.)
  row('r0-t2-compat-erase-field', `${effects}Package.purs`,
    '  (map (eraseTy <<< PRecord) package.rows)\n',
    '  (map (eraseTy <<< PRecord <<< (\\found → found { fields = maybe [] '
      + 'pure (head found.fields) })) package.rows)\n',
    /r0-t2-compat-erase-field: \["main"\]/),
  // settle keeps a type hole: erase∘settle no longer settled∘erase.
  row('r0-t2-compat-settle', `${effects}Package.purs`,
    '    | isHole variable → PBase IntBase\n',
    '    | isHole variable → ty\n',
    /r0-t2-compat-settle: \[.*"f"/),
  // Completion rebinds every flexible variable to a fresh hole, bound
  // or not: G0 refuses erase P_c where it accepted erase (settle P_in).
  row('r0-t2-compat-g0', `${effects}Complete.purs`,
    '    | bound package variable info = Nothing\n',
    '    | bound package variable info && false = Nothing\n',
    /r0-t2-compat-g0: \["/),
  // Completion numbers from the largest type or row hole only, as
  // bindingsOf does: a fresh hole takes an effect hole's number.
  row('r0-t2-compat-numerals', `${effects}Complete.purs`,
    '    <> concatMap rowHoles (fromFoldable package.effects)\n',
    '    <> concatMap rowHoles (mapMaybe (const Nothing) '
      + '(fromFoldable package.effects))\n',
    /r0-t2-compat-numerals: \["/),
  // The canonical comparison loosened to sort record tails: a planted
  // tail-order difference passes as equal.
  row('r0-t2-compat-tail-order', 'test/r0-a2-canonical.mjs',
    '  tails: tails.map(canonical) } });\n',
    '  tails: tails.map(canonical).sort((left, right) =>\n'
      + '    text(left) < text(right) ? -1 : 1) } });\n',
    /r0-t2-compat-tail-order: \["tails"\]/, { tree: 'test' })
];
