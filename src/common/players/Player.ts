import Packet from 'common/serialize/Packet';

export default abstract class Player {
    public abstract sendGameState(): void;
}
