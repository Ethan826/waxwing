// Must-fail cases for criteria 5 and 6's freshness against src (the
// records' `commit`, read by `staleness` in test/r0-t2-activation-
// evidence.mjs), in the form of test/r0-t2-activation-gate-cases.mjs,
// which spreads them into its own: [criteria left unmet, the change].
import { recordCommit } from './r0-t2-activation-gate-met.mjs';

const other = 'beef000000000000000000000000000000000000';

export const freshChanges = {
  // src changed since the comparison's commit.
  comparisonStale: [[5], evidence => {
    evidence.files['cmp.json'].commit = other;
    evidence.src.at[other] = 'tree0'; }],
  // src changed since the commit both records name.
  bothStale: [[5, 6], evidence => {
    evidence.src.at[recordCommit] = 'tree0'; }],
  comparisonNoCommit: [[5], evidence => {
    delete evidence.files['cmp.json'].commit; }],
  // An abbreviated sha is not a recorded commit.
  comparisonShortCommit: [[5], evidence => {
    evidence.files['cmp.json'].commit = recordCommit.slice(0, 8); }],
  // A commit git could not resolve (absent from `src.at`).
  comparisonUnresolved: [[5], evidence => {
    evidence.files['cmp.json'].commit = other; }],
  perfStale: [[6], evidence => {
    evidence.files['perf.json'].commit = other;
    evidence.src.at[other] = 'tree0'; }],
  perfNoCommit: [[6], evidence => {
    delete evidence.files['perf.json'].commit; }],
  // HEAD's src tree unread: neither record can be fresh.
  headUnread: [[5, 6], evidence => { evidence.src.head = null; }]
};
