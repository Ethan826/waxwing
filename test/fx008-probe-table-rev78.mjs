import { no, ok, probe } from './fx008-probe-kit.mjs';

const deferTick =
  'defer must not fail, but it performs Tick, whose handler may fail';

export const rev78 = [
  probe('rev7/annotc',
    ok('1\n5\n9\n',
      '4d6574a1e4c776a9db848a3adecfb89c155b09383a304fbdb19e760c216eef62')),
  probe('rev7/annotd',
    ok('1\n5\n9\n',
      '0649812dec4ea366c215d1b314211c805322c436907ec90453de6b78d82ad1b0')),
  probe('rev7/late1',
    ok('0\n', '05d818c7f328b2dfbda1a9b4c5c3ebfe205aa5f5a1e98bb7a105bdbef5bf7a' +
      '3e')),
  probe('rev7/late1ctl',
    no('E_TYPE', 'Expected a handler', 319, 348)),
  probe('rev7/late2',
    ok('0\n', 'a942a6d3104c14dd99215ad4aa818c9cc6d915cd963ad28c7ee4d060394af8' +
      '71')),
  probe('rev7/late3',
    ok('', 'da34071db0fcd28f2224fd75e4d5e993379d528d1147b644ac0899543ee819e9')),
  probe('rev7/merge1',
    ok('1\n9\n',
      'fb3d6dc293d33f065b6ca1601e7678a74f310a08e171966ea637116d547a00bb')),
  probe('rev7/merge2',
    ok('1\n9\n',
      'a3a449ae477198ed4e309291796491be0bf0c5c2013f01969267c91d7fb93459'),
    {
      fx008: no('E_EFFECT', deferTick, 244, 261),
      task: 9,
      flipped: true,
      reason: 'L4 (§6).'
    }),
  probe('rev7/merge2ctl',
    ok('1\n9\n',
      'f9934fbbc52e94ad2c5dd969b1d006e23d351b9f7cad132d8d134f57f6ef5292')),
  probe('rev7/rig1',
    no('E_EFFECT', 'f performs Tick, which its signature does not allow', 259,
      270)),
  probe('rev7/rig2',
    no('E_EFFECT', 'f performs Tick, which its signature does not allow', 265,
      270)),
  probe('rev8/cyc1',
    ok('0\n', '61943b9f6ba94ce0c723e0690d01ddcb88cdccc12b6a3520d05a1a8829f3c7' +
      'e3'),
    { slow: true }),
  probe('rev8/cyc1ok',
    ok('0\n', 'f641445515907713f7d479ca40664cedb769247238547ff7147e878795ec6c' +
      '78'),
    { slow: true }),
  probe('rev8/cyc2',
    no('E_EFFECT', '... and Tick + ... cannot be made equal: both end in ...',
      174, 179),
    {
      fx008: no('E_EFFECT',
        'Tick + ... and ... cannot be made equal: both end in ...', 174, 179),
      task: 7,
      flipped: true,
      reason: '§3.4 F2 reports the c->R edge of the same cycle, at the ' +
        'sync\'s node (P13); user 2026-10-11.',
      slow: true
    }),
  probe('rev8/cyc3',
    no('E_EFFECT',
      '... and Log + Tick + ... cannot be made equal: both end in ...', 338,
      344),
    {
      fx008: no('E_EFFECT',
        'Log + Tick + ... and ... cannot be made equal: both end in ...', 338,
        344),
      task: 7,
      flipped: true,
      reason: '§3.4 F2 reports the c->R edge of the same cycle, at the ' +
        'sync\'s node (P13); user 2026-10-11.',
      slow: true
    }),
  probe('rev8/one1',
    ok('0\n', 'f1385c8c30828aa3cf047737e2ffa49e574d4a54c121152e50eb59af4fb7f1' +
      'bc')),
  probe('rev8/one1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 289, 290)),
  probe('rev8/one1rev8',
    ok('0\n', '7c05ca999e8588e8688157af8407919a3f0f38d840086018004ef837c6987b' +
      '41')),
  probe('rev8/one3',
    ok('0\n', 'ff15712fbd7a8dc380dd1df116967560bf0c87be864defa4d621b464358d5a' +
      '86')),
  probe('rev8/one3ctl',
    no('E_TYPE', 'Expected a handler', 371, 400)),
  probe('rev8/two1',
    ok('0\n', '5bb3f21809c79b7961bc20091fcc89483d7d56b54515441824709864258249' +
      '07')),
  probe('rev8/two1ctl',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 335, 336)),
  probe('rev8/two1f',
    ok('0\n', 'cde141070301f20d2b30dc1d709d7ae3e48f6575e9d1f0b04134c06e075a70' +
      'e6')),
  probe('rev8/two1fctl',
    no('E_TYPE', 'Fail needs a concrete error family', 369, 380)),
  probe('rev8/two2',
    ok('0\n', '18a978825c71d4b80bc5f9c67df53d1d57dec68e238d5addee74ba2cd5f9e5' +
      'd4')),
  probe('rev8/two2ctl',
    ok('0\n', 'bd2bbcb916daa0a7b8c13600684b5928f3fafaccfe9b37d086f1e3bd9bc840' +
      'c4')),
  probe('rev8/two3',
    ok('0\n', 'd1ff432bd63b5c53d8663644b650482b1499de01cb75824e218cdca1abb5c5' +
      '0f')),
  probe('rev8/two3ctl',
    no('E_TYPE', 'Expected a handler', 419, 448)),
];
