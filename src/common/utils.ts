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

export function pseudoUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
