export default abstract class Player<G> {
    public abstract sendGameState(state: G): Promise<void>;
}
