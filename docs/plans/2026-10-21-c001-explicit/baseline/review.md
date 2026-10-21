# Baseline review and scope record

The original C001 request authorized bounded exploratory probes and an
independent reviewer. The later approval authorized this executable
ordinary-record baseline specifically. No compiler fix, record-solver
investigation, policy adoption or Lean work is included.

## Humanizer/Garner catalogue before rewriting

Applied the same Humanizer skill and Claude memory guidance used for the
parent design. Preserve output counts, admitted limitations and citations.

| Exact passage | Pattern / reader cost | Rewrite |
|---|---|---|
| "The baseline provides representative-independence evidence for these cases." | Abstract nominalization gives the reader no observation or limit | State that changing Int to Bool left eleven program outputs unchanged |
| "The blanket rejection of residual type metas is not needed for the three tested discarded/unused/phantom cases." | Compresses the distinction between a successful observation and a proposed rule | Name the three accepted cases and state that their observations do not motivate blanket rejection |
| "The runner uses a private Go cache and local toolchain, performs no installs or network access" | Overbroad environmental claim: the probe records commands, not every tool's behavior | Say it uses the private cache/local toolchain and needed no dependency download |

Rewrite these passages, then re-read all explanatory prose. Code, fixture
contracts, raw reports and diagnostic text are protected from prose edits.

## Evidence review

The initial twelve-case scope was frozen before execution. Additional
controls are explicit amendments made in response to observed results. The
harness and raw evidence retain failures and do not declare a green suite. A
private fresh compiler build and isolated Go cache avoid racing Claude's
output directory. Every committed file belongs to this tranche.

The early suggestion that lambda/generic typing might be broken was a
hypothesis, disproved by the all-stage-pure controls. The concrete-carrier
failure and the source's staged-row rules identify a contract translation
issue. No record-solver defect was demonstrated or investigated further. The
local backlog records diagnostic and interpreter-parser gaps for their
owners; the probe does not change those components.

## Independent adversarial review

The reviewer checked fixture/compiler-source hashes, output counts,
representative substitution and key observations against the retained
reports. They found four documentation errors, all corrected:

- c7's supplied carrier operations have both stages pure, but its
  constructed Stats result still has an ambient first stage. The report
  now names that limit and claims no full all-pure-core validation.
- The local effects design's syntax is §1 and typing/staged rows are §2.
  Corrected the section references against the document headings.
- `Hole` is an aggregate count. Only typeHoleOccurrences specifically
  counts TVar(Hole); the report no longer calls the aggregate row-only.
- The bounded multiplication helper supplies no full-domain evidence.
  Removed the unsupported assertion that it is unlawful/nonterminating.

No new compiler-soundness counterexample was reported. No mechanized
statement or language decision follows from this review.

## Humanizer/Garner re-review

Re-read the rewritten prose and review corrections. Reflowed long lines
introduced by edits; found no further prose issues. Counts, proposed versus
implemented distinctions, limitations and raw failures remain explicit. No
code or diagnostic text was altered as a prose rewrite.

Final re-review confirmed the four substantive corrections. It caught one
stale amendment label calling c7/c8 collectively all-stage-pure; narrowed
that label to carrier-stage controls. Historical raw reports retain their
original wording; the final report uses the corrected manifest metadata.
Final width/whitespace, relative-link, source-hash, result-count and
specialization-key audits passed. The scoped runner itself remains exit 1
for the nine explicitly recorded expectations; no full-suite pass is
claimed.
