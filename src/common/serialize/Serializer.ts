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
                    if (![Object.prototype, null].includes(Object.getPrototypeOf(serializable))) {
                        console.error(`Object not serializable!`, serializable);
                        throw new Error(`Object not serializable! ${serializable}`);
                    }
                    const nser: {[key: string]: ISerializable} = Object.create(null);
                    for (const [key, val] of Object.entries(serializable)) {
                        nser[key] = Serializer.serialize(val);
                    }
                    return nser;
                }
            case "undefined":
                return undefined;
            default:
                console.error(`Value not serializable!`, serializable);
                throw new Error(`Value not serializable! ${serializable}`);
        }
    }
}

