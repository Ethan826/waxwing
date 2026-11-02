// Tranche 2 Task 12 regression rows (the online certificate's package;
// design §C.6; dossier §18.155 (4), (5)), for the tranche 2 registry;
// probes in test/regression-r0-t2-online.mjs. Each restores one defect in
// a whole, compiling form.
const online = 'src/Features/Check/Strategy/Online.purs';
const either = { file: online,
  needle: 'import Data.Either (Either, either)\n',
  replacement: 'import Data.Either (Either(..), either)\n' };

const search = { file: online,
  needle: 'import Domain.Verdict.Search (Budget, CheckRefusal, '
    + 'SearchHint(..))\n',
  replacement: 'import Domain.Verdict.Search (Budget, CheckRefusal(..), '
    + 'SearchHint(..))\n' };

export const t2OnlineRows = [
  // The read dropped: the certificate's `effects` is always a fault.
  { name: 'r0-t2-online-dropped',
    edits: [either, { file: online,
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
    edits: [either, { file: online,
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
    needle: '  , certifySound\n  )\n',
    replacement: '  , certifySound\n  , validate\n  )\n',
    probe: 'r0-t2-online-substitution',
    message: /Online must import exactly certify, certifySound/ },
  // The check reads `effects`: a read fault refuses the candidate, so
  // G0's verdict moves for the fault fixtures.
  { name: 'r0-t2-online-certified-reads',
    edits: [either, search, { file: online,
      needle: 'certified problem certificate = certify problem '
        + 'certificate.unsettled\n',
      replacement: 'certified problem certificate = either '
        + '(const (Left NotGeneric))\n'
        + '  (const (certify problem certificate.unsettled))\n'
        + '  certificate.effects\n' }],
    probe: 'r0-t2-online-verdict',
    message: /r0-t2-online-verdict: \["unframed","c7","q7"\]/ }
];
