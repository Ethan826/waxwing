// A2 Task 12's regression rows (spec §6: Decide's readings and the
// record-defect block), spread into a2PrereqRows
// (scripts/regression-r0-a2-prereq.mjs); probes in
// test/regression-r0-a2-decide.mjs. Each restores one defect in a whole,
// compiling form.
const reason = 'src/Features/Check/Decide/Reason.purs';
const reading = 'src/Features/Check/Decide/Reading.purs';

export const a2DecideRows = [
  {
    // Task 12: `defective` dropped from `blocks`, so a record defect is
    // found only by `certify`, and not at all with no candidate (C4(b)).
    name: 'r0-a2-defect-block',
    file: reason,
    needle: '  defective problem <> ordinary open problem'
      + ' <> unchecked problem\n',
    replacement: '  ([] <* defective problem) <> ordinary open problem'
      + ' <> unchecked problem\n',
    probe: 'r0-a2-defect-block',
    // famw records two `outside` kinds since Scope A (§18.200).
    message: new RegExp('a record defect not blocked: '
      + 'Unsupported Outside Outside; alone: Solved')
  },
  {
    // Task 12: a limitation read as a refused candidate (Task 1's
    // placeholder), a spurious `CandidateRefused` fault.
    name: 'r0-a2-limit-declines',
    file: reading,
    needle: '  NotCertifiable limitation _ → Declines (limited limitation)\n',
    replacement: '  NotCertifiable limitation _ →'
      + ' case limited limitation of _ → claimed claim\n',
    probe: 'r0-a2-limit-declines',
    message: /a limitation read as a refused candidate: Inference/
  }
];
