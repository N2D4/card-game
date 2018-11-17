import Packet from 'common/serialize/Packet';

export default abstract class Player<G extends IGameState> {
    public abstract async sendGameState(state: G): Promise<void>;
}
