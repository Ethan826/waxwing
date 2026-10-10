import { no, noPattern, ok, probe } from './fx008-probe-kit.mjs';

const defer =
  'defer must not fail, but it performs Log, whose handler may fail';

export const rev910 = [
  probe('design-review/c1',
    ok('', 'a48f95c2afc97b947aa29650149107f0a41a0f7af074902ae0463857ea78b011', 'fail(E): E\n',
      1),
    {
      fx008: no('E_EFFECT', defer, 79, 91),
      task: 9,
      reason: '§1 cross-function form.'
    }),
  probe('design-review/c2',
    no('E_TYPE', 'Expected a handler', 177, 194)),
  probe('design-review/c3',
    no('E_TYPE', 'Expected a handler', 168, 185)),
  probe('design-review/late',
    no('E_TYPE', 'Fail needs a concrete error family', 109, 116)),
  probe('design-review/p1',
    ok('2\n1\n9\n', 'aedf8be6c22f0f969a37555dd5b1f49ca1341430318d0c8834c355a05672c85a')),
  probe('design-review/p2',
    ok('11\n9\n', 'acad7dbdc4bb2cb2fe11197aa95c2a7962aef6981d694f24ed16c1619d76c15c')),
  probe('design-review/p3',
    no('E_EFFECT', 'Unhandled Fail(E) in main', 174, 191)),
  probe('design-review/p4',
    no('E_EFFECT', 'run performs Log, which its signature does not allow', 162, 168)),
  probe('design-review/p5',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end in ...', 163, 169),
    {
      fx008: noPattern('E_EFFECT', ' cannot be made equal: both end in \\.\\.\\.$', 163, 169),
      predicted:
        'Console + Log + ... and Console + ... cannot be made equal: both end '
        + 'in ...',
      task: 7,
      reason:
        '§3.4 F2: positive c->R self-loop reported by sync (P13); still ' +
        'rejected, text may move.'
    }),
  probe('design-review/q1',
    ok('101\n101\n0\n9\n', '457caffab02720935a2484bede539c0ad6fe929300394f41472ded166092aeca'),
    {
      fx008: no('E_EFFECT', defer, 203, 215),
      task: 9,
      reason: 'I2: run\'s Log is plain (§6).'
    }),
  probe('design-review/q2',
    no('E_EFFECT', 'This function must be pure, but it performs Fail(E)', 74, 107)),
  probe('design-review/r1',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end in ...', 180, 186),
    {
      fx008: noPattern('E_EFFECT', ' cannot be made equal: both end in \\.\\.\\.$', 180, 186),
      predicted:
        'Console + Log + ... and Console + ... cannot be made equal: both end '
        + 'in ...',
      task: 7,
      reason: '§3.4 F2: same as p5.'
    }),
  probe('design-review/r2',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end in ...', 194, 200),
    {
      fx008: noPattern('E_EFFECT', ' cannot be made equal: both end in \\.\\.\\.$', 194, 200),
      predicted:
        'Console + Log + ... and Console + ... cannot be made equal: both end '
        + 'in ...',
      task: 7,
      reason: '§3.4 F2: same as p5.'
    }),
  probe('design-review/r3',
    ok('', 'dcd7ac7a2d440632c8aa86955be9689e3d380451b083d3504672522c12b2ff41')),
  probe('design-review/r4',
    no('E_EFFECT', 'Unhandled Log in main', 163, 167)),
  probe('design-review/r5',
    ok('', '11c749ce671b36700a70b66bbc533a6d5c138d92655f2bc07b7e188f9a0cf310'),
    {
      fx008: noPattern('E_EFFECT', ' cannot be made equal: both end in \\.\\.\\.$', 138, 148),
      task: 5,
      reason:
        'byte-identical to n1 (original r5 lost). Observed message is ' +
        'reported to the user before it is pinned.',
      slow: true
    }),
  probe('rev10/gain1',
    no('E_EFFECT', 'Unhandled Cell(Bool) in main', 263, 268),
    {
      fx008: ok('0\n', null),
      task: 7,
      reason: '§6 sound gain (rev10 N3); Go hash pinned on first observation.'
    }),
  probe('rev10/gain1ctl',
    ok('0\n', '498969c8e6f18cc3a3deea168883214f5ad8f7b040b45c531807234316e4145f')),
  probe('rev10/pair1',
    ok('0\n', 'c517a44c83c8de911ae03a091802a30833dbd709e6920f12217c11498a823516')),
  probe('rev10/pair1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 302, 303)),
  probe('rev10/rl1',
    ok('0\n', '597396062f228698368d0523de70fc4dd9e5332339b967c32f762a61eb5919a5')),
  probe('rev10/rl1ctl',
    ok('0\n', 'd7c18ae33dae73870d97fdedd7cfac69af529fc0805f345280cac6f8c8bdaeb1')),
  probe('rev9/ov1',
    ok('0\n', '8c2420dc8ae1735ba3ef257308ba4ef74e35ca81f2f0a0b403e9b931d81a5261')),
  probe('rev9/ov1ctl',
    no('E_EFFECT', 'Unhandled Tick in main', 290, 308)),
  probe('rev9/ov1f',
    ok('0\n', 'ca8f71b03da1725422bd46c21ce2ad859b4b4d4697de728a9dd19610719a25e8')),
  probe('rev9/set1',
    ok('0\n', 'edee841c09f5a9e3faf6922aa44d9f4c287138d0d1be04fb0a39997b943a3a16'),
    { slow: true }),
  probe('rev9/set1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 411, 412)),
  probe('rev9/sh1',
    no('E_EFFECT', '... and Tick + ... cannot be made equal: both end in ...', 237, 242),
    { slow: true }),
];
