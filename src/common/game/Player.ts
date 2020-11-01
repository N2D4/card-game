export default abstract class Player<G> {
    public abstract async sendGameState(state: G): Promise<void>;
}
