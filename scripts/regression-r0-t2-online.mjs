// Tranche 2 Task 12 regression rows (the online certificate's package;
// design §C.6; dossier §18.155 (4), (5)), for the tranche 2 registry;
// probes in test/regression-r0-t2-online.mjs. Each restores one defect in
// a whole, compiling form.
const online = 'src/Features/Check/Strategy/Online.purs';
export const t2OnlineRows = [
  // The read dropped: the certificate's `effects` is always a fault.
  { name: 'r0-t2-online-dropped',
    edits: [{ file: online,
      needle: 'import Features.Check.Strategy.ReadBack.Fault (ReadFault)\n',
      replacement: 'import Features.Check.Strategy.ReadBack.Fault '
        + '(ReadFault(..))\n' },
    { file: online, needle: '    found.trace\n',
      replacement: '    found.trace *> Left MarkClash\n' }],
    probe: 'r0-t2-online-carried',
    message: /r0-t2-online-carried: \["lone","held"\]/ },
  // A read fault routed as the search's own failure: the candidate is
  // dropped (`NoCandidate`), against §C.6's one routing.
  { name: 'r0-t2-online-fault-refuses',
    edits: [{ file: online,
      needle: '    (readBack problem found.function)\n',
      replacement: '    (readBack problem found.function >>= faulted found)\n'
        + '  faulted found made = either (const (Left "effects"))\n'
        + '    (const (Right made))\n'
        + '    (packaged problem found made)\n' }],
    probe: 'r0-t2-online-kept',
    message: /r0-t2-online-kept: \["unframed","c7","q7"\]/ },
  // A second trace read in Online, beside the one reviewed reader.
  { name: 'r0-t2-online-second-read', file: online,
    needle: '    , holes: made.holes\n',
    replacement: '    , holes: const made.holes found.trace\n',
    probe: 'r0-t2-gates-scan',
    message: /Online searched \(accessor\) uses the label `trace` 1 times/ },
  // Online validates: it imports Effects.Validate.
  { name: 'r0-t2-online-validates', file: online,
    needle: 'import Features.Check.Strategy.Guard (g0Guard)\n',
    replacement: 'import Features.Check.Strategy.Guard (g0Guard)\n'
      + 'import Features.Check.Strategy.Effects.Validate as Validate\n',
    probe: 'r0-t2-online-imports',
    message: /Online imports Features\.Check\.Strategy\.Effects\.Validate/ },
  // Online takes the validator from Substitution beside G0's check.
  { name: 'r0-t2-online-takes-validate', file: online,
    needle: '  , certifyPackageSound\n  )\n',
    replacement: '  , certifyPackageSound\n  , validate\n  )\n',
    probe: 'r0-t2-online-substitution',
    message: /Online must import exactly certifyPackage, certifyPackageSound/ },
  // A read fault refuses the candidate rather than declining (§18.170):
  // the fault fixtures' verdicts move.
  { name: 'r0-t2-online-certified-reads', edits: [{ file: online,
    needle: '  unread fault = Left (PackageUnread (faultName fault))\n',
    replacement: '  unread fault = '
      + 'Left (const NotGeneric (faultName fault))\n' },
  { file: online, needle: '  , CheckRefusal(PackageUnread)\n',
    replacement: '  , CheckRefusal(NotGeneric, PackageUnread)\n' }],
    probe: 'r0-t2-online-verdict',
    message: /r0-t2-online-verdict: \["unframed","c7","q7"\]/ }
];
