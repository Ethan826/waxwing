// A2 Task 5's regression rows (I3, spec §5 item 3), spread into
// a2PrereqRows (scripts/regression-r0-a2-prereq.mjs); probes and their
// fixtures in test/regression-r0-a2-malformed.mjs. Each restores one
// defect in a whole, compiling form.
const malformed = 'src/Features/Check/Strategy/Effects/Malformed.purs';

export const a2MalformedRows = [
  {
    // Task 5, C9: the extra-key check before BindsForced, so C1's B (a
    // binding for the forced tail) reads as an extra key.
    name: 'r0-a2-bindsforced-first',
    file: malformed,
    needle: '    [ bindsForced\n    , wrongSort\n    , missingKey\n'
      + '    , extraKey\n',
    replacement: '    [ extraKey\n    , wrongSort\n    , missingKey\n'
      + '    , bindsForced\n',
    probe: 'r0-a2-bindsforced-first',
    message: /r0-a2-bindsforced-first: \[\["C9 B","ExtraKey/
  },
  {
    // Task 5, C11 (A3): the solved form over effect images only, so a
    // type image naming an absent flexible variable passes I3.
    name: 'r0-a2-solved-all-sorts',
    file: 'src/Features/Check/Strategy/Witness.purs',
    needle: '  found = keyedParts package\n',
    replacement:
      '  found = keyedParts package { types = Map.empty, rows = Map.empty }\n',
    probe: 'r0-a2-solved-all-sorts',
    message: /r0-a2-solved-all-sorts: \[\["C11","Nothing"\]\]/
  },
  {
    // Task 5, C12: a `Console` term compared syntactically, so `TermJ ∅`
    // is refused as not N.
    name: 'r0-a2-termj-empty',
    file: 'src/Features/Check/Strategy/Effects/MalformedTerms.purs',
    needle:
      '  wrong label = alwaysN label.effect && norm label.mark /= TermN\n',
    replacement:
      '  wrong label = alwaysN label.effect && label.mark /= norm TermN\n',
    probe: 'r0-a2-termj-empty',
    message: /r0-a2-termj-empty: \[\["C12 empty","Just NotN"\]\]/
  },
  {
    // Task 5, §4.2: check (j) dropped, so a keyless `Fail` label in an
    // effect image passes I3.
    name: 'r0-a2-keyless-image',
    file: malformed,
    needle: '    , unsolvedImage\n    , keylessFailIn\n    , arityIn\n',
    replacement: '    , unsolvedImage\n    , arityIn\n',
    probe: 'r0-a2-keyless-image',
    message: /r0-a2-keyless-image: \[\["keyless","Nothing"\]\]/
  }
];
