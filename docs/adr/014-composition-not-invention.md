# ADR 014: Inventiveness in composition, not in the implementation

Status: accepted (user, 2026-10-18).

## Context

Waxwing is designed by its author and largely implemented with LLM
assistance. The author wants to claim authorship of the language and its
implementation while acknowledging that LLMs contributed to the code. R005
Tranche B (open-row merge) exposed a risk to that: its planned solver had
grown novel machinery (a sum rule, per-unknown upper bounds, quiet
equations, a bespoke drain and incompleteness policy) that was extensively
tested but had no published source, and that the author could not
independently evaluate.

## Decision

1. **The language's distinctiveness lives in its composition of features**
   and in the problems that composition solves, problems other languages
   only partly solve. Syntax and semantics may be bespoke.
2. **The implementation composes relatively well-understood computer
   science primitives**: published algorithms and type-system frameworks
   (for example Hindley–Milner-style unification, qualified types with
   predicates and improvement, Maranget's usefulness algorithm, Koka-style
   effect rows, Rémy/Leijen rows). Each checker or solver component names
   its source in its design document or ADR.
3. **Black boxes are ones in use elsewhere.** A component no one can
   explain from its source must be a widely used one, not a novel one.
4. **Novel internal machinery needs a stated reason** and the author's
   explicit approval, after a design document has offered the textbook
   alternative and its cost (for example extra annotations). Accepting
   some annotation burden to stay with a standard mechanism is the default.
5. **Assurance** is a proof, or extremely robust testing (oracles against
   independent references, exhaustive small domains, executable fixtures),
   under the evidence rules in docs/engineering.md.
6. **The implementation is explicable**: documentation explains each
   component in terms of its source, so the author can account for it.

## Consequences

- Designs map each solver or checker piece to its published source before
  planning; anything without one is flagged as invented.
- R005 Tranche B is re-planned on qualified types with row predicates
  (docs/plans/2026-10-18-row-merge-qualified-types.md), replacing the custom
  merge solver; Tasks 1-4 are kept where they fit the standard mechanism.
- Existing components may be audited against this principle (proposed,
  not yet authorized): coverage (Maranget) and effect rows (Koka) already
  name their sources; FX008's marks and effect-settling rounds should be
  checked.
- docs/provenance.md continues to record conceptual influence; it does not
  license copying code.
