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
    importers: /^Features\.Check\.Refute\.Rules$/ },
  // R0 Task 7.1a, D1 spec §3.1. E1: only `elaborate` calls `build`. E2:
  // Elaborating's constructor reaches its two Domain modules and `seal`.
  // E3: every Generate.* module, by pattern, is importable by Generate*
  // only; the public Features.Check.Generate exports an allowlist. E4:
  // Elab, Gen and Handle's constructors reach Generate.Elab and .Gen.
  // E5: Judged's constructor reaches its public module and `decide`.
  // S10: no Runtime module (whose FFI could break a hidden constructor)
  // imports Elaborating or Generate*.
  { module: 'Domain.Elaborating.Build',
    importers: /^Features\.Check\.Elaborate$/ },
  { module: 'Domain.Elaborating.Internal',
    importers: new RegExp('^(Domain\\.Elaborating(\\.Build)?'
      + '|Features\\.Check\\.Generate\\.Elab)$') },
  { module: /^Features\.Check\.Generate\./,
    importers: /^Features\.Check\.Generate(\.|$)/ },
  { module: 'Features.Check.Generate.Elab.Internal',
    importers: /^Features\.Check\.Generate\.(Elab|Gen)$/ },
  { module: 'Domain.Verdict.Judged.Internal',
    importers: /^(Domain\.Verdict\.Judged|Features\.Check\.Decide)$/ },
  // BACKLOG R026: a strategy's acceptance pairs `Valid` with the witness
  // the same check built; only G0's check mints it, and its public module
  // re-exports the type with read-only accessors.
  { module: 'Domain.Verdict.Certified.Internal',
    importers: new RegExp('^(Domain\\.Verdict\\.Certified'
      + '|Features\\.Check\\.Strategy\\.Substitution)$') },
  // A2 (spec §2.4, §8; dossier §18.145): a `Completed` package is built
  // only by `complete`; the facade re-exports the type with a read-only
  // accessor. Named before Effects.Complete exists (plan Task 1).
  { module: 'Domain.Verdict.EffectPackage.Internal',
    importers: new RegExp('^(Domain\\.Verdict\\.EffectPackage'
      + '|Features\\.Check\\.Strategy\\.Effects\\.Complete)$') },
  // The package's types, split from the facade only because `Completed`
  // wraps them: every other module reads them through the facade.
  { module: 'Domain.Verdict.EffectPackage.Types',
    importers: /^Domain\.Verdict\.EffectPackage(\.Internal)?$/ },
  // Tranche 2 Task 12 (dossier §18.155 (5)): the online certificate
  // carries the package and nothing validates or completes it there.
  { module: /^Features\.Check\.Strategy\.Effects\.(Validate|Complete)$/,
    importers: /^(?!Features\.Check\.Strategy\.Online$)/ },
  { module: /^(Domain\.Elaborating|Features\.Check\.Generate)(\.|$)/,
    importers: /^(?!Runtime\.)/ }
];
// A rule names its module exactly, or by a pattern (E3, S10).
export const restricts = (rule, dependency) => (typeof rule.module
  === 'string' ? rule.module === dependency : rule.module.test(dependency));
// A token Internal module's constructors must not leave it by re-export.
// The public module (Domain.Verdict, Domain.Recorded) re-exports types
// only, which purs emits no JS for, so any JS re-export from these
// modules, by any module, forwards a value: a constructor.
// Task 7.1a adds Elaborating's and Judged's: neither has an instance, so
// no client's compiled JS needs theirs. Generate.Elab.Internal is not
// one: its Functor, Apply and Bind dictionaries are JS any client of
// `Elab` or `Gen` imports; E4 and E6 guard it from the source.
// A2 adds EffectPackage.Internal's: `Completed` has no instance, and the
// package's own types live in EffectPackage.Types, outside the token.
export const tokenModules = ['Domain.Verdict.Internal',
  'Domain.Recorded.Internal', 'Domain.Verdict.Theorem.Internal',
  'Features.Check.Refute.Rules.Internal', 'Domain.Elaborating.Internal',
  'Domain.Verdict.Judged.Internal', 'Domain.Verdict.Certified.Internal',
  'Domain.Verdict.EffectPackage.Internal'];
// Modules pinned in scripts/trusted-surface.json beside the allowed
// importers, though they import no token module: A2's package types,
// which the token `Completed` wraps (Task 1 review), and Effects.Package,
// whose frozen readings (`erase`, `settle`, `under`, `key`) every later
// A2 lane reads (Task 2 review); the A2 lane modules Task 11 composes,
// and Strategy.Witness, whose `bindingsOf` export Task 4 added (lane
// integration, 2026-11-01); Effects.Forced and Effects.Judged, which
// feed `complete` and `validate` (whole-branch review, 2026-11-01);
// Effects.Arity and Effects.RecordArity, the arity checks (§18.148 (1));
// Effects.RecordCompanions, record validation's check 4 (dossier
// §18.148 (2)); Effects.RecordDuplicates, check 6 (§18.155 (2)). The
// pin sees their export names and compiled exports, not a type synonym's
// record shape or a signature.
export const pinnedSurfaces = ['Domain.Verdict.EffectPackage.Types',
  'Features.Check.Decide.Reading', 'Features.Check.Decide.Reason',
  'Features.Check.Strategy.Effects.Arity',
  'Features.Check.Strategy.Effects.Consume',
  'Features.Check.Strategy.Effects.Dependency',
  'Features.Check.Strategy.Effects.Equal',
  'Features.Check.Strategy.Effects.Forced',
  'Features.Check.Strategy.Effects.Handler',
  'Features.Check.Strategy.Effects.Judged',
  'Features.Check.Strategy.Effects.Malformed',
  'Features.Check.Strategy.Effects.MalformedTerms',
  'Features.Check.Strategy.Effects.Package',
  'Features.Check.Strategy.Effects.Record',
  'Features.Check.Strategy.Effects.RecordArity',
  'Features.Check.Strategy.Effects.RecordCompanions',
  'Features.Check.Strategy.Effects.RecordDuplicates',
  'Features.Check.Strategy.Effects.RecordEntries',
  'Features.Check.Strategy.Effects.RecordRefs',
  'Features.Check.Strategy.Effects.Rows',
  'Features.Check.Strategy.Effects.Sites',
  'Features.Check.Strategy.Effects.Term',
  'Features.Check.Strategy.Effects.Validate',
  'Features.Check.Strategy.Witness'];
