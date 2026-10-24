// R0 Task 7.1b's regression rows (D1's generator port), spread into
// r0Rows (scripts/regression-r0.mjs); probes in
// test/regression-r0-port.mjs. Each restores one defect in a whole,
// compiling form.
const generate = 'src/Features/Check/Generate/';

export const r0PortRows = [
  {
    // The shadow harness skips D1's seal check, so a generator's read
    // outside tracking reaches `decide` (§5 layer 2, T3a's harness half).
    name: 'r0-port-seal-unchecked',
    file: 'src/Features/Check/Decide/Shadow.purs',
    needle: '    if null (untracked elaborating) then decide checking'
      + ' (problem elaborating)\n',
    replacement: '    if true || null (untracked elaborating) then decide'
      + ' checking (problem elaborating)\n',
    probe: 'r0-port-seal-unchecked',
    message: /a seal fault reached decide: 1 search/
  },
  {
    // An over-applied call's saturated node typed as the whole call's
    // result rather than B1's arrow of the rest (Check/Call.purs).
    name: 'r0-port-over-applied',
    file: `${generate}Call.purs`,
    needle: '  (Checked.Expr { ty: Array.foldr stage ty more, span, node })\n',
    replacement: '  (Checked.Expr { ty: if true then ty else Array.foldr stage'
      + ' ty more, span, node })\n',
    probe: 'r0-port-over-applied',
    message: /the saturated node of id\(add, 1, 2\) was typed TInt/
  },
  {
    // `build` leaves its body's holes as the witness numbered them,
    // without today's `holes` renumbering (§9 step 3).
    name: 'r0-port-holes-unnumbered',
    file: `${generate}Body.purs`,
    needle: '  , body: holes body\n',
    replacement: '  , body: if true then body else holes body\n',
    probe: 'r0-port-holes-unnumbered',
    message: /build left hole 7 unnumbered/
  }
];
