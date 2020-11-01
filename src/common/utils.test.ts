import {arrayEquals, assertNonNull, Comparator, extractComparator, first, htmlEscape, naturalComparator, naturalExtractComparator, permute, range, sanitize, stableSort, thenComparing, throwExp, wrapThrowing} from './utils';

describe('first(...)', () => {
  test('returns the first element of an iterable', () => {
    expect(first([5])).toEqual(5);
    expect(first([3, 7])).toEqual(3);
    expect(first(range(5, 9))).toEqual(5);
  });

  test('throws if the iterable is empty', () => {
    expect(() => first([])).toThrowError();
    expect(() => first(range(5, 5))).toThrowError();
  });
});

describe('wrapThrowing(...)', () => {
  test('retains behaviour if function doesn\'t throw', () => {
    expect(wrapThrowing((a: number, b: number) => a * b + 5)(3, 2)).toEqual(11);
  });

  test('returns the error value if function does throw', () => {
    const cerr = jest.spyOn(console, 'error');
    try {
      cerr.mockImplementation(() => undefined);
      expect(wrapThrowing((x: number) => {throw x + 1;})(3)).toEqual({error: 4});
      expect(cerr).toHaveBeenCalled();
    } finally {
      cerr.mockRestore();
    }
  });
});

describe('assertNonNull(...)', () => {
  test('returns the value if the value is non-null', () => {
    expect(assertNonNull(5)).toEqual(5);
    expect(assertNonNull(0)).toEqual(0);
    expect(assertNonNull(false)).toEqual(false);
    expect(assertNonNull('')).toEqual('');
    expect(assertNonNull({})).toEqual({});
    expect(assertNonNull([])).toEqual([]);
    expect(assertNonNull('undefined')).toEqual('undefined');
  });

  test('throw if the value is null', () => {
    expect(() => assertNonNull(null)).toThrowError();
  });

  test('throws if the value is undefined', () => {
    expect(() => assertNonNull(undefined)).toThrowError();
  });
});

describe('throwExp(...)', () => {
  test('throws the value', () => {
    const err = new Error('5');
    expect(() => throwExp(err)).toThrow(err);
  });
});

describe('throwExp(...)', () => {
  test('throws errors', () => {
    const err = new Error('5');
    expect(() => throwExp(err)).toThrow(err);
  });

  test('throws an error with the string message', () => {
    const err = '5';
    expect(() => throwExp(err)).toThrow(err);
  });
});

describe('range(...)', () => {
  test('returns the correct ranges', () => {
    expect([...range(0)]).toEqual([]);
    expect([...range(-1)]).toEqual([]);
    expect([...range(3)]).toEqual([0, 1, 2]);
    expect([...range(2, 2)]).toEqual([]);
    expect([...range(2, 1)]).toEqual([]);
    expect([...range(2, 4)]).toEqual([2, 3]);
  });
});

describe('arrayEquals(...)', () => {
  test('checks equality correctly', () => {
    expect(arrayEquals([], [])).toEqual(true);
    expect(arrayEquals([1], [1])).toEqual(true);
    expect(arrayEquals([3, 8, 1, 'a'], [3, 8, 1, 'a'])).toEqual(true);
    expect(arrayEquals([3, 3], [3])).toEqual(false);
    expect(arrayEquals(['3'], [3])).toEqual(false);
    expect(arrayEquals([false], ['false'])).toEqual(false);
    expect(arrayEquals([], [3])).toEqual(false);
  });
});

describe('htmlEscape(...)', () => {
  test('escapes correctly', () => {
    expect(htmlEscape('heyo world!')).toEqual('heyo world!');
    expect(htmlEscape('<script>alert("evil!")</script>')).toEqual('&lt;script&gt;alert(&quot;evil!&quot;)&lt;/script&gt;');
    expect(htmlEscape(`<>"&''`)).toEqual('&lt;&gt;&quot;&amp;&#039;&#039;');
  });
});

describe('sanitize(...)', () => {
  test('sanitizes correctly', () => {
    expect(sanitize`heyo world!`).toEqual('heyo world!');
    expect(sanitize`<b>${'<script>alert("evil!")</script>'}</b>`).toEqual('<b>&lt;script&gt;alert(&quot;evil!&quot;)&lt;/script&gt;</b>');
    expect(sanitize`"${`<>"&''`}"&'${`<`}'`).toEqual(`"&lt;&gt;&quot;&amp;&#039;&#039;"&'&lt;'`);
  });
});

describe('permute(...)', () => {
  test('yields a single permutation for the empty array', () => {
    expect([...permute([])]).toEqual([[]]);
  });

  test('permutes correctly', () => {
    const arr = [1, 2, 3, 4, 5, 8, 'heya'];
    const permuted = [...permute(arr)];
    const arrLengthFac = [...range(arr.length)].reduce((a, b) => a * (b + 1), 1);
    expect(permuted.length).toEqual(arrLengthFac);
    expect(new Set(permuted.map(a => `${a}`)).size).toEqual(arrLengthFac);
  });
});

describe('stableSort(...)', () => {
  test('modifies the passed array', () => {
    const arr = [-4, -3, -5];
    stableSort(arr, (a, b) => b - a);
    expect(arr).toEqual([-3, -4, -5]);
  });

  test('doesn\'t modify the empty array', () => {
    expect(stableSort([], naturalComparator())).toEqual([]);
  });

  describe('sorts correctly', () => {
    const sortedArr: {x: number, index: number}[] = [
      {x: 1, index: 0},
      {x: 1, index: 1},
      {x: 5, index: 0},
      {x: 8, index: 0},
      {x: 8, index: 1},
      {x: 8, index: 2},
    ];

    test.each(
      [...permute(sortedArr)].map(a => [a])
    )('sorting %p', (oarr) => {
      const arr = oarr.map(a => ({...a}));
      const map = new Map<number, number>();
      for (const a of arr) {
        const num = map.get(a.x) ?? 0;
        a.index = num;
        map.set(a.x, num + 1);
      }
      expect(stableSort(arr, naturalExtractComparator(a => a.x))).toEqual(sortedArr);
    });
  });
});

function testComparator<T>(sorted: T[], comp: Comparator<T>) {
  test.each(
    sorted.flatMap((_, i) => sorted.map((_, j) => [i, j]))
  )('comparing (arr[%p], arr[%p])', (i, j) => {
    expect(Math.sign(comp(sorted[i], sorted[j]))).toEqual(Math.sign(i - j));
  });
}

describe('thenComparing(...)', () => {
  describe('compares distinct objects correctly', () => {
    const nec = naturalExtractComparator;
    const comp = thenComparing<{a: number, b: number}>(nec(x => x.a), nec(x => x.b));
    const arr = [
      { a: 0, b: 0 },
      { a: 0, b: 1 },
      { a: 1, b: 0 },
      { a: 1, b: 1 },
    ];
    testComparator(arr, comp);
  });

  test('compares equal elements correctly', () => {
    const nec = naturalExtractComparator;
    const comp = thenComparing<{a: number, b: number}>(nec(x => x.a), nec(x => x.b));
    expect(comp({a: 0, b: 0}, {a: 0, b: 0})).toEqual(0);
  });
});

describe('naturalComparator(...)', () => {
  describe.each([
    [[-9, -2, 0, 3, 18, 29184923]],
    [['0', '200', '37', '4', 'a', 'ab', 'absolute', 'alphabeta', 'cool', 'omega']],
    [[0, {valueOf: (): 7 => 7}, 15]],
  ])('compares distinct objects %p correctly', (arr) => {
    testComparator<any>(arr, naturalComparator());
  });

  test('compares equal elements correctly', () => {
    expect(naturalComparator()(-0, +0)).toEqual(0);
    expect(naturalComparator()(3, '3')).toEqual(0);
    expect(naturalComparator()(3, {valueOf: (): 3 => 3})).toEqual(0);
  });
});

describe('extractComparator(...)', () => {
  describe('compares distinct objects correctly', () => {
    const comp = extractComparator<{a: number}, number>((a, b) => b - a, a => a.a);
    const arr = [
      { a: 10},
      { a: 3 },
      { a: 0 },
      { a: -5 },
    ];
    testComparator(arr, comp);
  });

  test('compares equal elements correctly', () => {
    expect(extractComparator<{a: number}, number>((a, b) => b - a, a => a.a)({a: 5}, {a: 5})).toEqual(0);
  });
});

describe('naturalExtractComparator(...)', () => {
  describe('compares distinct objects correctly', () => {
    const comp = naturalExtractComparator<{a: number}>(a => a.a);
    const arr = [
      { a: -5 },
      { a: 0 },
      { a: 3 },
      { a: 10},
    ];
    testComparator(arr, comp);
  });

  test('compares equal elements correctly', () => {
    expect(naturalExtractComparator<{a: number}>(a => a.a)({a: 5}, {a: 5})).toEqual(0);
  });
});
