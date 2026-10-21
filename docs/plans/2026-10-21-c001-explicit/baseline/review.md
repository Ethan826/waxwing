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
specialization-key audits passed. At that checkpoint the scoped runner still
exited 1 for the nine recorded expectations. The second author-review
corrections below supersede that runner contract; no full-suite pass was
claimed.

## Second author review: baseline gate and unknown types

The author reproduced the earlier data and identified three corrections. The
earlier nine-difference runner was an exploratory record, not an adequate
regression gate. A current-outcome manifest is now separate from the
original design-candidate expectations. Known TypeMismatch diagnostics and
interpreter parser errors are exact expected outcomes; new differences must
fail. Compiler, runtime and interpreter outcomes remain separate.

Humanizer/Garner catalogue before rewriting:

| Exact passage | Problem / reader cost | Rewrite |
|---|---|---|
| "Recommendation for decision 2: keep P001's existing hole discipline" | The experiments discard the unknown value; the recommendation gives them more weight than their observations justify | Say the observations are consistent with the existing discipline and do not settle policy |
| "The exploratory runner exits 1 with nine unmet original expectations" | Describes a historical limitation as the current checking contract | Explain that known outcomes are pinned and any new difference exits 1 |
| "The author then approved a separate bounded probe tranche" | Omits the actual message and can sound like a broader formal approval | Quote "Okay, do it" and identify the immediately preceding proposal and scope |

Additional bounded scope was written in unknown-plan.md before executing
h1-h3. The predicted function-stand-in rejection was confirmed. This is an
acceptance difference, not a different printed value in a successful run.
Int/Bool/Text/record cases print Nil. The discarded-value observations
remain acceptance evidence only. No unknown-type-independence theorem is
claimed, and a uniformity gate must fail on h1/h2.

The effects syntax finding now has its own author-facing note. Shared
backlog, progress, source and language-policy files remain untouched.

## Second-review validation

The independent reviewer found no failure-blending bug or substantive
false statement in the revised matrix, stand-in results or zero-payload
account. They checked the recorded 24/13/63/10 counts and the two
Function-stand-in rejections. They suggested rejecting unknown CLI flags
so a misspelled uniformity option cannot silently disable that gate. The
runner now exits 2 for invalid options; two CLI checks cover that behavior.
Eight result-record mutations remain separate from these option checks.

Humanizer/Garner re-review after rewriting preserved the acceptance versus
execution distinction, proposal limits and precise authorization quote.
The evidence now says consistent with current handling, not that the
experiments justify a new hole policy. Long edited prose lines were
reflowed without changing their claims. No further prose findings remained.

Final live run: baseline differences 0, with the two printing cases listed
as nonuniform; 63 Go executions and all 24 source hashes match their
expectations. Replay/sensitivity checks pass, including eight altered
result records and two invalid-option checks. The explicit uniformity
check exits 1 as expected. Width, whitespace, source-limit and 45 local
link checks pass. No npm verification or compiler implementation ran.
