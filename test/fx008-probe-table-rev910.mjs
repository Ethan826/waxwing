import { no, ok, probe } from './fx008-probe-kit.mjs';

const defer =
  'defer must not fail, but it performs Log, whose handler may fail';

export const rev910 = [
  probe('design-review/c1',
    ok('', 'a48f95c2afc97b947aa29650149107f0a41a0f7af074902ae0463857ea78b011',
      'fail(E): E\n',
      1),
    {
      fx008: no('E_EFFECT', defer, 79, 95),
      task: 9,
      flipped: true,
      reason: '§1 cross-function form.'
    }),
  probe('design-review/c2',
    no('E_TYPE', 'Expected a handler', 177, 198)),
  probe('design-review/c3',
    no('E_TYPE', 'Expected a handler', 168, 189)),
  probe('design-review/late',
    no('E_TYPE', 'Fail needs a concrete error family', 109, 116)),
  probe('design-review/p1',
    ok('2\n1\n9\n',
      'aedf8be6c22f0f969a37555dd5b1f49ca1341430318d0c8834c355a05672c85a')),
  probe('design-review/p2',
    ok('11\n9\n',
      'acad7dbdc4bb2cb2fe11197aa95c2a7962aef6981d694f24ed16c1619d76c15c')),
  probe('design-review/p3',
    no('E_EFFECT', 'Unhandled Fail(E) in main', 179, 200)),
  probe('design-review/p4',
    no('E_EFFECT', 'run performs Log, which its signature does not allow', 174,
      180)),
  probe('design-review/p5',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end ' +
        'in ...', 175, 181),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
          'end in ...', 175, 181),
      task: 7,
      flipped: true,
      reason:
        '§3.4 F2: the reverse link is gone, so the monomorphic `say` ' +
          'reaching main\'s flexible tail is a positive c->R self-loop, ' +
          'reported by sync at the node (P13). Observed text pinned by the ' +
          'user 2026-10-11.'
    }),
  probe('design-review/q1',
    ok('101\n101\n0\n9\n',
      '457caffab02720935a2484bede539c0ad6fe929300394f41472ded166092aeca'),
    {
      fx008: no('E_EFFECT', defer, 211, 227),
      task: 9,
      flipped: true,
      reason: 'I2: run\'s Log is plain (§6).'
    }),
  probe('design-review/q2',
    no('E_EFFECT', 'This function must be pure, but it performs Fail(E)', 74,
      112)),
  probe('design-review/r1',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end ' +
        'in ...', 188, 194),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
          'end in ...', 188, 194),
      task: 7,
      flipped: true,
      reason:
        '§3.4 F2: the reverse link is gone, so the monomorphic `say` ' +
          'reaching main\'s flexible tail is a positive c->R self-loop, ' +
          'reported by sync at the node (P13). Observed text pinned by the ' +
          'user 2026-10-11.'
    }),
  probe('design-review/r2',
    no('E_EFFECT',
      'Console + ... and Log + Console + ... cannot be made equal: both end ' +
        'in ...', 202, 208),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
          'end in ...', 202, 208),
      task: 7,
      flipped: true,
      reason:
        '§3.4 F2: the reverse link is gone, so the monomorphic `say` ' +
          'reaching main\'s flexible tail is a positive c->R self-loop, ' +
          'reported by sync at the node (P13). Observed text pinned by the ' +
          'user 2026-10-11.'
    }),
  probe('design-review/r3',
    ok('', 'dcd7ac7a2d440632c8aa86955be9689e3d380451b083d3504672522c12b2ff41')),
  probe('design-review/r4',
    no('E_EFFECT', 'Unhandled Log in main', 179, 183),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
          'end in ...', 115,
        125),
      task: 5,
      flipped: true,
      reason:
        'same cycle as n1 (design §3.5 (c)): rejected today as Unhandled ' +
        'Log in main; the text and span move to the deferral.'
    }),
  probe('design-review/r5',
    ok('', '11c749ce671b36700a70b66bbc533a6d5c138d92655f2bc07b7e188f9a0cf310'),
    {
      fx008: no('E_EFFECT',
        'Console + Log + ... and Console + ... cannot be made equal: both ' +
        'end in ...', 146, 156),
      task: 5,
      flipped: true,
      reason:
        'byte-identical to n1 (original r5 lost). Message pinned by the ' +
        'user on 2026-10-10.',
      slow: true
    }),
  probe('rev10/gain1',
    no('E_EFFECT', 'Unhandled Cell(Bool) in main', 276, 281),
    {
      fx008: ok('0\n',
        'a0c048733fb46329c2c1245599002f0bb0f3091decc349483233543e74f8d035'),
      task: 7,
      flipped: true,
      reason: '§6 sound gain (rev10 N3); Go hash pinned on first observation.'
    }),
  probe('rev10/gain1ctl',
    ok('0\n', '498969c8e6f18cc3a3deea168883214f5ad8f7b040b45c531807234316e414' +
      '5f')),
  probe('rev10/pair1',
    ok('0\n', 'c517a44c83c8de911ae03a091802a30833dbd709e6920f12217c11498a8235' +
      '16')),
  probe('rev10/pair1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 315, 316)),
  probe('rev10/rl1',
    ok('0\n', '597396062f228698368d0523de70fc4dd9e5332339b967c32f762a61eb5919' +
      'a5')),
  probe('rev10/rl1ctl',
    ok('0\n', 'd7c18ae33dae73870d97fdedd7cfac69af529fc0805f345280cac6f8c8bdae' +
      'b1')),
  probe('rev9/ov1',
    ok('0\n', '8c2420dc8ae1735ba3ef257308ba4ef74e35ca81f2f0a0b403e9b931d81a52' +
      '61')),
  probe('rev9/ov1ctl',
    no('E_EFFECT', 'Unhandled Tick in main', 295, 317)),
  probe('rev9/ov1f',
    ok('0\n', 'ca8f71b03da1725422bd46c21ce2ad859b4b4d4697de728a9dd19610719a25' +
      'e8')),
  probe('rev9/set1',
    ok('0\n', 'edee841c09f5a9e3faf6922aa44d9f4c287138d0d1be04fb0a39997b943a3a' +
      '16'),
    { slow: true }),
  probe('rev9/set1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 428, 429)),
  probe('rev9/sh1',
    no('E_EFFECT', '... and Tick + ... cannot be made equal: both end in ...',
      237, 242),
    {
      fx008: no('E_EFFECT',
        '... and Tick + ... cannot be made equal: both end in ...', 192, 246),
      task: 7,
      flipped: true,
      reason:
        'Same text; the first sync that holds both clauses is the one after ' +
        'the handler literal (P13); user 2026-10-11.',
      slow: true
    }),
];
