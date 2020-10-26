import {arrayEquals, assertNonNull, first, htmlEscape, range, sanitize, throwExp, wrapThrowing} from './utils';

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

