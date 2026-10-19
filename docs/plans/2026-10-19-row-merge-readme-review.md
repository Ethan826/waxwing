# Prose review of the row-merge README draft

Status:
Review record, 2026-10-19, for docs/plans/2026-10-19-row-merge-readme-draft.md
under docs/engineering.md "Prose review for READMEs and explanatory
docs". The `humanizer` skill was loaded and its pattern list used for
the catalogue (patterns cited by its section numbers, §1-§26); the
plain-English concerns are Garner's as the convention lists them.

Catalogue 1 covers the draft as committed in 4d916c8 (before B0).
Catalogue 2 covers the rewrite. Content changes the user asked for in
the same pass (Z3's inherent against binding-specific costs; two
worked examples first; tables, fixture names and research labels moved
to a maintenance section; case 1g named with its provenance; no
"mechanism with nothing added") are listed apart, at the end, because
they change what the page says, not only how.

## Catalogue 1: the draft before rewriting

| # | Passage | Pattern | Why it weakens this text |
|---|---|---|---|
| 1 | "So the hard question is: when a merged row's parts are unknown, what can the checker work out on its own, and when must it ask?" | staged run-up (§4), saying-that-sounds-deep (§3) | The page's actual point (the checker solves only what one constraint decides) arrives a section later; this line announces a question instead of answering it |
| 2 | "The trouble starts when they do not:" | staged run-up (§4) | A transition that adds nothing; the example already shows the trouble |
| 3 | "Waxwing chose this over a cleverer checker (§3); the price is measured in §6." | one-line closer (§2) | Restates the section's point and points ahead; "cleverer" is a judgment the page does not support or define |
| 4 | Section headings "What programmers get", "What programmers give up", "What maintainers get" with bold-labelled bullets ("**Disjoint merges.**", "**Symmetric treatment.**", "**Less bespoke machinery.**") | bold as decoration (§19), forced triad of sections (§6) | The labels repeat the sentence after them; three parallel sections make costs read as a footnote to benefits |
| 5 | "It bought real things: …" / "It cost something harder to measure: …" | staged contrast (§1, split form) | The paired framing adds weight; the facts (what was accepted, what had no source) stand without it |
| 6 | "ADR 014 makes the trade explicit: inventiveness belongs in the language's design, while the implementation composes well-understood techniques" | not-X-but-Y (§1), saying (§3) | Paraphrases the ADR in slogan form; the reader needs the rule's consequence here (accept annotations to stay with published methods), not the motto |
| 7 | "\"QT-strict\" is PureScript's mechanism with nothing added" | inaccurate summary; jargon (Garner: unexplained jargon) | Wrong after B0 (case 1g is an adaptation); and "QT-strict" is a research label a reader cannot use |
| 8 | "**H: a useful contradiction instead of \"cannot tell\".**" | not-X-but-Y (§1) in a bold label (§19) | The heading sells the rule; the sentence after it already says what H does |
| 9 | "Nothing else improves a constraint: no rule combines two constraints, and no part is ever guessed." | clipped negative tail (§1), closer (§2) | Two negatives where one positive statement (the full list of rules) would do; "improves" is jargon left undefined |
| 10 | "S1 and Q1 are the cases to remember: …" | staged emphasis (§2) | Tells the reader what to remember instead of saying what was lost |
| 11 | "What it would not give us … ; it is a 34.6 MB WebAssembly module …" | inconsistent framing (Garner: points buried, distinctions blurred) | Mixes costs any SMT solver brings with costs of the one npm binding that was tested |
| 12 | "Adopting an *algorithm* means … It is not *installing a library*" | not-X-but-Y (§1) | The contrast is real and asked for, but its negative half is stated before the reason; lead with what Waxwing does |
| 13 | "This is **supported by measurement** on exhaustive small problem sets and millions of generated runs (§8); it is not proved." | bold decoration (§19), mild inflation (§13: "millions") | Keep the qualification; drop the bold; give the counts in the evidence section rather than a rounded boast |
| 14 | "The order in which the checker meets the arguments does not change the answer." | unsupported general claim at the point of use | The page's own rule is that order independence is measured, not proved; this sentence states it as fact |
| 15 | "fixture test/fixtures/r005b/diag-01.json", "fixture diag-16", "(fixture diag-11)" inside the tutorial sections | wrong reader (§26 at document scale), jargon | Maintainer references interrupt the explanation for the ordinary programmer the page is for |
| 16 | "(the expected text; this program's fixture, design-forced-bound, is accepted by the earlier design, and moving it awaits the user's approval)" | writing about the document (§25) | Project status inside a tutorial sentence; belongs in the maintenance section |
| 17 | Dashes: "2026-10-16 to -18", "research/purs-row- experiment" line split | dash and hyphen noise (§8, weak) | A date range and a broken path read as typos |
| 18 | "A person finds that by reasoning across both constraints at once. The checker's rules look at one constraint at a time …" | buried point (Garner) | The key sentence of the page (why an annotation is asked for) comes last in its paragraph, after a hypothetical person |
| 19 | "Before: … After: …" in "Waiting constraints" | label decoration (§19, weak) | Acceptable in a before-and-after example; kept, but the example is moved first |
| 20 | "rows the checker is trying to find for this one use, like the unknown `x` in an equation" | jargon clash | `x` is also a field name in every example; the analogy collides with the code |

## Catalogue 2: the rewrite, reviewed the same way

Findings in the first rewrite, each fixed in the committed text:

| # | Passage in the first rewrite | Pattern | Fixed how |
|---|---|---|---|
| 1 | "Reasoning across constraints … is what the earlier custom solver did, with rules no published system uses" | inflated claim (§13) | The evidence is that no published source was found; now "with rules for which no published source was found" |
| 2 | "It then applies these rules, and only these." | one-line emphasis (§2) | "Only the rules below change such a constraint.", a plain statement of the restriction the design depends on |
| 3 | "That is adopting an algorithm; it is not installing a library." | not-X-but-Y (§1) | "This adopts an algorithm without installing any library:" followed by the reason |
| 4 | "H runs after everything else, changes nothing, and never lets a program through." | forced triad (§6); vague ("lets through") | One sentence saying what H can and cannot change |
| 5 | Run-in bold labels for terms, rules, options and maintenance items | bold as decoration (§19) | Subheadings; bold remains only in the draft banner |
| 6 | "Usually the annotation only writes down the one typing" | unsupported frequency (Garner: claim without basis) | "In four of the six annotation cases checked that need one" |
| 7 | "(one family)", "(another)" beside the generated-problem counts | vague reference (Garner: abstract where a specific would serve) | The three families are named as three, the last as program-shaped |
| 8 | The Z3 costs in one sentence of six semicolon-separated clauses | buried point (Garner) | A list of what any integration leaves with Waxwing, then a separate paragraph for the tested binding |
| 9 | A path split across lines (`docs/adr/013-` / `records.md`) | typo-like break | The decision history is a list, each path whole |

A further read of the final text for §1-§8, §13 and §19 patterns and
Garner's concerns found none left in the prose. Kept on purpose: "Yet
the program has exactly one typing" (the contrast carries the point of
the example); "Waxwing accepts this cost on purpose" (a fact about the
decision, followed by its reason); the qualification that order
independence and symmetry are measured, not proved.

## Content changes made in the same pass (user, 2026-10-19)

1. Z3: costs inherent to any SMT integration (encoding Waxwing's rows
   and keeping it correct, field types and the ordinary unifier staying
   ours, the coNP-hard question and the "unknown" a time limit
   reintroduces, explanations that are formula sets, canonicalizing
   arbitrary models, and the foreign-import layering in this codebase)
   are separated from the costs of the tested binding (z3-solver 5.3.1:
   a 34.6 MB WebAssembly build, an asynchronous interface, about 35-70
   ms per problem with enumeration), which another binding need not
   share.
2. Two worked examples first (`apply2(merge, …)` waiting then solved;
   `both(merge, merge)` valid but needing an annotation).
3. The annotation table, fixture names, research labels (QT-strict,
   Sym, H as labels, S1, Q1) and commands moved to "For maintainers".
4. The mechanism is described as PureScript's cases 1-3 (borrowed, with
   line references), case 1g (Waxwing's adaptation: what PureScript
   does by matching a stated `Union`, done whenever nothing is unknown),
   Sym (approved adaptation) and H (approved, classification only).
5. Corrections carried over from B0: three-unknown rows and typed,
   nested rows are now checked in research form (with their limits); the
   order-independence sentence in the waiting example now says
   "measured".
