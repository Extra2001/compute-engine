import { checkJson, engine } from '../utils';

function checkExpand(s: string): string {
  return checkJson(
    engine.box(['Expand', engine.parse(s, { canonical: false })])
  );
}

describe('EXPAND POWER', () => {
  test(`Power`, () =>
    expect(checkExpand(`(a+b)^6`)).toMatchInlineSnapshot(`
      box       = ["Expand", ["Power", ["Add", "a", "b"], 6]]
      evaluate  = [
        "Add",
        ["Power", "a", 6],
        ["Power", "b", 6],
        ["Multiply", 6, "b", ["Power", "a", 5]],
        ["Multiply", 6, "a", ["Power", "b", 5]],
        ["Multiply", 15, ["Power", "b", 4], ["Square", "a"]],
        ["Multiply", 15, ["Power", "a", 4], ["Square", "b"]],
        ["Multiply", 20, ["Power", ["Multiply", "a", "b"], 3]]
      ]
    `));

  // 64*a**6 + 768*a**5*b**2 + 3840*a**4*b**4 + 10240*a**3*b**6 + 15360*a**2*b**8 + 12288*a*b**10 + 4096*b**12
  test(`Power`, () =>
    expect(checkExpand(`(2a+4b^2)^6`)).toMatchInlineSnapshot(`
      box       = [
        "Expand",
        [
          "Power",
          ["Add", ["Multiply", 4, ["Square", "b"]], ["Multiply", 2, "a"]],
          6
        ]
      ]
      evaluate  = [
        "Add",
        ["Multiply", 4096, ["Power", "b", 12]],
        ["Multiply", 12288, "a", ["Power", "b", 10]],
        ["Multiply", 15360, ["Power", "b", 8], ["Square", "a"]],
        ["Multiply", 10240, ["Power", "b", 6], ["Power", "a", 3]],
        ["Multiply", 768, ["Power", "a", 5], ["Square", "b"]],
        ["Multiply", 64, ["Power", "a", 6]],
        ["Multiply", 3840, ["Power", ["Multiply", "a", "b"], 4]]
      ]
    `));
});

describe('EXPAND PRODUCT', () => {
  test(`Expand 4x(x+2)`, () =>
    expect(checkExpand(`4x(x+2)`)).toMatchInlineSnapshot(`
      box       = ["Expand", ["Multiply", 4, "x", ["Add", "x", 2]]]
      evaluate  = ["Add", ["Multiply", 4, ["Square", "x"]], ["Multiply", 8, "x"]]
    `));

  test(`Expand 4x(3x+2)-5(5x-4)`, () =>
    expect(checkExpand(`4x(3x+2)-5(5x-4)`)).toMatchInlineSnapshot(`
      box       = [
        "Expand",
        [
          "Add",
          ["Multiply", 4, "x", ["Add", ["Multiply", 3, "x"], 2]],
          ["Multiply", -5, ["Subtract", ["Multiply", 5, "x"], 4]]
        ]
      ]
      evaluate  = ["Add", ["Multiply", 12, ["Square", "x"]], ["Multiply", -17, "x"], 20]
    `));
});
