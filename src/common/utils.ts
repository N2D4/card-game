export function* range(fromInclusive: number, toExclusive?: number) {
    if (toExclusive === undefined) {
        toExclusive = fromInclusive;
        fromInclusive = 0;
    }
    
    for (let i = fromInclusive; i < toExclusive; i++) {
        yield i;
    }
}

export function random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// TODO Use an unpredictable random generator
export function pseudoUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r: number = Math.random() * 16 | 0;
      const v: number = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export async function wait(ms: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, ms));
}
