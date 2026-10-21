# Prose review: README type system and proof results

Date: 2026-10-20. Review of the README draft after its factual update,
using the Humanizer skill and Garner's plain-English concerns under
AGENTS.md, docs/engineering.md "Prose review", and Claude memory
humanizer-for-readmes.md. The initial draft changed only README.md;
this note records the review before the prose rewrite.

## Catalogue 1: draft before rewriting

| Passage | Pattern | Reader consequence and revision |
|---|---|---|
| "One function works at several types; each use gets fresh unknowns, while its declared variables remain rigid inside its body." | Garner: unexplained jargon | Explain that the definition must work for every permitted type and each use is checked independently. |
| "extended with inhabitedness" | Garner: abstract noun and unexplained jargon | Explain the added handling of types with no possible values. |
| "The design combines ideas from PureScript, Haskell and Koka with strict execution and explicit contracts." | Humanizer section 25: repetition at document scale | The source table already names the relationships; state Rust's specific role without repeating the list. |
| "**Published foundations.**", "**Local contributions, proved in the research model.**", "**How the claims are checked.**", "**What remains open.**" | Humanizer section 19: repeated bold labels | Use ordinary subheadings where the distinctions help navigation. |
| "Existential call-site problems reduce to finitely many presence patterns" | Garner: unexplained jargon | Start with the operational question: whether a call's record requirements can be satisfied. |
| "A generic signature must hold for every permitted caller, not just one satisfying example." | Humanizer section 1: useful distinction, repetitive framing | Preserve the distinction by stating the universal requirement directly. |
| "The replacement foundation is not integrated into the compiler", "P9s has not been adopted", "The compiler as a whole is not formally verified" | Garner: scattered qualifications | Keep all three scopes, but group the integration and verification limits so readers can distinguish them. |
| "A solution exists does not mean the compiler may arbitrarily choose one split" | Garner: awkward nominal construction | Say the search may find several splits, then state the forced-or-written policy. |

## Factual changes, separate from the prose review

- Updated record patterns, single-spread extension, removal and written
  lacks constraints from planned to implemented, using ADR 013 and
  BACKLOG R004/R005. Open-row merge remains incomplete.
- Added the distinction between implemented rank-1 polymorphism and
  planned HKTs, classes and local generalization.
- Added published sources and the local Lean results, with the model's
  scope, theorem names, trust assumptions and reproducible build commands.
- Recorded the executable certificate checker as specified only. Compiler
  integration, signature completeness and split irrelevance stay open.

## Catalogue 2: rewrite

The full README was re-read after the rewrite. Findings in the new prose:

| Passage in the rewrite | Pattern | Resolution |
|---|---|---|
| "Robinson / Martelli–Montanari unification supplies the closed-type solving method" | Garner: compressed attribution | Name Robinson's unification and the Martelli–Montanari formulation explicitly. |
| "problem is accepted" followed on another line by "(`decideCall_correct`)" | Garner: awkward break | Keep the theorem name with its claim and wrap the following sentence. |
| "The proofs are in the separate [Lean project]" | Garner: needless words | State the project's Lean version directly. |

A final pass checked contrasts, repeated closers, lists of three, dash use,
bold labels, jargon and unsupported changes. Scope distinctions were kept:
compiler implementation versus research proofs, call-site decidability
versus signature soundness, semantic certificates versus the proposed
executable checker, and local contributions versus established novelty.
The remaining table compares genuinely parallel capabilities. Existing
README code examples, command blocks and link destinations are unchanged;
new research commands and references come from the proof README and dossier.
The factual-update phase added inline syntax examples separately from the
prose rewrite. Source titles and established names retain their punctuation.

## Validation

Documentation checks only, as requested by the author: width, whitespace
and local reference destinations. No npm commands or compiler tests.

## Website link and identifier follow-up

The site uses Jekyll/kramdown. The earlier width reflow put four link
reference destinations on continuation lines; kramdown rendered those
definitions as paragraphs. Keep each definition on one line, with no
space after the colon so long destinations remain a single token under
the width rule. The labels, destinations and prose remain unchanged.

Catalogue before the formatting change: fp-ts, ZIO, and the API names
Eq, Ord, Show appeared in ordinary prose styling. The author asked for
code styling for such identifiers, expressly excluding Effect. The
second review retains Effect as prose and checks that code spans are
limited to library/API identifiers. No technical claims or code examples
change in this follow-up.

Validation: reproduce the unresolved Wand reference with kramdown, then
render the fixed README and check every reference destination; width and
whitespace checks. No npm commands or compiler tests.
