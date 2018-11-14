import Packet from 'common/serialize/Packet';

interface ISerializer<T> {
    readonly uniqueSerializationId: string;
    serialize(t: T): Packet;
    deserialize(packet: Packet): T;
}

export default class Serializer {
    private static serializers: {[key: string]: ISerializer<any>} = {};

    public static register(serializer: ISerializer<any>): void {
        this.serializers[serializer.uniqueSerializationId] = serializer;
    }

    public static deserialize(serializationId: string, packet: Packet): any {
        return this.serializers[serializationId].deserialize(packet);
    }
}
