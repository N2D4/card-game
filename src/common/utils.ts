export const INCREMENTAL_VERSION = 17;

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

export function range(toExclusive: number): Generator<number>;
export function range(fromInclusive: number, toExclusive: number): Generator<number, void, void>;
export function* range(a: number, b?: number) {
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

export function htmlEscape(s: string) {
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

