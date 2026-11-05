// Tranche 2 Task 6 regression rows (the trace; design §C, dossier
// §18.155 (3)), for the tranche 2 registry; probes in
// test/regression-r0-t2-trace.mjs. Each restores one defect in a whole,
// compiling form.
const trace = 'src/Features/Check/Trace.purs';

export const t2TraceRows = [
  {
    // `finish` skips the renumbering: every meta keeps its raw number,
    // so a meta the body shares no longer reads the body's hole. Since
    // R036 (2) the renumbering arm is in Trace/Types.purs `renumbered`.
    // The probe also runs the package's check (once the row
    // r0-t2-package-shared, the same edit): a meta the body shares reads
    // another number on the effect side, and the two live sources of
    // `w`'s handler row disagree (fail-closed, `Apart`).
    name: 'r0-t2-trace-renumber',
    file: 'src/Features/Check/Trace/Types.purs',
    needle: '    Hole meta → maybe (unnumbered meta) (Right <<< Hole)\n',
    replacement: '    Hole meta → maybe (unnumbered meta) '
      + '(Right <<< const (Hole meta))\n',
    probe: 'r0-t2-trace-renumber',
    message: /r0-t2-trace-renumber: \["Nil","length","shared:Apart"\]/
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
