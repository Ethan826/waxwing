# Palsberg and Zhao: what could be read and run

Evidence for the foundation assessment (docs/plans/2026-10-20-
composition-foundation-assessment.md, §4.8). Reading only: no
implementation of the algorithm was found, so nothing was run and no
probe inputs or outputs exist here. No third-party file is stored here.

## Retrieval log (2026-10-20)

- Palsberg and Zhao, Type inference for record concatenation and
  subtyping, Information and Computation 189(1):54-86, 2004. Author
  copy, web.cs.ucla.edu/~palsberg/paper/ic04.pdf (47 pages, dated
  September 22, 2003), converted with `pdftotext -layout`. Read: all of
  §1-§7; Appendix A skimmed. Page numbers below are the copy's.
- LICS 2002 version, Efficient type inference for record concatenation
  and subtyping (pp. 125-136). Full text not accessed: the 2002 Purdue
  publications page (Wayback capture 20021019214531) links
  paper/lics02.ps.gz, and Wayback has no capture of that file (404 for
  2002-2004); the UCLA paper directory has no lics02 file (404). Read:
  the abstract, lics.siglog.org/lics02/Abstracts/22.html. It claims
  "the first polynomial-time type inference algorithm" running in
  O(n^5). The journal version's acknowledgments (p. 43) withdraw that
  claim: reviewers found "a problem in the proof of a crucial lemma",
  the lemma "was indeed false", and the problem is NP-complete.
- Tian Zhao, Type matching and type inference for object-oriented
  systems (Purdue PhD thesis; CERIAS TR 2003-20),
  cerias.purdue.edu/assets/pdf/bibtex_archive/2003-20.pdf. Read: the
  abstract, the table of contents, §1 (p. 18) and §4.6-§4.7. Chapter 4
  keeps the LICS title but contains the NP-hardness section and states
  NP-completeness (Theorem 4.6.4); the thesis abstract still says
  "polynomial-time".

## Software

None found. The journal conclusion (p. 43) and the thesis's §4.7 list
"implementing the algorithm for a language such as Obliq" as future
work. The thesis's implementation (§2.8) is a Java type-matching tool
for recursive interface types, not this algorithm. Palsberg's UCLA
publications page lists no software for the paper. A web search for an
implementation found none.
