# Sulzmann's record constraints: what could be read and run

Evidence for the foundation assessment (docs/plans/2026-10-20-
composition-foundation-assessment.md, §4.7 and §4.8). Reading only: no
implementation of Sulzmann's record systems was found or run. Nothing
third-party is stored here.

## Which works ATTAPL ch. 10 cites

Pottier and Rémy, The essence of ML type inference, final draft
(cambium.inria.fr/~fpottier/publis/emlti-final.pdf), converted with
`pdftotext -layout`. `grep -n -i sulzmann` finds three works in the
bibliography: Odersky, Sulzmann and Wehr (TAPOS 1999); Sulzmann's thesis
(Yale, May 2000); Sulzmann, Müller and Zenger (ACRC-99-009, 1999). The
records remark is in §10.8 (draft p. 489) and cites the thesis only.
"Designing record systems" (YALEU/DCS/RR-1128) is not cited there.

## Retrieval log (2026-10-20)

- TAPOS 1999 (HM(X)): infoscience.epfl.ch, DSpace item
  5d9b1378-f5c5-43f5-9e76-b356c94e635a, file tapos98.ps.gz. Read: §3,
  Fig. 2, §6.1, §7.
- RR-1128 abstract: Wayback, cs.yale.edu/homes/sulzmann-martin/
  publications/tr-1128.txt (capture 1999-02-09). Read.
- RR-1128 full text: not accessed. The Yale .ps.gz was never archived
  (the 2017 capture is a 404); Yale's TR list has no file; the old
  CiteSeer cache links were not archived; academia.edu answers 403.
- Thesis (2000): not accessible to the agent (ResearchGate 213884919
  answers 403 and then a CAPTCHA page, not attempted; CiteSeer's 2006
  page has no file). The author then retrieved the ResearchGate PDF; it
  was read for the assessment's §4.10 and is not stored here.
- Sulzmann, Type systems for records revisited (unpublished, 1998;
  Leijen 2004 ref. [28]): not found.
- Glynn, Stuckey, Sulzmann and Søndergaard, Boolean constraints for
  binding-time analysis (PADO 2001): Springer only; abstract only.
- Chameleon record examples: Wayback, cs.mu.oz.au/~sulzmann/chr/
  download/record.ex (2001) and comp.nus.edu.sg/~sulzmann/chameleon/
  download/record.ch (2004). Read.
- Leijen, First-class labels for extensible rows (UU-CS-2004-051),
  microsoft.com. Read: §1 and §3.1 on Sulzmann.
- Palsberg and Zhao, Type inference for record concatenation and
  subtyping (I&C 2004), web.cs.ucla.edu/~palsberg/paper/ic04.pdf. Read:
  §1.

`thesis.ps.gz` under cs.mu.oz.au/~sulzmann/chameleon/ is Wazny's 2006
thesis on type error diagnosis, not Sulzmann's.

## Software

Chameleon (Sulzmann, Wazny; CHR-based overloading) has 2003-2004 Linux
x86 binaries and a 2005 source tarball on the Wayback copy of
comp.nus.edu.sg/~sulzmann/chameleon/download/. It was not downloaded:
the binaries are untrusted executables for another platform, the source
needs a 2005 GHC, and its record example (record.ch) encodes records as
type-level label lists with `Select`, `Extend`, `Remove` classes and a
separate `Unique` check. That is not the thesis's record system, and it
has no concatenation and no lacks predicate, so running it would not
answer programs 4, 5 or 11. No probe inputs or outputs exist here.
