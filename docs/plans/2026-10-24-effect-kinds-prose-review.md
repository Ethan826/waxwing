# Effect research: prose and source review

Draft read in full before editing: research.md, 2026-10-24. Applied the
Humanizer 3.1.0 loop and the humanized-prose-review skill, including the
Garner/Fowler/Orwell/Williams clarity pass. This records an editorial
review, not a correctness proof.

## Catalog before revision

| Exact passage | Finding | Revision |
|---|---|---|
| “The research supports a small, uniform language mechanism” | Sounds like the comparison selected a design. | Say sources supply established mechanisms and label the combination a candidate. |
| “External roots” | Unexplained abstraction. | Define roots as operations at the host boundary. |
| “No untracked bottom-like primitive” | Type-theory shorthand obscures the practical issue. | Say an untracked abort primitive cannot defeat the advertised guarantee. |
| “every actual language-level failure must be represented” in the reasoning behind the table | Could conflate internally handled failure and escaping failure. | Keep the explicit escaping/internal distinction and the unresolved policy question. |
| “future work (§9)” | Could conceal that the runners theorem omits unrestricted recursion. | State well-founded trees and recursion limit in the same paragraph as the result. |
| “Every row is published machinery” | Could suggest the candidate combinations are already published or verified. | Say the source mechanisms are published; every Waxwing adaptation still needs correspondence. |
| “effects are not independently verified semantics” | Must not be mistaken for a new accusation of a defect. | Label baseline facts as documented rules and distinguish compatibility from correctness. |
| “No compiler build, new oracle ... was run” | Risks obscuring the actual evidence obtained. | Explicitly say source reading and document checks are the evidence, experiments are proposed. |

## Final editorial pass

Keep tables: the rows compare independent properties and alternatives.
Keep the internal-versus-escaping contrast: it answers the author's actual
question. Keep the explicit no-adoption and no-experiment qualifications.
Keep code styling on effect names, types and identifiers. Language and
project names, including Effect, remain ordinary prose.

Check every source attribution against the cited section or returned
reader report. The coordinator independently read the central Effekt
purity example, Boxes' effect-safety statement and inference qualification,
the resource paper's scope, the multishot paper's reentrancy limitation,
Koka's exception/state/divergence claims, the effectful API, Unison's bug
page, the FFI resource declarations and the runners theorem's scope.

A reader's final bounded source review is recorded below when returned.
An initial attempt failed before execution because the inherited default
working directory no longer existed. No file read or policy decision
occurred. The coordinator supplied the correct working directory for the
same read; this was an infrastructure correction, not a permission bypass.

Final source review: no material issue found against the reader's Effekt
readings. It checked the contextual-purity distinction, Boxes' inference
qualification and theorem scope, the backend-specific reentrancy limit,
and the separation of candidate recommendations from policy. It did not
revalidate all other sources or audit the Waxwing implementation.
