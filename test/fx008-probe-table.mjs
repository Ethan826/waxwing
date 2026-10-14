import { no, ok, probe } from './fx008-probe-kit.mjs';
import { rev6 } from './fx008-probe-table-rev6.mjs';
import { rev78 } from './fx008-probe-table-rev78.mjs';
import { rev910 } from './fx008-probe-table-rev910.mjs';

const defer =
  'defer must not fail, but it performs Log, whose handler may fail';

// Probe outcomes before FX008 ("today") and after it ("fx008"); see the
// plan's Task 1. Top-level, facts and witness probes first.
const own = [
  probe('argbind-internal',
    no('E_INTERNAL', 'Effect row consumption failed', 333, 354),
    {
      fx008: ok('',
        'b524e7d7ebab4c06d2e9e54a13a8b127587c2d982a465d991ed76a5d82ace8c1'),
      task: 7,
      flipped: true,
      reason:
        'Sound gain (user 2026-10-11): the hook removes R = c, so f\'s row ' +
        'no longer ends in z\'s row and the occurs failure (FX010) cannot ' +
        'arise here; no defer reaches h. Go and the oracle print nothing, ' +
        'exit 0. FX010 itself stays open.',
      slow: true
    }),
  probe('argbind',
    ok('', '674e9299b329013930959bed2c137dbed0ab367355cf83ffd2213de33756aaed'),
    { slow: true }),
  probe('cycle2',
    ok('0\n7\n1\n',
      '5c29e08751576072980aaf5ccee5ce3004a6303acd51cf8bba52df676311322f'),
    { slow: true }),
  probe('cycle2open',
    ok('', 'cab362ae545b154a4638a8837e3b3cc5e5c40f8ff1a8209f93dc3a60a3c2b89e'),
    { slow: true }),
  probe('dup',
    ok('', 'ea6cc18f969afe35abe19f6eeeb90f993b5b7dfad44b8163c87ad76c3510ed1d'),
    {
      fx008: no('E_EFFECT',
        'Console + Log + Log + ... and Log + Console + ... cannot be made ' +
          'equal: both end in ...', 162, 172),
      task: 5,
      flipped: true,
      reason:
        '§6: no finite solution; the deferral is its own self-loop cycle, ' +
        'reported at the deferral span. Message pinned by the user ' +
        'on 2026-10-10.',
      slow: true
    }),
  probe('f1',
    ok('1\n2\n',
      'def746713e576103e28bacb31c833349fc6777871022b0d8b39be376ec024932')),
  probe('f2',
    ok('1\n2\n',
      '32bd2e77a75f62ad3ebb41ea82b1f1c64152e524be70d5a376b07e217d79a715')),
  probe('f3',
    ok('9\n', '32227e13aa66a0b2eaea7df378fe04fe9855c506236d34ad6e6d6dea85678d' +
      '9c')),
  probe('facts/cross',
    ok('', 'a48f95c2afc97b947aa29650149107f0a41a0f7af074902ae0463857ea78b011',
      'fail(E): E\n',
      1),
    {
      fx008: no('E_EFFECT', defer, 79, 95),
      task: 9,
      flipped: true,
      reason: '§1 cross-function form.'
    }),
  probe('facts/lexical',
    ok('2\n', '1464f76408a08e54998bab565d2fb461ebbd0e07986b4fb72514137e10377a' +
      '37',
      'fail(E): E\n', 1),
    {
      fx008: no('E_EFFECT', defer, 134, 150),
      task: 9,
      flipped: true,
      reason: '§1 pinned form.'
    }),
  probe('facts/pending',
    ok('', 'a13f61db21218c39027e441178a206248d719599c0b9a1e6a06aad925d87aa4c',
      'fail(F): F\ncleanup failed: fail(E): E\n', 1),
    {
      fx008: no('E_EFFECT', defer, 101, 117),
      task: 9,
      flipped: true,
      reason: '§1: work\'s Log is plain.'
    }),
  probe('failvar',
    no('E_TYPE', 'Fail needs a concrete error family', 25, 32)),
  probe('failvar2',
    no('E_TYPE', 'Fail needs a concrete error family', 37, 44)),
  probe('failvar3',
    no('E_TYPE', 'Fail needs a concrete error family', 37, 44)),
  probe('n1',
    ok('', '11c749ce671b36700a70b66bbc533a6d5c138d92655f2bc07b7e188f9a0cf310'),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
        'end in ...', 146, 156),
      task: 5,
      flipped: true,
      reason: '§6: same as dup. Message pinned by the user on 2026-10-10.',
      slow: true
    }),
  probe('rigid-ok',
    no('E_EFFECT',
      'Fail(E) + Console + ... and Console + ... cannot be made equal: both ' +
        'end in ...', 221,
      241)),
  probe('rigid',
    no('E_TYPE', 'Expected Handler(Log), found Handler(Log)', 98, 128)),
  probe('witness/ec1',
    no('E_EFFECT', 'Unhandled Fail(E) in main', 299, 320),
    { slow: true }),
  // ec1's Fail(E) arrives at check time (checkDefer), so ec1 is a control;
  // ec2 delays it to settling (user 2026-10-11) and proves the exit count.
  // A literal raising a parameterized Fail family against a written handler
  // type: C keeps bare labels and never unifies their arguments (Task 7).
  probe('witness/famw',
    ok('0\n', '9e35e96ea8ae81e85bec8829f267fe67c47fcd4909cc7c74c17d1ca5acb5f9' +
      '37')),
  probe('witness/famw2',
    ok('0\n', '4070dfb73c4413cabc5c24e18f00fd279aab46c22cdbee64f83bf0681c46ac' +
      'ae')),
  probe('witness/ec2',
    no('E_EFFECT', 'Unhandled Fail(E) in main', 90, 399),
    { slow: true }),
  probe('witness/tp1',
    no('E_EFFECT', 'f performs Console, which its signature does not allow',
      270, 287),
    {
      fx008: no('E_EFFECT',
        'f performs Console, which its signature does not allow', 204, 219),
      task: 7,
      flipped: true,
      reason:
        'Review I6: k1 tail rigid on retry; tail pass rejects R = ' +
        '[Console] at the clause (P13).',
      slow: true
    }),
];

export const probes = [...own, ...rev6, ...rev78, ...rev910];
