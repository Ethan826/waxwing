// Tranche 2 Task 6 regression rows (the trace; design §C, dossier
// §18.155 (3)), for the tranche 2 registry; probes in
// test/regression-r0-t2-trace.mjs. Each restores one defect in a whole,
// compiling form.
const trace = 'src/Features/Check/Trace.purs';

export const t2TraceRows = [
  {
    // `finish` skips the renumbering: every meta keeps its raw number,
    // so a meta the body shares no longer reads the body's hole.
    name: 'r0-t2-trace-renumber',
    file: trace,
    needle: '    Hole meta → Hole (maybe meta identity '
      + '(Map.lookup meta numbers))\n',
    replacement: '    Hole meta → Hole (maybe meta (const meta) '
      + '(Map.lookup meta numbers))\n',
    probe: 'r0-t2-trace-renumber',
    message: /r0-t2-trace-renumber: \["Nil","length"\]/
  },
  {
    // `recordApplied` drops the argument span: an over-applied call's
    // extra stage is no longer keyed by its argument.
    name: 'r0-t2-trace-applied-key',
    file: trace,
    needle: '  { applied = appended (Tuple (spanKey span) (spanKey argument))'
      + ' row\n',
    replacement: '  { applied = appended (Tuple (spanKey span) (spanKey span))'
      + ' row\n',
    probe: 'r0-t2-trace-applied-key',
    message: /applied-key: \["overTwo","inFirst","inExtra"\]/
  },
  {
    // A handler clause's entry not recorded (Task 6b): its own row is
    // left in `State` alone, where the read-back cannot read it.
    name: 'r0-t2-trace-clause-dropped',
    file: 'src/Features/Check/Clauses.purs',
    needle: '    , trace = recordClause clause.span traced consumed.trace\n',
    replacement: '    , trace = const consumed.trace traced\n',
    probe: 'r0-t2-trace-clause-dropped',
    message: /clause-dropped: \["one clause key","one entry","row reads/
  }
];
