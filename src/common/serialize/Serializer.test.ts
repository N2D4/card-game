import Serializer from './Serializer';

describe('Serializer.serialize(...)', () => {
    test('serializes numbers', () => {
        expect(Serializer.serialize(5)).toEqual(5);
        expect(Serializer.serialize(-3.1)).toEqual(-3.1);
        expect(Serializer.serialize(NaN)).toBeNaN();
        expect(Serializer.serialize(Number.POSITIVE_INFINITY)).toEqual(Number.POSITIVE_INFINITY);
    });

    test('serializes strings', () => {
        expect(Serializer.serialize('')).toEqual('');
        expect(Serializer.serialize('5')).toEqual('5');
        expect(Serializer.serialize('hiya')).toEqual('hiya');
    });

    test('serializes booleans', () => {
        expect(Serializer.serialize(true)).toEqual(true);
        expect(Serializer.serialize(false)).toEqual(false);
    });

    test('serializes null', () => {
        expect(Serializer.serialize(null)).toEqual(null);
    });

    test('serializes undefined', () => {
        expect(Serializer.serialize(undefined)).toEqual(undefined);
    });

    test('serializes objects with a serialize function', () => {
        expect(Serializer.serialize({ serialize: () => 5 })).toEqual(5);
        expect(Serializer.serialize(Object.assign([], { serialize: () => 5 }))).toEqual(5);
        expect(Serializer.serialize(Object.assign(Object.create(null), { serialize: () => 5 }))).toEqual(5);
    });

    test('serializes arrays', () => {
        expect(Serializer.serialize([])).toEqual([]);
        expect(Serializer.serialize([3, null, { serialize: () => 5 }])).toEqual([3, null, 5]);
    });

    test('serializes plain objects', () => {
        expect(Serializer.serialize({ serialize: 18, ok: { serialize: () => 3 } })).toEqual({ serialize: 18, ok: 3 });
        expect(Serializer.serialize(Object.assign(Object.create(null), { serialize: 18, ok: { serialize: () => 3 } }))).toEqual({ serialize: 18, ok: 3 });
    });

    test('doesn\'t serialize complex objects', () => {
        const cerr = jest.spyOn(console, 'error');
        try {
            cerr.mockImplementation(() => undefined);
            expect(() => Serializer.serialize(Object.assign(Object.create({ a: 1 }), { xy: 3 }))).toThrow();
        } finally {
            cerr.mockRestore();
        }
    });

    test('doesn\'t serialize functions', () => {
        const cerr = jest.spyOn(console, 'error');
        try {
            cerr.mockImplementation(() => undefined);
            expect(() => Serializer.serialize(() => 0)).toThrow();
            expect(() => Serializer.serialize(Object.assign(() => 0, { serialize: () => 0}))).toThrow();
        } finally {
            cerr.mockRestore();
        }
    });
});