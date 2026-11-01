# Working in Waxwing

Read README.md, docs/plans/bootstrap.md, docs/progress.md, and docs/findings.md
before changing code. The language is Waxwing. Finish the current
vertical slice before adding language features. Task tracking is local.

- Own every observed failure. Fix it or add a specific local BACKLOG.md item
  with evidence and a next action. Never hide a failure behind a rerun.
- Never disable checks, suppress warnings, skip tests, or weaken assertions
  to obtain green results. Demonstrate regression tests failing with the
  corresponding defect restored, in an isolated copy.
- Run `npm run verify` before reporting completion. Report what actually ran
  and distinguish verified behavior from proposed behavior. Report
  functional acceptance (routine `npm run verify`) and performance
  qualification (`npm run perf`: run or not run, its result and conditions)
  separately; never describe a perf check that did not run as passing
  (docs/engineering.md, "Verification contract").
- Keep Domain.*, Features.* and Format.* pure. Effects and foreign imports
  belong in Runtime.* and Program.*. Imports run only to the same or an
  earlier layer (Domain, Features, Format, Runtime, Program). Expected
  semantic failures are `Either Diagnostic`; error codes are an ADT.
- Parsing, resolved syntax, checked IR, monomorphic IR, and Go generation
  are distinct. Only checking and specialization (Features.Check*,
  Features.Specialize*) may import Domain.Checked.Internal; only
  specialization and lowering (Features.Specialize*, Format.Go*) may import
  Domain.IR.Internal. Keep both IRs' constructors behind those enforced
  module boundaries. Likewise only Domain.Verdict and the trusted checkers
  (Features.Check.Strategy.Substitution, Features.Check.Refute.Rules,
  Features.Check.Admit.Forcedness.Check) import Domain.Verdict.Internal,
  and only Domain.Recorded and Features.Check.Generate* import
  Domain.Recorded.Internal; the public modules re-export bare type names
  only, and Domain.Recorded adds `fields`, a read-only view (ruling R4).
  For D1 (R0 Task 7.1, docs/plans/r0-generation-continuation.md §3.1):
  only Features.Check.Elaborate imports Domain.Elaborating.Build; only
  Domain.Elaborating, its .Build and Features.Check.Generate.Elab
  import Domain.Elaborating.Internal; a Features.Check.Generate.*
  module is imported by Features.Check.Generate* only; only
  Generate.Elab and Generate.Gen import Generate.Elab.Internal; only
  Domain.Verdict.Judged and Features.Check.Decide import
  Domain.Verdict.Judged.Internal; only Domain.Verdict.Certified and
  Features.Check.Strategy.Substitution import
  Domain.Verdict.Certified.Internal (BACKLOG R026); only
  Domain.Verdict.EffectPackage and Features.Check.Strategy.Effects.Complete
  import Domain.Verdict.EffectPackage.Internal (A2, §18.145); only
  Domain.Verdict.EffectPackage and its .Internal import
  Domain.Verdict.EffectPackage.Types; no Runtime module imports
  Domain.Elaborating* or Features.Check.Generate*. Their re-exports
  keep the allowed form, and scripts/structure-elab.mjs pins their
  export lists (rule E6).
  Only Domain.Verdict and Features.Check.Refute.Theorems import
  Domain.Verdict.Theorem.Internal (`TheoremRef`), and only
  Features.Check.Refute.Rules imports Refute.Rules.Internal (`SoundRule`)
  and Refute.Theorems, naming `TheoremRef` there without constructors (a
  source scan, defence in depth with the compiled re-export check, not a
  guarantee).
  On the compiler's output, no module outside those importers imports a
  token Internal module's JS, and no module re-exports from one; no FFI
  JS outside them names one. No src module outside a reviewed
  allowlist (empty) uses a module in scripts/forgery.mjs
  `forgingModules` (Unsafe.Coerce, Record.Unsafe, invariant-breaking
  library Internal modules), and only the modules pinned with their
  signatures and file hashes in scripts/foreign-surface.json have FFI
  (re-pin: `node scripts/foreign-surface-pin.mjs`, a reviewed change).
  These stop accidental construction; deliberate use of library
  partiality (`undefined` at any type) is left to review. The allowed
  importers are trusted: their source and compiled exports are pinned
  in scripts/trusted-surface.json, and changing the pin (`node
  scripts/trusted-surface-pin.mjs`) is a reviewed change. The pin
  catches new surface, not a repurposed body, type or instance
  behind a pinned name, so every diff to an allowed importer needs
  token review.
  Review-required trusted surface (`Valid`'s soundness and its witness's
  rest on all of them; reasons in docs/engineering.md):
  `Features.Check.Strategy.Substitution`,
  `Features.Check.Strategy.Candidate`, `Features.Check.Strategy.Atoms`,
  `Features.Check.Strategy.Asked`, `Features.Check.GroundRule`,
  `Features.Check.Mentions`, `Features.Check.Spine`,
  `Features.Check.Decide.Open`, `Features.Check.Entailed`,
  `Features.Check.Entailed.Mgu`, `Features.Check.Entailed.Merge`,
  `Features.Check.Entailed.Triangular`,
  `Features.Check.Decide`, `Features.Check.Decide.Shadow`,
  `Features.Check.Decide.Reason`, `Features.Check.Decide.Reading`,
  `Features.Check.Strategy`, `Features.Check.Strategy.Online`,
  `Features.Check.Strategy.Witness`, `Features.Check.Strategy.HoleContract`,
  `Features.Check.Strategy.ReadBack.Type`, `Domain.Verdict.Certified`,
  `Domain.Verdict.Certified.Internal`, `Domain.Recorded.Atom`,
  `Domain.Recorded.Hole`; for A2 (the effect validator), every
  Features.Check.Strategy.Effects module as it lands
  (`Features.Check.Strategy.Effects.Complete`,
  `Features.Check.Strategy.Effects.Consume`,
  `Features.Check.Strategy.Effects.Dependency`,
  `Features.Check.Strategy.Effects.Equal`,
  `Features.Check.Strategy.Effects.Forced`,
  `Features.Check.Strategy.Effects.Handler`,
  `Features.Check.Strategy.Effects.Judged`,
  `Features.Check.Strategy.Effects.Malformed`,
  `Features.Check.Strategy.Effects.MalformedTerms`,
  `Features.Check.Strategy.Effects.Package`,
  `Features.Check.Strategy.Effects.Record`,
  `Features.Check.Strategy.Effects.RecordEntries`,
  `Features.Check.Strategy.Effects.RecordRefs`,
  `Features.Check.Strategy.Effects.Rows`,
  `Features.Check.Strategy.Effects.Sites`,
  `Features.Check.Strategy.Effects.Term`,
  `Features.Check.Strategy.Effects.Validate`),
  `Domain.Verdict.EffectPackage`, `Domain.Verdict.EffectPackage.Internal`
  and `Domain.Verdict.EffectPackage.Types`.
  Review-required lowering boundary (turns a `Judged` solution into checked
  IR; reasons in docs/engineering.md): `Features.Check.Elaborate`,
  `Domain.Elaborating`, `Domain.Elaborating.Internal`,
  `Domain.Elaborating.Build`, `Domain.Elaborating.Types`,
  `Domain.Verdict.Judged`, `Domain.Verdict.Judged.Internal`,
  `Domain.Verdict.Witness`, `Features.Check.Generate` with every module
  under it, and the helpers generation reads: `Features.Check.Holes`,
  `Features.Check.Walk`, `Features.Check.Implied`, `Features.Check.Tables`,
  `Features.Resolve.Builtin`, `Features.Check.Functional`,
  `Features.Check.Nested`, `Features.Check.NestedArguments`,
  `Features.Check.Components`.
- Prefer `where`, never `let … in`. A `let` inside `do` may depend on an
  earlier bound value. Name transformations passed to map/traverse/eliminators
  in `where`; no anonymous lambdas. Use `maybe`/`maybe'`/`either` for their
  respective types, with named helpers even when an arm builds a record.
  Computed Maybe fallbacks use `maybe'` to preserve conditional evaluation.
- Branch work belongs in named helpers. Public semantic formulas deserve
  their own tests; private parsing plumbing need not become a public API.
- Maintained source, tests, and tooling: 250 physical lines maximum, roughly
  100-line target. Comments and blank lines count. Generated output, locks,
  data fixtures, and generated-Go snapshots are excluded; maintained code
  disguised as a fixture is not exempt.
- Every .md, .mjs, .js and .wxw line is at most 80 code points, enforced by
  scripts/width.mjs in verify. Exempt: Markdown table rows, ATX headings,
  single-token or whole-link lines, bare URLs, and generated or vendored
  files (docs/engineering.md lists them). Reflow; never reword.
- PureScript: pinned purs-tidy, Unicode punctuation, 80 columns, final newline.
  Types/instances, constants, public functions, then private functions.
  Use explicit names; conventional compiler names Expr, IR, Ty are allowed.
  Name numeric constants except 0, 1, 2 and test data. Aim for at most
  30 lines, 3 nested decisions, 8 active branches, and 8 where bindings per
  declaration; split responsibilities rather than enlarge budgets.
- Inventiveness belongs in the composition of features, not the guts
  (ADR 014): compose published primitives, name each component's source,
  and flag novel machinery for the user's explicit approval.
- READMEs and explanatory docs get a prose review before and after
  rewriting (docs/engineering.md "Prose review"): catalog each finding,
  rewrite, re-review, and preserve facts, qualifications and voice.
- Comments explain reasoning. Update docs/engineering.md when a rule changes
  and distinguish automated enforcement from review conventions.
- Keep plan status, evidence, findings, ADRs, and backlog current in the same
  change. A chat message is not a durable handoff. No external publication,
  remote issues, or pushing unless explicitly requested.
- Reference projects are read-only except the specifically requested
  MileAhead guidance update. No reference code has been licensed for reuse;
  implement independently and record conceptual influence in provenance.
