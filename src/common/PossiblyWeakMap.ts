/**
 * An implementation of WeakMap's interface which also supports primitive keys, mapping those with strong references.
 */
export default class PossiblyWeakMap<K, V> {
    readonly #weakMap = new WeakMap<K & object, V>();
    readonly #map = new Map<K, V>();

    private getMapFor<T extends K>(key: T & object): WeakMap<any, V>;
    private getMapFor<T extends K>(key: T): Map<any, V>;
    private getMapFor<T extends K>(key: T): Map<any, V> | WeakMap<any, V> {
        if (typeof key === 'object' || typeof key === 'function') return this.#weakMap;
        else return this.#map;
    }

    public delete(key: K): boolean {
        return this.getMapFor(key).delete(key);
    }

    public get(key: K): V | undefined {
        return this.getMapFor(key).get(key);
    }

    public has(key: K): boolean {
        return this.getMapFor(key).has(key);
    }

    public set(key: K, value: V) {
        return this.getMapFor(key).set(key, value);
    }
}