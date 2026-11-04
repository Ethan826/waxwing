// Task 4.5: the window's classes as data (plan Task 4.5 Step 2; §3.2;
// Review Focus 1), each with its §3.2 label (`null` for defects), where
// that label comes from (`sectionSource`; `sectionReading` when it is
// the implementer's reading, not the plan's or the author's), its Review
// Focus 1 class, and its target once the named dependency lands. Stored
// once in window.json's summary; each row names its class.
import { boundHoleClass } from './r0-rt8-account.mjs';

const a = '§3.2(a)';
const b = '§3.2(b)';
const plan = 'plan §3.2';
const ruled = 'the author\'s ruling R-b2 (2026-10-23): a strategy'
  + ' limitation stays (b)';
const markers = 'G-exempt (per-kind slice arguments; for DataApplication'
  + ' and DataOverRecords also the free-constructor model)';
const refusedFocus = 'none (today refuses; Review Focus 1 counts'
  + ' compiling declarations)';
const atomsFocus = 'requirement atoms at type variables';
const strategyQ = 'a strategy whose Sound_F covers them (for instance'
  + ' contracts carrying Q, outside this plan)';
// The author's ruling R-b1: no automatic Contradiction target.
const undetermined = 'undetermined pending classification';
const classify = 'classification of the refusal: a refuter\'s evidence'
  + ' (P-C1, P-CX) for a contradiction, or recorded validity and a'
  + ' certifying strategy';

const entry = (section, sectionSource, focus, target, dependency) =>
  ({ section, sectionSource,
    sectionReading: sectionSource.startsWith('reading'), focus, target,
    dependency });

export const windowClasses = {
  'markers: compiles today, R0 Unsupported Outside': entry(a, plan,
    'outside markers of every kind', 'Solved (compiling again)', markers),
  'erased row: compiles today, census detector fires': entry(a, plan,
    'erased effect rows', 'per the G-erased ruling: the narrowing is not'
      + ' approved, decided after the census and review', 'G-erased'),
  'BQ at a rigid variable: online declines': entry(b, plan, atomsFocus,
    'Solved', strategyQ),
  'outside the unitary fragment: online declines': entry(b, plan,
    atomsFocus, 'Solved', 'a strategy whose guard and check cover'
      + ' several-tail problems'),
  'BQ pending G-ValidR: compiles today': entry(a, plan, 'requirement'
    + ' atoms whose meaning ValidR leaves open', 'per the G-ValidR ruling',
  'G-ValidR'),
  'RequirementOpen: compiles today': entry(a, plan, 'requirement atoms'
    + ' whose meaning ValidR leaves open', 'per the G-ValidR ruling',
  'G-ValidR'),
  'ambiguous several-tail read-back (Heuristic)': entry(b, 'reading',
    'ambiguous several-tail read-backs', 'Solved',
    'a strategy that certifies the split (T-R0b §5.3)'),
  // Planning only: not an approval of rejecting them (R-b2).
  [boundHoleClass]: entry(`${a}, pending policy`, 'the author\'s ruling'
    + ' R-b2 (2026-10-23): tagged for planning, not approval of banning',
  'none (Solved in shadow; the hole binding is a labelled shadow'
    + ' experiment)', 'per the author\'s ambiguity ruling (Solved now)',
  'the author\'s ambiguity ruling'),
  'today refuses, R0 Unsupported Outside': entry(a, plan, refusedFocus,
    undetermined, `${markers}, then ${classify}`),
  'today refuses, BQ pending G-ValidR': entry(a, 'reading (Task 4.2'
    + ' ruling Q2: cmp at a rigid variable waits on the κ policy)',
  refusedFocus, 'per the G-ValidR ruling (κ policy)', 'G-ValidR'),
  'today refuses, BQ at a rigid variable: online declines': entry(b, plan,
    refusedFocus, undetermined, classify),
  'today refuses, outside the unitary fragment: online declines': entry(b,
    plan, refusedFocus, undetermined, classify),
  'false contradiction (D6) becomes Unresolved': entry(b, ruled,
    refusedFocus, 'Solved', 'a strategy that certifies it'),
  'known-valid program; current solver cannot decide': entry(b, ruled,
    refusedFocus, 'Solved (validity; admissibility, where it applies, is'
      + ' a separate question)', 'a strategy that certifies it'),
  'today\'s refusal becomes Unresolved (no candidate)': entry(b, ruled,
    refusedFocus, undetermined, classify),
  defect: entry(null, 'none (defect rows are not labelled)', 'none (a'
    + ' defect of today\'s checkFunction)', 'its separately authorized fix',
  'its BACKLOG entry')
};

// T6 (dossier §18.161 (4)): classes only the minting path reaches (a
// validator refusal reaching Decide) or a defect reaches, so the
// committed path, where none occurs, lists none of them: the summary
// lists one only when a row has it (test/r0-shadow-summary.mjs), and
// window.json does not move. Labels are the implementer's reading:
// a decline the check makes is a strategy limitation (R-b2: (b)).
export const rt8DefectClass = 'defect found by RT8 (reported, unlabelled)';
const declines = 'reading (§18.161 (4): a check decline is an intended'
  + ' decline; the author\'s ruling R-b2: a strategy limitation stays (b))';
export const t6Classes = {
  'the check declines the candidate: compiles today': entry(b, declines,
    'candidates the check declines (a record defect or a limitation,'
      + ' A2 spec §6)', 'Solved', 'a check that certifies them (the RT8'
      + ' class names the refusal)'),
  'today refuses, the check declines the candidate': entry(b, declines,
    refusedFocus, undetermined, classify),
  [rt8DefectClass]: entry(null, 'none (defect rows are not labelled)',
    'none (a defect of the shadow run; its RT8 class names it)',
    'its separately authorized fix', 'its BACKLOG entry')
};

// The classes whose rows carry no §3.2 label.
export const defectClasses = ['defect', rt8DefectClass];

export const classEntry = name => windowClasses[name] ?? t6Classes[name];
