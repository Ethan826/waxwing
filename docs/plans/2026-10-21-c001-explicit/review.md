# Review record

Status: review of a proposal; no feature approval. The primary agent owns
all tranche files. A lower-cost read-only agent inventoried existing
printability/comparability and P001/FN001 constraints. An independent agent
was asked to find false statements, with separate soundness, completeness,
termination and law passes. Findings and dispositions are recorded below.

## Humanizer/Garner pass 1: catalogue before rewriting

Read the Humanizer skill and the repository's engineering prose-review rule.
Also read Claude's `humanizer-for-readmes.md` memory and related
proof/review guidance. Findings below refer to this tranche's first draft.
Code examples, source citations, qualifications and technical distinctions
are protected during prose edits.

| Exact passage | Pattern and reader cost | Rewrite |
|---|---|---|
| README: "The notation `D(C, T)` in the rules is a metavariable covering either choice." | Unexplained jargon: the author must translate "metavariable" before understanding the representation status | Say it is notation for whichever representation the author chooses |
| core: "Complete inference or principal schemes for full Waxwing are not claimed." | Buried point and abstract nouns; the reader has to infer the actual promise | State that the proposal checks written signatures, then retain the full-language limit |
| sources: "The proposal borrows translation structure, not its general entailment relation or coherence conclusion." | Contrast compresses two technical limits that deserve separate claims | State the borrowed rules and the two excluded claims directly |
| assurance: "A nominal evidence type must not evade that restriction by hiding a function payload." | Garner actor concern: whose responsibility is checking hidden payloads? | Name the future evidence checker and retain the payload warning |
| collections: "A future compatible-policy witness or abstract family type could admit it, but needs its own typing and preservation account." | Unexplained reference "it" asks the reader to recover raw merge from the preceding paragraph | Name structural merge explicitly |

Rewrites are applied only after this catalogue. Legitimate distinctions such
as typing versus laws and source versus target remain explicit; they answer
the user's actual requirements and are not decorative contrasts.

## Humanizer/Garner pass 2

Re-read all explanatory prose after the first rewrite and technical
corrections. The second catalogue found two remaining issues:

| Exact passage | Pattern and reader cost | Final edit |
|---|---|---|
| core: "For this small annotated core, require all generated type metas to be solved by the end of body checking" | Passive instruction leaves the checker implicit | Name the proposed checker and its rejection condition |
| README: "Both alternatives elaborate to products of monomorphic function values at each use" | Present tense could sound like implemented behavior | Say both proposed translations use that target |

Applied these edits, then re-read the result. No further prose findings
remained in that pass. Existing technical limits remain: proposed syntax,
structural phantom-carrier collapse in A, conservative annotation burden,
unproved preservation/completeness, and conditional collection invariants.
Code and citation targets were not changed by this prose pass. Reflowed
paragraphs without altering their meaning.

## Adversarial technical review

The independent reviewer found five concrete issues in the initial draft.
None demonstrated an inherent type-soundness failure of the core. Each
nevertheless required a correction before review by the author.

| Finding / pass | Counterexample or false claim | Disposition |
|---|---|---|
| Selection / N6 | A helper may ignore d and explicitly pass sum(); it is well typed | N6 now rejects only missing operands; user-written replacement chooses another program |
| Representation / completeness | A phantom `Tag(a)` with only `Unit -> Unit` fields loses its carrier in A | core states structural collapse; B keeps its index; general all-meta annotation boundary replaces dictionary-only provenance tracking |
| Attribution | Jones revised Figure 1 is in §2, evidence Figure 2 in §3 | Corrected prose and ledger against the linked primary PDF |
| Dynamic guarantee | A pure equality function can diverge | Lookup's Maybe guarantee now explicitly assumes termination |
| CBV evaluation | `foldFrom(loopingDictionary(),2,Nil)` diverges | Empty-fold claim now quantifies over dictionary values |

The meta-boundary revision deliberately narrows this annotated model; it is
not adoption of a new P001 hole policy. It needs the author's review. The
reviewer separately challenged specialization, collection invariants and
prior-art claims. They found no further counterexample in the first pass;
that is a review result, not a proof. Re-review of the corrections found all
five findings addressed and no new soundness counterexample. It requested
two final clarifications: relative completeness must include the all-meta
finalization condition, and the probe checks selected numeric and value-flow
observations rather than whole P1-P4 programs. Both are now explicit. The
Stats probe checks component results only, and the P4 probe checks
projections without a generic `both` helper.

## Checks and corrected failures

The bounded Python probe checks selected value-flow and collection
observations and detects two deliberately bad semantic transformations. It
does not parse Waxwing, decide typing, or establish a universal claim. Its
declared cases were written before execution. Results and invocation are in
handoff.md and probe-results.txt.

The width check initially passed, then failed on five lines introduced by
the first prose rewrite. Those lines were reflowed. A later technical edit
introduced more wide lines; those were also reflowed. Final check results
are recorded in the handoff. No warning or assertion was suppressed.

A final supplemental Python-source width check found a long probe docstring
line, which was reflowed. A guarded schema-table insertion also stopped
because prose reflow had changed its exact marker; the assertion prevented
any edit, and the corrected marker inserted the intended explicit method
signatures. Both checks then passed. Initial staging required filesystem
escalation for the worktree index in the original Git directory and
succeeded with only the explicit tranche paths.
