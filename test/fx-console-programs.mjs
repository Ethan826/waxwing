// Console probes of FX001 Task 4, shared by test/fx-console.test.mjs (Go) and
// test/fx-oracle.test.mjs (the reference interpreter): [name, source,
// expected stdout].
export const cases = [
  ['Unit entry', 'fn main(): Unit with Console = Console.print(42);', '42\n'],
  ['structural values', 'type Tree = Leaf | Node(Tree, Int, Tree); '
    + 'fn main(): Unit with Console = { Console.print(Node(Leaf, -2, Leaf)); ' +
      'Console.print(true); Console.print(()); };',
    'Node(Leaf, -2, Leaf)\ntrue\n()\n'],
  ['ambient callbacks', 'fn map(f: Int -> Int, x: Int): Int = f(x); '
    + 'fn main(): Int with Console = map(fn(x) => { Console.print(x); x + 1 '
    + '}, 7);',
      '7\n8\n'],
  ['over application', 'fn arg(n: Int): Int with Console = { '
    + 'Console.print(n); n }; '
    + 'fn f(x: Int): (Int -> Int with Console) with Console = { '
    + 'Console.print(2); ' +
      'fn(y) => { Console.print(4); x + y } }; '
    + 'fn main(): Int with Console = f(arg(1), arg(3));', '1\n2\n3\n4\n4\n'],
  ['pipe left first', 'fn arg(): Int with Console = { Console.print(1); 3 }; '
    + 'fn maker(): (Int -> Int with Console) with Console = { '
    + 'Console.print(2); ' +
      'fn(x) => { Console.print(3); x } }; '
    + 'fn main(): Int with Console = arg() |> maker();', '1\n2\n3\n3\n'],
  ['partial argument only', 'fn arg(): Int with Console = { Console.print(1); '
    + '7 }; '
    + 'fn f(x: Int, y: Int): Int with Console = { Console.print(2); x + y }; '
    + 'fn main(): Unit with Console = { let p = f(arg()); Console.print(3); };',
      '1\n3\n']
];

// Programs run one at a time through runGo.
export const values = [
  ['print is a first-class operation',
    'fn each(f: Int -> Unit, x: Int): Unit = f(x); '
    + 'fn main(): Unit with Console = each(Console.print, 7);', '7\n'],
  ['an omitted row in a lambda annotation shares its fresh ambient row',
    'fn main(): Unit with Console = { '
    + 'let apply = fn(f: Int -> Unit) => f(7); apply(Console.print) };', '7\n']
];
