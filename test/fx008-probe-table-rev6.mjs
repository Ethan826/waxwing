import { no, ok, probe } from './fx008-probe-kit.mjs';

const defer =
  'defer must not fail, but it performs Log, whose handler may fail';

export const rev6 = [
  probe('rev6/amb',
    ok('1\n', '482737397df6602fa3c8b6802139d577b8f3694821a64e9d6c721521017f40' +
      '87')),
  probe('rev6/amb2',
    no('E_EFFECT', 'Unhandled Tick in main', 162, 200)),
  probe('rev6/amb3',
    ok('5\n', 'a706fa081440e9dbd4dac942167005d5fa3a29660409b6659baf777154edb5' +
      'f5')),
  probe('rev6/annot',
    no('E_EFFECT',
      'Console + Log + ... and Console + ... cannot be made equal: both end ' +
        'in ...', 235, 262)),
  probe('rev6/annotb',
    ok('1\n2\n',
      'a916d80fb41789ede6bb94f5395d0d4abca3c7d2ff1546ff480ce8b0cd67022a')),
  probe('rev6/around',
    no('E_EFFECT', 'around performs Log, which its signature does not allow',
      185, 211)),
  probe('rev6/around2',
    no('E_EFFECT', 'around performs Log, which its signature does not allow',
      158, 182)),
  probe('rev6/around3',
    no('E_EFFECT',
      'body must allow every effect at this call (Log + Log), but its row is ' +
      'Log; '
      + 'write body\'s row as `with Log + Log + ...e`; a callback\'s row must '
      + 'equal the row where it is called (FX018)', 154, 162)),
  probe('rev6/around4',
    no('E_SYNTAX', 'Expected a capitalized name', 74, 78)),
  probe('rev6/around5',
    ok('101\n', '349c5850df08b37125b86f5603ab4bf0e0c0db640b99ed8d4ea212d082c6' +
      'b6fc')),
  probe('rev6/around6',
    no('E_EFFECT',
      'body must allow every effect at this call (Log + Log), but its row is ' +
      'Log; '
      + 'write body\'s row as `with Log + Log + ...e`; a callback\'s row must '
      + 'equal the row where it is called (FX018)', 211, 219)),
  probe('rev6/con',
    no('E_INTERNAL', 'Invalid handler effect', 0, 0)),
  probe('rev6/con2',
    ok('2\n', 'f7fccfc70d7814bc7d342f6459d63708617306f3435d48c44a518d68cb6eaf' +
      '15')),
  probe('rev6/ext',
    no('E_EFFECT', 'defer must not fail, but it performs Fail(E)', 227, 241)),
  probe('rev6/extb',
    ok('12\n0\n9\n',
      '9edbfd9d4d1f0672f3740fc8962ec9d3881d9965d72ac8a6fb185d1fbfa2f127')),
  probe('rev6/hole',
    ok('', 'a48f95c2afc97b947aa29650149107f0a41a0f7af074902ae0463857ea78b011',
      'fail(E): E\n',
      1),
    {
      fx008: no('E_EFFECT', defer, 79, 91),
      task: 9,
      flipped: true,
      reason: '§1 cross-function form.'
    }),
  probe('rev6/hole1',
    ok('7\n', '4c60cd494eb9bc66516c9cdb1efdade9ed3a18d2f75c76874f6caa3790d461' +
      '14')),
  probe('rev6/hole2',
    ok('', '4a784292a222a87888480b442ef0b162a6dd047dcfe85fc14c8cf1c655a2222f')),
  probe('rev6/hole2b',
    ok('', '0814ad9870b4d62096df39721933080463139d1b836b9f0573c9babc00633465')),
  probe('rev6/hole2c',
    ok('', 'f53aa4ab8bcee9640b9f71f8f794d2233b463d76ad25ec2dc1290426f3f43a9a')),
  probe('rev6/hole3',
    ok('', 'a0884fbbc594676ee23a1dbaf5931f21009099b2eb7452771403c41ae4119944')),
  probe('rev6/hole4',
    ok('', '239edb13d99197ff3b15c5372dc29761a4242048b07a19d4168fadf7fc6fd97a')),
  probe('rev6/l4',
    no('E_EFFECT',
      'Log + Fail(E) + Console + ... and Log + Console + ... cannot be made ' +
        'equal: both end in ...',
      304, 309)),
  probe('rev6/l4b',
    ok('0\n', 'e00f20ebb296ce02c06fbde7c6a96439a68ce3b3ab33df2fbf7ca75e46544b' +
      '99'),
    {
      fx008: no('E_EFFECT', defer, 153, 165),
      task: 9,
      flipped: true,
      reason: 'L4 (§6).'
    }),
  probe('rev6/meta1',
    ok('true\n',
      '4cf6f83ac712fa55aa1ceab31891ca386d785d3aee8913ec495d94b38858e9b6')),
  probe('rev6/meta2',
    ok('', '9ea2294c6518dac53fa7d9ab1b821b2e63b4f540b7470ed3f749e72064ed6e74')),
  probe('rev6/meta3',
    no('E_TYPE', 'Ambiguous type Opt(_) in comparison', 247, 248)),
  probe('rev6/reuse',
    ok('12\n0\n',
      '8c2e67a600770fd68c943f16e4b7de4461f31ee8d3eda25598b9dee359d5ff6a')),
  probe('rev6/reuse2',
    no('E_EFFECT',
      'Log + Fail(E) + Console + ... and Log + Console + ... cannot be made ' +
        'equal: both end in ...',
      354, 359)),
];
