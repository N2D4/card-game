import ISerializable from './ISerializable';

export default class Serializer {
    public static serialize(serializable: ISerializable): ISerializable {
        switch (typeof serializable) {
            case "number":
            case "string":
            case "boolean":
                return serializable;
            case "object":
                if (serializable === null) {
                    return null;
                }
                if (typeof serializable.serialize === "function") {
                    return Serializer.serialize(serializable.serialize());
                }
                if (Array.isArray(serializable)) {
                    return serializable.map(el => Serializer.serialize(el));
                } else {
                    const nser: {[key: string]: ISerializable} = Object.create(null);
                    if (![Object.prototype, null].includes(Object.getPrototypeOf(nser))) {
                        console.error(`Object not serializable!`, nser);
                        throw new Error(`Object not serializable! ${nser}`);
                    }
                    for (const [key, val] of Object.entries(serializable)) {
                        nser[key] = Serializer.serialize(val);
                    }
                    return nser;
                }
            default:
                return undefined;
        }
    }
}

