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