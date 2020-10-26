import {first} from './utils';

describe('first(...)', () => {
  test('returns the first element of an array', () => {
    expect(first([5])).toBe(5);
    expect(first([3, 7])).toBe(3);
  });

  test('throws an error if the iterable is empty', () => {
    expect(() => first([])).toThrowError();
  });
});

