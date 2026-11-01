// A2 Task 14's regression rows (the differential reporter, spec C6),
// spread into a2Rows (scripts/regression-r0-a2.mjs); probes in
// test/regression-r0-a2-report.mjs. Each restores one defect in the
// reporter, a test helper, so each row runs from its own copy of test/.
const reporter = 'test/r0-a2-differential.mjs';
const render = 'export const render = rows => evidences.flatMap('
  + 'evidence => [\n  `${evidence} evidence:`,\n  ...rows.filter(row => '
  + 'row.evidence === evidence).map(line)]).join(\'\\n\');\n';

const edit = (needle, replacement) => [{ file: reporter, needle,
  replacement }];

export const a2ReportRows = [
  {
    // C6 without its hole condition: a concrete payload is reported as
    // the expected divergence instead of a plain widening.
    name: 'r0-a2-c6-hole-settled',
    tree: 'test',
    edits: edit('isFailConcrete(placed) && settledHole(completed, placed) '
      + '? [index]', 'isFailConcrete(placed) ? [index]'),
    probe: 'r0-a2-c6-hole-settled',
    message: /C6 with a concrete payload: expected ValidatorWider/
  },
  {
    // C6 for any refusal today, not only FailNeedsConcrete.
    name: 'r0-a2-c6-needs-concrete',
    tree: 'test',
    edits: edit("const wider = item => item.today.refusal === "
      + "'FailNeedsConcrete'\n", 'const wider = item => true\n'),
    probe: 'r0-a2-c6-needs-concrete',
    message: /C6 under another refusal: expected ValidatorWider/
  },
  {
    // C6 not tied to the obligation today refuses at: another
    // FailConcrete's hole payload stands for it.
    name: 'r0-a2-c6-site-tie',
    tree: 'test',
    edits: edit('.includes(item.today.at)', '.length > 0'),
    probe: 'r0-a2-c6-site-tie',
    message: /C6 at the concrete payload: expected ValidatorWider/
  },
  {
    // Fixture and corpus rows rendered in one section.
    name: 'r0-a2-evidence-render',
    tree: 'test',
    edits: edit(render, 'export const render = rows => '
      + "rows.map(line).join('\\n');\n"),
    probe: 'r0-a2-evidence-render',
    message: /render merged the fixture and corpus rows/
  },
  {
    // A corpus row labeled "predicted" like a fixture row.
    name: 'r0-a2-evidence-basis',
    tree: 'test',
    edits: edit("item.evidence === 'fixture' ? 'predicted' : 'observed'",
      "'predicted'"),
    probe: 'r0-a2-evidence-basis',
    message: /a corpus row's basis: expected observed/
  }
];
