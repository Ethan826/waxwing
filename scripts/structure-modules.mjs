// The module-boundary tables scripts/structure.mjs enforces: which
// modules may import each restricted module, and which of those are
// token modules, whose compiled JS no other module may import or
// re-export. Split from structure.mjs (R0 Task 7.1a) to keep it under
// the line limit.
// Each internal IR is visible only to the phase that produces it and the one
// that consumes it: Check produces the checked IR, Specialize alone reads it
// and produces the monomorphic IR, and Go generation alone reads that.
export const internalModules = [
  { module: 'Domain.Checked.Internal',
    importers: /^Features\.(Check|Specialize)(\.|$)/ },
  { module: 'Domain.IR.Internal',
    importers: /^(Features\.Specialize|Format\.Go|Domain\.IR\.Parts)(\.|$)/ },
  // R0 tokens (T-R0a §3.1): only the trusted checkers mint Valid, Refuted,
  // NonForced and ForcednessEvidence; Domain.Verdict re-exports the types.
  { module: 'Domain.Verdict.Internal',
    importers: new RegExp('^(Domain\\.Verdict|Features\\.Check\\.('
      + 'Strategy\\.Substitution|Refute\\.Rules'
      + '|Admit\\.Forcedness\\.Check))$') },
  // Only generation builds a recorded problem (T-R0a §2 property 2).
  { module: 'Domain.Recorded.Internal',
    importers: /^(Domain\.Recorded$|Features\.Check\.Generate(\.|$))/ },
  // R0 Task 5.1: TheoremRef's constructor reaches only the hidden registry
  // Refute.Theorems (Domain.Verdict re-exports the type), SoundRule's only
  // Refute.Rules, and only Rules imports Theorems.
  { module: 'Domain.Verdict.Theorem.Internal',
    importers: /^(Domain\.Verdict|Features\.Check\.Refute\.Theorems)$/ },
  { module: 'Features.Check.Refute.Rules.Internal',
    importers: /^Features\.Check\.Refute\.Rules$/ },
  { module: 'Features.Check.Refute.Theorems',
    importers: /^Features\.Check\.Refute\.Rules$/ }
];
// A token Internal module's constructors must not leave it by re-export.
// The public module (Domain.Verdict, Domain.Recorded) re-exports types
// only, which purs emits no JS for, so any JS re-export from these
// modules, by any module, forwards a value: a constructor.
export const tokenModules = ['Domain.Verdict.Internal',
  'Domain.Recorded.Internal', 'Domain.Verdict.Theorem.Internal',
  'Features.Check.Refute.Rules.Internal'];
