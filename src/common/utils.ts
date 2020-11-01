export const INCREMENTAL_VERSION = 17;

export type Comparator<T> = (a: T, b: T) => number;


export function first<T>(iterable: Iterable<T>): T {
    for (const i of iterable) {
        return i;
    }
    throw new Error(`Empty!`);
}

export function wrapThrowing<U extends unknown[], V>(f: (...args: U) => V | never): ((...args: U) => V | {error: unknown}) {
    return (...args: U) => {
        try {
            return f(...args);
        } catch (e) {
            console.error(`Error occured in function passed to wrapThrowing!`);
            console.error(e);
            return {error: e};
        }
    };
}

export function assertNonNull<T>(t: T | undefined | null): T {
    if (t === null || t === undefined) throw new Error(`Assertion error: t=${t} is null or undefined`);
    return t;
}

export function throwExp(error: unknown): never {
    throw error;
}

export function throwErr(error: string | Error): never {
    if (typeof error === 'string') {
        error = new Error(error);
    }
    throw error;
}


export function range(toExclusive: number): Generator<number>;
export function range(fromInclusive: number, toExclusive: number): Generator<number>;
export function* range(a: number, b?: number): Generator<number> {
    if (b === undefined) {
        b = a;
        a = 0;
    }
    
    for (let i = a; i < b; i++) {
        yield i;
    }
}

export function shuffle<T>(arr: T[]): T[] {
    for (let i = 0; i < arr.length; i++) {
        const j = Math.floor(Math.random() * arr.length);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function arrayEquals(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export async function wait<T>(ms: number, value?: T): Promise<T> {
    return await new Promise<T>(resolve => {
        setTimeout(() => resolve(value), ms);
    });
}

export function htmlEscape(s: string): string {
    const map: Map<string, string> = new Map([
        ['&', '&amp;'],
        ['<', '&lt;'],
        ['>', '&gt;'],
        ['"', '&quot;'],
        ["'", '&#039;'],
    ]);

    return `${s}`.replace(/[&<>"']/g, m => map.get(m) as string);
}

export function sanitize(strings: TemplateStringsArray, ...values: any[]): string {
    return strings.length === 1 ? strings[0]
                                : strings.reduce((a, n, i) => `${a}${htmlEscape("" + values[i - 1])}${n}`);
}

export function* permute<T>(arr: T[]): Iterable<T[]> {
    if (arr.length === 0) {
        yield [];
    } else {
        for (let i = 0; i < arr.length; i++) {
            for (const rest of permute([...arr.slice(0, i), ...arr.slice(i + 1)])) {
                yield [arr[i], ...rest];
            }
        }
    }
}

/**
 * In-place stable sort. Returns `arr`
 */
export function stableSort<T>(arr: T[], comparator: Comparator<T>): T[] {
    const indices = new Map<T, number>();
    for (let i = 0; i < arr.length; i++) {
        indices.set(arr[i], i);
    }
    return arr.sort(thenComparing(comparator, (a, b) => (indices.get(a) ?? 0) - (indices.get(b) ?? 0)));
}

export function thenComparing<T>(...comparators: Comparator<T>[]): Comparator<T> {
    return (a, b) => {
        for (const comp of comparators) {
            const res = comp(a, b);
            if (res !== 0) return res;
        }
        return 0;
    };
}

export function naturalComparator(): Comparator<any> {
    return (a, b) => a < b ? -1
                   : a > b ? 1
                   : 0;
}

export function extractComparator<T, R>(keyComparator: Comparator<R>, ...keyExtractors: ((t: T) => R)[]): Comparator<T> {
    return thenComparing(...keyExtractors.map(e => (a: T, b: T) => keyComparator(e(a), e(b))));
}

export function naturalExtractComparator<T>(...keyExtractors: ((t: T) => any)[]): Comparator<T> {
    return extractComparator(naturalComparator(), ...keyExtractors);
}
