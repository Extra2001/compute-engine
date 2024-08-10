import { check } from '../utils';

describe('CANONICAL FORMS', () => {
  test('-0', () => {
    expect(check('-0')).toMatchInlineSnapshot(`0`);
  });

  // Addition/substraction of 0 gets simplified in canonical  form
  test('a-0', () => {
    expect(check('a-0')).toMatchInlineSnapshot(`
      box       = ["Add", "a", 0]
      canonical = a
    `);
  });

  test('0-a', () => {
    expect(check('0-a')).toMatchInlineSnapshot(`
      box       = ["Add", 0, ["Negate", "a"]]
      canonical = ["Negate", "a"]
    `);
  });

  // Small integers are *not* coalesced in canonical form
  test('7 + 2 + 5"', () => {
    expect(check('7 + 2 + 5')).toMatchInlineSnapshot(`
      box       = ["Add", 7, 2, 5]
      canonical = ["Add", 2, 5, 7]
      simplify  = 14
    `);
  });

  // This one is tricky:
  // the simplifications of POWER and MULTIPLY
  // have to be done in the right order to get the correct result
  test('2^3x"', () => {
    expect(check('2^3x')).toMatchInlineSnapshot(`
      box       = ["InvisibleOperator", ["Power", 2, 3], "x"]
      canonical = ["Multiply", "x", ["Power", 2, 3]]
      simplify  = 8x
    `);
  });

  // Negative sign on denom, numer or both
  test('\\frac{-x}{-n}"', () => {
    expect(check('\\frac{-x}{-n}')).toMatchInlineSnapshot(`
      box       = ["Divide", ["Negate", "x"], ["Negate", "n"]]
      canonical = ["Divide", "x", "n"]
    `);
  });

  test('\\frac{x}{-n}"', () => {
    expect(check('\\frac{x}{-n}')).toMatchInlineSnapshot(`
      box       = ["Divide", "x", ["Negate", "n"]]
      canonical = ["Divide", ["Negate", "x"], "n"]
    `);
  });

  test('\\frac{-x}{n}"', () => {
    expect(check('\\frac{-x}{n}')).toMatchInlineSnapshot(
      `["Divide", ["Negate", "x"], "n"]`
    );
  });

  test('\\frac{-101}{10^{\\frac{2}{3}}}', () => {
    expect(check('\\frac{-101}{10^{\\frac{2}{3}}}')).toMatchInlineSnapshot(`
      box       = ["Divide", -101, ["Power", 10, ["Divide", 2, 3]]]
      canonical = ["Divide", -101, "4.6415888336127781799"]
      simplify  = -21.75979036932202893
      eval-auto = -21.75979036932202893
      eval-mach = -21.759790369322
    `);
  });

  // Flatten, to multiple levels
  test('(1+(2+(3+4)))(((5+6)+7)((8+(9+10)))(11+(12+13)+14))', () => {
    expect(check('(1+(2+(3+4)))(((5+6)+7)((8+(9+10)))(11+(12+13)+14))'))
      .toMatchInlineSnapshot(`
      box       = [
        "InvisibleOperator",
        [
          "Delimiter",
          ["Add", 1, ["Delimiter", ["Add", 2, ["Delimiter", ["Add", 3, 4]]]]]
        ],
        [
          "Delimiter",
          [
            "InvisibleOperator",
            ["Delimiter", ["Add", ["Delimiter", ["Add", 5, 6]], 7]],
            [
              "Delimiter",
              ["Delimiter", ["Add", 8, ["Delimiter", ["Add", 9, 10]]]]
            ],
            ["Delimiter", ["Add", 11, ["Delimiter", ["Add", 12, 13]], 14]]
          ]
        ]
      ]
      canonical = [
        "Multiply",
        ["Add", 1, 2, 3, 4],
        ["Add", 11, 12, 13, 14],
        ["Add", 5, 6, 7],
        ["Add", 8, 9, 10]
      ]
      simplify  = 243000
    `);
  });

  // \frac should get hoisted with multiply, but not cancel
  // (multiplication by 0 does not always = 0)
  test('2x\\frac{0}{5}"', () => {
    expect(check('2x\\frac{0}{5}')).toMatchInlineSnapshot(`
      box       = ["InvisibleOperator", 2, "x", ["Divide", 0, 5]]
      canonical = 0
    `);
  });

  // Negative exponents become fractions
  test('(2xy)^{-n}"', () => {
    expect(check('(2xy)^{-n}')).toMatchInlineSnapshot(`
      box       = [
        "Power",
        ["Delimiter", ["InvisibleOperator", 2, "x", "y"]],
        ["Negate", "n"]
      ]
      canonical = ["Power", ["Multiply", 2, "x", "y"], ["Negate", "n"]]
      eval-auto = 1 / (2^n * x^n * y^n)
    `);
  });

  test('"2\\times0\\times5\\times4"', () => {
    expect(check('2\\times0\\times5\\times4')).toMatchInlineSnapshot(`
      box       = ["Multiply", 2, 0, 5, 4]
      canonical = 0
    `);
  });

  test('"2\\times(5-5)\\times5\\times4"', () => {
    expect(check('2\\times(5-5)\\times5\\times4')).toMatchInlineSnapshot(`
      box       = ["Multiply", 2, ["Delimiter", ["Add", 5, -5]], 5, 4]
      canonical = ["Multiply", 2, 4, 5, ["Subtract", 5, 5]]
      simplify  = 0
    `);
  });

  test('"2\\frac{x}{a}\\frac{y}{b}"', () => {
    expect(check('2\\frac{x}{a}\\frac{y}{b}')).toMatchInlineSnapshot(`
      box       = ["InvisibleOperator", 2, ["Divide", "x", "a"], ["Divide", "y", "b"]]
      canonical = ["Multiply", 2, ["Divide", "x", "a"], ["Divide", "y", "b"]]
      simplify  = (2x * y) / (a * b)
    `);
  });
});

//
// COMMUTATIVE ORDER
// (for multiplication, and other commutative functios, except addition)
//
describe('COMMUTATIVE ORDER', () => {
  // multiply is commutative and regular canonical sort order applies
  // (numbers before symbols)
  test(`Canonical form yx5z`, () => {
    expect(check('yx5z')).toMatchInlineSnapshot(`
      box       = ["InvisibleOperator", "y", "x", 5, "z"]
      canonical = ["Multiply", 5, "x", "y", "z"]
    `);
  });

  // The arguments of commutative functions are sorted lexicographically
  // numerical constants (by value), then constants (lexicographically),
  // then free variables (lex),
  test(`Canonical form '-2x5z\\sqrt{y}\\frac{3}{4}3\\pi y'`, () => {
    expect(check('-2x5z\\sqrt{y}\\frac{3}{4}3\\pi y')).toMatchInlineSnapshot(`
      box       = [
        "InvisibleOperator",
        -2,
        "x",
        5,
        "z",
        ["Sqrt", "y"],
        ["Divide", 3, 4],
        3,
        "Pi",
        "y"
      ]
      canonical = [
        "Multiply",
        -2,
        3,
        5,
        ["Rational", 3, 4],
        "Pi",
        "x",
        "y",
        "z",
        ["Sqrt", "y"]
      ]
      simplify  = -45/2 * pi * x * y * z * sqrt(y)
      eval-auto = -45/2 * pi * x * y * z * sqrt(y)
      eval-mach = -45/2 * pi * x * y * z * sqrt(y)
      N-auto    = -70.68583470577035 * x * z * y^2
      N-mach    = -70.6858347057702 * x * z * y^2
    `);
  });

  test(`Canonical form '(b^3c^2d)(x^7y)(a^5g)(b^2x^5b3)'`, () => {
    expect(check('(b^3c^2d)(x^7y)(a^5g)(b^2x^5b3)')).toMatchInlineSnapshot(`
      box       = [
        "InvisibleOperator",
        [
          "Delimiter",
          ["InvisibleOperator", ["Power", "b", 3], ["Power", "c", 2], "d"]
        ],
        ["Delimiter", ["InvisibleOperator", ["Power", "x", 7], "y"]],
        ["Delimiter", ["InvisibleOperator", ["Power", "a", 5], "g"]],
        [
          "Delimiter",
          ["InvisibleOperator", ["Power", "b", 2], ["Power", "x", 5], "b", 3]
        ]
      ]
      canonical = [
        "Multiply",
        3,
        "b",
        "d",
        "g",
        "y",
        ["Power", "x", 7],
        ["Power", "a", 5],
        ["Power", "x", 5],
        ["Power", "b", 3],
        ["Square", "b"],
        ["Square", "c"]
      ]
      simplify  = 3d * g * y * x^(12) * b^6 * a^5 * c^2
    `);
  });
});

//
// POLYNOMIAL ORDER
// (for addition)
// Arguments of addition use the deglex sorting order:
// - by total degree (sum of the degrees of the factors),
// - by max degree (largest degree of the factors),
// - by lexicographic order of the factors.
// - by rank (constants, non-algebraic functions, numbers, etc...)
//

describe('POLYNOMIAL ORDER', () => {
  // -> a+b+c+5+7
  test(`Canonical form c+7+a+5+b`, () => {
    expect(check('c+7+a+5+b')).toMatchInlineSnapshot(`
      box       = ["Add", "c", 7, "a", 5, "b"]
      canonical = ["Add", "a", "b", "c", 5, 7]
      simplify  = a + b + c + 12
    `);
  });

  // 7a -> degree 1 > degree 0
  // 2b -> degree 1, b > a
  // 5c -> degree 1, c > b
  // 6 -> degree 0
  test(`Canonical form 6+5c+2b+3+7a'`, () => {
    expect(check('6+5c+2b+3+7a')).toMatchInlineSnapshot(`
      box       = [
        "Add",
        6,
        ["InvisibleOperator", 5, "c"],
        ["InvisibleOperator", 2, "b"],
        3,
        ["InvisibleOperator", 7, "a"]
      ]
      canonical = [
        "Add",
        ["Multiply", 7, "a"],
        ["Multiply", 2, "b"],
        ["Multiply", 5, "c"],
        3,
        6
      ]
      simplify  = 7a + 2b + 5c + 9
    `);
  });

  // Arguments sorted by value
  test(`Canonical form 5a+3a+7a`, () => {
    expect(check('5a+3a+7a')).toMatchInlineSnapshot(`
      box       = [
        "Add",
        ["InvisibleOperator", 5, "a"],
        ["InvisibleOperator", 3, "a"],
        ["InvisibleOperator", 7, "a"]
      ]
      canonical = [
        "Add",
        ["Multiply", 3, "a"],
        ["Multiply", 5, "a"],
        ["Multiply", 7, "a"]
      ]
      simplify  = 15a
    `);
  });

  test(`Canonical form x^{3}2\\pi+3x^{3}4\\pi+x^3`, () => {
    expect(check('x^{3}2\\pi+3x^{3}4\\pi+x^3')).toMatchInlineSnapshot(`
      box       = [
        "Add",
        ["InvisibleOperator", ["Power", "x", 3], 2, "Pi"],
        ["InvisibleOperator", 3, ["Power", "x", 3], 4, "Pi"],
        ["Power", "x", 3]
      ]
      canonical = [
        "Add",
        ["Power", "x", 3],
        ["Multiply", 2, "Pi", ["Power", "x", 3]],
        ["Multiply", 3, 4, "Pi", ["Power", "x", 3]]
      ]
      simplify  = x^3 + 14pi * x^3
      eval-auto = x^3 + 14pi * x^3
      eval-mach = x^3 + 14pi * x^3
      N-auto    = 44.982297150257106 * x^3
      N-mach    = 44.982297150257104 * x^3
    `);
  });

  test(`Canonical form 'x^2y^3+x^3y^2+xy^4+x^4y+x^2y^2'`, () => {
    expect(check('x^2y^3+x^3y^2+xy^4+x^4y+x^2y^2')).toMatchInlineSnapshot(`
      box       = [
        "Add",
        ["InvisibleOperator", ["Power", "x", 2], ["Power", "y", 3]],
        ["InvisibleOperator", ["Power", "x", 3], ["Power", "y", 2]],
        ["InvisibleOperator", "x", ["Power", "y", 4]],
        ["InvisibleOperator", ["Power", "x", 4], "y"],
        ["InvisibleOperator", ["Power", "x", 2], ["Power", "y", 2]]
      ]
      canonical = [
        "Add",
        ["Multiply", "y", ["Power", "x", 4]],
        ["Multiply", "x", ["Power", "y", 4]],
        ["Multiply", ["Power", "y", 3], ["Square", "x"]],
        ["Multiply", ["Power", "x", 3], ["Square", "y"]],
        ["Multiply", ["Square", "x"], ["Square", "y"]]
      ]
    `);
  });

  test(`Canonical form '(b^3b^2)+(a^3a^2)+(b^6)+(a^5b)+(a^5)'`, () => {
    expect(check('(b^3b^2)+(a^3a^2)+(b^6)+(a^5b)+(a^5)'))
      .toMatchInlineSnapshot(`
      box       = [
        "Add",
        [
          "Delimiter",
          ["InvisibleOperator", ["Power", "b", 3], ["Power", "b", 2]]
        ],
        [
          "Delimiter",
          ["InvisibleOperator", ["Power", "a", 3], ["Power", "a", 2]]
        ],
        ["Delimiter", ["Power", "b", 6]],
        ["Delimiter", ["InvisibleOperator", ["Power", "a", 5], "b"]],
        ["Delimiter", ["Power", "a", 5]]
      ]
      canonical = [
        "Add",
        ["Power", "b", 6],
        ["Multiply", "b", ["Power", "a", 5]],
        ["Power", "a", 5],
        ["Multiply", ["Power", "a", 3], ["Square", "a"]],
        ["Multiply", ["Power", "b", 3], ["Square", "b"]]
      ]
      simplify  = b^6 + b * a^5 + 2a^5 + b^5
    `);
  });

  test(`Canonical form '5c^2a^4+2b^8+7b^3a'`, () => {
    expect(check('5c^2a^4+2b^8+7b^3a')).toMatchInlineSnapshot(`
      box       = [
        "Add",
        ["InvisibleOperator", 5, ["Power", "c", 2], ["Power", "a", 4]],
        ["InvisibleOperator", 2, ["Power", "b", 8]],
        ["InvisibleOperator", 7, ["Power", "b", 3], "a"]
      ]
      canonical = [
        "Add",
        ["Multiply", 2, ["Power", "b", 8]],
        ["Multiply", 5, ["Power", "a", 4], ["Square", "c"]],
        ["Multiply", 7, "a", ["Power", "b", 3]]
      ]
    `);
  });
});

// describe('OBJECT LITERAL FORM', () => {
//   test('Shorthand parse', () => {
//     expect(
//       engine.format(['Add', 'x', ['Sin', 'Pi'], 2], ['object-literal'])
//     ).toMatchInlineSnapshot(
//       `{fn: [{sym: 'Add'}, {sym: 'x'}, {fn: [{sym: 'Sin'}, {sym: 'Pi'}]}, {num: '2'}]}`
//     );
//   });
//   test('Expression with metadata', () => {
//     expect(
//       engine.format(
//         [
//           { sym: 'Add', metadata: 'add' },
//           { sym: 'x', metadata: 'ecks' },
//           { fn: ['Sin', 'Pi'], metadata: 'fn-md' },
//           { num: '1', metadata: 'one' },
//         ] as any,
//         ['object-literal']
//       )
//     ).toMatchInlineSnapshot(
//       `{fn: [{sym: 'Add', metadata: 'add'}, {sym: 'x', metadata: 'ecks'}, {fn: [{sym: 'Sin'}, {sym: 'Pi'}], metadata: 'fn-md'}, {num: '1', metadata: 'one'}]}`
//     );
//   });
// });
