# Charter scoping map: type-system milestones (2026-10-24)

Planning item 1, approved by the author 2026-10-24. An independent read-only
agent wrote this map from the charter, the adoption record, the probe results in
this directory (README.md, cited as "probe README"), the milestone plans and the
backlog. The coordinating session checked a sample of its citations and stored
it reflowed but otherwise unchanged. Docs only: nothing here decides a milestone
design or authorizes work. Each suggestion is a proposal for the author.

Sources: charter docs/waxwing-charter.md (principles C1-C8, lines 61-179);
adoption record docs/plans/2026-10-24-charter-adoption.md. Line numbers refer to
this branch at cf03706.

Branch notes:
- The C001 design branch named in the handoff, `design/c001-explicit-evidence`,
  does not exist locally; `origin/checkpoint/design-c001-explicit-evidence`
  does, and its `docs/plans/2026-10-21-c001-explicit/` files equal the copies on
  main (60f9daa). A later unmerged local branch, `c001-rulings-2026-10-23`
  (391cb81), adds "Author rulings, 2026-10-23" and `evidence.md`; read through
  `git diff` only.
- The R005 backlog row and the R005B plan files are identical on main and
  r005b-replan; main carries rebased copies of the r005b-replan commits (for
  example 7d79ae6, b234887).

## INF001: inferred requirements and errors

1. **Programmer problem.** A named function must spell out every service and
   failure family it uses. Omitting the row fails (R5-union-omitted: E_EFFECT
   `both performs Database, which its signature does not allow`). Parameter
   types are mandatory (R9: E_SYNTAX `Expected ':'`). A union of two service
   rows cannot be inferred. A combinator over two callbacks with distinct
   written rows is refused (R7a). Construction and use stay separate only
   through a hand-written constructor pattern (C2b, C2d, C2g).
2. **Charter.**
   - C1: the business operation should read in terms of capabilities and
     failures, without spelling out the row.
   - C2: requirements percolate upward; construction failures belong to
     construction (charter lines 69-82; mirrors INF001 A4 and A7).
   - Purpose: no "repetitive dependency passing" (lines 13-16).
   - Lineage: record and effect rows need separate rules (lines 43-49).
   - C3: a new Layer abstraction "needs its own justification" (milestone
     §Baseline).
   - C8: soundness, principality and completeness are separate claims.
3. **Published foundations, as recorded**
   (docs/plans/2026-10-22-inference-foundations-assessment.md §1 table, lines
   121-156):
   - Sulzmann, Odersky, Wehr, *Type Inference with Constrained Types* (HM(X)),
     1996; Odersky, Sulzmann, Wehr, TAPOS 5(1), 1999.
   - Pottier and Rémy, *The Essence of ML Type Inference* (EMLTI), ATTAPL ch.
     10.
   - Jones, *Simplifying and Improving Qualified Types*, FPCA 1995.
   - Vytiniotis, Peyton Jones, Schrijvers, Sulzmann, *OutsideIn(X)*, JFP draft
     2011.
   - Leijen, *Koka: Programming with Row-polymorphic Effect Types*,
     MSR-TR-2013-79.
   - Also cited: Koka POPL 2017 (rows O16, O56, O58); Pottier ICFP 2014 (O18);
     Effect Layers docs (milestone §Sources). The README's "Planned
     capabilities" table cites HM(X) and EMLTI.
4. **Open decisions.**
   - Inference surface (milestone "Design alternatives", lines 145-164): A, an
     explicit inference marker on named declarations (recommended there); B,
     infer when the own row is omitted, changing the ambient-row contract; C,
     keep named rows and infer only lambdas (the baseline; does not satisfy A1).
     Nothing selected.
   - What INF001 promises (assessment §14 Q1, lines 932-948): soundness only,
     principality when it succeeds, and/or a documented acceptance boundary.
     Partly decided by D2 (EMLTI order via encoding (a)); the rest open.
   - Complete inference, O12 (row 773): A, an explicit non-goal; B, a separate
     claim stated later.
   - A residual relationship the signature language cannot express (§14 Q2): A,
     widen `where`; B, an internal-only scheme language; C, refuse to
     generalize; D, require an annotation.
   - IF2 framework hypotheses (§14 Q3): A, stated in Lean first; B, a reviewed
     prose argument for the first design. "Not decided by §18.69."
   - Failure payload identity, B5 (milestone lines 118-124): how `Fail(a)` and
     the shared key for `Fail(Error(Int))`/`Fail(Error(Bool))` are treated.
   - FX020's requirement to alias or import without writing the inferred row
     (BACKLOG:20); mechanism open.
   - Provider selection machinery is not decided (adoption lines 33-36); named
     here only as open.
   - The author decides all of these (charter Scope; extension §10).
5. **Dependencies.** R005B/R0: the scheme language and instance order (IF4, O24)
   rest on record composition. M001: B1 needs public inferred interfaces.
   C001/R001: coordinate on service records and instance values (milestone line
   44). Outside this list: FX007, CF001, FX008 marks (B7).
6. **Adoption examples.** Construction/use (adoption line 59) is A3, A4 and A9;
   rows/email "two service computations combined" (line 60) is A1. Probe rows:
   R4, R5, R5b, R6, R7a, R7b, R7c, R9, C2b, C2d, C2e, C2g.
7. **State: planned (requirements reviewed, design not started).** BACKLOG:20
   "Defined; design next"; assurance register row 48 "Requirements reviewed;
   design next"; extension §10 (D1-D6 decided 2026-10-22); IF1-IF8 await
   statement review (assessment §12).

## K001: kinds and HKTs

1. **Programmer problem.** A programmer cannot abstract over a type constructor
   such as `List`, so generic `Functor`/`Monad` APIs are unavailable (README,
   "Planned capabilities and their foundations"). Kinds are implicit; an
   unconstrained row defaults to an effect row, and R8c shows the two sorts kept
   apart. Effects cannot take record-row parameters (BACKLOG R009, line 41).
2. **Charter.** Lineage: native higher-kinded abstraction instead of library
   encodings (lines 32-34, 37-41). C3: a small language with capable libraries,
   so Functor and Monad live as library code. C8: published kinding first.
3. **Published foundations, as recorded.** Row O59 (assessment line 823): Jones
   FPCA 1993 Thm 1 (kind-preserving mgu), §4.1-4.2; Koka 2017 Fig. 1; status
   "argued", and Jones's Thm 1 "is not shown to apply" to two row sorts. README:
   [kind-inference] Haskell 2010 report ch. 4; [constructor-classes] Jones
   FPCA93. Register row 46 still asks to "name a precise published
   kinding/unification account".
4. **Open decisions.**
   - Generic-method representation (README, after the planned table): A, an
     established encoding; B, constructor-class machinery; C, explicitly
     polymorphic methods.
   - Record-row parameters for effects (R009): A, a sort declaration; B,
     inference.
   - Row-sort defaulting: A, keep the shipped default to effect rows as a local
     rule under ADR 014; B, follow a published default once the correspondence
     note exists (O59 next action: "K001 source-correspondence note").
   - Deciders not recorded beyond the author and the assurance gate
     (BACKLOG:29).
5. **Dependencies.** Unblocks C001's higher-kinded interfaces (c001-rulings
   ruling 1: "Functor, Monad still need K001"); SCH001 (an
   interpreter-parametric encoding may need more than rank-1; schema direction
   lines 102-106); FX006's List/Stream monad alternative (BACKLOG:117 item 6).
6. **Adoption examples.** Neither uses K001 directly. Probe rows: R8, R8b, R8c
   (row sorts).
7. **State: planned, no design document.** BACKLOG:29; register row 46 "source
   correspondence still to write".

## C001: explicit instances and dictionaries

1. **Programmer problem.** A programmer cannot pick between two behaviours at
   one type (sum and product at `Int`) without wrappers. `show` and
   `Console.print` are compiler-provided, "a temporary gap until C001"
   (docs/language.md lines 389-391; ADR 012 line 195). No probe targets C001;
   R8b and C2d show records of operations already work as service records.
2. **Charter.** C3: no special status for Eq/Ord/Show, and C001 is the recorded
   follow-up for the `show` gap (C3 lines 97-100; effect-namespaces design lines
   178-183). C4 and C7: interface checking is not law checking (C001 README line
   36: "No law follows from record shape"). C8. Lineage: fp-ts.
3. **Published foundations, as recorded**
   (docs/plans/2026-10-21-c001-explicit/sources.md lines 9-60): Jones, *A theory
   of qualified types* (revised), §2 Fig. 1, §3 Fig. 2; Jones, *Coherence for
   qualified types*, RR-989, §1.1, §1.3, §5-7; fp-ts Semigroup, number,
   ReadonlyMap and Ord pages; OCaml 5.3 Map.Make and Set.Make. Register row 49:
   "qualified types and dictionary translation". c001-rulings ruling 6 (branch
   only): "The published basis is Jones's qualified types (evidence passing)".
4. **Open decisions.**
   - Unknown-type and ambiguity rule, held open by the author (C001 README
     ruling 2, lines 56-61; handoff lines 96-99): A, every type meta must be
     solved (not adopted); B, an operation-specific boundary saying which
     stand-ins are admissible; C, any stand-in is harmless (explicitly not
     adopted on the rulings branch).
   - Source representation: A, operation records (selected); B, dedicated class
     evidence (deferred; README lines 48-50).
   - Structural reuse of collections: deferred "pending a compatibility witness
     design" (ruling 3).
   - Rulings branch only: operator and default-selection sugar "decided
     separately" (ruling 4); pure-stage syntax kept as current semantics with a
     follow-up syntax comparison requested (first-core decision 5).
5. **Dependencies.** K001 for HKT interfaces. M001: representation hiding before
   production invariant-sensitive collections (ruling 2; README lines 79-81).
   R0/R005B: parameterized data is "an R0 switch prerequisite", but finishing
   R0's switch first is "a practical preference, not a prerequisite" (ruling 7);
   the design is kept "independent of unfinished record-solver internals"
   (handoff line 101). Unblocks SCH001 and the explicit-dictionary libraries.
6. **Adoption examples.** Fake replaces database (adoption line 61, C4), partly.
   Probe rows: R8b, C2c, C2d.
7. **State: designed.** Direction author-approved 2026-10-21, on main (60f9daa).
   The 2026-10-23 rulings (documentation corrections, three assurance arguments)
   exist only on unmerged `c001-rulings-2026-10-23` (391cb81). No implementation
   authorized. BACKLOG:30 still says "Planned".

## R001 / R005B: records and open-row merge

1. **Programmer problem.** Open records work today (R1, R1b, R8), but two open
   records cannot be merged: merge stops at E_INTERNAL `R005B placeholder`
   (docs/language.md lines 940-951); the probes did not try it. Local lambdas
   are monomorphic and cannot bind row variables (R2, R2b, R2c).
2. **Charter.** Lineage: rows are the bridge; record and effect rows need
   separate rules; row polymorphism is not structural subtyping (lines 43-49).
   C1. C8 and ADR 014 (R005B is the case that prompted ADR 014, lines 9-14). C3.
3. **Published foundations, as recorded.** ADR 014 Consequences: "qualified
   types with row predicates" (lines 47-49).
   docs/plans/2026-10-18-row-merge-qualified-types.md §1 (lines 128-152): Rémy
   [R94]; Gaster and Jones [GJ96]; PureScript `Prim.Row.Union`/`Lacks`; Ur/Web
   `[r ~ s]` (Chlipala); Jones 1992, 1994, 2000. README: Gaster and Jones
   (96-3.pdf). Assessment: EMLTI (including Sulzmann 2000 as cited there) and
   the O24 note.
4. **Open decisions.**
   - R005B gates (BACKLOG:35): L1, termination for cyclic predicate graphs
     (blocks B3); L2, solving-time diagnostics (needs a stable-location
     proposal). B2 onward not authorized.
   - R0 (dossier §18.69-18.71; docs/plans/2026-10-22-r0-implementation-plan.md
     §3): G-switch decided as A now (shadow), E as the destination; live switch,
     live refutation, Phase 6 and D1 implementation unauthorized. G3 split: A,
     forcedness only (current); B, a restricted C8-J selection after interfaces
     stabilize (D3). Guards deferred (D4). IF4 scheme language L0, L1 or L2 open
     (extension §10 D2).
   - The author decides.
5. **Dependencies.** Unblocks INF001's scheme-language and principality claims
   (O10, O11, O24), C001's parameterized-data acceptance under R0, and SCH001
   (records for domain values). Depends on none of the others in this list.
6. **Adoption examples.** Rows/email (adoption line 60). Probe rows: R1, R1b,
   R1c, R2, R2b, R2c, R3, R3b, R3c, R8, R8b, R8c.
7. **State.** R001: done in practice (records ship on main in
   src/Features/Check/Record.purs, UnifyRecord.purs, Lacks.purs; R1 and R8
   accepted on the main build), though BACKLOG:33 says "not merged". R005
   Tranche A: done (fedb8ff). R005B: QT-strict + Sym + H adopted 2026-10-19;
   only B1 authorized (BACKLOG:35). R0 pipeline: plan 2026-10-22; first shadow
   tranche authorized in dossier §18.71 (lines 5568-5600); work on unmerged
   branches `r0-shadow-tranche-1` (8752aa5, 77 commits ahead of main) and
   `r0-t2-*` (tips only examined).

## M001: modules and abstract types

1. **Programmer problem.** No modules, imports or exports: "Every program is one
   file" (docs/plans/2026-10-08-polymorphism-design.md lines 27-28). Assembly
   cannot be named or selected; it is hand-nested `with` (probe README).
   Invariant-sensitive collections cannot hide their representation (README,
   "Planned capabilities").
2. **Charter.** C2: lower-level components cannot name the higher-level ones
   that assemble them (lines 78-80). C4: assembly chooses providers. C5: imports
   must not silently install providers (modules direction line 35, "imports with
   no hidden runtime initialization"). C6: abstract domain types. C3: compare
   existing mechanisms before adding functors.
3. **Published foundations, as recorded.** Row O60 (assessment line 824): Dreyer
   et al., POPL 2007, canonical modules (p. 6) and `using` scope; status
   "unresolved". Modules direction §Primary sources (lines 130-144): PureScript,
   Rust, OCaml, TypeScript and GHC documentation, not papers. Register row 52:
   "an identified standard module discipline", not yet named.
4. **Open decisions** (modules direction lines 33-44, 79-84, 125-128):
   - Implementation composition: A, ML signatures/functors; B, existing
     records/classes/handlers ("Do not add ML functors automatically").
   - Collection policy identity: A, retained dictionary; B, type-level
     identity/witnesses; C, abstract module types.
   - Export, re-export and visibility rules.
   - Stable binary separate compilation: deferred.
   - Ownership split: M001/PKG001 type identity, C001/R001 dictionaries, STD001
     laws (line 125).
5. **Dependencies.** Coordinates with C001, R001 and PKG001 (BACKLOG:56).
   Unblocks INF001 B1, C001 production collections and SCH001 opaque domain
   types (schema direction line 150).
6. **Adoption examples.** Construction/use, the assembly side (adoption line
   59). Probe rows: structural only.
7. **State: planned, direction only.** BACKLOG:56; register row 52 "Direction
   only".

## I001: foreign-function interface (JavaScript first, then Go)

1. **Programmer problem.** Handlers can only return fixed values: "Connecting
   them to external services needs planned typed FFI bindings" (README,
   "Dependencies as effects"). Foreign values are not validated
   (docs/language.md lines 178-182). No probe touches FFI.
2. **Charter.** C4: a foreign wrapper fulfils a platform contract; distinguish
   targets from host capabilities (lines 110-115). C7: a foreign parser that can
   throw; unchecked boundaries. C5. Scope: ADR 015 keeps JavaScript first (lines
   189-191).
3. **Published foundations: none recorded** for I001. Register row 55 ("Backend
   lowering and FFI") names no paper; Leroy (O51-O53) is assigned to J001.
4. **Open decisions.** The abort/callback boundary (BACKLOG:66): A, aborts may
   not cross foreign frames; B, adapters re-raise. JS callbacks,
   async/cancellation, foreign errors and boundary parsing all still need design
   (BACKLOG:66; ADR 015 lines 66-69). Ingress must cover record fields
   (BACKLOG:66, R001 note). Deciders not recorded.
5. **Dependencies.** Unblocks SCH001 (foreign ingress, schema direction line
   150). Constrains FX006: no continuation capture across a foreign frame
   (BACKLOG:117). Outside the list: J001, PKG001.
6. **Adoption examples.** Neither main example; closest are "A foreign parser
   can throw" (adoption line 63) and the live side of construction/use. No probe
   rows.
7. **State: planned.** BACKLOG:66 (ADR 015 amendment 2026-10-20).

## FX006: general resume (`ctl`)

1. **Programmer problem.** `ctl` and `resume` are reserved but unsupported, so
   user schedulers, async libraries, generators and search handlers cannot be
   written; the diagnostic differs by position (BACKLOG:117; docs/language.md
   line 332). No probe touches it.
2. **Charter.** Lineage: Koka, Unison and Effekt handlers; "Borrowing a
   mechanism does not transfer another language's theorems" (lines 51-57). C3:
   schedulers and async as libraries. C5: runtime semantics stay
   language-defined. Scope: a backend must not determine semantics (line 191;
   BACKLOG:117 constraint 1, "Language before target").
3. **Published foundations, as recorded.** Row O57 (assessment line 821): Koka
   2017 §5, selective CPS with LAM-DUP, "with no correctness theorem". CF001 §12
   (docs/plans/2026-10-09-concurrency-foundations-design.md lines 774-806):
   Sivaramakrishnan et al., PLDI 2021 ("not re-verified"); Leijen TyDe 2017.
   BACKLOG:117 cites OCaml 5's one-shot choice with "verify before citing".
4. **Open decisions** (BACKLOG:117; ADR 010 lines 75-77):
   - Resume multiplicity: A, at most once, enforced statically (current
     recommendation); B, multi-shot as an additive per-operation, row-visible
     label; C, a global multi-shot switch (excluded).
   - CPS confinement: A, a conservative reachability analysis; B, bounded
     row-aware re-specialization; C, Koka's LAM-DUP (O57).
   - `defer` under multi-shot: A, an R0-style restriction; B, Koka-style
     `finally`/`initially`.
   - Decider: "a design note settling (1) and (2) with the user" (BACKLOG:117).
5. **Dependencies.** CF001 §10 list, FX002, FX003 (outside this list). I001: no
   capture across foreign frames. K001/C001: the monad alternative for
   multi-shot use cases.
6. **Adoption examples.** Neither; "Logging/tracing is added to concurrent work"
   (adoption line 64) is adjacent. No probe rows.
7. **State: planned, blocked on that design note.** BACKLOG:117; ADR 010 lines
   137-139, 193-195.

## SCH001: schemas and boundary parsing

1. **Programmer problem.** No first-party way to parse boundary input into an
   invariant-preserving domain value and reuse the description for generators
   and shrinkers (schema direction lines 15-22). No probe touches it.
2. **Charter.** C6, the direct home (lines 131-142). C3: library code versus
   compiler derivation. C7: an arbitrary predicate does not supply a decoder
   (adoption line 62). C8.
3. **Published foundations, as recorded.** Schema direction §Sources (lines
   164-181): Effect v4 Schema docs, schemata-ts, io-ts Schema/Schemable,
   Kiselyov's tagless-final overview, ZIO Schema; all documentation or overviews
   ("Pin repository revisions ... in focused design"). The charter cites "Types
   as axioms" (line 138).
4. **Open decisions.** Representation (schema direction lines 102-104; adoption
   step 6): A, a schema syntax tree; B, a Schemable/dictionary encoding.
   Support: A, library only; B, compiler-assisted derivation (lines 108-110).
   Wire formats: A, derived from ADTs/records; B, explicitly authored (lines
   111-112). Errors: A, accumulate; B, fail fast (line 117). The SCH001
   decision-note pilot is deferred and not authorized (adoption lines 91-96).
5. **Dependencies.** C001, K001, M001, I001, R001 (schema direction lines
   149-152; BACKLOG:63).
6. **Adoption examples.** "A parser builds a domain value from JSON" (adoption
   line 62); neither probed example. No probe rows.
7. **State: design needed, no implementation authorized.** BACKLOG:63.

## Sequencing (proposal, not a decision)

| Milestone | Depends on (in this list) | Unblocks | Suggested order and reason |
|---|---|---|---|
| R005B / R0 | none | INF001 scheme claims; C001 parameterized-data acceptance; SCH001 | 1. Already authorized and in progress (§18.71); INF001's principality wording waits on IF4/O24. |
| C001 (explicit core) | K001 for HKTs only; M001 for production collections only | K001 interfaces; SCH001; libraries | 2, in parallel with R0. Designed, and independent of record-solver internals (handoff line 101). |
| K001 | none | C001 Functor/Monad; SCH001; FX006 alternatives | 3. Standard rules suffice (register, "Proof priorities"); C001 HKT work needs it. |
| M001 | C001, R001 (coordinate) | INF001 B1; C001 collections; SCH001; the C2 assembly story | 4. Several milestones need it, and only direction exists. |
| INF001 | R005B/R0, M001, C001 (coordinate) | probe gaps R5, R7a, R9 and the C2 workaround | 5 for implementation. Design could start earlier: the backlog says "design next", and it addresses the largest share of probe gaps (inferred). |
| I001 | none (J001, PKG001 outside the list) | SCH001 ingress; FX006 constraint | Parallel track; backend-led, not type-system-led (ADR 015). |
| SCH001 | C001, K001, M001, I001, R001 | none in this list | 6. Prerequisites first; the pilot is deferred. |
| FX006 | I001; CF001/FX002/FX003 (outside the list) | user schedulers and async | Last. Blocked on the multiplicity design note and the CF001 §10 list. |

## Where F1-F4 belong

| Finding | Placement | Basis |
|---|---|---|
| F1: closed clause-row handler type cannot be installed | New backlog item in the FX017/FX028/FX007 family; bears on INF001 A3/B8 and the C2 provider pattern | FX028 (BACKLOG:150) has the same opaque `both end in ...` text for another case; the `Handler(nofail Log)` trap is documented at docs/language.md lines 481-483, F1's clause-row form is not |
| F2: missing-dependency notes blame the wrong code | New backlog item for diagnostics provenance; INF001 A10 requires "useful source origins" | Regression row `fx-provenance` (scripts/regression-fx.mjs:69); docs/engineering.md:604 "Blame needs evidence"; assessment row O54 (Haack-Wells) |
| F3: field-type mismatch reported as whole-shape mismatch | New backlog item beside E018 and E019 (R001 diagnostics); either the behaviour or docs/language.md lines 849-850 changes, the author chooses | E018 (BACKLOG:111) and E019 (BACKLOG:112): same shape-template class, other triggers |
| F4: README "Records" reads as always requiring `where r lacks` | Documentation fix to README line 189; no milestone | R1b; see also the stale docs/language.md:846 below |

## Disagreements and gaps between docs

1. **R001 status.** BACKLOG:33 (and lines 8-11) says "First tranche done on
   branch `records` (2026-10-14; not merged)". Records ship on main
   (src/Features/Check/Record.purs and others; R004 fast-forwarded at 2ca49ab;
   R005 Tranche A at fedb8ff), and R1/R8 are accepted on the main build.
2. **C001 status.** BACKLOG:30 says "Planned" and register row 49 "Direction
   only; no resolution algorithm selected";
   docs/plans/2026-10-21-c001-explicit/README.md lines 3-7 say "author-approved
   design direction". The 2026-10-23 rulings are only on unmerged
   `c001-rulings-2026-10-23`.
3. **Aliases and the first dictionary core.** README "Further language work"
   item 2 and the "Transparent type aliases" row reflect the 2026-10-23 alias
   ruling (first-core decision 1), which is not on main; BACKLOG R008 (line 40)
   still says "Later".
4. **R0 is missing from the backlog.** README "Scope and unfinished work" says
   "A replacement record checker is being integrated", and §18.71 authorized the
   first shadow tranche, but BACKLOG has no R0 row, and the R005 row
   (BACKLOG:35) does not say how the QT-strict B-tasks relate to the R0
   pipeline.
5. **Written lacks.** docs/language.md:846 says "Lacks constraints cannot be
   written yet (BACKLOG R005)"; the same file (lines 891ff, 922-929) and README
   line 189 say `where r lacks` is implemented (Tranche A).
6. **Field-mismatch text.** docs/language.md lines 849-850 say field mismatches
   read `Expected Int, found Text`; R3b observes a whole-shape text (F3).
7. **Probe outputs (fixed).** The probe README said exact messages were in
   `out/`, but C2a-A1, C2a-A2, C2f-A1 and R9 had none; the coordinating session
   captured them on the same build, matching the table.
8. **Stale INF001 prerequisite.** BACKLOG:20 and the milestone doc (line 43) say
   "Finish FX008/FX001 first"; both are Done (inferred stale, not
   contradictory).
9. **INF001 and records (inferred tension).** The milestone (lines 46-48) says
   not to make record syntax a prerequisite "without a demonstrated need"; the
   foundations assessment ties INF001's principality and scheme language to
   record composition (O10, O11, O24; §13 "Connections"). The need may now be
   demonstrated, but no doc says so.
10. **"R0" has two meanings.** CF001 §10 item 1
    (concurrency-foundations-design.md:659) uses "R0" for the `defer`/`par`
    restriction, and FX006 (BACKLOG:117) says "R0-style"; the record pipeline is
    also "R0" (inferred readability risk).
11. **K001 foundation.** Register row 46 says a precise kinding account is yet
    to be named; README cites the Haskell 2010 report ch. 4 and Jones FPCA93,
    and O59 cites Jones FPCA 1993 Thm 1 while noting its hypotheses are
    unchecked for two row sorts. Consistent but unreconciled: no K001
    correspondence note exists.
12. **C001 design branch name.** The handoff
    (docs/plans/2026-10-21-c001-explicit/handoff.md line 3) names
    `design/c001-explicit-evidence`, which does not exist locally; only
    `origin/checkpoint/design-c001-explicit-evidence` does, with identical C001
    files.
