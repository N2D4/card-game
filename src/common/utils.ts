export function assertNonNull<T>(t: T | undefined | null): T {
    if (t === null || t === undefined) throw new Error(`Assertion error: t=${t} is null or undefined`);
    return t;
}

export function throwExp(error: unknown): never {
    throw error;
}

export function* range(fromInclusive: number, toExclusive?: number) {
    if (toExclusive === undefined) {
        toExclusive = fromInclusive;
        fromInclusive = 0;
    }
    
    for (let i = fromInclusive; i < toExclusive; i++) {
        yield i;
    }
}

export function shuffle<T>(arr: T[]): void {
    for (let i = 0; i < arr.length; i++) {
        const j = Math.floor(Math.random() * arr.length);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function deepEquals(a: any, b: any) {
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;

    if (typeof a.equals === 'function') return a.equals(b);
    if (typeof b.equals === 'function') return b.equals(a);

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    for (const key of [...aKeys, ...bKeys]) {
        if (!deepEquals(a[key], b[key])) return false;
    }

    return true;
}

// TODO Use an unpredictable RNG
export function pseudoUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r: number = Math.random() * 16 | 0;
      const v: number = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export async function wait<T>(ms: number, value?: T): Promise<T> {
    return await new Promise<T>(resolve => {
        setTimeout(() => resolve(value), ms);
    });
}

export function htmlEscape(s: string) {
    s = "" + s;
    const map: Map<string, string> = new Map([
        ['&', '&amp;'],
        ['<', '&lt;'],
        ['>', '&gt;'],
        ['"', '&quot;'],
        ["'", '&#039;'],
    ]);

    return s.replace(/[&<>"']/g, m => map.get(m) as string);
}

export function sanitize(strings: TemplateStringsArray, ...values: any[]): DocumentFragment {
    const templ = document.createElement('template');
    templ.innerHTML = strings.length === 1 ? strings[0] : strings.reduce((a, n, i) => `${a}${htmlEscape("" + values[i - 1])}${n}`);
    return templ.content;
}

