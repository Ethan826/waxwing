# Preserved patches

Work kept as patches so it is on `main` without being built or tested
there. Apply one with `git am` on top of its base commit.

- **mileahead-eliminators.patch**: the MileAhead guidance update the
  bootstrap plan could not apply (it writes outside this repository).
- **r005b-task5-wip.patch**: R005 Tranche B Task 5, stopped mid-way on
  2026-10-18 and superseded by the adopted QT-strict + Sym + H design
  (docs/plans/2026-10-19-row-merge-implementation-plan.md). Reference
  only. Base: de8dffc. Not verified.
- **r005b-task7-wip.patch**: R005 Tranche B Task 7 checkpoint, paused
  2026-10-20 for the composition foundation assessment. It builds with 0
  warnings but does not pass verify (docs/progress.md, "Task 7
  stopped"). Base: 43b3a28. Resume from it when Task 7 restarts.
